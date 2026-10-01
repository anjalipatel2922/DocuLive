require("dotenv").config();

const { Octokit } = require("@octokit/rest");
const express = require("express");

const app = express();

app.use(express.json());

const PORT = 5000;

// GitHub API connection
const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN
});

// ================================
// HOME ROUTE
// ================================

app.get("/", (req, res) => {
    res.send("AI Code Review Backend is running!");
});

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

        // Process every commit in the push
        for (const commit of commits) {
            console.log("\nWebhook Commit:");
            console.log("Commit SHA:", commit.id);
            console.log("Message:", commit.message);
            console.log("Author:", commit.author?.name);

            try {
                // ================================
                // GET COMPLETE COMMIT INFORMATION
                // FROM GITHUB API
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
                    response.data.files.forEach((file) => {

                        console.log(
                            `${file.status}: ${file.filename} (+${file.additions} -${file.deletions})`
                        );

                        // ================================
                        // SHOW ACTUAL CODE DIFF
                        // ================================

                        if (file.patch) {
                            console.log("\n--- CODE DIFF ---");
                            console.log(file.patch);
                            console.log("--- END CODE DIFF ---\n");
                        } else {
                            console.log(
                                "No text patch available for this file."
                            );
                        }
                    });
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

// Octokit webhook integration test