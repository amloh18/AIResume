const fs = require('fs');
const path = require('path');

const directory = '/Users/amlohsl/Documents/VScode_projects/PROJECTS/cvcircle_app/src/components/interview-coach';

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

function processDirectory(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            processDirectory(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let modified = false;
            for (const { regex, replacement } of replacements) {
                if (regex.test(content)) {
                    content = content.replace(regex, replacement);
                    modified = true;
                }
            }
            if (modified) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log(`Updated ${fullPath}`);
            }
        }
    }
}

processDirectory(directory);
console.log("Finished replacing text utilities in interview-coach.");
