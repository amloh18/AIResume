const fs = require('fs');
const path = require('path');

function getFiles(dir, ext) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFiles(file, ext));
    } else {
      if (file.endsWith(ext)) {
        results.push(file);
      }
    }
  });
  return results;
}

const dirs = [
  'src/components/forms',
  'src/components/cv-parser',
  'src/components/auth'
];

let files = [
  'src/components/ui/WYSIWYGEditor.tsx',
  'src/components/resume-enhancer/FloatingFormEditor.tsx'
];

dirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    files = files.concat(getFiles(dir, '.tsx'));
  }
});

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Replace rounded classes with rounded-none
    content = content.replace(/rounded-[a-zA-Z0-9-]+/g, 'rounded-none');
    
    // Replace type="text" with type="month" for date inputs
    // Look for inputs where placeholder is like "Jan 2020" or value contains "Date"
    content = content.replace(/<input\s+type="text"([^>]*)placeholder="(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+20\d\d"([^>]*)>/g, '<input type="month"$1placeholder="YYYY-MM"$2>');
    
    fs.writeFileSync(file, content);
  }
});
console.log('Done');