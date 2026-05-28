// Generates simple SVG-based icons as PNG using pure JS (no canvas dependency)
// Creates base64-encoded PNG via a minimal PNG writer

const fs = require('fs');
const path = require('path');

// Simple SVG icon for "Wo ist" app - a location pin
const svgIcon = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${size * 0.22}" fill="#1c1c1e"/>
  <circle cx="${size/2}" cy="${size*0.42}" r="${size*0.22}" fill="#0a84ff"/>
  <circle cx="${size/2}" cy="${size*0.42}" r="${size*0.1}" fill="white"/>
  <path d="M${size/2} ${size*0.64} C${size*0.3} ${size*0.5} ${size*0.2} ${size*0.42} ${size*0.2} ${size*0.42}" stroke="#0a84ff" stroke-width="${size*0.04}" fill="none"/>
  <ellipse cx="${size/2}" cy="${size*0.78}" rx="${size*0.12}" ry="${size*0.04}" fill="#0a84ff" opacity="0.3"/>
</svg>`;

// Write SVG files (browsers can use these too)
const iconsDir = path.join(__dirname, 'public', 'icons');
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

fs.writeFileSync(path.join(iconsDir, 'icon-192.svg'), svgIcon(192));
fs.writeFileSync(path.join(iconsDir, 'icon-512.svg'), svgIcon(512));

console.log('SVG icons generated in public/icons/');
console.log('Note: For full PWA icon support, convert SVGs to PNG if needed.');
