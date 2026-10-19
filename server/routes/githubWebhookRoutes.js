
const express = require('express');
const crypto = require('crypto');
const router = express.Router();

const GitHubCommit = require('../models/GitHubCommit');

// Verify that the request came from a sender
// who knows the GitHub webhook secret
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

  const receivedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    receivedBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(receivedBuffer, expectedBuffer)
  ) {
    return res.status(401).json({
      message: 'Invalid webhook signature'
    });
  }

  next();
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

    return res.status(200).json({
      message: 'GitHub push event processed successfully',
      commitsProcessed: payload.commits.length
    });
  } catch (error) {
    console.error('GitHub webhook error:', error.message);

    return res.status(500).json({
      message: 'Failed to process GitHub webhook'
    });
  }
});

module.exports = router;
 