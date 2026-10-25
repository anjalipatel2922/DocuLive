
require("dotenv").config({ path: require("path").join(__dirname, ".env") });

const crypto = require("crypto");
const { Octokit } = require("@octokit/rest");
const express = require("express");
const cors = require("cors");
const { generateDocumentation } = require("./documentationClient");
const connectDB = require("./config/db");
const Review = require("./models/Review");
const Documentation = require("./models/Documentation");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());

app.use(
    express.json({
        verify: (req, res, buffer) => {
            if (req.originalUrl.startsWith("/webhook")) {
                req.rawBody = Buffer.from(buffer);
            }
        }
    })
);

const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN || undefined
});

function getRepositoryUrl(repository) {
    if (repository && typeof repository === "object" && repository.html_url) {
        return repository.html_url;
    }

    if (typeof repository === "string" && repository.includes("/")) {
        return `https://github.com/${repository}`;
    }

    return "";
}

function formatReview(record) {
    const item = { ...record };

    if (item._id) {
        item._id = String(item._id);
        item.id = item._id;
    }

    return item;
}

function formatDocumentation(record) {
    const repository = record.repository || "";
    const rawContent = record.documentation;

    const content =
        typeof rawContent === "string"
            ? rawContent
            : JSON.stringify(rawContent ?? "", null, 2);

    return {
        _id: record._id ? String(record._id) : String(record.id || ""),
        id: record._id ? String(record._id) : String(record.id || ""),
        projectName: repository ? repository.split("/").pop() : "DocuLive",
        repository,
        repositoryUrl: getRepositoryUrl(repository),
        branch: record.branch || "",
        commitId: record.commitSha || "",
        commitSha: record.commitSha || "",
        commitMessage: record.commitMessage || "",
        author: record.author || "",
        file: record.file || "",
        status: record.status || "",
        additions: record.additions || 0,
        deletions: record.deletions || 0,
        summary: record.summary || "",
        content,
        documentation: rawContent,
        createdAt: record.createdAt || new Date().toISOString(),
        updatedAt: record.updatedAt || record.createdAt || new Date().toISOString()
    };
}

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

    const expectedBuffer = Buffer.from(expected);
    const signatureBuffer = Buffer.from(signature);

    return (
        expectedBuffer.length === signatureBuffer.length &&
        crypto.timingSafeEqual(expectedBuffer, signatureBuffer)
    );
}

// HOME ROUTE
app.get("/", (req, res) => {
    res.send("AI Code Review Backend is running successfully!");
});

// GET REVIEWS FROM MONGODB
app.get("/api/reviews", async (req, res) => {
    try {
        const records = await Review.find()
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();

        const reviews = records.map(formatReview);

        res.status(200).json({
            success: true,
            count: reviews.length,
            reviews
        });
    } catch (error) {
        console.error("Failed to fetch reviews:", error.message);

        res.status(500).json({
            success: false,
            error: "Failed to fetch reviews."
        });
    }
});

// MANUAL AI CODE REVIEW
app.post("/api/reviews", async (req, res) => {
    try {
        const { code } = req.body || {};

        if (typeof code !== "string" || !code.trim()) {
            return res.status(400).json({
                success: false,
                error: "Please provide code to review."
            });
        }

        const reviewData = await reviewCode(code, {
            repository: "Manual Review",
            branch: "manual",
            commitSha: `manual-${Date.now()}`,
            commitMessage: "Manual code review",
            author: "User",
            file: "submitted-code",
            status: "modified",
            additions: 0,
            deletions: 0
        });

        if (!reviewData) {
            return res.status(502).json({
                success: false,
                error: "AI review failed. Check the backend terminal."
            });
        }

        return res.status(200).json({
            success: true,
            review: reviewData
        });
    } catch (error) {
        console.error("Manual review failed:", error.message);

        return res.status(500).json({
            success: false,
            error: "Failed to review code."
        });
    }
});

// GET DOCUMENTATION
// Return an array because the frontend expects multiple records.
app.get("/api/documentation", async (req, res) => {
    try {
        const records = await Documentation.find()
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();

        const documentation = records.map(formatDocumentation);

        return res.status(200).json({
            success: true,
            count: documentation.length,
            documentation
        });
    } catch (error) {
        console.error("Failed to fetch documentation:", error.message);

        return res.status(500).json({
            success: false,
            error: "Failed to fetch documentation."
        });
    }
});

// GET DOCUMENTATION HISTORY
app.get("/api/documentation/history", async (req, res) => {
    try {
        const records = await Documentation.find()
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();

        const documentation = records.map(formatDocumentation);

        return res.status(200).json({
            success: true,
            count: documentation.length,
            documentation
        });
    } catch (error) {
        console.error("Failed to fetch documentation history:", error.message);

        return res.status(500).json({
            success: false,
            error: "Failed to fetch documentation history."
        });
    }
});

// GET LATEST REPOSITORY DETAILS
app.get("/api/repository", async (req, res) => {
    try {
        const latest = await Documentation.findOne()
            .sort({ createdAt: -1 })
            .lean();

        return res.status(200).json({
            success: true,
            repository: latest?.repository || null,
            repositoryUrl: latest
                ? getRepositoryUrl(latest.repository)
                : null,
            branch: latest?.branch || null,
            commitSha: latest?.commitSha || null
        });
    } catch (error) {
        console.error("Failed to fetch repository details:", error.message);

        return res.status(500).json({
            success: false,
            error: "Failed to fetch repository details."
        });
    }
});

// AI CODE REVIEW AND MONGODB STORAGE
async function reviewCode(codeDiff, commitInfo) {
    try {
        console.log("\n========== AI CODE REVIEW ==========");

        if (!process.env.OPENROUTER_API_KEY) {
            throw new Error("OPENROUTER_API_KEY is missing from server/.env");
        }

        const response = await fetch(
            "https://openrouter.ai/api/v1/chat/completions",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    "HTTP-Referer": "http://localhost:5000",
                    "X-Title": "DocuLive AI Code Review"
                },
                body: JSON.stringify({
                    model: "openrouter/free",
                    messages: [
                        {
                            role: "user",
                            content: `
You are an expert software engineer and code reviewer.

Review this GitHub code change:

${codeDiff}

Provide a practical review using this format:

BUGS:
- List bugs or potential bugs.

SECURITY:
- List security problems.

PERFORMANCE:
- List performance concerns.

CODE QUALITY:
- List code quality issues.

SUGGESTIONS:
- Give practical improvements.

SUMMARY:
- Give a short summary.
`
                        }
                    ]
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.error?.message || `OpenRouter HTTP ${response.status}`
            );
        }

        const review =
            data.choices?.[0]?.message?.content || "No review returned.";

        const saved = await Review.create({
            repository: commitInfo.repository || "Manual Review",
            branch: commitInfo.branch || "",
            commitSha: commitInfo.commitSha || "",
            commitMessage: commitInfo.commitMessage || "",
            author: commitInfo.author || "",
            file: commitInfo.file || "",
            status: commitInfo.status || "completed",
            additions: commitInfo.additions || 0,
            deletions: commitInfo.deletions || 0,
            review,
            createdAt: new Date()
        });

        console.log("AI review saved to MongoDB.");

        return formatReview(saved.toObject());
    } catch (error) {
        console.error("Review or storage failed:", error.message);
        return null;
    }
}

// AI DOCUMENTATION AND MONGODB STORAGE
async function saveDocumentation(codeDiff, commitInfo) {
    try {
        console.log("\n========== AI DOCUMENTATION ==========");

        const result = await generateDocumentation(codeDiff);

        if (!result) {
            throw new Error("Documentation engine returned no result.");
        }

        const documentationData = {
            repository: commitInfo.repository || "Unknown Repository",
            branch: commitInfo.branch || "",
            commitSha: commitInfo.commitSha || "",
            commitMessage: commitInfo.commitMessage || "",
            author: commitInfo.author || "",
            file: commitInfo.file || "",
            status: commitInfo.status || "completed",
            additions: commitInfo.additions || 0,
            deletions: commitInfo.deletions || 0,
            summary:
                typeof result === "object" && result !== null
                    ? result.summary || ""
                    : "",
            documentation:
                typeof result === "object" && result !== null
                    ? result.documentation ?? result
                    : result,
            createdAt: new Date()
        };

        const saved = await Documentation.create(documentationData);

        console.log("Documentation saved to MongoDB.");

        return formatDocumentation(saved.toObject());
    } catch (error) {
        console.error(
            "Documentation generation/storage failed:",
            error.message
        );

        return null;
    }
}

// PROCESS GITHUB PUSH EVENTS
async function processPush(payload) {
    const repository = payload.repository?.full_name;
    const branch = payload.ref?.replace("refs/heads/", "");
    const commits = payload.commits || [];

    console.log("\n========== PROCESSING PUSH ==========");
    console.log("Repository:", repository);
    console.log("Branch:", branch);

    if (
        !repository ||
        !payload.repository?.owner?.login ||
        !payload.repository?.name
    ) {
        console.error("Push payload is missing repository details.");
        return;
    }

    for (const commit of commits) {
        try {
            console.log("\nCommit:", commit.id);
            console.log("Message:", commit.message);

            const response = await octokit.repos.getCommit({
                owner: payload.repository.owner.login,
                repo: payload.repository.name,
                ref: commit.id
            });

            const files = response.data.files || [];

            for (const file of files) {
                console.log("Changed file:", file.filename);

                if (!file.patch) {
                    console.log("No text patch available:", file.filename);
                    continue;
                }

                const codeDiff = `File: ${file.filename}

Status: ${file.status}

Changes:
${file.patch}`;

                const commitInfo = {
                    repository,
                    branch,
                    commitSha: commit.id,
                    commitMessage: commit.message,
                    author: commit.author?.name || "",
                    file: file.filename,
                    status: file.status,
                    additions: file.additions,
                    deletions: file.deletions
                };

                await Promise.allSettled([
                    reviewCode(codeDiff, commitInfo),
                    saveDocumentation(codeDiff, commitInfo)
                ]);
            }
        } catch (error) {
            console.error(
                "Commit processing failed:",
                commit.id,
                error.message
            );
        }
    }

    console.log("\n========== PUSH PROCESSING COMPLETE ==========\n");
}

// GITHUB WEBHOOK WITH SIGNATURE VERIFICATION
app.post("/webhook", (req, res) => {
    if (!process.env.GITHUB_WEBHOOK_SECRET) {
        return res.status(500).send(
            "GITHUB_WEBHOOK_SECRET is not configured."
        );
    }

    if (!verifyGitHubSignature(req)) {
        return res.status(401).send("Invalid GitHub webhook signature.");
    }

    const event = req.get("x-github-event");
    const payload = req.body;

    console.log("GitHub event:", event);

    if (event === "ping") {
        return res.status(200).send("Webhook connected!");
    }

    if (event === "push") {
        res.status(202).send("Webhook received; processing started.");

        processPush(payload).catch((error) => {
            console.error("Background processing failed:", error.message);
        });

        return;
    }

    return res.status(200).send(
        `Event '${event || "unknown"}' ignored.`
    );
});

app.use((err, req, res, next) => {
    console.error("Unhandled server error:", err.message);

    if (res.headersSent) {
        return next(err);
    }

    return res.status(500).json({
        success: false,
        error: "Internal server error."
    });
});

// CONNECT TO MONGODB BEFORE STARTING THE SERVER
async function startServer() {
    try {
        await connectDB();

        app.listen(PORT, () => {
            console.log(`Server running at http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error("Server startup failed:", error.message);
        process.exit(1);
    }
}

startServer();
