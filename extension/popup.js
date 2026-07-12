document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('filterToggle');
  const domainsInput = document.getElementById('domainList');
  const statusMsg = document.getElementById('statusMsg');

  // Load preferences from local storage
  chrome.storage.local.get(['useFilter', 'focusDomains'], (result) => {
    // Default useFilter to false so everything flows out-of-the-box
    toggle.checked = result.useFilter === true; 
    
    const defaultDomains = ['github.com', 'stackoverflow.com', 'npmjs.com', 'localhost', 'wikipedia.org', 'google.com', 'ibm.com'];
    domainsInput.value = result.focusDomains ? result.focusDomains.join(', ') : defaultDomains.join(', ');
  });

  // Save changes to storage
  function saveSettings() {
    const domainsArray = domainsInput.value
      .split(',')
      .map(d => d.trim().toLowerCase())
      .filter(d => d.length > 0);

    chrome.storage.local.set({
      useFilter: toggle.checked,
      focusDomains: domainsArray
    }, () => {
      statusMsg.textContent = "Settings saved";
      statusMsg.style.opacity = '1';
      setTimeout(() => { statusMsg.style.opacity = '0.4'; }, 800);
    });
  }

  toggle.addEventListener('change', saveSettings);
  domainsInput.addEventListener('input', saveSettings);
});