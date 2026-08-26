export function calculateTokenJaccardSimilarity(textA: string, textB: string): number {
  if (!textA || !textB) return 0;
  if (textA === textB) return 1.0;

  const tokensA = new Set(
    textA
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter((t) => t.length > 2)
  );

  const tokensB = new Set(
    textB
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter((t) => t.length > 2)
  );

  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let intersectionCount = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) {
      intersectionCount++;
    }
  }

  const unionCount = tokensA.size + tokensB.size - intersectionCount;
  return unionCount === 0 ? 0 : intersectionCount / unionCount;
}

export function areJobsSimilar(
  titleA: string,
  descA: string,
  titleB: string,
  descB: string,
  threshold = 0.85
): { isDuplicate: boolean; confidence: number } {
  const titleSim = calculateTokenJaccardSimilarity(titleA, titleB);
  if (titleSim < 0.6) {
    return { isDuplicate: false, confidence: titleSim };
  }

  const descSim = calculateTokenJaccardSimilarity(descA, descB);
  // Weighted: 40% title, 60% description
  const confidence = titleSim * 0.4 + descSim * 0.6;

  return {
    isDuplicate: confidence >= threshold,
    confidence: Math.round(confidence * 100) / 100,
  };
}
