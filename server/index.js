const express = require("express");

const app = express();

app.use(express.json());

const PORT = 5000;

app.get("/", (req, res) => {
    res.send("AI Code Review Backend is running!");
});

app.post("/webhook", (req, res) => {
    console.log("GitHub webhook received!");

    console.log(req.body);

    res.status(200).send("Webhook received successfully!");
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});// Testing GitHub webhook
