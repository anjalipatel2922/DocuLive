
const mongoose = require("mongoose");

const documentationSchema = new mongoose.Schema({
    repository: String,
    branch: String,
    commitSha: String,
    commitMessage: String,
    author: String,
    file: String,
    status: String,
    additions: Number,
    deletions: Number,
    summary: String,
    documentation: mongoose.Schema.Types.Mixed,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model(
    "Documentation",
    documentationSchema
);
