const fs = require('fs');
const file = './src/components/cv-builder-pro/registry.tsx';
let content = fs.readFileSync(file, 'utf8');

const replacements = [
  {
    regex: /('skills-two-col-list': \{ id: 'skills-two-col-list', name: 'Two Column List', category: 'Skills', render: \(\{ data, isDark, Title \}: any\) => \{)/,
    replace: "'skills-two-col-list': { id: 'skills-two-col-list', name: 'Two Column List', category: 'Skills', render: ({ data, isDark, Title, zoneId }: any) => {\n    const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);"
  },
  {
    regex: /(<div className="grid )grid-cols-2( gap-x-4 gap-y-1">\{items\.map\(\(skill: any, i: number\) => \()/g,
    replace: "$1${isNarrow ? 'grid-cols-1' : 'grid-cols-2'}$2"
  },
  {
    regex: /('certifications-grid': \{ id: 'certifications-grid', name: '2-Col Card Grid', category: 'Certifications', render: \(\{ data, isDark, Title, moveEntry, deleteEntry \}: any\) => \{)/,
    replace: "'certifications-grid': { id: 'certifications-grid', name: '2-Col Card Grid', category: 'Certifications', render: ({ data, isDark, Title, moveEntry, deleteEntry, zoneId }: any) => {\n    const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);"
  },
  {
    regex: /(<div className="grid )grid-cols-2( gap-2">\{certs\.map\(\(c: any, i: number\) => \()/g,
    replace: "$1${isNarrow ? 'grid-cols-1' : 'grid-cols-2'}$2"
  },
  {
    regex: /('awards-card': \{ id: 'awards-card', name: 'Card Grid', category: 'Awards', render: \(\{ data, isDark, Title, moveEntry, deleteEntry \}: any\) => \{)/,
    replace: "'awards-card': { id: 'awards-card', name: 'Card Grid', category: 'Awards', render: ({ data, isDark, Title, moveEntry, deleteEntry, zoneId }: any) => {\n    const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);"
  },
  {
    regex: /(<div className="grid )grid-cols-2( gap-2">\{awards\.map\(\(a: any, i: number\) => \()/g,
    replace: "$1${isNarrow ? 'grid-cols-1' : 'grid-cols-2'}$2"
  },
  {
    regex: /('languages-grid-cards': \{ id: 'languages-grid-cards', name: 'Grid Cards', category: 'Languages', render: \(\{ data, isDark, Title \}: any\) => \{)/,
    replace: "'languages-grid-cards': { id: 'languages-grid-cards', name: 'Grid Cards', category: 'Languages', render: ({ data, isDark, Title, zoneId }: any) => {\n    const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);"
  },
  {
    regex: /(<div className="grid )grid-cols-2( gap-2">\{langs\.map\(\(l: any, i: number\) => \()/g,
    replace: "$1${isNarrow ? 'grid-cols-1' : 'grid-cols-2'}$2"
  },
  {
    regex: /('languages-two-col': \{ id: 'languages-two-col', name: 'Two Column', category: 'Languages', render: \(\{ data, isDark, Title \}: any\) => \{)/,
    replace: "'languages-two-col': { id: 'languages-two-col', name: 'Two Column', category: 'Languages', render: ({ data, isDark, Title, zoneId }: any) => {\n    const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);"
  },
  {
    regex: /(<div className="grid )grid-cols-2( gap-x-4 gap-y-1">\{langs\.map\(\(l: any, i: number\) => \()/g,
    replace: "$1${isNarrow ? 'grid-cols-1' : 'grid-cols-2'}$2"
  },
  {
    regex: /('interests-icon-grid': \{ id: 'interests-icon-grid', name: 'Icon Grid', category: 'Interests', render: \(\{ data, isDark, Title \}: any\) => \{)/,
    replace: "'interests-icon-grid': { id: 'interests-icon-grid', name: 'Icon Grid', category: 'Interests', render: ({ data, isDark, Title, zoneId }: any) => {\n    const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);"
  },
  {
    regex: /(<div className="grid )grid-cols-2( gap-2">\{items\.map\(\(item: string, i: number\) => \()/g,
    replace: "$1${isNarrow ? 'grid-cols-1' : 'grid-cols-2'}$2"
  },
  {
    regex: /('interests-two-col': \{ id: 'interests-two-col', name: 'Two Column List', category: 'Interests', render: \(\{ data, isDark, Title \}: any\) => \{)/,
    replace: "'interests-two-col': { id: 'interests-two-col', name: 'Two Column List', category: 'Interests', render: ({ data, isDark, Title, zoneId }: any) => {\n    const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);"
  },
  {
    regex: /(<div className="grid )grid-cols-2( gap-x-4 gap-y-1">\{items\.map\(\(item: string, i: number\) => \()/g,
    replace: "$1${isNarrow ? 'grid-cols-1' : 'grid-cols-2'}$2"
  }
];

let newContent = content;
for (const { regex, replace } of replacements) {
  newContent = newContent.replace(regex, replace);
}

if (newContent !== content) {
  fs.writeFileSync(file, newContent);
  console.log('Fixed registry.tsx successfully');
} else {
  console.log('No changes made');
}
