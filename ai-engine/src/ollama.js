const dotenv = require("dotenv");

const { buildPrompt } = require("./prompt");
const { formatDocumentation } = require("./formatter");

dotenv.config();

const MODEL = process.env.OLLAMA_MODEL || "qwen2.5-coder:7b";

let ollama;

async function generateDocumentation(diff) {
  if (!diff || typeof diff !== "string") {
    throw new Error("A Git diff is required.");
  }

  // Load Ollama
  if (!ollama) {
    const ollamaModule = await import("ollama");
    ollama = ollamaModule.default;
  }

  const prompt = buildPrompt(diff);

  console.log("Sending diff to Ollama...");

  const response = await ollama.chat({
    model: MODEL,
    messages: [
      {
        role: "user",
        content: prompt
      }
    ],
    format: "json",
    stream: false
  });

  const aiResponse = response.message.content;

  console.log("Ollama response received.");

  return formatDocumentation(aiResponse);
}

module.exports = {
  generateDocumentation
};