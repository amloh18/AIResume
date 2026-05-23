import Link from 'next/link';
import { ArrowRight, Calendar, Clock, Tag, BookOpen, ChevronRight } from 'lucide-react';
import { getAllArticles } from '@/data/blogs';
import { MotionDiv, MotionH2 } from '@/components/ui/motion-wrapper';

const categoryColors: Record<string, string> = {
  'CVCircle vs Competitors': 'bg-purple-900/40 text-purple-300 border-purple-700/30',
  'AI & Technology':         'bg-blue-900/40 text-blue-300 border-blue-700/30',
  'ATS Optimization':        'bg-amber-900/40 text-amber-300 border-amber-700/30',
  'Resume Guides':           'bg-green-900/40 text-green-300 border-green-700/30',
  'Resume Mistakes':         'bg-red-900/40 text-red-300 border-red-700/30',
  'Resume Writing':          'bg-cyan-900/40 text-cyan-300 border-cyan-700/30',
};

// Pick the 3 specifically-featured article slugs (first 3 in registry)
const FEATURED_SLUGS = [
  'why-cvcircle-beats-cakecv',
  'ai-resume-builder-2026',
  'ats-score-optimization',
];

export default function BlogSection() {
  const allArticles = getAllArticles();
  // Filter to exactly the 3 featured slugs, preserving order
  const featuredArticles = FEATURED_SLUGS
    .map(slug => allArticles.find(a => a.slug === slug))
    .filter(Boolean);

  // Fallback: if slugs don't match, just take first 3
  const articles = featuredArticles.length >= 3
    ? featuredArticles.slice(0, 3)
    : allArticles.slice(0, 3);

  return (
    <section id="blog" className="relative py-24 px-4 bg-[#0e1310] overflow-hidden">
      {/* Subtle background grid */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 opacity-25" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0)',
          backgroundSize: '44px 44px',
        }} />
        <div className="absolute top-0 left-1/4 w-[500px] h-[300px] bg-[#81ff00]/3 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[300px] bg-green-900/8 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-6xl mx-auto">
        {/* Section Header */}
        <MotionDiv
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#81ff00]/10 border border-[#81ff00]/20 rounded-full text-[#81ff00] text-sm font-semibold mb-5">
            <BookOpen className="w-4 h-4" />
            CVCircle Career Journal
          </div>
          <MotionH2 className="text-3xl md:text-5xl font-bold text-white mb-4 leading-tight">
            Outsmart the ATS. <span className="text-[#81ff00]">Get the Interview.</span>
          </MotionH2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Expert guides on CV building, ATS optimization, and job search strategy — written by the CVCircle research team.
          </p>
        </MotionDiv>

        {/* 3-Column Article Grid */}
        <div className="grid md:grid-cols-3 gap-5 mb-10">
          {articles.map((article, index) => {
            if (!article) return null;
            const categoryColor = categoryColors[article.category] || 'bg-gray-800 text-gray-300 border-gray-700';
            return (
              <MotionDiv
                key={article.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: index * 0.1 }}
              >
                <Link
                  href={`/blog/${article.slug}`}
                  className="group flex flex-col h-full bg-[#141a14] rounded-xl border border-white/5 hover:border-[#81ff00]/25 transition-all duration-400 overflow-hidden hover:shadow-[0_8px_40px_rgba(129,255,0,0.07)]"
                >
                  {/* Image with category badge */}
                  <div className="relative aspect-video overflow-hidden">
                    <img
                      src={article.featuredImage}
                      alt={article.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#141a14]/50 to-transparent" />
                    <div className="absolute top-3 left-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border backdrop-blur-sm ${categoryColor}`}>
                        <Tag className="w-3 h-3" />
                        {article.category}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-5 flex flex-col flex-1">
                    <h3 className="text-base font-bold text-white mb-2 group-hover:text-[#81ff00] transition-colors line-clamp-2 leading-snug">
                      {article.title}
                    </h3>
                    <p className="text-gray-500 text-sm mb-4 line-clamp-2 flex-1 leading-relaxed">{article.excerpt}</p>

                    <div className="flex items-center justify-between pt-4 border-t border-white/5">
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1.5"><Calendar className="w-3 h-3" />{article.date}</span>
                        <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" />{article.readTime}</span>
                      </div>
                      <span className="text-[#81ff00] text-xs font-semibold flex items-center gap-1 group-hover:gap-1.5 transition-all">
                        Read <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </Link>
              </MotionDiv>
            );
          })}
        </div>

        {/* CTA to full blog */}
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="flex justify-center"
        >
          <Link
            href="/blog"
            className="inline-flex items-center gap-2.5 px-7 py-3.5 bg-[#1a1f1a] text-white border border-white/10 rounded-full text-sm font-semibold hover:border-[#81ff00]/40 hover:text-[#81ff00] hover:bg-[#1f2a1f] transition-all duration-300 group"
          >
            <BookOpen className="w-4 h-4 text-[#81ff00]" />
            Explore the Career Journal
            <ChevronRight className="w-4 h-4 text-gray-500 group-hover:translate-x-0.5 group-hover:text-[#81ff00] transition-all" />
          </Link>
        </MotionDiv>
      </div>
    </section>
  );
}
