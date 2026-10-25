
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

// Fetch the code changes from GitHub
async function getCodeChanges(repository, before, after) {
  if (!repository.full_name || !after) {
    throw new Error('Repository name or commit SHA is missing');
  }

  const url =
    `https://api.github.com/repos/${repository.full_name}` +
    `/compare/${before}...${after}`;

  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'DocuLive'
  };

  // Optional: useful if the repository is private
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error(`GitHub compare API returned ${response.status}`);
  }

  const data = await response.json();

  const files = (data.files || []).map(file => {
    return [
      `File: ${file.filename}`,
      `Status: ${file.status}`,
      `Changes: ${file.changes}`,
      `Patch:\n${file.patch || 'Patch unavailable'}`
    ].join('\n');
  });

  const changes = files.join('\n\n').slice(0, 30000);

  if (!changes) {
    throw new Error('GitHub returned no file diffs to document');
  }

  return changes;
}

// Generate and save documentation for a push
async function processPush(payload) {
  const repository = payload.repository;
  const commits = payload.commits || [];
  const latestCommit = payload.head_commit;

  if (!latestCommit?.id) {
    console.log('No head commit found; skipping AI documentation');
    return;
  }

  // Avoid generating the same documentation repeatedly
  const existing = await Documentation.findOne({
    commitId: latestCommit.id
  });

  if (existing) {
    console.log('Documentation already exists for this commit');
    return;
  }

  const codeChanges = await getCodeChanges(
    repository,
    payload.before,
    payload.after
  );

  const content = await generateDocumentation({
    repositoryUrl: repository.html_url,
    commitMessage: latestCommit.message || '',
    author: latestCommit.author?.name || '',
    codeChanges
  });

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
      typeof payload.repository.html_url !== 'string' ||
      !Array.isArray(payload.commits)
    ) {
      return res.status(400).json({
        message: 'Invalid GitHub push payload'
      });
    }

    const repositoryUrl = payload.repository.html_url;

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

    // Respond to GitHub before waiting for the AI request
    res.status(200).json({
      message: 'GitHub push received; documentation processing started',
      commitsProcessed: payload.commits.length
    });

    // Run AI documentation generation in the background
   processPush(payload).catch(error => {
  console.error('AI documentation generation failed:', error);
});
  } catch (error) {
    console.error('GitHub webhook error:', error.message);

    if (!res.headersSent) {
      return res.status(500).json({
        message: 'Failed to process GitHub webhook'
      });
    }
  }
});

module.exports = router;

// Test: Verify the GitHub webhook and AI documentation workflow.
