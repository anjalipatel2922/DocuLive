
require("dotenv").config({ path: require("path").join(__dirname, ".env") });

const { Octokit } = require("@octokit/rest");
const express = require("express");
const cors = require("cors");
const { generateDocumentation } = require("./documentationClient");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 5000;

// ==================================================
// TEMPORARY IN-MEMORY STORAGE
// Member 4 can replace this with MongoDB later.
// ==================================================

let reviews = [];
let documentationHistory = [];

// ==================================================
// GITHUB API CONNECTION
// ==================================================

const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN
});

// ==================================================
// HOME ROUTE
// ==================================================

app.get("/", (req, res) => {
    res.send("AI Code Review Backend is running successfully!");
});

// ==================================================
// GET AI REVIEWS
// ==================================================

app.get("/api/reviews", (req, res) => {
    res.status(200).json({
        success: true,
        count: reviews.length,
        reviews
    });
});

// ==================================================
// GET LATEST DOCUMENTATION
// ==================================================

app.get("/api/documentation", (req, res) => {
    res.status(200).json({
        success: true,
        documentation: documentationHistory[0] || null
    });
});

// ==================================================
// GET DOCUMENTATION HISTORY
// ==================================================

app.get("/api/documentation/history", (req, res) => {
    res.status(200).json({
        success: true,
        count: documentationHistory.length,
        documentation: documentationHistory
    });
});

// ==================================================
// GET LATEST REPOSITORY DETAILS
// ==================================================

app.get("/api/repository", (req, res) => {
    const latest = documentationHistory[0];

    res.status(200).json({
        success: true,
        repository: latest?.repository || null,
        branch: latest?.branch || null,
        commitSha: latest?.commitSha || null
    });
});

// ==================================================
// OPENROUTER AI CODE REVIEW
// ==================================================

async function reviewCode(codeDiff, commitInfo) {
    try {
        console.log("\n========== AI CODE REVIEW ==========");

        const response = await fetch(
            "https://openrouter.ai/api/v1/chat/completions",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization":
                        `Bearer ${process.env.OPENROUTER_API_KEY}`,
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
                data.error?.message ||
                `OpenRouter HTTP ${response.status}`
            );
        }

        const review =
            data.choices?.[0]?.message?.content ||
            "No review returned.";

        const reviewData = {
            id: Date.now(),
            ...commitInfo,
            review,
            createdAt: new Date().toISOString()
        };

        reviews.unshift(reviewData);
        reviews = reviews.slice(0, 20);

        console.log("AI review saved successfully.");
        console.log(review);

        return reviewData;
    } catch (error) {
        console.error("OpenRouter API error:", error.message);
        return null;
    }
}

// ==================================================
// GENERATE AND STORE DOCUMENTATION
// ==================================================

async function saveDocumentation(codeDiff, commitInfo) {
    try {
        console.log("\n========== AI DOCUMENTATION ==========");

        const result = await generateDocumentation(codeDiff);

        if (!result) {
            throw new Error("Documentation engine returned no result.");
        }

        const documentationData = {
            id: `${commitInfo.commitSha}-${commitInfo.file}`,
            repository: commitInfo.repository,
            branch: commitInfo.branch,
            commitSha: commitInfo.commitSha,
            commitMessage: commitInfo.commitMessage,
            author: commitInfo.author,
            file: commitInfo.file,
            status: commitInfo.status,
            additions: commitInfo.additions,
            deletions: commitInfo.deletions,
            summary: result.summary || "",
            documentation: result.documentation || "",
            createdAt: new Date().toISOString()
        };

        // Keep newest documentation first.
        documentationHistory.unshift(documentationData);

        // Temporary limit until MongoDB integration.
        documentationHistory = documentationHistory.slice(0, 100);

        console.log("Documentation saved successfully.");
        console.log("Summary:", documentationData.summary);
        console.log("Documentation:", documentationData.documentation);

        return documentationData;
    } catch (error) {
        console.error(
            "Documentation generation failed:",
            error.message
        );

        return null;
    }
}

// ==================================================
// PROCESS GITHUB PUSH
// ==================================================

async function processPush(payload) {
    const repository = payload.repository?.full_name;

    const branch = payload.ref?.replace("refs/heads/", "");
    const commits = payload.commits || [];

    console.log("\n========== PROCESSING PUSH ==========");
    console.log("Repository:", repository);
    console.log("Branch:", branch);

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
                    console.log(
                        "No text patch available:",
                        file.filename
                    );
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
                    author: commit.author?.name,
                    file: file.filename,
                    status: file.status,
                    additions: file.additions,
                    deletions: file.deletions
                };

                // Run both AI features independently.
                // One failure should not prevent the other.

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

// ==================================================
// GITHUB WEBHOOK
// ==================================================

app.post("/webhook", (req, res) => {
    const event = req.headers["x-github-event"];
    const payload = req.body;

    console.log("GitHub event:", event);

    if (event === "ping") {
        return res.status(200).send("Webhook connected!");
    }

    if (event === "push") {
        // Acknowledge the event before AI processing.
        res.status(200).send("Webhook received successfully!");

        processPush(payload).catch((error) => {
            console.error(
                "Background processing failed:",
                error.message
            );
        });

        return;
    }

    return res.status(200).send("Webhook received successfully!");
});

// ==================================================
// START SERVER
// ==================================================

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});

// Webhook integration test
