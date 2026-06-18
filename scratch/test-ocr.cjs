/**
 * Test script: pdfjs canvas render + tesseract OCR
 */
const { createRequire } = require('module');
const req = createRequire(__filename);
const napiCanvas = req('@napi-rs/canvas');
const Tesseract = req('tesseract.js');
const fs = require('fs');
const path = require('path');

const pdfPath = process.argv[2];
if (!pdfPath) {
  console.error('Usage: node scratch/test-ocr.cjs <pdf-path>');
  process.exit(1);
}

async function run() {
  const buf = fs.readFileSync(pdfPath);
  console.log(`📄 File: ${path.basename(pdfPath)} (${buf.length} bytes)`);

  // --- Method 1: pdf-parse ---
  console.log('\n--- Method 1: pdf-parse ---');
  try {
    const pdfParse = req('pdf-parse');
    const data = await pdfParse(buf);
    const text = data?.text?.trim() || '';
    console.log(`${text.length > 50 ? '✅' : '❌'} ${text.length} chars ${text.length > 0 ? '- ' + text.substring(0, 80) : ''}`);
    if (text.length >= 50) return console.log('\nDone - text PDF parsed successfully.');
  } catch (e) {
    console.log('❌ FAILED:', e.message);
  }

  // --- Method 2: pdfjs text layer ---
  console.log('\n--- Method 2: pdfjs text layer ---');
  let pdfjsModule;
  let docForRender;
  try {
    const { workerSrc } = await (async () => {
      const ws = path.resolve(__dirname, '..', 'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs');
      return { workerSrc: `file://${ws}` };
    })();

    pdfjsModule = await import('../node_modules/pdfjs-dist/legacy/build/pdf.mjs');
    pdfjsModule.GlobalWorkerOptions.workerSrc = workerSrc;

    const data = new Uint8Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
    const doc = await pdfjsModule.getDocument({ data, verbosity: 0 }).promise;
    docForRender = doc;
    console.log(`Pages: ${doc.numPages}`);

    let text = '';
    for (let i = 1; i <= Math.min(doc.numPages, 3); i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map(it => it.str).join(' ') + '\n';
    }
    const t = text.trim();
    console.log(`${t.length > 50 ? '✅' : '❌'} ${t.length} chars`);
    if (t.length >= 50) return console.log('\nDone - text layer worked.');
  } catch (e) {
    console.log('❌ FAILED:', e.message);
  }

  // --- Method 3: pdfjs canvas render + tesseract OCR ---
  console.log('\n--- Method 3: pdfjs canvas render + tesseract OCR ---');
  const start = Date.now();
  try {
    if (!pdfjsModule) throw new Error('pdfjs not loaded');

    class NodeCanvasFactory {
      create(width, height) {
        const canvas = napiCanvas.createCanvas(width, height);
        return { canvas, context: canvas.getContext('2d') };
      }
      reset(p, width, height) { p.canvas.width = width; p.canvas.height = height; }
      destroy(p) { p.canvas.width = 0; p.canvas.height = 0; }
    }

    const canvasFactory = new NodeCanvasFactory();
    const data = new Uint8Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
    const doc = await pdfjsModule.getDocument({ data, verbosity: 0, canvasFactory }).promise;

    const pngBuffers = [];
    const maxPages = Math.min(doc.numPages, 3);

    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      const page = await doc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 2.0 });
      const w = Math.round(viewport.width);
      const h = Math.round(viewport.height);

      console.log(`🎨 Rendering page ${pageNum} (${w}×${h})...`);
      const { canvas, context } = canvasFactory.create(w, h);
      context.fillStyle = 'white';
      context.fillRect(0, 0, w, h);

      await page.render({ canvasContext: context, viewport, canvasFactory }).promise;
      page.cleanup();

      const png = canvas.toBuffer('image/png');
      pngBuffers.push(png);
      console.log(`  → ${png.length} bytes (${((Date.now() - start)/1000).toFixed(1)}s)`);
    }

    console.log(`\n🔍 OCR-ing ${pngBuffers.length} pages...`);
    const worker = await Tesseract.createWorker('eng');
    let ocrText = '';

    for (let i = 0; i < pngBuffers.length; i++) {
      const { data: { text } } = await worker.recognize(pngBuffers[i]);
      ocrText += text + '\n';
      console.log(`  Page ${i+1}: ${text.trim().length} chars (${((Date.now()-start)/1000).toFixed(1)}s)`);
    }

    await worker.terminate();
    const t = ocrText.trim();
    console.log(`\n${t.length >= 50 ? '✅' : '❌'} OCR done in ${((Date.now()-start)/1000).toFixed(1)}s: ${t.length} chars`);
    if (t.length > 0) console.log('Preview:', t.substring(0, 300));
  } catch (e) {
    console.error('❌ FAILED:', e.message);
    console.error(e.stack?.split('\n').slice(0,3).join('\n'));
  }
}

run().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
