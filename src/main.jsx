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

// Expose a stable API on window so the frontend can call these directly
if (typeof window !== 'undefined') {
  window.AidaWidget = { render, pushContext, openChat };
}

// Export both render and pushContext
export { render, pushContext, openChat };