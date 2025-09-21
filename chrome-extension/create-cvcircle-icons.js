const sharp = require('sharp');

// CVCircle brand colors
const CV_COLOR = '#84cc16'; // Lime green for "CV"
const CIRCLE_COLOR = '#a3a3a3'; // Gray for "CIRCLE"
const BACKGROUND_COLOR = '#0f0f0f'; // Dark background
const BORDER_COLOR = '#404040'; // Border color

// Icon sizes
const sizes = [16, 32, 48, 128];

async function createIcon(size) {
  const canvas = sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 15, g: 15, b: 15, alpha: 1 } // #0f0f0f
    }
  });

  // Create SVG for the icon
  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#0f0f0f;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#1a1a1a;stop-opacity:1" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge> 
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      <!-- Background circle -->
      <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}" fill="url(#bg)" stroke="${BORDER_COLOR}" stroke-width="1"/>
      
      <!-- Document icon -->
      <g transform="translate(${size/2 - size/4}, ${size/2 - size/4}) scale(${size/32})">
        <path d="M19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H16L21 8V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21Z" 
              stroke="${CV_COLOR}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" filter="url(#glow)"/>
        <path d="M17 21V13H7V21" stroke="${CV_COLOR}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        <path d="M7 3V8H15" stroke="${CV_COLOR}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      </g>
      
      <!-- CV text -->
      <text x="${size/2 - size/8}" y="${size/2 + size/6}" font-family="Arial, sans-serif" font-size="${size/6}" font-weight="900" fill="${CV_COLOR}" text-anchor="middle">CV</text>
      
      <!-- CIRCLE text -->
      <text x="${size/2 + size/8}" y="${size/2 + size/6}" font-family="Arial, sans-serif" font-size="${size/8}" font-weight="600" fill="${CIRCLE_COLOR}" text-anchor="middle">CIRCLE</text>
    </svg>
  `;

  return canvas
    .composite([{
      input: Buffer.from(svg),
      top: 0,
      left: 0
    }])
    .png()
    .toFile(`icons/icon${size}.png`);
}

async function createAllIcons() {
  console.log('🎨 Creating CVCircle extension icons...');
  
  // Create icons directory if it doesn't exist
  const fs = require('fs');
  if (!fs.existsSync('icons')) {
    fs.mkdirSync('icons');
  }

  for (const size of sizes) {
    try {
      await createIcon(size);
      console.log(`✅ Created icon${size}.png`);
    } catch (error) {
      console.error(`❌ Error creating icon${size}.png:`, error);
    }
  }
  
  console.log('🎉 All CVCircle icons created successfully!');
}

// Run the icon creation
createAllIcons().catch(console.error);
