import './App.css';

function App() {
  const documentationHistory = [
    {
      version: 'v1.2',
      commit: 'abc123',
      date: 'Today',
      status: 'Current',
    },
    {
      version: 'v1.1',
      commit: 'def456',
      date: 'Yesterday',
      status: 'Archived',
    },
    {
      version: 'v1.0',
      commit: 'ghi789',
      date: '2 days ago',
      status: 'Archived',
    },
  ];

  return (
    <div className="app">
      <header className="navbar">
        <div className="brand">
          <div className="brand-icon">D</div>
          <span>DocuLive</span>
        </div>

        <nav className="navigation">
          <a href="#dashboard">Dashboard</a>
          <a href="#history">History</a>
        </nav>
      </header>

      <main className="dashboard" id="dashboard">
        <section className="hero">
          <div>
            <p className="eyebrow">LIVE DOCUMENTATION</p>

            <h1>Documentation Dashboard</h1>

            <p className="hero-text">
              Keep your project documentation synchronized with your
              codebase as it changes.
            </p>
          </div>
        </section>

        <section className="repository-card">
          <div>
            <p className="card-label">CONNECTED REPOSITORY</p>

            <h2>my-team / DocuLive</h2>

            <p className="repository-description">
              GitHub repository connected successfully.
            </p>
          </div>

          <span className="status-badge">
            <span className="status-dot"></span>
            Connected
          </span>
        </section>

        <section className="summary-grid">
          <div className="summary-card">
            <p className="card-label">LATEST UPDATE</p>

            <h3>Commit #abc123</h3>

            <p>Documentation generated from the latest code changes.</p>

            <span className="time-text">5 minutes ago</span>
          </div>

          <div className="summary-card">
            <p className="card-label">DOCUMENTATION STATUS</p>

            <h3 className="success-text">Up to date</h3>

            <p>The documentation matches the latest repository version.</p>

            <span className="time-text">Last generated today</span>
          </div>
        </section>

        <section className="history-section" id="history">
          <div className="section-heading">
            <div>
              <p className="eyebrow">VERSION HISTORY</p>
              <h2>Documentation History</h2>
            </div>

            <button className="history-button">View all versions</button>
          </div>

          <div className="history-table">
            <div className="table-header">
              <span>Version</span>
              <span>Commit</span>
              <span>Date</span>
              <span>Status</span>
            </div>

            {documentationHistory.map((item) => (
              <div className="table-row" key={item.version}>
                <strong>{item.version}</strong>
                <code>{item.commit}</code>
                <span>{item.date}</span>

                <span
                  className={
                    item.status === 'Current'
                      ? 'history-status current'
                      : 'history-status'
                  }
                >
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;