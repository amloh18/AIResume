import { redirect } from 'next/navigation';

// The old static placeholder dashboard is superseded by the analytics-driven
// Overview page. Preserve the deep link.
export default function AdminDashboardPage() {
  redirect('/admin/overview');
}
