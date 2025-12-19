/**
 * Converts a fieldPath (e.g., "work[0].summary") to a user-friendly label
 * (e.g., "Work Experience #1 Summary")
 */
export function getFieldPathLabel(fieldPath: string): string {
  // Parse the fieldPath
  const tokens: (string | number)[] = [];
  const re = /([^[.\]]+)|\[(\d+)\]/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(fieldPath)) !== null) {
    if (match[1]) tokens.push(match[1]);
    else if (match[2]) tokens.push(Number(match[2]));
  }

  if (tokens.length === 0) return 'Field';

  // Map section names to user-friendly labels
  const sectionLabels: Record<string, string> = {
    basics: 'Personal Info',
    work: 'Work Experience',
    education: 'Education',
    skills: 'Skills',
    projects: 'Projects',
    certificates: 'Certificates',
    languages: 'Languages',
    volunteer: 'Volunteer',
    awards: 'Awards',
    publications: 'Publications',
    references: 'References',
    interests: 'Interests'
  };

  // Map field names to user-friendly labels
  const fieldLabels: Record<string, string> = {
    summary: 'Summary',
    name: 'Name',
    label: 'Label',
    email: 'Email',
    phone: 'Phone',
    url: 'URL',
    image: 'Image',
    address: 'Address',
    city: 'City',
    region: 'Region',
    postalCode: 'Postal Code',
    countryCode: 'Country',
    company: 'Company',
    position: 'Position',
    website: 'Website',
    startDate: 'Start Date',
    endDate: 'End Date',
    highlights: 'Highlights',
    description: 'Description',
    institution: 'Institution',
    area: 'Area',
    studyType: 'Study Type',
    score: 'Score',
    keywords: 'Keywords',
    level: 'Level',
    title: 'Title',
    date: 'Date',
    publisher: 'Publisher',
    releaseDate: 'Release Date',
    issuer: 'Issuer',
    issueDate: 'Issue Date',
    language: 'Language',
    fluency: 'Fluency',
    organization: 'Organization',
    role: 'Role'
  };

  // Find section name (first string token)
  let sectionName = '';
  let sectionIndex = -1;
  for (let i = 0; i < tokens.length; i++) {
    if (typeof tokens[i] === 'string' && sectionLabels[tokens[i] as string]) {
      sectionName = sectionLabels[tokens[i] as string];
      sectionIndex = i;
      break;
    }
  }

  if (!sectionName) return 'Field';

  // Find the last field name (last string token that's not a section name)
  let fieldName = '';
  let fieldIndex = -1;
  for (let i = tokens.length - 1; i >= 0; i--) {
    if (typeof tokens[i] === 'string' && i !== sectionIndex) {
      fieldName = tokens[i] as string;
      fieldIndex = i;
      break;
    }
  }

  const fieldLabel = fieldLabels[fieldName] || (fieldName ? fieldName.charAt(0).toUpperCase() + fieldName.slice(1) : '');

  // Find array indices
  const indices: number[] = [];
  for (let i = sectionIndex + 1; i < tokens.length; i++) {
    if (typeof tokens[i] === 'number') {
      indices.push(tokens[i] as number);
    }
  }

  // Build the label
  let result = sectionName;
  
  // Add first index if present (e.g., work[0] -> "Work Experience #1")
  if (indices.length > 0) {
    result += ` #${indices[0] + 1}`;
  }

  // Add field label if present
  if (fieldLabel) {
    result += ` ${fieldLabel}`;
  }

  // Add nested index if present (e.g., work[0].highlights[1] -> "Work Experience #1 Highlights #2")
  if (indices.length > 1) {
    result += ` #${indices[1] + 1}`;
  }

  return result || 'Field';
}

/**
 * Gets annotations for a specific field path
 */
export function getAnnotationsForFieldPath(
  annotations: Array<{ fieldPath: string }>,
  fieldPath: string
): Array<{ fieldPath: string }> {
  return annotations.filter((ann) => ann.fieldPath === fieldPath);
}

