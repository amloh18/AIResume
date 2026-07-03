const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/cv-builder-pro/registry.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Normalize line endings to avoid platform-specific issues
content = content.replace(/\r\n/g, '\n');

console.log('Original file length:', content.length);

// 1. Insert helper function getDynamicHeaderScales
if (!content.includes('export const getDynamicHeaderScales')) {
  const target = '  body: "cv-body cv-prose text-gray-700",\n};';
  if (content.includes(target)) {
    content = content.replace(
      target,
      `  body: "cv-body cv-prose text-gray-700",
};

// Helper functions for dynamic scale calculation based on character length
export const getDynamicHeaderScales = (data, isNarrow) => {
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
  } else {
    console.error('ERROR: Could not find target to insert helper function!');
    process.exit(1);
  }
}

// Robust search and replace that ignores leading indentation differences
const robustReplace = (findBlock, replaceBlock) => {
  const normalize = (str) => str.split('\n').map(line => line.trim()).filter(Boolean).join('\n');
  const findNorm = normalize(findBlock);
  
  const contentLines = content.split('\n');
  const findLinesCount = findBlock.split('\n').filter(Boolean).length;
  
  for (let i = 0; i <= contentLines.length - findLinesCount; i++) {
    const candidateLines = [];
    let j = i;
    while (candidateLines.length < findLinesCount && j < contentLines.length) {
      const line = contentLines[j];
      if (line.trim() !== '') {
        candidateLines.push(line);
      }
      j++;
    }
    
    if (candidateLines.length === findLinesCount) {
      const chunk = candidateLines.map(l => l.trim()).join('\n');
      if (chunk === findNorm) {
        const originalBlock = contentLines.slice(i, j).join('\n');
        content = content.replace(originalBlock, replaceBlock);
        return true;
      }
    }
  }
  return false;
};

const replacements = [
  // --- header-minimal ---
  {
    desc: 'header-minimal scales and sizes',
    find: `  'header-minimal': { id: 'header-minimal', name: 'Minimal Center', category: 'Header', render: ({ data, Editable, zoneId, isDark, showIcons, design, layoutZones, Title, readOnly }: any) => {
    const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
    const hasSidebarContact = layoutZones && Object.values(layoutZones).flat().some((block: any) => block?.type === 'sidebar-contact');
    const align = design.headerAlign || 'center';
    const alignClass = align === 'left' ? 'items-start text-left' : align === 'right' ? 'items-end text-right' : 'items-center text-center';
    const justifyClass = align === 'left' ? 'justify-start' : align === 'right' ? 'justify-end' : 'justify-center';`,
    replace: `  'header-minimal': { id: 'header-minimal', name: 'Minimal Center', category: 'Header', render: ({ data, Editable, zoneId, isDark, showIcons, design, layoutZones, Title, readOnly }: any) => {
    const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
    const hasSidebarContact = layoutZones && Object.values(layoutZones).flat().some((block: any) => block?.type === 'sidebar-contact');
    const align = design.headerAlign || 'center';
    const alignClass = align === 'left' ? 'items-start text-left' : align === 'right' ? 'items-end text-right' : 'items-center text-center';
    const justifyClass = align === 'left' ? 'justify-start' : align === 'right' ? 'justify-end' : 'justify-center';
    const scales = getDynamicHeaderScales(data, isNarrow);
    const showAvatar = data?.basics?.showAvatar;`
  },
  {
    desc: 'header-minimal container and avatar adjustments',
    find: `      <div className={\`flex \${isNarrow ? 'flex-col items-center text-center' : 'items-center'} gap-5 pb-4 border-b \${isDark ? 'border-slate-700 text-gray-300' : 'border-gray-200 text-gray-600'} snippet-anim cv-keep-with-next\`}>
        <Title titleKey="header" overrideClass="hidden" />
        {data?.basics?.showAvatar && <AvatarEditable data={data} sizeClass={isNarrow ? 'w-24 h-24 mb-3' : 'w-20 h-20'} shapeClass="rounded-full shadow-md" borderClass={isDark ? 'border-2 border-slate-700' : ''} readOnly={readOnly} />}`,
    replace: `      <div className={\`flex \${isNarrow ? 'flex-col items-center text-center gap-3.5 pb-3.5' : 'items-center gap-5 pb-4'} border-b \${isDark ? 'border-slate-700 text-gray-300' : 'border-gray-200 text-gray-600'} snippet-anim cv-keep-with-next\`}>
        <Title titleKey="header" overrideClass="hidden" />
        {data?.basics?.showAvatar && <AvatarEditable data={data} sizeClass={isNarrow ? 'w-20 h-20 mb-2' : 'w-20 h-20'} shapeClass="rounded-full shadow-md" borderClass={isDark ? 'border-2 border-slate-700' : ''} readOnly={readOnly} />}`
  },
  {
    desc: 'header-minimal font scaling',
    find: `          <h1 className={\`\${isNarrow ? TYPOGRAPHY.nameNarrow : TYPOGRAPHY.name} \${isDark ? 'text-white' : 'text-gray-900'} mb-1 uppercase tracking-widest\`}><Editable path="basics.name" nowrap={!isNarrow} /></h1>
          <h2 className={\`\${TYPOGRAPHY.role} \${isDark ? 'text-gray-400' : ''} mb-3\`}><Editable path="basics.title" nowrap={!isNarrow} /></h2>`,
    replace: `          <h1 className={\`\${isNarrow ? TYPOGRAPHY.nameNarrow : TYPOGRAPHY.name} \${isDark ? 'text-white' : 'text-gray-900'} mb-1 uppercase tracking-widest\`} style={{ fontSize: \`calc(var(--cv-base-size) * \${scales.nameScale})\` }}><Editable path="basics.name" nowrap={!isNarrow} /></h1>
          <h2 className={\`\${TYPOGRAPHY.role} \${isDark ? 'text-gray-400' : ''} mb-3\`} style={{ fontSize: \`calc(var(--cv-base-size) * \${scales.titleScale})\` }}><Editable path="basics.title" nowrap={!isNarrow} /></h2>`
  },
  {
    desc: 'header-minimal contact section horizontal class',
    find: `          {!hasSidebarContact && (
            <div className={\`flex flex-wrap \${isNarrow ? 'flex-col gap-1.5 items-center' : \`gap-x-4 gap-y-1.5 items-center \${justifyClass}\`} \${TYPOGRAPHY.contact}\`}>`,
    replace: `          {!hasSidebarContact && (
            <div className={\`flex flex-wrap \${isNarrow ? 'flex-col gap-1.5 items-center' : \`gap-x-4 gap-y-1.5 items-center \${justifyClass}\`} \${TYPOGRAPHY.contact} cv-contact-horizontal\`}>`
  },

  // --- header-split ---
  {
    desc: 'header-split scales and sizes',
    find: `  'header-split': { id: 'header-split', name: 'Split Modern', category: 'Header', render: ({ data, Editable, zoneId, isDark, showIcons, design, layoutZones, Title, readOnly }: any) => {
    const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
    const hasSidebarContact = layoutZones && Object.values(layoutZones).flat().some((block: any) => block?.type === 'sidebar-contact');
    const align = design.headerAlign || 'left';
    const alignClass = align === 'center' ? 'items-center text-center' : align === 'right' ? 'items-end text-right' : 'items-start text-left';`,
    replace: `  'header-split': { id: 'header-split', name: 'Split Modern', category: 'Header', render: ({ data, Editable, zoneId, isDark, showIcons, design, layoutZones, Title, readOnly }: any) => {
    const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
    const hasSidebarContact = layoutZones && Object.values(layoutZones).flat().some((block: any) => block?.type === 'sidebar-contact');
    const align = design.headerAlign || 'left';
    const alignClass = align === 'center' ? 'items-center text-center' : align === 'right' ? 'items-end text-right' : 'items-start text-left';
    const scales = getDynamicHeaderScales(data, isNarrow);
    const showAvatar = data?.basics?.showAvatar;`
  },
  {
    desc: 'header-split container and avatar adjustments',
    find: `      <div className={\`flex \${isNarrow ? 'flex-col gap-4 text-center items-center' : 'justify-between items-end'} pb-4 border-b-[1.5px] \${isDark ? 'border-slate-600' : 'border-slate-800'} snippet-anim w-full cv-keep-with-next\`}>
        <Title titleKey="header" overrideClass="hidden" />
        <div className={\`flex \${isNarrow ? 'flex-col text-center items-center' : 'items-center'} gap-4 min-w-0\`}>
          {data?.basics?.showAvatar && <AvatarEditable data={data} sizeClass={isNarrow ? 'w-24 h-24' : 'w-16 h-16'} shapeClass="rounded-full shadow-md" readOnly={readOnly} />}
          <div className={\`min-w-0 flex flex-col \${alignClass}\`}>`,
    replace: `      <div className={\`flex \${isNarrow ? 'flex-col gap-3.5 text-center items-center pb-3.5' : 'justify-between items-end pb-4'} border-b-[1.5px] \${isDark ? 'border-slate-600' : 'border-slate-800'} snippet-anim w-full cv-keep-with-next\`}>
        <Title titleKey="header" overrideClass="hidden" />
        <div className={\`flex \${isNarrow ? 'flex-col text-center items-center' : 'items-center'} gap-4 min-w-0\`}>
          {showAvatar && <AvatarEditable data={data} sizeClass={isNarrow ? 'w-20 h-20 mb-2' : 'w-16 h-16'} shapeClass="rounded-full shadow-md" readOnly={readOnly} />}
          <div className={\`min-w-0 w-full flex flex-col \${alignClass}\`}>`
  },
  {
    desc: 'header-split fonts',
    find: `            <h1 className={\`\${isNarrow ? TYPOGRAPHY.nameNarrow : TYPOGRAPHY.name} \${isDark ? 'text-white' : 'text-slate-800'} mb-1.5\`}><Editable path="basics.name" nowrap={!isNarrow} /></h1>
            <h2 className={\`\${TYPOGRAPHY.role} \${isDark ? 'text-slate-400' : 'text-slate-600'}\`}><Editable path="basics.title" nowrap={!isNarrow} /></h2>`,
    replace: `            <h1 className={\`\${isNarrow ? TYPOGRAPHY.nameNarrow : TYPOGRAPHY.name} \${isDark ? 'text-white' : 'text-slate-800'} mb-1.5\`} style={{ fontSize: \`calc(var(--cv-base-size) * \${scales.nameScale})\` }}><Editable path="basics.name" nowrap={!isNarrow} /></h1>
            <h2 className={\`\${TYPOGRAPHY.role} \${isDark ? 'text-slate-400' : 'text-slate-600'}\`} style={{ fontSize: \`calc(var(--cv-base-size) * \${scales.titleScale})\` }}><Editable path="basics.title" nowrap={!isNarrow} /></h2>`
  },
  {
    desc: 'header-split contact section horizontal class',
    find: `        {!hasSidebarContact && (
          <div className={\`\${isNarrow ? 'text-center w-full mt-2 flex-col items-center' : 'text-right flex-row justify-end flex-wrap gap-x-4 gap-y-1.5 items-center'} \${TYPOGRAPHY.contact} flex \${isDark ? 'text-slate-300' : 'text-slate-600'} shrink-0 max-w-[60%]\`}>`,
    replace: `        {!hasSidebarContact && (
          <div className={\`\${isNarrow ? 'text-center w-full mt-2 flex-col items-center' : 'text-right flex-row justify-end flex-wrap gap-x-4 gap-y-1.5 items-center'} \${TYPOGRAPHY.contact} flex \${isDark ? 'text-slate-300' : 'text-slate-600'} shrink-0 max-w-[60%] cv-contact-horizontal\`}>`
  },

  // --- header-avatar ---
  {
    desc: 'header-avatar scales and sizes',
    find: `  'header-avatar': { id: 'header-avatar', name: 'Avatar Left Bold', category: 'Header', render: ({ data, Editable, zoneId, isDark, showIcons, design, layoutZones, Title, readOnly }: any) => {
    const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
    const hasSidebarContact = layoutZones && Object.values(layoutZones).flat().some((block: any) => block?.type === 'sidebar-contact');
    const align = design.headerAlign || 'left';
    const alignClass = align === 'center' ? 'items-center text-center' : align === 'right' ? 'items-end text-right' : 'items-start text-left';
    const justifyClass = align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start';`,
    replace: `  'header-avatar': { id: 'header-avatar', name: 'Avatar Left Bold', category: 'Header', render: ({ data, Editable, zoneId, isDark, showIcons, design, layoutZones, Title, readOnly }: any) => {
    const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
    const hasSidebarContact = layoutZones && Object.values(layoutZones).flat().some((block: any) => block?.type === 'sidebar-contact');
    const align = design.headerAlign || 'left';
    const alignClass = align === 'center' ? 'items-center text-center' : align === 'right' ? 'items-end text-right' : 'items-start text-left';
    const justifyClass = align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start';
    const scales = getDynamicHeaderScales(data, isNarrow);
    const showAvatar = data?.basics?.showAvatar;`
  },
  {
    desc: 'header-avatar container and avatar adjustments',
    find: `      <div className={\`flex \${isNarrow ? 'flex-col items-center text-center' : 'items-center'} gap-5 pb-5 snippet-anim w-full cv-keep-with-next\`}>
        <Title titleKey="header" overrideClass="hidden" />
        {data?.basics?.showAvatar && <AvatarEditable data={data} sizeClass={isNarrow ? 'w-28 h-28' : 'w-24 h-24'} shapeClass="rounded-full shadow-lg" borderClass={isDark ? 'border-2 border-slate-700' : 'border-4 border-white'} readOnly={readOnly} />}`,
    replace: `      <div className={\`flex \${isNarrow ? 'flex-col text-center items-center gap-3.5 pb-3.5' : 'items-center gap-5 pb-5'} snippet-anim w-full cv-keep-with-next\`}>
        <Title titleKey="header" overrideClass="hidden" />
        {showAvatar && <AvatarEditable data={data} sizeClass={isNarrow ? 'w-22 h-22 mb-2' : 'w-24 h-24'} shapeClass="rounded-full shadow-lg" borderClass={isDark ? 'border-2 border-slate-700' : 'border-4 border-white'} readOnly={readOnly} />}`
  },
  {
    desc: 'header-avatar fonts',
    find: `            <h1 className={\`\${isNarrow ? TYPOGRAPHY.nameNarrow : TYPOGRAPHY.name} \${isDark ? 'text-white' : 'text-gray-900'} mb-1.5\`}><Editable path="basics.name" nowrap={!isNarrow} /></h1>
            <h2 className={\`\${TYPOGRAPHY.role} mb-3\`}><Editable path="basics.title" nowrap={!isNarrow} /></h2>`,
    replace: `            <h1 className={\`\${isNarrow ? TYPOGRAPHY.nameNarrow : TYPOGRAPHY.name} \${isDark ? 'text-white' : 'text-gray-900'} mb-1.5\`} style={{ fontSize: \`calc(var(--cv-base-size) * \${scales.nameScale})\` }}><Editable path="basics.name" nowrap={!isNarrow} /></h1>
            <h2 className={\`\${TYPOGRAPHY.role} mb-3\`} style={{ fontSize: \`calc(var(--cv-base-size) * \${scales.titleScale})\` }}><Editable path="basics.title" nowrap={!isNarrow} /></h2>`
  },
  {
    desc: 'header-avatar contact section horizontal class',
    find: `          {!hasSidebarContact && (
            <div className={\`flex flex-wrap \${isNarrow ? 'flex-col gap-1.5 justify-center items-center' : \`gap-x-4 gap-y-1.5 items-center \${justifyClass}\`} \${TYPOGRAPHY.contact} \${isDark ? 'text-gray-300' : 'text-gray-500'}\`}>`,
    replace: `          {!hasSidebarContact && (
            <div className={\`flex flex-wrap \${isNarrow ? 'flex-col gap-1.5 justify-center items-center' : \`gap-x-4 gap-y-1.5 items-center \${justifyClass}\`} \${TYPOGRAPHY.contact} \${isDark ? 'text-gray-300' : 'text-gray-500'} cv-contact-horizontal\`}>`
  },

  // --- header-boxed ---
  {
    desc: 'header-boxed scales and sizes',
    find: `  'header-boxed': { id: 'header-boxed', name: 'Elegant Box', category: 'Header', render: ({ data, Editable, zoneId, isDark, showIcons, design, layoutZones, Title, readOnly }: any) => {
    const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
    const hasSidebarContact = layoutZones && Object.values(layoutZones).flat().some((block: any) => block?.type === 'sidebar-contact');
    const align = design.headerAlign || 'center';
    const alignClass = align === 'left' ? 'items-start text-left' : align === 'right' ? 'items-end text-right' : 'items-center text-center';
    const justifyClass = align === 'left' ? 'justify-start' : align === 'right' ? 'justify-end' : 'justify-center';`,
    replace: `  'header-boxed': { id: 'header-boxed', name: 'Elegant Box', category: 'Header', render: ({ data, Editable, zoneId, isDark, showIcons, design, layoutZones, Title, readOnly }: any) => {
    const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
    const hasSidebarContact = layoutZones && Object.values(layoutZones).flat().some((block: any) => block?.type === 'sidebar-contact');
    const align = design.headerAlign || 'center';
    const alignClass = align === 'left' ? 'items-start text-left' : align === 'right' ? 'items-end text-right' : 'items-center text-center';
    const justifyClass = align === 'left' ? 'justify-start' : align === 'right' ? 'justify-end' : 'justify-center';
    const scales = getDynamicHeaderScales(data, isNarrow);
    const showAvatar = data?.basics?.showAvatar;`
  },
  {
    desc: 'header-boxed container and avatar adjustments',
    find: `      <div className={\`flex \${isNarrow ? 'flex-col items-center text-center' : 'items-center text-left'} gap-5 pb-5 snippet-anim w-full cv-keep-with-next\`}>
        <Title titleKey="header" overrideClass="hidden" />
        {data?.basics?.showAvatar && <AvatarEditable data={data} sizeClass={isNarrow ? 'w-28 h-28 mb-4' : 'w-24 h-24'} shapeClass="rounded-full shadow-xl" borderClass={isDark ? 'border-2 border-slate-700' : 'border-[4px] border-white'} readOnly={readOnly} />}`,
    replace: `      <div className={\`flex \${isNarrow ? 'flex-col items-center text-center gap-3.5 pb-3.5' : 'items-center text-left gap-5 pb-5'} snippet-anim w-full cv-keep-with-next\`}>
        <Title titleKey="header" overrideClass="hidden" />
        {showAvatar && <AvatarEditable data={data} sizeClass={isNarrow ? 'w-22 h-22 mb-2' : 'w-24 h-24'} shapeClass="rounded-full shadow-xl" borderClass={isDark ? 'border-2 border-slate-700' : 'border-[4px] border-white'} readOnly={readOnly} />}`
  },
  {
    desc: 'header-boxed fonts',
    find: `            <h1 className={\`\${isNarrow ? 'text-xl' : 'text-2xl'} font-bold\`}><Editable path="basics.name" nowrap={!isNarrow} /></h1>
          </div>
          <h2 className={\`\${TYPOGRAPHY.role} mb-5 \${isDark ? 'text-gray-400' : ''}\`}><Editable path="basics.title" nowrap={!isNarrow} /></h2>`,
    replace: `            <h1 className={\`\${isNarrow ? 'text-xl' : 'text-2xl'} font-bold\`} style={{ fontSize: \`calc(var(--cv-base-size) * \${scales.nameScale})\` }}><Editable path="basics.name" nowrap={!isNarrow} /></h1>
          </div>
          <h2 className={\`\${TYPOGRAPHY.role} mb-5 \${isDark ? 'text-gray-400' : ''}\`} style={{ fontSize: \`calc(var(--cv-base-size) * \${scales.titleScale})\` }}><Editable path="basics.title" nowrap={!isNarrow} /></h2>`
  },
  {
    desc: 'header-boxed contact section horizontal class',
    find: `          {!hasSidebarContact && (
            <div className={\`flex flex-wrap justify-center \${isNarrow ? 'flex-col gap-1.5' : \`gap-x-4 gap-y-1.5 \${justifyClass}\`} \${TYPOGRAPHY.contact}\`}>`,
    replace: `          {!hasSidebarContact && (
            <div className={\`flex flex-wrap justify-center \${isNarrow ? 'flex-col gap-1.5' : \`gap-x-4 gap-y-1.5 \${justifyClass}\`} \${TYPOGRAPHY.contact} cv-contact-horizontal\`}>`
  },

  // --- header-executive ---
  {
    desc: 'header-executive scales and sizes',
    find: `  'header-executive': { id: 'header-executive', name: 'Executive Stacked', category: 'Header', render: ({ data, Editable, zoneId, isDark, showIcons, design, layoutZones, Title, readOnly }: any) => {
    const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
    const hasSidebarContact = layoutZones && Object.values(layoutZones).flat().some((block: any) => block?.type === 'sidebar-contact');
    const align = design.headerAlign || 'left';
    const alignClass = align === 'center' ? 'items-center text-center' : align === 'right' ? 'items-end text-right' : 'items-start text-left';
    const justifyClass = align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start';`,
    replace: `  'header-executive': { id: 'header-executive', name: 'Executive Stacked', category: 'Header', render: ({ data, Editable, zoneId, isDark, showIcons, design, layoutZones, Title, readOnly }: any) => {
    const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
    const hasSidebarContact = layoutZones && Object.values(layoutZones).flat().some((block: any) => block?.type === 'sidebar-contact');
    const align = design.headerAlign || 'left';
    const alignClass = align === 'center' ? 'items-center text-center' : align === 'right' ? 'items-end text-right' : 'items-start text-left';
    const justifyClass = align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start';
    const scales = getDynamicHeaderScales(data, isNarrow);
    const showAvatar = data?.basics?.showAvatar;`
  },
  {
    desc: 'header-executive container and avatar adjustments',
    find: `      <div className={\`flex \${isNarrow ? 'flex-col items-center text-center' : 'items-center text-left'} gap-5 pb-4 border-b-[1.5px] \${isDark ? 'border-slate-700' : 'border-gray-900'} snippet-anim w-full cv-keep-with-next\`}>
        <Title titleKey="header" overrideClass="hidden" />
        {data?.basics?.showAvatar && <AvatarEditable data={data} sizeClass={isNarrow ? 'w-24 h-24 mb-3' : 'w-20 h-24'} shapeClass="rounded shadow-md" borderClass={isDark ? 'border border-slate-600' : ''} readOnly={readOnly} />}`,
    replace: `      <div className={\`flex \${isNarrow ? 'flex-col items-center text-center gap-3 pb-3' : 'items-center text-left gap-5 pb-4'} border-b-[1.5px] \${isDark ? 'border-slate-700' : 'border-gray-900'} snippet-anim w-full cv-keep-with-next\`}>
        <Title titleKey="header" overrideClass="hidden" />
        {showAvatar && <AvatarEditable data={data} sizeClass={isNarrow ? 'w-20 h-20 mb-2' : 'w-20 h-24'} shapeClass="rounded shadow-md" borderClass={isDark ? 'border border-slate-600' : ''} readOnly={readOnly} />}`
  },
  {
    desc: 'header-executive fonts',
    find: `        <div className={\`min-w-0 w-full flex flex-col \${alignClass}\`}>
          <h1 className={\`\${isNarrow ? 'text-2xl text-center' : 'text-3xl uppercase'} font-extrabold tracking-widest mb-2 \${isDark ? 'text-white' : 'text-gray-900'}\`}><Editable path="basics.name" nowrap={!isNarrow} /></h1>
          {!hasSidebarContact && (
            <div className={\`flex flex-wrap \${isNarrow ? 'flex-col text-center gap-1.5' : \`gap-x-4 gap-y-1.5 \${justifyClass}\`} \${TYPOGRAPHY.contact} \${isDark ? 'text-gray-300' : 'text-gray-800'}\`}>`,
    replace: `        <div className={\`min-w-0 w-full flex flex-col \${alignClass}\`}>
          <h1 className={\`\${isNarrow ? 'text-2xl text-center' : 'text-3xl uppercase'} font-extrabold tracking-widest mb-2 \${isDark ? 'text-white' : 'text-gray-900'}\`} style={{ fontSize: \`calc(var(--cv-base-size) * \${scales.nameScale})\` }}><Editable path="basics.name" nowrap={!isNarrow} /></h1>
          <h2 className={\`\${TYPOGRAPHY.role} mb-3\`} style={{ fontSize: \`calc(var(--cv-base-size) * \${scales.titleScale})\` }}><Editable path="basics.title" nowrap={!isNarrow} /></h2>
          {!hasSidebarContact && (
            <div className={\`flex flex-wrap \${isNarrow ? 'flex-col text-center gap-1.5' : \`gap-x-4 gap-y-1.5 \${justifyClass}\`} \${TYPOGRAPHY.contact} \${isDark ? 'text-gray-300' : 'text-gray-800'} cv-contact-horizontal\`}>`
  },

  // --- header-accent ---
  {
    desc: 'header-accent scales',
    find: `  'header-accent': { id: 'header-accent', name: 'Accent Side Bar', category: 'Header', render: ({ data, Editable, zoneId, isDark, Title, showIcons, design, layoutZones }: any) => {
    const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
    const hasSidebarContact = layoutZones && Object.values(layoutZones).flat().some((block: any) => block?.type === 'sidebar-contact');`,
    replace: `  'header-accent': { id: 'header-accent', name: 'Accent Side Bar', category: 'Header', render: ({ data, Editable, zoneId, isDark, Title, showIcons, design, layoutZones }: any) => {
    const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
    const hasSidebarContact = layoutZones && Object.values(layoutZones).flat().some((block: any) => block?.type === 'sidebar-contact');
    const scales = getDynamicHeaderScales(data, isNarrow);`
  },
  {
    desc: 'header-accent fonts',
    find: `          <div className={\`min-w-0 \${isNarrow ? 'w-full text-center' : 'w-2/3'}\`}>
            <h1 className={\`\${isNarrow ? 'text-3xl' : 'text-4xl'} font-light tracking-widest uppercase mb-2 \${isDark ? 'text-white' : 'text-gray-800'}\`}><Editable path="basics.name" nowrap={!isNarrow} /></h1>
            <h2 className={\`\${TYPOGRAPHY.role} tracking-[0.25em]\`}><Editable path="basics.title" nowrap={!isNarrow} /></h2>`,
    replace: `          <div className={\`min-w-0 \${isNarrow ? 'w-full text-center' : 'w-2/3'}\`}>
            <h1 className={\`\${isNarrow ? 'text-3xl' : 'text-4xl'} font-light tracking-widest uppercase mb-2 \${isDark ? 'text-white' : 'text-gray-800'}\`} style={{ fontSize: \`calc(var(--cv-base-size) * \${scales.nameScale})\` }}><Editable path="basics.name" nowrap={!isNarrow} /></h1>
            <h2 className={\`\${TYPOGRAPHY.role} tracking-[0.25em]\`} style={{ fontSize: \`calc(var(--cv-base-size) * \${scales.titleScale})\` }}><Editable path="basics.title" nowrap={!isNarrow} /></h2>`
  },
  {
    desc: 'header-accent contact horizontal class',
    find: `              <div className={\`\${TYPOGRAPHY.contact} flex flex-col justify-center gap-1 \${isDark ? 'text-gray-300' : 'text-gray-700'}\`}>
                <ContactLinks data={data} Editable={Editable} isNarrow={true} showIcons={showIcons} design={design} align={isNarrow ? 'justify-center' : 'justify-end'} />`,
    replace: `              <div className={\`\${TYPOGRAPHY.contact} flex flex-col justify-center gap-1 \${isDark ? 'text-gray-300' : 'text-gray-700'} cv-contact-horizontal\`}>
                <ContactLinks data={data} Editable={Editable} isNarrow={true} showIcons={showIcons} design={design} align={isNarrow ? 'justify-center' : 'justify-end'} />`
  },

  // --- header-creative ---
  {
    desc: 'header-creative scales and sizes',
    find: `  'header-creative': { id: 'header-creative', name: 'Creative Block', category: 'Header', render: ({ data, Editable, zoneId, isDark, showIcons, design, layoutZones, Title, readOnly }: any) => {
    const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
    const hasSidebarContact = layoutZones && Object.values(layoutZones).flat().some((block: any) => block?.type === 'sidebar-contact');
    const align = design.headerAlign || 'left';
    const alignClass = align === 'center' ? 'items-center text-center' : align === 'right' ? 'items-end text-right' : 'items-start text-left';
    const justifyClass = align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start';`,
    replace: `  'header-creative': { id: 'header-creative', name: 'Creative Block', category: 'Header', render: ({ data, Editable, zoneId, isDark, showIcons, design, layoutZones, Title, readOnly }: any) => {
    const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
    const hasSidebarContact = layoutZones && Object.values(layoutZones).flat().some((block: any) => block?.type === 'sidebar-contact');
    const align = design.headerAlign || 'left';
    const alignClass = align === 'center' ? 'items-center text-center' : align === 'right' ? 'items-end text-right' : 'items-start text-left';
    const justifyClass = align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start';
    const scales = getDynamicHeaderScales(data, isNarrow);
    const showAvatar = data?.basics?.showAvatar;`
  },
  {
    desc: 'header-creative container and avatar adjustments',
    find: `      <div className={\`flex \${isNarrow ? 'flex-col items-center text-center' : 'items-center text-left'} gap-6 p-6 rounded-xl snippet-anim cv-keep-with-next cv-accent-bg text-white shadow-lg\`}>
        <Title titleKey="header" overrideClass="hidden" />
        {data?.basics?.showAvatar && <AvatarEditable data={data} sizeClass={isNarrow ? 'w-24 h-24 mb-4' : 'w-24 h-24'} shapeClass="rounded-full shadow-2xl" borderClass="border-4 border-white/20" readOnly={readOnly} />}`,
    replace: `      <div className={\`flex \${isNarrow ? 'flex-col items-center text-center gap-3.5 p-4' : 'items-center text-left gap-6 p-6'} rounded-xl snippet-anim cv-keep-with-next cv-accent-bg text-white shadow-lg\`}>
        <Title titleKey="header" overrideClass="hidden" />
        {showAvatar && <AvatarEditable data={data} sizeClass={isNarrow ? 'w-22 h-22 mb-2' : 'w-24 h-24'} shapeClass="rounded-full shadow-2xl" borderClass="border-4 border-white/20" readOnly={readOnly} />}`
  },
  {
    desc: 'header-creative fonts',
    find: `          <h1 className={\`\${isNarrow ? 'text-2xl' : 'text-4xl'} font-black tracking-tight mb-1\`}><Editable path="basics.name" nowrap={!isNarrow} /></h1>
          <h2 className={\`text-sm font-semibold tracking-widest uppercase opacity-90 mb-4\`}><Editable path="basics.title" nowrap={!isNarrow} /></h2>`,
    replace: `          <h1 className={\`\${isNarrow ? 'text-2xl' : 'text-4xl'} font-black tracking-tight mb-1\`} style={{ fontSize: \`calc(var(--cv-base-size) * \${scales.nameScale})\` }}><Editable path="basics.name" nowrap={!isNarrow} /></h1>
          <h2 className={\`text-sm font-semibold tracking-widest uppercase opacity-90 mb-4\`} style={{ fontSize: \`calc(var(--cv-base-size) * \${scales.titleScale})\` }}><Editable path="basics.title" nowrap={!isNarrow} /></h2>`
  },
  {
    desc: 'header-creative contact section horizontal class',
    find: `          {!hasSidebarContact && (
            <div className={\`flex flex-wrap \${isNarrow ? 'flex-col gap-1.5' : \`gap-x-4 gap-y-1.5 \${justifyClass}\`} text-xs font-medium opacity-90\`}>`,
    replace: `          {!hasSidebarContact && (
            <div className={\`flex flex-wrap \${isNarrow ? 'flex-col gap-1.5' : \`gap-x-4 gap-y-1.5 \${justifyClass}\`} text-xs font-medium opacity-90 cv-contact-horizontal\`}>`
  },

  // --- header-typographic ---
  {
    desc: 'header-typographic scales and sizes',
    find: `  'header-typographic': { id: 'header-typographic', name: 'Typographic Display', category: 'Header', render: ({ data, Editable, zoneId, isDark, showIcons, design, layoutZones, Title }: any) => {
    const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
    const hasSidebarContact = layoutZones && Object.values(layoutZones).flat().some((b: any) => b?.type === 'sidebar-contact');`,
    replace: `  'header-typographic': { id: 'header-typographic', name: 'Typographic Display', category: 'Header', render: ({ data, Editable, zoneId, isDark, showIcons, design, layoutZones, Title }: any) => {
    const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
    const hasSidebarContact = layoutZones && Object.values(layoutZones).flat().some((b: any) => b?.type === 'sidebar-contact');
    const scales = getDynamicHeaderScales(data, isNarrow);`
  },
  {
    desc: 'header-typographic fonts',
    find: `        <div className={isNarrow ? 'text-center' : ''}>
          <h1 className={\`font-black leading-none tracking-tighter mb-2 \${isNarrow ? 'text-3xl' : 'text-5xl'} \${isDark ? 'text-white' : 'text-gray-900'}\`}><Editable path="basics.name" nowrap={!isNarrow} /></h1>
          <div className={\`flex items-center gap-3 mb-3 \${isNarrow ? 'justify-center' : ''}\`}>
            <div className="h-[2px] w-10 cv-accent-bg shrink-0" />
            <h2 className={\`\${TYPOGRAPHY.role} text-[0.85em] shrink-0\`}><Editable path="basics.title" nowrap={!isNarrow} /></h2>`,
    replace: `        <div className={isNarrow ? 'text-center' : ''}>
          <h1 className={\`font-black leading-none tracking-tighter mb-2 \${isNarrow ? 'text-3xl' : 'text-5xl'} \${isDark ? 'text-white' : 'text-gray-900'}\`} style={{ fontSize: \`calc(var(--cv-base-size) * \${scales.nameScale})\` }}><Editable path="basics.name" nowrap={!isNarrow} /></h1>
          <div className={\`flex items-center gap-3 mb-3 \${isNarrow ? 'justify-center' : ''}\`}>
            <div className="h-[2px] w-10 cv-accent-bg shrink-0" />
            <h2 className={\`\${TYPOGRAPHY.role} text-[0.85em] shrink-0\`} style={{ fontSize: \`calc(var(--cv-base-size) * \${scales.titleScale})\` }}><Editable path="basics.title" nowrap={!isNarrow} /></h2>`
  },
  {
    desc: 'header-typographic contact horizontal class',
    find: `          {!hasSidebarContact && <div className={\`flex flex-wrap gap-x-5 gap-y-1 \${isNarrow ? 'justify-center' : ''} \${TYPOGRAPHY.contact} \${isDark ? 'text-gray-400' : 'text-gray-500'}\`}><ContactLinks data={data} Editable={Editable} isNarrow={isNarrow} showIcons={showIcons} design={design} /></div>}`,
    replace: `          {!hasSidebarContact && <div className={\`flex flex-wrap gap-x-5 gap-y-1 \${isNarrow ? 'justify-center' : ''} \${TYPOGRAPHY.contact} \${isDark ? 'text-gray-400' : 'text-gray-500'} cv-contact-horizontal\`}><ContactLinks data={data} Editable={Editable} isNarrow={isNarrow} showIcons={showIcons} design={design} /></div>}`
  },

  // --- header-column-left ---
  {
    desc: 'header-column-left scales and sizes',
    find: `  'header-column-left': { id: 'header-column-left', name: 'Column Split', category: 'Header', render: ({ data, Editable, zoneId, isDark, showIcons, design, layoutZones, Title }: any) => {
    const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
    const hasSidebarContact = layoutZones && Object.values(layoutZones).flat().some((b: any) => b?.type === 'sidebar-contact');`,
    replace: `  'header-column-left': { id: 'header-column-left', name: 'Column Split', category: 'Header', render: ({ data, Editable, zoneId, isDark, showIcons, design, layoutZones, Title, readOnly }: any) => {
    const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
    const hasSidebarContact = layoutZones && Object.values(layoutZones).flat().some((b: any) => b?.type === 'sidebar-contact');
    const scales = getDynamicHeaderScales(data, isNarrow);
    const showAvatar = data?.basics?.showAvatar;`
  },
  {
    desc: 'header-column-left container adjustments',
    find: `      <div className={\`snippet-anim w-full cv-keep-with-next flex \${isNarrow ? 'flex-col gap-3 items-center text-center' : 'gap-8 items-end'} pb-4 border-b \${isDark ? 'border-slate-700' : 'border-gray-200'}\`}>`,
    replace: `      <div className={\`snippet-anim w-full cv-keep-with-next flex \${isNarrow ? 'flex-col items-center text-center gap-3.5 pb-3.5' : 'gap-8 items-end pb-4'} border-b \${isDark ? 'border-slate-700' : 'border-gray-200'}\`}>`
  },
  {
    desc: 'header-column-left fonts',
    find: `        <div className={\`\${isNarrow ? '' : 'flex-1'} min-w-0\`}>
          <h1 className={\`font-bold leading-tight \${isNarrow ? TYPOGRAPHY.nameNarrow : TYPOGRAPHY.name} \${isDark ? 'text-white' : 'text-gray-900'}\`}><Editable path="basics.name" nowrap={!isNarrow} /></h1>
          <h2 className={\`\${TYPOGRAPHY.role} mt-1\`}><Editable path="basics.title" nowrap={!isNarrow} /></h2>`,
    replace: `        <div className={\`\${isNarrow ? '' : 'flex-1'} min-w-0 w-full\`}>
          <h1 className={\`font-bold leading-tight \${isNarrow ? TYPOGRAPHY.nameNarrow : TYPOGRAPHY.name} \${isDark ? 'text-white' : 'text-gray-900'}\`} style={{ fontSize: \`calc(var(--cv-base-size) * \${scales.nameScale})\` }}><Editable path="basics.name" nowrap={!isNarrow} /></h1>
          <h2 className={\`\${TYPOGRAPHY.role} mt-1\`} style={{ fontSize: \`calc(var(--cv-base-size) * \${scales.titleScale})\` }}><Editable path="basics.title" nowrap={!isNarrow} /></h2>`
  },

  // --- header-banner ---
  {
    desc: 'header-banner scales and sizes',
    find: `  'header-banner': { id: 'header-banner', name: 'Accent Banner', category: 'Header', render: ({ data, Editable, zoneId, isDark, showIcons, design, layoutZones, Title }: any) => {
    const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
    const hasSidebarContact = layoutZones && Object.values(layoutZones).flat().some((b: any) => b?.type === 'sidebar-contact');`,
    replace: `  'header-banner': { id: 'header-banner', name: 'Accent Banner', category: 'Header', render: ({ data, Editable, zoneId, isDark, showIcons, design, layoutZones, Title, readOnly }: any) => {
    const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
    const hasSidebarContact = layoutZones && Object.values(layoutZones).flat().some((b: any) => b?.type === 'sidebar-contact');
    const scales = getDynamicHeaderScales(data, isNarrow);
    const showAvatar = data?.basics?.showAvatar;`
  },
  {
    desc: 'header-banner container and avatar adjustments',
    find: `      <div className="snippet-anim w-full cv-keep-with-next">
        <Title titleKey="header" overrideClass="hidden" />
        <div className="cv-accent-bg rounded-lg px-5 py-4 mb-3">`,
    replace: `      <div className="snippet-anim w-full cv-keep-with-next">
        <Title titleKey="header" overrideClass="hidden" />
        <div className={\`cv-accent-bg rounded-lg \${isNarrow ? 'px-4 py-3' : 'px-5 py-4'} mb-3\`}>`
  },
  {
    desc: 'header-banner fonts wide',
    find: `        <div className="cv-accent-bg rounded-lg px-5 py-4 mb-3">
          <h1 className={\`font-extrabold tracking-tight text-white leading-tight \${isNarrow ? 'text-2xl' : 'text-3xl'}\`}><Editable path="basics.name" nowrap={!isNarrow} /></h1>
          <h2 className="text-[0.82em] font-semibold tracking-widest uppercase text-white/80 mt-0.5"><Editable path="basics.title" nowrap={!isNarrow} /></h2>
        </div>`,
    replace: `        <div className={\`cv-accent-bg rounded-lg \${isNarrow ? 'px-4 py-3' : 'px-5 py-4'} mb-3\`}>
          <h1 className={\`font-extrabold tracking-tight text-white leading-tight \${isNarrow ? 'text-2xl' : 'text-3xl'}\`} style={{ fontSize: \`calc(var(--cv-base-size) * \${scales.nameScale})\` }}><Editable path="basics.name" nowrap={!isNarrow} /></h1>
          <h2 className="text-[0.82em] font-semibold tracking-widest uppercase text-white/80 mt-0.5" style={{ fontSize: \`calc(var(--cv-base-size) * \${scales.titleScale})\` }}><Editable path="basics.title" nowrap={!isNarrow} /></h2>
        </div>`
  },
  {
    desc: 'header-banner contact horizontal class',
    find: `        {!hasSidebarContact && <div className={\`flex flex-wrap gap-x-4 gap-y-1 \${isNarrow ? 'flex-col items-start gap-1.5' : ''} \${TYPOGRAPHY.contact} \${isDark ? 'text-gray-400' : 'text-gray-600'}\`}><ContactLinks data={data} Editable={Editable} isNarrow={isNarrow} showIcons={showIcons} design={design} /></div>}`,
    replace: `        {!hasSidebarContact && <div className={\`flex flex-wrap gap-x-4 gap-y-1 \${isNarrow ? 'flex-col items-start gap-1.5' : ''} \${TYPOGRAPHY.contact} \${isDark ? 'text-gray-400' : 'text-gray-600'} cv-contact-horizontal\`}><ContactLinks data={data} Editable={Editable} isNarrow={isNarrow} showIcons={showIcons} design={design} /></div>}`
  }
];

for (const rep of replacements) {
  const success = robustReplace(rep.find, rep.replace);
  if (success) {
    console.log(`Successfully completed: ${rep.desc}`);
  } else {
    console.error(`ERROR: Failed to find target for: ${rep.desc}`);
    process.exit(1);
  }
}

// 8. Replace heading-subheading spacing globally for those standard entries where commas exist
console.log('Running replacements for standard entry spacing and commas...');

const splitReplacements = [
  {
    desc: 'experience-split spacing',
    find: `<h4 className={\`\${TYPOGRAPHY.itemTitle} inline-block mr-2 \${isDark ? 'text-gray-100' : 'text-gray-900'}\`}><Editable path={\`experience.\${idx}.company\`} nowrap />,</h4><span className={\`\${TYPOGRAPHY.itemSubtitle} \${isDark ? 'text-gray-400' : 'text-gray-600'}\`}><Editable path={\`experience.\${idx}.role\`} nowrap /></span>`,
    replace: `<h4 className={\`\${TYPOGRAPHY.itemTitle} inline \${isDark ? 'text-gray-100' : 'text-gray-900'}\`}><Editable path={\`experience.\${idx}.company\`} nowrap />, </h4><span className={\`\${TYPOGRAPHY.itemSubtitle} \${isDark ? 'text-gray-400' : 'text-gray-600'} inline\`}><Editable path={\`experience.\${idx}.role\`} nowrap /></span>`
  },
  {
    desc: 'education-split spacing',
    find: `<h4 className={\`\${TYPOGRAPHY.itemTitle} inline-block mr-2 \${isDark ? 'text-gray-100' : 'text-gray-900'}\`}><Editable path={\`education.\${idx}.institution\`} nowrap />,</h4><span className={\`\${TYPOGRAPHY.itemSubtitle} \${isDark ? 'text-gray-400' : 'text-gray-600'}\`}><Editable path={\`education.\${idx}.degree\`} nowrap /></span>`,
    replace: `<h4 className={\`\${TYPOGRAPHY.itemTitle} inline \${isDark ? 'text-gray-100' : 'text-gray-900'}\`}><Editable path={\`education.\${idx}.institution\`} nowrap />, </h4><span className={\`\${TYPOGRAPHY.itemSubtitle} \${isDark ? 'text-gray-400' : 'text-gray-600'} inline\`}><Editable path={\`education.\${idx}.degree\`} nowrap /></span>`
  },
  {
    desc: 'projects-split spacing',
    find: `<h4 className={\`\${TYPOGRAPHY.itemTitle} inline-block mr-2 \${isDark ? 'text-gray-100' : 'text-gray-900'}\`}><Editable path={\`projects.\${idx}.name\`} nowrap />,</h4><span className={\`\${TYPOGRAPHY.itemSubtitle} \${isDark ? 'text-gray-400' : 'text-gray-600'}\`}><Editable path={\`projects.\${idx}.role\`} nowrap /></span>`,
    replace: `<h4 className={\`\${TYPOGRAPHY.itemTitle} inline \${isDark ? 'text-gray-100' : 'text-gray-900'}\`}><Editable path={\`projects.\${idx}.name\`} nowrap />, </h4><span className={\`\${TYPOGRAPHY.itemSubtitle} \${isDark ? 'text-gray-400' : 'text-gray-600'} inline\`}><Editable path={\`projects.\${idx}.role\`} nowrap /></span>`
  }
];

for (const rep of splitReplacements) {
  if (content.includes(rep.find)) {
    content = content.replace(rep.find, rep.replace);
    console.log(`Successfully completed: ${rep.desc}`);
  } else {
    console.warn(`WARNING: Failed to find target for: ${rep.desc}`);
  }
}

// Write back updated content
fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully wrote patched registry.tsx (complete).');
