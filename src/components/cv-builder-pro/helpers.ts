export const getNestedValue = (obj: any, path: string) => {
  return path.split('.').reduce((acc, part) => acc && acc[part], obj);
};

export const setNestedValue = (obj: any, path: string, value: any) => {
  const newObj = JSON.parse(JSON.stringify(obj));
  const parts = path.split('.');
  const last = parts.pop()!;
  const target = parts.reduce((acc: any, part: string) => {
    if (!acc[part]) acc[part] = {};
    return acc[part];
  }, newObj);
  target[last] = value;
  return newObj;
};

export const generateId = () => Math.random().toString(36).substr(2, 9);

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
