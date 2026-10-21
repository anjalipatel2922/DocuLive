
require("dotenv").config({
    path: require("path").join(__dirname, ".env")
});

const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const { Octokit } = require("@octokit/rest");
const { generateDocumentation } = require("./documentationClient");
const Review = require("./models/Review");
const Documentation = require("./models/Documentation");
const connectDB = require("./config/db");

const app = express();
const PORT = process.env.PORT || 5000;

// ==================================================
// MIDDLEWARE
// ==================================================

app.use(cors());

// Capture the raw body for GitHub signature verification.
app.use(
    express.json({
        limit: "1mb",
        verify: (req, res, buffer) => {
            if (req.path === "/webhook") {
                req.rawBody = Buffer.from(buffer);
            }
        }
    })
);

// ==================================================
// GITHUB API
// ==================================================

const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN
});

// ==================================================
// GITHUB SIGNATURE VERIFICATION
// ==================================================

function verifyGitHubSignature(req, res, next) {
    const secret = process.env.GITHUB_WEBHOOK_SECRET;
    const signature = req.get("x-hub-signature-256");

    if (!secret) {
        console.error("[WEBHOOK] Secret is missing.");

        return res.status(500).send(
            "Webhook secret is not configured."
        );
    }

    if (
        !signature ||
        !Buffer.isBuffer(req.rawBody) ||
        !signature.startsWith("sha256=")
    ) {
        return res.status(401).send(
            "Invalid webhook signature."
        );
    }

    const expectedSignature =
        "sha256=" +
        crypto
            .createHmac("sha256", secret)
            .update(req.rawBody)
            .digest("hex");

    const receivedBuffer = Buffer.from(signature, "utf8");
    const expectedBuffer = Buffer.from(
        expectedSignature,
        "utf8"
    );

    if (
        receivedBuffer.length !== expectedBuffer.length ||
        !crypto.timingSafeEqual(
            receivedBuffer,
            expectedBuffer
        )
    ) {
        console.warn("[WEBHOOK] Signature mismatch.");

        return res.status(401).send(
            "Invalid webhook signature."
        );
    }

    console.log("[WEBHOOK] Signature verified successfully.");
    next();
}

// ==================================================
// HELPER FUNCTIONS
// ==================================================

function formatReview(document) {
    const item = document.toObject
        ? document.toObject()
        : document;

    return {
        ...item,
        id: item._id.toString()
    };
}

function formatDocumentation(document) {
    const item = document.toObject
        ? document.toObject()
        : document;

    return {
        ...item,
        id: `${item.commitSha}-${item.file}`
    };
}

// ==================================================
// HOME ROUTE
// ==================================================

app.get("/", (req, res) => {
    res.send(
        "AI Code Review Backend is running successfully!"
    );
});

// ==================================================
// REVIEWS API - MONGODB
// ==================================================

app.get("/api/reviews", async (req, res) => {
    try {
        const storedReviews = await Review.find()
            .sort({ createdAt: -1 })
            .limit(20)
            .lean();

        const formattedReviews = storedReviews.map(
            (item) => ({
                ...item,
                id: item._id.toString()
            })
        );

        res.status(200).json({
            success: true,
            count: formattedReviews.length,
            reviews: formattedReviews
        });
    } catch (error) {
        console.error(
            "[REVIEWS API] Failed to fetch reviews:",
            error.message
        );

        res.status(500).json({
            success: false,
            message: "Failed to fetch reviews."
        });
    }
});

// ==================================================
// DOCUMENTATION API - MONGODB
// ==================================================

app.get("/api/documentation", async (req, res) => {
    try {
        const latestDocumentation =
            await Documentation.findOne()
                .sort({ createdAt: -1 })
                .lean();

        res.status(200).json({
            success: true,
            documentation: latestDocumentation
                ? {
                    ...latestDocumentation,
                    id: `${latestDocumentation.commitSha}-${latestDocumentation.file}`
                }
                : null
        });
    } catch (error) {
        console.error(
            "[DOCUMENTATION API] Failed to fetch documentation:",
            error.message
        );

        res.status(500).json({
            success: false,
            message: "Failed to fetch documentation."
        });
    }
});

app.get(
    "/api/documentation/history",
    async (req, res) => {
        try {
            const storedDocumentation =
                await Documentation.find()
                    .sort({ createdAt: -1 })
                    .limit(100)
                    .lean();

            const formattedDocumentation =
                storedDocumentation.map((item) => ({
                    ...item,
                    id: `${item.commitSha}-${item.file}`
                }));

            res.status(200).json({
                success: true,
                count: formattedDocumentation.length,
                documentation: formattedDocumentation
            });
        } catch (error) {
            console.error(
                "[DOCUMENTATION API] Failed to fetch history:",
                error.message
            );

            res.status(500).json({
                success: false,
                message: "Failed to fetch documentation history."
            });
        }
    }
);

// ==================================================
// REPOSITORY API - MONGODB
// ==================================================

app.get("/api/repository", async (req, res) => {
    try {
        const latest = await Documentation.findOne()
            .sort({ createdAt: -1 })
            .lean();

        res.status(200).json({
            success: true,
            repository: latest?.repository || null,
            branch: latest?.branch || null,
            commitSha: latest?.commitSha || null
        });
    } catch (error) {
        console.error(
            "[REPOSITORY API] Failed to fetch repository:",
            error.message
        );

        res.status(500).json({
            success: false,
            message: "Failed to fetch repository information."
        });
    }
});

// ==================================================
// OPENROUTER AI CODE REVIEW
// ==================================================

async function reviewCode(codeDiff, commitInfo) {
    try {
        console.log("\n========== AI CODE REVIEW ==========");

        if (!process.env.OPENROUTER_API_KEY) {
            throw new Error(
                "OPENROUTER_API_KEY is missing from server/.env"
            );
        }

        const response = await fetch(
            "https://openrouter.ai/api/v1/chat/completions",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization:
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

        // Save the review permanently in MongoDB.
        const savedReview = await Review.create({
            ...commitInfo,
            review,
            createdAt: new Date()
        });

        const reviewData = formatReview(savedReview);

        console.log("AI review saved to MongoDB successfully.");
        console.log(review);

        return reviewData;
    } catch (error) {
        console.error(
            "Code review failed:",
            error.message
        );

        return null;
    }
}

// ==================================================
// AI DOCUMENTATION - MONGODB
// ==================================================

async function saveDocumentation(codeDiff, commitInfo) {
    try {
        console.log("\n========== AI DOCUMENTATION ==========");

        const result = await generateDocumentation(codeDiff);

        if (!result) {
            throw new Error(
                "Documentation engine returned no result."
            );
        }

        // Save the generated documentation permanently.
        const savedDocumentation =
            await Documentation.create({
                ...commitInfo,
                summary: result.summary || "",
                documentation: result.documentation || "",
                createdAt: new Date()
            });

        const documentationData =
            formatDocumentation(savedDocumentation);

        console.log(
            "Documentation saved to MongoDB successfully."
        );
        console.log(
            "Summary:",
            documentationData.summary
        );

        return documentationData;
    } catch (error) {
        console.error(
            "Documentation generation or saving failed:",
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

    if (
        !payload.repository?.owner?.login ||
        !payload.repository?.name
    ) {
        console.error(
            "[PUSH] Repository details are missing."
        );

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
                    author: commit.author?.name || "",
                    file: file.filename,
                    status: file.status,
                    additions: file.additions,
                    deletions: file.deletions
                };

                // Run both operations independently.
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

    console.log(
        "\n========== PUSH PROCESSING COMPLETE ==========\n"
    );
}

// ==================================================
// GITHUB WEBHOOK
// ==================================================

app.post(
    "/webhook",
    verifyGitHubSignature,
    (req, res) => {
        const event = req.get("x-github-event");
        const payload = req.body;

        console.log("[WEBHOOK] Verified event:", event);

        if (event === "ping") {
            return res.status(200).send(
                "Webhook connected successfully!"
            );
        }

        if (event === "push") {
            // Respond immediately; AI work continues in the background.
            res.status(200).send(
                "Webhook received successfully!"
            );

            processPush(payload).catch((error) => {
                console.error(
                    "Background processing failed:",
                    error.message
                );
            });

            return;
        }

        return res.status(200).send(
            "Webhook received successfully!"
        );
    }
);

// ==================================================
// ERROR HANDLER
// ==================================================

app.use((error, req, res, next) => {
    console.error(
        "[SERVER] Request error:",
        error.message
    );

    if (res.headersSent) {
        return next(error);
    }

    res.status(400).send("Invalid request body.");
});

// ==================================================
// START SERVER
// ==================================================

const startServer = async () => {
    try {
        await connectDB();

        app.listen(PORT, () => {
            console.log(
                `Server running at http://localhost:${PORT}`
            );
        });
    } catch (error) {
        console.error(
            "Server startup failed:",
            error.message
        );

        process.exit(1);
    }
};

startServer();
