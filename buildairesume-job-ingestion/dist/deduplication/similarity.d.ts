export declare function calculateTokenJaccardSimilarity(textA: string, textB: string): number;
export declare function areJobsSimilar(titleA: string, descA: string, titleB: string, descB: string, threshold?: number): {
    isDuplicate: boolean;
    confidence: number;
};
