
const mongoose = require('mongoose');

const githubCommitSchema = new mongoose.Schema({
  repositoryUrl: {
    type: String,
    required: true
  },

  commitId: {
    type: String,
    required: true,
    unique: true
  },

  commitMessage: {
    type: String,
    default: ''
  },

  author: {
    type: String,
    default: ''
  },

  committedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model(
  'GitHubCommit',
  githubCommitSchema
);
