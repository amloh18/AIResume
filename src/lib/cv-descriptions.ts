export function getStrengthDescription(strength: string): string {
  const str = strength.toLowerCase();
  if (str.includes('keyword') || str.includes('alignment')) return 'Excellent alignment with industry-standard terminology.';
  if (str.includes('structure') || str.includes('layout')) return 'Easy for human recruiters and ATS software to scan quickly.';
  if (str.includes('contact') || str.includes('email') || str.includes('phone') || str.includes('details')) return 'Essential details are prominent and formatted correctly.';
  if (str.includes('skills') || str.includes('expertise')) return 'Well-defined skill sections showing technical competencies.';
  if (str.includes('experience') || str.includes('work') || str.includes('history') || str.includes('timeline')) return 'Rich work history with clear progression and dates.';
  return 'Contributes to a highly readable and professional CV.';
}

export function getWeaknessDescription(weakness: string): string {
  const str = weakness.toLowerCase();
  if (str.includes('keyword') || str.includes('missing')) return 'Essential industry terms are missing; this hurts ATS keyword screening.';
  if (str.includes('quantified') || str.includes('achievement') || str.includes('metrics') || str.includes('results')) return 'Recruiters favor metrics (e.g. sales grown 20%, time saved by 5h).';
  if (str.includes('summary') || str.includes('profile') || str.includes('objective')) return 'A strong summary at the top helps frame your career elevator pitch.';
  if (str.includes('skills') || str.includes('technical')) return 'Define a clearer skills section to highlight core keywords.';
  if (str.includes('length') || str.includes('word')) return 'Adjust length to avoid fluff and keep sections crisp.';
  return 'Improve this section to optimize your resume and bypass ATS filters.';
}
