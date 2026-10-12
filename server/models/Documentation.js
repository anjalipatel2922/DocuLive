
const mongoose = require('mongoose');

const documentationSchema = new mongoose.Schema({
  projectName: {
    type: String,
    required: true
  },

  repositoryUrl: {
    type: String,
    required: true
  },

  content: {
    type: String,
    default: ''
  },

  commitId: {
    type: String,
    default: ''
  },

  summary: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

module.exports = mongoose.model(
  'Documentation',
  documentationSchema
);
