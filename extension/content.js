// 1. Instantly trigger an ingestion event when a fresh page finishes loading
chrome.runtime.sendMessage({
  type: 'PAGE_INGEST',
  data: {
    title: document.title,
    url: window.location.href,
    selectedText: null
  }
});

// 2. Listen for text highlight selections to harvest code snippets dynamically 🌟
document.addEventListener('mouseup', () => {
  const selectedText = window.getSelection().toString().trim();
  
  // Only harvest if the selection isn't just whitespace spaces
  if (selectedText.length > 0) {
    console.log('[RABBITHOLE] Snippet selection captured, dispatching to worker...');
    chrome.runtime.sendMessage({
      type: 'PAGE_INGEST',
      data: {
        title: document.title,
        url: window.location.href,
        selectedText: selectedText
      }
    });
  }
});