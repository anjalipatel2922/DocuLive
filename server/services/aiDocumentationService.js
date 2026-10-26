
const generateDocumentation = async ({
  repositoryUrl,
  commitMessage,
  author,
  codeChanges
}) => {
  if (!codeChanges || !codeChanges.trim()) {
    throw new Error('No code changes were provided for documentation');
  }

  const accessToken = process.env.OLLAMA_PROXY_TOKEN;

  if (!process.env.OLLAMA_URL || !accessToken) {
    throw new Error(
      'OLLAMA_URL or OLLAMA_PROXY_TOKEN is not configured'
    );
  }

  const prompt = `You are DocuLive, a precise software documentation assistant.

Generate useful Markdown documentation based ONLY on the supplied code changes.

Repository: ${repositoryUrl}
Commit message: ${commitMessage || 'Not provided'}
Author: ${author || 'Not provided'}

CODE CHANGES:
${codeChanges}

Follow these rules:
1. Start with the heading "# Documentation Changes".
2. Explain what actually changed and why, using the commit message only as context.
3. Identify the modified files and describe their specific changes.
4. Explain relevant functions, components, routes, APIs, and data flow when visible in the diff.
5. Mention configuration or dependency changes only when present in the supplied changes.
6. Include testing information only when supported by the changes. Do not claim tests passed unless the diff proves it.
7. If a change is unclear, explicitly say so rather than guessing.
8. Do not output a generic package.json template.
9. Do not reproduce the entire source code or invent features.
10. Use concise, specific Markdown with these sections:

## Summary
## Files Changed
## Implementation Details
## API and Configuration Changes
## Testing and Limitations

Omit a section if it is genuinely not applicable. Do not fill sections with guesses.

Return only the documentation in Markdown.`;

  const ollamaUrl = process.env.OLLAMA_URL.replace(/\/+$/, '');

  console.log(
    `AI request starting; URL configured, input size: ${codeChanges.length} characters`
  );
  console.log(`Commit message: ${commitMessage || 'Not provided'}`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000);

  try {
    const response = await fetch(`${ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        prompt,
        stream: false
      }),
      signal: controller.signal
    });

    console.log(`Ollama proxy responded with HTTP ${response.status}`);

    if (!response.ok) {
      const details = await response.text();
      throw new Error(
        `Ollama proxy failed: HTTP ${response.status}: ${details.slice(0, 500)}`
      );
    }

    const data = await response.json();

    if (!data.response || !data.response.trim()) {
      throw new Error('Ollama returned an empty response');
    }

    console.log(
      `AI documentation generated; output size: ${data.response.length} characters`
    );

    return data.response.trim();
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Ollama request timed out after 120 seconds');
    }

    throw new Error(`AI request failed: ${error.message}`);
  } finally {
    clearTimeout(timeout);
  }
};

module.exports = { generateDocumentation };
