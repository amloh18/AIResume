import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { getUserProfile, UserProfile } from '@/lib/data';
import ContactFormModal from '@/components/ContactFormModal';
import ProfileClient from './ProfileClient';

// Generate dynamic metadata for SEO
export async function generateMetadata({ 
  params 
}: { 
  params: Promise<{ username: string }> 
}): Promise<Metadata> {
  const { username } = await params;
  const profile = await getUserProfile(username);
  
  if (!profile) {
    return {
      title: 'Profile Not Found',
      description: 'The requested profile could not be found.',
      // A soft 404 must not be indexable.
      robots: { index: false, follow: true },
    };
  }

  const fullName = `${profile.firstName} ${profile.lastName}`;
  const jobTitle = profile.jobTitle || 'Professional';
  const location = profile.location || '';
  const summary = profile.professionalSummary || `View ${fullName}'s professional profile and portfolio.`;

  return {
    title: `${fullName} - ${jobTitle} | AIResume`,
    description: summary,
    // Each profile declares its own canonical. Metadata is inherited down the route tree, so a
    // profile that declares none is at risk of being treated as a duplicate of whatever canonical
    // its parent carries.
    alternates: {
      canonical: `/profile/${username}`,
    },
    openGraph: {
      title: `${fullName} - ${jobTitle}`,
      description: summary,
      type: 'profile',
      // ⚠️ Omit `images` entirely when there is no avatar — do NOT pass an empty array.
      // Next treats the mere presence of the key as an explicit choice and then refuses to fall back
      // to the segment's `opengraph-image.tsx` (see `mergeStaticMetadata` in
      // `next/dist/lib/metadata/resolve-metadata.js`). `images: []` therefore produced no card at
      // all, rather than the default one.
      ...(profile.avatar ? { images: [profile.avatar] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: `${fullName} - ${jobTitle}`,
      description: summary,
      ...(profile.avatar ? { images: [profile.avatar] } : {}),
    },
  };
}

// Generate static params for popular profiles (optional)
export async function generateStaticParams() {
  // This can be populated with popular usernames for pre-generation
  // For now, we'll use fallback: 'blocking' for dynamic generation
  return [];
}

interface ProfilePageProps {
  params: Promise<{ username: string }>;
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { username } = await params;
  const profile = await getUserProfile(username);

  // Handle profile not found
  if (!profile) {
    notFound();
  }

  // Handle private profiles
  if (!profile.isPublicProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-white mb-2">Profile is Private</h1>
          <p className="text-gray-400">
            This profile is not publicly accessible.
          </p>
        </div>
      </div>
    );
  }

  return <ProfileClient profile={profile} />;
}
