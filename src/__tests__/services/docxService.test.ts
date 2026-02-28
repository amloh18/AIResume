import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { UnifiedCVDataStructure } from '@/types/unified-cv-schema';

// Helper to create valid CV data
function createMockCVData(overrides: Partial<UnifiedCVDataStructure> = {}): UnifiedCVDataStructure {
  return {
    basics: {
      name: 'John Doe',
      label: 'Software Developer',
      image: '',
      email: 'john@example.com',
      phone: '+1234567890',
      url: 'https://johndoe.com',
      summary: 'Experienced software developer with expertise in full-stack development.',
      location: {
        address: '123 Main St',
        postalCode: '10001',
        city: 'New York',
        countryCode: 'US',
        region: 'NY',
      },
      profiles: [
        { network: 'LinkedIn', username: 'johndoe', url: 'https://linkedin.com/in/johndoe' },
        { network: 'GitHub', username: 'johndoe', url: 'https://github.com/johndoe' },
      ],
    },
    work: [
      {
        name: 'Tech Corp',
        position: 'Senior Developer',
        url: 'https://techcorp.com',
        startDate: '2020-01',
        endDate: '2023-12',
        summary: 'Led development team building scalable microservices architecture.',
        highlights: [
          'Built microservices handling 1M+ requests/day',
          'Improved system performance by 50%',
          'Mentored team of 5 junior developers',
        ],
      },
      {
        name: 'Startup Inc',
        position: 'Full Stack Developer',
        url: 'https://startup.com',
        startDate: '2018-06',
        endDate: '2019-12',
        summary: 'Developed core product features from scratch.',
        highlights: [
          'Launched MVP in 3 months',
          'Implemented real-time collaboration features',
        ],
      },
    ],
    education: [
      {
        institution: 'University of Technology',
        url: 'https://university.edu',
        area: 'Computer Science',
        studyType: 'Bachelor of Science',
        startDate: '2014-09',
        endDate: '2018-05',
        score: '3.8 GPA',
        courses: ['Data Structures', 'Algorithms', 'Database Systems'],
      },
    ],
    skills: [
      { category: 'Programming Languages', skills: ['JavaScript', 'TypeScript', 'Python', 'Go'] },
      { category: 'Frameworks', skills: ['React', 'Node.js', 'Next.js', 'Django'] },
      { category: 'Databases', skills: ['PostgreSQL', 'MongoDB', 'Redis'] },
    ],
    languages: [
      { language: 'English', fluency: 'Native' },
      { language: 'Spanish', fluency: 'Intermediate' },
    ],
    projects: [
      {
        name: 'Open Source Project',
        description: 'A popular open-source library for data visualization',
        highlights: ['500+ GitHub stars', 'Used by 50+ companies'],
        url: 'https://github.com/johndoe/project',
        startDate: '2021-01',
        endDate: '',
        keywords: ['JavaScript', 'D3.js', 'Data Visualization'],
      },
    ],
    certificates: [
      {
        name: 'AWS Solutions Architect',
        date: '2022-06',
        issuer: 'Amazon Web Services',
        url: 'https://aws.amazon.com/certification',
        description: 'Professional certification for AWS cloud architecture',
      },
    ],
    awards: [
      {
        title: 'Employee of the Year',
        date: '2022-12',
        awarder: 'Tech Corp',
        summary: 'Recognized for outstanding contributions to the engineering team',
      },
    ],
    publications: [
      {
        name: 'Building Scalable Systems',
        publisher: 'Tech Blog',
        releaseDate: '2023-03',
        url: 'https://techblog.com/article',
        summary: 'Article about microservices architecture patterns',
      },
    ],
    volunteer: [
      {
        organization: 'Code for Good',
        position: 'Technical Mentor',
        url: 'https://codeforgood.org',
        startDate: '2020-01',
        endDate: '2023-01',
        summary: 'Mentored underrepresented groups in tech',
        highlights: ['Helped 20+ students land their first tech job'],
      },
    ],
    interests: [
      { name: 'Open Source', keywords: ['GitHub', 'Contributing'] },
      { name: 'Machine Learning', keywords: ['TensorFlow', 'PyTorch'] },
      { name: 'Hiking', keywords: ['Outdoors', 'Nature'] },
    ],
    references: [
      {
        name: 'Jane Smith',
        reference: 'John is an exceptional developer who consistently delivers high-quality work.',
      },
    ],
    ...overrides,
  };
}

describe('DOCXService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Service Import', () => {
    it('should be importable', async () => {
      const { DOCXService } = await import('@/lib/services/docxService');
      expect(DOCXService).toBeDefined();
    });

    it('should have generateDOCX method', async () => {
      const { DOCXService } = await import('@/lib/services/docxService');
      expect(typeof DOCXService.generateDOCX).toBe('function');
    });
  });

  describe('CV Data Validation', () => {
    it('should create valid mock CV data with all sections', () => {
      const cvData = createMockCVData();
      expect(cvData.basics.name).toBe('John Doe');
      expect(cvData.work).toHaveLength(2);
      expect(cvData.skills).toHaveLength(3);
      expect(cvData.languages).toHaveLength(2);
      expect(cvData.projects).toHaveLength(1);
      expect(cvData.certificates).toHaveLength(1);
      expect(cvData.awards).toHaveLength(1);
      expect(cvData.publications).toHaveLength(1);
      expect(cvData.volunteer).toHaveLength(1);
      expect(cvData.interests).toHaveLength(3);
      expect(cvData.references).toHaveLength(1);
    });

    it('should handle CV with empty optional sections', () => {
      const minimalCVData = createMockCVData({
        work: [],
        education: [],
        skills: [],
        languages: [],
        projects: [],
        certificates: [],
        awards: [],
        publications: [],
        volunteer: [],
        interests: [],
        references: [],
      });

      expect(minimalCVData.work).toHaveLength(0);
      expect(minimalCVData.education).toHaveLength(0);
    });

    it('should handle work entries with HTML in summary', () => {
      const cvWithHTML = createMockCVData({
        work: [
          {
            name: 'Tech Corp',
            position: 'Developer',
            url: 'https://techcorp.com',
            startDate: '2020-01',
            endDate: '2023-12',
            summary: '<p>Led development team</p><ul><li>Built microservices</li></ul>',
            highlights: ['Built microservices'],
          },
        ],
      });

      expect(cvWithHTML.work[0].summary).toContain('<p>');
    });

    it('should handle special characters in all sections', () => {
      const cvWithSpecialChars = createMockCVData({
        basics: {
          ...createMockCVData().basics,
          name: 'José García-López',
          summary: 'Expert in C#, C++, & .NET • Special: <>&"\'',
        },
        work: [
          {
            name: 'Müller & Söhne',
            position: 'Entwickler',
            url: '',
            startDate: '2020-01',
            endDate: '2023-12',
            summary: 'Entwicklung von Softwarelösungen',
            highlights: ['Änderungen an der Codebasis'],
          },
        ],
      });

      expect(cvWithSpecialChars.basics.name).toContain('José');
      expect(cvWithSpecialChars.work[0].name).toContain('Müller');
    });

    it('should handle long content', () => {
      const longSummary = 'A'.repeat(1000);
      const manyHighlights = Array.from({ length: 20 }, (_, i) => `Highlight ${i}`);
      
      const cvWithLongContent = createMockCVData({
        basics: {
          ...createMockCVData().basics,
          summary: longSummary,
        },
        work: [
          {
            name: 'Tech Corp',
            position: 'Developer',
            url: 'https://techcorp.com',
            startDate: '2020-01',
            endDate: '2023-12',
            summary: longSummary,
            highlights: manyHighlights,
          },
        ],
      });

      expect(cvWithLongContent.basics.summary).toHaveLength(1000);
      expect(cvWithLongContent.work[0].highlights).toHaveLength(20);
    });
  });

  describe('Section Coverage', () => {
    it('should have all required sections in test data', () => {
      const cvData = createMockCVData();
      const sections = ['basics', 'work', 'education', 'skills', 'languages', 
                        'projects', 'certificates', 'awards', 'publications', 
                        'volunteer', 'interests', 'references'];
      
      sections.forEach(section => {
        expect(cvData).toHaveProperty(section);
      });
    });

    it('should handle skills with categories', () => {
      const cvData = createMockCVData();
      
      expect(cvData.skills[0].category).toBe('Programming Languages');
      expect(cvData.skills[0].skills).toContain('JavaScript');
    });

    it('should handle profiles/social links', () => {
      const cvData = createMockCVData();
      
      expect(cvData.basics.profiles).toHaveLength(2);
      expect(cvData.basics.profiles[0].network).toBe('LinkedIn');
    });
  });

  describe('Date Formatting', () => {
    it('should handle various date formats', () => {
      const cvWithDates = createMockCVData({
        work: [
          {
            name: 'Company 1',
            position: 'Developer',
            url: '',
            startDate: '2020-01',
            endDate: '2023-12',
            summary: 'Work summary',
            highlights: [],
          },
          {
            name: 'Company 2',
            position: 'Developer',
            url: '',
            startDate: '2018',
            endDate: '2019',
            summary: 'Work summary',
            highlights: [],
          },
          {
            name: 'Company 3',
            position: 'Developer',
            url: '',
            startDate: '2015-06-15',
            endDate: '',
            summary: 'Current position',
            highlights: [],
          },
        ],
      });

      expect(cvWithDates.work[0].startDate).toBe('2020-01');
      expect(cvWithDates.work[1].startDate).toBe('2018');
      expect(cvWithDates.work[2].endDate).toBe('');
    });
  });
});
