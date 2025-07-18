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

// Debug theme and DOM state
console.log('Initial DOM state:', {
  bodyClasses: document.body.className,
  htmlClasses: document.documentElement.className,
  backgroundColor: window.getComputedStyle(document.body).backgroundColor,
  color: window.getComputedStyle(document.body).color
});

// Global error handler for vendor scripts
window.addEventListener('error', (event) => {
  if (event.message && event.message.includes("Cannot access 's' before initialization")) {
    console.warn('Vendor script error caught, continuing app initialization:', event.message);
    event.preventDefault();
  }
});

const rootElement = document.getElementById("root");
if (!rootElement) {
  document.body.innerHTML = '<div style="padding: 20px; color: red; background: white;">Root element not found</div>';
} else {
  try {
    console.log('Rendering React app...');
    
    // Remove loading indicator before rendering
    const loadingElement = rootElement.querySelector('.alfalyzer-loading');
    if (loadingElement) {
      loadingElement.remove();
    }
    
    createRoot(rootElement).render(<App />);
    console.log('React app rendered successfully');
    
    // Ensure theme is applied after render
    setTimeout(() => {
      const htmlElement = document.documentElement;
      if (!htmlElement.classList.contains('dark') && !htmlElement.classList.contains('light')) {
        console.log('Theme not applied, forcing dark theme');
        htmlElement.classList.add('dark');
        document.body.classList.add('dark');
      }
    }, 100);
    
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
