import React from 'react';
import ReactDOM from 'react-dom/client';
import './main.css';
import AidaWidget from './AidaWidget/AidaWidget';

const roots = {};
/**
 * This is the public API for the AidaWidget.
 * It will be exposed on the `window` object.
 *
 * @param {string} selector - The CSS selector for the element to mount the widget in.
 * @param {object} props - The props to pass to the AidaWidget component.
 */
function render(selector, props) {
  let rootElement = document.querySelector(selector);

  // If element doesn't exist, create it and append to body
  if (!rootElement) {
    rootElement = document.createElement('div');
    rootElement.id = selector.replace('#', '');
    document.body.appendChild(rootElement);
  }

  if (rootElement) {
    // ✅ Get the root from cache or create it if it doesn't exist.
    let root = roots[selector];
    if (!root) {
      root = ReactDOM.createRoot(rootElement);
      roots[selector] = root;
    }

    // ✅ Always call render on the same root instance.
    // React will handle updates without unmounting the component.
    root.render(
      <AidaWidget {...props} />
    );
  } else {
    console.error(`AIDA Widget Error: Element with selector "${selector}" not found.`);
  }
}

// --- FOR LOCAL DEVELOPMENT ONLY ---
// This will run automatically when you run `npm run dev`
if (import.meta.env.DEV) {
  // Create a floating container instead of using existing #root
  const widgetContainerId = 'aida-widget-container';

  // Create container if it doesn't exist
  if (!document.getElementById(widgetContainerId)) {
    const container = document.createElement('div');
    container.id = widgetContainerId;
    document.body.appendChild(container);
  }

  render(`#${widgetContainerId}`, {
    // You can put default props here for testing
    language: 'en',
    user: { email: 'dev-user@example.com', id: 'dev-id' },
    translations: { transcribing: 'Transcribing...', inputPlaceholder: 'Type a message to Aida...' },
    // ✨ ADDED: Feature configuration for local development
    features: {
      resizable: true,
      modelSelection: true,
      voiceInput: true,
      webSearch: true,
      imageUpload: true,
      retryMessage: true,
      customInstructions: true,
      historyProjects: true,
      paymentLink: {
        show: true,
        url: 'https://buy.stripe.com/5kQ8wO11A3y97tjcThabK00',
        text: '' // Custom text for dev environment
      }
    },
  });
}

// Expose the render function to the global scope
// So it can be called from a <script> tag on any website
export { render };