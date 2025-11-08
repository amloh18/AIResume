/**
 * Utility functions to transform career report text between personal and shareable formats
 */

/**
 * Transforms third person text to second person with name (for personal viewing)
 * Example: "The candidate should..." -> "John, you should..." or "You should..."
 */
export function personalizeReportText(
  text: string,
  userName: string | null | undefined,
  useName: boolean = true
): string {
  if (!text) return text;

  let personalized = text;

  // Replace "the candidate" with "you" or "[Name], you"
  personalized = personalized.replace(
    /\bthe candidate\b/gi,
    useName && userName ? `${userName}, you` : 'you'
  );

  // Replace "their" with "your"
  personalized = personalized.replace(/\btheir\b/gi, 'your');

  // Replace "they" with "you"
  personalized = personalized.replace(/\bthey\b/gi, 'you');

  // Replace "them" with "you"
  personalized = personalized.replace(/\bthem\b/gi, 'you');

  // Replace "this candidate" with "you" or "[Name], you"
  personalized = personalized.replace(
    /\bthis candidate\b/gi,
    useName && userName ? `${userName}, you` : 'you'
  );

  // Replace "the candidate's" with "your"
  personalized = personalized.replace(/\bthe candidate's\b/gi, 'your');

  // Fix capitalization at the start of sentences
  personalized = personalized.replace(/^you\b/g, (match, offset) => {
    // Only capitalize if it's at the start of a sentence
    if (offset === 0 || personalized[offset - 1] === '.') {
      return useName && userName ? `${userName}, you` : 'You';
    }
    return match;
  });

  // Fix "you should" -> "You should" at sentence start
  personalized = personalized.replace(/(?:^|\.\s+)(you should)/gi, (match, p1) => {
    return match.replace(p1, useName && userName ? `${userName}, you should` : 'You should');
  });

  // Fix "you need" -> "You need" at sentence start
  personalized = personalized.replace(/(?:^|\.\s+)(you need)/gi, (match, p1) => {
    return match.replace(p1, useName && userName ? `${userName}, you need` : 'You need');
  });

  return personalized;
}

/**
 * Ensures text is in third person format (for sharing/downloading)
 * Example: "You should..." -> "The candidate should..."
 */
export function makeShareableReportText(
  text: string,
  userName: string | null | undefined
): string {
  if (!text) return text;

  let shareable = text;

  // Replace "[Name], you" or "You" at sentence start with "The candidate"
  shareable = shareable.replace(
    /(?:^|\.\s+)(?:[A-Z][a-z]+,\s+)?you\b/gi,
    (match) => {
      // Check if it's at the start of a sentence
      const isSentenceStart = /(?:^|\.\s+)/.test(match);
      return isSentenceStart ? 'The candidate' : 'the candidate';
    }
  );

  // Replace "you" (not at sentence start) with "the candidate"
  shareable = shareable.replace(/\byou\b/gi, 'the candidate');

  // Replace "your" with "their"
  shareable = shareable.replace(/\byour\b/gi, 'their');

  // Replace "you're" with "they're"
  shareable = shareable.replace(/\byou're\b/gi, "they're");

  // Replace "you've" with "they've"
  shareable = shareable.replace(/\byou've\b/gi, "they've");

  // Fix capitalization
  shareable = shareable.replace(/^the candidate\b/g, 'The candidate');

  return shareable;
}

/**
 * Transforms a career analysis object to personal format
 */
export function personalizeCareerAnalysis(
  analysis: any,
  userName: string | null | undefined
): any {
  if (!analysis) return analysis;

  const personalized = { ...analysis };

  // Transform experience level rationale
  if (personalized.experienceLevel?.rationale) {
    personalized.experienceLevel = {
      ...personalized.experienceLevel,
      rationale: personalizeReportText(
        personalized.experienceLevel.rationale,
        userName,
        true // Use name in opening
      )
    };
  }

  // Transform career path steps
  if (personalized.careerPath) {
    personalized.careerPath = {
      step1: personalized.careerPath.step1 ? {
        ...personalized.careerPath.step1,
        reasoning: personalizeReportText(
          personalized.careerPath.step1.reasoning,
          userName,
          personalized.careerPath.step1 === personalized.careerPath.step1 // Only use name in first step
        )
      } : personalized.careerPath.step1,
      step2: personalized.careerPath.step2 ? {
        ...personalized.careerPath.step2,
        reasoning: personalizeReportText(
          personalized.careerPath.step2.reasoning,
          userName,
          false
        )
      } : personalized.careerPath.step2,
      step3: personalized.careerPath.step3 ? {
        ...personalized.careerPath.step3,
        reasoning: personalizeReportText(
          personalized.careerPath.step3.reasoning,
          userName,
          false
        )
      } : personalized.careerPath.step3
    };
  }

  // Transform strategic suggestions
  if (personalized.strategicSuggestions) {
    const suggestions = { ...personalized.strategicSuggestions };
    
    if (suggestions.hardSkill && typeof suggestions.hardSkill === 'object' && suggestions.hardSkill.rationale) {
      suggestions.hardSkill = {
        ...suggestions.hardSkill,
        rationale: personalizeReportText(suggestions.hardSkill.rationale, userName, false)
      };
    }
    
    if (suggestions.softSkill && typeof suggestions.softSkill === 'object' && suggestions.softSkill.rationale) {
      suggestions.softSkill = {
        ...suggestions.softSkill,
        rationale: personalizeReportText(suggestions.softSkill.rationale, userName, false)
      };
    }
    
    if (suggestions.experienceReframe && typeof suggestions.experienceReframe === 'object' && suggestions.experienceReframe.rationale) {
      suggestions.experienceReframe = {
        ...suggestions.experienceReframe,
        rationale: personalizeReportText(suggestions.experienceReframe.rationale, userName, false)
      };
    }

    personalized.strategicSuggestions = suggestions;
  }

  return personalized;
}

/**
 * Transforms a career analysis object to shareable format (third person)
 */
export function makeShareableCareerAnalysis(
  analysis: any,
  userName: string | null | undefined
): any {
  if (!analysis) return analysis;

  const shareable = { ...analysis };

  // Transform experience level rationale
  if (shareable.experienceLevel?.rationale) {
    shareable.experienceLevel = {
      ...shareable.experienceLevel,
      rationale: makeShareableReportText(
        shareable.experienceLevel.rationale,
        userName
      )
    };
  }

  // Transform career path steps
  if (shareable.careerPath) {
    shareable.careerPath = {
      step1: shareable.careerPath.step1 ? {
        ...shareable.careerPath.step1,
        reasoning: makeShareableReportText(
          shareable.careerPath.step1.reasoning,
          userName
        )
      } : shareable.careerPath.step1,
      step2: shareable.careerPath.step2 ? {
        ...shareable.careerPath.step2,
        reasoning: makeShareableReportText(
          shareable.careerPath.step2.reasoning,
          userName
        )
      } : shareable.careerPath.step2,
      step3: shareable.careerPath.step3 ? {
        ...shareable.careerPath.step3,
        reasoning: makeShareableReportText(
          shareable.careerPath.step3.reasoning,
          userName
        )
      } : shareable.careerPath.step3
    };
  }

  // Transform strategic suggestions
  if (shareable.strategicSuggestions) {
    const suggestions = { ...shareable.strategicSuggestions };
    
    if (suggestions.hardSkill && typeof suggestions.hardSkill === 'object' && suggestions.hardSkill.rationale) {
      suggestions.hardSkill = {
        ...suggestions.hardSkill,
        rationale: makeShareableReportText(suggestions.hardSkill.rationale, userName)
      };
    }
    
    if (suggestions.softSkill && typeof suggestions.softSkill === 'object' && suggestions.softSkill.rationale) {
      suggestions.softSkill = {
        ...suggestions.softSkill,
        rationale: makeShareableReportText(suggestions.softSkill.rationale, userName)
      };
    }
    
    if (suggestions.experienceReframe && typeof suggestions.experienceReframe === 'object' && suggestions.experienceReframe.rationale) {
      suggestions.experienceReframe = {
        ...suggestions.experienceReframe,
        rationale: makeShareableReportText(suggestions.experienceReframe.rationale, userName)
      };
    }

    shareable.strategicSuggestions = suggestions;
  }

  return shareable;
}

