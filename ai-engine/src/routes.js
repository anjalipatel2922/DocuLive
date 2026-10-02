const express = require("express");
const { generateDocumentation } = require("./ollama");

const router = express.Router();

router.post("/generate-documentation", async (req, res) => {
  try {
    const { diff } = req.body;

    // Check whether a diff was provided
    if (!diff || typeof diff !== "string") {
      return res.status(400).json({
        error: "Git diff is required."
      });
    }

    // Send the diff to the AI engine
    const documentation = await generateDocumentation(diff);

    res.json({
      success: true,
      documentation
    });

  } catch (error) {
    console.error("Documentation generation failed:", error);

    res.status(500).json({
      success: false,
      error: "Failed to generate documentation."
    });
  }
});

module.exports = router;