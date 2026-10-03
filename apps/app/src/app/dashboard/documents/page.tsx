import { redirect } from 'next/navigation';

// The Documents workspace moved into the Jobs Hub as a tab (next to
// Applications). Keep the old deep link working via a redirect.
export default function DocumentsPage() {
  redirect('/dashboard/jobs?tab=documents');
}