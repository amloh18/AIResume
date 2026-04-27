import re

with open('src/components/cv-builder-pro/registry.tsx', 'r') as f:
    content = f.read()

# SubTask 1.1: whitespace-nowrap for basics.name and basics.title
# Actually the prompt says: Update all `basics.name` and `basics.title` Editable components in `registry.tsx` headers to include `whitespace-nowrap` classes or `nowrap` prop.
# Let's replace <Editable path="basics.name" /> with <Editable path="basics.name" nowrap />
content = re.sub(r'<Editable\s+path="basics\.name"\s*/>', r'<Editable path="basics.name" nowrap />', content)
content = re.sub(r'<Editable\s+path="basics\.title"\s*/>', r'<Editable path="basics.title" nowrap />', content)

# SubTask 1.2: ContactLinks deduplication
contact_links_original = """export const ContactLinks = ({ data, Editable, isNarrow, showIcons, design, align = 'justify-center' }: any) => {
  const links: React.ReactNode[] = [];
  const headerLinks = design?.headerLinks || {};
  const isVisible = (key: string) => headerLinks[key] !== false;
  
  if (isVisible('location')) links.push(<span className={`flex items-center gap-1.5 ${align}`} key="loc">{showIcons && <MapPin size={13} /> }<Editable path="basics.location" nowrap /></span>);
  if (isVisible('phone')) links.push(<span className={`flex items-center gap-1.5 ${align}`} key="phone">{showIcons && <Phone size={13} /> }<Editable path="basics.phone" nowrap /></span>);
  if (isVisible('email')) links.push(<span className={`flex items-center gap-1.5 ${align}`} key="email">{showIcons && <Mail size={13} /> }<Editable path="basics.email" breakAll /></span>);
  
  // Legacy root fields
  if (isVisible('linkedin') && data?.basics?.linkedin) links.push(<span className={`flex items-center gap-1.5 ${align}`} key="li">{showIcons && <Linkedin size={13} /> }<Editable path="basics.linkedin" breakAll /></span>);
  if (isVisible('website') && data?.basics?.website) links.push(<span className={`flex items-center gap-1.5 ${align}`} key="web">{showIcons && <LinkIcon size={13} /> }<Editable path="basics.website" breakAll /></span>);
  
  // Profiles array
  if (data?.basics?.profiles && Array.isArray(data.basics.profiles)) {
    data.basics.profiles.forEach((profile: any, index: number) => {
      const net = profile.network?.toLowerCase() || `link-${index}`;
      if (isVisible(net)) {
         const Icon = getNetworkIcon(net);
         links.push(<span className={`flex items-center gap-1.5 ${align}`} key={`prof-${index}`}>{showIcons && <Icon size={13} /> }<Editable path={`basics.profiles.${index}.url`} breakAll /></span>);
      }
    });
  }"""

contact_links_new = """export const ContactLinks = ({ data, Editable, isNarrow, showIcons, design, align = 'justify-center' }: any) => {
  const links: React.ReactNode[] = [];
  const headerLinks = design?.headerLinks || {};
  const isVisible = (key: string) => headerLinks[key] !== false;
  
  const seenValues = new Set<string>();

  const addLink = (key: string, value: string | undefined, node: React.ReactNode) => {
    if (!isVisible(key)) return;
    if (value) {
      const normalized = value.toLowerCase().replace(/^(https?:\\/\\/)?(www\\.)?/, '').replace(/\\/$/, '').trim();
      if (seenValues.has(normalized)) return;
      seenValues.add(normalized);
    }
    links.push(node);
  };
  
  addLink('location', data?.basics?.location, <span className={`flex items-center gap-1.5 ${align}`} key="loc">{showIcons && <MapPin size={13} /> }<Editable path="basics.location" nowrap /></span>);
  addLink('phone', data?.basics?.phone, <span className={`flex items-center gap-1.5 ${align}`} key="phone">{showIcons && <Phone size={13} /> }<Editable path="basics.phone" nowrap /></span>);
  addLink('email', data?.basics?.email, <span className={`flex items-center gap-1.5 ${align}`} key="email">{showIcons && <Mail size={13} /> }<Editable path="basics.email" breakAll /></span>);
  
  // Legacy root fields
  if (data?.basics?.linkedin) {
    addLink('linkedin', data.basics.linkedin, <span className={`flex items-center gap-1.5 ${align}`} key="li">{showIcons && <Linkedin size={13} /> }<Editable path="basics.linkedin" breakAll /></span>);
  }
  if (data?.basics?.website) {
    addLink('website', data.basics.website, <span className={`flex items-center gap-1.5 ${align}`} key="web">{showIcons && <LinkIcon size={13} /> }<Editable path="basics.website" breakAll /></span>);
  }
  
  // Profiles array
  if (data?.basics?.profiles && Array.isArray(data.basics.profiles)) {
    data.basics.profiles.forEach((profile: any, index: number) => {
      const net = profile.network?.toLowerCase() || `link-${index}`;
      const Icon = getNetworkIcon(net);
      addLink(net, profile.url, <span className={`flex items-center gap-1.5 ${align}`} key={`prof-${index}`}>{showIcons && <Icon size={13} /> }<Editable path={`basics.profiles.${index}.url`} breakAll /></span>);
    });
  }"""

if contact_links_original in content:
    content = content.replace(contact_links_original, contact_links_new)
else:
    print("Warning: contact_links_original not found")

# SubTask 1.3 and 1.4: Remove literal isDate={true} and split dates
# e.g., <Editable path={`experience.${idx}.date`} nowrap /> isDate={true}
# We will use regex to find <Editable path={`COLLECTION.${idx}.date`} ... /> isDate={true}
# and replace with <Editable path={`COLLECTION.${idx}.startDate`} nowrap isDate={true} /> - <Editable path={`COLLECTION.${idx}.endDate`} nowrap isDate={true} />

def replace_date(match):
    prefix = match.group(1) # e.g. experience
    idx = match.group(2)    # e.g. idx
    
    return f'<Editable path={{`{prefix}.${{{idx}}}.startDate`}} nowrap isDate={{true}} /> - <Editable path={{`{prefix}.${{{idx}}}.endDate`}} nowrap isDate={{true}} />'

# Replace `<Editable path={`something.${idx}.date`} nowrap /> isDate={true}`
content = re.sub(r'<Editable\s+path=\{`([a-zA-Z]+)\.\$\{([^}]+)\}\.date`\}\s*nowrap\s*/>\s*isDate=\{true\}', replace_date, content)

# Also there might be places without `isDate={true}` literal but still using `.date`. Let's check.
# The prompt says: "Remove the literal `isDate={true}` text across all snippet definitions in `registry.tsx` by fixing the JSX syntax `<Editable path="..." nowrap isDate={true} />`."
# And: "Refactor the single `date` Editable fields in experience, education, projects, etc., into separate `startDate` and `endDate` Editable fields with consistent hyphen spacing."

# Let's replace ANY <Editable path={`PREFIX.${IDX}.date`} ... /> with the split dates.
def replace_any_date(match):
    prefix = match.group(1)
    idx = match.group(2)
    rest = match.group(3) # e.g. nowrap />
    # remove any literal isDate={true} that might follow
    # Actually, we already replaced the ones with literal isDate={true}. Let's do it generally.
    return f'<Editable path={{`{prefix}.${{{idx}}}.startDate`}} nowrap isDate={{true}} /> - <Editable path={{`{prefix}.${{{idx}}}.endDate`}} nowrap isDate={{true}} />'

content = re.sub(r'<Editable\s+path=\{`([a-zA-Z]+)\.\$\{([^}]+)\}\.date`\}\s*(nowrap\s*/>(?:\s*isDate=\{true\})?)', replace_any_date, content)

with open('src/components/cv-builder-pro/registry.tsx', 'w') as f:
    f.write(content)

print("Modifications applied.")
