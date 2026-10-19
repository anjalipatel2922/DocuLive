const ollama = require("ollama");

async function generateDocumentation(diff) {

    const prompt = `
You are DocuLive, an automatic software documentation generator.

Analyze the following Git diff.

Identify:

1. Files changed
2. Functions changed
3. Classes changed
4. Added functionality
5. Removed functionality
6. Modified functionality
7. Potential impact

Generate clear technical documentation.

Git Diff:

${diff}
`;

    const response = await ollama.chat({
        model: "qwen2.5-coder:7b",
        messages: [
            {
                role: "user",
                content: prompt
            }
        ]
    });

    return response.message.content;
}

module.exports = {
    generateDocumentation
};