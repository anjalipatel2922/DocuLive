import React from 'react';
import './DocumentationViewer.css';

function DocumentationViewer() {
  return (
    <section className="documentation-viewer">
      <div className="documentation-header">
        <div>
          <p className="documentation-eyebrow">LIVE DOCUMENTATION</p>
          <h2>Project Documentation</h2>
          <p className="documentation-description">
            Documentation generated from the latest repository changes.
          </p>
        </div>

        <div className="documentation-commit">
          Latest commit
          <strong>abc123</strong>
        </div>
      </div>

      <div className="documentation-content">
        <aside className="documentation-sidebar">
          <h3>Contents</h3>

          <a href="#overview">Project Overview</a>
          <a href="#architecture">Architecture</a>
          <a href="#api">API Endpoints</a>
          <a href="#development">Development</a>
        </aside>

        <article className="documentation-body">
          <section id="overview">
            <h3>Project Overview</h3>

            <p>
              DocuLive is a living documentation platform that keeps project
              documentation synchronized with changes in a connected GitHub
              repository.
            </p>

            <p>
              When developers make changes to the codebase, DocuLive detects
              those changes and prepares updated documentation for the project.
            </p>
          </section>

          <section id="architecture">
            <h3>Architecture</h3>

            <p>
              The application is divided into a React frontend and a backend
              service. The frontend provides the documentation dashboard while
              the backend handles repository events, documentation generation,
              and version history.
            </p>
          </section>

          <section id="api">
            <h3>API Endpoints</h3>

            <p>
              The backend will expose API endpoints for repository information,
              documentation updates, and documentation history.
            </p>

            <div className="api-example">
              <code>GET /api/repository</code>
              <span>Returns connected repository information.</span>
            </div>

            <div className="api-example">
              <code>GET /api/documentation</code>
              <span>Returns the latest generated documentation.</span>
            </div>
          </section>

          <section id="development">
            <h3>Development</h3>

            <p>
              Developers can run the frontend locally using the React
              development server. Backend services can be started separately
              during development.
            </p>

            <div className="code-block">
              <code>npm start</code>
            </div>
          </section>
        </article>
      </div>
    </section>
  );
}

export default DocumentationViewer;