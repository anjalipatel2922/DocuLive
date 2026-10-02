
const assert = require("node:assert/strict");

const { formatDocumentation } = require("../src/formatter");
const { buildPrompt } = require("../src/prompt");

// Test 1: The prompt includes the supplied Git diff.
const sampleDiff = `
diff --git a/server/auth.js b/server/auth.js
+function login() {
+  return true;
+}
`;

const prompt = buildPrompt(sampleDiff);

assert.ok(prompt.includes(sampleDiff), "Prompt should include the Git diff");
console.log("PASS: Prompt includes the Git diff");

// Test 2: Valid JSON is converted into documentation.
const sampleResponse = JSON.stringify({
  summary: "Added login function",
  files: ["server/auth.js"],
  functions: ["login()"],
  changes: ["Added a login function"],
  impact: "The application can now use the login function.",
  documentation: "This change adds a login function."
});

const result = formatDocumentation(sampleResponse);

assert.equal(result.summary, "Added login function");
assert.deepEqual(result.files, ["server/auth.js"]);
assert.deepEqual(result.functions, ["login()"]);
assert.equal(result.documentation, "This change adds a login function.");
console.log("PASS: Valid AI response is formatted correctly");

// Test 3: Missing fields receive safe defaults.
const incompleteResult = formatDocumentation('{"summary":"Small update"}');

assert.equal(incompleteResult.summary, "Small update");
assert.deepEqual(incompleteResult.files, []);
assert.deepEqual(incompleteResult.changes, []);
console.log("PASS: Missing fields receive default values");

console.log("\nAll 3 tests passed!");
