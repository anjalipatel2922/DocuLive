import { useState } from "react";
import "./App.css";

function App() {
 
  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const runAIReview = async () => {
    if (!code.trim()) {
      setError("Please enter some code to review.");
      return;
    }

    setLoading(true);
    setError("");
    setReview(null);

    try {
      const response = await fetch("http://localhost:5000/api/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "AI review failed.");
      }

      const result = data.review.review || "";

      const getSection = (name) => {
        const match = result.match(
          new RegExp(
            name + ":\\s*([\\s\\S]*?)(?=\\n(?:BUGS|SECURITY|PERFORMANCE|CODE QUALITY|SUGGESTIONS|SUMMARY):|$)",
            "i"
          )
        );

        return match ? match[1].trim() : "No details provided.";
      };

      setReview({
        bugs: getSection("BUGS"),
        security: getSection("SECURITY"),
        performance: getSection("PERFORMANCE"),
        quality: getSection("CODE QUALITY"),
        suggestions: getSection("SUGGESTIONS"),
        summary: getSection("SUMMARY"),
      });
    } catch (err) {
      setError(
        err.message ||
          "Could not connect to the backend. Check that it is running."
      );
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="app">

      {/* ================= HEADER ================= */}

      <header className="topbar">

        <div className="brand">
          <div className="brand-icon">
            D
          </div>

          <div>
            <h1>DocuLive</h1>
            <span>AI Code Review System</span>
          </div>
        </div>

        <div className="connection-status">
          <span className="status-dot"></span>
          Backend Connected
        </div>

      </header>

      {/* ================= MAIN ================= */}

      <main className="main-container">

        <section className="hero">

          <div>
            <p className="eyebrow">
              AI POWERED DEVELOPMENT
            </p>

            <h2>
              Review your code
              <br />
              <span>before it becomes a problem.</span>
            </h2>

            <p className="hero-description">
              DocuLive automatically analyzes GitHub code changes
              and provides AI-powered feedback on bugs, security,
              performance and code quality.
            </p>
            
<textarea
  className="code-input"
  placeholder="Paste your code here for AI review..."
  value={code}
  onChange={(e) => setCode(e.target.value)}
  rows={7}
/>

{error && <p className="error-message">{error}</p>}


            
<button
  className="review-button"
  onClick={runAIReview}
  disabled={loading}
>
  {loading ? "Analyzing Code..." : "Run AI Code Review"}
</button>

          </div>

          <div className="hero-card">

            <div className="terminal-header">

              <div className="terminal-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>

              <span>github-webhook</span>

            </div>

            <div className="terminal-body">

              <p>
                <span className="terminal-green">$</span>{" "}
                github push
              </p>

              <p className="terminal-muted">
                → Webhook received
              </p>

              <p className="terminal-muted">
                → Changed files detected
              </p>

              <p className="terminal-muted">
                → Sending diff to AI
              </p>

              <p className="terminal-success">
                → AI review completed ✓
              </p>

            </div>

          </div>

        </section>

        {/* ================= STATS ================= */}

        <section className="stats">

          <div className="stat-card">
            <span className="stat-label">
              AI ENGINE
            </span>

            <strong>
              OpenRouter
            </strong>

            <small>
              Free AI model
            </small>
          </div>

          <div className="stat-card">
            <span className="stat-label">
              SOURCE
            </span>

            <strong>
              GitHub
            </strong>

            <small>
              Push Webhooks
            </small>
          </div>

          <div className="stat-card">
            <span className="stat-label">
              BACKEND
            </span>

            <strong>
              Node.js
            </strong>

            <small>
              Express + Octokit
            </small>
          </div>

          <div className="stat-card">
            <span className="stat-label">
              REVIEW AREAS
            </span>

            <strong>
              5
            </strong>

            <small>
              AI analysis categories
            </small>
          </div>

        </section>

        {/* ================= REVIEW ================= */}

        <section className="review-section">

          <div className="section-heading">

            <div>
              <p className="eyebrow">
                CODE ANALYSIS
              </p>

              <h3>
                Latest AI Review
              </h3>
            </div>

            {review && (
              <span className="review-complete">
                ✓ Review Complete
              </span>
            )}

          </div>

          {!review && !loading && (

            <div className="empty-review">

              <div className="empty-icon">
                AI
              </div>

              <h4>
                No review selected
              </h4>

              <p>
                Run the demo review to preview how DocuLive
                displays AI-generated code analysis.
              </p>

            </div>

          )}

          {loading && (

            <div className="loading-card">

              <div className="loader"></div>

              <h4>
                AI is reviewing your code...
              </h4>

              <p>
                Checking bugs, security, performance and code quality.
              </p>

            </div>

          )}

          {review && !loading && (

            <div className="review-grid">

              <div className="review-card bugs">
                <div className="review-card-header">
                  <span className="review-icon">!</span>
                  <h4>BUGS</h4>
                </div>

                <p>{review.bugs}</p>
              </div>

              <div className="review-card security">
                <div className="review-card-header">
                  <span className="review-icon">✓</span>
                  <h4>SECURITY</h4>
                </div>

                <p>{review.security}</p>
              </div>

              <div className="review-card performance">
                <div className="review-card-header">
                  <span className="review-icon">⚡</span>
                  <h4>PERFORMANCE</h4>
                </div>

                <p>{review.performance}</p>
              </div>

              <div className="review-card quality">
                <div className="review-card-header">
                  <span className="review-icon">◆</span>
                  <h4>CODE QUALITY</h4>
                </div>

                <p>{review.quality}</p>
              </div>

              <div className="review-card suggestions">
                <div className="review-card-header">
                  <span className="review-icon">→</span>
                  <h4>SUGGESTIONS</h4>
                </div>

                <p>{review.suggestions}</p>
              </div>

              <div className="summary-card">

                <div>
                  <p className="eyebrow">
                    AI SUMMARY
                  </p>

                  <h4>
                    Overall Assessment
                  </h4>
                </div>

                <p>
                  {review.summary}
                </p>

              </div>

            </div>

          )}

        </section>

        {/* ================= WORKFLOW ================= */}

        <section className="workflow-section">

          <div className="section-heading">

            <div>
              <p className="eyebrow">
                HOW IT WORKS
              </p>

              <h3>
                From GitHub push to AI review
              </h3>
            </div>

          </div>

          <div className="workflow">

            <div className="workflow-step">

              <div className="step-number">
                01
              </div>

              <h4>
                GitHub Push
              </h4>

              <p>
                Developer pushes new code to the repository.
              </p>

            </div>

            <div className="workflow-line"></div>

            <div className="workflow-step">

              <div className="step-number">
                02
              </div>

              <h4>
                Webhook
              </h4>

              <p>
                GitHub sends the code-change event to DocuLive.
              </p>

            </div>

            <div className="workflow-line"></div>

            <div className="workflow-step">

              <div className="step-number">
                03
              </div>

              <h4>
                AI Analysis
              </h4>

              <p>
                OpenRouter analyzes the changed code.
              </p>

            </div>

            <div className="workflow-line"></div>

            <div className="workflow-step">

              <div className="step-number">
                04
              </div>

              <h4>
                Review
              </h4>

              <p>
                Results are presented in an easy-to-read format.
              </p>

            </div>

          </div>

        </section>

      </main>

      {/* ================= FOOTER ================= */}

      <footer>

        <p>
          DocuLive — AI Powered Code Review System
        </p>

        <span>
          GitHub • Node.js • OpenRouter
        </span>

      </footer>

    </div>
  );
}

export default App;