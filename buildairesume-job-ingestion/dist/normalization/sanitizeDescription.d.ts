export interface DescriptionSanitizeResult {
    sanitizedHtml: string;
    descriptionText: string;
}
export declare function sanitizeDescription(rawHtmlOrText?: string): DescriptionSanitizeResult;
