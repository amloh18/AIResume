const fs = require('fs');
const path = 'src/components/cv-builder-pro/registry.tsx';
let c = fs.readFileSync(path, 'utf8');
c = c.replace(/className="mb-\d+\s+snippet-anim/g, 'className="snippet-anim');
fs.writeFileSync(path, c);
console.log('done');
