import { NextRequest, NextResponse } from 'next/server';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { normalizeWorkDates, normalizeEducationDates, normalizeProjectDates } from '@/lib/utils/dateNormalization';
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
  gpa?: string;
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
    const startTime = Date.now();
    const parsedData = await parseDocument(file);
    const parseTime = Date.now() - startTime;
    
    // Add comprehensive debugging
    console.log('=== CV PARSING RESULTS ===');
    console.log('Parse time:', parseTime + 'ms');
    console.log('File type:', file.type);
    console.log('File size:', file.size + ' bytes');
    console.log('Personal info found:', !!(parsedData.basics?.name || parsedData.basics?.email));
    console.log('Work experience entries:', parsedData.work?.length || 0);
    console.log('Education entries:', parsedData.education?.length || 0);
    console.log('Skills categories:', parsedData.skills?.length || 0);
    console.log('Projects found:', parsedData.projects?.length || 0);
    console.log('Parsed CV data structure:', JSON.stringify(parsedData, null, 2));
    
    // Check if we got filename-based data
    if (parsedData.basics.summary && parsedData.basics.summary.includes('CV parsing encountered an issue')) {
      console.log('⚠️ WARNING: Using filename-based fallback data');
    }
    
    // Validate parsing results
    const hasPersonalInfo = !!(parsedData.basics?.name || parsedData.basics?.email);
    const hasWorkExperience = (parsedData.work?.length || 0) > 0;
    const hasEducation = (parsedData.education?.length || 0) > 0;
    const hasSkills = (parsedData.skills?.length || 0) > 0;
    
    console.log('=== PARSING VALIDATION ===');
    console.log('Has personal info:', hasPersonalInfo);
    console.log('Has work experience:', hasWorkExperience);
    console.log('Has education:', hasEducation);
    console.log('Has skills:', hasSkills);
    
    // Ensure we always return a valid structure
    const responseData = {
      ...parsedData,
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
          console.log('🔍 Processing PDF file...');
          console.log('📄 File size:', buffer.length, 'bytes');
          console.log('📦 pdf-parse available:', !!pdfParse);
          
          // Method 1: Try pdf-parse first (most reliable)
          if (pdfParse) {
            try {
              console.log('🔄 Attempting PDF parsing with pdf-parse...');
              const pdfData = await pdfParse(buffer, {
                // Add options to improve parsing
                max: 0, // Parse all pages
                version: 'v1.10.100' // Use specific version
              });
              extractedText = pdfData.text || '';
              console.log('📊 PDF parsing with pdf-parse - text length:', extractedText.length);
              console.log('📊 PDF info - pages:', pdfData.numpages);
              console.log('📊 First 500 chars:', extractedText.substring(0, 500));
              
              // If we got good text, use it
              if (extractedText && extractedText.trim().length > 100) {
                console.log('✅ PDF parsing successful with pdf-parse');
                return await parseTextToStructuredData(extractedText);
              } else {
                console.log('⚠️ pdf-parse extracted insufficient text (', extractedText.trim().length, 'chars), trying fallback methods...');
              }
            } catch (pdfError) {
              console.error('❌ pdf-parse failed:', pdfError instanceof Error ? pdfError.message : String(pdfError));
              console.error('❌ Error stack:', pdfError instanceof Error ? pdfError.stack : 'No stack');
              // Try with different options
              try {
                console.log('🔄 Retrying pdf-parse with different options...');
                const pdfData = await pdfParse(buffer, {
                  max: 10, // Limit to 10 pages
                  version: 'default'
                });
                extractedText = pdfData.text || '';
                console.log('📊 PDF parsing retry - text length:', extractedText.length);
                if (extractedText && extractedText.trim().length > 100) {
                  console.log('✅ PDF parsing successful on retry');
                  return await parseTextToStructuredData(extractedText);
                }
              } catch (retryError) {
                console.error('❌ pdf-parse retry failed:', retryError instanceof Error ? retryError.message : String(retryError));
              }
            }
          } else {
            console.error('❌ pdf-parse library not available - cannot parse PDF');
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
                console.warn(`Failed to process page ${i}:`, pageError instanceof Error ? pageError.message : String(pageError));
              }
            }
            
            extractedText = textContent.join('\n');
            console.log('PDF parsing with pdfjs-dist - text length:', extractedText.length);
            
            if (extractedText && extractedText.trim().length > 100) {
              console.log('✅ PDF parsing successful with pdfjs-dist');
              return await parseTextToStructuredData(extractedText);
            } else {
              console.log('⚠️ pdfjs-dist extracted insufficient text, trying OCR...');
            }
          } catch (pdfjsError) {
            console.warn('pdfjs-dist failed:', pdfjsError instanceof Error ? pdfjsError.message : String(pdfjsError));
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
                  console.warn('OCR failed for page:', ocrError instanceof Error ? ocrError.message : String(ocrError));
                }
              }
              
              await worker.terminate();
              console.log('PDF OCR parsing - text length:', extractedText.length);
              
              if (extractedText && extractedText.trim().length > 100) {
                console.log('✅ PDF parsing successful with OCR');
                return await parseTextToStructuredData(extractedText);
              } else {
                console.log('⚠️ OCR extracted insufficient text');
              }
            } else {
              console.log('⚠️ OCR libraries not available or no pages converted');
            }
          } catch (ocrError) {
            console.warn('PDF OCR parsing failed:', ocrError instanceof Error ? ocrError.message : String(ocrError));
          }
      
          // If all methods failed, provide helpful error message
          if (!extractedText || extractedText.trim().length < 10) {
            console.error('❌ All PDF parsing methods failed - no text extracted');
            console.error('❌ Extracted text length:', extractedText ? extractedText.length : 0);
            console.error('❌ File size:', buffer.length, 'bytes');
            console.error('❌ This might be a scanned PDF, image-based PDF, or password-protected PDF');
            
            // Return a more user-friendly structure with instructions
            const fallbackResult = getEmptyStructure();
            fallbackResult.basics.summary = '⚠️ Unable to extract text from this PDF. This might be a scanned PDF or image-based PDF. Please try:\n\n1. Converting to DOCX format\n2. Using a text-based PDF\n3. Uploading a different version of your CV';
            
            console.log('✅ Returning fallback structure with error message');
            return fallbackResult;
          }
    } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      console.log('Processing DOCX file...');
      
      // Method 1: Try mammoth first
      if (mammoth) {
        try {
          console.log('Attempting DOCX parsing with mammoth...');
          const result = await mammoth.extractRawText({ buffer });
          extractedText = result.value || '';
          console.log('DOCX parsing with mammoth - text length:', extractedText.length);
          
          if (extractedText && extractedText.trim().length > 100) {
            console.log('✅ DOCX parsing successful with mammoth');
            return await parseTextToStructuredData(extractedText);
          } else {
            console.log('⚠️ mammoth extracted insufficient text, trying fallback...');
          }
        } catch (docxError) {
          console.warn('mammoth failed:', docxError instanceof Error ? docxError.message : String(docxError));
        }
      } else {
        console.log('⚠️ mammoth library not available');
      }
      
      // Method 2: Try docx library as fallback
      try {
        console.log('Attempting DOCX parsing with docx library...');
        const docx = require('docx');
        const doc = await docx.Document.load(buffer);
        extractedText = doc.paragraphs.map((p: any) => p.text).join('\n');
        console.log('DOCX parsing with docx library - text length:', extractedText.length);
        
        if (extractedText && extractedText.trim().length > 100) {
          console.log('✅ DOCX parsing successful with docx library');
          return await parseTextToStructuredData(extractedText);
        } else {
          console.log('⚠️ docx library extracted insufficient text');
        }
      } catch (docxError) {
        console.warn('docx library failed:', docxError instanceof Error ? docxError.message : String(docxError));
      }
      
      // If all methods failed, provide helpful error message
      if (!extractedText || extractedText.trim().length < 10) {
        console.error('All DOCX parsing methods failed');
        throw new Error('Unable to extract text from DOCX file. Please try:\n\n1. Converting to PDF format\n2. Copy-pasting the text content\n3. Using a different DOCX file');
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
    console.log('Extracted education (before normalization):', educationData);
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
    // Normalize dates to YYYY-MM format for form compatibility
    result.education = normalizeEducationDates(result.education);
    console.log('Extracted education (after normalization):', result.education);
  } catch (error) {
    console.error('Error extracting education:', error);
    result.education = [];
  }
  
  try {
    const experienceData = extractExperience(text);
    console.log('Extracted experience (before normalization):', experienceData);
    result.work = experienceData.map(exp => ({
      name: exp.company,
      position: exp.position,
      url: '',
      startDate: exp.startDate,
      endDate: exp.endDate,
      summary: exp.description,
      highlights: exp.achievements
    }));
    // Normalize dates to YYYY-MM format for form compatibility
    result.work = normalizeWorkDates(result.work);
    console.log('Extracted experience (after normalization):', result.work);
  } catch (error) {
    console.error('Error extracting experience:', error);
    result.work = [];
  }
  
  try {
    const skillsData = extractSkills(text);
    console.log('Extracted skills:', skillsData);
    result.skills = skillsData.map(skill => ({
      category: skill.category,
      skills: skill.skills
    }));
  } catch (error) {
    console.error('Error extracting skills:', error);
    result.skills = [];
  }
  
  try {
    const projectsData = extractProjects(text);
    console.log('Extracted projects (before normalization):', projectsData);
    result.projects = projectsData.map(proj => ({
      name: proj.title,
      startDate: proj.startDate || '',
      endDate: proj.endDate || '',
      description: proj.description,
      highlights: proj.technologies || [],
      keywords: proj.technologies || [],
      url: proj.url || ''
    }));
    // Normalize dates to YYYY-MM format for form compatibility
    result.projects = normalizeProjectDates(result.projects);
    console.log('Extracted projects (after normalization):', result.projects);
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

function extractPersonalInfo(text: string): Partial<PersonalInfo> {
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
  console.log('First 20 lines:', lines.slice(0, 20));
  
  // Check first 20 lines for name
  for (const line of lines.slice(0, 20)) {
    // More flexible name pattern
    if (line.length < 100 && 
        /^[A-Za-z\s\-'\.]+$/.test(line) && 
        line.split(' ').length >= 2 && 
        line.split(' ').length <= 4 &&
        !line.toLowerCase().includes('email') &&
        !line.toLowerCase().includes('phone') &&
        !line.toLowerCase().includes('address') &&
        !line.toLowerCase().includes('experience') &&
        !line.toLowerCase().includes('education') &&
        !line.toLowerCase().includes('skills')) {
      
      const nameParts = line.split(' ');
      personalInfo.firstName = nameParts[0];
      personalInfo.lastName = nameParts.slice(1).join(' ');
      console.log('Found name:', personalInfo.firstName, personalInfo.lastName);
      break;
    }
  }
  
  // Fallback: if no name found, try first line of document
  if (!personalInfo.firstName && lines.length > 0) {
    const firstLine = lines[0];
    if (firstLine.length < 100 && firstLine.split(' ').length >= 2 && firstLine.split(' ').length <= 4) {
      const nameParts = firstLine.split(' ');
      personalInfo.firstName = nameParts[0];
      personalInfo.lastName = nameParts.slice(1).join(' ');
      console.log('Found name from first line:', personalInfo.firstName, personalInfo.lastName);
    }
  }
  
  // Extract location (improved patterns for city, state/country)
  const locationPatterns = [
    /([A-Za-z\s]+,\s*[A-Za-z\s]{2,})/g,  // City, State/Country
    /([A-Za-z\s]+,\s*[A-Z]{2})/g,        // City, State (2 letters)
    /([A-Za-z\s]+,\s*[A-Za-z\s]+,\s*[A-Za-z\s]+)/g  // City, State, Country
  ];
  
  for (const pattern of locationPatterns) {
    const locationMatch = text.match(pattern);
    if (locationMatch) {
      const location = locationMatch[0].trim();
      // Only take the first location found and make sure it's not too long
      if (location.length < 50 && !location.includes('\n') && !location.toLowerCase().includes('email')) {
        personalInfo.location = location;
        console.log('Found location:', personalInfo.location);
        break;
      }
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
    for (const paragraph of paragraphs.slice(0, 5)) { // Check more paragraphs
      // Skip if it looks like contact info, education, or experience
      if (!paragraph.toLowerCase().includes('email') && 
          !paragraph.toLowerCase().includes('phone') &&
          !paragraph.toLowerCase().includes('university') &&
          !paragraph.toLowerCase().includes('college') &&
          !paragraph.toLowerCase().includes('experience') &&
          !paragraph.toLowerCase().includes('work') &&
          !paragraph.toLowerCase().includes('education') &&
          !paragraph.toLowerCase().includes('skills') &&
          paragraph.split(' ').length > 10) {
        personalInfo.summary = paragraph.substring(0, 500);
        console.log('Found summary from paragraph:', personalInfo.summary.substring(0, 100) + '...');
        break;
      }
    }
  }
  
  // Final fallback: extract from first substantial line if no summary found
  if (!personalInfo.summary) {
    for (const line of lines.slice(0, 10)) {
      if (line.length > 50 && line.length < 300 && 
          !line.toLowerCase().includes('email') &&
          !line.toLowerCase().includes('phone') &&
          !line.toLowerCase().includes('experience') &&
          !line.toLowerCase().includes('education') &&
          line.split(' ').length > 10) {
        personalInfo.summary = line.substring(0, 500);
        console.log('Found summary from line:', personalInfo.summary.substring(0, 100) + '...');
        break;
      }
    }
  }
  
  console.log('Extracted personal info:', personalInfo);
  return personalInfo;
}

function extractEducation(text: string): Education[] {
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
        
        // Try multiple parsing formats
        // Format 1: "Degree in Field, University"
        const degreeInFieldMatch = educationLine.match(/^([^,]+),\s*([^,]+)(?:,\s*(.+))?$/);
        if (degreeInFieldMatch) {
          degree = degreeInFieldMatch[1].trim();
          institution = degreeInFieldMatch[2].trim();
          if (degreeInFieldMatch[3]) {
            field = degreeInFieldMatch[3].trim();
          }
        } else {
          // Format 2: "University, Degree in Field"
          const universityDegreeMatch = educationLine.match(/^([^,]+),\s*([^,]+)$/);
          if (universityDegreeMatch) {
            institution = universityDegreeMatch[1].trim();
            const degreeField = universityDegreeMatch[2].trim();
            
            // Try to separate degree and field
            const fieldMatch = degreeField.match(/in\s+([^,]+)/i);
            if (fieldMatch) {
              degree = degreeField.replace(/in\s+[^,]+/i, '').trim();
              field = fieldMatch[1].trim();
            } else {
              degree = degreeField;
            }
          } else {
            // Format 3: "Degree in Field at University"
            const degreeAtMatch = educationLine.match(/^(.+?)\s+at\s+(.+)$/i);
            if (degreeAtMatch) {
              const degreeField = degreeAtMatch[1].trim();
              institution = degreeAtMatch[2].trim();
              
              // Try to separate degree and field
              const fieldMatch = degreeField.match(/in\s+([^,]+)/i);
              if (fieldMatch) {
                degree = degreeField.replace(/in\s+[^,]+/i, '').trim();
                field = fieldMatch[1].trim();
              } else {
                degree = degreeField;
              }
            } else {
              // Format 4: "University | Degree in Field"
              const universityPipeMatch = educationLine.match(/^(.+?)\s*\|\s*(.+)$/);
              if (universityPipeMatch) {
                institution = universityPipeMatch[1].trim();
                const degreeField = universityPipeMatch[2].trim();
                
                // Try to separate degree and field
                const fieldMatch = degreeField.match(/in\s+([^,]+)/i);
                if (fieldMatch) {
                  degree = degreeField.replace(/in\s+[^,]+/i, '').trim();
                  field = fieldMatch[1].trim();
                } else {
                  degree = degreeField;
                }
              } else {
                // Try to extract degree type and parse remaining
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
            }
          }
        }
        
        // Extract GPA/score (improved patterns)
        let gpa = '';
        const gpaPatterns = [
          /\b(?:gpa|grade point average|cgpa|cumulative gpa)\s*:?\s*(\d+\.?\d*)\s*(?:out of\s*(\d+\.?\d*))?/i,
          /\b(\d+\.?\d*)\s*\/\s*(\d+\.?\d*)\s*(?:gpa|grade point average)/i,
          /\b(\d+\.?\d*)\s*(?:gpa|grade point average)/i,
          /\b(?:gpa|grade point average)\s*(\d+\.?\d*)/i,
          /\b(\d+\.?\d*)\s*(?:out of|\/)\s*(\d+\.?\d*)/i
        ];
        
        for (const pattern of gpaPatterns) {
          const gpaMatch = educationLine.match(pattern);
          if (gpaMatch) {
            if (gpaMatch[2]) {
              // Has denominator (e.g., "3.8/4.0")
              gpa = `${gpaMatch[1]}/${gpaMatch[2]}`;
            } else {
              // Just the GPA value
              gpa = gpaMatch[1];
            }
            console.log('Found GPA:', gpa);
            break;
          }
        }
        
        // Check for "Expected graduation" or "Current" status
        const isCurrent = /\b(expected|current|ongoing|in progress|present)\b/i.test(educationLine);
        
        currentEducation = {
          institution: institution,
          degree: degree,
          field: field,
          startDate: startDate,
          endDate: endDate,
          current: isCurrent,
          description: '',
          gpa: gpa
        };
        console.log('Parsed education:', { institution, degree, field, startDate, endDate, gpa, isCurrent });
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
      
      // Look for field of study (expanded patterns)
      if (currentEducation && !currentEducation.field) {
        const fieldPatterns = [
          /\b(computer science|engineering|business|arts|science|technology|mathematics|physics|chemistry|biology|economics|psychology|sociology|history|literature|philosophy|medicine|law|architecture|design|accounting|finance|marketing|management|human resources|communications|journalism|education|nursing|pharmacy|dentistry|veterinary|agriculture|environmental|geology|astronomy|statistics|data science|artificial intelligence|machine learning|cybersecurity|information systems|software engineering|computer engineering|electrical engineering|mechanical engineering|civil engineering|chemical engineering|biomedical engineering|aerospace engineering|industrial engineering|materials science|biotechnology|genetics|neuroscience|political science|international relations|public administration|social work|criminal justice|criminology|anthropology|geography|linguistics|foreign languages|english|spanish|french|german|chinese|japanese|arabic|russian|portuguese|italian|korean|hindi|urdu|bengali|tamil|telugu|marathi|gujarati|punjabi|malayalam|kannada|odia|assamese|nepali|sinhala|thai|vietnamese|indonesian|malay|tagalog|swahili|amharic|hausa|yoruba|igbo|zulu|xhosa|afrikaans|dutch|swedish|norwegian|danish|finnish|icelandic|greek|turkish|hebrew|persian|urdu|bengali|tamil|telugu|marathi|gujarati|punjabi|malayalam|kannada|odia|assamese|nepali|sinhala|thai|vietnamese|indonesian|malay|tagalog|swahili|amharic|hausa|yoruba|igbo|zulu|xhosa|afrikaans|dutch|swedish|norwegian|danish|finnish|icelandic|greek|turkish|hebrew|persian)\b/i,
          /\bin\s+([^,]+)/i,
          /\bof\s+([^,]+)/i,
          /\bmajor\s+in\s+([^,]+)/i,
          /\bconcentration\s+in\s+([^,]+)/i,
          /\bspecialization\s+in\s+([^,]+)/i
        ];
        
        for (const pattern of fieldPatterns) {
          const fieldMatch = originalLine.match(pattern);
          if (fieldMatch) {
            currentEducation.field = fieldMatch[1] ? fieldMatch[1].trim() : originalLine;
            console.log('Found field:', currentEducation.field);
            break;
          }
        }
      }
      
      if (currentEducation && !currentEducation.field && 
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

function extractExperience(text: string): Experience[] {
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
      // Simplified job title detection - look for common patterns
      const isJobTitle = originalLine.length < 200 && 
          (
           // Look for bullet points or numbered items that might be job entries
           /^[•\-\*\d+\.]/.test(originalLine) ||
           // Look for lines with dates that might be job entries
           /\b(19|20)\d{2}\b/.test(originalLine) ||
           // Look for common job title keywords
           /\b(manager|developer|engineer|analyst|coordinator|specialist|director|lead|consultant|designer|architect|scientist|researcher|teacher|professor|assistant|supervisor|executive|officer|representative|associate|junior|senior|principal|chief|head|vice|president|ceo|cto|cfo|coo|intern|trainee|apprentice|software|web|frontend|backend|fullstack|data|devops|cloud|mobile|react|angular|vue|node|python|java|javascript|typescript|php|ruby|go|rust|swift|kotlin|database|sql|nosql|api|microservices|kubernetes|docker|aws|azure|gcp)\b/i.test(originalLine) ||
           // Look for company names with common suffixes
           /\b[A-Z][a-z]+\s+(Inc|Ltd|LLC|Corp|Company|Technologies|Solutions|Systems|Services|Group|Consulting|Partners|Enterprises|Ventures|Holdings|International|Global|Digital|Software|Tech|IT|Startup|Agency|Firm|Organization|Institute|University|College|School|Hospital|Clinic|Bank|Financial|Insurance|Retail|Manufacturing|Construction|Real Estate|Media|Marketing|Advertising|Sales|Customer Service|HR|Human Resources|Operations|Logistics|Supply Chain|Quality|Compliance|Legal|Finance|Accounting|Audit|Tax|Business|Strategy|Management|Administration|Support|Help Desk|Technical|Maintenance|Security|Networking|Infrastructure|Platform|Application|Product|Project|Program|Initiative|Campaign|Research|Development|Innovation|Transformation|Optimization|Automation|Integration|Implementation|Deployment|Migration|Upgrade|Maintenance|Support|Troubleshooting|Testing|QA|Quality Assurance|Validation|Verification|Documentation|Training|Mentoring|Coaching|Leadership|Team|Collaboration|Communication|Presentation|Reporting|Analysis|Planning|Strategy|Budget|Forecast|Metrics|KPI|Dashboard|Report|Presentation|Proposal|Proposal|Contract|Agreement|Negotiation|Vendor|Supplier|Client|Customer|Stakeholder|Partner|Collaborator|Colleague|Peer|Subordinate|Supervisor|Manager|Director|VP|Vice President|President|CEO|CTO|CFO|COO|Founder|Co-founder|Owner|Entrepreneur|Freelancer|Contractor|Consultant|Advisor|Mentor|Coach|Trainer|Instructor|Professor|Teacher|Researcher|Scientist|Engineer|Developer|Programmer|Coder|Architect|Designer|Analyst|Specialist|Coordinator|Administrator|Assistant|Representative|Officer|Executive|Director|Manager|Supervisor|Lead|Senior|Junior|Principal|Chief|Head|Vice|President|CEO|CTO|CFO|COO|Intern|Trainee|Apprentice)\b/.test(originalLine) ||
           // Look for lines with "at" or "|" or "-" separators
           /\s+(at|@|\||-)\s+/.test(originalLine) ||
           // Look for lines that start with capital letters and contain common job-related words
           (/^[A-Z]/.test(originalLine) && /\b(company|corporation|firm|agency|organization|institute|university|college|school|hospital|clinic|bank|financial|insurance|retail|manufacturing|construction|real estate|media|marketing|advertising|sales|customer service|hr|human resources|operations|logistics|supply chain|quality|compliance|legal|finance|accounting|audit|tax|business|strategy|management|administration|support|help desk|technical|maintenance|security|networking|infrastructure|platform|application|product|project|program|initiative|campaign|research|development|innovation|transformation|optimization|automation|integration|implementation|deployment|migration|upgrade|maintenance|support|troubleshooting|testing|qa|quality assurance|validation|verification|documentation|training|mentoring|coaching|leadership|team|collaboration|communication|presentation|reporting|analysis|planning|strategy|budget|forecast|metrics|kpi|dashboard|report|presentation|proposal|proposal|contract|agreement|negotiation|vendor|supplier|client|customer|stakeholder|partner|collaborator|colleague|peer|subordinate|supervisor|manager|director|vp|vice president|president|ceo|cto|cfo|coo|founder|co-founder|owner|entrepreneur|freelancer|contractor|consultant|advisor|mentor|coach|trainer|instructor|professor|teacher|researcher|scientist|engineer|developer|programmer|coder|architect|designer|analyst|specialist|coordinator|administrator|assistant|representative|officer|executive|director|manager|supervisor|lead|senior|junior|principal|chief|head|vice|president|ceo|cto|cfo|coo|intern|trainee|apprentice)\b/i.test(originalLine))
          );
      
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
        
        // Try multiple parsing formats
        // Format 1: "Company, Position"
        const companyPositionMatch = experienceLine.match(/^([^,]+),\s*([^,]+)$/);
        if (companyPositionMatch) {
          company = companyPositionMatch[1].trim();
          position = companyPositionMatch[2].trim();
        } else {
          // Format 2: "Position at Company"
          const positionAtMatch = experienceLine.match(/^(.+?)\s+at\s+(.+)$/i);
          if (positionAtMatch) {
            position = positionAtMatch[1].trim();
            company = positionAtMatch[2].trim();
          } else {
            // Format 3: "Position - Company"
            const positionDashMatch = experienceLine.match(/^(.+?)\s*-\s*(.+)$/);
            if (positionDashMatch) {
              position = positionDashMatch[1].trim();
              company = positionDashMatch[2].trim();
            } else {
              // Format 4: "Position | Company"
              const positionPipeMatch = experienceLine.match(/^(.+?)\s*\|\s*(.+)$/);
              if (positionPipeMatch) {
                position = positionPipeMatch[1].trim();
                company = positionPipeMatch[2].trim();
              } else {
                // Format 5: "Position @ Company"
                const positionAtMatch2 = experienceLine.match(/^(.+?)\s+@\s+(.+)$/);
                if (positionAtMatch2) {
                  position = positionAtMatch2[1].trim();
                  company = positionAtMatch2[2].trim();
                } else {
                  // Format 6: "Company | Position" (reverse order)
                  const companyPipeMatch = experienceLine.match(/^(.+?)\s*\|\s*(.+)$/);
                  if (companyPipeMatch) {
                    company = companyPipeMatch[1].trim();
                    position = companyPipeMatch[2].trim();
                  } else {
                    // Fallback: use the whole line as position
                    position = experienceLine;
                  }
                }
              }
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
        // Collect description lines and achievements
        if (originalLine.length > 10) {
          // Check if it's a bullet point or achievement
          if (/^[•\-\*\d+\.\s]/.test(originalLine) || originalLine.includes('•') || originalLine.includes('-') || originalLine.includes('*')) {
            // This is an achievement or bullet point
            const achievement = originalLine.replace(/^[•\-\*\d+\.\s]+/, '').trim();
            if (achievement.length > 5) {
              currentExperience.achievements = currentExperience.achievements || [];
              currentExperience.achievements.push(achievement);
              console.log('Added achievement:', achievement);
            }
          } else {
            // Regular description line
            descriptionLines.push(originalLine);
            console.log('Added description line:', originalLine);
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

function extractSkills(text: string): Skills[] {
  const skills: Skills[] = [];
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  console.log('Extracting skills from', lines.length, 'lines');
  
  // Common technical skills dictionary for better recognition
  const technicalSkills = [
    'javascript', 'python', 'java', 'react', 'angular', 'vue', 'node', 'express', 'mongodb', 'mysql', 'postgresql',
    'aws', 'azure', 'docker', 'kubernetes', 'git', 'github', 'html', 'css', 'bootstrap', 'tailwind', 'typescript',
    'php', 'ruby', 'go', 'rust', 'swift', 'kotlin', 'android', 'ios', 'flutter', 'react native', 'next.js',
    'django', 'flask', 'spring', 'laravel', 'rails', 'express', 'fastapi', 'graphql', 'rest', 'api',
    'machine learning', 'ai', 'artificial intelligence', 'data science', 'pandas', 'numpy', 'tensorflow', 'pytorch',
    'scikit-learn', 'jupyter', 'tableau', 'power bi', 'excel', 'sql', 'nosql', 'redis', 'elasticsearch',
    'microservices', 'serverless', 'lambda', 'cloud', 'devops', 'ci/cd', 'jenkins', 'gitlab', 'github actions',
    'linux', 'ubuntu', 'centos', 'windows', 'macos', 'bash', 'shell', 'powershell', 'vim', 'emacs',
    'agile', 'scrum', 'kanban', 'jira', 'confluence', 'slack', 'teams', 'zoom', 'figma', 'sketch', 'adobe',
    'photoshop', 'illustrator', 'indesign', 'premiere', 'after effects', 'blender', 'maya', '3ds max',
    'unity', 'unreal', 'godot', 'game development', 'mobile development', 'web development', 'frontend',
    'backend', 'fullstack', 'full-stack', 'full stack', 'ui/ux', 'user interface', 'user experience',
    'responsive design', 'accessibility', 'seo', 'sem', 'analytics', 'google analytics', 'mixpanel',
    'amplitude', 'hotjar', 'optimizely', 'ab testing', 'a/b testing', 'conversion optimization',
    'digital marketing', 'social media', 'content marketing', 'email marketing', 'ppc', 'google ads',
    'facebook ads', 'linkedin ads', 'twitter ads', 'instagram ads', 'youtube ads', 'tiktok ads',
    'blockchain', 'cryptocurrency', 'bitcoin', 'ethereum', 'smart contracts', 'solidity', 'web3',
    'nft', 'defi', 'dao', 'metaverse', 'vr', 'ar', 'virtual reality', 'augmented reality',
    'iot', 'internet of things', 'raspberry pi', 'arduino', 'sensors', 'automation', 'robotics',
    'cybersecurity', 'security', 'penetration testing', 'ethical hacking', 'vulnerability assessment',
    'compliance', 'gdpr', 'hipaa', 'sox', 'pci', 'iso', 'certification', 'cissp', 'ceh', 'security+'
  ];
  
  // Common soft skills
  const softSkills = [
    'leadership', 'teamwork', 'collaboration', 'communication', 'presentation', 'public speaking',
    'problem solving', 'critical thinking', 'analytical', 'creative', 'innovative', 'adaptable',
    'flexible', 'time management', 'project management', 'organization', 'planning', 'strategic',
    'mentoring', 'coaching', 'training', 'teaching', 'customer service', 'client relations',
    'negotiation', 'sales', 'marketing', 'business development', 'relationship building',
    'emotional intelligence', 'empathy', 'patience', 'resilience', 'stress management',
    'conflict resolution', 'mediation', 'facilitation', 'networking', 'relationship management'
  ];
  
  let inSkillsSection = false;
  let currentCategory = 'Technical Skills';
  
  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    
    // Check if we're entering skills section (more flexible)
    if (['skills', 'competencies', 'technologies', 'tools', 'languages', 'frameworks', 'expertise', 'proficiencies'].some(keyword => lowerLine.includes(keyword)) && line.length < 50) {
      inSkillsSection = true;
      console.log('Entering skills section:', line);
      continue;
    }
    
    // Also check for all caps section headers
    if (['SKILLS', 'TECHNICAL SKILLS', 'COMPETENCIES', 'TECHNOLOGIES', 'TOOLS'].includes(line)) {
      inSkillsSection = true;
      console.log('Entering skills section (all caps):', line);
      continue;
    }
    
    // Check if we're leaving skills section
    if (inSkillsSection && (lowerLine.includes('experience') || lowerLine.includes('education') || lowerLine.includes('projects') || lowerLine.includes('certificates') || lowerLine.includes('awards'))) {
      inSkillsSection = false;
      console.log('Leaving skills section');
      continue;
    }
    
    // Look for skills throughout the document, not just in skills section
    if (line.length > 0) {
      // Check if this line is a category header
      if (lowerLine.includes('technical') || lowerLine.includes('programming') || lowerLine.includes('software') || lowerLine.includes('development')) {
        currentCategory = 'Technical Skills';
        console.log('Found technical skills category');
        continue;
      } else if (lowerLine.includes('soft') || lowerLine.includes('interpersonal') || lowerLine.includes('communication') || lowerLine.includes('leadership')) {
        currentCategory = 'Soft Skills';
        console.log('Found soft skills category');
        continue;
      } else if (lowerLine.includes('language') || lowerLine.includes('spoken') || lowerLine.includes('languages')) {
        currentCategory = 'Languages';
        console.log('Found languages category');
        continue;
      }
      
      // Split skills by common delimiters
      const skillList = line.split(/[,;|•\-*\n]/).map(skill => skill.trim()).filter(skill => skill.length > 0);
      
      if (skillList.length > 0) {
        // Categorize skills automatically
        const technicalSkillsFound = skillList.filter(skill => 
          technicalSkills.some(tech => lowerLine.includes(tech.toLowerCase()) || skill.toLowerCase().includes(tech.toLowerCase()))
        );
        
        const softSkillsFound = skillList.filter(skill => 
          softSkills.some(soft => lowerLine.includes(soft.toLowerCase()) || skill.toLowerCase().includes(soft.toLowerCase()))
        );
        
        // Add technical skills
        if (technicalSkillsFound.length > 0) {
          let existingCategory = skills.find(s => s.category === 'Technical Skills');
          if (!existingCategory) {
            existingCategory = {
              category: 'Technical Skills',
              skills: []
            };
            skills.push(existingCategory);
          }
          existingCategory.skills.push(...technicalSkillsFound);
          console.log('Added technical skills:', technicalSkillsFound);
        }
        
        // Add soft skills
        if (softSkillsFound.length > 0) {
          let existingCategory = skills.find(s => s.category === 'Soft Skills');
          if (!existingCategory) {
            existingCategory = {
              category: 'Soft Skills',
              skills: []
            };
            skills.push(existingCategory);
          }
          existingCategory.skills.push(...softSkillsFound);
          console.log('Added soft skills:', softSkillsFound);
        }
        
        // Add remaining skills to current category
        const remainingSkills = skillList.filter(skill => 
          !technicalSkillsFound.includes(skill) && !softSkillsFound.includes(skill)
        );
        
        if (remainingSkills.length > 0) {
          let existingCategory = skills.find(s => s.category === currentCategory);
          if (!existingCategory) {
            existingCategory = {
              category: currentCategory,
              skills: []
            };
            skills.push(existingCategory);
          }
          existingCategory.skills.push(...remainingSkills);
          console.log('Added skills to', currentCategory, ':', remainingSkills);
        }
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