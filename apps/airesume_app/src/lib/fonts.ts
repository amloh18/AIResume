import { Geist } from 'next/font/google';

/**
 * Geist font — scoped to dashboard, editor, and auth pages only.
 * Public/marketing pages keep their existing font (Cabinet Grotesk).
 */
export const geistFont = Geist({
  subsets: ['latin'],
  variable: '--font-geist',
  display: 'swap',
});
