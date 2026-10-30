export const getNestedValue = (obj: any, path: string) => {
  return path.split('.').reduce((acc, part) => acc && acc[part], obj);
};

export const setNestedValue = (obj: any, path: string, value: any) => {
  const newObj = JSON.parse(JSON.stringify(obj));
  const parts = path.split('.');
  const last = parts.pop()!;
  const target = parts.reduce((acc: any, part: string, index: number) => {
    const nextPart = parts[index + 1] ?? last;
    const nextIsIndex = /^\d+$/.test(nextPart);
    if (acc[part] == null) {
      acc[part] = nextIsIndex ? [] : {};
    }
    return acc[part];
  }, newObj);
  if (Array.isArray(target) && /^\d+$/.test(last)) {
    const idx = Number(last);
    while (target.length <= idx) target.push(null);
  }
  target[last] = value;
  return newObj;
};

export const generateId = () => Math.random().toString(36).substr(2, 9);

/**
 * Default titles and subtitles for adding entries to list collections.
 */
export const ADD_ENTRY_PREVIEW: Record<string, { title: string; subtitle: string }> = {
  experience: { title: 'Add Experience', subtitle: 'Add a new role with company, dates, and achievements' },
  education: { title: 'Add Education', subtitle: 'Add a degree, institution, and study period' },
  projects: { title: 'Add Project', subtitle: 'Showcase another project, link, or key milestone' },
  certifications: { title: 'Add Certification', subtitle: 'Add a professional credential or license' },
  awards: { title: 'Add Award', subtitle: 'Highlight another honor or achievement' },
  publications: { title: 'Add Publication', subtitle: 'Add a paper, article, or authored work' },
  volunteer: { title: 'Add Volunteer Work', subtitle: 'Add community contribution or cause' },
  references: { title: 'Add Reference', subtitle: 'Add a referee contact or recommendation' },
  languages: { title: 'Add Language', subtitle: 'Add another language and proficiency' },
  interests: { title: 'Add Interest', subtitle: 'Add another hobby or personal interest' },
  skills: { title: 'Add Skill Category', subtitle: 'Add a new group of skills' },
};

/**
 * A copy of `list[index]`, inserted directly AFTER it, with a fresh id.
 *
 * The id is the entry's identity everywhere else — the pagination key
 * (`<blockId>_entry_<entryId>`), the React key, and the `collection.index`
 * field paths the snippet renders — so the copy must get its own or the two
 * entries would share a page assignment and collide on render.
 *
 * Pure, with the id factory injected, so the placement rule is assertable
 * without a browser (`npm run verify:entry-duplicate`). Returns `null` when
 * there is nothing to duplicate, which the caller must treat as a no-op rather
 * than as an empty list.
 */
export const duplicateEntryAt = (
  list: any[] | null | undefined,
  index: number,
  makeId: () => string = generateId
): any[] | null => {
  if (!Array.isArray(list) || index < 0 || index >= list.length || !list[index]) return null;
  const next = [...list];
  next.splice(index + 1, 0, { ...list[index], id: makeId() });
  return next;
};

export const escapeRegExp = (string: string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
};

export const formatCVDate = (dateStr: string, format: string) => {
  if (!dateStr || dateStr.trim() === '') return '';
  if (dateStr.trim().toLowerCase() === 'present') return 'Present';
  
  // Try to parse the date
  const parsedDate = new Date(dateStr);
  if (isNaN(parsedDate.getTime())) {
    // If we can't parse it with Date(), try basic parsing for YYYY-MM or MM/YYYY
    const parts = dateStr.split(/[\/\-]/);
    if (parts.length === 2) {
      let year, month;
      if (parts[0].length === 4) { year = parts[0]; month = parts[1]; }
      else { month = parts[0]; year = parts[1]; }
      const d = new Date(parseInt(year), parseInt(month) - 1);
      if (!isNaN(d.getTime())) return formatParsedDate(d, format);
    }
    // Return raw if unparseable
    return dateStr;
  }
  return formatParsedDate(parsedDate, format);
};

const formatParsedDate = (date: Date, format: string) => {
  const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthsLong = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  
  const m = date.getMonth();
  const y = date.getFullYear();
  
  switch (format) {
    case 'MM/YYYY':
      return `${(m + 1).toString().padStart(2, '0')}/${y}`;
    case 'MMM YYYY':
      return `${monthsShort[m]} ${y}`;
    case 'MMMM YYYY':
      return `${monthsLong[m]} ${y}`;
    case 'YYYY-MM':
      return `${y}-${(m + 1).toString().padStart(2, '0')}`;
    case 'YYYY':
      return `${y}`;
    default:
      return `${monthsShort[m]} ${y}`;
  }
};
