/**
 * Test: pdfjs-dist canvas render → tesseract OCR pipeline
 * Run with: node scratch/test-ocr-pipeline.mjs <path-to-pdf>
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const pdfPath = process.argv[2];
if (!pdfPath) {
  console.error('Usage: node scratch/test-ocr-pipeline.mjs <path-to-pdf>');
  process.exit(1);
}

const fs = require('fs');
const buf = fs.readFileSync(pdfPath);
console.log(`📄 Testing with: ${pdfPath} (${buf.length} bytes)`);

// Step 1: Try pdf-parse
console.log('\n--- Method 1: pdf-parse ---');
try {
  const pdfParse = require('pdf-parse');
  const data = await pdfParse(buf);
  const text = data?.text?.trim() || '';
  console.log(`Result: ${text.length} chars${text.length > 0 ? ' - ' + text.substring(0, 100) : ''}`);
} catch (e) {
  console.log('FAILED:', e.message);
}

// Step 2: pdfjs text layer
console.log('\n--- Method 2: pdfjs-dist text layer ---');
try {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  if (pdfjs.GlobalWorkerOptions) pdfjs.GlobalWorkerOptions.workerSrc = '';
  const data = new Uint8Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  const doc = await pdfjs.getDocument({ data, useWorkerFetch: false, isEvalSupported: false, verbosity: 0 }).promise;
  let text = '';
  for (let i = 1; i <= Math.min(doc.numPages, 3); i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map(it => it.str).join(' ') + '\n';
  }
  console.log(`Result: ${text.trim().length} chars${text.trim().length > 0 ? ' - ' + text.substring(0, 100) : ''}`);
} catch (e) {
  console.log('FAILED:', e.message);
}

// Step 3: pdfjs canvas render + OCR
console.log('\n--- Method 3: pdfjs canvas render + tesseract OCR ---');
try {
  const start = Date.now();
  const napiCanvas = require('@napi-rs/canvas');
  const Tesseract = require('tesseract.js');
  
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  if (pdfjs.GlobalWorkerOptions) pdfjs.GlobalWorkerOptions.workerSrc = '';
  if (typeof global.DOMMatrix === 'undefined') {
    global.DOMMatrix = class DOMMatrix { constructor() { return {}; } };
  }

  const data = new Uint8Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  const doc = await pdfjs.getDocument({ data, useWorkerFetch: false, isEvalSupported: false, verbosity: 0 }).promise;
  console.log(`📄 ${doc.numPages} page(s) found`);

  const scale = 2.0;
  const pngBuffers = [];

  for (let pageNum = 1; pageNum <= Math.min(doc.numPages, 2); pageNum++) {
    const page = await doc.getPage(pageNum);
    const viewport = page.getViewport({ scale });
    const width = Math.round(viewport.width);
    const height = Math.round(viewport.height);
    
    console.log(`🎨 Rendering page ${pageNum} (${width}×${height})...`);
    
    const canvas = napiCanvas.createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    const canvasFactory = {
      create: (w, h) => { const c = napiCanvas.createCanvas(w, h); return { canvas: c, context: c.getContext('2d') }; },
      reset: (pair, w, h) => { pair.canvas.width = w; pair.canvas.height = h; },
      destroy: () => {}
    };
    
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);
    
    await page.render({ canvasContext: ctx, viewport, canvasFactory }).promise;
    page.cleanup();
    
    const png = canvas.toBuffer('image/png');
    pngBuffers.push(png);
    console.log(`✅ Page ${pageNum} → ${png.length} bytes PNG`);
  }

  console.log(`\n🔍 Running Tesseract on ${pngBuffers.length} page(s)...`);
  const worker = await Tesseract.createWorker('eng');
  let ocrText = '';
  
  for (let i = 0; i < pngBuffers.length; i++) {
    const { data: { text } } = await worker.recognize(pngBuffers[i]);
    ocrText += text + '\n';
    console.log(`✅ Page ${i+1} OCR: ${text.trim().length} chars`);
  }
  
  await worker.terminate();
  
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\n✅ Method 3 SUCCESS in ${elapsed}s: ${ocrText.trim().length} total chars`);
  console.log('Preview:', ocrText.trim().substring(0, 200));
} catch (e) {
  console.log('FAILED:', e.message);
  console.error(e.stack);
}
