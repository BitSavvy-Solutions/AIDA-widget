/* src/extension.jsx */
import React from 'react';
import ReactDOM from 'react-dom/client';
import './main.css';
import AidaWidget from './AidaWidget/AidaWidget';

ReactDOM.createRoot(document.getElementById('aida-root')).render(
  <AidaWidget
    extensionMode
    language="en"
    user={{ email: '', id: null }}
    translations={{
      transcribing: 'Transcribing...',
      inputPlaceholder: 'Type a message to Aida...',
    }}
    features={{
      resizable: false,       // Chrome controls the panel width
      modelSelection: true,
      voiceInput: true,
      webSearch: true,
      imageUpload: true,
      retryMessage: true,
      customInstructions: true,
      historyProjects: true,
    }}
  />
);