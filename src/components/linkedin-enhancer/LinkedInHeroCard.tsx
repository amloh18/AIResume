'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Users, Sparkles } from 'lucide-react';
import Image from 'next/image';
import CopyableText, { CopyAllButton } from './CopyableText';
import { HeadlineGuard } from './CharacterGuard';
import type { LinkedInHeroSection } from '@/types/linkedin';
import { LINKEDIN_COLORS } from '@/types/linkedin';

interface LinkedInHeroCardProps {
    data: LinkedInHeroSection;
    showEnhanced?: boolean;
    userProfileImage?: string | null;
}

export default function LinkedInHeroCard({ data, showEnhanced = true, userProfileImage }: LinkedInHeroCardProps) {
    const displayHeadline = showEnhanced && data.enhanced.headline
        ? data.enhanced.headline
        : data.current.headline;

    const displayLocation = showEnhanced && data.enhanced.location_suggestion
        ? data.enhanced.location_suggestion
        : data.current.location;

    const hasEnhancements = data.status === 'suggestion_available' && data.enhanced.headline;

    // Use user profile image from settings, fallback to CV photo
    const profilePhoto = userProfileImage || data.current.photoUrl;

    // Compile all hero content for "Copy All"
    const allContent = [
        data.current.name,
        displayHeadline,
        displayLocation,
    ].filter(Boolean).join('\n');

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg overflow-hidden shadow-sm border border-gray-200"
        >
            {/* Banner - Taller for better profile overlap */}
            <motion.div
                className="h-32 relative"
                whileHover={{ scale: 1.01 }}
                transition={{ duration: 0.2 }}
                style={{
                    background: data.current.bannerUrl
                        ? `url(${data.current.bannerUrl}) center/cover`
                        : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                }}
            >
                {/* Copy All Button */}
                <motion.div
                    className="absolute top-2 right-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                >
                    <CopyAllButton content={allContent} label="Copy All" />
                </motion.div>
            </motion.div>

            {/* Profile Section */}
            <div className="px-6 pb-6">
                {/* Avatar - Larger and positioned to overlap banner by half */}
                <div className="-mt-16 mb-4 relative">
                    <motion.div
                        className="w-32 h-32 rounded-full border-4 border-white shadow-lg overflow-hidden"
                        style={{ backgroundColor: LINKEDIN_COLORS.PRIMARY_BLUE }}
                        whileHover={{ scale: 1.05, boxShadow: '0 8px 25px rgba(0,0,0,0.15)' }}
                        transition={{ type: 'spring', stiffness: 300 }}
                    >
                        {profilePhoto ? (
                            <Image
                                src={profilePhoto}
                                alt={data.current.name || 'Profile'}
                                width={128}
                                height={128}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <motion.div
                                className="w-full h-full flex items-center justify-center text-white text-3xl font-bold"
                                animate={{ opacity: [0.8, 1, 0.8] }}
                                transition={{ duration: 2, repeat: Infinity }}
                            >
                                {data.current.name?.charAt(0) || 'U'}
                            </motion.div>
                        )}
                    </motion.div>
                </div>

                {/* Name with hover effect */}
                {data.current.name && (
                    <motion.div whileHover={{ x: 2 }} transition={{ duration: 0.15 }}>
                        <CopyableText
                            text={data.current.name}
                            className="text-xl font-bold text-gray-900 mb-1 p-1 -ml-1"
                        />
                    </motion.div>
                )}

                {/* Headline with Enhancement Indicator */}
                <motion.div
                    className="relative"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                >
                    <CopyableText
                        text={displayHeadline}
                        className="text-sm leading-relaxed p-2 -ml-2 rounded-md text-gray-800"
                    >
                        <span>{displayHeadline}</span>
                        {hasEnhancements && showEnhanced && (
                            <motion.span
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', delay: 0.5 }}
                            >
                                <Sparkles className="inline-block w-3.5 h-3.5 ml-1.5 text-amber-500" />
                            </motion.span>
                        )}
                    </CopyableText>

                    {/* Character Guard */}
                    <div className="mt-2">
                        <HeadlineGuard current={displayHeadline.length} />
                    </div>
                </motion.div>

                {/* Location with animation */}
                <motion.div
                    className="flex items-center gap-4 mt-3 text-sm text-gray-500"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <CopyableText
                        text={displayLocation}
                        className="flex items-center gap-1 p-1 -ml-1"
                        showIcon={false}
                    >
                        <MapPin className="w-3.5 h-3.5" />
                        <span>{displayLocation}</span>
                    </CopyableText>

                    {data.current.connections && (
                        <motion.div
                            className="flex items-center gap-1 text-blue-600"
                            whileHover={{ scale: 1.05 }}
                        >
                            <Users className="w-3.5 h-3.5" />
                            <span>{data.current.connections} connections</span>
                        </motion.div>
                    )}
                </motion.div>

                {/* SEO Keywords - Only show if enhanced */}
                {hasEnhancements && data.enhanced.seo_keywords_used.length > 0 && (
                    <motion.div
                        className="mt-4 p-3 bg-blue-50 rounded-lg"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                    >
                        <p className="text-xs font-medium text-blue-800 mb-2">
                            SEO Keywords Used:
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                            {data.enhanced.seo_keywords_used.map((keyword, idx) => (
                                <motion.span
                                    key={idx}
                                    className="px-2 py-0.5 bg-white text-xs text-blue-700 rounded-full border border-blue-200"
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.5 + idx * 0.05 }}
                                    whileHover={{ scale: 1.1 }}
                                >
                                    {keyword}
                                </motion.span>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* Rationale - Only show if enhanced */}
                {hasEnhancements && data.enhanced.rationale && (
                    <motion.div
                        className="mt-3 p-3 bg-amber-50 rounded-lg"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                    >
                        <p className="text-xs text-amber-800">
                            <span className="font-medium">💡 Strategy: </span>
                            {data.enhanced.rationale}
                        </p>
                    </motion.div>
                )}
            </div>
        </motion.div>
    );
}

