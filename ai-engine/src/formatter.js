function formatDocumentation(response) {
  try {
    // Remove Markdown code fences if the AI returns them
    let cleanedResponse = response.trim();

    cleanedResponse = cleanedResponse
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    // Convert AI response into JSON
    const documentation = JSON.parse(cleanedResponse);

    // Make sure the expected fields exist
    return {
      summary: documentation.summary || "",
      files: Array.isArray(documentation.files)
        ? documentation.files
        : [],
      functions: Array.isArray(documentation.functions)
        ? documentation.functions
        : [],
      changes: Array.isArray(documentation.changes)
        ? documentation.changes
        : [],
      impact: documentation.impact || "",
      documentation: documentation.documentation || ""
    };
  } catch (error) {
    console.error("Could not format AI response:", error.message);

    return {
      summary: "",
      files: [],
      functions: [],
      changes: [],
      impact: "",
      documentation: response
    };
  }
}

module.exports = {
  formatDocumentation
};