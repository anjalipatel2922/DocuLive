
const AI_ENGINE_URL =
  process.env.AI_ENGINE_URL || "http://localhost:5001";

const generateDocumentation = async ({
  repositoryUrl,
  commitMessage,
  author,
  codeChanges
}) => {
  if (!codeChanges || !codeChanges.trim()) {
    return "No code changes were provided for documentation.";
  }

  const context = [
    `Repository: ${repositoryUrl || "Not provided"}`,
    `Commit message: ${commitMessage || "Not provided"}`,
    `Author: ${author || "Not provided"}`,
    "",
    "Code changes:",
    codeChanges
  ].join("\n");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);

  try {
    const response = await fetch(
      `${AI_ENGINE_URL}/api/generate-documentation`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ diff: context }),
        signal: controller.signal
      }
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(
        result.error || `AI engine returned HTTP ${response.status}`
      );
    }

    if (!result.documentation) {
      throw new Error("AI engine returned empty documentation.");
    }

    return typeof result.documentation === "string"
      ? result.documentation
      : JSON.stringify(result.documentation, null, 2);
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("AI documentation request timed out.");
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

module.exports = { generateDocumentation };
