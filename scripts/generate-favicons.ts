import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

async function generateFavicons() {
  const root = process.cwd();
  const svgPath = path.join(root, 'public', 'images', 'logo.svg');
  
  if (!fs.existsSync(svgPath)) {
    console.error('Source logo.svg not found at', svgPath);
    process.exit(1);
  }

  const svgBuffer = fs.readFileSync(svgPath);

  // 1. Copy SVG directly to App Router icon.svg and public favicons
  const svgTargets = [
    path.join(root, 'src', 'app', 'icon.svg'),
    path.join(root, 'public', 'favicon.svg'),
    path.join(root, 'public', 'images', 'favicon.svg'),
  ];

  for (const target of svgTargets) {
    const dir = path.dirname(target);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(target, svgBuffer);
    console.log('Generated SVG favicon:', target);
  }

  // 2. Generate PNGs at multiple sizes
  const sizes = [
    { name: 'favicon-16x16.png', size: 16, dir: path.join(root, 'public', 'images') },
    { name: 'favicon-32x32.png', size: 32, dir: path.join(root, 'public', 'images') },
    { name: 'favicon.png', size: 512, dir: path.join(root, 'public', 'images') },
    { name: 'logo.png', size: 512, dir: path.join(root, 'public', 'images') },
    { name: 'apple-touch-icon.png', size: 180, dir: path.join(root, 'public', 'images') },
    { name: 'apple-touch-icon.png', size: 180, dir: path.join(root, 'public') },
  ];

  for (const item of sizes) {
    if (!fs.existsSync(item.dir)) fs.mkdirSync(item.dir, { recursive: true });
    const target = path.join(item.dir, item.name);
    await sharp(svgBuffer)
      .resize(item.size, item.size)
      .png()
      .toFile(target);
    console.log(`Generated PNG (${item.size}x${item.size}):`, target);
  }

  // 3. Generate WebP
  await sharp(svgBuffer)
    .resize(512, 512)
    .webp()
    .toFile(path.join(root, 'public', 'images', 'favicon.webp'));
  console.log('Generated WebP favicon');

  // 4. Generate standard favicon.ico (32x32 PNG inside ico or raw 32x32 PNG)
  const ico32Buffer = await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toBuffer();

  const icoTargets = [
    path.join(root, 'src', 'app', 'favicon.ico'),
    path.join(root, 'public', 'favicon.ico'),
  ];

  for (const icoTarget of icoTargets) {
    const dir = path.dirname(icoTarget);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(icoTarget, ico32Buffer);
    console.log('Generated ICO:', icoTarget);
  }

  console.log('All favicons successfully generated from logo.svg!');
}

generateFavicons().catch((err) => {
  console.error('Failed to generate favicons:', err);
  process.exit(1);
});
