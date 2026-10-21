
function formatDocumentation(response) {
  try {
    let cleanedResponse = String(response || "").trim();

    // Remove Markdown code fences if the AI returns them.
    cleanedResponse = cleanedResponse
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const parsed = JSON.parse(cleanedResponse);

    // Support responses wrapped inside an object.
    const documentation =
      parsed.documentation &&
      typeof parsed.documentation === "object" &&
      !Array.isArray(parsed.documentation)
        ? { ...parsed, ...parsed.documentation }
        : parsed;

    const files = Array.isArray(documentation.files)
      ? documentation.files
      : [];

    const functions = Array.isArray(documentation.functions)
      ? documentation.functions
      : [];

    const changes = Array.isArray(documentation.changes)
      ? documentation.changes
      : [];

    // Build readable documentation if the AI supplies structured
    // details but omits a dedicated documentation field.
    const generatedContent = [
      documentation.summary
        ? `Summary\n${documentation.summary}`
        : "",
      documentation.impact
        ? `Impact\n${documentation.impact}`
        : "",
      files.length
        ? `Files\n${files.map(file =>
            typeof file === "string"
              ? `- ${file}`
              : `- ${JSON.stringify(file)}`
          ).join("\n")}`
        : "",
      functions.length
        ? `Functions\n${functions.map(item =>
            typeof item === "string"
              ? `- ${item}`
              : `- ${JSON.stringify(item)}`
          ).join("\n")}`
        : "",
      changes.length
        ? `Changes\n${changes.map(item =>
            typeof item === "string"
              ? `- ${item}`
              : `- ${JSON.stringify(item)}`
          ).join("\n")}`
        : ""
    ].filter(Boolean).join("\n\n");

    let content = documentation.documentation;

    // Accept a string or an array/object returned by the AI.
    if (typeof content === "object" && content !== null) {
      content = JSON.stringify(content, null, 2);
    }

    if (typeof content !== "string" || !content.trim()) {
      content = generatedContent;
    }

    return {
      summary:
        typeof documentation.summary === "string"
          ? documentation.summary
          : "",
      files,
      functions,
      changes,
      impact:
        typeof documentation.impact === "string"
          ? documentation.impact
          : "",
      documentation: content
    };
  } catch (error) {
    console.error(
      "Could not format AI response:",
      error.message
    );

    // Preserve the response instead of silently discarding it.
    return {
      summary: "",
      files: [],
      functions: [],
      changes: [],
      impact: "",
      documentation: String(response || "")
    };
  }
}

module.exports = {
  formatDocumentation
};
