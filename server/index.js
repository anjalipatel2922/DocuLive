const express = require("express");

const app = express();

app.use(express.json());

const PORT = 5000;

// Home route
app.get("/", (req, res) => {
    res.send("AI Code Review Backend is running!");
});

// GitHub webhook route
app.post("/webhook", (req, res) => {
    const event = req.headers["x-github-event"];
    const payload = req.body;

    console.log("\n========== GITHUB WEBHOOK ==========");

    console.log("Event:", event);

    // GitHub connection test
    if (event === "ping") {
        console.log("GitHub webhook connected successfully!");
        return res.status(200).send("Webhook connected!");
    }

    // Detect code push
    if (event === "push") {
        const repository = payload.repository?.full_name;
        const branch = payload.ref?.replace("refs/heads/", "");

        console.log("Repository:", repository);
        console.log("Branch:", branch);

        // Display commit details
        if (payload.commits && payload.commits.length > 0) {
            payload.commits.forEach((commit, index) => {
                console.log(`\nCommit ${index + 1}`);

                console.log("Message:", commit.message);
                console.log("Author:", commit.author?.name);

                console.log("Added files:", commit.added);
                console.log("Modified files:", commit.modified);
                console.log("Removed files:", commit.removed);
            });
        } else {
            console.log("No commit details found.");
        }
    }

    console.log("====================================\n");

    res.status(200).send("Webhook received successfully!");
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});