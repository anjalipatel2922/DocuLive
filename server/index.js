require("dotenv").config();

const { Octokit } = require("@octokit/rest");
const express = require("express");

const app = express();

app.use(express.json());

const PORT = 5000;

const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN
});

// Home route
app.get("/", (req, res) => {
    res.send("AI Code Review Backend is running!");
});

// GitHub webhook route
app.post("/webhook", async (req, res) => {
    const event = req.headers["x-github-event"];
    const payload = req.body;

    console.log("\n========== GITHUB WEBHOOK ==========");
    console.log("Event:", event);

    // GitHub connection test
    if (event === "ping") {
        console.log("GitHub webhook connected successfully!");
        return res.status(200).send("Webhook connected!");
    }

    // Handle GitHub push event
    if (event === "push") {
        const repository = payload.repository?.full_name;
        const branch = payload.ref?.replace("refs/heads/", "");
        const commits = payload.commits || [];

        console.log("Repository:", repository);
        console.log("Branch:", branch);

        for (const commit of commits) {
            console.log("\nWebhook Commit:");
            console.log("Commit SHA:", commit.id);
            console.log("Message:", commit.message);
            console.log("Author:", commit.author?.name);

            try {
                // Fetch complete commit information from GitHub
                const response = await octokit.repos.getCommit({
                    owner: payload.repository.owner.login,
                    repo: payload.repository.name,
                    ref: commit.id
                });

                console.log("\nGitHub API Commit Details:");
                console.log("Commit SHA:", response.data.sha);
                console.log("Message:", response.data.commit.message);

                console.log("\nChanged Files:");

                if (response.data.files) {
                    response.data.files.forEach((file) => {
                        console.log(
                            `${file.status}: ${file.filename} (+${file.additions} -${file.deletions})`
                        );
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

// Start server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});     // Octokit webhook integration test