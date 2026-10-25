
const express = require('express');
const crypto = require('crypto');

const router = express.Router();

const GitHubCommit = require('../models/GitHubCommit');
const Documentation = require('../models/Documentation');
const { generateDocumentation } = require('../services/aiDocumentationService');

// Verify GitHub webhook signature
function verifyGitHubSignature(req, res, next) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  const signature = req.headers['x-hub-signature-256'];

  if (!secret || !signature || !req.rawBody) {
    return res.status(401).json({
      message: 'Webhook signature or secret is missing'
    });
  }

  const expectedSignature =
    'sha256=' +
    crypto
      .createHmac('sha256', secret)
      .update(req.rawBody)
      .digest('hex');

  const received = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);

  if (
    received.length !== expected.length ||
    !crypto.timingSafeEqual(received, expected)
  ) {
    return res.status(401).json({
      message: 'Invalid webhook signature'
    });
  }

  next();
}

// Fetch meaningful source-code changes from GitHub
async function getCodeChanges(repository, before, after) {
  if (!repository?.full_name || !before || !after) {
    throw new Error('Repository name or commit SHA is missing');
  }

  const url =
    `https://api.github.com/repos/${repository.full_name}` +
    `/compare/${before}...${after}`;

  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'DocuLive'
  };

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const response = await fetch(url, { headers });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(
      `GitHub compare API returned ${response.status}: ${details}`
    );
  }

  const data = await response.json();

  const ignoredFiles = [
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml'
  ];

  const isSource = filename =>
    /\.(js|jsx|ts|tsx|py|java|html|css|json|md)$/i.test(filename);

  const files = (data.files || [])
    .filter(file => file.patch)
    .filter(
      file =>
        !ignoredFiles.some(name => file.filename.endsWith(name))
    )
    .sort(
      (a, b) =>
        Number(isSource(b.filename)) -
        Number(isSource(a.filename))
    );

  if (files.length === 0) {
    throw new Error(
      'No usable source-code diffs found after filtering generated files'
    );
  }

  const changes = files
    .map(file =>
      [
        `File: ${file.filename}`,
        `Status: ${file.status}`,
        `Changes: ${file.changes}`,
        `Patch:\n${file.patch}`
      ].join('\n')
    )
    .join('\n\n')
    .slice(0, 30000);

  return changes;
}

// Generate and save documentation for a push
async function processPush(payload) {
  const repository = payload.repository;
  const latestCommit = payload.head_commit;

  if (!repository || !latestCommit?.id) {
    console.log(
      'Repository or head commit missing; skipping documentation'
    );
    return;
  }

  console.log(
    `Starting documentation processing for commit ${latestCommit.id}`
  );

  const existing = await Documentation.findOne({
    commitId: latestCommit.id
  });

  if (existing) {
    console.log(
      `Documentation already exists for commit ${latestCommit.id}`
    );
    return;
  }

  const codeChanges = await getCodeChanges(
    repository,
    payload.before,
    payload.after
  );

  console.log(
    `Source changes retrieved for commit ${latestCommit.id}`
  );

  const content = await generateDocumentation({
    repositoryUrl: repository.html_url,
    commitMessage: latestCommit.message || '',
    author: latestCommit.author?.name || '',
    codeChanges
  });

  if (!content || !content.trim()) {
    throw new Error('AI returned empty documentation');
  }

  await Documentation.create({
    projectName: repository.name || 'DocuLive',
    repositoryUrl: repository.html_url,
    content,
    commitId: latestCommit.id,
    summary: latestCommit.message || 'AI-generated documentation'
  });

  console.log(
    `AI documentation saved for commit ${latestCommit.id}`
  );
}

// Receive verified GitHub webhook events
router.post('/', verifyGitHubSignature, async (req, res) => {
  try {
    const event = req.headers['x-github-event'];

    if (event !== 'push') {
      return res.status(200).json({
        message: 'Event ignored',
        event
      });
    }

    const payload = req.body;

    if (
      !payload.repository ||
      typeof payload.repository.full_name !== 'string' ||
      typeof payload.repository.html_url !== 'string' ||
      !Array.isArray(payload.commits)
    ) {
      return res.status(400).json({
        message: 'Invalid GitHub push payload'
      });
    }

    const repositoryUrl = payload.repository.html_url;

    // Save metadata for each commit in the push
    for (const commit of payload.commits) {
      if (typeof commit.id !== 'string' || !commit.id) {
        continue;
      }

      await GitHubCommit.updateOne(
        { commitId: commit.id },
        {
          $setOnInsert: {
            repositoryUrl,
            commitId: commit.id,
            commitMessage: commit.message || '',
            author: commit.author?.name || '',
            committedAt: commit.timestamp
              ? new Date(commit.timestamp)
              : null
          }
        },
        { upsert: true }
      );
    }

    // Acknowledge GitHub before AI processing
    res.status(200).json({
      message: 'GitHub push received; documentation processing started',
      commitsReceived: payload.commits.length
    });

    // Log both successful completion and detailed failures
    processPush(payload)
      .then(() => {
        console.log(
          'Background documentation processing finished.'
        );
      })
      .catch(error => {
        console.error(
          'AI documentation generation failed:',
          error.stack || error.message
        );
      });
  } catch (error) {
    console.error('GitHub webhook error:', error.stack || error.message);

    if (!res.headersSent) {
      return res.status(500).json({
        message: 'Failed to process GitHub webhook'
      });
    }
  }
});

module.exports = router;
