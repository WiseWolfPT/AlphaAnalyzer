// Debug Script for Alfalyzer Deployment
// Copy and paste this in the browser console at https://public-ccqe83qv2-antonios-projects-f9cd3cd0.vercel.app

console.log('=== ALFALYZER DEBUG REPORT ===');

// 1. Check if root element exists
const root = document.getElementById('root');
console.log('Root element:', root);
console.log('Root element content:', root ? root.innerHTML : 'N/A');

// 2. Check for React
console.log('React global:', typeof React !== 'undefined' ? 'Found' : 'Not found');
console.log('ReactDOM global:', typeof ReactDOM !== 'undefined' ? 'Found' : 'Not found');

// 3. Check loaded scripts
const scripts = Array.from(document.querySelectorAll('script')).map(s => ({
  src: s.src || 'inline',
  loaded: s.src ? 'Check Network tab' : 'N/A',
  type: s.type || 'text/javascript'
}));
console.log('Scripts loaded:', scripts);

// 4. Check for Vite environment
console.log('Vite import.meta:', typeof import !== 'undefined' ? 'Module scripts supported' : 'Not supported');

// 5. Check styles
const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map(l => l.href);
console.log('Stylesheets:', styles);

// 6. Check body background
const bodyStyle = window.getComputedStyle(document.body);
console.log('Body background color:', bodyStyle.backgroundColor);
console.log('Body color:', bodyStyle.color);

// 7. Check for error messages in DOM
const errorDivs = document.querySelectorAll('div[style*="error"], div[style*="red"]');
console.log('Error elements found:', errorDivs.length);
errorDivs.forEach((div, i) => console.log(`Error ${i+1}:`, div.textContent));

// 8. Check page title
console.log('Page title:', document.title);

// 9. Check for any console errors
console.log('=== END DEBUG REPORT ===');
console.log('NOW CHECK THE CONSOLE FOR ANY RED ERROR MESSAGES ABOVE THIS REPORT');