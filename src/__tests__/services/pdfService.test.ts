import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('server-only', () => ({}));
import type { UnifiedCVDataStructure } from '@/types/unified-cv-schema';

// Mock puppeteer
vi.mock('puppeteer', () => ({
  default: {
    launch: vi.fn().mockResolvedValue({
      newPage: vi.fn().mockResolvedValue({
        setContent: vi.fn(),
        emulateMediaType: vi.fn(),
        pdf: vi.fn().mockResolvedValue(Buffer.from('mock-pdf-content')),
        close: vi.fn(),
      }),
      close: vi.fn(),
    }),
  },
}));

// Mock html2pdf.js
vi.mock('html2pdf.js', () => ({
  default: vi.fn().mockReturnValue({
    set: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    save: vi.fn().mockResolvedValue(undefined),
    outputPdf: vi.fn().mockResolvedValue(new Blob(['mock-pdf'], { type: 'application/pdf' })),
  }),
}));

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
      summary: 'Experienced software developer',
      location: {
        address: '123 Main St',
        postalCode: '10001',
        city: 'New York',
        countryCode: 'US',
        region: 'NY',
      },
      profiles: [],
    },
    work: [
      {
        name: 'Tech Corp',
        position: 'Senior Developer',
        url: 'https://techcorp.com',
        startDate: '2020-01',
        endDate: '2023-12',
        summary: 'Led development team',
        highlights: ['Built microservices', 'Improved performance by 50%'],
      },
    ],
    education: [
      {
        institution: 'University of Technology',
        url: 'https://university.edu',
        area: 'Computer Science',
        studyType: 'Bachelor',
        startDate: '2016-01',
        endDate: '2020-01',
        score: '3.8',
      },
    ],
    skills: [
      { category: 'Programming', skills: ['JavaScript', 'TypeScript', 'Python'] },
      { category: 'Frameworks', skills: ['React', 'Node.js', 'Next.js'] },
    ],
    languages: [
      { language: 'English', fluency: 'Native' },
    ],
    projects: [],
    certificates: [],
    awards: [],
    publications: [],
    volunteer: [],
    interests: [],
    references: [],
    ...overrides,
  };
}

// Helper to create a valid template
function createMockTemplate() {
  return {
    id: 'test-template',
    name: 'Test Template',
    category: 'professional' as const,
    tier: 'free' as const,
    html: `
      <!DOCTYPE html>
      <html>
        <head><title>CV</title></head>
        <body>
          <h1>{{basics.name}}</h1>
          <p>{{basics.email}}</p>
        </body>
      </html>
    `,
    styles: 'body { font-family: Arial; }',
    globalStyles: '',
    availableSections: [],
    sectionConfig: {},
    metadata: {
      author: 'Test',
      version: '1.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    structure: {
      sections: [],
    },
  };
}

describe('PDFService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generatePDF', () => {
    it('should be importable', async () => {
      // Dynamic import to ensure mocks are applied
      const { PDFService } = await import('@/lib/services/pdfService');
      expect(PDFService).toBeDefined();
    });

    it('should have generatePDF method', async () => {
      const { PDFService } = await import('@/lib/services/pdfService');
      expect(typeof PDFService.generatePDF).toBe('function');
    });
  });

  describe('CV Data Validation', () => {
    it('should create valid mock CV data', () => {
      const cvData = createMockCVData();
      expect(cvData.basics.name).toBe('John Doe');
      expect(cvData.work).toHaveLength(1);
      expect(cvData.skills).toHaveLength(2);
    });

    it('should handle missing optional CV sections', () => {
      const minimalCVData: UnifiedCVDataStructure = {
        basics: {
          name: 'Jane Doe',
          label: '',
          image: '',
          email: 'jane@example.com',
          phone: '',
          url: '',
          summary: '',
          location: {
            address: '',
            postalCode: '',
            city: '',
            countryCode: '',
            region: '',
          },
          profiles: [],
        },
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
      };

      expect(minimalCVData.basics.name).toBe('Jane Doe');
      expect(minimalCVData.work).toHaveLength(0);
    });

    it('should handle special characters in CV data', () => {
      const cvWithSpecialChars = createMockCVData({
        basics: {
          ...createMockCVData().basics,
          name: 'José García-López',
          summary: 'Expert in C#, C++, & .NET frameworks • Special chars: <>&"\'',
        },
      });

      expect(cvWithSpecialChars.basics.name).toContain('José');
      expect(cvWithSpecialChars.basics.summary).toContain('•');
    });

    it('should handle large CV data with many entries', () => {
      const largeCVData = createMockCVData({
        work: Array.from({ length: 20 }, (_, i) => ({
          name: `Company ${i}`,
          position: `Position ${i}`,
          url: `https://company${i}.com`,
          startDate: `20${10 + i}-01`,
          endDate: `20${10 + i + 1}-01`,
          summary: `Work summary ${i}`,
          highlights: [`Highlight 1 for job ${i}`, `Highlight 2 for job ${i}`],
        })),
        skills: Array.from({ length: 5 }, (_, i) => ({
          category: `Category ${i}`,
          skills: Array.from({ length: 10 }, (_, j) => `Skill ${i}-${j}`),
        })),
      });

      expect(largeCVData.work).toHaveLength(20);
      expect(largeCVData.skills).toHaveLength(5);
    });
  });

  describe('Template Validation', () => {
    it('should create valid mock template', () => {
      const template = createMockTemplate();
      expect(template.id).toBe('test-template');
      expect(template.html).toContain('{{basics.name}}');
    });
  });
});
