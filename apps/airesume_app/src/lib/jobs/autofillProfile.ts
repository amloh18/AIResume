/**
 * Autofill profile for the browser extension.
 *
 * The extension's form-filling engine needs one thing: a complete, predictable
 * description of the candidate. That data already lives in two places in the app
 * (the `User` profile and the Master CV), so this module is the single place that
 * merges them into the flat shape the engine matches form fields against.
 *
 * Everything is optional and defensive: a user with no Master CV still gets
 * their name, email and phone from the account, and the engine simply fills the
 * fields it has data for. Nothing here is ever written — the endpoint that calls
 * it is read-only.
 */

import mongoose from 'mongoose';
import { CV, User } from '@/models';

export interface AutofillWorkEntry {
  company: string;
  title: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  current: boolean;
  description?: string;
}

export interface AutofillEducationEntry {
  institution: string;
  degree?: string;
  fieldOfStudy?: string;
  startDate?: string;
  endDate?: string;
  grade?: string;
  location?: string;
}

export interface AutofillProfile {
  version: number;
  identity: {
    firstName: string;
    lastName: string;
    fullName: string;
    email: string;
    phone: string;
    dateOfBirth?: string;
    gender?: string;
    nationality?: string;
  };
  address: {
    line1: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    countryCode: string;
    /** Free-text location as the user entered it ("London, UK (Remote)"). */
    raw: string;
  };
  links: {
    linkedin: string;
    github: string;
    website: string;
    portfolio: string;
  };
  headline: {
    currentTitle: string;
    currentCompany: string;
    summary: string;
    industry: string;
    experienceLevel: string;
  };
  preferences: {
    expectedSalary: string;
    salaryMin?: number;
    salaryCurrency: string;
    noticePeriodDays?: number;
    needsSponsorship?: boolean;
    willingToRelocate?: boolean;
    targetRoles: string[];
    workplaceTypes: string[];
    locations: string[];
  };
  work: AutofillWorkEntry[];
  education: AutofillEducationEntry[];
  skills: string[];
  certifications: Array<{ name: string; issuer?: string; date?: string }>;
  languages: Array<{ language: string; fluency?: string }>;
  resume: {
    available: boolean;
    fileName: string;
    downloadPath: string;
    hasPdf: boolean;
  };
}

const str = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

/** Split a full name into first/last without mangling single-word names. */
export function splitName(full: string): { firstName: string; lastName: string } {
  const parts = str(full).split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

/**
 * Load the user's Master CV, using the same resolution order as
 * `/api/cvs/master` so autofill and the CV surfaces never disagree about which
 * document is "the" resume.
 */
export async function loadMasterCV(userId: string): Promise<any | null> {
  if (!mongoose.Types.ObjectId.isValid(userId)) return null;
  const objectId = new mongoose.Types.ObjectId(userId);

  const explicit = await CV.findOne({
    userId: objectId,
    $or: [
      { 'metadata.createdVia': 'ai-career-report' },
      { 'metadata.isMaster': true },
      { isMaster: true },
      { cvType: 'master' },
    ],
  })
    .sort({ createdAt: -1 })
    .lean();

  if (explicit) return explicit;

  // Fallback: the oldest CV is what /api/cvs/master treats as master.
  return CV.findOne({ userId: objectId }).sort({ createdAt: 1 }).lean();
}

/** Pull the profile links (LinkedIn/GitHub/portfolio) out of a CV. */
function profilesFromCV(cv: any): Record<string, string> {
  const out: Record<string, string> = {};
  const profiles: any[] = Array.isArray(cv?.cvData?.basics?.profiles) ? cv.cvData.basics.profiles : [];
  for (const profile of profiles) {
    const network = str(profile?.network).toLowerCase();
    const url = str(profile?.url) || str(profile?.username);
    if (!url) continue;
    if (network.includes('linkedin')) out.linkedin = url;
    else if (network.includes('github')) out.github = url;
    else if (network.includes('portfolio')) out.portfolio = url;
    else if (network.includes('website') || network.includes('personal')) out.website = url;
  }
  return out;
}

function workFromCV(cv: any): AutofillWorkEntry[] {
  const work: any[] = Array.isArray(cv?.cvData?.work) ? cv.cvData.work : [];
  return work
    .map((entry) => {
      const endDate = str(entry?.endDate);
      const description =
        str(entry?.summary) ||
        (Array.isArray(entry?.highlights) ? entry.highlights.map(str).filter(Boolean).join('\n') : '');
      return {
        company: str(entry?.name),
        title: str(entry?.position),
        location: str(entry?.location) || undefined,
        startDate: str(entry?.startDate) || undefined,
        endDate: endDate || undefined,
        current: !endDate || /present|current/i.test(endDate),
        description: description || undefined,
      };
    })
    .filter((entry) => entry.company || entry.title)
    .slice(0, 15);
}

function educationFromCV(cv: any): AutofillEducationEntry[] {
  const education: any[] = Array.isArray(cv?.cvData?.education) ? cv.cvData.education : [];
  return education
    .map((entry) => ({
      institution: str(entry?.institution),
      degree: str(entry?.studyType) || undefined,
      fieldOfStudy: str(entry?.area) || undefined,
      startDate: str(entry?.startDate) || undefined,
      endDate: str(entry?.endDate) || undefined,
      grade: str(entry?.score) || undefined,
      location: str(entry?.location) || undefined,
    }))
    .filter((entry) => entry.institution)
    .slice(0, 10);
}

function skillsFromCV(cv: any): string[] {
  const skills: any[] = Array.isArray(cv?.cvData?.skills) ? cv.cvData.skills : [];
  const flat: string[] = [];
  for (const entry of skills) {
    if (typeof entry === 'string') {
      flat.push(entry);
      continue;
    }
    if (Array.isArray(entry?.skills)) flat.push(...entry.skills.map(str));
    else if (Array.isArray(entry?.keywords)) flat.push(...entry.keywords.map(str));
    else if (str(entry?.name)) flat.push(str(entry.name));
  }
  return [...new Set(flat.filter(Boolean))].slice(0, 60);
}

/**
 * Merge the account profile and the Master CV into the extension's autofill
 * profile. The CV wins on résumé-style fields (work history, education, the
 * professional summary); the account wins on identity and contact details,
 * because that is what the user edits in Settings.
 */
export async function buildAutofillProfile(userId: string): Promise<AutofillProfile> {
  const [user, cv] = await Promise.all([
    User.findById(userId).lean<any>(),
    loadMasterCV(userId),
  ]);

  const basics = cv?.cvData?.basics || {};
  const onboarding = user?.onboarding || {};
  const prefs = user?.autoApplyPreferences || {};
  const links = profilesFromCV(cv);

  const fullNameFromCV = str(basics.name);
  const fullName =
    [str(user?.firstName), str(user?.lastName)].filter(Boolean).join(' ') ||
    fullNameFromCV;
  const fallbackSplit = fullNameFromCV ? splitName(fullNameFromCV) : { firstName: '', lastName: '' };

  const cvLocation = basics.location || {};
  const rawLocation = str(user?.location) || str(cvLocation.city);
  const work = workFromCV(cv);
  const current = work.find((entry) => entry.current) || work[0];

  return {
    version: 1,
    identity: {
      firstName: str(user?.firstName) || fallbackSplit.firstName,
      lastName: str(user?.lastName) || fallbackSplit.lastName,
      fullName,
      email: str(user?.email) || str(basics.email),
      phone: str(user?.phone) || str(basics.phone),
      dateOfBirth: str(user?.dateOfBirth) || undefined,
      gender: str(user?.gender) || undefined,
      nationality: str(user?.nationality) || undefined,
    },
    address: {
      line1: str(user?.address),
      city: str(cvLocation.city),
      state: str(cvLocation.region),
      postalCode: str(cvLocation.postalCode),
      country: str(cvLocation.countryCode),
      countryCode: str(cvLocation.countryCode),
      raw: rawLocation,
    },
    links: {
      linkedin: str(user?.linkedin) || links.linkedin || '',
      github: str(user?.github) || links.github || '',
      website: str(user?.website) || str(basics.url) || links.website || '',
      portfolio: links.portfolio || '',
    },
    headline: {
      currentTitle: str(user?.jobTitle) || current?.title || str(basics.label),
      currentCompany: str(user?.company) || current?.company || '',
      summary: str(basics.summary) || str(user?.summary),
      industry: str(user?.industry),
      experienceLevel: str(user?.experience) || str(onboarding.experience_level),
    },
    preferences: {
      expectedSalary: str(onboarding.salary_range),
      salaryMin: typeof onboarding.salary_min === 'number' ? onboarding.salary_min : undefined,
      salaryCurrency: str(onboarding.salary_currency) || 'USD',
      noticePeriodDays: typeof prefs.maxNoticePeriodDays === 'number' ? prefs.maxNoticePeriodDays : undefined,
      needsSponsorship:
        typeof onboarding.visa_required === 'boolean' ? onboarding.visa_required : undefined,
      willingToRelocate: Array.isArray(onboarding.workplace_types)
        ? onboarding.workplace_types.includes('onsite') || onboarding.workplace_types.includes('hybrid')
        : undefined,
      targetRoles: Array.isArray(onboarding.target_roles) ? onboarding.target_roles.map(str).filter(Boolean) : [],
      workplaceTypes: Array.isArray(onboarding.workplace_types) ? onboarding.workplace_types.map(str) : [],
      locations: Array.isArray(onboarding.locations) ? onboarding.locations.map(str).filter(Boolean) : [],
    },
    work,
    education: educationFromCV(cv),
    skills: skillsFromCV(cv),
    certifications: (Array.isArray(cv?.cvData?.certificates) ? cv.cvData.certificates : [])
      .map((cert: any) => ({
        name: str(cert?.name),
        issuer: str(cert?.issuer) || undefined,
        date: str(cert?.date) || undefined,
      }))
      .filter((cert: any) => cert.name)
      .slice(0, 20),
    languages: (Array.isArray(cv?.cvData?.languages) ? cv.cvData.languages : [])
      .map((lang: any) => ({ language: str(lang?.language), fluency: str(lang?.fluency) || undefined }))
      .filter((lang: any) => lang.language)
      .slice(0, 10),
    resume: {
      available: Boolean(cv),
      fileName: `${(fullName || 'Resume').replace(/[^\w .-]/g, '')}.pdf`,
      downloadPath: '/api/extension/resume',
      // PDF generation is attempted on download; the engine treats a failure as
      // "leave the file input for the user".
      hasPdf: Boolean(cv?.cvData?.basics?.name || cv?.cvData?.work?.length),
    },
  };
}
