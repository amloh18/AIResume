import { ExperienceLevel } from '../models/Job';
export interface TitleNormalizationResult {
    title: string;
    normalizedTitle: string;
    level: ExperienceLevel;
}
export declare function normalizeTitle(rawTitle: string): TitleNormalizationResult;
