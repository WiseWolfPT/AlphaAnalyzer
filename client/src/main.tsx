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

// Global error handler for vendor scripts - MUST be before any code execution
window.addEventListener('error', (event) => {
  if (event.message && (
    event.message.includes("Cannot access") && event.message.includes("before initialization") ||
    event.message.includes("vendor-build-tools")
  )) {
    console.warn('Vendor script error caught, continuing app initialization:', event.message);
    event.preventDefault();
    return false; // Prevent error propagation
  }
}, true); // Use capture phase

// Initialize app with multiple fallback strategies
const initializeApp = () => {
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    document.body.innerHTML = '<div style="padding: 20px; color: red; background: white;">Root element not found</div>';
    return;
  }

  // Apply theme immediately
  const savedTheme = localStorage.getItem('theme') || 'dark';
  document.documentElement.classList.add(savedTheme);
  document.body.classList.add(savedTheme);
  console.log('Applied theme:', savedTheme);

  try {
    console.log('Rendering React app...');
    
    // Remove loading indicator before rendering
    const loadingElement = rootElement.querySelector('.alfalyzer-loading');
    if (loadingElement) {
      loadingElement.remove();
    }
    
    // Create React root and render
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
    // Show user-friendly error with reload option
    rootElement.innerHTML = `
      <div style="
        display: flex; 
        align-items: center; 
        justify-content: center; 
        min-height: 100vh; 
        background: ${savedTheme === 'dark' ? '#151515' : '#f5f5f5'};
        color: ${savedTheme === 'dark' ? '#e4e7eb' : '#333'};
        font-family: system-ui, -apple-system, sans-serif;
        text-align: center;
        padding: 20px;
      ">
        <div>
          <h1 style="color: #F4FA4E; margin-bottom: 16px; font-size: 24px;">
            AlphaAnalyzer
          </h1>
          <p style="margin-bottom: 24px; opacity: 0.8;">
            We're having trouble loading the application.
          </p>
          <button onclick="window.location.reload()" style="
            background: #F4FA4E; 
            color: #000; 
            padding: 12px 24px; 
            border: none; 
            border-radius: 8px; 
            cursor: pointer;
            font-weight: 600;
            font-size: 16px;
          ">
            Reload Page
          </button>
          <p style="margin-top: 24px; font-size: 12px; opacity: 0.6;">
            Error: ${error?.message || 'Unknown error'}
          </p>
        </div>
      </div>
    `;
  }
};

// Try to initialize app with delay to ensure all scripts are loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initializeApp, 150);
  });
} else {
  // Document already loaded, initialize with small delay
  setTimeout(initializeApp, 150);
}
