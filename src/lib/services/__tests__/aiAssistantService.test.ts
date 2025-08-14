import { AIAssistantService } from '../aiAssistantService';
import { CVData } from '@/lib/stores/cvStore';
import { Job } from '@/lib/stores/jobStore';

// Mock CV data for testing
const mockCVData: CVData = {
  personalInfo: {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '+1234567890',
    location: 'San Francisco, CA',
    website: 'https://johndoe.com',
    linkedin: 'linkedin.com/in/johndoe',
    github: 'github.com/johndoe',
    summary: 'Experienced software engineer with 5+ years in full-stack development.'
  },
  experience: [
    {
      id: '1',
      jobTitle: 'Senior Software Engineer',
      company: 'Tech Corp',
      location: 'San Francisco, CA',
      startDate: '2020-01',
      endDate: '',
      current: true,
      description: 'Led development of web applications using React and Node.js',
      achievements: [
        'Improved application performance by 40%',
        'Mentored 3 junior developers'
      ]
    }
  ],
  education: [
    {
      id: '1',
      degree: 'Bachelor of Science',
      institution: 'University of Technology',
      field: 'Computer Science',
      location: 'San Francisco, CA',
      startDate: '2016-09',
      endDate: '2020-05',
      current: false,
      gpa: '3.8',
      description: 'Focused on software engineering and web development'
    }
  ],
  skills: [
    {
      id: '1',
      category: 'Programming Languages',
      skills: ['JavaScript', 'TypeScript', 'Python', 'Java']
    },
    {
      id: '2',
      category: 'Frameworks & Libraries',
      skills: ['React', 'Node.js', 'Express', 'Django']
    }
  ],
  projects: [],
  certifications: [],
  languages: [],
  customSections: []
};

// Mock job data for testing
const mockJobData: Job = {
  id: '1',
  title: 'Senior Software Engineer',
  company: 'Tech Startup',
  location: 'San Francisco, CA',
  description: 'We are looking for a senior software engineer to join our team and help build scalable web applications.',
  requirements: [
    '5+ years of experience in software development',
    'Strong knowledge of JavaScript and React',
    'Experience with Node.js and backend development',
    'Knowledge of cloud platforms (AWS/Azure)'
  ],
  responsibilities: [
    'Develop and maintain web applications',
    'Collaborate with cross-functional teams',
    'Mentor junior developers'
  ],
  skills: ['JavaScript', 'React', 'Node.js', 'AWS', 'Docker'],
  type: 'full-time',
  remote: true,
  postedDate: '2024-01-01',
  status: 'active',
  userId: 'user1',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z'
};

describe('AIAssistantService', () => {
  beforeEach(() => {
    // Mock fetch for API calls
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateATSScore', () => {
    it('should calculate ATS score with job context', async () => {
      const mockResponse = {
        score: 85,
        missingKeywords: ['Docker', 'AWS'],
        weakKeywords: ['React'],
        strengths: ['Strong JavaScript skills', 'Good experience'],
        suggestions: ['Add Docker experience', 'Highlight AWS knowledge']
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [{
            content: {
              parts: [{ text: JSON.stringify(mockResponse) }]
            }
          }]
        })
      });

      const result = await AIAssistantService.calculateATSScore(mockCVData, mockJobData);

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('generativelanguage.googleapis.com'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
      );
    });

    it('should calculate ATS score without job context', async () => {
      const mockResponse = {
        score: 75,
        missingKeywords: [],
        weakKeywords: [],
        strengths: ['Good structure', 'Complete information'],
        suggestions: ['Add more quantifiable achievements']
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [{
            content: {
              parts: [{ text: JSON.stringify(mockResponse) }]
            }
          }]
        })
      });

      const result = await AIAssistantService.calculateATSScore(mockCVData, null);

      expect(result).toEqual(mockResponse);
    });
  });

  describe('optimizeContent', () => {
    it('should generate content optimization suggestions', async () => {
      const mockSuggestions = [
        {
          id: '1',
          title: 'Improve Summary',
          content: 'Make the summary more compelling and job-specific',
          type: 'improvement',
          section: 'summary',
          field: 'summary'
        }
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [{
            content: {
              parts: [{ text: JSON.stringify(mockSuggestions) }]
            }
          }]
        })
      });

      const result = await AIAssistantService.optimizeContent(mockCVData, mockJobData);

      expect(result).toEqual(mockSuggestions);
    });
  });

  describe('quantifyAchievements', () => {
    it('should generate quantification suggestions', async () => {
      const mockSuggestions = [
        {
          id: '1',
          title: 'Quantify: Led development team',
          content: 'Led 5-person development team',
          type: 'improvement',
          section: 'experience',
          field: 'description'
        }
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [{
            content: {
              parts: [{ text: JSON.stringify(mockSuggestions) }]
            }
          }]
        })
      });

      const result = await AIAssistantService.quantifyAchievements(mockCVData, mockJobData);

      expect(result).toEqual(mockSuggestions);
    });
  });

  describe('mapSkillsAndKeywords', () => {
    it('should generate skills mapping suggestions', async () => {
      const mockSuggestions = [
        {
          id: '1',
          title: 'Skill: JavaScript',
          content: 'Strong match with job requirements',
          type: 'improvement',
          section: 'skills',
          field: 'Programming Languages'
        }
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [{
            content: {
              parts: [{ text: JSON.stringify(mockSuggestions) }]
            }
          }]
        })
      });

      const result = await AIAssistantService.mapSkillsAndKeywords(mockCVData, mockJobData);

      expect(result).toEqual(mockSuggestions);
    });
  });

  describe('analyzeGaps', () => {
    it('should generate gap analysis suggestions', async () => {
      const mockSuggestions = [
        {
          id: '1',
          title: 'Gap: Cloud Computing',
          content: 'Job requires AWS/Azure experience',
          type: 'addition',
          section: 'skills',
          field: 'Cloud Platforms'
        }
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [{
            content: {
              parts: [{ text: JSON.stringify(mockSuggestions) }]
            }
          }]
        })
      });

      const result = await AIAssistantService.analyzeGaps(mockCVData, mockJobData);

      expect(result).toEqual(mockSuggestions);
    });
  });

  describe('generateAchievements', () => {
    it('should generate achievement suggestions', async () => {
      const mockSuggestions = [
        {
          id: '1',
          title: 'Achievement for: Senior Software Engineer',
          content: 'Led development of authentication system used by 10K+ users',
          type: 'improvement',
          section: 'experience',
          field: 'achievements'
        }
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [{
            content: {
              parts: [{ text: JSON.stringify(mockSuggestions) }]
            }
          }]
        })
      });

      const result = await AIAssistantService.generateAchievements(mockCVData, mockJobData);

      expect(result).toEqual(mockSuggestions);
    });
  });

  describe('buildTailoredSummary', () => {
    it('should generate tailored summary', async () => {
      const mockSuggestions = [
        {
          id: '1',
          title: 'Tailored Summary',
          content: 'Senior software engineer with 5+ years of experience in full-stack development...',
          type: 'replacement',
          section: 'summary',
          field: 'summary'
        }
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [{
            content: {
              parts: [{ text: JSON.stringify(mockSuggestions) }]
            }
          }]
        })
      });

      const result = await AIAssistantService.buildTailoredSummary(mockCVData, mockJobData);

      expect(result).toEqual(mockSuggestions);
    });
  });

  describe('draftCoverLetter', () => {
    it('should generate cover letter draft', async () => {
      const mockSuggestions = [
        {
          id: '1',
          title: 'Cover Letter Draft',
          content: 'Dear Hiring Manager, I am writing to express my interest...',
          type: 'replacement',
          section: 'cover-letter',
          field: 'content'
        }
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [{
            content: {
              parts: [{ text: JSON.stringify(mockSuggestions) }]
            }
          }]
        })
      });

      const result = await AIAssistantService.draftCoverLetter(mockCVData, mockJobData);

      expect(result).toEqual(mockSuggestions);
    });

    it('should return no job context message when no job provided', async () => {
      const result = await AIAssistantService.draftCoverLetter(mockCVData, null);

      expect(result).toEqual([
        {
          id: 'no-job-context',
          title: 'No Job Context',
          content: 'Please select a job to generate a tailored cover letter.',
          type: 'addition',
          section: 'cover-letter',
          field: 'content',
          generatedAt: expect.any(String),
          isOutOfDate: false
        }
      ]);
    });
  });

  describe('checkConsistency', () => {
    it('should generate consistency check suggestions', async () => {
      const mockSuggestions = [
        {
          id: '1',
          title: 'Issue: Inconsistent date formats',
          content: 'Standardize all dates to YYYY-MM format',
          type: 'improvement',
          section: 'formatting',
          field: 'dates'
        }
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [{
            content: {
              parts: [{ text: JSON.stringify(mockSuggestions) }]
            }
          }]
        })
      });

      const result = await AIAssistantService.checkConsistency(mockCVData);

      expect(result).toEqual(mockSuggestions);
    });
  });
});
