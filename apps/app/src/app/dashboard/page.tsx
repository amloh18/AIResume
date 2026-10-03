import { redirect } from 'next/navigation';

interface DashboardPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function DashboardPage(props: DashboardPageProps) {
  const resolvedParams = props.searchParams ? await props.searchParams : undefined;
  const params = new URLSearchParams();
  if (resolvedParams) {
    for (const [key, val] of Object.entries(resolvedParams)) {
      if (Array.isArray(val)) {
        val.forEach((v) => params.append(key, v));
      } else if (typeof val === 'string') {
        params.set(key, val);
      }
    }
  }
  const qs = params.toString();
  redirect(qs ? `/dashboard/jobs?${qs}` : '/dashboard/jobs');
}
