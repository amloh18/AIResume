export interface FormattingIssue {
  id: string;
  type: 'grammar' | 'formatting' | 'style';
  message: string;
  field: string;
}

export function checkSyntaxAndGrammar(cvData: any): FormattingIssue[] {
  if (!cvData) return [];
  const issues: FormattingIssue[] = [];

  const checkText = (text: string, fieldPath: string, fieldName: string) => {
    if (!text || typeof text !== 'string') return;
    
    // Strip HTML tags for checking
    const plainText = text.replace(/<[^>]*>?/gm, '');

    // Check 1: Double spaces
    if (/\s{2,}/.test(plainText)) {
      issues.push({
        id: `double-space-${fieldPath}`,
        type: 'formatting',
        message: `Double spaces detected in ${fieldName}.`,
        field: fieldPath
      });
    }

    // Check 2: Repeated words (case-insensitive)
    const repeatedWordMatch = plainText.match(/\b(\w+)\s+\1\b/i);
    if (repeatedWordMatch) {
      issues.push({
        id: `repeated-word-${fieldPath}`,
        type: 'grammar',
        message: `Repeated word "${repeatedWordMatch[1]}" found in ${fieldName}.`,
        field: fieldPath
      });
    }

    // Check 3: Missing space after punctuation
    if (/([a-zA-Z])[.,;!?:]([a-zA-Z])/.test(plainText)) {
      issues.push({
        id: `punctuation-space-${fieldPath}`,
        type: 'formatting',
        message: `Missing space after punctuation in ${fieldName}.`,
        field: fieldPath
      });
    }

    // Check 4: Passive voice patterns
    const passivePatterns = /\b(was responsible for|helped with|assisted in)\b/i;
    if (passivePatterns.test(plainText)) {
      issues.push({
        id: `passive-voice-${fieldPath}`,
        type: 'style',
        message: `Consider using active verbs instead of passive phrases in ${fieldName}.`,
        field: fieldPath
      });
    }
  };

  // Check Summary
  checkText(cvData.basics?.summary, 'basics.summary', 'Professional Summary');

  // Check Work Experience
  if (Array.isArray(cvData.work)) {
    cvData.work.forEach((job: any, index: number) => {
      checkText(job.summary, `work[${index}].summary`, `Work Experience #${index + 1} Description`);
    });
  }

  // Check Projects
  if (Array.isArray(cvData.projects)) {
    cvData.projects.forEach((proj: any, index: number) => {
      checkText(proj.description, `projects[${index}].description`, `Project #${index + 1} Description`);
    });
  }

  return issues;
}
