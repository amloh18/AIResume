'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Share2, Link as LinkIcon, Check } from 'lucide-react';

interface Section {
  id: string;
  title: string;
}

interface TableOfContentsClientProps {
  sections: Section[];
  slug: string;
}

export default function TableOfContentsClient({ sections, slug }: TableOfContentsClientProps) {
  const [activeId, setActiveId] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        // Find the first entry that is intersecting
        const visibleEntry = entries.find((entry) => entry.isIntersecting);
        if (visibleEntry) {
          setActiveId(visibleEntry.target.id);
        }
      },
      {
        rootMargin: '-100px 0px -60% 0px', // Trigger when header is in top portion of viewport
        threshold: 0.1,
      }
    );

    sections.forEach((section) => {
      const el = document.getElementById(section.id);
      if (el) observer.observe(el);
    });

    return () => {
      sections.forEach((section) => {
        const el = document.getElementById(section.id);
        if (el) observer.unobserve(el);
      });
    };
  }, [sections]);

  const handleShare = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    if (navigator.share) {
      try {
        await navigator.share({
          title: document.title,
          url: url,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy link:', err);
      }
    }
  };

  return (
    <nav className="hidden xl:block sticky top-24 self-start bg-[#1a1f1a]/40 backdrop-blur-md p-6 rounded-xl border border-white/5 shadow-2xl">
      <h4 className="text-white font-semibold text-small uppercase tracking-wider mb-4 border-b border-white/5 pb-2">
        On this page
      </h4>
      <ul className="space-y-3 border-l border-white/5">
        {sections.map((section) => {
          const isActive = activeId === section.id;
          return (
            <li key={section.id}>
              <Link
                href={`#${section.id}`}
                className={`block pl-4 text-small transition-all duration-200 border-l-2 -ml-px py-0.5 ${
                  isActive
                    ? 'text-[#013f2e] border-[#013f2e] font-medium'
                    : 'text-gray-400 border-transparent hover:text-[#013f2e]/80 hover:border-[#013f2e]/30'
                }`}
              >
                {section.title}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="mt-6 pt-6 border-t border-white/5">
        <h4 className="text-white font-semibold text-small uppercase tracking-wider mb-3">
          Share this Article
        </h4>
        <button
          onClick={handleShare}
          className={`flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-[#1a1f1a] text-small font-semibold rounded-lg border border-white/5 transition-all duration-300 ${
            copied
              ? 'text-[#013f2e] border-[#013f2e]/40 bg-[#013f2e]/10'
              : 'text-gray-300 hover:text-white hover:bg-[#2a2f2a] hover:border-[#013f2e]/20'
          }`}
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5" /> Link Copied
            </>
          ) : (
            <>
              <Share2 className="w-3.5 h-3.5" /> Share Article
            </>
          )}
        </button>
      </div>
    </nav>
  );
}
