'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { UserProfile } from '@/lib/data';
import ProfileEditor from '@/components/profile/ProfileEditor';
import ContactFormModal from '@/components/ContactFormModal';

interface ProfileClientProps {
  profile: UserProfile;
}

const ProfileClient: React.FC<ProfileClientProps> = ({ profile }) => {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const { data: session, status } = useSession();

  // Check if current user is the profile owner
  const isOwner = session?.user?.email === profile.email;

  const fullName = `${profile.firstName} ${profile.lastName}`;
  const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=84cc16&color=fff&size=128`;

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short' 
    });
  };

  // Get date range for experience
  const getDateRange = (startDate: string, endDate?: string) => {
    const start = formatDate(startDate);
    const end = endDate ? formatDate(endDate) : 'Present';
    return `${start} - ${end}`;
  };

  // Handle profile updates
  const handleProfileUpdate = async (updatedProfile: Partial<UserProfile>) => {
    try {
      const response = await fetch('/api/user/update-profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedProfile),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to update profile');
      }

      // Refresh the page to show updated data
      window.location.reload();
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black">
        {/* Header Section */}
        <div className="relative">
          {/* Banner Image */}
          <div className="h-64 bg-gradient-to-r from-lime-600/20 to-emerald-600/20 relative overflow-hidden">
            {profile.banner && (
              <Image
                src={profile.banner}
                alt={`${fullName}'s banner`}
                fill
                className="object-cover"
                priority
              />
            )}
            <div className="absolute inset-0 bg-black/30" />
          </div>
          
          {/* Profile Info */}
          <div className="relative px-4 tablet:px-6 desktop:px-8 -mt-16">
            <div className="max-w-4xl mx-auto">
              <div className="flex flex-col tablet:flex-row items-start tablet:items-end gap-4 tablet:gap-6">
                {/* Profile Picture */}
                <div className="relative">
                  <div className="w-32 h-32 rounded-full border-4 border-gray-900 overflow-hidden bg-gray-800">
                    <Image
                      src={profile.avatar || fallbackAvatar}
                      alt={fullName}
                      width={128}
                      height={128}
                      className="object-cover w-full h-full"
                      priority
                    />
                  </div>
                </div>
                
                {/* Profile Details */}
                <div className="flex-1 space-y-2">
                  <h1 className="text-3xl tablet:text-4xl font-bold text-white">
                    {fullName}
                  </h1>
                  {profile.jobTitle && (
                    <p className="text-xl text-lime-400 font-medium">
                      {profile.jobTitle}
                    </p>
                  )}
                  {profile.location && (
                    <p className="text-gray-400 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {profile.location}
                    </p>
                  )}
                </div>
                
                {/* Action Buttons */}
                <div className="flex gap-3">
                  {profile.allowMessage && (
                    <button
                      onClick={() => setIsContactModalOpen(true)}
                      className="px-6 py-2 bg-lime-600 hover:bg-lime-700 text-white font-medium rounded-lg transition-colors duration-200 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      Message
                    </button>
                  )}
                  
                  {profile.allowVideoCall && (
                    <button className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors duration-200 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Video Call
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Sections */}
        <div className="px-4 tablet:px-6 desktop:px-8 py-8">
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Profile Editor (only for owner) */}
            <ProfileEditor
              profile={profile}
              onSave={handleProfileUpdate}
              isOwner={isOwner}
            />
            
            {/* About Section */}
            {profile.professionalSummary && (
              <section className="bg-gray-800/20 border border-gray-700 rounded-xl p-6">
                <h2 className="text-2xl font-bold text-white mb-4">About</h2>
                <p className="text-gray-300 leading-relaxed">
                  {profile.professionalSummary}
                </p>
              </section>
            )}

            {/* Experience Section */}
            {profile.experiences.length > 0 && (
              <section className="bg-gray-800/20 border border-gray-700 rounded-xl p-6">
                <h2 className="text-2xl font-bold text-white mb-6">Experience</h2>
                <div className="space-y-6">
                  {profile.experiences.map((experience) => (
                    <div key={experience.id} className="border border-gray-700 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-lg font-semibold text-white">
                          {experience.jobTitle}
                        </h3>
                        <span className="text-sm text-gray-400">
                          {getDateRange(experience.startDate, experience.endDate)}
                        </span>
                      </div>
                      <p className="text-lime-400 font-medium mb-3">
                        {experience.company}
                      </p>
                      <p className="text-gray-300 mb-3">
                        {experience.description}
                      </p>
                      {experience.highlights.length > 0 && (
                        <ul className="list-disc list-inside space-y-1">
                          {experience.highlights.map((highlight, index) => (
                            <li key={index} className="text-gray-400 text-sm">
                              {highlight}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Recent Work Section */}
            {profile.portfolioProjects.length > 0 && (
              <section className="bg-gray-800/20 border border-gray-700 rounded-xl p-6">
                <h2 className="text-2xl font-bold text-white mb-6">Recent Work</h2>
                <div className="grid grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-3 gap-6">
                  {profile.portfolioProjects.map((project) => (
                    <div key={project.id} className="border border-gray-700 rounded-lg overflow-hidden hover:border-lime-500 transition-colors duration-200">
                      {project.imageUrl && (
                        <div className="h-48 relative">
                          <Image
                            src={project.imageUrl}
                            alt={project.title}
                            fill
                            className="object-cover"
                          />
                        </div>
                      )}
                      <div className="p-4">
                        <h3 className="text-lg font-semibold text-white mb-2">
                          {project.title}
                        </h3>
                        <p className="text-gray-300 text-sm mb-3 line-clamp-3">
                          {project.description}
                        </p>
                        {project.technologies.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {project.technologies.map((tech, index) => (
                              <span
                                key={index}
                                className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded-full"
                              >
                                {tech}
                              </span>
                            ))}
                          </div>
                        )}
                        {project.projectUrl && (
                          <a
                            href={project.projectUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-lime-400 hover:text-lime-300 text-sm font-medium transition-colors duration-200"
                          >
                            View Project →
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Skills Section */}
            {profile.skills.length > 0 && (
              <section className="bg-gray-800/20 border border-gray-700 rounded-xl p-6">
                <h2 className="text-2xl font-bold text-white mb-6">Skills</h2>
                <div className="flex flex-wrap gap-3">
                  {profile.skills.map((skill, index) => (
                    <div
                      key={index}
                      className="px-4 py-2 bg-gray-700 text-white rounded-full text-sm font-medium hover:bg-lime-600 transition-colors duration-200"
                    >
                      {skill.name}
                      {skill.level && (
                        <span className="ml-2 text-gray-400">
                          ({skill.level})
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Education Section */}
            {profile.education.length > 0 && (
              <section className="bg-gray-800/20 border border-gray-700 rounded-xl p-6">
                <h2 className="text-2xl font-bold text-white mb-6">Education</h2>
                <div className="space-y-4">
                  {profile.education.map((edu, index) => (
                    <div key={index} className="border border-gray-700 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-lg font-semibold text-white">
                          {edu.degree} in {edu.field}
                        </h3>
                        <span className="text-sm text-gray-400">
                          {getDateRange(edu.startDate, edu.endDate)}
                        </span>
                      </div>
                      <p className="text-lime-400 font-medium">
                        {edu.institution}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Social Links */}
            {profile.socialLinks.length > 0 && (
              <section className="bg-gray-800/20 border border-gray-700 rounded-xl p-6">
                <h2 className="text-2xl font-bold text-white mb-6">Connect</h2>
                <div className="flex flex-wrap gap-4">
                  {profile.socialLinks.map((link, index) => (
                    <a
                      key={index}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-lime-600 text-white rounded-lg transition-colors duration-200"
                    >
                      <span className="capitalize">{link.platform}</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>

      {/* Contact Modal */}
      <ContactFormModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        recipientId={profile.id}
        recipientName={fullName}
      />
    </>
  );
};

export default ProfileClient;
