chrome.action.onClicked.addListener(function(tab) {
  // When the extension icon is clicked, open the side panel
  chrome.sidePanel.open({ windowId: tab.windowId });
});
