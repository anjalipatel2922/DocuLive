const dotenv = require("dotenv");
const path = require("path");

const { buildPrompt } = require("./prompt");
const { formatDocumentation } = require("./formatter");

// Load the API key from the existing server/.env file.
dotenv.config({
  path: path.resolve(__dirname, "../../server/.env")
});

async function generateDocumentation(diff) {
  if (!diff || typeof diff !== "string") {
    throw new Error("A Git diff is required.");
  }

  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error(
      "OPENROUTER_API_KEY was not found. Check server/.env."
    );
  }

  const prompt = buildPrompt(diff);

  console.log("Sending diff to OpenRouter for documentation...");

  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "http://localhost:5001",
        "X-Title": "DocuLive AI Documentation"
      },
      body: JSON.stringify({
        model: "openrouter/free",
        messages: [
          {
            role: "user",
            content:
              prompt +
              "\n\nReturn valid JSON only, without Markdown code fences."
          }
        ],
        response_format: {
          type: "json_object"
        }
      })
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error("OpenRouter request failed:", response.status);
    throw new Error(
      data.error?.message || `OpenRouter HTTP ${response.status}`
    );
  }

  const aiResponse = data.choices?.[0]?.message?.content;

  if (!aiResponse) {
    throw new Error("OpenRouter returned an empty response.");
  }

  console.log("OpenRouter documentation response received.");

  return formatDocumentation(aiResponse);
}

module.exports = {
  generateDocumentation
};
