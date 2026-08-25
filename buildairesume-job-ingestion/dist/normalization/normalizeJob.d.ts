import { RawJob } from '../sources/base/SourceTypes';
import { NormalizedJob } from '../models/Job';
export declare function generateCanonicalId(normalizedCompany: string, normalizedTitle: string, countryCode: string, city: string): string;
export declare function normalizeRawJob(raw: RawJob): NormalizedJob;
