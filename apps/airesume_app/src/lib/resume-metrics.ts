export function mapExperienceLevelToSeniority(level?: string): string | null {
  if (!level) return null;
  const normalized = String(level).trim().toLowerCase();
  if (normalized === 'entry' || normalized === 'junior') return 'beginner';
  if (normalized === 'mid' || normalized === 'middle' || normalized === 'mid-level') return 'professional';
  if (normalized === 'senior') return 'senior';
  if (normalized === 'executive' || normalized === 'lead' || normalized === 'principal') return 'executive';
  return null;
}

export function isDeepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!isDeepEqual(a[key], b[key])) return false;
  }
  return true;
}

export function extractCvIdFromResponse(result: any): string | null {
  const cvId =
    result?.data?.cv?.id ||
    result?.data?.cv?._id ||
    result?.data?.id ||
    result?.cv?.id ||
    result?.cv?._id ||
    result?.id ||
    null;

  if (cvId) {
    return String(cvId);
  }

  return null;
}
