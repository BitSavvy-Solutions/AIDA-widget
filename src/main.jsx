/* src/main.jsx */
import React from 'react';
import ReactDOM from 'react-dom/client';
import './main.css';
import AidaWidget from './AidaWidget/AidaWidget';

const roots = {};

function render(selector, props) {
  let rootElement = document.querySelector(selector);

  if (!rootElement) {
    rootElement = document.createElement('div');
    rootElement.id = selector.replace('#', '');
    document.body.appendChild(rootElement);
  }

  if (rootElement) {
    let root = roots[selector];
    if (!root) {
      root = ReactDOM.createRoot(rootElement);
      roots[selector] = root;
    }

    root.render(
      <AidaWidget {...props} />
    );
  } else {
    console.error(`AIDA Widget Error: Element with selector "${selector}" not found.`);
  }
}

// Expose a method for the host page to push context into the widget programmatically
function pushContext(content, name = 'Page Context.md') {
  const event = new CustomEvent('aida-push-context', { 
    detail: { content, name } 
  });
  window.dispatchEvent(event);
}

/**
 * Tell the widget to open a specific chat. If the widget is closed, it opens.
 * Pass null or omit to start a new empty chat.
 */
function openChat(chatId) {
  window.dispatchEvent(new CustomEvent('aida-open-chat', { detail: { chatId } }));
}

if (import.meta.env.DEV) {
  const widgetContainerId = 'aida-widget-container';

  if (!document.getElementById(widgetContainerId)) {
    const container = document.createElement('div');
    container.id = widgetContainerId;
    document.body.appendChild(container);
  }

  render(`#${widgetContainerId}`, {
    language: 'en',
    user: { email: 'dev-user@example.com', id: 'dev-id' },
    translations: { transcribing: 'Transcribing...', inputPlaceholder: 'Type a message to Aida...' },
    features: {
      resizable: true,
      modelSelection: true,
      voiceInput: true,
      webSearch: true,
      imageUpload: true,
      retryMessage: true,
      customInstructions: true,
      historyProjects: true,
      // ✅ NEW: Mock getPageContext for local dev testing
      getPageContext: async () => {
        return {
          name: 'Dev Page Content.md',
          content: 'This is mock content extracted from the host page during local development.'
        };
      }
    },
  });
}

// Expose a stable API on window so the frontend can call these directly
if (typeof window !== 'undefined') {
  window.AidaWidget = { render, pushContext, openChat };
}

// ✅ Export both render and pushContext
export { render, pushContext, openChat };