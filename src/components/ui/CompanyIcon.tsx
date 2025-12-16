'use client';

import React, { useState } from 'react';
import { Building } from 'lucide-react';
import Image from 'next/image';

interface CompanyIconProps {
    company: string;
    domain?: string;
    jobUrl?: string;
    className?: string;
    size?: number;
}

/**
 * CompanyIcon component displays a company logo from Clearbit API
 * with fallback to Building icon if logo is unavailable
 */
const CompanyIcon: React.FC<CompanyIconProps> = ({
    company,
    domain,
    jobUrl,
    className = 'w-10 h-10',
    size = 40
}) => {
    const [imageError, setImageError] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Extract domain from jobUrl or use provided domain
    const getDomain = (): string | null => {
        // If domain is provided, use it
        if (domain) return domain.toLowerCase().trim();

        // Try to extract from jobUrl
        if (jobUrl) {
            try {
                const url = new URL(jobUrl);
                return url.hostname.replace('www.', '');
            } catch {
                // Invalid URL, continue to company name mapping
            }
        }

        // Map common company names to domains
        const companyLower = company.toLowerCase().trim();
        const commonDomains: Record<string, string> = {
            'google': 'google.com',
            'microsoft': 'microsoft.com',
            'apple': 'apple.com',
            'amazon': 'amazon.com',
            'meta': 'meta.com',
            'facebook': 'meta.com',
            'netflix': 'netflix.com',
            'tesla': 'tesla.com',
            'spotify': 'spotify.com',
            'uber': 'uber.com',
            'airbnb': 'airbnb.com',
            'linkedin': 'linkedin.com',
            'twitter': 'twitter.com',
            'x': 'twitter.com',
            'salesforce': 'salesforce.com',
            'oracle': 'oracle.com',
            'ibm': 'ibm.com',
            'intel': 'intel.com',
            'nvidia': 'nvidia.com',
            'adobe': 'adobe.com',
            'cisco': 'cisco.com',
            'shopify': 'shopify.com',
            'stripe': 'stripe.com',
            'square': 'squareup.com',
            'paypal': 'paypal.com',
            'zoom': 'zoom.us',
            'slack': 'slack.com',
            'atlassian': 'atlassian.com',
            'dropbox': 'dropbox.com',
            'github': 'github.com',
            'gitlab': 'gitlab.com',
            'reddit': 'reddit.com',
            'pinterest': 'pinterest.com',
            'snapchat': 'snap.com',
            'tiktok': 'tiktok.com',
            'bytedance': 'bytedance.com',
            'twitch': 'twitch.tv',
            'discord': 'discord.com',
            'roblox': 'roblox.com',
            'epic games': 'epicgames.com',
            'riot games': 'riotgames.com',
            'ea': 'ea.com',
            'activision': 'activision.com',
            'blizzard': 'blizzard.com',
            'ubisoft': 'ubisoft.com',
            'valve': 'valvesoftware.com',
            'sony': 'sony.com',
            'samsung': 'samsung.com',
            'lg': 'lg.com',
            'hp': 'hp.com',
            'dell': 'dell.com',
            'lenovo': 'lenovo.com',
            'asus': 'asus.com',
            'acer': 'acer.com',
            'walmart': 'walmart.com',
            'target': 'target.com',
            'costco': 'costco.com',
            'home depot': 'homedepot.com',
            'lowes': 'lowes.com',
            "mcdonald's": 'mcdonalds.com',
            'starbucks': 'starbucks.com',
            'coca-cola': 'coca-cola.com',
            'pepsi': 'pepsi.com',
            'nike': 'nike.com',
            'adidas': 'adidas.com',
            'puma': 'puma.com',
            'under armour': 'underarmour.com',
            'lululemon': 'lululemon.com',
            'gap': 'gap.com',
            'h&m': 'hm.com',
            'zara': 'zara.com',
            'uniqlo': 'uniqlo.com',
            'jpmorgan': 'jpmorganchase.com',
            'goldman sachs': 'goldmansachs.com',
            'morgan stanley': 'morganstanley.com',
            'bank of america': 'bankofamerica.com',
            'wells fargo': 'wellsfargo.com',
            'citi': 'citigroup.com',
            'hsbc': 'hsbc.com',
            'barclays': 'barclays.com',
            'deloitte': 'deloitte.com',
            'pwc': 'pwc.com',
            'ey': 'ey.com',
            'kpmg': 'kpmg.com',
            'accenture': 'accenture.com',
            'mckinsey': 'mckinsey.com',
            'bcg': 'bcg.com',
            'bain': 'bain.com',
            'boeing': 'boeing.com',
            'airbus': 'airbus.com',
            'spacex': 'spacex.com',
            'blue origin': 'blueorigin.com',
            'lockheed martin': 'lockheedmartin.com',
            'raytheon': 'rtx.com',
            'general electric': 'ge.com',
            'siemens': 'siemens.com',
            'philips': 'philips.com',
            '3m': '3m.com',
            'caterpillar': 'cat.com',
            'john deere': 'deere.com',
            'ford': 'ford.com',
            'gm': 'gm.com',
            'toyota': 'toyota.com',
            'honda': 'honda.com',
            'bmw': 'bmw.com',
            'mercedes': 'mercedes-benz.com',
            'volkswagen': 'volkswagen.com',
            'audi': 'audi.com',
            'porsche': 'porsche.com',
            'ferrari': 'ferrari.com',
            'lamborghini': 'lamborghini.com'
        };

        // Check if company name matches any common domain
        for (const [name, domain] of Object.entries(commonDomains)) {
            if (companyLower.includes(name)) {
                return domain;
            }
        }

        // Default: try to convert company name to domain
        // Remove common suffixes and format as domain
        const cleanCompany = companyLower
            .replace(/\s+(inc|llc|ltd|corp|corporation|company|co\.|gmbh|sa|ag|plc)\.?$/i, '')
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '')
            .trim();

        if (cleanCompany) {
            return `${cleanCompany}.com`;
        }

        return null;
    };

    const logoDomain = getDomain();
    const logoUrl = logoDomain ? `https://logo.clearbit.com/${logoDomain}` : null;

    // If no domain can be determined or image failed to load, show fallback
    if (!logoUrl || imageError) {
        return (
            <div
                className={`${className} rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center border border-gray-200 dark:border-gray-600`}
                title={company}
            >
                <Building className="w-1/2 h-1/2 text-gray-500 dark:text-gray-400" />
            </div>
        );
    }

    return (
        <div className={`${className} relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600`} title={company}>
            {isLoading && (
                <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center animate-pulse">
                    <Building className="w-1/2 h-1/2 text-gray-400 dark:text-gray-500" />
                </div>
            )}
            <Image
                src={logoUrl}
                alt={`${company} logo`}
                width={size}
                height={size}
                className="w-full h-full object-contain bg-white dark:bg-gray-800 p-1"
                onError={() => {
                    setImageError(true);
                    setIsLoading(false);
                }}
                onLoad={() => setIsLoading(false)}
                unoptimized // Clearbit images are already optimized
            />
        </div>
    );
};

export default CompanyIcon;
