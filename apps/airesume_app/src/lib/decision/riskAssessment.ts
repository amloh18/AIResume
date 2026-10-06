export interface RiskAssessment {
  riskLevel: 'low' | 'medium' | 'high';
  riskScore: number; // 0-100, higher = riskier
  factors: Array<{
    factor: string;
    weight: number;
    triggered: boolean;
    description: string;
  }>;
  recommendation: 'auto' | 'review' | 'manual' | 'skip';
}

const RISK_FACTORS = [
  {
    factor: 'unknown_ats',
    weight: 15,
    description: 'ATS type is unknown — automation may fail',
  },
  {
    factor: 'no_job_url',
    weight: 20,
    description: 'No application URL provided — cannot automate',
  },
  {
    factor: 'high_salary_range',
    weight: 10,
    description: 'Very high salary range — may indicate fraudulent listing',
  },
  {
    factor: 'vague_description',
    weight: 10,
    description: 'Job description is unusually short or vague',
  },
  {
    factor: 'no_company_info',
    weight: 12,
    description: 'Limited company information available',
  },
  {
    factor: 'expired_listing',
    weight: 18,
    description: 'Job listing may be expired based on posting date',
  },
  {
    factor: 'high_competition',
    weight: 8,
    description: 'Many applicants already — lower success probability',
  },
  {
    factor: 'new_account',
    weight: 5,
    description: 'User account is new — lower trust baseline',
  },
];

/**
 * Assesses risk level of an application for determining mode (auto/review/manual/skip).
 */
export function assessApplicationRisk(ctx: {
  atsType?: string;
  jobUrl?: string;
  salaryMax?: number;
  jobDescription?: string;
  company?: string;
  postedAgeDays?: number;
  applicantsCount?: number;
  accountAgeDays?: number;
}): RiskAssessment {
  const factors = RISK_FACTORS.map((rf) => {
    let triggered = false;

    switch (rf.factor) {
      case 'unknown_ats':
        triggered = !ctx.atsType || ctx.atsType === 'unknown';
        break;
      case 'no_job_url':
        triggered = !ctx.jobUrl;
        break;
      case 'high_salary_range':
        triggered = Boolean(ctx.salaryMax && ctx.salaryMax > 500000);
        break;
      case 'vague_description':
        triggered = Boolean(ctx.jobDescription && ctx.jobDescription.length < 200);
        break;
      case 'no_company_info':
        triggered = !ctx.company || ctx.company.length < 2;
        break;
      case 'expired_listing':
        triggered = Boolean(ctx.postedAgeDays && ctx.postedAgeDays > 60);
        break;
      case 'high_competition':
        triggered = Boolean(ctx.applicantsCount && ctx.applicantsCount > 500);
        break;
      case 'new_account':
        triggered = Boolean(ctx.accountAgeDays && ctx.accountAgeDays < 7);
        break;
    }

    return { ...rf, triggered };
  });

  const riskScore = factors
    .filter((f) => f.triggered)
    .reduce((sum, f) => sum + f.weight, 0);

  let riskLevel: RiskAssessment['riskLevel'] = 'low';
  if (riskScore >= 40) riskLevel = 'high';
  else if (riskScore >= 20) riskLevel = 'medium';

  let recommendation: RiskAssessment['recommendation'] = 'auto';
  if (riskLevel === 'high') recommendation = 'manual';
  else if (riskLevel === 'medium') recommendation = 'review';

  return { riskLevel, riskScore, factors, recommendation };
}
