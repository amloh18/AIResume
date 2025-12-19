import type { UnifiedCVDataStructure } from '@/types/unified-cv-schema';

export type ResumeEnhancerSeniority =
  | 'beginner'
  | 'experienced'
  | 'professional'
  | 'senior'
  | 'executive';

export function inferSeniorityFromYears(years: number): ResumeEnhancerSeniority {
  if (years < 2) return 'beginner';
  if (years < 5) return 'experienced';
  if (years < 10) return 'professional';
  if (years < 15) return 'senior';
  return 'executive';
}

export function calculateTotalWorkYears(work: any[] | undefined): number {
  try {
    const now = new Date();
    let totalMonths = 0;
    (work || []).forEach((exp: any) => {
      if (!exp?.startDate) return;
      const startDate = new Date(exp.startDate);
      const endDate =
        exp.endDate && exp.endDate !== 'Present'
          ? new Date(exp.endDate)
          : now;
      const months =
        (endDate.getFullYear() - startDate.getFullYear()) * 12 +
        (endDate.getMonth() - startDate.getMonth());
      totalMonths += Math.max(0, months);
    });
    return totalMonths / 12;
  } catch {
    return 0;
  }
}

export function inferRoleContextFromCVData(
  cvData: UnifiedCVDataStructure
): { targetRole: string | null; seniorityLevel: ResumeEnhancerSeniority | null } {
  const targetRole =
    (cvData as any)?.basics?.label ||
    (cvData as any)?.work?.[0]?.position ||
    '';

  const years = calculateTotalWorkYears((cvData as any)?.work || []);
  const seniorityLevel = years > 0 ? inferSeniorityFromYears(years) : null;

  return {
    targetRole: targetRole?.trim() ? String(targetRole).trim() : null,
    seniorityLevel
  };
}









