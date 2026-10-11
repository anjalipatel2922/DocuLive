import { useState } from "react";
import "./App.css";

function App() {
  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(false);

  const demoReview = {
    bugs: "No major bugs found.",
    security: "No major security issues found.",
    performance: "No major performance issues found.",
    quality:
      "Some formatting inconsistencies were detected in the submitted code.",
    suggestions:
      "Use a consistent formatter such as Prettier or ESLint across the project.",
    summary:
      "The code does not contain major functional, security, or performance problems. The main improvement area is code formatting and consistency.",
  };

  const runDemoReview = () => {
    setLoading(true);

    setTimeout(() => {
      setReview(demoReview);
      setLoading(false);
    }, 1200);
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

            <button
              className="review-button"
              onClick={runDemoReview}
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