import { NextRequest, NextResponse } from 'next/server';
// @ts-ignore - pdf-parse doesn't have types
let pdfParse: any;
let mammoth: any;
let createWorker: any;

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

interface CVData {
  personalInfo: PersonalInfo;
  education: Education[];
  experience: Experience[];
  skills: Skills[];
  projects: Project[];
}

// Add GET method for testing
export async function GET() {
  console.log('CV Parse API test endpoint called');
  
  const testData = getEmptyStructure();
  testData.personalInfo.firstName = 'Test';
  testData.personalInfo.lastName = 'User';
  testData.personalInfo.email = 'test@example.com';
  testData.personalInfo.summary = 'This is a test CV structure to verify the API is working.';
  
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
    if (parsedData.personalInfo.summary && parsedData.personalInfo.summary.includes('CV parsing encountered an issue')) {
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
    
    // Return a basic structure even on error to prevent client-side failures
    const fallbackData = getEmptyStructure();
    fallbackData.personalInfo.summary = 'An error occurred during CV parsing. Please enter your information manually.';
    
    // Add error info to help with debugging
    const responseData = {
      ...fallbackData,
      _error: error instanceof Error ? error.message : 'Unknown error',
      _parsed: false,
      _timestamp: new Date().toISOString()
    };
    
    return NextResponse.json(responseData, { status: 200 }); // Return 200 with empty data instead of 500
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
      if (pdfParse) {
        try {
          console.log('Attempting PDF parsing...');
          const pdfData = await pdfParse(buffer);
          extractedText = pdfData.text || '';
          console.log('PDF parsing successful, text length:', extractedText.length);
        } catch (pdfError) {
          console.error('PDF parsing failed:', pdfError);
          extractedText = '';
        }
      } else {
        console.log('PDF parsing library not available');
        extractedText = '';
      }
    } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      if (mammoth) {
        try {
          console.log('Attempting DOCX parsing...');
          const result = await mammoth.extractRawText({ buffer });
          extractedText = result.value || '';
          console.log('DOCX parsing successful, text length:', extractedText.length);
        } catch (docxError) {
          console.error('DOCX parsing failed:', docxError);
          extractedText = '';
        }
      } else {
        console.log('DOCX parsing library not available');
        extractedText = '';
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
function createBasicStructureFromFilename(filename: string): CVData {
  const result = getEmptyStructure();
  
  // Try to extract name from filename
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, ''); // Remove extension
  const nameMatch = nameWithoutExt.match(/([a-zA-Z]+)[-_\s]+([a-zA-Z]+)/);
  
  if (nameMatch) {
    result.personalInfo.firstName = nameMatch[1];
    result.personalInfo.lastName = nameMatch[2];
    
    // Add a helpful message in summary
    result.personalInfo.summary = 'CV parsing encountered an issue. Please update your information manually.';
  }
  
  return result;
}

function parseTextToStructuredData(text: string) {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  const result = getEmptyStructure();
  
  // Add debugging
  console.log('Parsing text with', lines.length, 'lines');
  
  // Extract personal information
  const personalInfo = extractPersonalInfo(text);
  console.log('Extracted personal info:', personalInfo);
  result.personalInfo = { ...result.personalInfo, ...personalInfo };
  
  // Extract sections
  result.education = extractEducation(text);
  console.log('Extracted education:', result.education);
  
  result.experience = extractExperience(text);
  console.log('Extracted experience:', result.experience);
  
  result.skills = extractSkills(text);
  console.log('Extracted skills:', result.skills);
  
  result.projects = extractProjects(text);
  console.log('Extracted projects:', result.projects);
  
  return result;
}

// Helper function to check if parsed data is empty
function isEmptyParsedData(data: CVData): boolean {
  const hasPersonalInfo = data.personalInfo.firstName || data.personalInfo.lastName || data.personalInfo.email;
  const hasEducation = data.education.length > 0;
  const hasExperience = data.experience.length > 0;
  const hasSkills = data.skills.length > 0;
  const hasProjects = data.projects.length > 0;
  
  console.log('Checking if parsed data is empty:');
  console.log('- hasPersonalInfo:', hasPersonalInfo, '(firstName:', data.personalInfo.firstName, 'lastName:', data.personalInfo.lastName, 'email:', data.personalInfo.email, ')');
  console.log('- hasEducation:', hasEducation, '(count:', data.education.length, ')');
  console.log('- hasExperience:', hasExperience, '(count:', data.experience.length, ')');
  console.log('- hasSkills:', hasSkills, '(count:', data.skills.length, ')');
  console.log('- hasProjects:', hasProjects, '(count:', data.projects.length, ')');
  
  const isEmpty = !hasPersonalInfo && !hasEducation && !hasExperience && !hasSkills && !hasProjects;
  console.log('- isEmpty:', isEmpty);
  
  return isEmpty;
}

// Create sample data with any extracted information
function createSampleDataWithExtractedInfo(text: string): CVData {
  const result = getEmptyStructure();
  
  // Try to extract at least basic info
  const personalInfo = extractPersonalInfo(text);
  result.personalInfo = { ...result.personalInfo, ...personalInfo };
  
  // If we still don't have a name, try to get it from the first few lines
  if (!result.personalInfo.firstName && !result.personalInfo.lastName) {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    for (const line of lines.slice(0, 3)) {
      if (line.length < 50 && line.split(' ').length >= 2 && line.split(' ').length <= 4) {
        const words = line.split(' ');
        result.personalInfo.firstName = words[0];
        result.personalInfo.lastName = words.slice(1).join(' ');
        break;
      }
    }
  }
  
  // Add a sample education entry if we found a name
  if (result.personalInfo.firstName || result.personalInfo.lastName) {
    result.education.push({
      institution: 'University (Please update)',
      degree: 'Degree (Please update)',
      field: 'Field of Study (Please update)',
      startDate: '2020',
      endDate: '2024',
      current: false,
      description: 'Please update with your education details'
    });
    
    // Add a sample experience entry
    result.experience.push({
      company: 'Company Name (Please update)',
      position: 'Position (Please update)',
      location: 'Location (Please update)',
      startDate: '2023',
      endDate: 'Present',
      current: true,
      description: 'Please update with your work experience details',
      achievements: ['Achievement 1 (Please update)', 'Achievement 2 (Please update)']
    });
    
    // Add sample skills
    result.skills.push({
      category: 'Technical Skills',
      skills: ['Skill 1 (Please update)', 'Skill 2 (Please update)', 'Skill 3 (Please update)']
    });
  }
  
  return result;
}

function getEmptyStructure(): CVData {
  return {
    personalInfo: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      location: '',
      linkedin: '',
      summary: ''
    },
    education: [],
    experience: [],
    skills: [],
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
  
  // Extract LinkedIn
  const linkedinMatch = text.match(/linkedin\.com\/in\/[\w-]+/i);
  if (linkedinMatch) {
    personalInfo.linkedin = linkedinMatch[0];
    console.log('Found LinkedIn:', personalInfo.linkedin);
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
      // Look for degree patterns
      if (/\b(bachelor|master|phd|doctorate|diploma|certificate|b\.?s\.?|m\.?s\.?|m\.?a\.?|b\.?a\.?)\b/i.test(originalLine)) {
        if (currentEducation && isValidEducation(currentEducation)) {
          education.push(completeEducation(currentEducation));
          console.log('Added education entry:', currentEducation);
        }
        currentEducation = {
          institution: '',
          degree: originalLine,
          field: '',
          startDate: '',
          endDate: '',
          current: false,
          description: ''
        };
        console.log('Found degree:', originalLine);
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
  const experienceKeywords = ['experience', 'work', 'employment', 'career', 'professional'];
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  console.log('Extracting experience from', lines.length, 'lines');
  
  let inExperienceSection = false;
  let currentExperience: Partial<Experience> | null = null;
  
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
    if (inExperienceSection && (line.includes('education') || line.includes('skills') || line.includes('projects'))) {
      inExperienceSection = false;
      if (currentExperience && isValidExperience(currentExperience)) {
        experience.push(completeExperience(currentExperience));
        console.log('Added experience entry:', currentExperience);
        currentExperience = null;
      }
      continue;
    }
    
    if (inExperienceSection) {
      // Look for job titles and companies (more flexible)
      if (originalLine.length < 150 && 
          (/\b(manager|developer|engineer|analyst|coordinator|specialist|director|lead|consultant|designer|architect|scientist|researcher|teacher|professor|assistant|coordinator|supervisor|executive|officer|representative|associate|junior|senior|principal|chief|head|vice|president|ceo|cto|cfo|coo)\b/i.test(originalLine) ||
           /\b(software|web|frontend|backend|fullstack|data|machine learning|ai|artificial intelligence|devops|cloud|mobile|ios|android|react|angular|vue|node|python|java|javascript|typescript|php|ruby|go|rust|swift|kotlin)\b/i.test(originalLine))) {
        if (currentExperience && isValidExperience(currentExperience)) {
          experience.push(completeExperience(currentExperience));
          console.log('Added experience entry:', currentExperience);
        }
        currentExperience = {
          company: '',
          position: originalLine,
          location: '',
          startDate: '',
          endDate: '',
          current: false,
          description: '',
          achievements: []
        };
        console.log('Found position:', originalLine);
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
    if (originalLine === 'SKILLS' || originalLine === 'TECHNICAL SKILLS' || originalLine === 'COMPETENCIES') {
      inSkillsSection = true;
      console.log('Entering skills section (all caps):', originalLine);
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
  const projectKeywords = ['projects', 'portfolio', 'work samples'];
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  let inProjectsSection = false;
  let currentProject: Partial<Project> | null = null;
  
  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    
    // Check if we're entering projects section
    if (projectKeywords.some(keyword => lowerLine.includes(keyword)) && line.length < 30) {
      inProjectsSection = true;
      continue;
    }
    
    // Check if we're leaving projects section
    if (inProjectsSection && (lowerLine.includes('experience') || lowerLine.includes('education') || lowerLine.includes('skills'))) {
      inProjectsSection = false;
      if (currentProject && isValidProject(currentProject)) {
        projects.push(completeProject(currentProject));
        currentProject = null;
      }
      continue;
    }
    
    if (inProjectsSection && line.length > 0) {
      if (!currentProject) {
        currentProject = {
          title: line,
          description: '',
          technologies: [],
          url: '',
          github: '',
          startDate: '',
          endDate: '',
          current: false
        };
      } else {
        currentProject.description += (currentProject.description ? ' ' : '') + line;
      }
    }
  }
  
  if (currentProject && isValidProject(currentProject)) {
    projects.push(completeProject(currentProject));
  }
  
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