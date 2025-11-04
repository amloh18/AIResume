const sharp = require('sharp');

// CVCircle brand colors - matching logo design
const LIME_GREEN = '#80FF00'; // Primary lime green
const SHIELD_GREEN = '#68C02A'; // Slightly darker for shield fill
const DARK_BG = '#2E3230'; // Dark charcoal gray background
const WHITE = '#FFFFFF';
const DOC_TEXT = '#1a230f'; // Dark text on document

// Icon sizes
const sizes = [16, 32, 48, 128];

async function createIcon(size) {
  const canvas = sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 46, g: 50, b: 48, alpha: 1 } // #2E3230
    }
  });

  // Create SVG for the icon - matching CVCircle logo design
  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <!-- Lime green square background -->
      <rect x="2" y="2" width="${size - 4}" height="${size - 4}" rx="${size * 0.15}" fill="${LIME_GREEN}"/>
      
      <!-- Shield with document icon -->
      <g transform="translate(${size * 0.15}, ${size * 0.15}) scale(${size / 32})">
        <!-- Shield shape -->
        <path d="M12 2L8 4V6C8 7.1 8.9 8 10 8H14C15.1 8 16 7.1 16 6V4L12 2Z" fill="${SHIELD_GREEN}" opacity="0.95"/>
        <rect x="6" y="6" width="12" height="14" rx="2" fill="${WHITE}" opacity="0.98"/>
        
        <!-- Document lines -->
        <line x1="9" y1="10" x2="15" y2="10" stroke="${DOC_TEXT}" stroke-width="1.5" stroke-linecap="round"/>
        <line x1="9" y1="13" x2="15" y2="13" stroke="${DOC_TEXT}" stroke-width="1.5" stroke-linecap="round"/>
        <line x1="9" y1="16" x2="13" y2="16" stroke="${DOC_TEXT}" stroke-width="1.5" stroke-linecap="round"/>
        
        <!-- Folded corner -->
        <path d="M16 6L18 8H16V6Z" fill="${WHITE}" opacity="0.9"/>
        <line x1="16" y1="6" x2="18" y2="8" stroke="${DOC_TEXT}" stroke-width="1" opacity="0.3"/>
      </g>
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
  console.log('🎨 Creating CVCircle extension icons with logo design...');
  
  // Create icons directory if it doesn't exist
  const fs = require('fs');
  const path = require('path');
  const iconsDir = path.join(__dirname, 'icons');
  
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
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
  console.log('📝 Icons saved to: chrome-extension/icons/');
  console.log('🔄 Reload the extension in Chrome to see the new icons.');
}

// Run the icon creation
createAllIcons().catch(console.error);
