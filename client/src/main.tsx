import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./lib/i18n"; // Initialize i18n before React app

// 🔒 Initialize Sentry for Production Monitoring
import { initSentry } from "./lib/monitoring/sentry";

// Initialize error monitoring as early as possible
try {
  initSentry();
  console.log('🔒 Sentry monitoring initialized');
} catch (error) {
  console.warn('⚠️ Sentry initialization failed:', error);
}

const rootElement = document.getElementById("root");
if (!rootElement) {
  document.body.innerHTML = '<div style="padding: 20px; color: red;">Root element not found</div>';
} else {
  try {
    createRoot(rootElement).render(<App />);
    console.log('React app rendered successfully');
  } catch (error) {
    console.error('Failed to render React app:', error);
    rootElement.innerHTML = `<div style="padding: 20px; color: red;">Render Error: ${error}</div>`;
  }
}
