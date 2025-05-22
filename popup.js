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
      console.log('User input:', userText);
      // In a real application, you would send this data to a server
      
      // Show confirmation
      const originalButtonText = submitButton.textContent;
      submitButton.textContent = 'Submitted!';
      submitButton.disabled = true;
      submitButton.style.backgroundColor = '#007935'; // Success green
      
      // Reset after 2 seconds
      setTimeout(() => {
        userInput.value = '';
        submitButton.textContent = originalButtonText;
        submitButton.disabled = false;
        submitButton.style.backgroundColor = '#0084c1';
      }, 2000);
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
