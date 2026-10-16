import React from 'react';
import { createRoot } from 'react-dom/client';
import { RiSettings3Line } from '@remixicon/react';
import { useSession } from '../../hooks/useSession';
import { SessionControls } from '../../components/session-controls';
import { Brand, WorkspaceLink } from '../../components/brand';
import '../../styles/index.css';
function App() {
  const { snapshot, pending, error, now, dispatch } = useSession();
  return (
    <main className="popup-shell" data-theme="dark">
      <header className="popup-header">
        <Brand />
        <button
          type="button"
          className="icon-button"
          aria-label="Abrir configurações"
          onClick={() => {
            void chrome.tabs.create({ url: chrome.runtime.getURL('workspace.html#settings') });
          }}
        >
          <RiSettings3Line size={19} />
        </button>
      </header>
      <SessionControls
        snapshot={snapshot}
        pending={pending}
        error={error}
        now={now}
        dispatch={dispatch}
      />
      <footer className="popup-footer">
        <WorkspaceLink />
        <span>v1.0.0</span>
      </footer>
    </main>
  );
}
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
