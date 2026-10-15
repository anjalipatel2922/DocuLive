function buildPrompt(diff) {
  return `
You are an AI documentation generator for a software project.

Your job is to analyze a Git code diff and convert the changes into clear,
accurate, human-readable technical documentation.

Analyze ONLY the information contained in the provided diff.
Do not invent functionality that is not shown in the diff.

Return ONLY valid JSON.
Do not use Markdown code fences.
Do not add explanations before or after the JSON.

The JSON must follow this exact structure:

{
  "summary": "A short explanation of what changed.",
  "files": ["List of changed files"],
  "functions": ["Functions, classes, or methods affected"],
  "changes": [
    "Important change 1",
    "Important change 2"
  ],
  "impact": "Explain the effect of the changes on the application.",
  "documentation": "A clear human-readable description of the changes."
}

Important rules:
1. Identify the files changed in the diff.
2. Identify functions, classes, or methods that were changed.
3. Explain what was added, removed, or modified.
4. Explain the purpose of the change when it can be determined from the diff.
5. Do not invent details.
6. Keep the documentation easy for a developer to understand.
7. If a category cannot be determined from the diff, use an empty array or a short statement.
8. Return valid JSON only.

Here is the Git diff:

${diff}
`;
}

module.exports = {
  buildPrompt
};