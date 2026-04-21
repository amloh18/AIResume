const fs = require('fs');
const glob = require('glob');

const files = [
  ...glob.sync('src/components/forms/**/*.tsx'),
  ...glob.sync('src/components/cv-parser/**/*.tsx'),
  ...glob.sync('src/components/auth/**/*.tsx'),
  'src/components/ui/WYSIWYGEditor.tsx',
  'src/components/resume-enhancer/FloatingFormEditor.tsx'
];

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Replace rounded classes with rounded-none
    content = content.replace(/rounded-[a-zA-Z0-9-]+/g, 'rounded-none');
    
    // Also change input type="text" to type="month" for date fields
    // This is a bit tricky, but let's try to find date fields
    content = content.replace(/type="text"(\s+value=\{[^}]*(?:[dD]ate)[^}]*\})/g, 'type="month"$1');
    content = content.replace(/type="text"([^>]*placeholder="(?:Jan|Sep|May|Aug)\s+20\d\d"[^>]*)/g, 'type="month"$1');
    
    fs.writeFileSync(file, content);
  }
});
console.log('Done');