/**
 * Enhanced Resume Migration Tests
 * 
 * Unit tests for migration utilities between
 * UnifiedCVDataStructure and EnhancedResumeJSON
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
    migrateToEnhancedSchema,
    migrateToLegacyFormat,
    validateMigration,
    batchMigrateToEnhancedSchema
} from '../../lib/migrations/enhanced-resume-migration';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { EnhancedResumeJSON, generateId } from '@/types/enhanced-resume-schema';

describe('Enhanced Resume Migration', () => {
    let legacyData: UnifiedCVDataStructure;
    let enhancedData: EnhancedResumeJSON;

    beforeEach(() => {
        // Create sample legacy data
        legacyData = {
            basics: {
                name: 'John Doe',
                label: 'Software Engineer',
                image: '',
                email: 'john@example.com',
                phone: '+1234567890',
                url: 'https://johndoe.com',
                summary: 'Experienced software engineer with 5+ years of experience.',
                location: {
                    address: '123 Main St',
                    postalCode: '12345',
                    city: 'San Francisco',
                    countryCode: 'US',
                    region: 'CA'
                },
                profiles: [
                    {
                        network: 'linkedin',
                        username: 'johndoe',
                        url: 'https://linkedin.com/in/johndoe'
                    }
                ]
            },
            work: [
                {
                    name: 'Tech Corp',
                    position: 'Senior Software Engineer',
                    url: 'https://techcorp.com',
                    startDate: '2020-01',
                    endDate: '',
                    summary: 'Led development of microservices architecture.',
                    highlights: [
                        'Reduced API response time by 40%',
                        'Mentored 3 junior developers'
                    ]
                }
            ],
            education: [
                {
                    institution: 'Stanford University',
                    url: 'https://stanford.edu',
                    area: 'Computer Science',
                    studyType: 'Bachelor of Science',
                    startDate: '2014-09',
                    endDate: '2018-06',
                    score: '3.8 GPA',
                    courses: ['Data Structures', 'Algorithms', 'Databases']
                }
            ],
            skills: [
                {
                    category: 'Programming Languages',
                    skills: ['JavaScript', 'TypeScript', 'Python', 'Java']
                }
            ],
            projects: [
                {
                    name: 'E-commerce Platform',
                    description: 'Built a full-stack e-commerce platform.',
                    highlights: ['Handled 10k+ concurrent users'],
                    keywords: ['React', 'Node.js', 'MongoDB'],
                    startDate: '2019-01',
                    endDate: '2019-12',
                    url: 'https://github.com/johndoe/ecommerce'
                }
            ],
            certificates: [
                {
                    name: 'AWS Certified Developer',
                    date: '2021-06',
                    issuer: 'Amazon Web Services',
                    url: 'https://aws.amazon.com/certification',
                    description: 'Professional certification for AWS development'
                }
            ],
            languages: [
                {
                    language: 'English',
                    fluency: 'native'
                },
                {
                    language: 'Spanish',
                    fluency: 'intermediate'
                }
            ],
            volunteer: [
                {
                    organization: 'Code for Good',
                    position: 'Volunteer Developer',
                    url: 'https://codeforgood.org',
                    startDate: '2019-01',
                    endDate: '2020-12',
                    summary: 'Developed tools for non-profit organizations.',
                    highlights: ['Built donation tracking system']
                }
            ],
            awards: [
                {
                    title: 'Best Developer Award',
                    date: '2021-12',
                    awarder: 'Tech Corp',
                    summary: 'Recognized for outstanding contributions'
                }
            ],
            publications: [
                {
                    name: 'Microservices Best Practices',
                    publisher: 'Tech Blog',
                    releaseDate: '2021-03',
                    url: 'https://techblog.com/microservices',
                    summary: 'Article on microservices architecture patterns'
                }
            ],
            interests: [
                {
                    name: 'Open Source',
                    keywords: ['Contributing', 'Maintaining']
                }
            ],
            references: [
                {
                    name: 'Jane Smith',
                    reference: 'John is an excellent engineer and team player.'
                }
            ]
        };

        // Create sample enhanced data
        enhancedData = migrateToEnhancedSchema(legacyData, 'modern_v1');
    });

    describe('migrateToEnhancedSchema', () => {
        it('should migrate basics section correctly', () => {
            expect(enhancedData.basics.name).toBe('John Doe');
            expect(enhancedData.basics.label).toBe('Software Engineer');
            expect(enhancedData.basics.email).toBe('john@example.com');
            expect(enhancedData.basics.phone).toBe('+1234567890');
            expect(enhancedData.basics.url).toBe('https://johndoe.com');
            expect(enhancedData.basics.summary).toBe('Experienced software engineer with 5+ years of experience.');
        });

        it('should generate unique IDs for all nodes', () => {
            // Check meta ID
            expect(enhancedData.meta.id).toBeDefined();
            expect(enhancedData.meta.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);

            // Check basics ID
            expect(enhancedData.basics.id).toBeDefined();
            expect(enhancedData.basics.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);

            // Check location ID
            expect(enhancedData.basics.location.id).toBeDefined();
            expect(enhancedData.basics.location.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);

            // Check profile IDs
            enhancedData.basics.profiles.forEach(profile => {
                expect(profile.id).toBeDefined();
                expect(profile.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
            });
        });

        it('should migrate work experience correctly', () => {
            const experienceSection = enhancedData.sections.find(s => s.type === 'experience');
            expect(experienceSection).toBeDefined();
            expect(experienceSection!.items).toHaveLength(1);

            const workItem = experienceSection!.items[0];
            expect(workItem.company).toBe('Tech Corp');
            expect(workItem.position).toBe('Senior Software Engineer');
            expect(workItem.startDate).toBe('2020-01');
            expect(workItem.endDate).toBe('');
            expect(workItem.current).toBe(true);
            expect(workItem.summary).toBe('Led development of microservices architecture.');
            expect(workItem.highlights).toHaveLength(2);
            expect(workItem.highlights[0].text).toBe('Reduced API response time by 40%');
            expect(workItem.highlights[1].text).toBe('Mentored 3 junior developers');
        });

        it('should migrate education correctly', () => {
            const educationSection = enhancedData.sections.find(s => s.type === 'education');
            expect(educationSection).toBeDefined();
            expect(educationSection!.items).toHaveLength(1);

            const eduItem = educationSection!.items[0];
            expect(eduItem.institution).toBe('Stanford University');
            expect(eduItem.area).toBe('Computer Science');
            expect(eduItem.studyType).toBe('Bachelor of Science');
            expect(eduItem.startDate).toBe('2014-09');
            expect(eduItem.endDate).toBe('2018-06');
            expect(eduItem.score).toBe('3.8 GPA');
            expect(eduItem.courses).toHaveLength(3);
        });

        it('should migrate skills correctly', () => {
            const skillsSection = enhancedData.sections.find(s => s.type === 'skills');
            expect(skillsSection).toBeDefined();
            expect(skillsSection!.items).toHaveLength(1);

            const skillItem = skillsSection!.items[0];
            expect(skillItem.category).toBe('Programming Languages');
            expect(skillItem.skills).toHaveLength(4);
            expect(skillItem.skills[0].name).toBe('JavaScript');
            expect(skillItem.skills[1].name).toBe('TypeScript');
        });

        it('should migrate projects correctly', () => {
            const projectsSection = enhancedData.sections.find(s => s.type === 'projects');
            expect(projectsSection).toBeDefined();
            expect(projectsSection!.items).toHaveLength(1);

            const projItem = projectsSection!.items[0];
            expect(projItem.name).toBe('E-commerce Platform');
            expect(projItem.description).toBe('Built a full-stack e-commerce platform.');
            expect(projItem.highlights).toHaveLength(1);
            expect(projItem.highlights[0].text).toBe('Handled 10k+ concurrent users');
            expect(projItem.keywords).toHaveLength(3);
        });

        it('should migrate certificates correctly', () => {
            const certificatesSection = enhancedData.sections.find(s => s.type === 'certificates');
            expect(certificatesSection).toBeDefined();
            expect(certificatesSection!.items).toHaveLength(1);

            const certItem = certificatesSection!.items[0];
            expect(certItem.name).toBe('AWS Certified Developer');
            expect(certItem.date).toBe('2021-06');
            expect(certItem.issuer).toBe('Amazon Web Services');
        });

        it('should migrate languages correctly', () => {
            const languagesSection = enhancedData.sections.find(s => s.type === 'languages');
            expect(languagesSection).toBeDefined();
            expect(languagesSection!.items).toHaveLength(2);

            const langItem1 = languagesSection!.items[0];
            expect(langItem1.language).toBe('English');
            expect(langItem1.fluency).toBe('native');

            const langItem2 = languagesSection!.items[1];
            expect(langItem2.language).toBe('Spanish');
            expect(langItem2.fluency).toBe('intermediate');
        });

        it('should migrate volunteer experience correctly', () => {
            const volunteerSection = enhancedData.sections.find(s => s.type === 'volunteer');
            expect(volunteerSection).toBeDefined();
            expect(volunteerSection!.items).toHaveLength(1);

            const volItem = volunteerSection!.items[0];
            expect(volItem.organization).toBe('Code for Good');
            expect(volItem.position).toBe('Volunteer Developer');
            expect(volItem.highlights).toHaveLength(1);
        });

        it('should migrate awards correctly', () => {
            const awardsSection = enhancedData.sections.find(s => s.type === 'awards');
            expect(awardsSection).toBeDefined();
            expect(awardsSection!.items).toHaveLength(1);

            const awardItem = awardsSection!.items[0];
            expect(awardItem.title).toBe('Best Developer Award');
            expect(awardItem.date).toBe('2021-12');
            expect(awardItem.awarder).toBe('Tech Corp');
        });

        it('should migrate publications correctly', () => {
            const publicationsSection = enhancedData.sections.find(s => s.type === 'publications');
            expect(publicationsSection).toBeDefined();
            expect(publicationsSection!.items).toHaveLength(1);

            const pubItem = publicationsSection!.items[0];
            expect(pubItem.name).toBe('Microservices Best Practices');
            expect(pubItem.publisher).toBe('Tech Blog');
        });

        it('should migrate interests correctly', () => {
            const interestsSection = enhancedData.sections.find(s => s.type === 'interests');
            expect(interestsSection).toBeDefined();
            expect(interestsSection!.items).toHaveLength(1);

            const interestItem = interestsSection!.items[0];
            expect(interestItem.name).toBe('Open Source');
            expect(interestItem.keywords).toHaveLength(2);
        });

        it('should migrate references correctly', () => {
            const referencesSection = enhancedData.sections.find(s => s.type === 'references');
            expect(referencesSection).toBeDefined();
            expect(referencesSection!.items).toHaveLength(1);

            const refItem = referencesSection!.items[0];
            expect(refItem.name).toBe('Jane Smith');
            expect(refItem.reference).toBe('John is an excellent engineer and team player.');
        });

        it('should set correct template ID', () => {
            expect(enhancedData.meta.templateId).toBe('modern_v1');
        });

        it('should set version to 1', () => {
            expect(enhancedData.meta.version).toBe(1);
        });

        it('should set timestamps', () => {
            expect(enhancedData.meta.lastModified).toBeDefined();
            expect(enhancedData.meta.createdAt).toBeDefined();
        });
    });

    describe('migrateToLegacyFormat', () => {
        it('should convert enhanced data back to legacy format', () => {
            const convertedLegacy = migrateToLegacyFormat(enhancedData);

            expect(convertedLegacy.basics.name).toBe('John Doe');
            expect(convertedLegacy.basics.email).toBe('john@example.com');
            expect(convertedLegacy.work).toHaveLength(1);
            expect(convertedLegacy.work[0].name).toBe('Tech Corp');
            expect(convertedLegacy.education).toHaveLength(1);
            expect(convertedLegacy.education[0].institution).toBe('Stanford University');
            expect(convertedLegacy.skills).toHaveLength(1);
            expect(convertedLegacy.skills[0].category).toBe('Programming Languages');
        });

        it('should preserve highlights as strings', () => {
            const convertedLegacy = migrateToLegacyFormat(enhancedData);

            expect(convertedLegacy.work[0].highlights).toHaveLength(2);
            expect(convertedLegacy.work[0].highlights[0]).toBe('Reduced API response time by 40%');
            expect(convertedLegacy.work[0].highlights[1]).toBe('Mentored 3 junior developers');
        });

        it('should preserve skills as strings', () => {
            const convertedLegacy = migrateToLegacyFormat(enhancedData);

            expect(convertedLegacy.skills[0].skills).toHaveLength(4);
            expect(convertedLegacy.skills[0].skills[0]).toBe('JavaScript');
            expect(convertedLegacy.skills[0].skills[1]).toBe('TypeScript');
        });
    });

    describe('validateMigration', () => {
        it('should validate successful migration', () => {
            const result = validateMigration(legacyData, enhancedData);

            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should detect name mismatch', () => {
            enhancedData.basics.name = 'Jane Doe';

            const result = validateMigration(legacyData, enhancedData);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Name mismatch after migration');
        });

        it('should detect email mismatch', () => {
            enhancedData.basics.email = 'jane@example.com';

            const result = validateMigration(legacyData, enhancedData);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Email mismatch after migration');
        });

        it('should detect missing IDs', () => {
            enhancedData.meta.id = '';

            const result = validateMigration(legacyData, enhancedData);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Meta missing ID');
        });

        it('should detect item count mismatch', () => {
            enhancedData.sections[0].items = [];

            const result = validateMigration(legacyData, enhancedData);

            expect(result.isValid).toBe(false);
            // Debug: print actual error message
            console.log('Actual errors:', result.errors);
            expect(result.errors).toContain('Item count mismatch: legacy=12, enhanced=11');
        });
    });

    describe('batchMigrateToEnhancedSchema', () => {
        it('should migrate multiple CVs', () => {
            const legacyCVs = [legacyData, legacyData];
            const enhancedCVs = batchMigrateToEnhancedSchema(legacyCVs, 'modern_v1');

            expect(enhancedCVs).toHaveLength(2);
            expect(enhancedCVs[0].basics.name).toBe('John Doe');
            expect(enhancedCVs[1].basics.name).toBe('John Doe');
            expect(enhancedCVs[0].meta.id).not.toBe(enhancedCVs[1].meta.id);
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty legacy data', () => {
            const emptyLegacy: UnifiedCVDataStructure = {
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
                education: [],
                skills: [],
                projects: [],
                certificates: [],
                languages: [],
                volunteer: [],
                awards: [],
                publications: [],
                interests: [],
                references: []
            };

            const enhanced = migrateToEnhancedSchema(emptyLegacy);

            expect(enhanced.basics.name).toBe('');
            expect(enhanced.sections).toHaveLength(0);
            expect(enhanced.meta.id).toBeDefined();
        });

        it('should handle missing optional fields', () => {
            const minimalLegacy: UnifiedCVDataStructure = {
                basics: {
                    name: 'John Doe',
                    label: '',
                    image: '',
                    email: 'john@example.com',
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
                education: [],
                skills: [],
                projects: [],
                certificates: [],
                languages: [],
                volunteer: [],
                awards: [],
                publications: [],
                interests: [],
                references: []
            };

            const enhanced = migrateToEnhancedSchema(minimalLegacy);

            expect(enhanced.basics.name).toBe('John Doe');
            expect(enhanced.basics.email).toBe('john@example.com');
            expect(enhanced.sections).toHaveLength(0);
        });

        it('should handle work experience without end date', () => {
            const legacyWithCurrentJob: UnifiedCVDataStructure = {
                ...legacyData,
                work: [
                    {
                        name: 'Current Corp',
                        position: 'Engineer',
                        url: '',
                        startDate: '2022-01',
                        endDate: '',
                        summary: 'Current job',
                        highlights: []
                    }
                ]
            };

            const enhanced = migrateToEnhancedSchema(legacyWithCurrentJob);

            const experienceSection = enhanced.sections.find(s => s.type === 'experience');
            expect(experienceSection).toBeDefined();
            expect(experienceSection!.items[0].current).toBe(true);
            expect(experienceSection!.items[0].endDate).toBe('');
        });
    });
});
