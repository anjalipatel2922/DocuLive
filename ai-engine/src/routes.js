const express = require("express");
const router = express.Router();

const { generateDocumentation } = require("./ollama");

router.post("/generate-documentation", async (req, res) => {
  try {
    const documentation = await generateDocumentation(req.body?.diff);

    return res.status(200).json({
      success: true,
      documentation
    });
  } catch (error) {
    console.error("Documentation generation failed:", error);

    return res.status(500).json({
      success: false,
      error: error.message || "Failed to generate documentation."
    });
  }
});

module.exports = router;