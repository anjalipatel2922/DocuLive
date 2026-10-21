
const generateDocumentation = async ({
  repositoryUrl,
  commitMessage,
  author,
  codeChanges
}) => {
  if (!codeChanges || !codeChanges.trim()) {
    return 'No code changes were provided for documentation.';
  }

  const accessToken = process.env.OLLAMA_PROXY_TOKEN;

  if (!process.env.OLLAMA_URL || !accessToken) {
    throw new Error('OLLAMA_URL or OLLAMA_PROXY_TOKEN is not configured');
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

  const ollamaUrl = process.env.OLLAMA_URL.replace(/\/+$/, '');

  const response = await fetch(`${ollamaUrl}/api/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      prompt,
      stream: false
    })
  });

  if (!response.ok) {
    throw new Error(`Ollama proxy failed: ${response.status}`);
  }

  const data = await response.json();

  if (!data.response) {
    throw new Error('Ollama returned an empty response');
  }

  return data.response;
};

module.exports = { generateDocumentation };
