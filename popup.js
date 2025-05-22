// This script runs when the popup is opened
document.addEventListener('DOMContentLoaded', function() {
  console.log('Hello World Sidebar loaded!');
  
  // Display current time
  const timeElement = document.getElementById('currentTime');
  function updateTime() {
    const now = new Date();
    timeElement.textContent = `Current time: ${now.toLocaleTimeString()}`;
  }
  updateTime();
  setInterval(updateTime, 1000);
  
  // Change color button functionality
  const changeColorButton = document.getElementById('changeColor');
  const colors = ['#4285f4', '#ea4335', '#fbbc05', '#34a853', '#673ab7', '#ff6d00'];
  let colorIndex = 0;
  
  changeColorButton.addEventListener('click', function() {
    colorIndex = (colorIndex + 1) % colors.length;
    document.querySelector('.sidebar').style.backgroundColor = colors[colorIndex];
  });
});
