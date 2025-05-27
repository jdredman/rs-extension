// Load and parse the .env file during development
async function loadEnvConfig() {
  try {
    const response = await fetch(chrome.runtime.getURL('.env'));
    const text = await response.text();
    const config = {};
    
    // Parse the .env file
    text.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value) {
        config[key.trim()] = value.trim();
      }
    });
    
    // Store in chrome.storage for access by popup
    await chrome.storage.local.set(config);
  } catch (error) {
    console.error('Error loading .env:', error);
  }
}

chrome.runtime.onInstalled.addListener(() => {
  loadEnvConfig();
});

chrome.action.onClicked.addListener(function(tab) {
  // When the extension icon is clicked, open the side panel
  chrome.sidePanel.open({ windowId: tab.windowId });
});
