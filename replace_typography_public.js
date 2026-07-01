const fs = require('fs');
const path = require('path');

const targets = [
    '/Users/amlohsl/Documents/VScode_projects/PROJECTS/cvcircle_app/src/app/(public)',
    '/Users/amlohsl/Documents/VScode_projects/PROJECTS/cvcircle_app/src/app/page.tsx',
    '/Users/amlohsl/Documents/VScode_projects/PROJECTS/cvcircle_app/src/app/blog',
    '/Users/amlohsl/Documents/VScode_projects/PROJECTS/cvcircle_app/src/app/careers',
    '/Users/amlohsl/Documents/VScode_projects/PROJECTS/cvcircle_app/src/app/pricing',
    '/Users/amlohsl/Documents/VScode_projects/PROJECTS/cvcircle_app/src/components/landing',
    '/Users/amlohsl/Documents/VScode_projects/PROJECTS/cvcircle_app/src/components/blog',
    '/Users/amlohsl/Documents/VScode_projects/PROJECTS/cvcircle_app/src/components/pricing',
    '/Users/amlohsl/Documents/VScode_projects/PROJECTS/cvcircle_app/src/components/auth',
    '/Users/amlohsl/Documents/VScode_projects/PROJECTS/cvcircle_app/src/components/ui',
    '/Users/amlohsl/Documents/VScode_projects/PROJECTS/cvcircle_app/src/components/layout',
    '/Users/amlohsl/Documents/VScode_projects/PROJECTS/cvcircle_app/src/app/(marketing)',
    '/Users/amlohsl/Documents/VScode_projects/PROJECTS/cvcircle_app/src/app/(auth)'
];

const excludePatterns = [
    'registry.tsx',
    'CanvasSnippet.tsx',
    'cv-document',
    'cover-letter-document'
];

const replacements = [
    { regex: /\btext-\[(8|9|10|11|12)px\]\b/g, replacement: 'text-small' },
    { regex: /\btext-xs\b/g, replacement: 'text-small' },
    { regex: /\btext-sm\b/g, replacement: 'text-small' },
    { regex: /\btext-base\b/g, replacement: 'text-body' },
    { regex: /\btext-lg\b/g, replacement: 'text-h3' },
    { regex: /\btext-xl\b/g, replacement: 'text-h3' },
    { regex: /\btext-2xl\b/g, replacement: 'text-h2' },
    { regex: /\btext-3xl\b/g, replacement: 'text-h1' },
    { regex: /\btext-\[32px\]\b/g, replacement: 'text-h1' },
    { regex: /\btext-4xl\b/g, replacement: 'text-display' },
    { regex: /\btext-5xl\b/g, replacement: 'text-display' },
];

function shouldExclude(filePath) {
    return excludePatterns.some(pattern => filePath.includes(pattern));
}

function processPath(itemPath) {
    if (!fs.existsSync(itemPath)) return;
    
    if (shouldExclude(itemPath)) {
        return;
    }

    const stat = fs.statSync(itemPath);
    if (stat.isDirectory()) {
        const files = fs.readdirSync(itemPath);
        for (const file of files) {
            processPath(path.join(itemPath, file));
        }
    } else if (itemPath.endsWith('.tsx') || itemPath.endsWith('.ts')) {
        let content = fs.readFileSync(itemPath, 'utf8');
        let modified = false;
        
        for (const { regex, replacement } of replacements) {
            if (regex.test(content)) {
                content = content.replace(regex, replacement);
                modified = true;
            }
        }
        
        if (modified) {
            fs.writeFileSync(itemPath, content, 'utf8');
            console.log(`Updated ${itemPath}`);
        }
    }
}

for (const target of targets) {
    processPath(target);
}

console.log("Finished replacing text utilities for public/landing pages.");
