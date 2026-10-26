function formatDocumentation(response) {
  if (typeof response !== "string" || !response.trim()) {
    throw new Error("AI returned an empty documentation response.");
  }

  let cleanedResponse = response.trim();

  // Remove Markdown code fences, if present.
  cleanedResponse = cleanedResponse
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  let documentation;

  try {
    documentation = JSON.parse(cleanedResponse);
  } catch (error) {
    console.error("Invalid AI documentation JSON:", cleanedResponse);

    throw new Error(
      "AI returned an invalid response instead of documentation JSON."
    );
  }

  // Validate that the response contains useful documentation.
  const hasUsefulContent =
    (typeof documentation.summary === "string" &&
      documentation.summary.trim().length > 0) ||
    (typeof documentation.documentation === "string" &&
      documentation.documentation.trim().length > 0) ||
    (Array.isArray(documentation.changes) &&
      documentation.changes.length > 0);

  if (!hasUsefulContent) {
    throw new Error(
      "AI returned valid JSON but no useful documentation."
    );
  }

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
}

module.exports = {
  formatDocumentation
};
