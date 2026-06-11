const fs = require('fs');

async function testPdf() {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  // Intentionally don't set workerSrc
  
  const getDocument = pdfjs.getDocument || pdfjs.default?.getDocument;
  const loadingTask = getDocument({
    data: new Uint8Array(fs.readFileSync('package.json')), // just need any array
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
    verbosity: 0,
    standardFontDataUrl: 'node_modules/pdfjs-dist/standard_fonts/',
  });
  
  try {
    await loadingTask.promise;
    console.log("Success");
  } catch (e) {
    console.error(e.message);
  }
}

testPdf();
