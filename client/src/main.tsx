import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initializePWA } from "./utils/pwa";

const rootElement = document.getElementById("root");
if (!rootElement) {
  document.body.innerHTML = '<div style="padding: 20px; color: red;">Root element not found</div>';
} else {
  try {
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
    rootElement.innerHTML = `<div style="padding: 20px; color: red;">Render Error: ${error}</div>`;
  }
}
