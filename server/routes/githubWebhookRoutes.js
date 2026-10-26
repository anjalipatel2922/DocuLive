
const express = require('express');
const crypto = require('crypto');

const router = express.Router();

const GitHubCommit = require('../models/GitHubCommit');
const Documentation = require('../models/Documentation');

const {
  generateDocumentation
} = require('../services/aiDocumentationService');

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
      message: 'Invalid GitHub webhook signature'
    });
  }

  next();
}

// Fetch source-code changes from GitHub
async function getCodeChanges(repository, before, after) {
  if (!repository?.full_name || !before || !after) {
    throw new Error(
      `Missing repository or comparison SHA: repository=${repository?.full_name}, before=${before}, after=${after}`
    );
  }

  // GitHub may use an all-zero SHA when a branch is first created.
  if (/^0+$/.test(before)) {
    console.log(
      'Initial branch push detected; GitHub has no previous commit to compare.'
    );
    throw new Error(
      'Initial branch push cannot be compared with a previous commit.'
    );
  }

  const url =
    `https://api.github.com/repos/${repository.full_name}` +
    `/compare/${before}...${after}`;

  console.log('GitHub compare request:', {
    repository: repository.full_name,
    before,
    after
  });

  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'DocuLive',
    'X-GitHub-Api-Version': '2022-11-28'
  };

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const response = await fetch(url, { headers });

  if (!response.ok) {
    const details = await response.text();

    throw new Error(
      `GitHub compare API returned ${response.status} for ${repository.full_name} (${before}...${after}): ${details}`
    );
  }

  const data = await response.json();

  const ignoredFiles = [
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml',
    'package.json'
  ];

  const isSource = filename =>
    /\.(js|jsx|ts|tsx|py|java|html|css)$/i.test(filename);

  const files = (data.files || [])
    .filter(file => file.patch && isSource(file.filename))
    .filter(
      file =>
        !ignoredFiles.some(name => file.filename.endsWith(name))
    );

  if (files.length === 0) {
    throw new Error(
      `No usable application source-code diffs found for ${after}. ` +
      'The commit may contain only dependencies, documentation, or other excluded files.'
    );
  }

  const maxLength = 30000;
  const sections = [];
  let totalLength = 0;

  for (const file of files) {
    const section = [
      `File: ${file.filename}`,
      `Status: ${file.status}`,
      `Changes: ${file.changes}`,
      `Patch:\n${file.patch}`
    ].join('\n');

    const separator = sections.length ? '\n\n' : '';
    const remaining = maxLength - totalLength - separator.length;

    if (remaining <= 0) break;

    if (section.length > remaining) {
      const truncated = section.slice(
        0,
        Math.max(0, remaining - 60)
      );

      sections.push(
        truncated +
        '\n[Diff truncated because the input limit was reached.]'
      );
      break;
    }

    sections.push(section);
    totalLength += separator.length + section.length;
  }

  const result = sections.join('\n\n');

  if (!result.trim()) {
    throw new Error('No source-code changes available for AI documentation.');
  }

  return result;
}

// Generate and save documentation for a push
async function processPush(payload) {
  const repository = payload.repository;
  const latestCommit = payload.head_commit;

  if (!repository || !latestCommit?.id) {
    console.log(
      'Repository or head commit missing; skipping documentation.'
    );
    return;
  }

  const commitId = latestCommit.id;

  console.log(
    `Starting documentation processing for commit ${commitId}`
  );

  // Avoid generating duplicate documentation.
  const existing = await Documentation.findOne({
    commitId
  });

  if (existing) {
    console.log(
      `Documentation already exists for commit ${commitId}`
    );
    return;
  }

  console.log('GitHub compare values:', {
    repository: repository.full_name,
    before: payload.before,
    after: payload.after
  });

  const codeChanges = await getCodeChanges(
    repository,
    payload.before,
    payload.after
  );

  console.log(
    `Source changes retrieved for commit ${commitId}; ` +
    `${codeChanges.length} characters sent for documentation`
  );

  console.log(
    `Starting AI generation for commit ${commitId}`
  );

  const content = await generateDocumentation({
    repositoryUrl: repository.html_url,
    commitMessage: latestCommit.message || '',
    author: latestCommit.author?.name || '',
    codeChanges
  });

  console.log(
    'AI response received; content length:',
    typeof content === 'string' ? content.length : 0
  );

  if (typeof content !== 'string' || !content.trim()) {
    throw new Error(
      `AI returned empty or invalid documentation for commit ${commitId}`
    );
  }

  // Wait for MongoDB to finish saving before reporting success.
  const savedDocumentation = await Documentation.create({
    projectName: repository.name || 'DocuLive',
    repositoryUrl: repository.html_url,
    content,
    commitId,
    summary: latestCommit.message || 'AI-generated documentation'
  });

  console.log(
    `AI documentation saved for commit ${commitId}; ` +
    `MongoDB document ID: ${savedDocumentation._id}`
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

    // Save metadata for each commit in the push.
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

    // Acknowledge GitHub before potentially slow AI processing.
    res.status(200).json({
      message:
        'GitHub push received; documentation processing started',
      commitsReceived: payload.commits.length
    });

    // Process in the background and log any failure.
    processPush(payload)
      .then(() => {
        console.log(
          'Background documentation processing finished.'
        );
      })
      .catch(error => {
        console.error(
          'Background documentation processing failed:',
          error.stack || error.message
        );
      });
  } catch (error) {
    console.error(
      'GitHub webhook error:',
      error.stack || error.message
    );

    if (!res.headersSent) {
      return res.status(500).json({
        message: 'Failed to process GitHub webhook'
      });
    }
  }
});

module.exports = router;
