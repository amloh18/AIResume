import Link from 'next/link';

export default function ProfileNotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-6">👤</div>
        <h1 className="text-3xl font-bold text-white mb-4">
          Profile Not Found
        </h1>
        <p className="text-gray-400 mb-8 leading-relaxed">
          The profile you're looking for doesn't exist or may have been removed. 
          Please check the URL and try again.
        </p>
        <div className="space-y-4">
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-lime-600 hover:bg-lime-700 text-white font-medium rounded-lg transition-colors duration-200"
          >
            Go Home
          </Link>
          <div className="text-sm text-gray-500">
            <p>Looking for something else?</p>
            <Link href="/dashboard" className="text-lime-400 hover:text-lime-300">
              Visit Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
