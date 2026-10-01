require("dotenv").config();

const { Octokit } = require("@octokit/rest");
const OpenAI = require("openai");
const express = require("express");

const app = express();

app.use(express.json());

const PORT = 5000;

// ================================
// GITHUB API CONNECTION
// ================================

const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN
});

// ================================
// OPENAI API CONNECTION
// ================================

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// ================================
// HOME ROUTE
// ================================

app.get("/", (req, res) => {
    res.send("AI Code Review Backend is running!");
});

// ================================
// AI CODE REVIEW FUNCTION
// ================================

async function reviewCode(codeDiff) {
    try {
        console.log("\n========== AI CODE REVIEW ==========");

        const response = await openai.responses.create({
            model: "gpt-5.6-luna",

            input: [
                {
                    role: "system",
                    content:
                        "You are an expert software engineer and code reviewer. Review the provided GitHub code diff. Identify bugs, security issues, performance problems, code quality issues, and improvements. Be practical and explain issues clearly."
                },
                {
                    role: "user",
                    content: `Review the following GitHub code changes:

${codeDiff}

Provide your review in this format:

BUGS:
- List important bugs or potential bugs.

SECURITY:
- List security problems, if any.

PERFORMANCE:
- List performance concerns, if any.

CODE QUALITY:
- List code quality issues.

SUGGESTIONS:
- Give practical suggestions for improvement.

SUMMARY:
- Give a short overall summary.`
                }
            ]
        });

        console.log("\nAI REVIEW RESULT:");
        console.log(response.output_text);

        console.log("\n====================================\n");

    } catch (error) {
        console.log("\nOpenAI API error:");

        console.log(error.message);
    }
}

// ================================
// GITHUB WEBHOOK ROUTE
// ================================

app.post("/webhook", async (req, res) => {
    const event = req.headers["x-github-event"];
    const payload = req.body;

    console.log("\n========== GITHUB WEBHOOK ==========");
    console.log("Event:", event);

    // ================================
    // GITHUB PING EVENT
    // ================================

    if (event === "ping") {
        console.log("GitHub webhook connected successfully!");

        return res.status(200).send("Webhook connected!");
    }

    // ================================
    // GITHUB PUSH EVENT
    // ================================

    if (event === "push") {
        const repository = payload.repository?.full_name;
        const branch = payload.ref?.replace("refs/heads/", "");
        const commits = payload.commits || [];

        console.log("Repository:", repository);
        console.log("Branch:", branch);

        // Process every commit
        for (const commit of commits) {
            console.log("\nWebhook Commit:");
            console.log("Commit SHA:", commit.id);
            console.log("Message:", commit.message);
            console.log("Author:", commit.author?.name);

            try {
                // ================================
                // GET COMPLETE COMMIT INFORMATION
                // ================================

                const response = await octokit.repos.getCommit({
                    owner: payload.repository.owner.login,
                    repo: payload.repository.name,
                    ref: commit.id
                });

                console.log("\nGitHub API Commit Details:");
                console.log("Commit SHA:", response.data.sha);
                console.log("Message:", response.data.commit.message);

                // ================================
                // CHANGED FILES
                // ================================

                console.log("\nChanged Files:");

                if (response.data.files) {

                    for (const file of response.data.files) {

                        console.log(
                            `${file.status}: ${file.filename} (+${file.additions} -${file.deletions})`
                        );

                        // ================================
                        // CODE DIFF
                        // ================================

                        if (file.patch) {

                            console.log("\n--- CODE DIFF ---");
                            console.log(file.patch);
                            console.log("--- END CODE DIFF ---\n");

                            // ================================
                            // SEND CODE TO AI REVIEWER
                            // ================================

                            await reviewCode(
                                `File: ${file.filename}

Status: ${file.status}

Changes:
${file.patch}`
                            );

                        } else {

                            console.log(
                                "No text patch available for this file."
                            );
                        }
                    }
                }

            } catch (error) {

                console.log(
                    "GitHub API error:",
                    error.status,
                    error.message
                );
            }
        }
    }

    console.log("\n====================================\n");

    res.status(200).send("Webhook received successfully!");
});

// ================================
// START SERVER
// ================================

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});

// Octokit + OpenAI integration

// AI code review test