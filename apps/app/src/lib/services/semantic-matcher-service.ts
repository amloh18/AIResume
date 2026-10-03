/**
 * Semantic Matching Service
 * Hybrid semantic matching with three layers:
 * 1. Dictionary-based matching (fast, no API)
 * 2. Fuzzy matching (Levenshtein distance, stemming)
 * 3. AI fallback (for unknown terms)
 */

export interface SemanticMatchResult {
  matched: boolean;
  matchType: 'exact' | 'dictionary' | 'fuzzy' | 'none';
  foundTerm?: string;
  confidenceScore: number; // 0.0 to 1.0
  originalTerm: string;
}

// Dictionary of keyword synonyms
const KEYWORD_SYNONYMS: Record<string, string[]> = {
  "Project Management": ["project management", "managing projects", "pm", "project lead", "scrum master", "project coordination", "project planning"],
  "Data Analysis": ["data analysis", "analytics", "analyzing data", "business intelligence", "bi", "data analytics", "analytical skills"],
  "Python": ["python", "pandas", "numpy", "django", "flask", "py"],
  "JavaScript": ["javascript", "js", "node.js", "nodejs", "typescript", "ts"],
  "Leadership": ["leadership", "leading teams", "team leadership", "leading", "lead", "managed", "management"],
  "Communication": ["communication", "presenting", "public speaking", "negotiation", "stakeholder management", "interpersonal skills"],
  "SQL": ["sql", "database", "mysql", "postgresql", "oracle", "postgres"],
  "Machine Learning": ["machine learning", "ml", "deep learning", "neural networks", "ai", "artificial intelligence"],
  "Agile": ["agile", "scrum", "kanban", "sprint", "sprint planning"],
  "Cloud": ["cloud", "aws", "azure", "gcp", "google cloud", "amazon web services"],
  "DevOps": ["devops", "ci/cd", "continuous integration", "continuous deployment", "docker", "kubernetes"],
  "React": ["react", "reactjs", "react.js", "redux"],
  "Node.js": ["node.js", "nodejs", "node", "express"],
  "Java": ["java", "spring", "spring boot"],
  "C++": ["c++", "cpp", "c plus plus"],
  "C#": ["c#", "csharp", "dotnet", ".net"],
};

/**
 * Escape special regex characters
 */
export function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Calculate Levenshtein distance between two strings
 */
export function calculateLevenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  // Initialize matrix
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,     // deletion
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j - 1] + 1  // substitution
        );
      }
    }
  }

  return matrix[len1][len2];
}

/**
 * Basic word stemming (simplified)
 */
function stemWord(word: string): string {
  // Remove common suffixes
  const suffixes = ['ing', 'ed', 'er', 'est', 'ly', 'tion', 'sion', 's', 'es'];
  const lower = word.toLowerCase();
  
  for (const suffix of suffixes) {
    if (lower.endsWith(suffix) && lower.length > suffix.length + 2) {
      return lower.slice(0, -suffix.length);
    }
  }
  
  return lower;
}

/**
 * Normalize text for matching
 * - Lowercase
 * - Remove punctuation
 * - Strip formatting
 * - Normalize whitespace
 */
export function normalizeForMatching(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Replace punctuation with space
    .replace(/\s+/g, ' ')      // Normalize whitespace
    .trim();
}

/**
 * Check if a word appears with word boundaries (prevents partial matches)
 */
function checkWordBoundary(text: string, word: string, position: number): boolean {
  const before = position > 0 ? text[position - 1] : ' ';
  const after = position + word.length < text.length ? text[position + word.length] : ' ';
  return !/\w/.test(before) && !/\w/.test(after);
}

/**
 * Check for exact match with word boundaries
 */
function checkExactMatch(cvText: string, requiredTerm: string): { matched: boolean; position?: number } {
  const normalizedText = normalizeForMatching(cvText);
  const normalizedTerm = normalizeForMatching(requiredTerm);
  
  // Use word boundary regex
  const escapedTerm = escapeRegExp(normalizedTerm);
  const regex = new RegExp(`\\b${escapedTerm}\\b`, 'i');
  const match = regex.exec(cvText);
  
  if (match) {
    return { matched: true, position: match.index };
  }
  
  return { matched: false };
}

/**
 * Check dictionary synonyms
 */
function checkDictionaryMatch(cvText: string, requiredTerm: string): { matched: boolean; foundTerm?: string } {
  const normalizedText = normalizeForMatching(cvText);
  const synonyms = KEYWORD_SYNONYMS[requiredTerm] || [];
  
  // Check if the required term itself is in the text
  const exactCheck = checkExactMatch(cvText, requiredTerm);
  if (exactCheck.matched) {
    return { matched: true, foundTerm: requiredTerm };
  }
  
  // Check synonyms
  for (const synonym of synonyms) {
    const synonymCheck = checkExactMatch(cvText, synonym);
    if (synonymCheck.matched) {
      return { matched: true, foundTerm: synonym };
    }
  }
  
  return { matched: false };
}

/**
 * Check fuzzy match using Levenshtein distance
 */
function checkFuzzyMatch(cvText: string, requiredTerm: string): { matched: boolean; foundTerm?: string; distance?: number } {
  const normalizedText = normalizeForMatching(cvText);
  const normalizedTerm = normalizeForMatching(requiredTerm);
  
  // Split text into words
  const words = normalizedText.split(/\s+/);
  const termWords = normalizedTerm.split(/\s+/);
  
  // For single-word terms, check each word in the text
  if (termWords.length === 1) {
    const termWord = termWords[0];
    for (const word of words) {
      const distance = calculateLevenshteinDistance(word, termWord);
      const maxDistance = Math.max(1, Math.floor(termWord.length * 0.2)); // Max 20% difference
      
      if (distance <= maxDistance && distance <= 2) {
        return { matched: true, foundTerm: word, distance };
      }
      
      // Check stemmed versions
      const stemmedWord = stemWord(word);
      const stemmedTerm = stemWord(termWord);
      if (stemmedWord === stemmedTerm) {
        return { matched: true, foundTerm: word, distance: 0 };
      }
    }
  } else {
    // For multi-word terms, check if all words appear in sequence
    const termPattern = termWords.map(w => escapeRegExp(w)).join('\\s+');
    const regex = new RegExp(termPattern, 'i');
    if (regex.test(cvText)) {
      return { matched: true, foundTerm: requiredTerm, distance: 0 };
    }
  }
  
  return { matched: false };
}

/**
 * Main semantic matching function
 * Checks in order: exact -> dictionary -> fuzzy
 */
export function checkSemanticMatch(requiredTerm: string, cvText: string): SemanticMatchResult {
  if (!requiredTerm || !cvText) {
    return {
      matched: false,
      matchType: 'none',
      confidenceScore: 0,
      originalTerm: requiredTerm
    };
  }
  
  // 1. Check exact match
  const exactMatch = checkExactMatch(cvText, requiredTerm);
  if (exactMatch.matched) {
    return {
      matched: true,
      matchType: 'exact',
      foundTerm: requiredTerm,
      confidenceScore: 1.0,
      originalTerm: requiredTerm
    };
  }
  
  // 2. Check dictionary synonyms
  const dictMatch = checkDictionaryMatch(cvText, requiredTerm);
  if (dictMatch.matched && dictMatch.foundTerm) {
    return {
      matched: true,
      matchType: 'dictionary',
      foundTerm: dictMatch.foundTerm,
      confidenceScore: 0.9, // High confidence for dictionary matches
      originalTerm: requiredTerm
    };
  }
  
  // 3. Check fuzzy match
  const fuzzyMatch = checkFuzzyMatch(cvText, requiredTerm);
  if (fuzzyMatch.matched && fuzzyMatch.foundTerm) {
    const distance = fuzzyMatch.distance || 0;
    const maxLen = Math.max(requiredTerm.length, fuzzyMatch.foundTerm.length);
    const confidence = Math.max(0.6, 1.0 - (distance / maxLen)); // Confidence based on distance
    
    return {
      matched: true,
      matchType: 'fuzzy',
      foundTerm: fuzzyMatch.foundTerm,
      confidenceScore: confidence,
      originalTerm: requiredTerm
    };
  }
  
  // No match found
  return {
    matched: false,
    matchType: 'none',
    confidenceScore: 0,
    originalTerm: requiredTerm
  };
}

/**
 * Check if text contains any of the required keywords (for batch checking)
 */
export function checkMultipleKeywords(requiredTerms: string[], cvText: string): Map<string, SemanticMatchResult> {
  const results = new Map<string, SemanticMatchResult>();
  
  for (const term of requiredTerms) {
    results.set(term, checkSemanticMatch(term, cvText));
  }
  
  return results;
}

