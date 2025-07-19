// AlphaAnalyzer Browser Debug Script
// Run this in the browser console when you see the black screen

console.log('=== AlphaAnalyzer Debug ===');

// Check if root element exists
const root = document.getElementById('root');
console.log('Root element:', root);
console.log('Root innerHTML length:', root ? root.innerHTML.length : 'No root');

// Check for React
console.log('React available:', typeof React !== 'undefined');
console.log('ReactDOM available:', typeof ReactDOM !== 'undefined');

// Check for loading indicators
const loadingEl = document.querySelector('.alfalyzer-loading');
console.log('Loading element:', loadingEl);

// Check for any error messages
const errors = Array.from(document.querySelectorAll('*')).filter(el => 
  el.textContent.toLowerCase().includes('error') || 
  el.textContent.toLowerCase().includes('failed')
);
console.log('Elements with error text:', errors.length);

// Check console errors
console.log('Check console for errors above this message');

// Check Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    console.log('Service Worker registrations:', registrations.length);
    registrations.forEach(reg => {
      console.log('SW scope:', reg.scope);
      console.log('SW state:', reg.active ? reg.active.state : 'no active worker');
    });
  });
}

// Check for blocked resources
const scripts = Array.from(document.querySelectorAll('script'));
console.log('Scripts loaded:', scripts.length);
scripts.forEach(script => {
  if (!script.src && script.innerHTML.includes('error')) {
    console.log('Inline script with error:', script.innerHTML.substring(0, 100));
  }
});

// Check network tab
console.log('=== IMPORTANT ===');
console.log('1. Check the Network tab for any failed requests (red items)');
console.log('2. Check the Console tab for any JavaScript errors');
console.log('3. Try: Ctrl+Shift+R (or Cmd+Shift+R on Mac) to hard refresh');
console.log('4. Try: Open in Incognito/Private mode to bypass extensions');

// Test if JavaScript is executing
console.log('JavaScript is executing correctly if you see this message');