// @ts-nocheck pre-existing type escape — removal tracked as R14 in docs/application-automation/fix-tasks.md
// ============================================================================
// STATIC IMPORTS - Must be at top level for bundler to include them
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { UnifiedCVDataStructure, DEFAULT_UNIFIED_CV_DATA } from '@/types/unified-cv-schema';
import { sanitizeErrorMessage } from '@/lib/api/error-handler';
import { rateLimiter, rateLimitConfigs } from '@/lib/rate-limiter';
import { getAuthenticatedUser } from '@/lib/auth-helpers';

// ============================================================================
// TEXT CLEANING UTILITY - ATS Compatible
// ============================================================================

/**
 * Cleans text for ATS compatibility by removing special characters and fixing formatting
 */
function cleanTextForATS(text: string | null | undefined): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  let cleaned = text;

  // Remove bullet point characters (common Unicode bullet points)
  // Important: Only remove bullets at the start of lines, not numbers/content in the middle
  cleaned = cleaned
    .replace(/[●•▪▫◦‣⁃⁌⁍∙◘◙◉○◯◐◑◒◓◔◕◖◗◗◘◙◚◛◜◝◞◟◠◡]/g, '') // Various bullet characters anywhere
    .replace(/^[\s]*[-*→▶▸▹►▻▼▽▪▫]\s*/gm, '') // Bullet at start of line (with optional whitespace)
    .replace(/^[\s]*[•◦‣]\s*/gm, '') // More bullet variants at start of line
    .replace(/^[\s]*[0-9]+[.)]\s+/gm, '') // Numbered bullets at start (1. 2. etc.) - note: requires space after
    .replace(/^[\s]*[a-z][.)]\s+/gmi, '') // Lettered bullets at start (a. b. etc.) - note: requires space after
    .replace(/^[\s]*[ivx]+[.)]\s+/gmi, ''); // Roman numeral bullets at start - note: requires space after

  // Remove em dashes, en dashes, and replace with regular hyphens
  cleaned = cleaned
    .replace(/[—–]/g, '-') // Em dash and en dash to hyphen
    .replace(/[""'']/g, '"') // Smart quotes to regular quotes
    .replace(/['']/g, "'") // Smart apostrophes to regular apostrophe
    .replace(/[…]/g, '...') // Ellipsis to three dots
    .replace(/[©®™]/g, ''); // Copyright symbols

  // Fix multiple spaces and whitespace
  cleaned = cleaned
    .replace(/[ \t]+/g, ' ') // Multiple spaces/tabs to single space
    .replace(/[ \t]*\n[ \t]*/g, '\n') // Clean line breaks
    .replace(/\n{3,}/g, '\n\n') // Multiple newlines to double newline
    .split('\n')
    .map(line => line.trim()) // Trim each line
    .filter(line => line.length > 0) // Remove empty lines
    .join('\n'); // Rejoin with single newlines

  // Fix common spelling mistakes (basic corrections)
  const spellingFixes: Record<string, string> = {
    'upto': 'up to',
    'alot': 'a lot',
    'teh': 'the',
    'adn': 'and',
    'taht': 'that',
    'recieve': 'receive',
    'seperate': 'separate',
    'occured': 'occurred',
    'begining': 'beginning',
    'existance': 'existence',
  };

  Object.entries(spellingFixes).forEach(([wrong, correct]) => {
    const regex = new RegExp(`\\b${wrong}\\b`, 'gi');
    cleaned = cleaned.replace(regex, correct);
  });

  // Final cleanup: remove any remaining special characters that might affect ATS
  // Keep only alphanumeric, basic punctuation, and whitespace
  cleaned = cleaned
    .replace(/[^\w\s.,;:!?()\-'"/\n]/g, ' ') // Remove special chars, keep basic punctuation
    .replace(/[ \t]+/g, ' ') // Clean up spaces again
    .trim();

  return cleaned;
}

// Static imports for libraries that work without issues
import mammoth from 'mammoth';

// ─────────────────────────────────────────────────────────────────────────────
// tesseract.js is resolved lazily, at call time, through a runtime `require`
// that the bundler cannot statically analyse.
//
// It used to be a top-level `import Tesseract from 'tesseract.js'`, which made a
// package declared in `optionalDependencies` — one npm is allowed to skip
// silently when it cannot fetch it — a hard *build-time* requirement. When npm
// skipped it the install still reported success ("added 1081 packages"), and the
// failure only surfaced ~3.5 minutes later inside the bundler as
// `Module not found: Can't resolve 'tesseract.js'`, naming neither the install
// nor the network. `@napi-rs/canvas`, its sibling in the OCR path, is already
// loaded this way for exactly the same reason.
// ─────────────────────────────────────────────────────────────────────────────
type TesseractCreateWorker = (
  lang?: string,
  oem?: number,
  options?: Record<string, unknown>
) => Promise<any>;

let cachedCreateWorker: TesseractCreateWorker | null | undefined;

/**
 * Resolve tesseract.js's `createWorker` at runtime, or `null` when the package
 * is not installed. The result — including a negative one — is cached, so a
 * missing package is reported once rather than on every request.
 */
async function getTesseractCreateWorker(): Promise<TesseractCreateWorker | null> {
  if (cachedCreateWorker !== undefined) return cachedCreateWorker;
  try {
    const { createRequire } = await import('module');
    const path = await import('path');
    const requireShim = createRequire(path.join(process.cwd(), 'package.json'));
    const mod = requireShim('tesseract.js');
    const createWorker = mod?.createWorker ?? mod?.default?.createWorker;
    if (typeof createWorker !== 'function') {
      throw new Error('tesseract.js loaded but createWorker is not a function');
    }
    cachedCreateWorker = createWorker;
  } catch (error: any) {
    console.warn('⚠️ tesseract.js unavailable — PDF/image OCR disabled:', error?.message);
    cachedCreateWorker = null;
  }
  return cachedCreateWorker;
}

// pdf-parse and pdf2pic are loaded dynamically to avoid bundling their test files

// ============================================================================
// STAGE 3: VALIDATION - Zod Schema
// ============================================================================

const profileSchema = z.object({
  network: z.string().nullable(),
  username: z.string().nullable(),
  url: z.string().url().nullable().or(z.literal('')),
});

const locationSchema = z.object({
  address: z.string().nullable(),
  postalCode: z.string().nullable(),
  city: z.string().nullable(),
  countryCode: z.string().nullable(),
  region: z.string().nullable(),
});

const basicsSchema = z.object({
  name: z.string().nullable(),
  label: z.string().nullable(),
  email: z.string().email().nullable().or(z.literal('')),
  phone: z.string().nullable(),
  url: z.string().url().nullable().or(z.literal('')),
  summary: z.string().nullable(),
  image: z.string().nullable(),
  location: locationSchema.nullable(),
  profiles: z.array(profileSchema).default([]),
});

const workSchema = z.object({
  name: z.string().nullable(),
  position: z.string().nullable(),
  url: z.string().url().nullable().or(z.literal('')),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  summary: z.string().nullable(),
  highlights: z.array(z.string()).default([]),
});

const educationSchema = z.object({
  institution: z.string().nullable(),
  url: z.string().url().nullable().or(z.literal('')),
  area: z.string().nullable(),
  studyType: z.string().nullable(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  score: z.string().nullable(),
  courses: z.array(z.string()).optional().default([]),  // Optional field
  description: z.string().nullable().optional(),
});

const skillsSchema = z.object({
  category: z.string().nullable(),
  skills: z.array(z.string()).default([]),
});

const projectsSchema = z.object({
  name: z.string().nullable(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  description: z.string().nullable(),
  highlights: z.array(z.string()).optional().default([]),  // Optional field
  keywords: z.array(z.string()).default([]),
  url: z.string().url().nullable().or(z.literal('')),
});

const volunteerSchema = z.object({
  organization: z.string().nullable(),
  position: z.string().nullable(),
  url: z.string().url().nullable().or(z.literal('')),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  summary: z.string().nullable(),
  highlights: z.array(z.string()).default([]),
});

const awardsSchema = z.object({
  title: z.string().nullable(),
  date: z.string().nullable(),
  awarder: z.string().nullable(),
  summary: z.string().nullable(),
});

const certificatesSchema = z.object({
  name: z.string().nullable(),
  date: z.string().nullable(),
  issuer: z.string().nullable(),
  url: z.string().url().nullable().or(z.literal('')),
  description: z.string().nullable(),
});

const publicationsSchema = z.object({
  name: z.string().nullable(),
  publisher: z.string().nullable(),
  releaseDate: z.string().nullable(),
  url: z.string().url().nullable().or(z.literal('')),
  summary: z.string().nullable(),
});

const languagesSchema = z.object({
  language: z.string().nullable(),
  fluency: z.string().nullable(),
});

const interestsSchema = z.object({
  name: z.string().nullable(),
  keywords: z.array(z.string()).default([]),
});

const referencesSchema = z.object({
  name: z.string().nullable(),
  reference: z.string().nullable(),
});

const cvDataSchema = z.object({
  basics: basicsSchema.nullable(),
  work: z.array(workSchema).default([]),
  education: z.array(educationSchema).default([]),
  skills: z.array(skillsSchema).default([]),
  projects: z.array(projectsSchema).default([]),
  volunteer: z.array(volunteerSchema).default([]),
  awards: z.array(awardsSchema).default([]),
  certificates: z.array(certificatesSchema).default([]),
  publications: z.array(publicationsSchema).default([]),
  languages: z.array(languagesSchema).default([]),
  interests: z.array(interestsSchema).default([]),
  references: z.array(referencesSchema).default([]),
});

// ============================================================================
// STAGE 1: TEXT EXTRACTION
// ============================================================================

/**
 * Gets raw text from any file (DOCX, PDF, or Scanned PDF).
 * This is your "doc-parse", "pdf-parse", and "OCR" logic.
 */
async function extractTextFromFile(fileBuffer: Buffer, mimeType: string): Promise<string> {
  let rawText = '';

  const toPlainUint8Array = (buffer: Buffer): Uint8Array => {
    return new Uint8Array(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
  };

  // 1. Handle DOCX files
  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    console.log('Attempting Method: doc-parse (mammoth)...');
    if (!mammoth) {
      throw new Error('Word document parser not available.');
    }
    const result = await mammoth.extractRawText({ buffer: fileBuffer });
    rawText = result.value || '';
  }
  // 1b. Handle legacy DOC files
  else if (mimeType === 'application/msword') {
    console.log('Attempting Method: legacy-doc-parse...');
    // mammoth only supports .docx, so we suggest conversion
    throw new Error('Legacy .doc files are not directly supported. Please save your CV as .docx or .pdf and try again.');
  }
  // 2. Handle PDF files
  else if (mimeType === 'application/pdf') {
    let pdfParseSucceeded = false;
    const extractionErrors: string[] = [];

    // ─────────────────────────────────────────────────────────────────────────
    // Helper: load pdfjs-dist and configure the worker for Node.js (pdfjs v5+)
    // ─────────────────────────────────────────────────────────────────────────
    const loadPdfjs = async () => {
      let pdfjs: any;
      try {
        pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
      } catch {
        pdfjs = await import('pdfjs-dist');
      }
      // pdfjs v5 requires an explicit workerSrc (empty string breaks it)
      if (pdfjs.GlobalWorkerOptions && !pdfjs.GlobalWorkerOptions.workerSrc) {
        try {
          const path = await import('path');
          const workerPath = path.resolve(process.cwd(), 'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs');
          pdfjs.GlobalWorkerOptions.workerSrc = `file://${workerPath}`;
        } catch {
          try {
            const path = await import('path');
            const workerPath = path.resolve(process.cwd(), 'node_modules/pdfjs-dist/build/pdf.worker.mjs');
            pdfjs.GlobalWorkerOptions.workerSrc = `file://${workerPath}`;
          } catch { /* leave unconfigured, will fail gracefully */ }
        }
      }
      return pdfjs;
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Method 1: pdf-parse (fastest for text-based PDFs)
    // ─────────────────────────────────────────────────────────────────────────
    try {
      console.log('Attempting Method 1: pdf-parse...');
      const pdfParse = (await import('pdf-parse')).default;
      const data = await pdfParse(fileBuffer);
      const extractedText = data?.text?.trim() || '';
      if (extractedText.length >= 50) {
        rawText = extractedText;
        pdfParseSucceeded = true;
        console.log(`✅ Method 1 (pdf-parse) succeeded: ${rawText.length} chars`);
      } else {
        console.log(`⚠️ Method 1: only ${extractedText.length} chars - likely scanned PDF`);
        extractionErrors.push(`pdf-parse: only ${extractedText.length} chars extracted`);
      }
    } catch (e: any) {
      console.log(`⚠️ Method 1 failed: ${e?.message}`);
      extractionErrors.push('pdf-parse failed.');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Method 2: pdfjs-dist text layer (handles some PDFs that pdf-parse misses)
    // ─────────────────────────────────────────────────────────────────────────
    if (!pdfParseSucceeded) {
      try {
        console.log('Attempting Method 2: pdfjs-dist text layer...');
        const pdfjs = await loadPdfjs();
        const getDocument = pdfjs.getDocument || pdfjs.default?.getDocument;
        if (!getDocument) throw new Error('pdfjs getDocument not found');

        const doc = await getDocument({ data: toPlainUint8Array(fileBuffer), verbosity: 0 }).promise;
        let extractedText = '';
        const maxPages = Math.min(doc.numPages, 5);
        for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
          try {
            const page = await doc.getPage(pageNum);
            const content = await page.getTextContent();
            const pageText = content.items
              .map((item: any) => item.str || '')
              .filter((s: string) => s.trim().length > 0)
              .join(' ').trim();
            if (pageText.length > 0) extractedText += pageText + '\n';
          } catch { /* skip page */ }
        }
        if (extractedText.trim().length >= 50) {
          rawText = extractedText.trim();
          pdfParseSucceeded = true;
          console.log(`✅ Method 2 (pdfjs text layer) succeeded: ${rawText.length} chars`);
        } else {
          console.log(`⚠️ Method 2: only ${extractedText.trim().length} chars - likely image PDF`);
          extractionErrors.push('pdfjs text layer: insufficient text');
        }
      } catch (e: any) {
        console.log(`⚠️ Method 2 failed: ${e?.message}`);
        extractionErrors.push(`pdfjs text layer failed: ${e?.message}`);
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Method 3: pdfjs canvas render → @napi-rs/canvas PNG → tesseract OCR
    // Pure JS, no system ImageMagick/Ghostscript needed. ~2-10s for typical CVs.
    // ─────────────────────────────────────────────────────────────────────────
    if (!pdfParseSucceeded) {
      try {
        console.log('Attempting Method 3: pdfjs canvas render → tesseract OCR...');

        const createWorker = await getTesseractCreateWorker();
        if (!createWorker) throw new Error('tesseract.js not available');

        // Load @napi-rs/canvas (pure JS canvas - no system dependencies)
        let napiCanvas: any;
        try {
          const { createRequire } = await import('module');
          const path = await import('path');
          const requireShim = createRequire(path.join(process.cwd(), 'package.json'));
          napiCanvas = requireShim('@napi-rs/canvas');
        } catch (canvasErr: any) {
          console.error('❌ Failed to load @napi-rs/canvas via createRequire:', canvasErr?.message);
          throw new Error(`@napi-rs/canvas not available: ${canvasErr?.message}`);
        }

        const pdfjs = await loadPdfjs();
        const getDocument = pdfjs.getDocument || pdfjs.default?.getDocument;
        if (!getDocument) throw new Error('pdfjs getDocument not found for OCR');

        // NodeCanvasFactory: bridges pdfjs rendering to @napi-rs/canvas
        const NodeCanvasFactory = {
          create: (width: number, height: number) => {
            const canvas = napiCanvas.createCanvas(width, height);
            return { canvas, context: canvas.getContext('2d') };
          },
          reset: (pair: any, width: number, height: number) => {
            pair.canvas.width = width;
            pair.canvas.height = height;
          },
          destroy: (pair: any) => {
            pair.canvas.width = 0;
            pair.canvas.height = 0;
          }
        };

        const OCR_TIMEOUT_MS = 120_000; // 2 min hard limit
        const ocrTimeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('OCR_TIMEOUT')), OCR_TIMEOUT_MS)
        );

        const ocrWorkPromise = (async () => {
          const doc = await getDocument({
            data: toPlainUint8Array(fileBuffer),
            verbosity: 0,
            canvasFactory: NodeCanvasFactory,
          }).promise;

          const numPages = doc.numPages;
          const maxPages = Math.min(numPages, 3);
          console.log(`📄 PDF has ${numPages} page(s). Rendering up to ${maxPages} for OCR...`);

          const pngBuffers: Buffer[] = [];
          const scale = 2.0; // 2x scale for good OCR accuracy

          for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
            try {
              const page = await doc.getPage(pageNum);
              const viewport = page.getViewport({ scale });
              const width = Math.round(viewport.width);
              const height = Math.round(viewport.height);

              console.log(`🎨 Rendering page ${pageNum} (${width}×${height})...`);

              const { canvas, context } = NodeCanvasFactory.create(width, height);
              context.fillStyle = 'white';
              context.fillRect(0, 0, width, height);

              await page.render({ canvasContext: context, viewport, canvasFactory: NodeCanvasFactory }).promise;
              page.cleanup();

              const pngBuffer = (canvas as any).toBuffer('image/png');
              pngBuffers.push(pngBuffer);
              console.log(`✅ Page ${pageNum} rendered → ${pngBuffer.length} bytes`);
            } catch (renderErr: any) {
              console.warn(`⚠️ Failed to render page ${pageNum}: ${renderErr?.message}`);
            }
          }

          if (pngBuffers.length === 0) throw new Error('No PDF pages could be rendered for OCR.');

          // Tesseract OCR on all rendered PNG buffers
          console.log(`🔍 Running Tesseract OCR on ${pngBuffers.length} page(s)...`);
          const worker = await createWorker('eng', 1, {
            langPath: process.cwd(),
            cachePath: process.cwd(),
          });
          let ocrText = '';

          for (let i = 0; i < pngBuffers.length; i++) {
            try {
              console.log(`🔄 OCR page ${i + 1}...`);
              const { data: { text } } = await (worker as any).recognize(pngBuffers[i]);
              if (text?.trim()) {
                ocrText += text + '\n';
                console.log(`✅ Page ${i + 1} OCR: ${text.trim().length} chars`);
              }
            } catch (pageErr: any) {
              console.warn(`⚠️ OCR failed for page ${i + 1}: ${pageErr?.message}`);
            }
          }

          await worker.terminate();
          return ocrText;
        })();

        try {
          const ocrResult = await Promise.race([ocrWorkPromise, ocrTimeoutPromise]);
          if (ocrResult && ocrResult.trim().length >= 50) {
            rawText = ocrResult.trim();
            pdfParseSucceeded = true;
            console.log(`✅ Method 3 (pdfjs+canvas OCR) succeeded: ${rawText.length} chars`);
          } else {
            extractionErrors.push('OCR extracted insufficient text.');
          }
        } catch (ocrErr: any) {
          if (ocrErr?.message === 'OCR_TIMEOUT') {
            console.warn('⚠️ OCR timed out after 2 minutes.');
            extractionErrors.push('OCR timed out.');
          } else {
            console.error(`❌ Method 3 failed: ${ocrErr?.message}`);
            extractionErrors.push(`OCR failed: ${ocrErr?.message}`);
          }
        }
      } catch (e3: any) {
        console.error(`❌ Method 3 setup failed: ${e3?.message}`);
        extractionErrors.push(`OCR engine error: ${e3?.message}`);
      }
    }

    // If all methods failed, throw a clear, actionable error
    if (!rawText || rawText.trim().length < 50) {
      throw new Error(
        `This PDF appears to be a scanned or image-based document that could not be read.\n\n` +
        `Please try one of these alternatives:\n` +
        `• Export your CV as a text-based PDF from Word, Google Docs, or Canva\n` +
        `• Use "Paste CV" to paste your CV text directly\n` +
        `• Use "Start Fresh" to build your CV manually`
      );
    }
  }
  // 3. Handle image files (direct OCR)
  else if (mimeType.startsWith('image/')) {
    console.log('Attempting OCR on image file...');
    const createWorker = await getTesseractCreateWorker();
    if (!createWorker) {
      throw new Error('tesseract.js not available for image OCR');
    }
    const worker = await createWorker('eng', 1, {
      langPath: process.cwd(),
      cachePath: process.cwd(),
    });
    // tesseract.js worker methods (TypeScript types may be incomplete)
    const workerAny = worker as any;
    if (workerAny.loadLanguage) await workerAny.loadLanguage('eng');
    if (workerAny.initialize) await workerAny.initialize('eng');
    const { data: { text } } = await worker.recognize(fileBuffer);
    await worker.terminate();
    rawText = text || '';
  } else if (mimeType === 'text/plain') {
    console.log('Extracting text from plain text file...');
    rawText = fileBuffer.toString('utf-8');
  } else {
    throw new Error(`Unsupported file type: ${mimeType}`);
  }

  if (!rawText || rawText.length < 50) {
    throw new Error('Extraction resulted in no usable text (minimum 50 characters required).');
  }

  console.log(`✅ Text extraction successful: ${rawText.length} characters`);
  return rawText;
}

// ============================================================================
// STAGE 2: AI DATA STRUCTURING
// ============================================================================

/**
 * Uses an LLM to parse raw text into the target JSON structure.
 * This is your "Method 3: AI". (Example with Gemini)
 */
async function structureTextWithAI(rawText: string): Promise<any> {
  // Import AI API helper
  const { callAIWithFallback, hasAIApiKeys } = await import('@/lib/utils/ai-api-helper');

  if (!hasAIApiKeys()) {
    throw new Error('No AI API key configured (gemini_api_key). AI parsing is unavailable.');
  }

  console.log(`🔑 Using AI API helper with gemini_api_key`);

  // Create a simplified schema for the AI prompt to save tokens
  // Note: courses in education and highlights in projects are optional
  // IMPORTANT: All fields must match the validation schema exactly
  const simpleSchema = `{
    "basics": { "name": "...", "label": "...", "image": "...", "email": "...", "phone": "...", "url": "...", "summary": "...", "location": { "address": "...", "postalCode": "...", "city": "...", "countryCode": "...", "region": "..." }, "profiles": [{ "network": "...", "username": "...", "url": "..." }] },
    "work": [{ "name": "...", "position": "...", "url": "...", "startDate": "...", "endDate": "...", "summary": "...", "highlights": ["..."] }],
    "education": [{ "institution": "...", "url": "...", "area": "...", "studyType": "...", "startDate": "...", "endDate": "...", "score": "...", "courses": ["..."], "description": "..." }],
    "skills": [{ "category": "...", "skills": ["...", "..."] }],
    "projects": [{ "name": "...", "startDate": "...", "endDate": "...", "description": "...", "highlights": ["..."], "keywords": ["..."], "url": "..." }],
    "volunteer": [{ "organization": "...", "position": "...", "url": "...", "startDate": "...", "endDate": "...", "summary": "...", "highlights": ["..."] }],
    "awards": [{ "title": "...", "date": "...", "awarder": "...", "summary": "..." }],
    "certificates": [{ "name": "...", "date": "...", "issuer": "...", "url": "...", "description": "..." }],
    "publications": [{ "name": "...", "publisher": "...", "releaseDate": "...", "url": "...", "summary": "..." }],
    "languages": [{ "language": "...", "fluency": "..." }],
    "interests": [{ "name": "...", "keywords": ["..."] }],
    "references": [{ "name": "...", "reference": "..." }]
  }`;

  // Strengthened system instruction - explicitly tells AI not to include markdown wrappers
  const systemInstruction = `You are an expert resume parsing API. Your only task is to extract information
from the resume text and return **only** a valid JSON object.
- Adhere strictly to this JSON structure: ${simpleSchema}
- Do not include any other text, greetings, explanations, or markdown \`\`\`json wrappers.
- Your entire response must be *only* the JSON object, nothing else.
- **CRITICAL**: Always include ALL fields in the schema. If a value is not found, use \`null\` (NOT undefined, NOT omitted).
- For URL fields: Use a valid URL string, or \`null\` if not found, or empty string \`""\` if explicitly empty.
- For string fields: Use a string value, or \`null\` if not found. Never omit fields or use undefined.
- For arrays: Use an empty array \`[]\` if no items found, never null or undefined.
- **IMPORTANT**: The "courses" field in education and "highlights" field in projects/volunteer are optional. If no data is found, you may omit them or use empty arrays \`[]\`.
- **REQUIRED FIELDS**: All other fields must be present. Missing fields will cause validation errors.
- Date formatting: Use YYYY-MM format (e.g., "2023-05"). If only a year is known, use "YYYY". If date is "Present" or "Current", leave endDate as empty string ("").
- Do NOT output textual words like "Present" in date fields.
- Clean all text: Remove dates, extra whitespace, and formatting artifacts from titles.
- Skills should be categorized appropriately (e.g., "Technical Skills", "Programming Languages", "Soft Skills").
- Extract URLs and links properly (GitHub, LinkedIn, personal websites).

**SECTION-SPECIFIC EXTRACTION GUIDELINES:**

**BASICS (Personal Information):**
- "name": Extract full name (first + last). If only first or last is available, use what's provided.
- "label": Extract professional title, job title, or role (e.g., "Software Engineer", "Marketing Manager").
- "email": Extract email address exactly as written.
- "phone": Extract phone number in any format (will be normalized later).
- "url": Extract personal website or portfolio URL.
- "summary": Extract professional summary, objective, or profile statement. Include ALL paragraphs if multiple exist.
- "location": Extract address components:
  * "city": City name
  * "region": State, province, or region
  * "countryCode": ISO country code if available, otherwise country name
  * "address": Full street address if available
  * "postalCode": ZIP/postal code if available
- "profiles": Extract social media profiles:
  * "network": Platform name (LinkedIn, GitHub, Twitter, etc.)
  * "username": Username or handle
  * "url": Full profile URL

**WORK EXPERIENCE:**
- "name": Company/organization name
- "position": Job title or role
- "url": Company website URL if available
- "startDate": Start date in YYYY-MM format
- "endDate": End date in YYYY-MM format, or "" if current/ongoing
- "summary": COMPLETE job description including:
  * ALL responsibilities and duties
  * ALL achievements and accomplishments
  * ALL key contributions
  * Include content from "Key Achievements", "Highlights", "Responsibilities" sections
  * DO NOT truncate - read until next work entry or section break
  * Remove bullet characters but preserve content
- "highlights": Array of key achievements or notable accomplishments (optional, can be empty array)

**VOLUNTEER EXPERIENCE:**
- "organization": Name of the organization where volunteer work was performed
- "position": Volunteer role or title (e.g., "Volunteer Coordinator", "Tutor", "Event Organizer", "Board Member")
- "url": Organization website URL if available
- "startDate": Start date in YYYY-MM format
- "endDate": End date in YYYY-MM format, or "" if ongoing
- "summary": Full description of volunteer responsibilities, impact, and contributions
- "highlights": Array of key achievements or notable contributions (optional, can be empty array)
- IMPORTANT: Treat volunteer work with same detail as work experience - extract ALL information

**EDUCATION:**
- "institution": School, university, or educational institution name
- "url": Institution website URL if available
- "area": Field of study or major (e.g., "Computer Science", "Business Administration")
- "studyType": Degree type (e.g., "Bachelor", "Master", "PhD", "Associate", "Certificate")
- "startDate": Start date in YYYY-MM format
- "endDate": End date in YYYY-MM format, or "" if current/ongoing
- "score": GPA, grade, or academic achievement if mentioned
- "courses": Array of relevant courses taken (optional, can be empty array)
- "description": Additional details about the education (honors, thesis, etc.)

**PROJECTS:**
- "name": Project name or title
- "startDate": Start date in YYYY-MM format
- "endDate": End date in YYYY-MM format, or "" if ongoing
- "description": Complete project description including purpose, technologies used, and outcomes
- "highlights": Array of key features, technologies, or achievements (optional, can be empty array)
- "keywords": Array of relevant keywords or tags (optional, can be empty array)
- "url": Project URL (GitHub, live demo, portfolio link, etc.)

**SKILLS:**
- "category": Skill category (e.g., "Programming Languages", "Frameworks", "Tools", "Soft Skills", "Languages")
- "skills": Array of specific skills within that category
- IMPORTANT: Group related skills into categories. Avoid creating too many single-skill categories.

**AWARDS:**
- "title": Award name or title
- "date": Date received in YYYY-MM format
- "awarder": Organization or entity that gave the award
- "summary": Description of the award or achievement

**CERTIFICATES:**
- "name": Certificate name or title
- "date": Date issued in YYYY-MM format
- "issuer": Issuing organization or authority
- "url": Certificate verification URL if available
- "description": Additional details about the certificate

**PUBLICATIONS:**
- "name": Publication title
- "publisher": Publisher name or journal/conference name
- "releaseDate": Publication date in YYYY-MM format
- "url": Publication URL if available
- "summary": Abstract or brief description

**LANGUAGES:**
- "language": Language name (e.g., "English", "Spanish", "French")
- "fluency": Proficiency level (e.g., "Native", "Fluent", "Conversational", "Basic", "Intermediate", "Advanced")

**INTERESTS:**
- "name": Interest or hobby name
- "keywords": Array of related keywords or sub-interests (optional, can be empty array)

**REFERENCES:**
- "name": Reference person's name
- "reference": Contact information or relationship description

- **CRITICAL TEXT CLEANING FOR ATS COMPATIBILITY** (applies to ALL text fields):
  * DO NOT include bullet point characters in your output: ●, •, -, *, →, ▶, ▸, ▹, ►, ▻, ▼, ▽, ▪, ▫, etc.
  * Replace em dashes (—) and en dashes (–) with regular hyphens (-)
  * Replace smart quotes ("") with regular quotes (")
  * Replace smart apostrophes ('') with regular apostrophes (')
  * Fix common spelling mistakes: "upto" → "up to", "alot" → "a lot", "recieve" → "receive", "seperate" → "separate", etc.
  * Use plain text only - no special Unicode formatting characters
  * Convert multiple consecutive spaces to single spaces
  * Remove leading/trailing whitespace from each line
  * Keep only alphanumeric characters, basic punctuation (.,;:!?()-'"), and whitespace
  * Preserve structure: Use \\n for line breaks, \\n\\n for paragraph breaks, but WITHOUT any bullet characters
  * When you see "●Text..." extract it as "Text..." (remove the bullet character)
  * When in doubt, include MORE content rather than less - it's better to have the full description than a truncated one

- **CRITICAL for work experience - READ CAREFULLY**: The "summary" field must contain the COMPLETE and FULL work description:
  * DO NOT truncate or stop reading at the first paragraph
  * Include ALL paragraphs of the job description/responsibilities - read until you reach the next work entry, education section, or clear section break
  * Include ALL bullet points and achievements - but DO NOT include bullet characters in the output
  * Include ALL "Key achievements", "Achievements", "Highlights", "Responsibilities", or similar sections - even if they appear after the main description
  * Include ALL content that describes what the person did in this role - continue reading past paragraph breaks
  * If you see a heading like "Key achievements:" followed by bullet points, include BOTH the heading AND all achievements, but remove the bullet characters from each achievement line
  * Example format (note: NO bullet characters): "Responsible for training ML models...\\n\\nKey achievements\\nImproved efficiency by 20-25%...\\nCreated algorithm to determine weight...\\nDeveloped MLOps pipeline..."
  * If the work experience spans multiple paragraphs with achievements, include EVERYTHING - do not stop reading
  * The "highlights" array can contain individual achievement items (also cleaned), but the "summary" MUST contain the complete text with all content

- **CRITICAL for volunteer experience**: Apply the same detailed extraction rules as work experience:
  * Extract COMPLETE volunteer descriptions including all responsibilities and impact
  * Include ALL achievements and contributions
  * Treat volunteer work with the same level of detail as paid work experience`;

  const prompt = `Here is the resume text:\n\n${rawText}`;

  try {
    console.log('📡 Calling AI API for text structuring...');

    // Use AI API helper with fallback
    // Increased maxTokens to ensure full work summaries with achievements are captured
    const aiResponse = await callAIWithFallback({
      prompt: `${systemInstruction}\n\n${prompt}`,
      systemPrompt: systemInstruction,
      temperature: 0.2,
      maxTokens: 8192 // Increased to handle long work summaries with multiple achievements
    });

    console.log(`✅ AI API call successful with ${aiResponse.provider}!`);
    console.log(`📥 Response received (length): ${aiResponse.content.length} characters`);
    console.log(`📥 Response preview (first 200 chars):`, aiResponse.content.substring(0, 200));

    // Cleanup logic to remove markdown wrappers
    let responseText = aiResponse.content;
    const jsonMatch = responseText.match(/```json([\s\S]*?)```|```([\s\S]*?)```|([\s\S]*)/);
    if (jsonMatch && (jsonMatch[1] || jsonMatch[2] || jsonMatch[3])) {
      responseText = (jsonMatch[1] || jsonMatch[2] || jsonMatch[3]).trim();
    } else {
      // Fallback: just trim the response
      responseText = responseText.trim();
    }

    // Additional cleanup: remove leading/trailing whitespace and any remaining markdown artifacts
    responseText = responseText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .replace(/^[\s]*\{/m, '{')
      .replace(/\}[\s]*$/m, '}')
      .replace(/,\s*([}\]])/g, '$1')
      .trim();

    // Parse the cleaned JSON
    let parsedJson: any;
    try {
      parsedJson = JSON.parse(responseText);
      console.log(`✅ JSON parsed successfully`);
    } catch (parseError) {
      console.error(`❌ Failed to parse AI response as JSON`);
      console.error('❌ Cleaned response (first 500 chars):', responseText.substring(0, 500));
      if (parseError instanceof SyntaxError) {
        throw new Error(`AI model returned invalid JSON: ${parseError.message}`);
      }
      throw new Error(`Failed to parse AI response: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
    }

    console.log(`\n═══════════════════════════════════════════════════════`);
    console.log(`✅ AI structuring successful with ${aiResponse.provider}!`);
    console.log(`═══════════════════════════════════════════════════════\n`);
    return parsedJson;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ AI API call failed:`, errorMessage);
    console.error(`❌ Error details:`, error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack?.substring(0, 300)
    } : error);

    // Sanitize error message before throwing
    const sanitizedMessage = sanitizeErrorMessage(errorMessage, 'AI processing failed. Please try again.');
    throw new Error(sanitizedMessage);
  }
}

// ============================================================================
// MAIN ORCHESTRATOR
// ============================================================================

/**
 * Robustly parses any document by running the full pipeline.
 */
export async function robustDocumentParser(
  fileBuffer: Buffer,
  mimeType: string
): Promise<{ cvData?: UnifiedCVDataStructure; error?: string; details?: any }> {
  try {
    // STAGE 1: Get Text
    // This runs your "doc-parse", "pdf-parse", and "OCR" logic
    console.log('═══════════════════════════════════════════════════════');
    console.log('🚀 STAGE 1: Text Extraction');
    console.log('═══════════════════════════════════════════════════════');
    const rawText = await extractTextFromFile(fileBuffer, mimeType);

    // STAGE 2: Get JSON from AI
    // This runs your "Method 3: AI"
    console.log('═══════════════════════════════════════════════════════');
    console.log('🚀 STAGE 2: AI Structuring');
    console.log('═══════════════════════════════════════════════════════');
    const aiJsonOutput = await structureTextWithAI(rawText);

    // STAGE 3: Validate and Sanitize
    // This ensures the AI's output is safe and matches your *full* schema
    console.log('═══════════════════════════════════════════════════════');
    console.log('🚀 STAGE 3: Validation');
    console.log('═══════════════════════════════════════════════════════');

    // Pre-process: Convert all undefined values to null and sanitize URLs
    // Also ensure optional fields (courses, highlights in projects) are handled correctly
    const normalizeUndefinedToNull = (obj: any, parentKey?: string): any => {
      if (obj === null || obj === undefined) {
        return null;
      }
      if (Array.isArray(obj)) {
        return obj.map((item, index) => normalizeUndefinedToNull(item, `${parentKey}[${index}]`));
      }
      if (typeof obj === 'object') {
        const normalized: any = {};
        for (const key in obj) {
          if (obj.hasOwnProperty(key)) {
            let value = obj[key];

            // Convert undefined to null
            if (value === undefined) {
              value = null;
            }
            // Handle optional array fields - ensure they're arrays if present
            else if ((key === 'courses' || key === 'highlights') && value !== null && value !== undefined) {
              // If it's a string, try to parse it or convert to array
              if (typeof value === 'string') {
                value = value.trim() ? [value] : [];
              } else if (!Array.isArray(value)) {
                value = [];
              }
              // Clean each item in highlights array for ATS compatibility
              if (key === 'highlights' && Array.isArray(value)) {
                value = value.map((item: any) => {
                  if (typeof item === 'string') {
                    return cleanTextForATS(item);
                  }
                  return item;
                });
              }
              value = normalizeUndefinedToNull(value, `${parentKey}.${key}`);
            }
            // Sanitize URL fields: convert invalid/empty URLs to empty string
            else if (key === 'url' && typeof value === 'string') {
              const trimmed = value.trim();
              if (trimmed === '' || trimmed === 'null' || trimmed === 'undefined' || trimmed.toLowerCase() === 'n/a') {
                value = '';
              } else {
                // Try to validate URL - must have protocol (http:// or https://)
                try {
                  // Only validate if it has a protocol
                  if (trimmed.match(/^https?:\/\//i)) {
                    new URL(trimmed);
                    value = trimmed; // Valid URL with protocol
                  } else {
                    // No protocol - convert to empty string (Zod expects valid URL or empty string)
                    value = '';
                  }
                } catch {
                  // Invalid URL, convert to empty string
                  value = '';
                }
              }
            }
            // Clean text fields for ATS compatibility (especially work summaries)
            else if ((key === 'summary' || key === 'description') && typeof value === 'string' && value.trim()) {
              value = cleanTextForATS(value);
            }
            // Recursively normalize nested objects
            else {
              value = normalizeUndefinedToNull(value, `${parentKey ? parentKey + '.' : ''}${key}`);
            }

            normalized[key] = value;
          }
        }
        return normalized;
      }
      return obj;
    };

    const normalizedJson = normalizeUndefinedToNull(aiJsonOutput);
    console.log('📝 Normalized undefined values to null and sanitized URLs');
    console.log('📝 Normalized JSON structure:', JSON.stringify(normalizedJson, null, 2).substring(0, 1000));

    // Pre-validate: Ensure all required fields exist before Zod validation
    const ensureRequiredFields = (data: any): any => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      const sanitizeUrlField = (val: any): string | null => {
        if (!val) return null;
        const str = String(val).trim();
        if (str === '') return '';
        try {
          let testStr = str;
          if (!/^https?:\/\//i.test(str)) {
            testStr = 'https://' + str;
          }
          new URL(testStr);
          return testStr;
        } catch {
          return null;
        }
      };

      // Ensure basics exists and its email/urls are sanitized
      if (!data.basics) {
        data.basics = {
          name: null,
          label: null,
          email: null,
          phone: null,
          url: null,
          summary: null,
          image: null,
          location: {
            address: null,
            postalCode: null,
            city: null,
            countryCode: null,
            region: null
          },
          profiles: []
        };
      } else {
        data.basics.name = data.basics.name ?? null;
        data.basics.label = data.basics.label ?? null;
        data.basics.phone = data.basics.phone ?? null;
        data.basics.summary = data.basics.summary ?? null;
        data.basics.image = data.basics.image ?? null;
        data.basics.url = sanitizeUrlField(data.basics.url);
        
        if (data.basics.location) {
          data.basics.location = {
            address: data.basics.location.address ?? null,
            postalCode: data.basics.location.postalCode ?? null,
            city: data.basics.location.city ?? null,
            countryCode: data.basics.location.countryCode ?? null,
            region: data.basics.location.region ?? null
          };
        } else {
          data.basics.location = null;
        }

        if (data.basics.email) {
          let emailStr = String(data.basics.email).trim();
          if (!emailRegex.test(emailStr)) {
            // Repair common OCR issues
            if (/@gmaitcom$/i.test(emailStr)) {
              emailStr = emailStr.replace(/@gmaitcom$/i, '@gmail.com');
            } else if (/@gmailcom$/i.test(emailStr)) {
              emailStr = emailStr.replace(/@gmailcom$/i, '@gmail.com');
            }
            
            // Try standard repair for missing dot before TLD
            if (!emailRegex.test(emailStr)) {
              const lastAt = emailStr.lastIndexOf('@');
              if (lastAt !== -1) {
                const domain = emailStr.substring(lastAt + 1);
                if (!domain.includes('.')) {
                  const tldMatch = domain.match(/(.+)(com|net|org|edu|gov|in|io|co|uk)$/i);
                  if (tldMatch) {
                    emailStr = emailStr.substring(0, lastAt + 1) + tldMatch[1] + '.' + tldMatch[2];
                  }
                }
              }
            }
          }
          
          if (!emailRegex.test(emailStr)) {
            console.warn(`⚠️ CV Parse API - Sanitizing invalid email: ${data.basics.email} -> null`);
            data.basics.email = null;
          } else {
            data.basics.email = emailStr;
          }
        } else {
          data.basics.email = null;
        }

        if (Array.isArray(data.basics.profiles)) {
          data.basics.profiles = data.basics.profiles.map((p: any) => ({
            network: p.network ?? null,
            username: p.username ?? null,
            url: sanitizeUrlField(p.url)
          }));
        } else {
          data.basics.profiles = [];
        }
      }

      // Ensure arrays exist
      if (!data.work) data.work = [];
      if (!data.education) data.education = [];
      if (!data.skills) data.skills = [];
      if (!data.projects) data.projects = [];
      if (!data.volunteer) data.volunteer = [];
      if (!data.awards) data.awards = [];
      if (!data.certificates) data.certificates = [];
      if (!data.publications) data.publications = [];
      if (!data.languages) data.languages = [];
      if (!data.interests) data.interests = [];
      if (!data.references) data.references = [];

      // Ensure education items have all required fields
      if (Array.isArray(data.education)) {
        data.education = data.education.map((edu: any) => ({
          institution: edu.institution ?? null,
          url: sanitizeUrlField(edu.url),
          area: edu.area ?? null,
          studyType: edu.studyType ?? null,
          startDate: edu.startDate ?? null,
          endDate: edu.endDate ?? null,
          score: edu.score ?? null,
          courses: edu.courses ?? [],
          description: edu.description ?? null
        }));
      }

      // Ensure project items have all required fields
      if (Array.isArray(data.projects)) {
        data.projects = data.projects.map((proj: any) => ({
          name: proj.name ?? null,
          startDate: proj.startDate ?? null,
          endDate: proj.endDate ?? null,
          description: proj.description ?? null,
          highlights: proj.highlights ?? [],
          keywords: proj.keywords ?? [],
          url: sanitizeUrlField(proj.url)
        }));
      }

      // Ensure work items have all required fields
      if (Array.isArray(data.work)) {
        data.work = data.work.map((w: any) => ({
          name: w.name ?? null,
          position: w.position ?? null,
          url: sanitizeUrlField(w.url),
          startDate: w.startDate ?? null,
          endDate: w.endDate ?? null,
          summary: w.summary ?? null,
          highlights: w.highlights ?? []
        }));
      }

      // Ensure volunteer items have all required fields
      if (Array.isArray(data.volunteer)) {
        data.volunteer = data.volunteer.map((v: any) => ({
          organization: v.organization ?? null,
          position: v.position ?? null,
          url: sanitizeUrlField(v.url),
          startDate: v.startDate ?? null,
          endDate: v.endDate ?? null,
          summary: v.summary ?? null,
          highlights: v.highlights ?? []
        }));
      }

      // Ensure skills items have all required fields
      if (Array.isArray(data.skills)) {
        data.skills = data.skills.map((s: any) => ({
          category: s.category ?? null,
          skills: Array.isArray(s.skills) ? s.skills : []
        }));
      }

      // Ensure awards items have all required fields
      if (Array.isArray(data.awards)) {
        data.awards = data.awards.map((a: any) => ({
          title: a.title ?? null,
          date: a.date ?? null,
          awarder: a.awarder ?? null,
          summary: a.summary ?? null
        }));
      }

      // Ensure certificates items have all required fields
      if (Array.isArray(data.certificates)) {
        data.certificates = data.certificates.map((c: any) => ({
          name: c.name ?? null,
          date: c.date ?? null,
          issuer: c.issuer ?? null,
          url: sanitizeUrlField(c.url),
          description: c.description ?? null
        }));
      }

      // Ensure publications items have all required fields
      if (Array.isArray(data.publications)) {
        data.publications = data.publications.map((p: any) => ({
          name: p.name ?? null,
          publisher: p.publisher ?? null,
          releaseDate: p.releaseDate ?? null,
          url: sanitizeUrlField(p.url),
          summary: p.summary ?? null
        }));
      }

      // Ensure languages items have all required fields
      if (Array.isArray(data.languages)) {
        data.languages = data.languages.map((l: any) => ({
          language: l.language ?? null,
          fluency: l.fluency ?? null
        }));
      }

      // Ensure interests items have all required fields
      if (Array.isArray(data.interests)) {
        data.interests = data.interests.map((i: any) => ({
          name: i.name ?? null,
          keywords: Array.isArray(i.keywords) ? i.keywords : []
        }));
      }

      // Ensure references items have all required fields
      if (Array.isArray(data.references)) {
        data.references = data.references.map((r: any) => ({
          name: r.name ?? null,
          reference: r.reference ?? null
        }));
      }

      return data;
    };

    const preValidatedJson = ensureRequiredFields(normalizedJson);
    console.log('📝 Pre-validated JSON structure');

    let validatedData;
    try {
      validatedData = cvDataSchema.parse(preValidatedJson);
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        console.error('❌ Zod validation failed with errors:');
        validationError.issues.forEach((issue, index) => {
          console.error(`  ${index + 1}. Path: ${issue.path.join('.')}, Message: ${issue.message}, Code: ${issue.code}`);
        });
        console.error('❌ Full normalized JSON (first 2000 chars):', JSON.stringify(preValidatedJson, null, 2).substring(0, 2000));
      }
      throw validationError;
    }

    // Helper function to convert null to empty string
    const nullToEmpty = (value: string | null | undefined): string => value ?? '';

    // Convert nullable fields to empty strings to match UnifiedCVDataStructure
    const sanitizedBasics = validatedData.basics ? {
      name: nullToEmpty(validatedData.basics.name),
      label: nullToEmpty(validatedData.basics.label),
      email: nullToEmpty(validatedData.basics.email),
      phone: nullToEmpty(validatedData.basics.phone),
      url: nullToEmpty(validatedData.basics.url),
      summary: nullToEmpty(validatedData.basics.summary),
      image: nullToEmpty(validatedData.basics.image),
      location: validatedData.basics.location ? {
        address: nullToEmpty(validatedData.basics.location.address),
        postalCode: nullToEmpty(validatedData.basics.location.postalCode),
        city: nullToEmpty(validatedData.basics.location.city),
        countryCode: nullToEmpty(validatedData.basics.location.countryCode),
        region: nullToEmpty(validatedData.basics.location.region),
      } : DEFAULT_UNIFIED_CV_DATA.basics.location,
      profiles: validatedData.basics.profiles.map(p => ({
        network: nullToEmpty(p.network),
        username: nullToEmpty(p.username),
        url: nullToEmpty(p.url),
      })),
    } : DEFAULT_UNIFIED_CV_DATA.basics;

    // Merge with default structure to ensure all fields are present
    const finalData: UnifiedCVDataStructure = {
      ...DEFAULT_UNIFIED_CV_DATA,
      basics: sanitizedBasics,
      work: validatedData.work.map(w => ({
        name: nullToEmpty(w.name),
        position: nullToEmpty(w.position),
        url: nullToEmpty(w.url),
        startDate: nullToEmpty(w.startDate),
        endDate: nullToEmpty(w.endDate),
        summary: nullToEmpty(w.summary),
        highlights: w.highlights || [],
      })),
      education: validatedData.education.map(e => ({
        institution: nullToEmpty(e.institution),
        url: nullToEmpty(e.url),
        area: nullToEmpty(e.area),
        studyType: nullToEmpty(e.studyType),
        startDate: nullToEmpty(e.startDate),
        endDate: nullToEmpty(e.endDate),
        score: nullToEmpty(e.score),
        courses: e.courses || [],  // Optional field, default to empty array
        description: e.description ?? '',
      })),
      skills: validatedData.skills.map(s => ({
        category: nullToEmpty(s.category),
        skills: s.skills || [],
      })),
      projects: validatedData.projects.map(p => ({
        name: nullToEmpty(p.name),
        startDate: nullToEmpty(p.startDate),
        endDate: nullToEmpty(p.endDate),
        description: nullToEmpty(p.description),
        highlights: p.highlights || [],  // Optional field, default to empty array
        keywords: p.keywords || [],
        url: nullToEmpty(p.url),
      })),
      volunteer: (validatedData.volunteer || []).map(v => ({
        organization: nullToEmpty(v.organization || v.name || ''),
        position: nullToEmpty(v.position || ''),
        url: nullToEmpty(v.url || ''),
        startDate: nullToEmpty(v.startDate || ''),
        endDate: nullToEmpty(v.endDate || ''),
        summary: nullToEmpty(v.summary || v.description || ''),
        highlights: Array.isArray(v.highlights) ? v.highlights : [],
      })),
      awards: validatedData.awards.map(a => ({
        title: nullToEmpty(a.title),
        date: nullToEmpty(a.date),
        awarder: nullToEmpty(a.awarder),
        summary: nullToEmpty(a.summary),
      })),
      certificates: validatedData.certificates.map(c => ({
        name: nullToEmpty(c.name),
        date: nullToEmpty(c.date),
        issuer: nullToEmpty(c.issuer),
        url: nullToEmpty(c.url),
        description: nullToEmpty(c.description),
      })),
      publications: validatedData.publications.map(p => ({
        name: nullToEmpty(p.name),
        publisher: nullToEmpty(p.publisher),
        releaseDate: nullToEmpty(p.releaseDate),
        url: nullToEmpty(p.url),
        summary: nullToEmpty(p.summary),
      })),
      languages: validatedData.languages.map(l => ({
        language: nullToEmpty(l.language),
        fluency: nullToEmpty(l.fluency),
      })),
      interests: validatedData.interests.map(i => ({
        name: nullToEmpty(i.name),
        keywords: i.keywords || [],
      })),
      references: validatedData.references.map(r => ({
        name: nullToEmpty(r.name),
        reference: nullToEmpty(r.reference),
      })),
    };

    console.log('✅ Parsing successful!');
    console.log('📊 Parsed - Personal info:', !!finalData.basics.name || !!finalData.basics.email);
    console.log('📊 Parsed - Work entries:', finalData.work.length);
    console.log('📊 Parsed - Education entries:', finalData.education.length);
    console.log('📊 Parsed - Projects entries:', finalData.projects.length);

    return { cvData: finalData };

  } catch (error) {
    console.error('Full parsing pipeline failed:', error instanceof Error ? error.message : String(error));
    if (error instanceof z.ZodError) {
      // The AI's JSON was malformed
      console.error('Zod validation errors:', error.issues);
      return {
        error: 'AI parser returned invalid data.',
        details: error.issues
      };
    }
    // This catches errors from Stage 1 (extraction) or Stage 2 (AI API)
    return {
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// ============================================================================
// API ROUTE HANDLERS
// ============================================================================

// Add GET method for testing
export async function GET() {
  console.log('CV Parse API test endpoint called');

  const testData = { ...DEFAULT_UNIFIED_CV_DATA };
  testData.basics.name = 'Test User';
  testData.basics.email = 'test@example.com';
  testData.basics.summary = 'This is a test CV structure to verify the API is working.';

  return NextResponse.json({
    ...testData,
    _test: true,
    _message: 'CV Parse API is working correctly',
    _timestamp: new Date().toISOString()
  });
}

export async function POST(request: NextRequest) {
  try {
    console.log('CV Parse API called');

    const authResult = await getAuthenticatedUser(request);
    const userId = authResult?.userId;

    // Rate Limiting (using AI config since parsing is heavy)
    // If no userId, use IP-based rate limiting (handled by passing undefined to checkLimit)
    const rateLimitResult = await rateLimiter.checkLimit(
      userId || 'unauthenticated',
      rateLimitConfigs.ai
    );
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: `Too many parse requests. Please wait ${Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)} seconds.` },
        { status: 429 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      console.error('No file provided in request');
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    console.log('File received:', file.name, 'Type:', file.type, 'Size:', file.size);

    // Check file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword', // Added .doc support
      'image/jpeg',
      'image/png',
      'image/jpg',
      'text/plain' // Allow text files for testing
    ];

    if (!allowedTypes.includes(file.type)) {
      console.error('Unsupported file type:', file.type);
      return NextResponse.json(
        { error: `Unsupported file type: ${file.type}. Please upload PDF, DOCX, or Image files.` },
        { status: 400 }
      );
    }

    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      console.error('File too large:', file.size);
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB' },
        { status: 400 }
      );
    }

    console.log('Starting document parsing...');
    const startTime = Date.now();

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Run the robust parser
    const parseResult = await robustDocumentParser(buffer, file.type);

    const parseTime = Date.now() - startTime;

    // Handle parsing errors
    if (parseResult.error) {
      console.error('Parsing failed:', parseResult.error);
      return NextResponse.json(
        {
          error: parseResult.error,
          details: parseResult.details,
          _parseTime: parseTime
        },
        { status: 500 }
      );
    }

    // Validate parsing results
    const hasPersonalInfo = !!(parseResult.cvData?.basics?.name || parseResult.cvData?.basics?.email);
    const hasWorkExperience = (parseResult.cvData?.work?.length || 0) > 0;
    const hasEducation = (parseResult.cvData?.education?.length || 0) > 0;
    const hasSkills = (parseResult.cvData?.skills?.length || 0) > 0;

    console.log('=== PARSING VALIDATION ===');
    console.log('Has personal info:', hasPersonalInfo);
    console.log('Has work experience:', hasWorkExperience);
    console.log('Has education:', hasEducation);
    console.log('Has skills:', hasSkills);

    // Ensure we always return a valid structure
    const responseData = {
      ...parseResult.cvData!,
      _parsed: true, // Flag to indicate this was parsed
      _timestamp: new Date().toISOString(),
      _parseTime: parseTime,
      _fileInfo: {
        name: file.name,
        type: file.type,
        size: file.size
      },
      _validation: {
        hasPersonalInfo,
        hasWorkExperience,
        hasEducation,
        hasSkills
      }
    };

    console.log('Returning parsed data to client');
    return NextResponse.json(responseData);
  } catch (error) {
    console.error('═══════════════════════════════════════════════════════');
    console.error('❌ CV parsing API error (top-level catch)');
    console.error('═══════════════════════════════════════════════════════');
    console.error('Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');

    // Return proper error response - sanitize for user display
    const rawErrorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const errorMessage = sanitizeErrorMessage(rawErrorMessage, 'Failed to parse CV. Please try again.');

    return NextResponse.json(
      {
        error: errorMessage,
        _errorType: error instanceof Error ? error.constructor.name : typeof error,
        _errorStack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
