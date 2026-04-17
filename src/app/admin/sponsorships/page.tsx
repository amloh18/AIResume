
import SponsorshipManager from '@/components/admin/SponsorshipManager';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { redirect } from 'next/navigation';

export default async function SponsorshipsPage() {
    const user = await getAuthenticatedUser();

    if (!user || user.user.role !== 'admin') {
        redirect('/sign-in');
    }

    return (
        <div className="container mx-auto py-8">
            <SponsorshipManager />
        </div>
    );
}
