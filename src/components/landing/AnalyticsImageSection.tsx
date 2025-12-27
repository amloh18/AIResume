'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';

const AnalyticsImageSection = () => {
    return (
        <section className="py-20 bg-black overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 tablet:px-6 desktop:px-8">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.7 }}
                    className="relative w-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-lime-500/10"
                >
                    <div className="relative aspect-[16/9] w-full bg-gray-900/50">
                        <Image
                            src="/images/illus-analytics-metrics.png"
                            alt="Analytics and Metrics Dashboard"
                            fill
                            className="object-contain"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 1200px"
                            priority={true}
                            unoptimized
                        />
                    </div>

                    {/* Gradient Overlay for better integration */}
                    <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/20 to-transparent"></div>
                </motion.div>
            </div>
        </section>
    );
};

export default AnalyticsImageSection;
