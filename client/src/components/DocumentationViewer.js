
import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import './DocumentationViewer.css';

const API_URL = 'https://doculive.onrender.com/api/documentation';

function DocumentationViewer() {
  const [documents, setDocuments] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function fetchDocumentation() {
      try {
        const response = await fetch(API_URL);

        if (!response.ok) {
          throw new Error('Unable to load documentation.');
        }

        const result = await response.json();
        const records = Array.isArray(result)
          ? result
          : result.value || result.documentation || [];

        if (active) {
          const sorted = [...records].sort(
            (a, b) =>
              new Date(b.updatedAt || b.createdAt || 0) -
              new Date(a.updatedAt || a.createdAt || 0)
          );

          setDocuments(sorted);
          setSelectedId((current) =>
            sorted.some((doc) => doc._id === current)
              ? current
              : sorted[0]?._id || ''
          );
          setError('');
        }
      } catch (err) {
        if (active) {
          setError(err.message || 'Something went wrong.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchDocumentation();
    const interval = setInterval(fetchDocumentation, 30000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const selected = documents.find((doc) => doc._id === selectedId);

  return (
    <section className="documentation-viewer">
      <div className="documentation-header">
        <div>
          <p className="documentation-eyebrow">LIVE DOCUMENTATION</p>
          <h2>Project Documentation</h2>
          <p className="documentation-description">
            Documentation fetched from the DocuLive API.
            Updates are checked every 30 seconds.
          </p>
        </div>

        <div className="documentation-commit">
          {selected ? 'Commit ID' : 'API status'}
          <strong>
            {selected
              ? `${selected.commitId || 'Not provided'}`.slice(0, 12)
              : loading
                ? 'Loading...'
                : 'No records'}
          </strong>
        </div>
      </div>
      
{selected && (
  <button
    type="button"
    className="download-documentation-button"
    onClick={() => {
      const markdown = [
        `# ${selected.projectName || 'Project Documentation'}`,
        '',
        `**Commit:** ${selected.commitId || 'Not provided'}`,
        `**Date:** ${selected.createdAt || 'Not provided'}`,
        '',
        '## Summary',
        '',
        selected.summary || 'No summary provided.',
        '',
        '## Documentation',
        '',
        selected.content || 'No documentation content provided.',
      ].join('\n');

      const blob = new Blob([markdown], {
        type: 'text/markdown;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');

      const safeName = (selected.projectName || 'documentation')
        .replace(/[^a-z0-9-_]/gi, '-');

      link.href = url;
      link.download = `${safeName}-${(selected.commitId || 'latest').slice(0, 8)}.md`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    }}
  >
    Download Documentation
  </button>
)}


      {loading && (
        <p role="status">Loading documentation...</p>
      )}

      {error && (
        <p role="alert">
          {error} Please check your connection and try again later.
        </p>
      )}

      {!loading && !error && documents.length === 0 && (
        <p>No documentation records are available yet.</p>
      )}

      {!loading && !error && documents.length > 0 && (
        <>
          <div className="documentation-content">
            <aside className="documentation-sidebar">
              <h3>Documentation History</h3>

              {documents.map((doc) => (
                <button
                  type="button"
                  key={doc._id}
                  onClick={() => setSelectedId(doc._id)}
                  aria-pressed={selectedId === doc._id}
                  className={
                    selectedId === doc._id
                      ? 'documentation-history-item selected'
                      : 'documentation-history-item'
                  }
                >
                  <strong>{doc.projectName || 'Untitled project'}</strong>
                  <span>{doc.summary || doc.commitId || 'Documentation'}</span>
                  <small>
                    {doc.createdAt
                      ? new Date(doc.createdAt).toLocaleString()
                      : 'Date unavailable'}
                  </small>
                </button>
              ))}
            </aside>

            <article className="documentation-body">
              {selected && (
                <>
                  <h3>{selected.projectName || 'Project Documentation'}</h3>

                  <p>
                    <strong>Summary:</strong>{' '}
                    {selected.summary || 'No summary provided.'}
                  </p>

                  <p>
                    <strong>Commit:</strong>{' '}
                    {selected.commitId || 'Not provided'}
                  </p>

                  <p>
                    <strong>Repository:</strong>{' '}
                    {selected.repositoryUrl ? (
                      <a
                        href={selected.repositoryUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open GitHub repository
                      </a>
                    ) : (
                      'Not provided'
                    )}
                  </p>

                  <hr />

                  <ReactMarkdown>
                    {selected.content || 'No documentation content provided.'}
                  </ReactMarkdown>
                </>
              )}
            </article>
          </div>
        </>
      )}
    </section>
  );
}

export default DocumentationViewer;
