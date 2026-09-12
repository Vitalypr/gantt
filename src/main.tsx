import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './App';

// Lock to landscape on mobile when possible (PWA standalone mode)
(screen.orientation as unknown as { lock?: (o: string) => Promise<void> })
  ?.lock?.('landscape')
  ?.catch(() => {});

/**
 * Pick up a deploy on THIS visit, not the next one.
 *
 * The service worker precaches the app shell, so the document you are reading was served from
 * the previous build's cache. `registerType: 'autoUpdate'` installs the new worker and, with
 * skipWaiting + clientsClaim, it takes control straight away — but the page already running is
 * still the old one. Without this, every deploy costs one stale page-view, which is exactly how
 * a day of fixes can look like nothing changed.
 *
 * Reload once, on the first handover only: `controllerchange` fires again after the reload, and
 * an unguarded handler would loop.
 */
if ('serviceWorker' in navigator) {
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) return;
    reloading = true;
    window.location.reload();
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
