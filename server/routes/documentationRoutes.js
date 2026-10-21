
const express = require('express');
const router = express.Router();

const Documentation = require('../models/Documentation');

// POST: Save new documentation
router.post('/', async (req, res) => {
  try {
    const { projectName, repositoryUrl } = req.body;
    const { commitId } = req.body;

// Prevent duplicate documentation for the same commit
if (commitId) {
  const existingDocumentation = await Documentation.findOne({ commitId });

  if (existingDocumentation) {
    return res.status(409).json({
      message: 'Documentation already exists for this commit.',
      data: existingDocumentation
    });
  }
}

    if (
      typeof projectName !== 'string' ||
      !projectName.trim() ||
      typeof repositoryUrl !== 'string' ||
      !repositoryUrl.trim()
    ) {
      return res.status(400).json({
        message: 'Project name and repository URL are required.'
      });
    }

    const documentation = new Documentation({
      ...req.body,
      projectName: projectName.trim(),
      repositoryUrl: repositoryUrl.trim()
    });

    const savedDocumentation = await documentation.save();

    res.status(201).json({
      message: 'Documentation saved successfully',
      data: savedDocumentation
    });
  } catch (error) {
    res.status(400).json({
      message: 'Failed to save documentation',
      error: error.message
    });
  }
});

// GET: Retrieve all documentation
router.get('/', async (req, res) => {
  try {
    const documentation = await Documentation.find();

    res.status(200).json(documentation);
  } catch (error) {
    res.status(500).json({
      message: 'Failed to retrieve documentation',
      error: error.message
    });
  }
});

// GET: Retrieve documentation by ID
router.get('/:id', async (req, res) => {
  try {
    if (!/^[a-fA-F0-9]{24}$/.test(req.params.id)) {
      return res.status(400).json({
        message: 'Invalid documentation ID format'
      });
    }

    const documentation = await Documentation.findById(req.params.id);

    if (!documentation) {
      return res.status(404).json({
        message: 'Documentation not found'
      });
    }

    res.status(200).json(documentation);
  } catch (error) {
    res.status(500).json({
      message: 'Failed to retrieve documentation',
      error: error.message
    });
  }
});

module.exports = router;

