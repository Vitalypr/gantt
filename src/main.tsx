import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './App';

// Lock to landscape on mobile when possible (PWA standalone mode)
(screen.orientation as unknown as { lock?: (o: string) => Promise<void> })
  ?.lock?.('landscape')
  ?.catch(() => {});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
