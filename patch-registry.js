const fs = require('fs');

let content = fs.readFileSync('src/components/cv-builder-pro/registry.tsx', 'utf8');

// Replace header-minimal
content = content.replace(
  /('header-minimal'[\s\S]*?return \()([\s\S]*?)(    \);\n  \}\},)/,
  `$1
      <div className={\`flex \${isNarrow ? 'flex-col items-center text-center' : 'items-center text-left'} gap-5 pb-4 border-b \${isDark ? 'border-slate-700 text-gray-300' : 'border-gray-200 text-gray-600'} snippet-anim cv-keep-with-next\`}>
        <Title titleKey="header" overrideClass="hidden" />
        {data?.basics?.showAvatar && <img src={data.basics.avatar} alt="Avatar" className={\`rounded-full object-cover shadow-md shrink-0 \${isNarrow ? 'w-24 h-24 mb-3' : 'w-20 h-20'} \${isDark ? 'border-2 border-slate-700' : ''}\`} />}
        <div className={\`min-w-0 w-full \${isNarrow ? '' : 'flex flex-col items-center'}\`}>
          <h1 className={\`\${isNarrow ? TYPOGRAPHY.nameNarrow : TYPOGRAPHY.name} \${isDark ? 'text-white' : 'text-gray-900'} mb-1 uppercase tracking-widest \${!isNarrow && 'text-center'}\`}><Editable path="basics.name" /></h1>
          <h2 className={\`\${TYPOGRAPHY.role} \${isDark ? 'text-gray-400' : ''} mb-3 \${!isNarrow && 'text-center'}\`}><Editable path="basics.title" /></h2>
          {!hasSidebarContact && (
            <div className={\`flex flex-wrap justify-center \${isNarrow ? 'flex-col gap-1.5 items-center' : 'gap-x-4 gap-y-1.5 items-center'} \${TYPOGRAPHY.contact}\`}>
              <ContactLinks data={data} Editable={Editable} isNarrow={isNarrow} showIcons={showIcons} design={design} />
            </div>
          )}
        </div>
      </div>
$3`
);

// Replace header-boxed
content = content.replace(
  /('header-boxed'[\s\S]*?return \()([\s\S]*?)(    \);\n  \}\},)/,
  `$1
      <div className={\`flex \${isNarrow ? 'flex-col items-center text-center' : 'items-center text-left'} gap-5 pb-5 snippet-anim w-full cv-keep-with-next\`}>
        <Title titleKey="header" overrideClass="hidden" />
        {data?.basics?.showAvatar && <img src={data.basics.avatar} alt="Avatar" className={\`rounded-full object-cover shadow-xl shrink-0 \${isNarrow ? 'w-28 h-28 mb-4' : 'w-24 h-24'} \${isDark ? 'border-2 border-slate-700' : 'border-[4px] border-white'}\`} />}
        <div className="min-w-0 w-full flex flex-col items-center text-center">
          <div className={\`inline-block border-[2px] px-8 py-3 mb-4 tracking-[0.25em] uppercase \${isDark ? 'border-white text-white' : 'border-gray-900 text-gray-900'}\`}>
            <h1 className={\`\${isNarrow ? 'text-xl' : 'text-2xl'} font-bold\`}><Editable path="basics.name" nowrap /></h1>
          </div>
          <h2 className={\`\${TYPOGRAPHY.role} mb-5 \${isDark ? 'text-gray-400' : ''}\`}><Editable path="basics.title" /></h2>
          {!hasSidebarContact && (
            <div className={\`flex flex-wrap justify-center \${isNarrow ? 'flex-col gap-1.5' : 'gap-x-4 gap-y-1.5'} \${TYPOGRAPHY.contact}\`}>
              <ContactLinks data={data} Editable={Editable} isNarrow={isNarrow} showIcons={showIcons} design={design} />
            </div>
          )}
        </div>
      </div>
$3`
);

// Replace header-executive
content = content.replace(
  /('header-executive'[\s\S]*?return \()([\s\S]*?)(    \);\n  \}\},)/,
  `$1
      <div className={\`flex \${isNarrow ? 'flex-col items-center text-center' : 'items-center text-left'} gap-5 pb-4 border-b-[1.5px] \${isDark ? 'border-slate-700' : 'border-gray-900'} snippet-anim w-full cv-keep-with-next\`}>
        <Title titleKey="header" overrideClass="hidden" />
        {data?.basics?.showAvatar && <img src={data.basics.avatar} alt="Avatar" className={\`rounded object-cover shadow-md shrink-0 \${isNarrow ? 'w-24 h-24 mb-3' : 'w-20 h-24'} \${isDark ? 'border border-slate-600' : ''}\`} />}
        <div className={\`min-w-0 w-full flex flex-col \${isNarrow ? 'items-center text-center' : 'items-start'}\`}>
          <h1 className={\`\${isNarrow ? 'text-2xl text-center' : 'text-3xl uppercase'} font-extrabold tracking-widest mb-2 \${isDark ? 'text-white' : 'text-gray-900'}\`}><Editable path="basics.name" /></h1>
          {!hasSidebarContact && (
            <div className={\`flex flex-wrap \${isNarrow ? 'flex-col text-center gap-1.5' : 'gap-x-4 gap-y-1.5'} \${TYPOGRAPHY.contact} \${isDark ? 'text-gray-300' : 'text-gray-800'}\`}>
              <ContactLinks data={data} Editable={Editable} isNarrow={isNarrow} showIcons={showIcons} design={design} align={isNarrow ? 'justify-center' : ''} />
            </div>
          )}
        </div>
      </div>
$3`
);

// Replace header-creative
content = content.replace(
  /('header-creative'[\s\S]*?return \()([\s\S]*?)(    \);\n  \}\},)/,
  `$1
      <div className={\`flex \${isNarrow ? 'flex-col items-center text-center' : 'items-center text-left'} gap-6 p-6 rounded-xl snippet-anim cv-keep-with-next cv-accent-bg text-white shadow-lg\`}>
        <Title titleKey="header" overrideClass="hidden" />
        {data?.basics?.showAvatar && <img src={data.basics.avatar} alt="Avatar" className={\`rounded-full object-cover shrink-0 shadow-2xl border-4 border-white/20 \${isNarrow ? 'w-24 h-24 mb-4' : 'w-24 h-24'}\`} />}
        <div className="min-w-0 w-full flex flex-col">
          <h1 className={\`\${isNarrow ? 'text-2xl' : 'text-4xl'} font-black tracking-tight mb-1\`}><Editable path="basics.name" /></h1>
          <h2 className={\`text-sm font-semibold tracking-widest uppercase opacity-90 mb-4\`}><Editable path="basics.title" /></h2>
          {!hasSidebarContact && (
            <div className={\`flex flex-wrap \${isNarrow ? 'flex-col gap-1.5' : 'gap-x-4 gap-y-1.5'} text-xs font-medium opacity-90\`}>
              <ContactLinks data={data} Editable={Editable} isNarrow={isNarrow} showIcons={showIcons} design={design} />
            </div>
          )}
        </div>
      </div>
$3`
);

fs.writeFileSync('src/components/cv-builder-pro/registry.tsx', content);
