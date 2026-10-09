import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Automatically register, update and activate PWA service worker safely in top window
if (typeof window !== 'undefined' && window.self === window.top && 'serviceWorker' in navigator) {
  try {
    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        updateSW(true);
      },
      onRegisteredSW(_swUrl, r) {
        if (r) {
          r.update().catch(() => {});
        }
      },
    });
  } catch (_) {}
}

createRoot(document.getElementById('root')!).render(<App />);
