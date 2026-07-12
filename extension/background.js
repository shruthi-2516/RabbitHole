// Global memory layer to map tab lineages for non-linear branching networks
let tabLineage = {};

// 1. Detect direct page context updates within the active window tab
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    // Keep track of the current URL string mapping coordinates
    const oldLineage = tabLineage[tabId] || { parentUrl: null };
    tabLineage[tabId] = { parentUrl: oldLineage.parentUrl, currentUrl: changeInfo.url };
  }
});

// 2. Map tab hierarchy lineage when a user middle-clicks or spawns a child tab
chrome.tabs.onCreated.addListener((tab) => {
  if (tab.openerTabId) {
    chrome.tabs.get(tab.openerTabId, (parentTab) => {
      if (parentTab && parentTab.url) {
        tabLineage[tab.id] = { parentUrl: parentTab.url, currentUrl: tab.url || '' };
      }
    });
  }
});

// 3. Primary Network Messaging Listener Ingestion Loop
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PAGE_INGEST') {
    const { title, url, selectedText } = message.data;
    
    // Fetch live user filtering rules from chrome extension storage matrix
    // Find this block inside extension/background.js:
    chrome.storage.local.get(['useFilter', 'focusDomains'], (settings) => {
      // 🌟 FIXED: Only filter if useFilter is explicitly set to true
      const useFilter = settings.useFilter === true; 
      const allowedDomains = settings.focusDomains || ['github.com', 'stackoverflow.com', 'npmjs.com', 'localhost', 'wikipedia.org', 'google.com', 'ibm.com'];

      if (useFilter) {
        const isDomainMatch = allowedDomains.some(domain => url.toLowerCase().includes(domain));
        if (!isDomainMatch) {
          console.log(`[IGNORE] Domain blocked by active focus filter: ${url}`);
          return;
        }
      }
      
      // ... rest of your fetch code stays exactly the same

      // Track lineage parent nodes parameters
      const currentTabId = sender.tab ? sender.tab.id : null;
      const lineage = tabLineage[currentTabId] || { parentUrl: null };

      // Assemble payload packet telemetry definitions
      const payload = {
        title,
        url,
        parent_url: lineage.parentUrl,
        snippet: selectedText ? selectedText : null
      };

      // Dispatch payload to the Express active local server engine channel
      fetch('http://localhost:5001/api/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      .then(res => res.json())
      .then(data => console.log('[SUCCESS] Metric data node mapped successfully:', data))
      .catch(err => console.error('[ERROR] Telemetry extraction network drop:', err));
    });
  }
});