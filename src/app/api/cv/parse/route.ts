import { NextRequest, NextResponse } from 'next/server';
import { UnifiedUnifiedCVDataStructure } from '@/types/unified-cv-schema';
// @ts-ignore - pdf-parse doesn't have types
let pdfParse: any;
let mammoth: any;
let createWorker: any = null;
let docParser: any = null;
let rtfParser: any = null;

// Dynamic imports to avoid issues with pdf-parse
try {
  pdfParse = require('pdf-parse');
  console.log('pdf-parse loaded successfully');
} catch (error) {
  console.warn('pdf-parse not available:', error);
}

try {
  mammoth = require('mammoth');
  console.log('mammoth loaded successfully');
} catch (error) {
  console.warn('mammoth not available:', error);
}

try {
  const tesseract = require('tesseract.js');
  createWorker = tesseract.createWorker;
  console.log('tesseract.js loaded successfully');
} catch (error) {
  console.warn('tesseract.js not available:', error);
  // Provide a mock implementation for Vercel deployment
  createWorker = () => ({
    loadLanguage: () => Promise.resolve(),
    initialize: () => Promise.resolve(),
    recognize: () => Promise.resolve({ data: { text: 'OCR not available in this environment' } }),
    terminate: () => Promise.resolve()
  });
}

try {
  docParser = require('doc-parser');
  console.log('doc-parser loaded successfully');
} catch (error) {
  console.warn('doc-parser not available:', error);
}

try {
  rtfParser = require('rtf-parser');
  console.log('rtf-parser loaded successfully');
} catch (error) {
  console.warn('rtf-parser not available:', error);
}

interface PersonalInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  summary: string;
}

interface Education {
  institution: string;
  degree: string;
  field: string;
  startDate: string;
  endDate: string;
  current: boolean;
  description: string;
}

interface Experience {
  company: string;
  position: string;
  location: string;
  startDate: string;
  endDate: string;
  current: boolean;
  description: string;
  achievements: string[];
}

interface Skills {
  category: string;
  skills: string[];
}

interface Project {
  title: string;
  description: string;
  technologies: string[];
  url: string;
  github: string;
  startDate: string;
  endDate: string;
  current: boolean;
}

// Using UnifiedCVDataStructure from @/types/cv instead of custom interface

// Add GET method for testing
export async function GET() {
  console.log('CV Parse API test endpoint called');
  
  const testData = getEmptyStructure();
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
    console.log('File content preview:', await file.text().then(text => text.substring(0, 200)));
    console.log('File type check - is text/plain:', file.type === 'text/plain');

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
    const parsedData = await parseDocument(file);
    
    // Add debugging
    console.log('Parsed CV data:', JSON.stringify(parsedData, null, 2));
    console.log('Returning parsed data to client');
    
    // Check if we got filename-based data
    if (parsedData.basics.summary && parsedData.basics.summary.includes('CV parsing encountered an issue')) {
      console.log('WARNING: Using filename-based fallback data');
    }
    
    // Ensure we always return a valid structure
    const responseData = {
      ...parsedData,
      _parsed: true, // Flag to indicate this was parsed
      _timestamp: new Date().toISOString()
    };
    
    return NextResponse.json(responseData);
  } catch (error) {
    console.error('CV parsing API error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    // Return proper error response
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 400 }
    );
  }
}

async function parseDocument(file: File) {
  const fileType = file.type;
  let extractedText = '';
  
  try {
    console.log('Processing file type:', fileType, 'Size:', file.size);
    const buffer = Buffer.from(await file.arrayBuffer());
    console.log('Buffer created, size:', buffer.length);
    
    // Extract text based on file type with individual error handling
        if (fileType === 'application/pdf') {
          console.log('Processing PDF file...');
          
          // Method 1: Try pdf-parse first (most reliable)
          if (pdfParse) {
            try {
              console.log('Attempting PDF parsing with pdf-parse...');
              const pdfData = await pdfParse(buffer, {
                // Add options to improve parsing
                max: 0, // Parse all pages
                version: 'v1.10.100' // Use specific version
              });
              extractedText = pdfData.text || '';
              console.log('PDF parsing successful, text length:', extractedText.length);
              
              // If we got good text, use it
              if (extractedText && extractedText.trim().length > 50) {
                console.log('✅ PDF parsing successful with pdf-parse');
                return await parseTextToStructuredData(extractedText);
              }
            } catch (pdfError) {
              console.warn('pdf-parse failed:', pdfError.message);
              // Try with different options
              try {
                console.log('Retrying pdf-parse with different options...');
                const pdfData = await pdfParse(buffer, {
                  max: 10, // Limit to 10 pages
                  version: 'default'
                });
                extractedText = pdfData.text || '';
                if (extractedText && extractedText.trim().length > 50) {
                  console.log('✅ PDF parsing successful on retry');
                  return await parseTextToStructuredData(extractedText);
                }
              } catch (retryError) {
                console.warn('pdf-parse retry failed:', retryError.message);
              }
            }
          }
      
      // Method 2: Try pdfjs-dist as fallback
      try {
        console.log('Attempting PDF parsing with pdfjs-dist...');
        const pdfjsLib = require('pdfjs-dist/legacy/build/pdf');
        const loadingTask = pdfjsLib.getDocument({ 
          data: buffer,
          useSystemFonts: true,
          disableFontFace: true
        });
        const pdf = await loadingTask.promise;
        const textContent = [];
        
        // Process up to 10 pages or all pages if fewer
        const maxPages = Math.min(pdf.numPages, 10);
        console.log(`Processing ${maxPages} pages out of ${pdf.numPages} total pages`);
        
        for (let i = 1; i <= maxPages; i++) {
          try {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const pageText = content.items
              .map((item: any) => item.str)
              .filter((str: string) => str && str.trim().length > 0)
              .join(' ');
            
            if (pageText.trim().length > 0) {
              textContent.push(pageText);
            }
          } catch (pageError) {
            console.warn(`Failed to process page ${i}:`, pageError.message);
          }
        }
        
        extractedText = textContent.join('\n');
        console.log('PDF parsing with pdfjs-dist successful, text length:', extractedText.length);
        
        if (extractedText && extractedText.trim().length > 50) {
          console.log('✅ PDF parsing successful with pdfjs-dist');
          return await parseTextToStructuredData(extractedText);
        }
      } catch (pdfjsError) {
        console.warn('pdfjs-dist failed:', pdfjsError.message);
      }
      
      // Method 3: Try pdf2pic + OCR as last resort (if available)
      try {
        console.log('Attempting PDF to image conversion + OCR...');
        const pdf2pic = require('pdf2pic');
        const convert = pdf2pic.fromBuffer(buffer, {
          density: 100,
          saveFilename: 'temp',
          savePath: '/tmp',
          format: 'png',
          width: 2000,
          height: 2000
        });
        
        const results = await convert.bulk(-1, { responseType: 'base64' });
        
        if (results && results.length > 0 && createWorker) {
          console.log(`Converting ${results.length} pages to text via OCR...`);
          const worker = await createWorker('eng');
          
          for (const result of results.slice(0, 3)) { // Limit to first 3 pages
            try {
              const { data: { text } } = await worker.recognize(`data:image/png;base64,${result.base64}`);
              if (text && text.trim().length > 0) {
                extractedText += text + '\n';
              }
            } catch (ocrError) {
              console.warn('OCR failed for page:', ocrError.message);
            }
          }
          
          await worker.terminate();
          console.log('PDF OCR parsing successful, text length:', extractedText.length);
          
          if (extractedText && extractedText.trim().length > 50) {
            console.log('✅ PDF parsing successful with OCR');
            return await parseTextToStructuredData(extractedText);
          }
        }
      } catch (ocrError) {
        console.warn('PDF OCR parsing failed:', ocrError.message);
      }
      
      // If all methods failed, provide helpful error message
      if (!extractedText || extractedText.trim().length < 10) {
        console.error('All PDF parsing methods failed');
        throw new Error('Unable to extract text from PDF. This might be a scanned PDF or image-based PDF. Please try:\n\n1. Converting to DOCX format\n2. Copy-pasting the text content\n3. Using a text-based PDF');
      }
    } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      if (mammoth) {
        try {
          console.log('Attempting DOCX parsing...');
          const result = await mammoth.extractRawText({ buffer });
          extractedText = result.value || '';
          console.log('DOCX parsing successful, text length:', extractedText.length);
          
          if (!extractedText || extractedText.trim().length === 0) {
            throw new Error('Failed to parse CV with AI. Please try again or check your file format.');
          }
        } catch (docxError) {
          console.error('DOCX parsing failed:', docxError);
          throw new Error('Failed to parse CV with AI. Please try again or check your file format.');
        }
      } else {
        console.log('DOCX parsing library not available');
        throw new Error('Failed to parse CV with AI. Please try again or check your file format.');
      }
    } else if (fileType === 'application/msword') {
      if (docParser) {
        try {
          console.log('Attempting DOC parsing...');
          const result = await docParser(buffer);
          extractedText = result.text || '';
          console.log('DOC parsing successful, text length:', extractedText.length);
          
          if (!extractedText || extractedText.trim().length === 0) {
            throw new Error('Failed to parse DOC file. Please try converting to DOCX or PDF format.');
          }
        } catch (docError) {
          console.error('DOC parsing failed:', docError);
          throw new Error('Failed to parse DOC file. Please try converting to DOCX or PDF format.');
        }
      } else {
        console.log('DOC parsing library not available');
        throw new Error('DOC parsing is currently unavailable. Please convert your file to DOCX or PDF format.');
      }
    } else if (fileType === 'application/rtf' || fileType === 'text/rtf') {
      if (rtfParser) {
        try {
          console.log('Attempting RTF parsing...');
          const result = await rtfParser(buffer);
          extractedText = result.text || '';
          console.log('RTF parsing successful, text length:', extractedText.length);
          
          if (!extractedText || extractedText.trim().length === 0) {
            throw new Error('Failed to parse RTF file. Please try converting to DOCX or PDF format.');
          }
        } catch (rtfError) {
          console.error('RTF parsing failed:', rtfError);
          throw new Error('Failed to parse RTF file. Please try converting to DOCX or PDF format.');
        }
      } else {
        console.log('RTF parsing library not available');
        throw new Error('RTF parsing is currently unavailable. Please convert your file to DOCX or PDF format.');
      }
    } else if (fileType.startsWith('image/')) {
      if (createWorker) {
        try {
          console.log('Attempting OCR parsing...');
          const worker = await createWorker('eng');
          const { data: { text } } = await worker.recognize(buffer);
          await worker.terminate();
          extractedText = text || '';
          console.log('OCR parsing successful, text length:', extractedText.length);
        } catch (ocrError) {
          console.error('OCR parsing failed:', ocrError);
          extractedText = '';
        }
      } else {
        console.log('OCR parsing library not available');
        extractedText = '';
      }
    } else if (fileType === 'text/plain') {
      try {
        console.log('Processing text file...');
        extractedText = buffer.toString('utf-8');
        console.log('Text file processing successful, text length:', extractedText.length);
        console.log('Text file content preview:', extractedText.substring(0, 200));
      } catch (textError) {
        console.error('Text file processing failed:', textError);
        extractedText = '';
      }
    } else {
      console.log('Unsupported file type for parsing:', fileType);
      extractedText = '';
    }
    
    // Add debugging for extracted text
    console.log('Final extracted text length:', extractedText.length);
    if (extractedText.length > 0) {
      console.log('First 500 characters of extracted text:', extractedText.substring(0, 500));
    }
    
    // Parse the extracted text into structured data
    const parsedData = parseTextToStructuredData(extractedText);
    
    // If no meaningful data was extracted, provide a sample with some extracted info
    if (isEmptyParsedData(parsedData) && extractedText.length > 10) {
      console.log('No structured data found, creating sample with extracted text info');
      return createSampleDataWithExtractedInfo(extractedText);
    }
    
    // If we have no text at all, return a basic structure with filename info
    if (extractedText.length === 0) {
      console.log('No text extracted, returning basic structure');
      return createBasicStructureFromFilename(file.name);
    }
    
    console.log('Text extraction successful, proceeding with parsing');
    
    return parsedData;
  } catch (error) {
    console.error('Error in parseDocument:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    // Return basic structure with filename info as last resort
    return createBasicStructureFromFilename(file.name);
  }
}

// Create basic structure from filename when all parsing fails
function createBasicStructureFromFilename(filename: string): UnifiedCVDataStructure {
  const result = getEmptyStructure();
  
  // Try to extract name from filename
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, ''); // Remove extension
  const nameMatch = nameWithoutExt.match(/([a-zA-Z]+)[-_\s]+([a-zA-Z]+)/);
  
  if (nameMatch) {
    result.basics.name = `${nameMatch[1]} ${nameMatch[2]}`;
    
    // Add a helpful message in summary
    result.basics.summary = 'CV parsing encountered an issue. Please update your information manually.';
  }
  
  return result;
}

function parseTextToStructuredData(text: string): UnifiedCVDataStructure {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  const result = getEmptyStructure();
  
  // Add debugging
  console.log('Parsing text with', lines.length, 'lines');
  
  // Extract personal information and map to basics
  const personalInfo = extractPersonalInfo(text);
  console.log('Extracted personal info:', personalInfo);
  
  // Map personal info to basics structure
  result.basics.name = `${personalInfo.firstName || ''} ${personalInfo.lastName || ''}`.trim();
  result.basics.email = personalInfo.email || '';
  result.basics.phone = personalInfo.phone || '';
  result.basics.summary = personalInfo.summary || '';
  
  // Add LinkedIn profile if found
  if (personalInfo.linkedin) {
    result.basics.profiles.push({
      network: 'LinkedIn',
      username: personalInfo.linkedin.replace('linkedin.com/in/', ''),
      url: `https://${personalInfo.linkedin}`
    });
  }
  
  // Extract sections and map to correct structure
  try {
    const educationData = extractEducation(text);
    console.log('Extracted education:', educationData);
    result.education = educationData.map(edu => ({
      institution: edu.institution,
      url: '',
      area: edu.field,
      studyType: edu.degree,
      startDate: edu.startDate,
      endDate: edu.endDate,
      score: '',
      courses: []
    }));
  } catch (error) {
    console.error('Error extracting education:', error);
    result.education = [];
  }
  
  try {
    const experienceData = extractExperience(text);
    console.log('Extracted experience:', experienceData);
    result.work = experienceData.map(exp => ({
      name: exp.company,
      position: exp.position,
      url: '',
      startDate: exp.startDate,
      endDate: exp.endDate,
      summary: exp.description,
      highlights: exp.achievements
    }));
  } catch (error) {
    console.error('Error extracting experience:', error);
    result.work = [];
  }
  
  try {
    const skillsData = extractSkills(text);
    console.log('Extracted skills:', skillsData);
    result.skills = skillsData.map(skill => ({
      name: skill.category,
      level: '',
      keywords: skill.skills
    }));
  } catch (error) {
    console.error('Error extracting skills:', error);
    result.skills = [];
  }
  
  try {
    const projectsData = extractProjects(text);
    console.log('Extracted projects:', projectsData);
    result.projects = projectsData.map(proj => ({
      name: proj.title,
      startDate: proj.startDate || '',
      endDate: proj.endDate || '',
      description: proj.description,
      highlights: proj.technologies || [],
      url: proj.url || ''
    }));
  } catch (error) {
    console.error('Error extracting projects:', error);
    result.projects = [];
  }
  
  return result;
}

// Helper function to check if parsed data is empty
function isEmptyParsedData(data: UnifiedCVDataStructure): boolean {
  const hasPersonalInfo = data.basics.name || data.basics.email;
  const hasEducation = data.education.length > 0;
  const hasExperience = data.work.length > 0;
  const hasSkills = data.skills.length > 0;
  const hasProjects = data.projects.length > 0;
  
  console.log('Checking if parsed data is empty:');
  console.log('- hasPersonalInfo:', hasPersonalInfo, '(name:', data.basics.name, 'email:', data.basics.email, ')');
  console.log('- hasEducation:', hasEducation, '(count:', data.education.length, ')');
  console.log('- hasExperience:', hasExperience, '(count:', data.work.length, ')');
  console.log('- hasSkills:', hasSkills, '(count:', data.skills.length, ')');
  console.log('- hasProjects:', hasProjects, '(count:', data.projects.length, ')');
  
  const isEmpty = !hasPersonalInfo && !hasEducation && !hasExperience && !hasSkills && !hasProjects;
  console.log('- isEmpty:', isEmpty);
  
  return isEmpty;
}

// Create sample data with any extracted information
function createSampleDataWithExtractedInfo(text: string): UnifiedCVDataStructure {
  const result = getEmptyStructure();
  
  // Try to extract at least basic info
  const personalInfo = extractPersonalInfo(text);
  
  // Map personal info to basics structure
  result.basics.name = `${personalInfo.firstName || ''} ${personalInfo.lastName || ''}`.trim();
  result.basics.email = personalInfo.email || '';
  result.basics.phone = personalInfo.phone || '';
  result.basics.summary = personalInfo.summary || '';
  
  // Add LinkedIn profile if found
  if (personalInfo.linkedin) {
    result.basics.profiles.push({
      network: 'LinkedIn',
      username: personalInfo.linkedin.replace('linkedin.com/in/', ''),
      url: `https://${personalInfo.linkedin}`
    });
  }
  
  // If we still don't have a name, try to get it from the first few lines
  if (!result.basics.name) {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    for (const line of lines.slice(0, 3)) {
      if (line.length < 50 && line.split(' ').length >= 2 && line.split(' ').length <= 4) {
        result.basics.name = line;
        break;
      }
    }
  }
  
  // Add a sample education entry if we found a name
  if (result.basics.name) {
    result.education.push({
      institution: 'University (Please update)',
      url: '',
      area: 'Field of Study (Please update)',
      studyType: 'Degree (Please update)',
      startDate: '2020',
      endDate: '2024',
      score: '',
      courses: []
    });
    
    // Add a sample experience entry
    result.work.push({
      name: 'Company Name (Please update)',
      position: 'Position (Please update)',
      url: '',
      startDate: '2023',
      endDate: 'Present',
      summary: 'Please update with your work experience details',
      highlights: ['Achievement 1 (Please update)', 'Achievement 2 (Please update)']
    });
    
    // Add sample skills
    result.skills.push({
      name: 'Technical Skills',
      level: '',
      keywords: ['Skill 1 (Please update)', 'Skill 2 (Please update)', 'Skill 3 (Please update)']
    });
  }
  
  return result;
}

function getEmptyStructure(): UnifiedCVDataStructure {
  return {
    basics: {
      name: '',
      label: '',
      image: '',
      email: '',
      phone: '',
      url: '',
      summary: '',
      location: {
        address: '',
        postalCode: '',
        city: '',
        countryCode: '',
        region: ''
      },
      profiles: []
    },
    work: [],
    volunteer: [],
    education: [],
    awards: [],
    certificates: [],
    publications: [],
    skills: [],
    languages: [],
    interests: [],
    references: [],
    projects: []
  };
}

export function extractPersonalInfo(text: string): Partial<PersonalInfo> {
  const personalInfo: Partial<PersonalInfo> = {};
  
  console.log('Extracting personal info from text:', text.substring(0, 200) + '...');
  
  // Extract email
  const emailMatch = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
  if (emailMatch) {
    personalInfo.email = emailMatch[0];
    console.log('Found email:', personalInfo.email);
  }
  
  // Extract phone number
  const phoneMatch = text.match(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
  if (phoneMatch) {
    personalInfo.phone = phoneMatch[0];
    console.log('Found phone:', personalInfo.phone);
  }
  
  // Extract LinkedIn URL (improved)
  const linkedinPatterns = [
    /https?:\/\/linkedin\.com\/in\/[\w-]+/i,
    /linkedin\.com\/in\/[\w-]+/i,
    /linkedin\.com\/pub\/[\w-]+/i,
    /https?:\/\/linkedin\.com\/pub\/[\w-]+/i
  ];
  
  for (const pattern of linkedinPatterns) {
    const linkedinMatch = text.match(pattern);
    if (linkedinMatch) {
      let linkedinUrl = linkedinMatch[0];
      // Ensure it has https:// protocol
      if (!linkedinUrl.startsWith('http')) {
        linkedinUrl = 'https://' + linkedinUrl;
      }
      personalInfo.linkedin = linkedinUrl;
      console.log('Found LinkedIn:', personalInfo.linkedin);
      break;
    }
  }
  
  // Extract name (improved logic)
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  console.log('First 10 lines:', lines.slice(0, 10));
  
  for (const line of lines.slice(0, 10)) { // Check first 10 lines
    // More flexible name pattern
    if (line.length < 100 && 
        /^[A-Za-z\s\-']+$/.test(line) && 
        line.split(' ').length >= 2 && 
        line.split(' ').length <= 4 &&
        !line.toLowerCase().includes('email') &&
        !line.toLowerCase().includes('phone') &&
        !line.toLowerCase().includes('address')) {
      
      const nameParts = line.split(' ');
      personalInfo.firstName = nameParts[0];
      personalInfo.lastName = nameParts.slice(1).join(' ');
      console.log('Found name:', personalInfo.firstName, personalInfo.lastName);
      break;
    }
  }
  
  // Extract location (look for city, state/country patterns)
  const locationMatch = text.match(/([A-Za-z\s]+,\s*[A-Za-z\s]+)/);
  if (locationMatch) {
    const location = locationMatch[1].trim();
    // Only take the first location found and make sure it's not too long
    if (location.length < 50 && !location.includes('\n')) {
      personalInfo.location = location;
      console.log('Found location:', personalInfo.location);
    }
  }
  
  // Extract summary/professional summary with synonyms
  const summarySynonyms = [
    'summary', 'professional summary', 'profile', 'objective', 'career objective',
    'professional profile', 'about', 'about me', 'overview', 'introduction',
    'executive summary', 'career summary', 'professional overview'
  ];
  
  for (const synonym of summarySynonyms) {
    const summaryRegex = new RegExp(`(${synonym.replace(/\s+/g, '\\s+')}):?\\s*([^\\n]+(?:\\n(?![A-Z][A-Z\\s]*:)[^\\n]+)*)`, 'i');
    const summaryMatch = text.match(summaryRegex);
    
    if (summaryMatch && summaryMatch[2]) {
      let summary = summaryMatch[2].trim();
      
      // Clean up the summary - remove extra whitespace and limit length
      summary = summary.replace(/\s+/g, ' ').substring(0, 500);
      
      // Make sure it's not just a single word or too short
      if (summary.length > 20 && summary.split(' ').length > 3) {
        personalInfo.summary = summary;
        console.log('Found summary with synonym "' + synonym + '":', summary.substring(0, 100) + '...');
        break;
      }
    }
  }
  
  // If no explicit summary found, try to extract from the first substantial paragraph
  if (!personalInfo.summary) {
    const paragraphs = text.split('\n\n').map(p => p.trim()).filter(p => p.length > 50);
    for (const paragraph of paragraphs.slice(0, 3)) {
      // Skip if it looks like contact info or education
      if (!paragraph.toLowerCase().includes('email') && 
          !paragraph.toLowerCase().includes('phone') &&
          !paragraph.toLowerCase().includes('university') &&
          !paragraph.toLowerCase().includes('college') &&
          paragraph.split(' ').length > 10) {
        personalInfo.summary = paragraph.substring(0, 500);
        console.log('Found summary from paragraph:', personalInfo.summary.substring(0, 100) + '...');
        break;
      }
    }
  }
  
  console.log('Extracted personal info:', personalInfo);
  return personalInfo;
}

export function extractEducation(text: string): Education[] {
  const education: Education[] = [];
  const educationKeywords = ['education', 'academic', 'university', 'college', 'school', 'degree', 'bachelor', 'master', 'phd'];
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  console.log('Extracting education from', lines.length, 'lines');
  
  let inEducationSection = false;
  let currentEducation: Partial<Education> | null = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    const originalLine = lines[i];
    
    // Check if we're entering education section
    if (educationKeywords.some(keyword => line.includes(keyword)) && line.length < 50) {
      inEducationSection = true;
      console.log('Entering education section:', originalLine);
      continue;
    }
    
    // Also check for all caps section headers
    if (originalLine === 'EDUCATION' || originalLine === 'ACADEMIC') {
      inEducationSection = true;
      console.log('Entering education section (all caps):', originalLine);
      continue;
    }
    
    // Check if we're leaving education section
    if (inEducationSection && (line.includes('experience') || line.includes('work') || line.includes('employment') || line.includes('skills'))) {
      inEducationSection = false;
      if (currentEducation && isValidEducation(currentEducation)) {
        education.push(completeEducation(currentEducation));
        console.log('Added education entry:', currentEducation);
        currentEducation = null;
      }
      continue;
    }
    
    if (inEducationSection) {
      // Look for degree patterns with better parsing
      if (/\b(bachelor|master|phd|doctorate|diploma|certificate|b\.?s\.?|m\.?s\.?|m\.?a\.?|b\.?a\.?)\b/i.test(originalLine)) {
        if (currentEducation && isValidEducation(currentEducation)) {
          education.push(completeEducation(currentEducation));
          console.log('Added education entry:', currentEducation);
        }
        
        // Parse the education line more intelligently
        const educationLine = originalLine;
        let institution = '';
        let degree = '';
        let field = '';
        
        // Extract dates first (improved)
        const datePatterns = [
          /\b(19|20)\d{2}[-/]\s*(19|20)\d{2}\b/,
          /\b(19|20)\d{2}\s*[-–]\s*(19|20)\d{2}\b/,
          /\b(19|20)\d{2}\s*to\s*(19|20)\d{2}\b/i,
          /\b(19|20)\d{2}\s*-\s*(19|20)\d{2}\b/
        ];
        
        let startDate = '';
        let endDate = '';
        
        for (const pattern of datePatterns) {
          const dateMatch = educationLine.match(pattern);
          if (dateMatch && dateMatch[1] && dateMatch[2]) {
            startDate = dateMatch[1];
            endDate = dateMatch[2];
            console.log('Found education dates:', startDate, '-', endDate);
            break;
          }
        }
        
        // Try to parse "Degree in Field, University" format
        const degreeInFieldMatch = educationLine.match(/^([^,]+),\s*([^,]+)(?:,\s*(.+))?$/);
        if (degreeInFieldMatch) {
          degree = degreeInFieldMatch[1].trim();
          institution = degreeInFieldMatch[2].trim();
          if (degreeInFieldMatch[3]) {
            field = degreeInFieldMatch[3].trim();
          }
        } else {
          // Try to extract degree type
          const degreeMatch = educationLine.match(/\b(bachelor|master|phd|doctorate|diploma|certificate|b\.?s\.?|m\.?s\.?|m\.?a\.?|b\.?a\.?)\b/i);
          if (degreeMatch) {
            degree = degreeMatch[0];
            // Try to extract field from "in Field" pattern
            const fieldMatch = educationLine.match(/in\s+([^,]+)/i);
            if (fieldMatch) {
              field = fieldMatch[1].trim();
            }
            // Extract institution (everything else)
            const remaining = educationLine.replace(degree, '').replace(/in\s+[^,]+/i, '').replace(/\b(19|20)\d{2}[-/]\s*(19|20)\d{2}\b/, '').trim();
            if (remaining) {
              institution = remaining.replace(/^[,\s]+|[,\s]+$/g, '');
            }
          } else {
            // Fallback: use the whole line as degree
            degree = educationLine;
          }
        }
        
        currentEducation = {
          institution: institution,
          degree: degree,
          field: field,
          startDate: startDate,
          endDate: endDate,
          current: false,
          description: ''
        };
        console.log('Parsed education:', { institution, degree, field, startDate, endDate });
      }
      
      // Look for institution names (more flexible)
      if (currentEducation && !currentEducation.institution && 
          (/\b(university|college|school|institute|academy)\b/i.test(originalLine) || 
           (originalLine.length > 5 && originalLine.length < 100 && 
            !/\b(19|20)\d{2}\b/.test(originalLine) &&
            !originalLine.includes('Bachelor') &&
            !originalLine.includes('Master') &&
            !originalLine.includes('PhD')))) {
        currentEducation.institution = originalLine;
        console.log('Found institution:', originalLine);
      }
      
      // Look for field of study
      if (currentEducation && !currentEducation.field && 
          /\b(computer science|engineering|business|arts|science|technology|mathematics|physics|chemistry|biology|economics|psychology|sociology|history|literature|philosophy|medicine|law|architecture|design)\b/i.test(originalLine)) {
        currentEducation.field = originalLine;
        console.log('Found field:', originalLine);
      } else if (currentEducation && !currentEducation.field && 
                 originalLine.includes('in ') && 
                 originalLine.length < 100) {
        // Extract field from "Bachelor of Science in Computer Science" format
        const inMatch = originalLine.match(/in\s+(.+)/i);
        if (inMatch) {
          currentEducation.field = inMatch[1].trim();
          console.log('Found field from "in" format:', currentEducation.field);
        }
      }
      
      // Look for years
      const yearMatch = originalLine.match(/\b(19|20)\d{2}\b/g);
      if (currentEducation && yearMatch) {
        if (yearMatch.length >= 2) {
          currentEducation.startDate = yearMatch[0];
          currentEducation.endDate = yearMatch[1];
          console.log('Found years:', yearMatch[0], '-', yearMatch[1]);
        } else {
          currentEducation.endDate = yearMatch[0];
          console.log('Found end year:', yearMatch[0]);
        }
      }
    }
  }
  
  if (currentEducation && isValidEducation(currentEducation)) {
    education.push(completeEducation(currentEducation));
    console.log('Added final education entry:', currentEducation);
  }
  
  console.log('Total education entries found:', education.length);
  return education;
}

export function extractExperience(text: string): Experience[] {
  const experience: Experience[] = [];
  const experienceKeywords = ['experience', 'work', 'employment', 'career', 'professional', 'relevant work', 'work history', 'employment history'];
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  console.log('Extracting experience from', lines.length, 'lines');
  
  let inExperienceSection = false;
  let currentExperience: Partial<Experience> | null = null;
  let descriptionLines: string[] = [];
  let isCollectingDescription = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    const originalLine = lines[i];
    
    // Check if we're entering experience section
    if (experienceKeywords.some(keyword => line.includes(keyword)) && line.length < 50) {
      inExperienceSection = true;
      console.log('Entering experience section:', originalLine);
      continue;
    }
    
    // Also check for all caps section headers
    if (originalLine === 'EXPERIENCE' || originalLine === 'WORK EXPERIENCE' || originalLine === 'EMPLOYMENT') {
      inExperienceSection = true;
      console.log('Entering experience section (all caps):', originalLine);
      continue;
    }
    
    // Check if we're leaving experience section
    if (inExperienceSection && (line.includes('education') || line.includes('skills') || line.includes('projects') || line.includes('certificates') || line.includes('awards'))) {
      inExperienceSection = false;
      if (currentExperience && isValidExperience(currentExperience)) {
        // Add accumulated description
        if (descriptionLines.length > 0) {
          currentExperience.description = descriptionLines.join(' ');
        }
        experience.push(completeExperience(currentExperience));
        console.log('Added experience entry:', currentExperience);
        currentExperience = null;
        descriptionLines = [];
        isCollectingDescription = false;
      }
      continue;
    }
    
    if (inExperienceSection) {
      // Look for job titles and companies with better parsing (improved for multiple experiences)
      const jobTitlePatterns = [
        // Job titles
        /\b(manager|developer|engineer|analyst|coordinator|specialist|director|lead|consultant|designer|architect|scientist|researcher|teacher|professor|assistant|supervisor|executive|officer|representative|associate|junior|senior|principal|chief|head|vice|president|ceo|cto|cfo|coo|intern|trainee|apprentice)\b/i,
        // Tech roles
        /\b(software|web|frontend|backend|fullstack|data|machine learning|ai|artificial intelligence|devops|cloud|mobile|ios|android|react|angular|vue|node|python|java|javascript|typescript|php|ruby|go|rust|swift|kotlin|database|sql|nosql|api|microservices|kubernetes|docker|aws|azure|gcp)\b/i,
        // Company indicators
        /\b(inc|ltd|llc|corp|company|technologies|solutions|systems|services|group|consulting|partners|enterprises|ventures|holdings|international|global|digital|software|tech|it|startup|agency|firm|organization|institute|university|college|school|hospital|clinic|bank|financial|insurance|retail|manufacturing|construction|real estate|media|marketing|advertising|sales|customer service|hr|human resources|operations|logistics|supply chain|quality|compliance|legal|finance|accounting|audit|tax|business|strategy|management|administration|support|help desk|technical|maintenance|security|networking|infrastructure|platform|application|product|project|program|initiative|campaign|research|development|innovation|transformation|optimization|automation|integration|implementation|deployment|migration|upgrade|maintenance|support|troubleshooting|testing|qa|quality assurance|validation|verification|documentation|training|mentoring|coaching|leadership|team|collaboration|communication|presentation|reporting|analysis|planning|strategy|budget|forecast|metrics|kpi|dashboard|report|presentation|proposal|proposal|contract|agreement|negotiation|vendor|supplier|client|customer|stakeholder|partner|collaborator|colleague|peer|subordinate|supervisor|manager|director|vp|vice president|president|ceo|cto|cfo|coo|founder|co-founder|owner|entrepreneur|freelancer|contractor|consultant|advisor|mentor|coach|trainer|instructor|professor|teacher|researcher|scientist|engineer|developer|programmer|coder|architect|designer|analyst|specialist|coordinator|administrator|assistant|representative|officer|executive|director|manager|supervisor|lead|senior|junior|principal|chief|head|vice|president|ceo|cto|cfo|coo|intern|trainee|apprentice)\b/i
      ];
      
      const isJobTitle = originalLine.length < 200 && 
          (jobTitlePatterns.some(pattern => pattern.test(originalLine)) ||
           // Look for bullet points or numbered items that might be job entries
           /^[•\-\*\d+\.]/.test(originalLine) ||
           // Look for lines with dates that might be job entries
           /\b(19|20)\d{2}\b/.test(originalLine) ||
           // Look for company names
           /\b[A-Z][a-z]+\s+(Inc|Ltd|LLC|Corp|Company|Technologies|Solutions|Systems|Services|Group|Consulting|Partners|Enterprises|Ventures|Holdings|International|Global|Digital|Software|Tech|IT|Startup|Agency|Firm|Organization|Institute|University|College|School|Hospital|Clinic|Bank|Financial|Insurance|Retail|Manufacturing|Construction|Real Estate|Media|Marketing|Advertising|Sales|Customer Service|HR|Human Resources|Operations|Logistics|Supply Chain|Quality|Compliance|Legal|Finance|Accounting|Audit|Tax|Business|Strategy|Management|Administration|Support|Help Desk|Technical|Maintenance|Security|Networking|Infrastructure|Platform|Application|Product|Project|Program|Initiative|Campaign|Research|Development|Innovation|Transformation|Optimization|Automation|Integration|Implementation|Deployment|Migration|Upgrade|Maintenance|Support|Troubleshooting|Testing|QA|Quality Assurance|Validation|Verification|Documentation|Training|Mentoring|Coaching|Leadership|Team|Collaboration|Communication|Presentation|Reporting|Analysis|Planning|Strategy|Budget|Forecast|Metrics|KPI|Dashboard|Report|Presentation|Proposal|Proposal|Contract|Agreement|Negotiation|Vendor|Supplier|Client|Customer|Stakeholder|Partner|Collaborator|Colleague|Peer|Subordinate|Supervisor|Manager|Director|VP|Vice President|President|CEO|CTO|CFO|COO|Founder|Co-founder|Owner|Entrepreneur|Freelancer|Contractor|Consultant|Advisor|Mentor|Coach|Trainer|Instructor|Professor|Teacher|Researcher|Scientist|Engineer|Developer|Programmer|Coder|Architect|Designer|Analyst|Specialist|Coordinator|Administrator|Assistant|Representative|Officer|Executive|Director|Manager|Supervisor|Lead|Senior|Junior|Principal|Chief|Head|Vice|President|CEO|CTO|CFO|COO|Intern|Trainee|Apprentice)\b/.test(originalLine));
      
      if (isJobTitle) {
        if (currentExperience && isValidExperience(currentExperience)) {
          experience.push(completeExperience(currentExperience));
          console.log('Added experience entry:', currentExperience);
        }
        
        // Parse the experience line more intelligently
        const experienceLine = originalLine;
        let company = '';
        let position = '';
        
        // Extract dates first (improved)
        const datePatterns = [
          /\b(19|20)\d{2}[-/]\s*(19|20)\d{2}\b/,
          /\b(19|20)\d{2}\s*[-–]\s*(19|20)\d{2}\b/,
          /\b(19|20)\d{2}\s*to\s*(19|20)\d{2}\b/i,
          /\b(19|20)\d{2}\s*-\s*(19|20)\d{2}\b/,
          /\b\d{1,2}\/\d{1,2}\/\d{4}\s*[-–]\s*\d{1,2}\/\d{1,2}\/\d{4}\b/,
          /\b\d{1,2}-\d{1,2}-\d{4}\s*[-–]\s*\d{1,2}-\d{1,2}-\d{4}\b/
        ];
        
        let startDate = '';
        let endDate = '';
        
        for (const pattern of datePatterns) {
          const dateMatch = experienceLine.match(pattern);
          if (dateMatch && dateMatch[1] && dateMatch[2]) {
            if (pattern.source.includes('\\d{1,2}')) {
              // Handle DD/MM/YYYY or DD-MM-YYYY format
              const startParts = dateMatch[1].split(/[\/-]/);
              const endParts = dateMatch[2].split(/[\/-]/);
              if (startParts.length === 3 && endParts.length === 3) {
                startDate = startParts[2]; // Year
                endDate = endParts[2]; // Year
              }
            } else {
              // Handle YYYY format
              startDate = dateMatch[1];
              endDate = dateMatch[2];
            }
            console.log('Found experience dates:', startDate, '-', endDate);
            break;
          }
        }
        
        // Try to parse "Company, Position" format
        const companyPositionMatch = experienceLine.match(/^([^,]+),\s*([^,]+)$/);
        if (companyPositionMatch) {
          company = companyPositionMatch[1].trim();
          position = companyPositionMatch[2].trim();
        } else {
          // Try to parse "Position at Company" format
          const positionAtMatch = experienceLine.match(/^(.+?)\s+at\s+(.+)$/i);
          if (positionAtMatch) {
            position = positionAtMatch[1].trim();
            company = positionAtMatch[2].trim();
          } else {
            // Try to parse "Position - Company" format
            const positionDashMatch = experienceLine.match(/^(.+?)\s*-\s*(.+)$/);
            if (positionDashMatch) {
              position = positionDashMatch[1].trim();
              company = positionDashMatch[2].trim();
            } else {
              // Fallback: use the whole line as position
              position = experienceLine;
            }
          }
        }
        
        currentExperience = {
          company: company,
          position: position,
          location: '',
          startDate: startDate,
          endDate: endDate,
          current: false,
          description: '',
          achievements: []
        };
        console.log('Parsed experience:', { company, position, startDate, endDate });
        isCollectingDescription = true;
        descriptionLines = [];
      } else if (currentExperience && isCollectingDescription) {
        // Collect description lines
        if (originalLine.length > 10 && !originalLine.includes('•') && !originalLine.includes('-') && !originalLine.includes('*')) {
          descriptionLines.push(originalLine);
          console.log('Added description line:', originalLine);
        } else if (originalLine.includes('•') || originalLine.includes('-') || originalLine.includes('*')) {
          // This might be an achievement or bullet point
          const achievement = originalLine.replace(/^[•\-\*\s]+/, '').trim();
          if (achievement.length > 5) {
            currentExperience.achievements = currentExperience.achievements || [];
            currentExperience.achievements.push(achievement);
            console.log('Added achievement:', achievement);
          }
        }
      }
      
      // Look for company names (more flexible)
      if (currentExperience && !currentExperience.company && 
          originalLine.length > 3 && originalLine.length < 100 &&
          !/\b(19|20)\d{2}\b/.test(originalLine) &&
          !originalLine.includes('•') &&
          !originalLine.includes('-') &&
          !originalLine.includes('*')) {
        currentExperience.company = originalLine;
        console.log('Found company:', originalLine);
      }
      
      // Look for location
      if (currentExperience && !currentExperience.location && 
          /,/.test(originalLine) && 
          originalLine.length < 50) {
        currentExperience.location = originalLine;
        console.log('Found location:', originalLine);
      }
      
      // Look for years
      const yearMatch = originalLine.match(/\b(19|20)\d{2}\b/g);
      if (currentExperience && yearMatch) {
        if (yearMatch.length >= 2) {
          currentExperience.startDate = yearMatch[0];
          currentExperience.endDate = yearMatch[1];
          console.log('Found years:', yearMatch[0], '-', yearMatch[1]);
        } else {
          currentExperience.endDate = yearMatch[0];
          console.log('Found end year:', yearMatch[0]);
        }
      }
      
      // Look for bullet points or achievements
      if (currentExperience && (originalLine.startsWith('•') || originalLine.startsWith('-') || originalLine.startsWith('*'))) {
        if (!currentExperience.achievements) {
          currentExperience.achievements = [];
        }
        const achievement = originalLine.replace(/^[•\-*]\s*/, '');
        currentExperience.achievements.push(achievement);
        console.log('Found achievement:', achievement);
      }
    }
  }
  
  if (currentExperience && isValidExperience(currentExperience)) {
    experience.push(completeExperience(currentExperience));
    console.log('Added final experience entry:', currentExperience);
  }
  
  console.log('Total experience entries found:', experience.length);
  return experience;
}

export function extractSkills(text: string): Skills[] {
  const skills: Skills[] = [];
  const skillsKeywords = ['skills', 'competencies', 'technologies', 'tools', 'languages', 'frameworks'];
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  console.log('Extracting skills from', lines.length, 'lines');
  
  let inSkillsSection = false;
  let currentCategory = 'Technical Skills';
  
  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    
    // Check if we're entering skills section
    if (skillsKeywords.some(keyword => lowerLine.includes(keyword)) && line.length < 50) {
      inSkillsSection = true;
      console.log('Entering skills section:', line);
      continue;
    }
    
    // Also check for all caps section headers
    if (line === 'SKILLS' || line === 'TECHNICAL SKILLS' || line === 'COMPETENCIES') {
      inSkillsSection = true;
      console.log('Entering skills section (all caps):', line);
      continue;
    }
    
    // Check if we're leaving skills section
    if (inSkillsSection && (lowerLine.includes('experience') || lowerLine.includes('education') || lowerLine.includes('projects'))) {
      inSkillsSection = false;
      console.log('Leaving skills section');
      continue;
    }
    
    if (inSkillsSection && line.length > 0) {
      // Check if this line is a category header
      if (lowerLine.includes('technical') || lowerLine.includes('programming') || lowerLine.includes('software')) {
        currentCategory = 'Technical Skills';
        console.log('Found technical skills category');
        continue;
      } else if (lowerLine.includes('soft') || lowerLine.includes('interpersonal') || lowerLine.includes('communication')) {
        currentCategory = 'Soft Skills';
        console.log('Found soft skills category');
        continue;
      } else if (lowerLine.includes('language') || lowerLine.includes('spoken')) {
        currentCategory = 'Languages';
        console.log('Found languages category');
        continue;
      }
      
      // Split skills by common delimiters
      const skillList = line.split(/[,;|•\-*]/).map(skill => skill.trim()).filter(skill => skill.length > 0);
      
      if (skillList.length > 0) {
        // Check if we already have this category
        let existingCategory = skills.find(s => s.category === currentCategory);
        if (!existingCategory) {
          existingCategory = {
            category: currentCategory,
            skills: []
          };
          skills.push(existingCategory);
        }
        
        // Add skills to the category
        existingCategory.skills.push(...skillList);
        console.log('Added skills to', currentCategory, ':', skillList);
      }
    }
  }
  
  console.log('Total skills categories found:', skills.length);
  return skills;
}

function extractProjects(text: string): Project[] {
  const projects: Project[] = [];
  const projectKeywords = ['projects', 'portfolio', 'work samples', 'project experience', 'personal projects', 'academic projects', 'key projects', 'notable projects', 'selected projects'];
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  console.log('Extracting projects from', lines.length, 'lines');
  
  let inProjectsSection = false;
  let currentProject: Partial<Project> | null = null;
  let descriptionLines: string[] = [];
  let isCollectingDescription = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lowerLine = line.toLowerCase();
    
    // Check if we're entering projects section
    if (projectKeywords.some(keyword => lowerLine.includes(keyword)) && line.length < 50) {
      inProjectsSection = true;
      console.log('Entering projects section:', line);
      continue;
    }
    
    // Check if we're leaving projects section
    if (inProjectsSection && (lowerLine.includes('experience') || lowerLine.includes('education') || lowerLine.includes('skills') || lowerLine.includes('certificates'))) {
      inProjectsSection = false;
      if (currentProject && isValidProject(currentProject)) {
        projects.push(completeProject(currentProject));
        console.log('Added project entry:', currentProject);
        currentProject = null;
      }
      continue;
    }
    
    if (inProjectsSection && line.length > 0) {
      // Look for project titles (lines that look like project names)
      const isProjectTitle = line.length < 100 && 
          (line.includes('Project') || 
           line.includes('App') || 
           line.includes('System') || 
           line.includes('Website') || 
           line.includes('Application') ||
           line.includes('Dashboard') ||
           line.includes('Tool') ||
           line.includes('Platform') ||
           // Look for bullet points or numbered items
           /^[•\-\*\d+\.]/.test(line) ||
           // Look for lines that start with capital letters and don't contain common words
           (/^[A-Z]/.test(line) && !lowerLine.includes('the') && !lowerLine.includes('and') && !lowerLine.includes('with')));
      
      if (isProjectTitle) {
        // Save previous project if exists
        if (currentProject && isValidProject(currentProject)) {
          projects.push(completeProject(currentProject));
          console.log('Added project entry:', currentProject);
        }
        
        // Start new project
        currentProject = {
          title: line.replace(/^[•\-\*\d+\.]\s*/, '').trim(), // Remove bullet points
          description: '',
          technologies: [],
          url: '',
          github: '',
          startDate: '',
          endDate: '',
          current: false
        };
        console.log('Found project title:', currentProject.title);
      } else if (currentProject) {
        // This is likely a description or technology line
        if (line.length > 20) {
          // Look for technologies
          const techKeywords = ['javascript', 'python', 'java', 'react', 'angular', 'vue', 'node', 'express', 'mongodb', 'mysql', 'postgresql', 'aws', 'azure', 'docker', 'kubernetes', 'git', 'github', 'html', 'css', 'bootstrap', 'tailwind', 'typescript', 'php', 'ruby', 'go', 'rust', 'swift', 'kotlin', 'android', 'ios', 'flutter', 'react native'];
          const foundTechs = techKeywords.filter(tech => lowerLine.includes(tech));
          
          if (foundTechs.length > 0) {
            currentProject.technologies = [...(currentProject.technologies || []), ...foundTechs];
            console.log('Found technologies:', foundTechs);
          } else {
            // Add to description
            currentProject.description += (currentProject.description ? ' ' : '') + line;
          }
        }
      }
    }
  }
  
  // Add final project if exists
  if (currentProject && isValidProject(currentProject)) {
    projects.push(completeProject(currentProject));
    console.log('Added final project entry:', currentProject);
  }
  
  console.log('Total projects found:', projects.length);
  return projects;
}

// Validation functions to ensure objects have required fields and provide defaults
function isValidEducation(education: Partial<Education>): boolean {
  return !!(education.institution || education.degree || education.field);
}

function isValidExperience(experience: Partial<Experience>): boolean {
  return !!(experience.company || experience.position);
}

function isValidProject(project: Partial<Project>): boolean {
  return !!(project.title);
}

// Helper functions to convert partial objects to complete objects with defaults
function completeEducation(education: Partial<Education>): Education {
  return {
    institution: education.institution || '',
    degree: education.degree || '',
    field: education.field || '',
    startDate: education.startDate || '',
    endDate: education.endDate || '',
    current: education.current || false,
    description: education.description || ''
  };
}

function completeExperience(experience: Partial<Experience>): Experience {
  return {
    company: experience.company || '',
    position: experience.position || '',
    location: experience.location || '',
    startDate: experience.startDate || '',
    endDate: experience.endDate || '',
    current: experience.current || false,
    description: experience.description || '',
    achievements: experience.achievements || []
  };
}

function completeProject(project: Partial<Project>): Project {
  return {
    title: project.title || '',
    description: project.description || '',
    technologies: project.technologies || [],
    url: project.url || '',
    github: project.github || '',
    startDate: project.startDate || '',
    endDate: project.endDate || '',
    current: project.current || false
  };
}