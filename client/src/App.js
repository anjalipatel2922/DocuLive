
import { useCallback, useEffect, useState } from 'react';
import './App.css';
import DocumentationViewer from './components/DocumentationViewer';

const API_BASE = 'http://localhost:5000';

const SECTION_NAMES = [
  'BUGS',
  'SECURITY',
  'PERFORMANCE',
  'CODE QUALITY',
  'SUGGESTIONS',
  'SUMMARY',
];

function getSection(review, sectionName) {
  if (!review || typeof review !== 'string') {
    return 'No information provided for this section.';
  }

  const escapeRegex = (value) =>
    value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const currentSection = escapeRegex(sectionName);
  const otherSections = SECTION_NAMES
    .filter((name) => name !== sectionName)
    .map(escapeRegex)
    .join('|');

  const regex = new RegExp(
    String.raw`(?:\*\*)?\s*${currentSection}\s*:(?:\*\*)?\s*([\s\S]*?)(?=(?:\*\*)?\s*(?:${otherSections})\s*:(?:\*\*)?\s*|$)`,
    'i'
  );

  const match = review.match(regex);

  if (!match || !match[1].trim()) {
    return 'No information provided for this section.';
  }

  const content = match[1]
    .replace(/\*\*/g, '')
    .replace(/^\s*[-*]\s*/gm, '')
    .trim();

  return content || 'No information provided for this section.';
}

function formatDate(value) {
  if (!value) return 'Not available';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString();
}

function App() {
  const [reviews, setReviews] = useState([]);
  const [documentation, setDocumentation] = useState([]);
  const [repository, setRepository] = useState(null);

  const [backendConnected, setBackendConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchResults = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [reviewsResponse, docsResponse, repoResponse] =
        await Promise.all([
          fetch(`${API_BASE}/api/reviews`),
          fetch(`${API_BASE}/api/documentation/history`),
          fetch(`${API_BASE}/api/repository`),
        ]);

      if (
        !reviewsResponse.ok ||
        !docsResponse.ok ||
        !repoResponse.ok
      ) {
        throw new Error('One or more backend API requests failed.');
      }

      const [reviewsData, docsData, repoData] = await Promise.all([
        reviewsResponse.json(),
        docsResponse.json(),
        repoResponse.json(),
      ]);

      setReviews(
        Array.isArray(reviewsData.reviews)
          ? reviewsData.reviews
          : []
      );

      const docs = Array.isArray(docsData.documentation)
        ? docsData.documentation
        : docsData.documentation
          ? [docsData.documentation]
          : [];

      setDocumentation(docs);
      setRepository(repoData);
      setBackendConnected(true);
    } catch (err) {
      console.error('Failed to load DocuLive results:', err);
      setBackendConnected(false);
      setError(
        'Could not load dashboard results. Make sure the backend is running at http://localhost:5000.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const latestReview = reviews[0] || null;
  const latestDocumentation = documentation[0] || null;

  const reviewText =
    typeof latestReview?.review === 'string'
      ? latestReview.review
      : '';

  const sections = [
    {
      title: 'BUGS',
      key: 'BUGS',
      className: 'bugs',
      icon: '!',
    },
    {
      title: 'SECURITY',
      key: 'SECURITY',
      className: 'security',
      icon: '✓',
    },
    {
      title: 'PERFORMANCE',
      key: 'PERFORMANCE',
      className: 'performance',
      icon: '⚡',
    },
    {
      title: 'CODE QUALITY',
      key: 'CODE QUALITY',
      className: 'quality',
      icon: '◆',
    },
    {
      title: 'SUGGESTIONS',
      key: 'SUGGESTIONS',
      className: 'suggestions',
      icon: '→',
    },
  ];

  return (
    <div className="app">
      {/* HEADER */}
      <header className="topbar">
        <div className="brand">
          <div className="brand-icon">D</div>

          <div>
            <h1>DocuLive</h1>
            <span>AI Code Review System</span>
          </div>
        </div>

        <div className="connection-status">
          <span
            className="status-dot"
            style={{
              background: backendConnected ? '#22c55e' : '#ef4444',
            }}
          />

          {backendConnected
            ? 'Backend Connected'
            : 'Backend Disconnected'}
        </div>
      </header>

      {/* MAIN DASHBOARD */}
      <main className="main-container" id="dashboard">
        <div className="dashboard-actions">
          <button
            className="review-button"
            onClick={fetchResults}
            disabled={loading}
          >
            {loading ? 'Refreshing...' : 'Refresh AI Results'}
          </button>
        </div>

        {error && (
          <div className="error-message" role="alert">
            {error}
          </div>
        )}

        {/* SUMMARY CARDS */}
        <section className="stats">
          <div className="stat-card">
            <span className="stat-label">AI ENGINE</span>
            <strong>OpenRouter</strong>
            <small>AI code analysis</small>
          </div>

          <div className="stat-card">
            <span className="stat-label">SOURCE</span>
            <strong>GitHub</strong>
            <small>Push webhooks</small>
          </div>

          <div className="stat-card">
            <span className="stat-label">AI REVIEWS</span>
            <strong>{reviews.length}</strong>
            <small>Records returned by API</small>
          </div>

          <div className="stat-card">
            <span className="stat-label">DOCUMENTATION</span>
            <strong>{documentation.length}</strong>
            <small>Records returned by API</small>
          </div>
        </section>

        {/* LATEST AI REVIEW */}
        <section className="review-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">CODE ANALYSIS</p>
              <h3>Latest AI Review</h3>
            </div>

            {latestReview && (
              <span className="review-complete">
                ✓ Review Available
              </span>
            )}
          </div>

          {loading && !latestReview && (
            <div className="loading-card">
              <div className="loader" />
              <h4>Loading AI results...</h4>
            </div>
          )}

          {!loading && !latestReview && (
            <div className="empty-review">
              <div className="empty-icon">AI</div>
              <h4>No AI review available yet</h4>
              <p>
                Push a commit to your connected GitHub repository
                to generate a review.
              </p>
            </div>
          )}

          {latestReview && (
            <>
              <div className="review-meta">
                <p>
                  <strong>Repository:</strong>{' '}
                  {latestReview.repository || 'Not available'}
                </p>

                <p>
                  <strong>Branch:</strong>{' '}
                  {latestReview.branch || 'Not available'}
                </p>

                <p>
                  <strong>Commit:</strong>{' '}
                  {latestReview.commitSha || 'Not available'}
                </p>

                <p>
                  <strong>Commit message:</strong>{' '}
                  {latestReview.commitMessage || 'Not available'}
                </p>

                <p>
                  <strong>Author:</strong>{' '}
                  {latestReview.author || 'Not available'}
                </p>

                <p>
                  <strong>File:</strong>{' '}
                  {latestReview.file || 'Not available'}
                </p>

                <p>
                  <strong>Created:</strong>{' '}
                  {formatDate(latestReview.createdAt)}
                </p>
              </div>

              <div className="review-grid">
                {sections.map((section) => (
                  <div
                    className={`review-card ${section.className}`}
                    key={section.key}
                  >
                    <div className="review-card-header">
                      <span className="review-icon">
                        {section.icon}
                      </span>
                      <h4>{section.title}</h4>
                    </div>

                    <p className="review-section-content">
                      {getSection(reviewText, section.key)}
                    </p>
                  </div>
                ))}

                <div className="summary-card">
                  <div>
                    <p className="eyebrow">AI SUMMARY</p>
                    <h4>Overall Assessment</h4>
                  </div>

                  <p>{getSection(reviewText, 'SUMMARY')}</p>
                </div>
              </div>

              <details className="full-review">
                <summary>View complete AI review</summary>
                <pre>{reviewText || 'No review text available.'}</pre>
              </details>
            </>
          )}
        </section>

        {/* YOUR DOCUMENTATION HISTORY AND MARKDOWN VIEWER */}
        <section
          className="review-section"
          id="documentation"
        >
          <DocumentationViewer />
        </section>

        {/* LATEST GENERATED DOCUMENTATION FROM BACKEND */}
        <section className="review-section documentation-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">GENERATED DOCUMENTATION</p>
              <h3>Latest Documentation</h3>
            </div>
          </div>

          {!latestDocumentation && !loading && (
            <div className="empty-review">
              <h4>No documentation available yet</h4>
              <p>
                Documentation will appear here after a GitHub push
                has been processed.
              </p>
            </div>
          )}

          {latestDocumentation && (
            <div className="documentation-card">
              <div className="review-meta">
                <p>
                  <strong>Repository:</strong>{' '}
                  {latestDocumentation.repository || 'Not available'}
                </p>

                <p>
                  <strong>Branch:</strong>{' '}
                  {latestDocumentation.branch || 'Not available'}
                </p>

                <p>
                  <strong>File:</strong>{' '}
                  {latestDocumentation.file || 'Not available'}
                </p>

                <p>
                  <strong>Commit:</strong>{' '}
                  {latestDocumentation.commitSha || 'Not available'}
                </p>

                <p>
                  <strong>Created:</strong>{' '}
                  {formatDate(latestDocumentation.createdAt)}
                </p>
              </div>

              <h4>Summary</h4>
              <p>
                {latestDocumentation.summary ||
                  'No summary was returned.'}
              </p>

              <h4>Documentation content</h4>
              <pre className="documentation-content">
                {latestDocumentation.documentation ||
                  latestDocumentation.content ||
                  'No documentation content was returned.'}
              </pre>
            </div>
          )}
        </section>

        {/* REPOSITORY INFORMATION */}
        <section className="review-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">GITHUB INTEGRATION</p>
              <h3>Repository Information</h3>
            </div>
          </div>

          <div className="review-meta">
            <p>
              <strong>Repository:</strong>{' '}
              {repository?.repository || 'Waiting for repository data'}
            </p>

            <p>
              <strong>Branch:</strong>{' '}
              {repository?.branch || 'Not available'}
            </p>

            <p>
              <strong>Latest commit:</strong>{' '}
              {repository?.commitSha || 'Not available'}
            </p>
          </div>
        </section>

        {/* WORKFLOW */}
        <section className="workflow-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">HOW IT WORKS</p>
              <h3>From GitHub push to AI review</h3>
            </div>
          </div>

          <div className="workflow">
            <div className="workflow-step">
              <div className="step-number">01</div>
              <h4>GitHub Push</h4>
              <p>Developer pushes changes to the repository.</p>
            </div>

            <div className="workflow-line" />

            <div className="workflow-step">
              <div className="step-number">02</div>
              <h4>Secure Webhook</h4>
              <p>GitHub sends a signed event to DocuLive.</p>
            </div>

            <div className="workflow-line" />

            <div className="workflow-step">
              <div className="step-number">03</div>
              <h4>AI Analysis</h4>
              <p>OpenRouter reviews the changed code.</p>
            </div>

            <div className="workflow-line" />

            <div className="workflow-step">
              <div className="step-number">04</div>
              <h4>Results</h4>
              <p>Reviews and documentation appear on the dashboard.</p>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer>
        <p>DocuLive — AI Powered Code Review System</p>
        <span>GitHub • Node.js • React • OpenRouter</span>
      </footer>
    </div>
  );
}

export default App;
