
const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema({
    repository: String,
    branch: String,
    commitSha: String,
    commitMessage: String,
    author: String,
    file: String,
    status: String,
    additions: Number,
    deletions: Number,
    review: mongoose.Schema.Types.Mixed,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("Review", reviewSchema);
