import { redirect } from 'next/navigation';

// The old static placeholder dashboard is replaced by the analytics Overview
// page. Keep the /admin root pointing there.
export default function AdminIndexPage() {
  redirect('/admin/overview');
}
