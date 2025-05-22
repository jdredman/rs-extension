const fs = require('fs');
const path = require('path');

// Simple function to create a basic colored square icon
function generateColorIcon(size, color) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  
  // Fill background
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, size, size);
  
  // Add "HW" text
  ctx.fillStyle = 'white';
  ctx.font = `bold ${size/2}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('HW', size/2, size/2);
  
  return canvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, '');
}

// Sizes for the icons
const sizes = [16, 48, 128];
const color = '#4285f4'; // Google blue

for (const size of sizes) {
  const iconData = generateColorIcon(size, color);
  const iconPath = path.join(__dirname, 'images', `icon${size}.png`);
  fs.writeFileSync(iconPath, Buffer.from(iconData, 'base64'));
}

console.log('Icons generated successfully!');
