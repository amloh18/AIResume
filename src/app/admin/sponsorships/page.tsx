
import SponsorshipManager from '@/components/admin/SponsorshipManager';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { redirect } from 'next/navigation';

export default async function SponsorshipsPage() {
    const user = await getAuthenticatedUser();
    const role = user?.user?.role;
    const isAdmin = role === 'admin' || role === 'superadmin';

    if (!user) {
        redirect('/admin/login');
    }

    if (!isAdmin) {
        redirect('/dashboard');
    }

    return (
        <div className="container mx-auto py-8">
            <SponsorshipManager />
        </div>
    );
}
