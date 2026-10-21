
import { useEffect, useState } from 'react';
import './App.css';
import DocumentationViewer from './components/DocumentationViewer';

const API_URL = 'https://doculive.onrender.com/api/documentation';

function App() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      try {
        const response = await fetch(API_URL);

        if (!response.ok) {
          throw new Error('Could not load dashboard data.');
        }

        const result = await response.json();
        const records = Array.isArray(result)
          ? result
          : result.value || result.documentation || [];

        const sorted = [...records].sort(
          (a, b) =>
            new Date(b.updatedAt || b.createdAt || 0) -
            new Date(a.updatedAt || a.createdAt || 0)
        );

        if (active) {
          setDocuments(sorted);
          setError('');
        }
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadDashboard();
    const interval = setInterval(loadDashboard, 30000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const latest = documents[0];
  const formatDate = (date) =>
    date ? new Date(date).toLocaleString() : 'Date unavailable';

  return (
    <div className="app">
      <header className="navbar">
        <div className="brand">
          <div className="brand-icon">D</div>
          <span>DocuLive</span>
        </div>

        <nav className="navigation">
          <a href="#dashboard">Dashboard</a>
          <a href="#documentation">Documentation</a>
          <a href="#history">History</a>
        </nav>
      </header>

      <main className="dashboard" id="dashboard">
        <section className="hero">
          <div>
            <p className="eyebrow">LIVE DOCUMENTATION</p>
            <h1>Documentation Dashboard</h1>
            <p className="hero-text">
              Keep your project documentation synchronized with
              changes in your codebase.
            </p>
          </div>
        </section>

        <section className="repository-card">
          <div>
            <p className="card-label">CONNECTED REPOSITORY</p>
            <h2>DocuLive</h2>
            <a
              href="https://github.com/anjalipatel2922/DocuLive"
              target="_blank"
              rel="noreferrer"
            >
              anjalipatel2922 / DocuLive
            </a>
          </div>

          <span className="status-badge">
            <span className="status-dot"></span>
            {loading ? 'Connecting...' : error ? 'API unavailable' : 'API connected'}
          </span>
        </section>

        {error && (
          <p role="alert">
            {error} Check your internet connection and try again.
          </p>
        )}

        <section className="summary-grid">
          <div className="summary-card">
            <p className="card-label">DOCUMENTATION RECORDS</p>
            <h3>{loading ? 'Loading...' : documents.length}</h3>
            <p>Records currently returned by the documentation API.</p>
          </div>

          <div className="summary-card">
            <p className="card-label">LATEST DOCUMENTATION UPDATE</p>
            <h3 title={latest?.commitId || ''}>
  {latest?.commitId
    ? latest.commitId.slice(0, 8)
    : loading
      ? 'Loading...'
      : 'No records'}
</h3>
            <p>{latest?.summary || 'No recent documentation available.'}</p>
            <span className="time-text">
              {latest ? formatDate(latest.updatedAt || latest.createdAt) : ''}
            </span>
          </div>
        </section>

        <div id="documentation">
          <DocumentationViewer />
        </div>

        <section className="history-section" id="history">
          <div className="section-heading">
            <div>
              <p className="eyebrow">DOCUMENTATION VERSIONS</p>
              <h2>Documentation History</h2>
            </div>
          </div>

          {loading && <p>Loading documentation history...</p>}

          {!loading && !error && documents.length === 0 && (
            <p>No documentation history is available yet.</p>
          )}

          {!error && documents.length > 0 && (
            <div className="history-table">
              <div className="table-header">
                <span>Project</span>
                <span>Commit</span>
                <span>Date</span>
                <span>Summary</span>
              </div>

              {documents.map((doc) => (
                <div className="table-row" key={doc._id}>
                  <strong>{doc.projectName || 'DocuLive'}</strong>
                  <code title={doc.commitId || ''}>
                    {doc.commitId
                      ? `${doc.commitId.slice(0, 8)}`
                      : 'Unavailable'}
                  </code>
                  <span>{formatDate(doc.createdAt)}</span>
                  <span>
                    {doc.summary || 'No summary available.'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {!loading && error && (
            <p>History could not be loaded from the API.</p>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
