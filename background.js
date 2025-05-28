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

// Keep track of active tab context
let activeTabId = null;

async function updateTabContext(tabId) {
  try {
    // Always update context for the tab
    activeTabId = tabId;

    // Inject content script if needed
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content.js']
      });
    } catch (e) {
      // Script might already be injected, continue
      console.log('Content script already injected or error:', e);
    }

    // Get fresh context from content script with timeout
    const timeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Context fetch timeout')), 5000)
    );

    const contextPromise = new Promise((resolve) => {
      chrome.tabs.sendMessage(tabId, { action: 'getPageContext' }, (response) => {
        resolve(response);
      });
    });

    await Promise.race([contextPromise, timeout]);
  } catch (error) {
    console.error('Error updating tab context:', error);
  }
}

// Listen for tab activation
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  await updateTabContext(activeInfo.tabId);
});

// Listen for tab updates (URL changes, refreshes)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    await updateTabContext(tabId);
  }
});

// Listen for window focus changes
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId !== chrome.windows.WINDOW_ID_NONE) {
    const [tab] = await chrome.tabs.query({ active: true, windowId });
    if (tab) {
      await updateTabContext(tab.id);
    }
  }
});

chrome.action.onClicked.addListener(function(tab) {
  // When the extension icon is clicked, open the side panel
  chrome.sidePanel.open({ windowId: tab.windowId });
});
