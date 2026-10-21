
const generateDocumentation = async ({
  repositoryUrl,
  commitMessage,
  author,
  codeChanges
}) => {
  if (!codeChanges || !codeChanges.trim()) {
    return 'No code changes were provided for documentation.';
  }

  const prompt = `You are a software documentation assistant.
Generate clear Markdown documentation from the supplied code changes.

Include:
1. Summary of the changes
2. Files or features affected
3. Important implementation details
4. API or configuration changes, if any
5. Testing notes or limitations

Do not invent details not supported by the code changes.

Repository: ${repositoryUrl}
Commit message: ${commitMessage || 'Not provided'}
Author: ${author || 'Not provided'}

Code changes:
${codeChanges}`;

  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'qwen2.5-coder:7b',
      prompt,
      stream: false
    })
  });

  if (!response.ok) {
    throw new Error(`Ollama API failed: ${response.status}`);
  }

  const data = await response.json();

  if (!data.response) {
    throw new Error('Ollama returned an empty response');
  }

  return data.response;
};

module.exports = { generateDocumentation };
