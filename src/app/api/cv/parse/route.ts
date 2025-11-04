// ============================================================================
// STATIC IMPORTS - Must be at top level for bundler to include them
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { GoogleGenAI } from '@google/genai';
import { UnifiedCVDataStructure, DEFAULT_UNIFIED_CV_DATA } from '@/types/unified-cv-schema';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// Static imports for libraries that work without issues
import mammoth from 'mammoth';
import Tesseract from 'tesseract.js';

// Create worker function from tesseract
const createWorker = Tesseract.createWorker;

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
  courses: z.array(z.string()).default([]),
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
  highlights: z.array(z.string()).default([]),
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

  // 1. Handle DOCX files
  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    console.log('Attempting Method: doc-parse (mammoth)...');
    if (!mammoth) {
      throw new Error('mammoth library not available for DOCX parsing');
    }
    const result = await mammoth.extractRawText({ buffer: fileBuffer });
    rawText = result.value || '';
  }
  // 2. Handle PDF files
  else if (mimeType === 'application/pdf') {
    let pdfParseSucceeded = false;
    
    // Attempt 1: Fast Text Parse (Method 1: pdf-parse)
    // Load pdf-parse dynamically to avoid bundling test files
    try {
      console.log('Attempting Method 1: pdf-parse (loading dynamically)...');
      const pdfParse = (await import('pdf-parse')).default;
      
      try {
        const data = await pdfParse(fileBuffer);
        if (data && data.text && data.text.trim().length > 100) {
          rawText = data.text;
          pdfParseSucceeded = true;
          console.log('✅ Method 1 (pdf-parse) succeeded:', rawText.length, 'characters');
        } else {
          console.log(`⚠️ pdf-parse returned insufficient text (${data?.text?.trim().length || 0} chars), will try OCR fallback.`);
        }
      } catch (e1) {
        console.log(`⚠️ Method 1 (pdf-parse) failed: ${e1 instanceof Error ? e1.message : String(e1)}. Will try OCR fallback.`);
      }
    } catch (loadError) {
      console.log('⚠️ pdf-parse library not available:', loadError instanceof Error ? loadError.message : String(loadError));
      console.log('⚠️ Skipping to OCR method.');
    }
    
    // Attempt 2: OCR Fallback (Method 2: tesseract + pdf2pic) - only if pdf-parse didn't work
    if (!pdfParseSucceeded && rawText.length < 100) {
      try {
        console.log('Attempting Method 2: OCR (tesseract + pdf2pic)...');
        
        if (!createWorker) {
          throw new Error('tesseract.js not available');
        }
        
        // Load pdf2pic dynamically to avoid bundling test files
        console.log('Loading pdf2pic dynamically...');
        const pdf2pic = await import('pdf2pic');
        const pdf2picFromPath = pdf2pic.fromPath;
        
        if (!pdf2picFromPath) {
          throw new Error('pdf2pic library not available for PDF to image conversion (requires ImageMagick/Ghostscript)');
        }
        
        // pdf2pic requires a file path, so we need to write the buffer to a temp file first
        const fs = require('fs');
        const path = require('path');
        const os = require('os');
        
        let tempFilePath: string | null = null;
        
        try {
          // CRITICAL: Use /tmp explicitly for serverless environments (Vercel, AWS Lambda, etc.)
          // This is the ONLY writable directory on serverless platforms
          const tempDir = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME ? '/tmp' : os.tmpdir();
          
          // Ensure /tmp directory exists (it should, but we'll check anyway)
          if (!fs.existsSync(tempDir)) {
            try {
              fs.mkdirSync(tempDir, { recursive: true });
            } catch (mkdirError) {
              console.warn(`⚠️ Could not create temp directory ${tempDir}, using fallback:`, mkdirError instanceof Error ? mkdirError.message : String(mkdirError));
              // Fallback to os.tmpdir() if /tmp doesn't work
              const fallbackDir = os.tmpdir();
              if (!fs.existsSync(fallbackDir)) {
                fs.mkdirSync(fallbackDir, { recursive: true });
              }
            }
          }
          
          tempFilePath = path.join(tempDir, `cv-parse-ocr-${Date.now()}-${Math.random().toString(36).substring(7)}.pdf`);
          
          fs.writeFileSync(tempFilePath, fileBuffer, { flag: 'w' });
          console.log(`📝 Wrote PDF buffer to temp file for OCR: ${tempFilePath}`);
          
          // Verify file was written
          if (!fs.existsSync(tempFilePath)) {
            throw new Error('Failed to write temporary PDF file');
          }
          
          const fileStats = fs.statSync(tempFilePath);
          if (fileStats.size === 0) {
            throw new Error('Temporary PDF file is empty');
          }
          
          // Ensure tempFilePath is not null before using it
          if (!tempFilePath) {
            throw new Error('Temporary file path is null');
          }
          
          // Use pdf2pic with explicit /tmp directory for serverless compatibility
          // This ensures pdf2pic writes to the only writable directory on Vercel/serverless
          const convert = pdf2picFromPath(tempFilePath, {
            density: 100,
            saveFilename: 'cv_page', // Prefix for temp image files
            savePath: tempDir,       // Explicitly use /tmp for serverless
            format: 'png',
            width: 2000,
            height: 3000
          });
          
          console.log('🔄 Converting PDF pages to images...');
          
          // Convert pages (limit to first 3 pages for CVs)
          const results = await convert.bulk(3, { responseType: 'base64' });
          console.log(`✅ Converted ${results?.length || 0} pages to images`);
          
          // Track generated image file paths for cleanup
          const generatedImagePaths: string[] = [];
          
          if (results && results.length > 0 && results[0] && results[0].base64) {
            const worker = await createWorker('eng');
            // tesseract.js worker methods (TypeScript types may be incomplete)
            const workerAny = worker as any;
            if (workerAny.loadLanguage) await workerAny.loadLanguage('eng');
            if (workerAny.initialize) await workerAny.initialize('eng');
            
            // Process each page
            for (let pageIdx = 0; pageIdx < results.length; pageIdx++) {
              try {
                const result = results[pageIdx] as any;
                if (!result || !result.base64) {
                  console.warn(`⚠️ Page ${pageIdx + 1} has no image data, skipping`);
                  continue;
                }
                
                // Store image path for cleanup if available
                if (result.path) {
                  generatedImagePaths.push(result.path as string);
                }
                
                console.log(`🔄 Processing page ${pageIdx + 1} via OCR...`);
                const { data: { text } } = await worker.recognize(`data:image/png;base64,${result.base64}`);
                if (text && text.trim().length > 0) {
                  rawText += text + '\n';
                  console.log(`✅ Page ${pageIdx + 1} OCR: extracted ${text.trim().length} characters`);
                } else {
                  console.warn(`⚠️ Page ${pageIdx + 1} OCR: no text extracted`);
                }
              } catch (pageOcrError) {
                console.warn(`⚠️ OCR failed for page ${pageIdx + 1}:`, pageOcrError instanceof Error ? pageOcrError.message : String(pageOcrError));
              }
            }
            
            await worker.terminate();
            console.log('📊 PDF OCR parsing - total text length:', rawText.length);
          } else {
            throw new Error('pdf2pic conversion returned no valid results');
          }
          
          // Clean up generated image files from /tmp
          for (const imagePath of generatedImagePaths) {
            try {
              if (fs.existsSync && fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
                console.log(`🗑️ Cleaned up temp image: ${imagePath}`);
              }
            } catch (imageCleanupError) {
              console.warn(`⚠️ Failed to delete temp image ${imagePath}:`, imageCleanupError instanceof Error ? imageCleanupError.message : String(imageCleanupError));
            }
          }
        } catch (pdf2picErr) {
          const errorMsg = pdf2picErr instanceof Error ? pdf2picErr.message : String(pdf2picErr);
          console.error('❌ pdf2pic error:', errorMsg);
          // Don't throw here - preserve any text we might have gotten from pdf-parse
          // rawText might already contain partial text from pdf-parse, so don't reset it
        } finally {
          // Clean up temp PDF file
          if (tempFilePath) {
            try {
              if (fs.existsSync && fs.existsSync(tempFilePath)) {
                fs.unlinkSync(tempFilePath);
                console.log(`🗑️ Cleaned up temp PDF file: ${tempFilePath}`);
              }
            } catch (cleanupError) {
              console.warn('⚠️ Failed to delete temp PDF file:', cleanupError instanceof Error ? cleanupError.message : String(cleanupError));
            }
          }
        }
      } catch (e2) {
        console.error(`Method 2 (OCR) also failed: ${e2 instanceof Error ? e2.message : String(e2)}`);
        // Don't throw here - let it fall through to final validation
      }
    }
    
    // If both methods failed, throw error
    if (!rawText || rawText.trim().length < 50) {
      throw new Error('All PDF text extraction methods failed. Please ensure pdf-parse or pdf2pic/tesseract.js are properly installed.');
    }
  }
  // 3. Handle image files (direct OCR)
  else if (mimeType.startsWith('image/')) {
    console.log('Attempting OCR on image file...');
    if (!createWorker) {
      throw new Error('tesseract.js not available for image OCR');
    }
    const worker = await createWorker('eng');
    // tesseract.js worker methods (TypeScript types may be incomplete)
    const workerAny = worker as any;
    if (workerAny.loadLanguage) await workerAny.loadLanguage('eng');
    if (workerAny.initialize) await workerAny.initialize('eng');
    const { data: { text } } = await worker.recognize(fileBuffer);
    await worker.terminate();
    rawText = text || '';
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
  // Get all 4 Gemini API keys from environment
  const apiKeys = [
    { name: 'GEMINI_API_KEY', key: process.env.GEMINI_API_KEY },
    { name: 'GEMINI2_API_KEY', key: process.env.GEMINI2_API_KEY },
    { name: 'GEMINI3_API_KEY', key: process.env.GEMINI3_API_KEY },
    { name: 'GEMINI4_API-KEY', key: process.env['GEMINI4_API-KEY'] }, // Note: has dash in name
  ].filter(k => k.key); // Filter out undefined/null keys

  if (apiKeys.length === 0) {
    throw new Error('No Gemini API keys configured. AI parsing is unavailable.');
  }

  console.log(`🔑 Found ${apiKeys.length} Gemini API keys to try:`, apiKeys.map(k => k.name).join(', '));
  
  // Create a simplified schema for the AI prompt to save tokens
  const simpleSchema = `{
    "basics": { "name": "...", "email": "...", "phone": "...", "summary": "...", "location": { "city": "...", "countryCode": "..." }, "profiles": [{ "network": "LinkedIn", "url": "..." }] },
    "work": [{ "name": "Company", "position": "...", "startDate": "...", "endDate": "...", "summary": "...", "highlights": ["..."] }],
    "education": [{ "institution": "...", "studyType": "...", "area": "...", "endDate": "..." }],
    "skills": [{ "category": "...", "skills": ["...", "..."] }],
    "projects": [{ "name": "...", "description": "...", "highlights": ["..."], "keywords": ["..."], "url": "..." }],
    "volunteer": [{ "organization": "...", "position": "..." }],
    "awards": [{ "title": "...", "date": "..." }],
    "certificates": [{ "name": "...", "issuer": "..." }],
    "publications": [{ "name": "...", "publisher": "..." }],
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
- If a value is not found, use \`null\` or an empty array \`[]\`.
- Date formatting: Use YYYY-MM format (e.g., "2023-05"). If only a year is known, use "YYYY". If date is "Present" or "Current", leave endDate as empty string ("").
- Do NOT output textual words like "Present" in date fields.
- Clean all text: Remove dates, extra whitespace, and formatting artifacts from titles.
- Skills should be categorized appropriately (e.g., "Technical Skills", "Programming Languages", "Soft Skills").
- Extract URLs and links properly (GitHub, LinkedIn, personal websites).`;

  const prompt = `Here is the resume text:\n\n${rawText}`;

  // Try each API key in sequence
  let lastError: Error | null = null;
  
  for (let i = 0; i < apiKeys.length; i++) {
    const { name, key } = apiKeys[i];
    const keyPreview = key ? `${key.substring(0, 10)}...` : 'undefined';
    
    console.log(`\n═══════════════════════════════════════════════════════`);
    console.log(`🔑 Attempt ${i + 1}/${apiKeys.length}: Trying ${name}`);
    console.log(`   Key preview: ${keyPreview}`);
    console.log(`═══════════════════════════════════════════════════════`);

    try {
      console.log('📡 Initializing Google GenAI SDK...');
      
      // Initialize Google GenAI SDK with current key
      const ai = new GoogleGenAI({
        apiKey: key!,
      });

      // Configure the model
      const config = {
        temperature: 0.2,
        maxOutputTokens: 4096,
      };

      const model = 'gemini-1.0-pro';
      
      console.log(`📝 Model: ${model}`);
      console.log(`📝 Config: temperature=${config.temperature}, maxOutputTokens=${config.maxOutputTokens}`);
      
      const contents = [
        {
          role: 'user' as const,
          parts: [
            {
              text: `${systemInstruction}\n\n${prompt}`,
            },
          ],
        },
      ];

      console.log(`📡 Calling Gemini API (${name}) for text structuring...`);
      
      // Generate content using the SDK
      const response = await ai.models.generateContent({
        model,
        config,
        contents,
      });

      console.log(`✅ API call successful with ${name}!`);
      console.log(`📥 Response structure keys:`, Object.keys(response || {}));

      // Extract text from response
      let responseText = '';
      
      // Handle different response structures from the SDK
      if (response.text) {
        // Direct text property
        responseText = response.text;
        console.log(`✅ Found response.text property`);
      } else if (response.candidates && response.candidates[0]?.content?.parts) {
        // Extract text from parts array
        console.log(`✅ Found response.candidates[0].content.parts array`);
        for (const part of response.candidates[0].content.parts) {
          if (part.text) {
            responseText += part.text;
          }
        }
      } else if (response.candidates?.[0]?.content?.parts) {
        // Alternative structure
        console.log(`✅ Found alternative response.candidates structure`);
        const textParts = response.candidates[0].content.parts.filter((p: any) => p.text);
        responseText = textParts.map((p: any) => p.text).join('');
      } else {
        // Try to extract from any available structure
        console.warn('⚠️ Unexpected response structure. Available keys:', Object.keys(response || {}));
        console.warn('⚠️ Response preview:', JSON.stringify(response).substring(0, 500));
        throw new Error('Unexpected response structure from Gemini API');
      }
      
      if (!responseText || responseText.trim().length === 0) {
        console.error('❌ Empty response from Gemini API');
        console.error('❌ Full response:', JSON.stringify(response).substring(0, 500));
        throw new Error('Gemini API returned empty response');
      }

      console.log(`\n🎉 SUCCESS! Working API Key: ${name}`);
      console.log(`📥 Gemini API response received (length): ${responseText.length} characters`);
      console.log(`📥 Response preview (first 200 chars):`, responseText.substring(0, 200));
      
      // Cleanup logic to remove markdown wrappers
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
        console.log(`✅ JSON parsed successfully from ${name}`);
      } catch (parseError) {
        console.error(`❌ Failed to parse AI response as JSON (from ${name})`);
        console.error('❌ Cleaned response (first 500 chars):', responseText.substring(0, 500));
        if (parseError instanceof SyntaxError) {
          throw new Error(`AI model returned invalid JSON: ${parseError.message}`);
        }
        throw new Error(`Failed to parse AI response: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
      }
      
      console.log(`\n═══════════════════════════════════════════════════════`);
      console.log(`✅ AI structuring successful with ${name}!`);
      console.log(`═══════════════════════════════════════════════════════\n`);
      return parsedJson;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ ${name} failed:`, errorMessage);
      console.error(`❌ Error details:`, error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack?.substring(0, 300)
      } : error);
      
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // If this is the last key, throw the error
      if (i === apiKeys.length - 1) {
        console.error(`\n═══════════════════════════════════════════════════════`);
        console.error(`❌ All ${apiKeys.length} API keys failed!`);
        console.error(`═══════════════════════════════════════════════════════`);
        throw new Error(`All Gemini API keys failed. Last error (${name}): ${errorMessage}`);
      }
      
      // Otherwise, continue to next key
      console.log(`⏭️  Continuing to next API key...\n`);
    }
  }
  
  // This should never be reached, but TypeScript requires it
  throw lastError || new Error('Failed to process with any API key');
}

// ============================================================================
// MAIN ORCHESTRATOR
// ============================================================================

/**
 * Robustly parses any document by running the full pipeline.
 */
async function robustDocumentParser(
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
    const validatedData = cvDataSchema.parse(aiJsonOutput);
    
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
        courses: e.courses || [],
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
        highlights: p.highlights || [],
        keywords: p.keywords || [],
        url: nullToEmpty(p.url),
      })),
      volunteer: validatedData.volunteer.map(v => ({
        organization: nullToEmpty(v.organization),
        position: nullToEmpty(v.position),
        url: nullToEmpty(v.url),
        startDate: nullToEmpty(v.startDate),
        endDate: nullToEmpty(v.endDate),
        summary: nullToEmpty(v.summary),
        highlights: v.highlights || [],
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
    
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const saveDocument = formData.get('saveDocument') === 'true'; // Optional flag to save document to S3

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
      'image/jpeg',
      'image/png',
      'image/jpg',
      'text/plain' // Allow text files for testing
    ];

    if (!allowedTypes.includes(file.type)) {
      console.error('Unsupported file type:', file.type);
      return NextResponse.json(
        { error: `Unsupported file type: ${file.type}` },
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
    
    // Optionally save document to S3 if user is authenticated and saveDocument flag is true
    let documentUrl: string | undefined;
    if (userId && saveDocument) {
      try {
        const s3Client = new S3Client({
          region: process.env.AWS_S3_REGION!,
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
          },
        });

        const timestamp = Date.now();
        const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const s3Key = `documents/${userId}/${timestamp}-${sanitizedFilename}`;

        const command = new PutObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET_NAME!,
          Key: s3Key,
          ContentType: file.type,
          Body: buffer,
          Metadata: {
            userId: userId,
            originalFilename: file.name,
            uploadedAt: new Date().toISOString(),
            purpose: 'cv-parsing',
          },
        });

        await s3Client.send(command);
        documentUrl = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_S3_REGION}.amazonaws.com/${s3Key}`;
        console.log('Document saved to S3:', documentUrl);
      } catch (s3Error) {
        console.error('Failed to save document to S3:', s3Error);
        // Continue with parsing even if S3 upload fails
      }
    }
    
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
      },
      ...(documentUrl && { _documentUrl: documentUrl }) // Include document URL if saved
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
    
    // Return proper error response
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
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
