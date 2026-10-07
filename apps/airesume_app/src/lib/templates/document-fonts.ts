/**
 * Document typography system for CV Builder and Cover Letter.
 * Includes top modern sans-serif and classical serif fonts.
 */

export interface DocumentFontOption {
  id: string;
  name: string;
  category: 'sans-serif' | 'serif';
  description: string;
  fontFamily: string;
}

export const TOP_SANS_SERIF_FONTS: DocumentFontOption[] = [
  {
    id: 'Calibri',
    name: 'Calibri',
    category: 'sans-serif',
    description: 'The corporate standard; clean, rounded, and universally available on all computers.',
    fontFamily: "Calibri, 'Segoe UI', Candara, Arial, sans-serif",
  },
  {
    id: 'Arial',
    name: 'Arial',
    category: 'sans-serif',
    description: 'A safe, neutral, and highly readable fallback choice.',
    fontFamily: "Arial, 'Helvetica Neue', Helvetica, sans-serif",
  },
  {
    id: 'Lato',
    name: 'Lato',
    category: 'sans-serif',
    description: 'A friendly, modern sans-serif that looks great in digital and printed formats.',
    fontFamily: "'Lato', 'Helvetica Neue', Arial, sans-serif",
  },
  {
    id: 'Montserrat',
    name: 'Montserrat',
    category: 'sans-serif',
    description: 'Clean and geometric, ideal for modern or creative industries.',
    fontFamily: "'Montserrat', 'Helvetica Neue', Arial, sans-serif",
  },
];

export const TOP_SERIF_FONTS: DocumentFontOption[] = [
  {
    id: 'Garamond',
    name: 'Garamond',
    category: 'serif',
    description: 'A timeless, elegant choice that saves space while maintaining high readability.',
    fontFamily: "'Garamond', 'EB Garamond', 'Baskerville', 'Times New Roman', serif",
  },
  {
    id: 'Cambria',
    name: 'Cambria',
    category: 'serif',
    description: 'Crisp and clear, designed specifically for easy on-screen reading.',
    fontFamily: "Cambria, 'Georgia', 'Times New Roman', serif",
  },
  {
    id: 'Georgia',
    name: 'Georgia',
    category: 'serif',
    description: 'A traditional serif font that projects authority and polish.',
    fontFamily: "Georgia, 'Cambria', 'Times New Roman', serif",
  },
];

export const OTHER_DOCUMENT_FONTS: DocumentFontOption[] = [
  {
    id: 'Inter',
    name: 'Inter',
    category: 'sans-serif',
    description: 'Modern, highly legible digital typeface.',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  },
  {
    id: 'Merriweather',
    name: 'Merriweather',
    category: 'serif',
    description: 'Pleasant to read on screens and high-density displays.',
    fontFamily: "'Merriweather', Georgia, serif",
  },
  {
    id: 'Roboto Mono',
    name: 'Roboto Mono',
    category: 'sans-serif',
    description: 'Monospaced font tailored for technical and development profiles.',
    fontFamily: "'Roboto Mono', monospace",
  },
  {
    id: 'Playfair Display',
    name: 'Playfair Display',
    category: 'serif',
    description: 'Classic display typography with high editorial contrast.',
    fontFamily: "'Playfair Display', Georgia, serif",
  },
];

export const ALL_DOCUMENT_FONTS: DocumentFontOption[] = [
  ...TOP_SANS_SERIF_FONTS,
  ...TOP_SERIF_FONTS,
  ...OTHER_DOCUMENT_FONTS,
];

export const DOCUMENT_GOOGLE_FONTS_URL =
  'https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Inter:wght@300;400;600;700;800&family=Lato:ital,wght@0,300;0,400;0,700;1,400;1,700&family=Merriweather:ital,wght@0,300;0,400;0,700;1,300;1,400&family=Montserrat:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Roboto+Mono:wght@300;400;500;700&display=swap';

export function getDocumentFontStack(fontId?: string | null): string {
  if (!fontId) return "Calibri, 'Segoe UI', Candara, Arial, sans-serif";

  // Normalise legacy generic aliases
  if (fontId === 'font-sans' || fontId === 'sans') {
    return "Calibri, 'Segoe UI', Candara, Arial, sans-serif";
  }
  if (fontId === 'font-serif' || fontId === 'serif') {
    return "'Garamond', 'EB Garamond', 'Baskerville', 'Times New Roman', serif";
  }
  if (fontId === 'font-mono' || fontId === 'mono') {
    return "'Roboto Mono', monospace";
  }

  const match = ALL_DOCUMENT_FONTS.find(
    (f) => f.id.toLowerCase() === fontId.toLowerCase() || f.name.toLowerCase() === fontId.toLowerCase()
  );
  if (match) return match.fontFamily;

  return fontId.includes(',') ? fontId : `'${fontId}', sans-serif`;
}
