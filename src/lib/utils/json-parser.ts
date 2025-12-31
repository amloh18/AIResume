/**
 * Robust JSON parsing utility
 * Handles common AI response issues like markdown blocks, trailing commas, and unescaped characters.
 */

// Define interface for parsing options
export interface JsonParseOptions {
    attemptRepair?: boolean;
    debug?: boolean;
}

/**
 * Robust JSON parsing with multiple fix attempts and recovery mechanism
 */
export function parseRobustJson(input: string, options: JsonParseOptions = {}): any {
    let jsonText = input;

    // 1. Basic Cleanup
    // Remove markdown code blocks
    jsonText = jsonText
        .replace(/```json[\s\S]*?\n/g, '')
        .replace(/```[\s\S]*?\n/g, '')
        .replace(/```/g, '')
        .trim();

    // Extract JSON object or array - try to find the main structure
    let jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        jsonMatch = jsonText.match(/\[[\s\S]*\]/);
    }

    if (!jsonMatch) {
        // Try to find from first brace/bracket manually if regex fails (sometimes helps with nested structures)
        const firstBrace = jsonText.indexOf('{');
        const lastBrace = jsonText.lastIndexOf('}');
        const firstBracket = jsonText.indexOf('[');
        const lastBracket = jsonText.lastIndexOf(']');

        // Determine if it looks more like an object or array
        const isObject = firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket);

        if (isObject && firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            jsonMatch = [jsonText.substring(firstBrace, lastBrace + 1)];
        } else if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
            jsonMatch = [jsonText.substring(firstBracket, lastBracket + 1)];
        }
    }

    if (!jsonMatch) {
        throw new Error('Could not find JSON structure (object or array) in input text');
    }

    let jsonString = jsonMatch[0];
    const originalJsonString = jsonString;

    // Fix common JSON issues - multiple attempts
    const fixAttempts = [
        // Attempt 0: Try parsing as-is (sanitized but not fixed)
        (str: string) => str,

        // Attempt 1: Just remove trailing commas before } or ]
        (str: string) => str.replace(/,\s*([}\]])/g, '$1'),

        // Attempt 2: Remove trailing commas + specific control chars
        (str: string) => {
            let fixed = str.replace(/,\s*([}\]])/g, '$1');
            // Remove bad control characters but keep newlines/tabs
            fixed = fixed.replace(/[\x00-\x09\x0B-\x1F\x7F]/g, '');
            return fixed;
        },

        // Attempt 3: More aggressive - use state machine to fix quotes and newlines in strings
        (str: string) => {
            let fixed = str.replace(/,\s*([}\]])/g, '$1');
            let result = '';
            let inString = false;
            let escapeNext = false;

            for (let i = 0; i < fixed.length; i++) {
                const char = fixed[i];
                const prevChar = i > 0 ? fixed[i - 1] : '';

                if (escapeNext) {
                    result += char;
                    escapeNext = false;
                    continue;
                }

                if (char === '\\') {
                    result += char;
                    escapeNext = true;
                    continue;
                }

                if (char === '"' && prevChar !== '\\') {
                    inString = !inString;
                    result += char;
                } else if (inString && (char === '\n' || char === '\r')) {
                    // Escape newlines inside strings
                    result += char === '\n' ? '\\n' : '\\r';
                } else {
                    result += char;
                }
            }

            return result;
        }
    ];

    // Try each fix attempt
    let lastError: any;

    for (let attempt = 0; attempt < fixAttempts.length; attempt++) {
        try {
            const fixed = fixAttempts[attempt](jsonString);
            const parsed = JSON.parse(fixed);

            if (parsed && (typeof parsed === 'object')) {
                if (options.debug && attempt > 0) {
                    console.log(`✅ JSON parsed successfully on attempt ${attempt}`);
                }
                return parsed;
            }
        } catch (e) {
            lastError = e;
            // Continue to next attempt
        }
    }

    // If we get here, all standard parsing attempts failed.
    // Rethrow the last error with context
    if (options.debug) {
        console.error('❌ JSON parsing failed after all attempts');
        console.error('Error:', lastError);
        console.error('Snippet:', jsonString.substring(0, 200) + '...');
    }

    throw new Error(`Failed to parse JSON: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}
