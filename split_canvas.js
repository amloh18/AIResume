const fs = require('fs');

const fileContent = fs.readFileSync('src/components/cv-canvas/CVCanvasBuilder.tsx', 'utf-8');

// The file has several sections marked with comments.
// We'll extract them out.

// 1. Helpers
const helpersRegex = /\/\/ ==========================================\n\/\/ HELPER FUNCTIONS\n\/\/ ==========================================\n([\s\S]*?)\n\/\/ ==========================================/;
const helpersMatch = fileContent.match(helpersRegex);
if (helpersMatch) {
  const helpersCode = helpersMatch[1];
  fs.writeFileSync('src/components/cv-builder-pro/helpers.ts', `export ${helpersCode.trim()}`);
} else {
  console.log('Helpers not found');
}

// Wait, the file is too complex to split just by regex if it wasn't perfectly formatted. Let's just create the script manually based on the structure.
