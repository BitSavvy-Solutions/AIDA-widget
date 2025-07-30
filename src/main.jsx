import React from 'react';
import ReactDOM from 'react-dom/client';
import AidaWidget from './AidaWidget/ChatbotWidget';

/**
 * This is the public API for the AidaWidget.
 * It will be exposed on the `window` object.
 *
 * @param {string} selector - The CSS selector for the element to mount the widget in.
 * @param {object} props - The props to pass to the AidaWidget component.
 */
function render(selector, props) {
  const rootElement = document.querySelector(selector);
  if (rootElement) {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <AidaWidget {...props} />
      </React.StrictMode>
    );
  } else {
    console.error(`AIDA Widget Error: Could not find element with selector "${selector}"`);
  }
}

// --- FOR LOCAL DEVELOPMENT ONLY ---
// This will run automatically when you run `npm run dev`
// It looks for a div with id="root" in your local index.html
if (import.meta.env.DEV) {
  render('#root', {
    // You can put default props here for testing
    language: 'en',
    user: { email: 'dev-user@example.com' },
    translations: {
      transcribing: 'Transcribing...',
      inputPlaceholder: 'Type a message to Aida...'
    }
  });
}

// Expose the render function to the global scope
// So it can be called from a <script> tag on any website
export { render };