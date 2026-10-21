
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
    default: undefined,
    trim: true
  },

  summary: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

documentationSchema.index(
  { commitId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      commitId: { $type: 'string' }
    }
  }
);

module.exports = mongoose.model(
  'Documentation',
  documentationSchema
);
