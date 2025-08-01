import { NextRequest, NextResponse } from 'next/server';
// @ts-ignore - pdf-parse doesn't have types
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { createWorker } from 'tesseract.js';

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

    // Check file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'image/jpg'
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
    
    return NextResponse.json(parsedData);
  } catch (error) {
    console.error('CV parsing API error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    // Return a basic structure even on error to prevent client-side failures
    const fallbackData = getEmptyStructure();
    fallbackData.personalInfo.summary = 'An error occurred during CV parsing. Please enter your information manually.';
    
    return NextResponse.json(fallbackData, { status: 200 }); // Return 200 with empty data instead of 500
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
      try {
        console.log('Attempting PDF parsing...');
        const pdfData = await pdfParse(buffer);
        extractedText = pdfData.text || '';
        console.log('PDF parsing successful, text length:', extractedText.length);
      } catch (pdfError) {
        console.error('PDF parsing failed:', pdfError);
        extractedText = '';
      }
    } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      try {
        console.log('Attempting DOCX parsing...');
        const result = await mammoth.extractRawText({ buffer });
        extractedText = result.value || '';
        console.log('DOCX parsing successful, text length:', extractedText.length);
      } catch (docxError) {
        console.error('DOCX parsing failed:', docxError);
        extractedText = '';
      }
    } else if (fileType.startsWith('image/')) {
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
    
    return parsedData;
  } catch (error) {
    console.error('Error in parseDocument:', error);
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
  
  return !hasPersonalInfo && !hasEducation && !hasExperience && !hasSkills && !hasProjects;
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

function extractPersonalInfo(text: string): Partial<PersonalInfo> {
  const personalInfo: Partial<PersonalInfo> = {};
  
  // Extract email
  const emailMatch = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
  if (emailMatch) {
    personalInfo.email = emailMatch[0];
  }
  
  // Extract phone number
  const phoneMatch = text.match(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
  if (phoneMatch) {
    personalInfo.phone = phoneMatch[0];
  }
  
  // Extract LinkedIn
  const linkedinMatch = text.match(/linkedin\.com\/in\/[\w-]+/i);
  if (linkedinMatch) {
    personalInfo.linkedin = linkedinMatch[0];
  }
  
  // Extract name (first line that looks like a name)
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  for (const line of lines.slice(0, 5)) { // Check first 5 lines
    if (line.length < 50 && /^[A-Za-z\s]+$/.test(line) && line.split(' ').length >= 2) {
      const nameParts = line.split(' ');
      personalInfo.firstName = nameParts[0];
      personalInfo.lastName = nameParts.slice(1).join(' ');
      break;
    }
  }
  
  return personalInfo;
}

function extractEducation(text: string): Education[] {
  const education: Education[] = [];
  const educationKeywords = ['education', 'academic', 'university', 'college', 'school', 'degree', 'bachelor', 'master', 'phd'];
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  let inEducationSection = false;
  let currentEducation: Partial<Education> | null = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    
    // Check if we're entering education section
    if (educationKeywords.some(keyword => line.includes(keyword)) && line.length < 30) {
      inEducationSection = true;
      continue;
    }
    
    // Check if we're leaving education section
    if (inEducationSection && (line.includes('experience') || line.includes('work') || line.includes('employment'))) {
      inEducationSection = false;
      if (currentEducation && isValidEducation(currentEducation)) {
        education.push(completeEducation(currentEducation));
        currentEducation = null;
      }
      continue;
    }
    
    if (inEducationSection) {
      const originalLine = lines[i];
      
      // Look for degree patterns
      if (/\b(bachelor|master|phd|doctorate|diploma|certificate)\b/i.test(originalLine)) {
        if (currentEducation && isValidEducation(currentEducation)) {
          education.push(completeEducation(currentEducation));
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
      }
      
      // Look for institution names
      if (currentEducation && /\b(university|college|school|institute)\b/i.test(originalLine)) {
        currentEducation.institution = originalLine;
      }
      
      // Look for years
      const yearMatch = originalLine.match(/\b(19|20)\d{2}\b/g);
      if (currentEducation && yearMatch) {
        if (yearMatch.length >= 2) {
          currentEducation.startDate = yearMatch[0];
          currentEducation.endDate = yearMatch[1];
        } else {
          currentEducation.endDate = yearMatch[0];
        }
      }
    }
  }
  
  if (currentEducation && isValidEducation(currentEducation)) {
    education.push(completeEducation(currentEducation));
  }
  
  return education;
}

function extractExperience(text: string): Experience[] {
  const experience: Experience[] = [];
  const experienceKeywords = ['experience', 'work', 'employment', 'career', 'professional'];
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  let inExperienceSection = false;
  let currentExperience: Partial<Experience> | null = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    
    // Check if we're entering experience section
    if (experienceKeywords.some(keyword => line.includes(keyword)) && line.length < 30) {
      inExperienceSection = true;
      continue;
    }
    
    // Check if we're leaving experience section
    if (inExperienceSection && (line.includes('education') || line.includes('skills') || line.includes('projects'))) {
      inExperienceSection = false;
      if (currentExperience && isValidExperience(currentExperience)) {
        experience.push(completeExperience(currentExperience));
        currentExperience = null;
      }
      continue;
    }
    
    if (inExperienceSection) {
      const originalLine = lines[i];
      
      // Look for job titles and companies
      if (originalLine.length < 100 && /\b(manager|developer|engineer|analyst|coordinator|specialist|director|lead)\b/i.test(originalLine)) {
        if (currentExperience && isValidExperience(currentExperience)) {
          experience.push(completeExperience(currentExperience));
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
      }
      
      // Look for company names (usually after position)
      if (currentExperience && !currentExperience.company && originalLine.length < 100) {
        currentExperience.company = originalLine;
      }
      
      // Look for years
      const yearMatch = originalLine.match(/\b(19|20)\d{2}\b/g);
      if (currentExperience && yearMatch) {
        if (yearMatch.length >= 2) {
          currentExperience.startDate = yearMatch[0];
          currentExperience.endDate = yearMatch[1];
        } else {
          currentExperience.endDate = yearMatch[0];
        }
      }
      
      // Look for bullet points or achievements
      if (currentExperience && (originalLine.startsWith('•') || originalLine.startsWith('-') || originalLine.startsWith('*'))) {
        if (!currentExperience.achievements) {
          currentExperience.achievements = [];
        }
        currentExperience.achievements.push(originalLine.replace(/^[•\-*]\s*/, ''));
      }
    }
  }
  
  if (currentExperience && isValidExperience(currentExperience)) {
    experience.push(completeExperience(currentExperience));
  }
  
  return experience;
}

function extractSkills(text: string): Skills[] {
  const skills: Skills[] = [];
  const skillsKeywords = ['skills', 'competencies', 'technologies', 'tools'];
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  let inSkillsSection = false;
  
  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    
    // Check if we're entering skills section
    if (skillsKeywords.some(keyword => lowerLine.includes(keyword)) && line.length < 30) {
      inSkillsSection = true;
      continue;
    }
    
    // Check if we're leaving skills section
    if (inSkillsSection && (lowerLine.includes('experience') || lowerLine.includes('education') || lowerLine.includes('projects'))) {
      inSkillsSection = false;
      continue;
    }
    
    if (inSkillsSection && line.length > 0) {
      // Split skills by common delimiters
      const skillList = line.split(/[,;|•\-*]/).map(skill => skill.trim()).filter(skill => skill.length > 0);
      
      if (skillList.length > 1) {
        skills.push({
          category: 'Technical Skills',
          skills: skillList
        });
      }
    }
  }
  
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