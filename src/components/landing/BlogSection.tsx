import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight, Calendar, Clock, Tag, BookOpen, ChevronRight, ChevronLeft } from 'lucide-react';
import { getAllArticles } from '@/data/blogs';
import { MotionDiv, MotionH2 } from '@/components/ui/motion-wrapper';

const categoryColors: Record<string, string> = {
  'AI Resume vs Competitors': 'bg-purple-900/40 text-purple-300 border-purple-700/30',
  'AI & Technology':         'bg-blue-900/40 text-blue-300 border-blue-700/30',
  'ATS Optimization':        'bg-amber-900/40 text-amber-300 border-amber-700/30',
  'Resume Guides':           'bg-green-900/40 text-green-300 border-green-700/30',
  'Resume Mistakes':         'bg-red-900/40 text-red-300 border-red-700/30',
  'Resume Writing':          'bg-cyan-900/40 text-cyan-300 border-cyan-700/30',
  'Job Application Strategy':'bg-orange-900/40 text-orange-300 border-orange-700/30',
  'Application Documents':   'bg-pink-900/40 text-pink-300 border-pink-700/30',
};

export default function BlogSection() {
  const allArticles = getAllArticles();
  const latest = allArticles.slice(1, 4);
  const [trendingIndex, setTrendingIndex] = useState(0);
  const trendingArticles = allArticles.slice(0, 3);

  const nextTrending = () => {
    setTrendingIndex((prev) => (prev + 1) % trendingArticles.length);
  };

  const prevTrending = () => {
    setTrendingIndex((prev) => (prev - 1 + trendingArticles.length) % trendingArticles.length);
  };

  const currentTrending = trendingArticles[trendingIndex];

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
          className="text-left mb-14"
        >
          <MotionDiv
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mb-6 flex justify-start"
          >
            <svg width="48" height="24" viewBox="0 0 48 24" fill="none" className="text-[#81ff00]">
              <path
                d="M2 12C6 6 10 18 14 12C18 6 22 18 26 12C30 6 34 18 38 12C42 6 46 12 46 12"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
          </MotionDiv>
          <MotionH2 className="!text-[2rem] tablet:!text-[2.5rem] desktop:!text-[3rem] font-extrabold text-white mb-4 tracking-tighter !leading-[1.05]">
            Outsmart the ATS. <span className="text-[#81ff00]">Get the Interview.</span>
          </MotionH2>
          <p className="text-h3 text-gray-400 max-w-2xl leading-relaxed text-left">
            Expert guides on CV building, ATS optimization, and job search strategy — written by the AI Resume research team.
          </p>
        </MotionDiv>

        {/* What's Trending */}
        <div className="mb-16">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white tracking-tight">What's trending</h3>
            <div className="flex items-center gap-3">
              <button
                onClick={prevTrending}
                className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-white hover:border-[#81ff00]/40 hover:text-[#81ff00] transition-colors"
                aria-label="Previous trending article"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={nextTrending}
                className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-white hover:border-[#81ff00]/40 hover:text-[#81ff00] transition-colors"
                aria-label="Next trending article"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <Link href={`/blog/${currentTrending.slug}`} className="block">
              <div className="group bg-[#141a14] rounded-2xl border border-white/5 hover:border-[#81ff00]/25 transition-all duration-400 overflow-hidden">
                <div className="grid md:grid-cols-2 gap-0">
                  {/* Image */}
                  <div className="relative aspect-[16/10] md:aspect-auto md:min-h-[380px] overflow-hidden">
                    <img
                      src={currentTrending.featuredImage}
                      alt={currentTrending.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#141a14]/60 to-transparent md:bg-gradient-to-r" />
                  </div>

                  {/* Content */}
                  <div className="p-6 md:p-10 flex flex-col justify-center">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-[#81ff00] text-small font-semibold">{currentTrending.category}</span>
                      <span className="text-gray-600">•</span>
                      <span className="text-gray-400 text-small">{currentTrending.readTime}</span>
                      <span className="text-gray-600">•</span>
                      <span className="text-gray-400 text-small">{currentTrending.date}</span>
                    </div>
                    <h3 className="text-2xl md:text-3xl font-bold text-white mb-4 group-hover:text-[#81ff00] transition-colors leading-snug">
                      {currentTrending.title}
                    </h3>
                    <p className="text-gray-400 text-small md:text-body mb-6 leading-relaxed line-clamp-3">
                      {currentTrending.excerpt}
                    </p>
                    <span className="text-[#81ff00] text-small font-semibold inline-flex items-center gap-1.5 group-hover:gap-2.5 transition-all">
                      Read More <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          </MotionDiv>

          {/* Pagination dots */}
          <div className="flex items-center justify-center gap-2 mt-6">
            {trendingArticles.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setTrendingIndex(idx)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  idx === trendingIndex
                    ? 'w-6 bg-[#81ff00]'
                    : 'w-2 bg-white/20 hover:bg-white/40'
                }`}
                aria-label={`Go to trending article ${idx + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Latest Posts */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white tracking-tight">Latest posts</h3>
            <Link href="/blog" className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1a1f1a] text-white border border-white/10 rounded-full text-small font-semibold hover:border-[#81ff00]/40 hover:text-[#81ff00] hover:bg-[#1f2a1f] transition-all duration-300 group">
              View All Articles
              <ArrowRight className="w-3.5 h-3.5 text-gray-500 group-hover:translate-x-0.5 group-hover:text-[#81ff00] transition-all" />
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {latest.map((article, index) => {
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
                  <Link href={`/blog/${article.slug}`} className="block">
                    <div className="group flex flex-col h-full bg-[#141a14] rounded-xl border border-white/5 hover:border-[#81ff00]/25 transition-all duration-400 overflow-hidden hover:shadow-[0_8px_40px_rgba(129,255,0,0.07)]">
                      {/* Image with category badge */}
                      <div className="relative aspect-video overflow-hidden">
                        <img
                          src={article.featuredImage}
                          alt={article.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#141a14]/50 to-transparent" />
                        <div className="absolute top-3 left-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-small font-semibold border backdrop-blur-sm ${categoryColor}`}>
                            <Tag className="w-3 h-3" />
                            {article.category}
                          </span>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-5 flex flex-col flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <span className="text-orange-400 text-small">{article.readTime}</span>
                          <span className="text-gray-600">•</span>
                          <span className="text-orange-400 text-small">{article.date}</span>
                        </div>
                        <h3 className="text-body font-bold text-white mb-2 group-hover:text-[#81ff00] transition-colors line-clamp-2 leading-snug">
                          {article.title}
                        </h3>
                        <p className="text-gray-500 text-small mb-4 line-clamp-2 flex-1 leading-relaxed">{article.excerpt}</p>
                        <span className="text-[#81ff00] text-small font-semibold inline-flex items-center gap-1 group-hover:gap-1.5 transition-all mt-auto">
                          Read More <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  </Link>
                </MotionDiv>
              );
            })}
          </div>
        </div>


      </div>
    </section>
  );
}
