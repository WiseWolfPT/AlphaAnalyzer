import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initializePWA } from "./utils/pwa";

// Temporarily disable monitoring for deployment
// import { initializeSentry } from "./lib/sentry";
// import { initializeLogRocket } from "./lib/logrocket";
// initializeSentry();
// initializeLogRocket();

// Add debug info
console.log('Alfalyzer starting...');
console.log('Environment:', {
  VITE_API_URL: import.meta.env.VITE_API_URL,
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  MODE: import.meta.env.MODE,
  PROD: import.meta.env.PROD
});

const rootElement = document.getElementById("root");
if (!rootElement) {
  document.body.innerHTML = '<div style="padding: 20px; color: red; background: white;">Root element not found</div>';
} else {
  try {
    console.log('Rendering React app...');
    createRoot(rootElement).render(<App />);
    console.log('React app rendered successfully');
    
    // Initialize PWA features after React app is rendered
    initializePWA().then(() => {
      console.log('PWA features initialized for international markets 🇺🇸🇪🇺');
    }).catch((error) => {
      console.warn('PWA initialization failed:', error);
    });
  } catch (error) {
    console.error('Failed to render React app:', error);
    rootElement.innerHTML = `<div style="padding: 20px; color: red; background: white;">Render Error: ${error}</div>`;
  }
}
