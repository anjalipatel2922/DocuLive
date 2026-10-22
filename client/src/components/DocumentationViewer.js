
import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import './DocumentationViewer.css';

const API_URL =
  'https://doculive.onrender.com/api/documentation';

function formatDate(date) {
  if (!date) return 'Date unavailable';

  const parsed = new Date(date);

  return Number.isNaN(parsed.getTime())
    ? 'Date unavailable'
    : parsed.toLocaleString();
}

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
          throw new Error(
            `Unable to load documentation (${response.status}).`
          );
        }

        const result = await response.json();

        const records = Array.isArray(result)
          ? result
          : result.value ||
            result.documentation ||
            result.data ||
            [];

        if (!Array.isArray(records)) {
          throw new Error('The API returned an unexpected format.');
        }

        const sorted = [...records].sort(
          (a, b) =>
            new Date(b.updatedAt || b.createdAt || 0) -
            new Date(a.updatedAt || a.createdAt || 0)
        );

        if (active) {
          setDocuments(sorted);

          setSelectedId((current) =>
            sorted.some(
              (doc) => String(doc._id) === String(current)
            )
              ? current
              : String(sorted[0]?._id || '')
          );

          setError('');
        }
      } catch (err) {
        if (active) {
          setError(
            err.message || 'Unable to load documentation.'
          );
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

  const selected = documents.find(
    (doc) => String(doc._id) === String(selectedId)
  );

  function downloadDocumentation() {
    if (!selected) return;

    const markdown = [
      `# ${selected.projectName || 'Project Documentation'}`,
      '',
      `**Summary:** ${selected.summary || 'Not provided'}`,
      '',
      `**Commit:** ${selected.commitId || 'Not provided'}`,
      '',
      `**Repository:** ${selected.repositoryUrl || 'Not provided'}`,
      '',
      selected.content || 'No documentation content provided.',
    ].join('\n');

    const blob = new Blob([markdown], {
      type: 'text/markdown;charset=utf-8',
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    const safeName = (
      selected.projectName || 'documentation'
    ).replace(/[^a-z0-9-_]/gi, '-');

    link.href = url;
    link.download =
      `${safeName}-${(selected.commitId || 'latest').slice(0, 8)}.md`;

    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="documentation-viewer">
      <header className="documentation-header">
        <div className="documentation-heading">
          <p className="documentation-eyebrow">
            LIVE DOCUMENTATION
          </p>

          <h2>Project Documentation</h2>

          <p className="documentation-description">
            Explore project changes, implementation details,
            and documentation history in one place.
          </p>
        </div>

        <div className="documentation-commit">
          <span>SELECTED COMMIT</span>
          <strong>
            {selected?.commitId
              ? selected.commitId.slice(0, 12)
              : loading
                ? 'Loading...'
                : 'No commit'}
          </strong>

          <span className="documentation-api-status">
            <span
              className={`documentation-status-dot ${
                error
                  ? 'is-error'
                  : loading
                    ? 'is-loading'
                    : 'is-connected'
              }`}
            />
            {error
              ? 'API unavailable'
              : loading
                ? 'Connecting...'
                : 'API connected'}
          </span>
        </div>
      </header>

      {selected && (
        <div className="documentation-toolbar">
          <span>
            <strong>{documents.length}</strong>{' '}
            documentation {documents.length === 1 ? 'record' : 'records'}
          </span>

          <button
            type="button"
            className="download-documentation-button"
            onClick={downloadDocumentation}
          >
            Download Documentation
          </button>
        </div>
      )}

      {loading && (
        <div className="documentation-message" role="status">
          Loading documentation records...
        </div>
      )}

      {error && (
        <div className="documentation-error" role="alert">
          {error}
          <button
            type="button"
            onClick={() => window.location.reload()}
          >
            Reload page
          </button>
        </div>
      )}

      {!loading && !error && documents.length === 0 && (
        <div className="documentation-message">
          <h3>No documentation records found</h3>
          <p>
            The API responded successfully but returned no records.
          </p>
        </div>
      )}

      {!loading && !error && documents.length > 0 && (
        <div className="documentation-content">
          <aside className="documentation-sidebar">
            <div className="documentation-sidebar-heading">
              <span className="documentation-sidebar-icon">↻</span>
              <div>
                <h3>Documentation History</h3>
                <p>Select a record to view its details.</p>
              </div>
            </div>

            <div className="documentation-history-list">
              {documents.map((doc, index) => {
                const id = String(doc._id || index);
                const isSelected = id === String(selectedId);

                return (
                  <button
                    type="button"
                    key={id}
                    onClick={() => setSelectedId(id)}
                    aria-pressed={isSelected}
                    className={
                      isSelected
                        ? 'documentation-history-item selected'
                        : 'documentation-history-item'
                    }
                  >
                    <span className="history-item-topline">
                      <span className="history-item-number">
                        {String(index + 1).padStart(2, '0')}
                      </span>

                      <span className="history-item-date">
                        {formatDate(doc.updatedAt || doc.createdAt)}
                      </span>
                    </span>

                    <strong>
                      {doc.projectName || 'Untitled project'}
                    </strong>

                    <span className="history-item-summary">
                      {doc.summary ||
                        doc.commitId ||
                        'Project documentation'}
                    </span>

                    <span className="history-item-footer">
                      {doc.commitId
                        ? `Commit ${doc.commitId.slice(0, 8)}`
                        : 'Documentation record'}

                      <span aria-hidden="true">→</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          <article className="documentation-panel">
            {selected ? (
              <>
                <div className="documentation-panel-header">
                  <div>
                    <p className="documentation-eyebrow">
                      PROJECT OVERVIEW
                    </p>

                    <h2>
                      {selected.projectName ||
                        'Project Documentation'}
                    </h2>
                  </div>

                  <span className="documentation-record-badge">
                    Documentation
                  </span>
                </div>

                <div className="documentation-metadata">
                  <div className="documentation-meta-card">
                    <span>SUMMARY</span>
                    <p>
                      {selected.summary || 'No summary provided.'}
                    </p>
                  </div>

                  <div className="documentation-meta-card">
                    <span>COMMIT ID</span>
                    <p className="documentation-commit-value">
                      {selected.commitId || 'Not provided'}
                    </p>
                  </div>

                  <div className="documentation-meta-card">
                    <span>LAST UPDATED</span>
                    <p>
                      {formatDate(
                        selected.updatedAt || selected.createdAt
                      )}
                    </p>
                  </div>
                </div>

                {selected.repositoryUrl && (
                  <div className="documentation-repository">
                    <div>
                      <span>CONNECTED REPOSITORY</span>
                      <p>View the source project on GitHub.</p>
                    </div>

                    <a
                      href={selected.repositoryUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open GitHub →
                    </a>
                  </div>
                )}

                <div className="documentation-divider" />

                <div className="documentation-markdown">
                  {selected.content ? (
                    <ReactMarkdown
                      components={{
                        pre({ children }) {
                          return (
                            <pre className="documentation-code">
                              {children}
                            </pre>
                          );
                        },
                        code({
                          children,
                          className,
                          ...props
                        }) {
                          const isBlock = Boolean(className);

                          return (
                            <code
                              className={
                                isBlock
                                  ? 'documentation-code-text'
                                  : 'documentation-inline-code'
                              }
                              {...props}
                            >
                              {children}
                            </code>
                          );
                        },
                      }}
                    >
                      {selected.content}
                    </ReactMarkdown>
                  ) : (
                    <div className="documentation-message">
                      <h3>Documentation content is missing</h3>
                      <p>
                        This record has summary information, but its
                        content field is empty. The backend must save
                        the generated documentation sections to display
                        them here.
                      </p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="documentation-message">
                Select a history record to view its documentation.
              </div>
            )}
          </article>
        </div>
      )}
    </section>
  );
}

export default DocumentationViewer;
