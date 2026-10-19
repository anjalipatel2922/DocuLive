
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const generateDocumentation = async ({
  repositoryUrl,
  commitMessage,
  author,
  codeChanges
}) => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  if (!codeChanges || !codeChanges.trim()) {
    return 'No code changes were provided for documentation.';
  }

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You are a software documentation assistant.
Generate clear Markdown documentation from the supplied code changes.
Include:
1. Summary of the changes
2. Files or features affected
3. Important implementation details
4. API or configuration changes, if any
5. Testing notes or limitations
Do not invent details that are not supported by the code changes.`
      },
      {
        role: 'user',
        content: `Repository: ${repositoryUrl}
Commit message: ${commitMessage || 'Not provided'}
Author: ${author || 'Not provided'}

Code changes:
${codeChanges}`
      }
    ]
  });

  return response.choices[0].message.content;
};

module.exports = { generateDocumentation };
