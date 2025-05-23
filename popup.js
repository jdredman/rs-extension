// This script runs when the popup is opened
document.addEventListener('DOMContentLoaded', function() {
  console.log('Ramsey Solutions Sidebar loaded!');
  
  // Display current time
  const timeElement = document.getElementById('currentTime');
  function updateTime() {
    const now = new Date();
    timeElement.textContent = `Current time: ${now.toLocaleTimeString()}`;
  }
  updateTime();
  setInterval(updateTime, 1000);
  
  // Handle form submission
  const userInput = document.getElementById('userInput');
  const submitButton = document.getElementById('submitButton');
  
  submitButton.addEventListener('click', function() {
    const userText = userInput.value.trim();
    if (userText) {
      // Store the input text
      chrome.storage.local.set({ userInput: userText }, function() {
        // After storing, navigate to the page
        chrome.tabs.create({ url: 'https://labs.ramseysolutions.com/rp1/home' }, function(tab) {
          // Close the popup
          window.close();
        });
      });
    }
  });
  
  // Add keyboard shortcut for submission (Ctrl+Enter or Cmd+Enter)
  userInput.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      submitButton.click();
    }
  });
  
  // Track app switcher clicks (for analytics in a real extension)
  const appLinks = document.querySelectorAll('.app-item');
  appLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      const appName = this.querySelector('.app-name').textContent;
      console.log(`App clicked: ${appName}`);
      // In a real application, you might report this to an analytics service
    });
  });
});
