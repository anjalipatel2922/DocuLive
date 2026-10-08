require("dotenv").config();

const { Octokit } = require("@octokit/rest");
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
// HOME ROUTE
// ================================

app.get("/", (req, res) => {
    res.send("AI Code Review Backend is running successfully!");
});

// ================================
// OPENROUTER AI CODE REVIEW
// ================================

async function reviewCode(codeDiff) {
    try {
        console.log("\n========== AI CODE REVIEW ==========");

        const response = await fetch(
            "https://openrouter.ai/api/v1/chat/completions",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
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

Review the following GitHub code change.

${codeDiff}

Analyze the code carefully and provide a practical code review.

Use exactly this format:

BUGS:
- List bugs or potential bugs.
- If there are no important bugs, say "No major bugs found."

SECURITY:
- List security problems.
- If there are no security problems, say "No major security issues found."

PERFORMANCE:
- List performance concerns.
- If there are no important concerns, say "No major performance issues found."

CODE QUALITY:
- List code quality issues.

SUGGESTIONS:
- Give practical improvements.

SUMMARY:
- Give a short summary of the review.
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

        console.log("\nAI REVIEW RESULT:");

        console.log(
            data.choices?.[0]?.message?.content ||
            "No review returned."
        );

        console.log("\n====================================\n");

    } catch (error) {

        console.log("\nOpenRouter API error:");
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

        console.log(
            "GitHub webhook connected successfully!"
        );

        return res.status(200).send(
            "Webhook connected!"
        );
    }

    // ================================
    // GITHUB PUSH EVENT
    // ================================

    if (event === "push") {

        const repository = payload.repository?.full_name;
        const branch = payload.ref?.replace(
            "refs/heads/",
            ""
        );

        const commits = payload.commits || [];

        console.log("Repository:", repository);
        console.log("Branch:", branch);

        // ================================
        // PROCESS EVERY COMMIT
        // ================================

        for (const commit of commits) {

            console.log("\nWebhook Commit:");

            console.log(
                "Commit SHA:",
                commit.id
            );

            console.log(
                "Message:",
                commit.message
            );

            console.log(
                "Author:",
                commit.author?.name
            );

            try {

                // ================================
                // GET COMPLETE COMMIT INFORMATION
                // ================================

                const response =
                    await octokit.repos.getCommit({

                        owner:
                            payload.repository.owner.login,

                        repo:
                            payload.repository.name,

                        ref: commit.id
                    });

                console.log(
                    "\nGitHub API Commit Details:"
                );

                console.log(
                    "Commit SHA:",
                    response.data.sha
                );

                console.log(
                    "Message:",
                    response.data.commit.message
                );

                // ================================
                // CHANGED FILES
                // ================================

                console.log("\nChanged Files:");

                if (response.data.files) {

                    for (
                        const file of response.data.files
                    ) {

                        console.log(
                            `${file.status}: ${file.filename} (+${file.additions} -${file.deletions})`
                        );

                        // ================================
                        // CODE DIFF
                        // ================================

                        if (file.patch) {

                            console.log(
                                "\n--- CODE DIFF ---"
                            );

                            console.log(file.patch);

                            console.log(
                                "--- END CODE DIFF ---\n"
                            );

                            // ================================
                            // SEND CODE TO OPENROUTER
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

    console.log(
        "\n====================================\n"
    );

    res.status(200).send(
        "Webhook received successfully!"
    );
});

// ================================
// START SERVER
// ================================

app.listen(PORT, () => {

    console.log(
        `Server running at http://localhost:${PORT}`
    );

});