import { NextRequest, NextResponse } from 'next/server';

// Import libraries with proper error handling
let pdfParse: any = null;
let mammoth: any = null;

// Initialize libraries safely
const initLibraries = async () => {
  if (!pdfParse) {
    try {
      // @ts-ignore - pdf-parse doesn't have type definitions
      const pdfParseModule = await import('pdf-parse');
      pdfParse = pdfParseModule.default || pdfParseModule;
    } catch (error) {
      console.warn('pdf-parse not available:', error);
    }
  }
  
  if (!mammoth) {
    try {
      const mammothModule = await import('mammoth');
      mammoth = mammothModule.default || mammothModule;
    } catch (error) {
      console.warn('mammoth not available:', error);
    }
  }
};

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function callAI(content: string) {
  const system = `You are a precise CV parser. Extract the user's CV into the EXACT JSON schema below. Respond with ONLY valid JSON (RFC8259). No explanations, no markdown, no code fences, no extra fields, no comments. If data is missing, use empty strings or empty arrays. Do not include trailing commas.
Schema:
{
  "basics": {"name":"","label":"","image":"","email":"","phone":"","url":"","summary":"","location": {"address":"","postalCode":"","city":"","countryCode":"","region":""}, "profiles":[{"network":"","username":"","url":""}]},
  "work":[{"name":"","position":"","url":"","startDate":"","endDate":"","summary":"","highlights":[""]}],
  "volunteer":[{"organization":"","position":"","url":"","startDate":"","endDate":"","summary":"","highlights":[""]}],
  "education":[{"institution":"","url":"","area":"","studyType":"","startDate":"","endDate":"","score":"","courses":[""]}],
  "awards":[{"title":"","date":"","awarder":"","summary":""}],
  "certificates":[{"name":"","date":"","issuer":"","url":""}],
  "publications":[{"name":"","publisher":"","releaseDate":"","url":"","summary":""}],
  "skills":[{"name":"","level":"","keywords":[""]}],
  "languages":[{"language":"","fluency":""}],
  "interests":[{"name":"","keywords":[""]}],
  "references":[{"name":"","reference":""}],
  "projects":[{"name":"","startDate":"","endDate":"","description":"","highlights":[""],"url":""}]
}
Date formatting rules: Prefer YYYY-MM. If only a year is known use YYYY. If date is present/ongoing, leave the field as an empty string. Do NOT output textual words like "Present" or ranges with hyphens. One entry per job/education.`;

  const body = {
    contents: [{ parts: [{ text: `${system}\n\nCV Content:\n${content}` }]}],
    generationConfig: { temperature: 0.2, maxOutputTokens: 2048 }
  };

  const res = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`AI error ${res.status}: ${t}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  // Clean possible code fences
  const cleaned = text
    .replace(/```json[\s\S]*?\n/g, '')
    .replace(/```/g, '')
    .trim();
  return cleaned;
}

async function extractFromPDF(buffer: Buffer): Promise<string> {
  // Initialize libraries
  await initLibraries();
  
  // Try pdf-parse first
  if (pdfParse) {
    try {
      const result = await pdfParse(buffer);
      return result.text || '';
    } catch (error) {
      console.warn('pdf-parse failed:', error);
    }
  }
  
  // If no PDF libraries are available, return a helpful message
  throw new Error('PDF parsing libraries are not available. Please try uploading a text file or copy-paste your CV content.');
}

async function extractFromDocx(buffer: Buffer): Promise<string> {
  // Initialize libraries
  await initLibraries();
  
  if (!mammoth) {
    throw new Error('DOCX parsing library not available');
  }
  
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value || '';
  } catch (error) {
    console.error('DOCX parsing error:', error);
    throw new Error('Failed to parse DOCX file');
  }
}

async function extractFromImage(buffer: Buffer): Promise<string> {
  // OCR is not directly available in this version, so we'll return an error
  throw new Error('OCR functionality is not available in this version.');
}

async function extractTextFromBuffer(buffer: Buffer, fileType: string): Promise<string> {
  const lowerFileType = fileType.toLowerCase();
  
  // PDF files
  if (lowerFileType.includes('pdf') || lowerFileType === 'application/pdf') {
    return await extractFromPDF(buffer);
  }
  
  // Word documents
  if (lowerFileType.includes('wordprocessingml') || 
      lowerFileType.includes('docx') || 
      lowerFileType.includes('msword') ||
      lowerFileType.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document')) {
    return await extractFromDocx(buffer);
  }
  
  // Image files (PNG, JPG, JPEG, etc.)
  if (lowerFileType.includes('image/') || 
      lowerFileType.includes('png') || 
      lowerFileType.includes('jpg') || 
      lowerFileType.includes('jpeg') ||
      lowerFileType.includes('gif') ||
      lowerFileType.includes('bmp') ||
      lowerFileType.includes('tiff')) {
    return await extractFromImage(buffer);
  }
  
  // Plain text files
  if (lowerFileType.includes('text/') || 
      lowerFileType.includes('txt') || 
      lowerFileType.includes('plain')) {
    return buffer.toString('utf-8');
  }
  
  // Default: try to parse as text
  return buffer.toString('utf-8');
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';

    if (contentType.startsWith('application/json')) {
      const { fileBase64, fileType, plainText } = await req.json();
      let text = plainText || '';

      if (!text && fileBase64 && fileType) {
        try {
          const buffer = Buffer.from(fileBase64, 'base64');
          text = await extractTextFromBuffer(buffer, fileType);
        } catch (error) {
          console.error('Text extraction error:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          
          // Provide specific guidance based on error type
          if (errorMessage.includes('PDF parsing libraries are not available')) {
            return NextResponse.json({ 
              success: false, 
              error: 'PDF parsing is currently unavailable. Please copy and paste your CV content as text instead.',
              suggestion: 'Try copying your CV content and pasting it directly into the text field.'
            }, { status: 400 });
          }
          
          return NextResponse.json({ 
            success: false, 
            error: `Failed to extract text: ${errorMessage}`,
            suggestion: 'Try copying and pasting your CV content as text instead.'
          }, { status: 400 });
        }
      }

      if (!text || text.trim().length < 20) {
        return NextResponse.json({ 
          success: false, 
          error: 'Unable to extract sufficient text from file. Please ensure the file contains readable text.' 
        }, { status: 400 });
      }

      // Call AI to parse the extracted text
      let aiText;
      try {
        aiText = await callAI(text);
      } catch (error) {
        console.error('AI parsing error:', error);
        return NextResponse.json({ 
          success: false, 
          error: 'Failed to parse CV with AI. Please try again or check your file format.' 
        }, { status: 500 });
      }

      // Extract JSON object robustly
      const parseRobustJson = (input: string) => {
        // Try direct parse
        try { return JSON.parse(input); } catch {}
        // Try extracting first {...} block
        const start = input.indexOf('{');
        const end = input.lastIndexOf('}');
        if (start !== -1 && end !== -1 && end > start) {
          const slice = input.slice(start, end + 1);
          try { return JSON.parse(slice); } catch {}
        }
        // Try removing trailing commas
        const noTrailingCommas = input.replace(/,\s*([}\]])/g, '$1');
        try { return JSON.parse(noTrailingCommas); } catch {}
        return null;
      };

      const raw = parseRobustJson(aiText);
      if (!raw) {
        return NextResponse.json({ 
          success: false, 
          error: 'AI returned invalid JSON. Please try again with a different file.' 
        }, { status: 502 });
      }

      // Normalize to schema and coerce types
      const asString = (v: any): string => (v == null ? '' : String(v));
      const asStringArray = (arr: any): string[] => Array.isArray(arr) ? arr.map(asString).filter(Boolean) : [];
      const asObjectArray = (arr: any): any[] => Array.isArray(arr) ? arr : [];

      const normalized = {
        basics: {
          name: asString(raw.basics?.name),
          label: asString(raw.basics?.label),
          image: asString(raw.basics?.image),
          email: asString(raw.basics?.email),
          phone: asString(raw.basics?.phone),
          url: asString(raw.basics?.url),
          summary: asString(raw.basics?.summary),
          location: {
            address: asString(raw.basics?.location?.address),
            postalCode: asString(raw.basics?.location?.postalCode),
            city: asString(raw.basics?.location?.city),
            countryCode: asString(raw.basics?.location?.countryCode),
            region: asString(raw.basics?.location?.region)
          },
          profiles: asObjectArray(raw.basics?.profiles).map((p: any) => ({
            network: asString(p?.network),
            username: asString(p?.username),
            url: asString(p?.url)
          }))
        },
        work: asObjectArray(raw.work).map((w: any) => ({
          name: asString(w?.name),
          position: asString(w?.position),
          url: asString(w?.url),
          startDate: asString(w?.startDate),
          endDate: asString(w?.endDate),
          summary: asString(w?.summary),
          highlights: asStringArray(w?.highlights)
        })),
        volunteer: asObjectArray(raw.volunteer).map((v: any) => ({
          organization: asString(v?.organization),
          position: asString(v?.position),
          url: asString(v?.url),
          startDate: asString(v?.startDate),
          endDate: asString(v?.endDate),
          summary: asString(v?.summary),
          highlights: asStringArray(v?.highlights)
        })),
        education: asObjectArray(raw.education).map((e: any) => ({
          institution: asString(e?.institution),
          url: asString(e?.url),
          area: asString(e?.area),
          studyType: asString(e?.studyType),
          startDate: asString(e?.startDate),
          endDate: asString(e?.endDate),
          score: asString(e?.score),
          courses: asStringArray(e?.courses)
        })),
        awards: asObjectArray(raw.awards).map((a: any) => ({
          title: asString(a?.title),
          date: asString(a?.date),
          awarder: asString(a?.awarder),
          summary: asString(a?.summary)
        })),
        certificates: asObjectArray(raw.certificates).map((c: any) => ({
          name: asString(c?.name),
          date: asString(c?.date),
          issuer: asString(c?.issuer),
          url: asString(c?.url)
        })),
        publications: asObjectArray(raw.publications).map((p: any) => ({
          name: asString(p?.name),
          publisher: asString(p?.publisher),
          releaseDate: asString(p?.releaseDate),
          url: asString(p?.url),
          summary: asString(p?.summary)
        })),
        skills: asObjectArray(raw.skills).map((s: any) => ({
          name: asString(s?.name),
          level: asString(s?.level),
          keywords: asStringArray(s?.keywords)
        })),
        languages: asObjectArray(raw.languages).map((l: any) => ({
          language: asString(l?.language),
          fluency: asString(l?.fluency)
        })),
        interests: asObjectArray(raw.interests).map((i: any) => ({
          name: asString(i?.name),
          keywords: asStringArray(i?.keywords)
        })),
        references: asObjectArray(raw.references).map((r: any) => ({
          name: asString(r?.name),
          reference: asString(r?.reference)
        })),
        projects: asObjectArray(raw.projects).map((p: any) => ({
          name: asString(p?.name),
          startDate: asString(p?.startDate),
          endDate: asString(p?.endDate),
          description: asString(p?.description),
          highlights: asStringArray(p?.highlights),
          url: asString(p?.url)
        }))
      };

      return NextResponse.json({ success: true, data: normalized });
    }

    // For multipart/form-data in future (not used now)
    return NextResponse.json({ success: false, error: 'Unsupported content type' }, { status: 415 });
  } catch (e: any) {
    console.error('parse-cv error:', e);
    return NextResponse.json({ 
      success: false, 
      error: e.message || 'Server error occurred while parsing CV' 
    }, { status: 500 });
  }
}

