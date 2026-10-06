import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500">
  <circle cx="250" cy="250" r="250" fill="#FFFFFF"/>
  <g fill="#013f2e">
    <path d="M173 194C190 183 207 183 225 187c24 6 46 11 66 8 23-4 40-16 50-37 7-13 9-28 8-37 25 8 47 27 59 51 5 10 8 21 8 33-12-15-26-27-42-36-5 22-16 39-31 53-19 18-43 25-68 22-23-2-44-12-63-23-15-8-27-16-39-18-8-2-15-2-22 0 6-5 14-8 22-10Z"/>
    <path d="M108 255c22-13 46-17 71-15 28 3 53 11 77 17 26 7 49 9 70 4 13-3 25-9 36-18-5 14-13 26-23 37-15 15-35 24-57 26-24 2-46-3-69-11-22-8-45-18-67-24-15-3-28-3-40 1-7 2-14 6-20 10 7-11 14-20 22-27Z"/>
    <path d="M138 287c14-5 28-4 44 1 17 6 35 18 53 30 22 15 44 25 65 27 22 2 42-4 58-18 18-15 29-38 33-62 3-16 1-33-4-48 12 12 21 25 26 41 8 25 5 51-8 74-14 25-36 43-62 52-25 8-51 7-76-3-25-10-46-25-67-41-17-13-33-27-49-33-11-5-22-5-31-2 4-7 10-12 17-16Z"/>
  </g>
</svg>`;

async function generateFavicons() {
  const root = process.cwd();
  const svgBuffer = Buffer.from(FAVICON_SVG, 'utf-8');

  // 1. Write SVG directly to App Router icon.svg and public favicons
  const svgTargets = [
    path.join(root, 'src', 'app', 'icon.svg'),
    path.join(root, 'public', 'favicon.svg'),
    path.join(root, 'public', 'images', 'favicon.svg'),
  ];

  for (const target of svgTargets) {
    const dir = path.dirname(target);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(target, svgBuffer);
    console.log('Generated SVG favicon with white background:', target);
  }

  // 2. Generate PNGs at multiple sizes
  const sizes = [
    { name: 'favicon-16x16.png', size: 16, dir: path.join(root, 'public', 'images') },
    { name: 'favicon-32x32.png', size: 32, dir: path.join(root, 'public', 'images') },
    { name: 'favicon.png', size: 512, dir: path.join(root, 'public', 'images') },
    { name: 'icon-48x48.png', size: 48, dir: path.join(root, 'public', 'images') },
    { name: 'icon-72x72.png', size: 72, dir: path.join(root, 'public', 'images') },
    { name: 'icon-96x96.png', size: 96, dir: path.join(root, 'public', 'images') },
    { name: 'icon-144x144.png', size: 144, dir: path.join(root, 'public', 'images') },
    { name: 'icon-192x192.png', size: 192, dir: path.join(root, 'public', 'images') },
    { name: 'icon-512x512.png', size: 512, dir: path.join(root, 'public', 'images') },
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

  // 4. Generate standard favicon.ico (32x32 PNG inside ico)
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

  console.log('All favicons successfully generated with white background!');
}

generateFavicons().catch((err) => {
  console.error('Failed to generate favicons:', err);
  process.exit(1);
});
