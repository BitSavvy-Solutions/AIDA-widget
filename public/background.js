/* public/background.js */

chrome.runtime.onInstalled.addListener(() => {
    // Feature detection: Only run this if the browser supports Chrome's sidePanel API
    if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
      chrome.sidePanel
        .setPanelBehavior({ openPanelOnActionClick: true })
        .catch(console.error);
    }
  });
  
  // Fallback for browsers that don't support Chrome's side panel (like Opera)
  chrome.action.onClicked.addListener((tab) => {
    if (!chrome.sidePanel) {
      // In Opera, the extension will appear in the native left-hand sidebar automatically.
      // If the user clicks the top toolbar icon instead, we open AIDA in a new tab as a fallback.
      chrome.tabs.create({ url: 'extension.html' });
    }
  });