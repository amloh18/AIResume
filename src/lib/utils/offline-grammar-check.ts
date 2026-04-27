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
    if (!plainText.trim()) return;

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
    const passivePatterns = /\b(was responsible for|helped with|assisted in|duties included)\b/i;
    if (passivePatterns.test(plainText)) {
      issues.push({
        id: `passive-voice-${fieldPath}`,
        type: 'style',
        message: `Consider using active verbs instead of passive phrases in ${fieldName}.`,
        field: fieldPath
      });
    }

    // Check 5: Weasel words / weak words
    const weaselWords = /\b(stuff|things|various|a lot|many|some|good|great|bad)\b/i;
    if (weaselWords.test(plainText)) {
      issues.push({
        id: `weasel-words-${fieldPath}`,
        type: 'style',
        message: `Avoid weak or vague words like "stuff" or "things" in ${fieldName}. Be specific.`,
        field: fieldPath
      });
    }

    // Check 6: Sentences not starting with capital letters (heuristic)
    const sentences = plainText.split(/[.!?]\s+/);
    for (const sentence of sentences) {
      if (sentence && sentence.trim().length > 0) {
        const firstChar = sentence.trim()[0];
        if (firstChar >= 'a' && firstChar <= 'z') {
          issues.push({
            id: `capitalization-${fieldPath}`,
            type: 'grammar',
            message: `Ensure sentences start with a capital letter in ${fieldName}.`,
            field: fieldPath
          });
          break;
        }
      }
    }
  };

  // Check summary
  if (cvData.basics?.summary) {
    checkText(cvData.basics.summary, 'basics.summary', 'Professional Summary');
  }

  // Check work experience descriptions and highlights
  if (Array.isArray(cvData.work)) {
    cvData.work.forEach((job: any, index: number) => {
      if (job.summary) {
        checkText(job.summary, `work[${index}].summary`, `Work Experience (${job.name || 'Company'}) Summary`);
      }
      if (Array.isArray(job.highlights)) {
        job.highlights.forEach((highlight: string, hIndex: number) => {
          checkText(highlight, `work[${index}].highlights[${hIndex}]`, `Work Experience (${job.name || 'Company'}) Bullet Point`);
        });
      }
    });
  }

  // Check education
  if (Array.isArray(cvData.education)) {
    cvData.education.forEach((edu: any, index: number) => {
      if (edu.description) {
        checkText(edu.description, `education[${index}].description`, `Education (${edu.institution || 'School'}) Description`);
      }
    });
  }

  // Check projects
  if (Array.isArray(cvData.projects)) {
    cvData.projects.forEach((proj: any, index: number) => {
      if (proj.description) {
        checkText(proj.description, `projects[${index}].description`, `Project (${proj.name || 'Name'}) Description`);
      }
    });
  }

  return issues;
}
