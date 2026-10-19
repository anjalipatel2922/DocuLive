
const DOCUMENTATION_URL =
    process.env.DOCUMENTATION_URL ||
    "http://localhost:5001/api/generate-documentation";

async function generateDocumentation(diff) {
    if (!diff || typeof diff !== "string") {
        throw new Error("A Git diff is required.");
    }

    const response = await fetch(DOCUMENTATION_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ diff })
    });

    const data = await response.json();

    if (!response.ok || data.success === false) {
        throw new Error(
            data.message || data.error || "Documentation generation failed."
        );
    }

    return data.documentation ?? data;
}

module.exports = { generateDocumentation };
