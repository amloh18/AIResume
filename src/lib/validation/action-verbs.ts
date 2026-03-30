/**
 * Strong Action Verbs for CV Bullet Points
 *
 * Used by the preview validator to flag weak bullet openings.
 * Organized by category for suggestion purposes.
 */

export const ACTION_VERBS = new Set([
  // Management & Leadership
  'administered', 'advised', 'advocated', 'authorized', 'chaired',
  'coached', 'commanded', 'coordinated', 'counseled', 'delegated',
  'developed', 'directed', 'drove', 'empowered', 'enabled',
  'endorsed', 'engineered', 'established', 'executed', 'facilitated',
  'founded', 'guided', 'headed', 'hired', 'influenced',
  'initiated', 'inspired', 'instructed', 'led', 'managed',
  'mentored', 'mobilized', 'monitored', 'motivated', 'navigated',
  'orchestrated', 'organized', 'oversaw', 'piloted', 'presided',
  'prioritized', 'recruited', 'regulated', 'reorganized', 'resolved',
  'revitalized', 'spearheaded', 'steered', 'strengthened', 'supervised',
  'trained', 'unified',

  // Achievement & Accomplishment
  'achieved', 'accomplished', 'advanced', 'attained', 'completed',
  'demonstrated', 'delivered', 'earned', 'elevated', 'exceeded',
  'excelled', 'expanded', 'gained', 'generated', 'improved',
  'increased', 'maximized', 'merited', 'optimized', 'outperformed',
  'overcame', 'produced', 'profited', 'ranked', 'realized',
  'received', 'recognized', 'reduced', 'resolved', 'restored',
  'succeeded', 'surpassed', 'transformed', 'triumphed', 'upgraded',
  'won',

  // Communication
  'addressed', 'advertised', 'arbitrated', 'articulated', 'authored',
  'briefed', 'collaborated', 'communicated', 'composed', 'conveyed',
  'corresponded', 'critiqued', 'documented', 'drafted', 'edited',
  'educated', 'elicited', 'endorsed', 'explained', 'expressed',
  'formulated', 'influenced', 'informed', 'interpreted', 'interviewed',
  'lectured', 'mediated', 'negotiated', 'outlined', 'persuaded',
  'presented', 'promoted', 'proposed', 'publicized', 'published',
  'recommended', 'reconciled', 'recruited', 'reported', 'researched',
  'responded', 'reviewed', 'revised', 'solicited', 'spoke',
  'suggested', 'summarized', 'synthesized', 'translated', 'wrote',

  // Technical & Analysis
  'analyzed', 'architected', 'assessed', 'automated', 'built',
  'calculated', 'catalogued', 'classified', 'coded', 'computed',
  'configured', 'constructed', 'converted', 'created', 'customized',
  'debugged', 'decreased', 'defined', 'deployed', 'designed',
  'detected', 'determined', 'developed', 'diagnosed', 'discovered',
  'displayed', 'documented', 'engineered', 'enforced', 'evaluated',
  'examined', 'explored', 'extracted', 'fabricated', 'figured',
  'forecasted', 'formulated', 'gathered', 'identified', 'implemented',
  'indexed', 'inspected', 'installed', 'integrated', 'investigated',
  'launched', 'located', 'maintained', 'manufactured', 'mapped',
  'measured', 'mined', 'modeled', 'modified', 'networked',
  'operated', 'parsed', 'pinpointed', 'planned', 'predicted',
  'prepared', 'processed', 'programmed', 'projected', 'provisioned',
  'qualified', 'quantified', 'queried', 'rebuilt', 'redesigned',
  'reduced', 'refactored', 'remodeled', 'repaired', 'replaced',
  'restored', 'reversed', 'scaffolded', 'scanned', 'schemed',
  'solved', 'specified', 'studied', 'surveyed', 'systematized',
  'tested', 'troubleshot', 'uncovered', 'validated', 'verified',

  // Creative & Design
  'adapted', 'began', 'brainstormed', 'captured', 'centralized',
  'changed', 'conceptualized', 'consolidated', 'contributed', 'curated',
  'delivered', 'designed', 'developed', 'devised', 'displayed',
  'drafted', 'drew', 'enacted', 'enhanced', 'enlivened',
  'envisioned', 'established', 'exhibited', 'fashioned', 'finalized',
  'forged', 'formed', 'formulated', 'founded', 'generated',
  'illustrated', 'imagined', 'improvised', 'incorporated', 'innovated',
  'introduced', 'invented', 'launched', 'modernized', 'originated',
  'overhauled', 'performed', 'planned', 'pioneered', 'previewed',
  'ran', 'redesigned', 'refined', 'refreshed', 'remodeled',
  'renovated', 'renovated', 'reorganized', 'replaced', 'revamped',
  'revolutionized', 'shaped', 'showcased', 'simplified', 'started',
  'strategized', 'streamlined', 'tailored', 'unveiled', 'updated',
  'visualized',

  // Support & Service
  'aided', 'arranged', 'assisted', 'bolstered', 'cared',
  'clarified', 'cooperated', 'contributed', 'corrected', 'counseled',
  'demonstrated', 'eased', 'elevated', 'enabled', 'encouraged',
  'ensured', 'expedited', 'facilitated', 'familiarized', 'fostered',
  'furnished', 'guaranteed', 'handled', 'helped', 'hosted',
  'insured', 'interceded', 'intervened', 'mobilized', 'nurtured',
  'partnered', 'provided', 'relieved', 'represented', 'responded',
  'satisfied', 'served', 'serviced', 'set', 'settled',
  'shielded', 'solved', 'stabilized', 'stood', 'strengthened',
  'supported', 'sustained', 'tended', 'tutored', 'volunteered',

  // Planning & Strategy
  'allocated', 'anticipated', 'appraised', 'assessed', 'audited',
  'balanced', 'budgeted', 'clarified', 'collected', 'conceived',
  'concluded', 'conducted', 'considered', 'critiqued', 'decided',
  'defined', 'delegated', 'derived', 'determined', 'developed',
  'documented', 'ensured', 'estimated', 'evaluated', 'examined',
  'forecasted', 'formulated', 'identified', 'implemented', 'interpreted',
  'interviewed', 'investigated', 'justified', 'mapped', 'measured',
  'navigated', 'observed', 'organized', 'outlined', 'performed',
  'planned', 'prepared', 'prioritized', 'programmed', 'projected',
  'proposed', 'proved', 'qualified', 'quantified', 'researched',
  'reviewed', 'scheduled', 'screened', 'searched', 'selected',
  'specified', 'studied', 'surveyed', 'systematized', 'tested',
  'tracked', 'validated', 'verified',
]);

/**
 * Check if a word is a strong action verb
 */
export function isActionVerb(word: string): boolean {
  return ACTION_VERBS.has(word.toLowerCase().trim());
}

/**
 * Check if a string starts with a strong action verb
 */
export function startsWithActionVerb(text: string): boolean {
  if (!text?.trim()) return false;
  const firstWord = text.trim().split(/\s+/)[0].toLowerCase().replace(/[^a-z]/g, '');
  return ACTION_VERBS.has(firstWord);
}

/**
 * Suggest action verbs similar to a given word
 */
export function suggestActionVerbs(weakWord: string): string[] {
  const lower = weakWord.toLowerCase();
  const suggestions: string[] = [];

  for (const verb of Array.from(ACTION_VERBS)) {
    if (verb.startsWith(lower[0]) && suggestions.length < 5) {
      suggestions.push(verb.charAt(0).toUpperCase() + verb.slice(1));
    }
  }

  return suggestions;
}
