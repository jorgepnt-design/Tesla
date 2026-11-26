import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { capturePairingFromUrl } from './lib/remote';
import './index.css';

// Öffnet das Handy den Kopplungs-Link aus dem QR-Code, wird es zur Fernbedienung fürs Auto
capturePairingFromUrl();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
