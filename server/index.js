
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const { Octokit } = require("@octokit/rest");
const { generateDocumentation } = require("./documentationClient");

const app = express();

app.use(cors());

app.use(
  express.json({
    limit: "2mb",
    verify: (req, res, buf) => {
      req.rawBody = Buffer.from(buf);
    }
  })
);

const PORT = process.env.PORT || 5000;
const AI_REVIEW_URL =
  "http://localhost:5001/api/generate-documentation";
const MAX_RESULTS = 20;

const reviews = [];
const processedCommits = new Set();

const octokit = process.env.GITHUB_TOKEN
  ? new Octokit({ auth: process.env.GITHUB_TOKEN })
  : null;

// Verify that the webhook request genuinely came from GitHub.
function verifyGitHubSignature(req) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  const signature = req.get("x-hub-signature-256");

  if (!secret || !signature || !req.rawBody) {
    return false;
  }

  const expected =
    "sha256=" +
    crypto
      .createHmac("sha256", secret)
      .update(req.rawBody)
      .digest("hex");

  const receivedBuffer = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");

  return (
    receivedBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(receivedBuffer, expectedBuffer)
  );
}

function saveResult(result) {
  reviews.unshift(result);

  if (reviews.length > MAX_RESULTS) {
    reviews.pop();
  }
}

// Basic routes
app.get("/", (req, res) => {
  res.send("DocuLive backend is running");
});

app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "DocuLive backend is running"
  });
});

app.get("/api/reviews", (req, res) => {
  res.json({
    success: true,
    count: reviews.length,
    reviews
  });
});

// Generate documentation from a supplied Git diff.
app.post("/api/documentation", async (req, res) => {
  try {
    const { diff } = req.body;

    if (typeof diff !== "string" || !diff.trim()) {
      return res.status(400).json({
        success: false,
        message: "A non-empty Git diff is required."
      });
    }

    const documentation = await generateDocumentation(diff);

    return res.json({
      success: true,
      documentation
    });
  } catch (error) {
    console.error(
      "Documentation generation failed:",
      error.message
    );

    return res.status(502).json({
      success: false,
      message: "Documentation generation failed. Check the AI Engine."
    });
  }
});

// Process commits received from a GitHub push webhook.
async function processPush(payload) {
  if (!octokit) {
    throw new Error("GITHUB_TOKEN is missing from server/.env");
  }

  const repo = payload.repository;
  const owner = repo?.owner?.login;
  const repoName = repo?.name;
  const branch = payload.ref?.replace("refs/heads/", "");

  if (!owner || !repoName) {
    throw new Error(
      "Repository information is missing from the webhook."
    );
  }

  for (const commit of payload.commits || []) {
    const commitKey = `${owner}/${repoName}/${commit.id}`;

    if (processedCommits.has(commitKey)) {
      console.log("Skipping already processed commit:", commit.id);
      continue;
    }

    try {
      const response = await octokit.repos.getCommit({
        owner,
        repo: repoName,
        ref: commit.id
      });

      const files = response.data.files || [];

      const patches = files
        .filter(file => file.patch)
        .map(file =>
          [
            `File: ${file.filename}`,
            `Status: ${file.status}`,
            `Additions: ${file.additions}`,
            `Deletions: ${file.deletions}`,
            file.patch
          ].join("\n")
        );

      if (patches.length === 0) {
        console.log(
          "No text patches found for commit:",
          commit.id
        );
        processedCommits.add(commitKey);
        continue;
      }

      const diff = patches.join("\n\n---\n\n");

      const documentation = await generateDocumentation(diff);

      let review = null;

      try {
        const reviewResponse = await fetch(AI_REVIEW_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ diff })
        });

        const data = await reviewResponse.json();

        if (!reviewResponse.ok || data.success === false) {
          throw new Error(
            data.message || "AI review request failed"
          );
        }

        review = data.documentation ?? data;
      } catch (error) {
        console.error("AI review failed:", error.message);
      }

      saveResult({
        repository: `${owner}/${repoName}`,
        branch,
        commitSha: commit.id,
        commitMessage: commit.message,
        author: commit.author?.name,
        files: files.map(file => ({
          filename: file.filename,
          status: file.status,
          additions: file.additions,
          deletions: file.deletions
        })),
        documentation,
        review,
        createdAt: new Date().toISOString()
      });

      processedCommits.add(commitKey);
      console.log("Processed commit:", commit.id);
    } catch (error) {
      console.error(
        `Failed to process commit ${commit.id}:`,
        error.message
      );
    }
  }
}

// Secure GitHub webhook endpoint.
app.post("/webhook", (req, res) => {
  if (!process.env.GITHUB_WEBHOOK_SECRET) {
    return res
      .status(500)
      .send("Webhook secret is not configured.");
  }

  if (!verifyGitHubSignature(req)) {
    return res
      .status(401)
      .send("Invalid webhook signature.");
  }

  const event = req.headers["x-github-event"];

  if (event === "ping") {
    return res.status(200).send("Webhook connected!");
  }

  if (event !== "push") {
    return res
      .status(200)
      .send("Event received; no action required.");
  }

  // Respond immediately; process the commit afterward.
  res.status(202).send("Push received; processing started.");

  processPush(req.body).catch(error => {
    console.error("Push processing failed:", error.message);
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
