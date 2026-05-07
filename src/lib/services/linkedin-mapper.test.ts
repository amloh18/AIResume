import { describe, it, expect } from 'vitest';
import { mapLinkedInProfileToCV } from '@/lib/services/linkedin-mapper';

describe('LinkedIn Mapper', () => {
  it('should map basic LinkedIn profile to CV structure', () => {
    const linkedInProfile = {
      id: '123456',
      localizedFirstName: 'John',
      localizedLastName: 'Doe',
      headline: 'Software Engineer at Tech Corp',
      summary: 'Experienced software engineer with 5+ years of experience.',
      vanityName: 'johndoe',
      locationName: 'San Francisco, CA',
      profilePicture: {
        'displayImage~': {
          elements: [
            {
              identifiers: [
                { identifier: 'https://example.com/profile.jpg' }
              ]
            }
          ]
        }
      },
      positions: {
        values: [
          {
            id: 'pos1',
            title: 'Senior Software Engineer',
            summary: 'Leading development team',
            startDate: { year: 2020, month: 1 },
            endDate: { year: 2023, month: 12 },
            company: {
              name: 'Tech Corp',
              url: 'https://techcorp.com'
            }
          }
        ],
        _total: 1
      },
      educations: {
        values: [
          {
            id: 'edu1',
            schoolName: 'State University',
            degree: 'Bachelor of Science',
            fieldOfStudy: 'Computer Science',
            startDate: { year: 2015, month: 9 },
            endDate: { year: 2019, month: 5 }
          }
        ],
        _total: 1
      },
      skills: {
        values: [
          { id: 'skill1', name: 'JavaScript' },
          { id: 'skill2', name: 'React' }
        ],
        _total: 2
      },
      languages: {
        values: [
          {
            id: 'lang1',
            language: { name: 'English' },
            proficiency: { name: 'Native or bilingual proficiency' }
          }
        ],
        _total: 1
      },
      emailAddress: 'john.doe@example.com',
      publicProfileUrl: 'https://www.linkedin.com/in/johndoe'
    };

    const cvData = mapLinkedInProfileToCV(linkedInProfile);

    // Test basics
    expect(cvData.basics.name).toBe('John Doe');
    expect(cvData.basics.label).toBe('Software Engineer at Tech Corp');
    expect(cvData.basics.email).toBe('john.doe@example.com');
    expect(cvData.basics.image).toBe('https://example.com/profile.jpg');
    expect(cvData.basics.url).toBe('https://www.linkedin.com/in/johndoe');

    // Test work experience
    expect(cvData.work).toHaveLength(1);
    expect(cvData.work[0].name).toBe('Tech Corp');
    expect(cvData.work[0].position).toBe('Senior Software Engineer');
    expect(cvData.work[0].startDate).toBe('2020-01-01');
    expect(cvData.work[0].endDate).toBe('2023-12-01');

    // Test education
    expect(cvData.education).toHaveLength(1);
    expect(cvData.education[0].institution).toBe('State University');
    expect(cvData.education[0].area).toBe('Computer Science');
    expect(cvData.education[0].studyType).toBe('Bachelor of Science');

    // Test skills - each skill gets its own category
    expect(cvData.skills).toHaveLength(2);
    expect(cvData.skills[0].category).toBe('General');
    expect(cvData.skills[0].skills).toContain('JavaScript');
    expect(cvData.skills[1].category).toBe('General');
    expect(cvData.skills[1].skills).toContain('React');

    // Test languages
    expect(cvData.languages).toHaveLength(1);
    expect(cvData.languages[0].language).toBe('English');
  });

  it('should handle missing optional fields', () => {
    const linkedInProfile = {
      id: '123456',
      localizedFirstName: 'Jane',
      localizedLastName: 'Smith',
      headline: '',
      summary: '',
      vanityName: '',
      locationName: '',
      profilePicture: undefined,
      positions: { values: [], _total: 0 },
      educations: { values: [], _total: 0 },
      skills: { values: [], _total: 0 },
      languages: { values: [], _total: 0 },
      emailAddress: '',
      publicProfileUrl: ''
    };

    const cvData = mapLinkedInProfileToCV(linkedInProfile);

    expect(cvData.basics.name).toBe('Jane Smith');
    expect(cvData.basics.label).toBe('');
    expect(cvData.basics.email).toBe('');
    expect(cvData.basics.image).toBe('');
    expect(cvData.work).toHaveLength(0);
    expect(cvData.education).toHaveLength(0);
    expect(cvData.skills).toHaveLength(0);
    expect(cvData.languages).toHaveLength(0);
  });

  it('should format dates correctly', () => {
    const linkedInProfile = {
      id: '123456',
      localizedFirstName: 'Test',
      localizedLastName: 'User',
      headline: '',
      summary: '',
      vanityName: '',
      locationName: '',
      profilePicture: undefined,
      positions: {
        values: [
          {
            id: 'pos1',
            title: 'Developer',
            summary: '',
            startDate: { year: 2020, month: 6, day: 15 },
            endDate: undefined,
            company: { name: 'Test Corp', url: '' }
          }
        ],
        _total: 1
      },
      educations: { values: [], _total: 0 },
      skills: { values: [], _total: 0 },
      languages: { values: [], _total: 0 },
      emailAddress: '',
      publicProfileUrl: ''
    };

    const cvData = mapLinkedInProfileToCV(linkedInProfile);

    expect(cvData.work[0].startDate).toBe('2020-06-15');
    expect(cvData.work[0].endDate).toBe('Present');
  });
});
