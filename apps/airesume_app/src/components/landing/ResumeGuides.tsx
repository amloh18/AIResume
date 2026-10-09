'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

/**
 * Homepage hub for the `/resume/<role>` guides.
 *
 * Every one of these pages was previously reachable only from the sitemap — no page on the site
 * linked to them, which is the classic orphan-page condition: a URL Google discovers but never
 * re-crawls because nothing passes it link equity. Placing them on the homepage (the highest-authority
 * page on the site) also gives them a chance at the long-tail queries they were written for
 * ("data analyst resume", "devops engineer resume").
 */
const ROLE_GUIDES = [
  { slug: 'data-analyst', name: 'Data Analyst' },
  { slug: 'software-engineer', name: 'Software Engineer' },
  { slug: 'frontend-developer', name: 'Frontend Developer' },
  { slug: 'backend-developer', name: 'Backend Developer' },
  { slug: 'fullstack-developer', name: 'Full-Stack Developer' },
  { slug: 'product-manager', name: 'Product Manager' },
  { slug: 'business-analyst', name: 'Business Analyst' },
  { slug: 'data-scientist', name: 'Data Scientist' },
  { slug: 'ui-ux-designer', name: 'UI/UX Designer' },
  { slug: 'devops-engineer', name: 'DevOps Engineer' },
];

const EXAMPLES = [
  { slug: 'software-engineer-example', name: 'Software Engineer Example' },
  { slug: 'data-analyst-example', name: 'Data Analyst Example' },
  { slug: 'frontend-developer-example', name: 'Frontend Developer Example' },
];

export default function ResumeGuides() {
  return (
    <section id="guides" className="relative py-24 px-4 bg-[#0e1310]">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-[#36D39B] text-sm font-semibold uppercase tracking-wider mb-3">
            Resume Guides
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Resume Examples &amp; Writing Guides by Role
          </h2>
          <p className="text-white/60 max-w-2xl mx-auto">
            Role-specific advice on what hiring managers look for, the keywords ATS software matches
            on, and the mistakes that get a resume filtered out.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {ROLE_GUIDES.map((guide, index) => (
            <motion.div
              key={guide.slug}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index * 0.04, 0.3), duration: 0.35 }}
              viewport={{ once: true }}
            >
              <Link
                href={`/resume/${guide.slug}`}
                className="block h-full bg-[#131a15] border border-white/[0.06] rounded-xl px-4 py-5 text-center hover:border-[#36D39B]/40 hover:bg-[#16211a] transition-colors duration-300"
              >
                <span className="text-white text-sm font-medium">{guide.name}</span>
                <span className="block text-white/40 text-xs mt-1">Resume guide</span>
              </Link>
            </motion.div>
          ))}
        </div>

        <div className="mt-10 pt-8 border-t border-white/[0.06]">
          <p className="text-white/50 text-sm font-medium mb-4 text-center">
            Annotated, ready-to-adapt resume examples
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {EXAMPLES.map((example) => (
              <Link
                key={example.slug}
                href={`/resume/${example.slug}`}
                className="px-4 py-2 bg-[#131a15] border border-white/[0.06] rounded-full text-sm text-white/70 hover:text-white hover:border-[#36D39B]/40 transition-colors"
              >
                {example.name}
              </Link>
            ))}
            <Link
              href="/templates"
              className="px-4 py-2 bg-[#131a15] border border-white/[0.06] rounded-full text-sm text-white/70 hover:text-white hover:border-[#36D39B]/40 transition-colors"
            >
              Resume Templates
            </Link>
            <Link
              href="/ats-resume-checker"
              className="px-4 py-2 bg-[#131a15] border border-white/[0.06] rounded-full text-sm text-white/70 hover:text-white hover:border-[#36D39B]/40 transition-colors"
            >
              ATS Resume Checker
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
