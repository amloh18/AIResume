'use client';

import React, { useRef } from 'react';
import { motion, useInView, useSpring, useTransform, useMotionValue } from 'framer-motion';
import Image from 'next/image';
import { useEffect } from 'react';

/**
 * Animated Counter Component
 */
const AnimatedCounter = ({
    value,
    suffix = '',
    color = 'text-white',
    duration = 2
}: {
    value: number;
    suffix?: string;
    color?: string;
    duration?: number;
}) => {
    const ref = useRef<HTMLSpanElement>(null);
    const motionValue = useMotionValue(0);
    const springValue = useSpring(motionValue, {
        damping: 50,
        stiffness: 100,
        duration: duration * 1000
    });
    const isInView = useInView(ref, { once: true, margin: "-20px" });

    useEffect(() => {
        if (isInView) {
            motionValue.set(value);
        }
    }, [isInView, value, motionValue]);

    useEffect(() => {
        springValue.on("change", (latest) => {
            if (ref.current) {
                // Format logic: if > 1000, e.g. 1.2K
                // For this specific requirement, strictly following specific formats based on inputs
                let displayValue = "";

                if (value === 1200) { // For 1.2K case
                    // Calculate progress to tween between 0 and 1.2
                    const kValue = (latest / 1000).toFixed(1);
                    displayValue = `${kValue}K`;
                } else {
                    displayValue = Math.floor(latest).toString();
                }

                ref.current.textContent = displayValue + suffix;
            }
        });
    }, [springValue, suffix, value]);

    return <span ref={ref} className={`font-bold ${color}`} />;
};

const AnalyticsOverlay = () => {
    return (
        <section className="relative z-50 pointer-events-none">
            <div className="max-w-7xl mx-auto px-4 tablet:px-6 desktop:px-8">
                <motion.div
                    className="relative -mt-20 tablet:-mt-32 desktop:-mt-40 mb-[-100px] z-50 flex justify-center"
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    viewport={{ once: true, margin: "0px" }}
                >
                    {/* Main Image Container */}
                    <div className="relative w-full max-w-4xl">
                        {/* The Illustration */}
                        <div className="relative w-full aspect-[16/9] drop-shadow-2xl">
                            <Image
                                src="/images/illus-analytics-metrics.png"
                                alt="Analytics Metrics"
                                fill
                                className="object-contain"
                                priority
                            />
                        </div>

                        {/* Overlay: Users Counter (1.2K) */}
                        {/* Positioning estimated based on likely location in the illustration */}
                        <motion.div
                            className="absolute top-[20%] left-[25%] bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-4 py-2 shadow-xl"
                            initial={{ opacity: 0, scale: 0.8 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.4 }}
                            viewport={{ once: true }}
                        >
                            <div className="text-xs text-gray-300 uppercase tracking-wider mb-1">Total Users</div>
                            <div className="text-2xl font-bold text-red-500 flex items-center gap-1">
                                <AnimatedCounter value={1200} suffix="" color="text-red-500" />
                            </div>
                        </motion.div>

                        {/* Overlay: Engagement (85%) */}
                        <motion.div
                            className="absolute top-[35%] right-[20%] bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-4 py-2 shadow-xl"
                            initial={{ opacity: 0, scale: 0.8 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.6 }}
                            viewport={{ once: true }}
                        >
                            <div className="text-xs text-gray-300 uppercase tracking-wider mb-1">Engagement</div>
                            <div className="text-2xl font-bold text-emerald-400 flex items-center gap-1">
                                <AnimatedCounter value={85} suffix="%" color="text-emerald-400" />
                            </div>
                        </motion.div>

                    </div>
                </motion.div>
            </div>
        </section>
    );
};

export default AnalyticsOverlay;
