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
