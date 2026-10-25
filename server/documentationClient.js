
const AI_ENGINE_URL =
  process.env.AI_ENGINE_URL ||
  "http://localhost:5001";

async function generateDocumentation(diff) {
  if (!diff || typeof diff !== "string") {
    throw new Error("A Git diff is required.");
  }

  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, 30000);

  try {
    const response = await fetch(
      `${AI_ENGINE_URL}/api/generate-documentation`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ diff }),
        signal: controller.signal
      }
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(
        result.error || "Documentation generation failed."
      );
    }

    return result.documentation;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error(
        "AI documentation service timed out after 30 seconds."
      );
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { generateDocumentation };