const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/cv-builder-pro/registry.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Normalize line endings
content = content.replace(/\r\n/g, '\n');

console.log('Original file length:', content.length);

// 1. Insert helper function getDynamicHeaderScales with explicit TypeScript types
if (!content.includes('export const getDynamicHeaderScales')) {
  const target = '  body: "cv-body cv-prose text-gray-700",\n};';
  content = content.replace(
    target,
    `  body: "cv-body cv-prose text-gray-700",
};

// Helper functions for dynamic scale calculation based on character length
export const getDynamicHeaderScales = (data: any, isNarrow: boolean) => {
  const nameLength = (data?.basics?.name || '').length;
  const titleLength = (data?.basics?.title || '').length;

  if (isNarrow) {
    let nameNarrowScale = 2.0;
    if (nameLength > 15) {
      nameNarrowScale = Math.max(1.1, 2.0 - (nameLength - 15) * 0.05);
    }
    let titleNarrowScale = 1.15;
    if (titleLength > 20) {
      titleNarrowScale = Math.max(0.75, 1.15 - (titleLength - 20) * 0.02);
    }
    return { nameScale: nameNarrowScale, titleScale: titleNarrowScale };
  } else {
    let nameScale = 2.5;
    if (nameLength > 18) {
      nameScale = Math.max(1.4, 2.5 - (nameLength - 18) * 0.05);
    }
    let titleScale = 1.15;
    if (titleLength > 24) {
      titleScale = Math.max(0.8, 1.15 - (titleLength - 24) * 0.015);
    }
    return { nameScale, titleScale };
  }
};`
  );
  console.log('Successfully inserted getDynamicHeaderScales helper function.');
}

// Helper to replace block in specific header by finding unique header key first
const robustReplaceInSnippet = (snippetKey, findBlock, replaceBlock) => {
  const startIdx = content.indexOf(snippetKey);
  if (startIdx === -1) {
    console.error(`ERROR: Could not find snippetKey: ${snippetKey}`);
    process.exit(1);
  }
  
  // Find the exact occurrence of findBlock following startIdx
  const blockIdx = content.indexOf(findBlock, startIdx);
  if (blockIdx === -1) {
    console.error(`ERROR: Could not find findBlock inside: ${snippetKey}`);
    process.exit(1);
  }
  
  content = content.slice(0, blockIdx) + replaceBlock + content.slice(blockIdx + findBlock.length);
  return true;
};

// 2. Perform replacements inside all 10 render snippets
// Header Minimal
robustReplaceInSnippet("'header-minimal':",
  `const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);`,
  `const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
    const scales = getDynamicHeaderScales(data, isNarrow);
    const showAvatar = data?.basics?.showAvatar;`
);
robustReplaceInSnippet("'header-minimal':",
  `className={\`flex \${isNarrow ? 'flex-col items-center text-center' : 'items-center'} gap-5 pb-4 border-b \${isDark ? 'border-slate-700 text-gray-300' : 'border-gray-200 text-gray-600'} snippet-anim cv-keep-with-next\`}`,
  `className={\`flex \${isNarrow ? 'flex-col items-center text-center gap-3.5 pb-3.5' : 'items-center gap-5 pb-4'} border-b \${isDark ? 'border-slate-700 text-gray-300' : 'border-gray-200 text-gray-600'} snippet-anim cv-keep-with-next\`}`
);
robustReplaceInSnippet("'header-minimal':",
  `sizeClass={isNarrow ? 'w-24 h-24 mb-3' : 'w-20 h-20'}`,
  `sizeClass={isNarrow ? 'w-20 h-20 mb-2' : 'w-20 h-20'}`
);
robustReplaceInSnippet("'header-minimal':",
  `className={\`\${isNarrow ? TYPOGRAPHY.nameNarrow : TYPOGRAPHY.name} \${isDark ? 'text-white' : 'text-gray-900'} mb-1 uppercase tracking-widest\`}`,
  `className={\`\${isNarrow ? TYPOGRAPHY.nameNarrow : TYPOGRAPHY.name} \${isDark ? 'text-white' : 'text-gray-900'} mb-1 uppercase tracking-widest\`} style={{ fontSize: \`calc(var(--cv-base-size) * \${scales.nameScale})\` }}`
);
robustReplaceInSnippet("'header-minimal':",
  `className={\`\${TYPOGRAPHY.role} \${isDark ? 'text-gray-400' : ''} mb-3\`}`,
  `className={\`\${TYPOGRAPHY.role} \${isDark ? 'text-gray-400' : ''} mb-3\`} style={{ fontSize: \`calc(var(--cv-base-size) * \${scales.titleScale})\` }}`
);
robustReplaceInSnippet("'header-minimal':",
  `className={\`flex flex-wrap \${isNarrow ? 'flex-col gap-1.5 items-center' : \`gap-x-4 gap-y-1.5 items-center \${justifyClass}\`} \${TYPOGRAPHY.contact}\`}`,
  `className={\`flex flex-wrap \${isNarrow ? 'flex-col gap-1.5 items-center' : \`gap-x-4 gap-y-1.5 items-center \${justifyClass}\`} \${TYPOGRAPHY.contact} cv-contact-horizontal\`}`
);

// Header Split
robustReplaceInSnippet("'header-split':",
  `const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);`,
  `const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
    const scales = getDynamicHeaderScales(data, isNarrow);
    const showAvatar = data?.basics?.showAvatar;`
);
robustReplaceInSnippet("'header-split':",
  `className={\`flex \${isNarrow ? 'flex-col gap-4 text-center items-center' : 'justify-between items-end'} pb-4 border-b-[1.5px] \${isDark ? 'border-slate-600' : 'border-slate-800'} snippet-anim w-full cv-keep-with-next\`}`,
  `className={\`flex \${isNarrow ? 'flex-col gap-3.5 text-center items-center pb-3.5' : 'justify-between items-end pb-4'} border-b-[1.5px] \${isDark ? 'border-slate-600' : 'border-slate-800'} snippet-anim w-full cv-keep-with-next\`}`
);
robustReplaceInSnippet("'header-split':",
  `sizeClass={isNarrow ? 'w-24 h-24' : 'w-16 h-16'}`,
  `sizeClass={isNarrow ? 'w-20 h-20 mb-2' : 'w-16 h-16'}`
);
robustReplaceInSnippet("'header-split':",
  `className={\`min-w-0 flex flex-col \${alignClass}\`}`,
  `className={\`min-w-0 w-full flex flex-col \${alignClass}\`}`
);
robustReplaceInSnippet("'header-split':",
  `className={\`\${isNarrow ? TYPOGRAPHY.nameNarrow : TYPOGRAPHY.name} \${isDark ? 'text-white' : 'text-slate-800'} mb-1.5\`}`,
  `className={\`\${isNarrow ? TYPOGRAPHY.nameNarrow : TYPOGRAPHY.name} \${isDark ? 'text-white' : 'text-slate-800'} mb-1.5\`} style={{ fontSize: \`calc(var(--cv-base-size) * \${scales.nameScale})\` }}`
);
robustReplaceInSnippet("'header-split':",
  `className={\`\${TYPOGRAPHY.role} \${isDark ? 'text-slate-400' : 'text-slate-600'}\`}`,
  `className={\`\${TYPOGRAPHY.role} \${isDark ? 'text-slate-400' : 'text-slate-600'}\`} style={{ fontSize: \`calc(var(--cv-base-size) * \${scales.titleScale})\` }}`
);
robustReplaceInSnippet("'header-split':",
  `className={\`\${isNarrow ? 'text-center w-full mt-2 flex-col items-center' : 'text-right flex-row justify-end flex-wrap gap-x-4 gap-y-1.5 items-center'} \${TYPOGRAPHY.contact} flex \${isDark ? 'text-slate-300' : 'text-slate-600'} shrink-0 max-w-[60%]\`}`,
  `className={\`\${isNarrow ? 'text-center w-full mt-2 flex-col items-center' : 'text-right flex-row justify-end flex-wrap gap-x-4 gap-y-1.5 items-center'} \${TYPOGRAPHY.contact} flex \${isDark ? 'text-slate-300' : 'text-slate-600'} shrink-0 max-w-[60%] cv-contact-horizontal\`}`
);

// Header Avatar
robustReplaceInSnippet("'header-avatar':",
  `const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);`,
  `const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
    const scales = getDynamicHeaderScales(data, isNarrow);
    const showAvatar = data?.basics?.showAvatar;`
);
robustReplaceInSnippet("'header-avatar':",
  `className={\`flex \${isNarrow ? 'flex-col items-center text-center' : 'items-center'} gap-5 pb-5 snippet-anim w-full cv-keep-with-next\`}`,
  `className={\`flex \${isNarrow ? 'flex-col text-center items-center gap-3.5 pb-3.5' : 'items-center gap-5 pb-5'} snippet-anim w-full cv-keep-with-next\`}`
);
robustReplaceInSnippet("'header-avatar':",
  `sizeClass={isNarrow ? 'w-28 h-28' : 'w-24 h-24'}`,
  `sizeClass={isNarrow ? 'w-22 h-22 mb-2' : 'w-24 h-24'}`
);
robustReplaceInSnippet("'header-avatar':",
  `className={\`\${isNarrow ? TYPOGRAPHY.nameNarrow : TYPOGRAPHY.name} \${isDark ? 'text-white' : 'text-gray-900'} mb-1.5\`}`,
  `className={\`\${isNarrow ? TYPOGRAPHY.nameNarrow : TYPOGRAPHY.name} \${isDark ? 'text-white' : 'text-gray-900'} mb-1.5\`} style={{ fontSize: \`calc(var(--cv-base-size) * \${scales.nameScale})\` }}`
);
robustReplaceInSnippet("'header-avatar':",
  `className={\`\${TYPOGRAPHY.role} mb-3\`}`,
  `className={\`\${TYPOGRAPHY.role} mb-3\`} style={{ fontSize: \`calc(var(--cv-base-size) * \${scales.titleScale})\` }}`
);
robustReplaceInSnippet("'header-avatar':",
  `className={\`flex flex-wrap \${isNarrow ? 'flex-col gap-1.5 justify-center items-center' : \`gap-x-4 gap-y-1.5 items-center \${justifyClass}\`} \${TYPOGRAPHY.contact} \${isDark ? 'text-gray-300' : 'text-gray-500'}\`}`,
  `className={\`flex flex-wrap \${isNarrow ? 'flex-col gap-1.5 justify-center items-center' : \`gap-x-4 gap-y-1.5 items-center \${justifyClass}\`} \${TYPOGRAPHY.contact} \${isDark ? 'text-gray-300' : 'text-gray-500'} cv-contact-horizontal\`}`
);

// Header Boxed
robustReplaceInSnippet("'header-boxed':",
  `const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);`,
  `const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
    const scales = getDynamicHeaderScales(data, isNarrow);
    const showAvatar = data?.basics?.showAvatar;`
);
robustReplaceInSnippet("'header-boxed':",
  `className={\`flex \${isNarrow ? 'flex-col items-center text-center' : 'items-center text-left'} gap-5 pb-5 snippet-anim w-full cv-keep-with-next\`}`,
  `className={\`flex \${isNarrow ? 'flex-col items-center text-center gap-3.5 pb-3.5' : 'items-center text-left gap-5 pb-5'} snippet-anim w-full cv-keep-with-next\`}`
);
robustReplaceInSnippet("'header-boxed':",
  `sizeClass={isNarrow ? 'w-28 h-28 mb-4' : 'w-24 h-24'}`,
  `sizeClass={isNarrow ? 'w-22 h-22 mb-2' : 'w-24 h-24'}`
);
robustReplaceInSnippet("'header-boxed':",
  `className={\`\${isNarrow ? 'text-xl' : 'text-2xl'} font-bold\`}`,
  `className={\`\${isNarrow ? 'text-xl' : 'text-2xl'} font-bold\`} style={{ fontSize: \`calc(var(--cv-base-size) * \${scales.nameScale})\` }}`
);
robustReplaceInSnippet("'header-boxed':",
  `className={\`\${TYPOGRAPHY.role} mb-5 \${isDark ? 'text-gray-400' : ''}\`}`,
  `className={\`\${TYPOGRAPHY.role} mb-5 \${isDark ? 'text-gray-400' : ''}\`} style={{ fontSize: \`calc(var(--cv-base-size) * \${scales.titleScale})\` }}`
);
robustReplaceInSnippet("'header-boxed':",
  `className={\`flex flex-wrap justify-center \${isNarrow ? 'flex-col gap-1.5' : \`gap-x-4 gap-y-1.5 \${justifyClass}\`} \${TYPOGRAPHY.contact}\`}`,
  `className={\`flex flex-wrap justify-center \${isNarrow ? 'flex-col gap-1.5' : \`gap-x-4 gap-y-1.5 \${justifyClass}\`} \${TYPOGRAPHY.contact} cv-contact-horizontal\`}`
);

// Header Executive
robustReplaceInSnippet("'header-executive':",
  `const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);`,
  `const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
    const scales = getDynamicHeaderScales(data, isNarrow);
    const showAvatar = data?.basics?.showAvatar;`
);
robustReplaceInSnippet("'header-executive':",
  `className={\`flex \${isNarrow ? 'flex-col items-center text-center' : 'items-center text-left'} gap-5 pb-4 border-b-[1.5px] \${isDark ? 'border-slate-700' : 'border-gray-900'} snippet-anim w-full cv-keep-with-next\`}`,
  `className={\`flex \${isNarrow ? 'flex-col items-center text-center gap-3 pb-3' : 'items-center text-left gap-5 pb-4'} border-b-[1.5px] \${isDark ? 'border-slate-700' : 'border-gray-900'} snippet-anim w-full cv-keep-with-next\`}`
);
robustReplaceInSnippet("'header-executive':",
  `sizeClass={isNarrow ? 'w-24 h-24 mb-3' : 'w-20 h-24'}`,
  `sizeClass={isNarrow ? 'w-20 h-20 mb-2' : 'w-20 h-24'}`
);
robustReplaceInSnippet("'header-executive':",
  `className={\`\${isNarrow ? 'text-2xl text-center' : 'text-3xl uppercase'} font-extrabold tracking-widest mb-2 \${isDark ? 'text-white' : 'text-gray-900'}\`}`,
  `className={\`\${isNarrow ? 'text-2xl text-center' : 'text-3xl uppercase'} font-extrabold tracking-widest mb-2 \${isDark ? 'text-white' : 'text-gray-900'}\`} style={{ fontSize: \`calc(var(--cv-base-size) * \${scales.nameScale})\` }}`
);

// Insert h2 under h1 in executive
const execNameIdx = content.indexOf("'header-executive':");
const execH1Idx = content.indexOf('<h1', execNameIdx);
const h1BlockEnd = content.indexOf('</h1>', execH1Idx);
content = content.slice(0, h1BlockEnd + 5) + `\n          <h2 className={\`\${TYPOGRAPHY.role} mb-3\`} style={{ fontSize: \`calc(var(--cv-base-size) * \${scales.titleScale})\` }}><Editable path="basics.title" nowrap={!isNarrow} /></h2>` + content.slice(h1BlockEnd + 5);

robustReplaceInSnippet("'header-executive':",
  `className={\`flex flex-wrap \${isNarrow ? 'flex-col text-center gap-1.5' : \`gap-x-4 gap-y-1.5 \${justifyClass}\`} \${TYPOGRAPHY.contact} \${isDark ? 'text-gray-300' : 'text-gray-800'}\`}`,
  `className={\`flex flex-wrap \${isNarrow ? 'flex-col text-center gap-1.5' : \`gap-x-4 gap-y-1.5 \${justifyClass}\`} \${TYPOGRAPHY.contact} \${isDark ? 'text-gray-300' : 'text-gray-800'} cv-contact-horizontal\`}`
);

// Header Accent
robustReplaceInSnippet("'header-accent':",
  `const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);`,
  `const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
    const scales = getDynamicHeaderScales(data, isNarrow);`
);
robustReplaceInSnippet("'header-accent':",
  `className={\`\${isNarrow ? 'text-3xl' : 'text-4xl'} font-light tracking-widest uppercase mb-2 \${isDark ? 'text-white' : 'text-gray-800'}\`}`,
  `className={\`\${isNarrow ? 'text-3xl' : 'text-4xl'} font-light tracking-widest uppercase mb-2 \${isDark ? 'text-white' : 'text-gray-800'}\`} style={{ fontSize: \`calc(var(--cv-base-size) * \${scales.nameScale})\` }}`
);
robustReplaceInSnippet("'header-accent':",
  `className={\`\${TYPOGRAPHY.role} tracking-[0.25em]\`}`,
  `className={\`\${TYPOGRAPHY.role} tracking-[0.25em]\`} style={{ fontSize: \`calc(var(--cv-base-size) * \${scales.titleScale})\` }}`
);
robustReplaceInSnippet("'header-accent':",
  `className={\`\${TYPOGRAPHY.contact} flex flex-col justify-center gap-1 \${isDark ? 'text-gray-300' : 'text-gray-700'}\`}`,
  `className={\`\${TYPOGRAPHY.contact} flex flex-col justify-center gap-1 \${isDark ? 'text-gray-300' : 'text-gray-700'} cv-contact-horizontal\`}`
);

// Header Creative
robustReplaceInSnippet("'header-creative':",
  `const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);`,
  `const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
    const scales = getDynamicHeaderScales(data, isNarrow);
    const showAvatar = data?.basics?.showAvatar;`
);
robustReplaceInSnippet("'header-creative':",
  `className={\`flex \${isNarrow ? 'flex-col items-center text-center' : 'items-center text-left'} gap-6 p-6 rounded-xl snippet-anim cv-keep-with-next cv-accent-bg text-white shadow-lg\`}`,
  `className={\`flex \${isNarrow ? 'flex-col items-center text-center gap-3.5 p-4' : 'items-center text-left gap-6 p-6'} rounded-xl snippet-anim cv-keep-with-next cv-accent-bg text-white shadow-lg\`}`
);
robustReplaceInSnippet("'header-creative':",
  `sizeClass={isNarrow ? 'w-24 h-24 mb-4' : 'w-24 h-24'}`,
  `sizeClass={isNarrow ? 'w-22 h-22 mb-2' : 'w-24 h-24'}`
);
robustReplaceInSnippet("'header-creative':",
  `className={\`\${isNarrow ? 'text-2xl' : 'text-4xl'} font-black tracking-tight mb-1\`}`,
  `className={\`\${isNarrow ? 'text-2xl' : 'text-4xl'} font-black tracking-tight mb-1\`} style={{ fontSize: \`calc(var(--cv-base-size) * \${scales.nameScale})\` }}`
);
robustReplaceInSnippet("'header-creative':",
  `className={\`text-sm font-semibold tracking-widest uppercase opacity-90 mb-4\`}`,
  `className={\`text-sm font-semibold tracking-widest uppercase opacity-90 mb-4\`} style={{ fontSize: \`calc(var(--cv-base-size) * \${scales.titleScale})\` }}`
);
robustReplaceInSnippet("'header-creative':",
  `className={\`flex flex-wrap \${isNarrow ? 'flex-col gap-1.5' : \`gap-x-4 gap-y-1.5 \${justifyClass}\`} text-xs font-medium opacity-90\`}`,
  `className={\`flex flex-wrap \${isNarrow ? 'flex-col gap-1.5' : \`gap-x-4 gap-y-1.5 \${justifyClass}\`} text-xs font-medium opacity-90 cv-contact-horizontal\`}`
);

// Header Typographic
robustReplaceInSnippet(",'header-typographic':",
  `const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);`,
  `const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
    const scales = getDynamicHeaderScales(data, isNarrow);`
);
robustReplaceInSnippet(",'header-typographic':",
  `className={\`font-black leading-none tracking-tighter mb-2 \${isNarrow ? 'text-3xl' : 'text-5xl'} \${isDark ? 'text-white' : 'text-gray-900'}\`}`,
  `className={\`font-black leading-none tracking-tighter mb-2 \${isNarrow ? 'text-3xl' : 'text-5xl'} \${isDark ? 'text-white' : 'text-gray-900'}\`} style={{ fontSize: \`calc(var(--cv-base-size) * \${scales.nameScale})\` }}`
);
robustReplaceInSnippet(",'header-typographic':",
  `className={\`\${TYPOGRAPHY.role} text-[0.85em] shrink-0\`}`,
  `className={\`\${TYPOGRAPHY.role} text-[0.85em] shrink-0\`} style={{ fontSize: \`calc(var(--cv-base-size) * \${scales.titleScale})\` }}`
);
robustReplaceInSnippet(",'header-typographic':",
  `className={\`flex flex-wrap gap-x-5 gap-y-1 \${isNarrow ? 'justify-center' : ''} \${TYPOGRAPHY.contact} \${isDark ? 'text-gray-400' : 'text-gray-500'}\`}`,
  `className={\`flex flex-wrap gap-x-5 gap-y-1 \${isNarrow ? 'justify-center' : ''} \${TYPOGRAPHY.contact} \${isDark ? 'text-gray-400' : 'text-gray-500'} cv-contact-horizontal\`}`
);

// Header Column Left
robustReplaceInSnippet(",'header-column-left':",
  `const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);`,
  `const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
    const scales = getDynamicHeaderScales(data, isNarrow);
    const showAvatar = data?.basics?.showAvatar;`
);
robustReplaceInSnippet(",'header-column-left':",
  `className={\`snippet-anim w-full cv-keep-with-next flex \${isNarrow ? 'flex-col gap-3 items-center text-center' : 'gap-8 items-end'} pb-4 border-b \${isDark ? 'border-slate-700' : 'border-gray-200'}\`}`,
  `className={\`snippet-anim w-full cv-keep-with-next flex \${isNarrow ? 'flex-col items-center text-center gap-3.5 pb-3.5' : 'gap-8 items-end pb-4'} border-b \${isDark ? 'border-slate-700' : 'border-gray-200'}\`}`
);
robustReplaceInSnippet(",'header-column-left':",
  `className={\`font-bold leading-tight \${isNarrow ? TYPOGRAPHY.nameNarrow : TYPOGRAPHY.name} \${isDark ? 'text-white' : 'text-gray-900'}\`}`,
  `className={\`font-bold leading-tight \${isNarrow ? TYPOGRAPHY.nameNarrow : TYPOGRAPHY.name} \${isDark ? 'text-white' : 'text-gray-900'}\`} style={{ fontSize: \`calc(var(--cv-base-size) * \${scales.nameScale})\` }}`
);
robustReplaceInSnippet(",'header-column-left':",
  `className={\`\${TYPOGRAPHY.role} mt-1\`}`,
  `className={\`\${TYPOGRAPHY.role} mt-1\`} style={{ fontSize: \`calc(var(--cv-base-size) * \${scales.titleScale})\` }}`
);

// Header Banner
robustReplaceInSnippet(",'header-banner':",
  `const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);`,
  `const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
    const scales = getDynamicHeaderScales(data, isNarrow);
    const showAvatar = data?.basics?.showAvatar;`
);
robustReplaceInSnippet(",'header-banner':",
  `className="cv-accent-bg rounded-lg px-5 py-4 mb-3"`,
  `className={\`cv-accent-bg rounded-lg \${isNarrow ? 'px-4 py-3' : 'px-5 py-4'} mb-3\`}`
);
robustReplaceInSnippet(",'header-banner':",
  `className={\`font-extrabold tracking-tight text-white leading-tight \${isNarrow ? 'text-2xl' : 'text-3xl'}\`}`,
  `className={\`font-extrabold tracking-tight text-white leading-tight \${isNarrow ? 'text-2xl' : 'text-3xl'}\`} style={{ fontSize: \`calc(var(--cv-base-size) * \${scales.nameScale})\` }}`
);
robustReplaceInSnippet(",'header-banner':",
  `className="text-[0.82em] font-semibold tracking-widest uppercase text-white/80 mt-0.5"`,
  `className="text-[0.82em] font-semibold tracking-widest uppercase text-white/80 mt-0.5" style={{ fontSize: \`calc(var(--cv-base-size) * \${scales.titleScale})\` }}`
);
robustReplaceInSnippet(",'header-banner':",
  `className={\`flex flex-wrap gap-x-4 gap-y-1 \${isNarrow ? 'flex-col items-start gap-1.5' : ''} \${TYPOGRAPHY.contact} \${isDark ? 'text-gray-400' : 'text-gray-600'}\`}><ContactLinks data={data} Editable={Editable} isNarrow={isNarrow} showIcons={showIcons} design={design} /></div>}`,
  `className={\`flex flex-wrap gap-x-4 gap-y-1 \${isNarrow ? 'flex-col items-start gap-1.5' : ''} \${TYPOGRAPHY.contact} \${isDark ? 'text-gray-400' : 'text-gray-600'} cv-contact-horizontal\`}><ContactLinks data={data} Editable={Editable} isNarrow={isNarrow} showIcons={showIcons} design={design} /></div>}`
);

// 4. Replace list-entry splits spacing and commas
content = content.replace(
  `h4 className={\`\${TYPOGRAPHY.itemTitle} inline-block mr-2 \${isDark ? 'text-gray-100' : 'text-gray-900'}\`}><Editable path={\`experience.\${idx}.company\`} nowrap />,</h4><span className={\`\${TYPOGRAPHY.itemSubtitle} \${isDark ? 'text-gray-400' : 'text-gray-600'}\`}><Editable path={\`experience.\${idx}.role\`} nowrap /></span>`,
  `h4 className={\`\${TYPOGRAPHY.itemTitle} inline \${isDark ? 'text-gray-100' : 'text-gray-900'}\`}><Editable path={\`experience.\${idx}.company\`} nowrap />, </h4><span className={\`\${TYPOGRAPHY.itemSubtitle} \${isDark ? 'text-gray-400' : 'text-gray-600'} inline\`}><Editable path={\`experience.\${idx}.role\`} nowrap /></span>`
);
content = content.replace(
  `h4 className={\`\${TYPOGRAPHY.itemTitle} inline-block mr-2 \${isDark ? 'text-gray-100' : 'text-gray-900'}\`}><Editable path={\`education.\${idx}.institution\`} nowrap />,</h4><span className={\`\${TYPOGRAPHY.itemSubtitle} \${isDark ? 'text-gray-400' : 'text-gray-600'}\`}><Editable path={\`education.\${idx}.degree\`} nowrap /></span>`,
  `h4 className={\`\${TYPOGRAPHY.itemTitle} inline \${isDark ? 'text-gray-100' : 'text-gray-900'}\`}><Editable path={\`education.\${idx}.institution\`} nowrap />, </h4><span className={\`\${TYPOGRAPHY.itemSubtitle} \${isDark ? 'text-gray-400' : 'text-gray-600'} inline\`}><Editable path={\`education.\${idx}.degree\`} nowrap /></span>`
);
content = content.replace(
  `h4 className={\`\${TYPOGRAPHY.itemTitle} inline-block mr-2 \${isDark ? 'text-gray-100' : 'text-gray-900'}\`}><Editable path={\`projects.\${idx}.name\`} nowrap />,</h4><span className={\`\${TYPOGRAPHY.itemSubtitle} \${isDark ? 'text-gray-400' : 'text-gray-600'}\`}><Editable path={\`projects.\${idx}.role\`} nowrap /></span>`,
  `h4 className={\`\---\---\---\---\---\` === '' ? '' : \`\${TYPOGRAPHY.itemTitle} inline \${isDark ? 'text-gray-100' : 'text-gray-900'}\`}><Editable path={\`projects.\${idx}.name\`} nowrap />, </h4><span className={\`\${TYPOGRAPHY.itemSubtitle} \${isDark ? 'text-gray-400' : 'text-gray-600'} inline\`}><Editable path={\`projects.\${idx}.role\`} nowrap /></span>`
);

console.log('Finished processing all 10 headers and list entry spacing.');

// Write back updated content
fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully wrote patched registry.tsx (complete).');
