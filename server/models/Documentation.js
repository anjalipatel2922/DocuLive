
const mongoose = require("mongoose");

const documentationSchema = new mongoose.Schema({
    // Existing integration/frontend fields
    projectName: {
        type: String,
        default: "DocuLive"
    },
    repositoryUrl: {
        type: String,
        default: ""
    },
    content: {
        type: String,
        default: ""
    },
    commitId: {
        type: String,
        default: undefined,
        trim: true
    },

    // Backend/webhook fields
    repository: {
        type: String,
        default: ""
    },
    branch: {
        type: String,
        default: ""
    },
    commitSha: {
        type: String,
        default: ""
    },
    commitMessage: {
        type: String,
        default: ""
    },
    author: {
        type: String,
        default: ""
    },
    file: {
        type: String,
        default: ""
    },
    status: {
        type: String,
        default: ""
    },
    additions: {
        type: Number,
        default: 0
    },
    deletions: {
        type: Number,
        default: 0
    },
    summary: {
        type: String,
        default: ""
    },
    documentation: {
        type: mongoose.Schema.Types.Mixed,
        default: ""
    }
}, {
    timestamps: true
});

documentationSchema.index(
    { commitId: 1 },
    {
        unique: true,
        partialFilterExpression: {
            commitId: { $type: "string" }
        }
    }
);

module.exports = mongoose.model(
    "Documentation",
    documentationSchema
);
