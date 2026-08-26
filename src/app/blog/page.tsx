import Link from 'next/link';
import { Metadata } from 'next';
import { ArrowRight, Calendar, Clock, Tag, BookOpen, ChevronRight } from 'lucide-react';
import { getAllArticles, getAllCategories } from '@/data/blogs';
import { MotionDiv, MotionH1, MotionP } from '@/components/ui/motion-wrapper';
import CardNav from '@/components/landing/CardNav';
import Footer from '@/components/landing/Footer';
import { navLinks } from '@/data/navigation';

export const metadata: Metadata = {
  title: 'Blog — Career Advice, CV Tips & ATS Optimization | AIResume',
  description: 'Expert career advice, CV writing tips, ATS optimization strategies, and resume guides from AIResume. Learn how to build a resume that gets callbacks in 2026.',
  keywords: ['CV blog', 'resume tips', 'ATS optimization', 'career advice', 'job search 2026', 'AI resume'],
  alternates: { canonical: '/blog' },
};

const categoryColors: Record<string, { badge: string; dot: string }> = {
  'AIResume vs Competitors': { badge: 'bg-purple-900/40 text-purple-300 border-purple-700/30', dot: 'bg-purple-400' },
  'AI & Technology':         { badge: 'bg-blue-900/40 text-blue-300 border-blue-700/30',       dot: 'bg-blue-400'   },
  'ATS Optimization':        { badge: 'bg-amber-900/40 text-amber-300 border-amber-700/30',    dot: 'bg-amber-400'  },
  'Resume Guides':           { badge: 'bg-green-900/40 text-green-300 border-green-700/30',    dot: 'bg-green-400'  },
  'Resume Mistakes':         { badge: 'bg-red-900/40 text-red-300 border-red-700/30',          dot: 'bg-red-400'    },
  'Resume Writing':          { badge: 'bg-cyan-900/40 text-cyan-300 border-cyan-700/30',       dot: 'bg-cyan-400'   },
};

export default async function BlogPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const category = typeof searchParams.category === 'string' ? searchParams.category : undefined;
  const allArticles = getAllArticles();
  const categories = getAllCategories();

  const filteredArticles = category
    ? allArticles.filter(a => a.category === category)
    : allArticles;

  const featured = filteredArticles[0];
  const rest = filteredArticles.slice(1);

  return (
    <div className="min-h-screen bg-[#0d1209]">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-[#013f2e]/4 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-0 w-[400px] h-[400px] bg-green-900/8 rounded-full blur-3xl" />
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.04) 1px, transparent 0)', backgroundSize: '40px 40px' }} />
      </div>

      <div className="relative z-10">
        <CardNav
          logo="AIResume"
          links={navLinks}
        />

        {/* Hero */}
        <section className="relative pt-36 pb-16 px-4">
          <div className="max-w-7xl mx-auto pl-0 text-left flex flex-col items-start">
            <MotionDiv
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-6"
            >
              <BookOpen className="w-3.5 h-3.5" />
              AIResume Career Journal
            </MotionDiv>

            <MotionH1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-[2.5rem] sm:text-[3.25rem] lg:text-[4rem] font-extrabold text-[#F5F7F7] mb-6 leading-[1.05] tracking-tighter max-w-5xl text-left"
            >
              Outsmart the ATS. <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#36D39B] via-[#4DDCB0] to-[#86E8D1]">Get the Interview</span>.
            </MotionH1>

            <MotionP
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="text-base sm:text-lg lg:text-xl text-gray-400 font-normal max-w-2xl leading-relaxed text-left"
            >
              Expert guides on CV building, ATS optimisation, interview prep, and job search strategy — written by the AIResume research team.
            </MotionP>
          </div>
        </section>

        {/* Category Filter */}
        <section className="pb-10 px-4">
          <div className="max-w-6xl mx-auto">
            <MotionDiv
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.25 }}
              className="flex flex-wrap gap-2 justify-center"
            >
              <Link
                href="/blog"
                className={`px-5 py-2 rounded-full text-small font-semibold transition-all duration-200 ${
                  !category
                    ? 'bg-[#013f2e] text-white shadow-lg'
                    : 'bg-[#1a1f1a] text-gray-300 border border-white/5 hover:border-[#013f2e]/30 hover:text-white'
                }`}
              >
                All Posts
              </Link>
              {categories.map((cat) => {
                const isActive = category === cat;
                return (
                  <Link
                    key={cat}
                    href={`/blog?category=${encodeURIComponent(cat)}`}
                    className={`flex items-center gap-2 px-5 py-2 rounded-full text-small font-semibold transition-all duration-200 ${
                      isActive
                        ? 'bg-[#013f2e] text-white shadow-lg'
                        : 'bg-[#1a1f1a] text-gray-300 border border-white/5 hover:border-[#013f2e]/30 hover:text-white'
                    }`}
                  >
                    {cat}
                  </Link>
                );
              })}
            </MotionDiv>
          </div>
        </section>

        {/* Featured Article */}
        {featured && (
          <section className="px-4 pb-14">
            <div className="max-w-6xl mx-auto">
              <MotionDiv
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <Link href={`/blog/${featured.slug}`} className="group relative block rounded-2xl overflow-hidden border border-white/5 hover:border-[#013f2e]/30 transition-all duration-500 bg-[#111611]">
                  <div className="grid md:grid-cols-[1.1fr_1fr]">
                    {/* Image */}
                    <div className="relative aspect-video md:aspect-auto overflow-hidden">
                      <img
                        src={featured.featuredImage}
                        alt={featured.featuredImageAlt}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#111611]/60 hidden md:block" />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#111611]/60 to-transparent md:hidden" />
                    </div>

                    {/* Content */}
                    <div className="p-8 md:p-10 flex flex-col justify-center">
                      <div className="flex items-center gap-2 mb-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-small font-semibold border ${categoryColors[featured.category]?.badge || 'bg-gray-800 text-gray-300 border-gray-700'}`}>
                          <Tag className="w-3 h-3" />
                          {featured.category}
                        </span>
                        <span className="px-3 py-1 bg-[#013f2e]/10 border border-[#013f2e]/20 text-[#013f2e] rounded-full text-small font-semibold">Featured</span>
                      </div>

                      <h2 className="text-h2 md:text-h1 font-bold text-white mb-3 group-hover:text-[#013f2e] transition-colors duration-300 leading-tight">
                        {featured.title}
                      </h2>

                      <p className="text-gray-400 mb-5 line-clamp-3 leading-relaxed text-small">{featured.excerpt}</p>

                      <div className="flex items-center gap-4 text-small text-gray-500 mb-6">
                        <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />{featured.date}</span>
                        <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{featured.readTime}</span>
                      </div>

                      <div className="flex items-center gap-2 text-[#013f2e] text-small font-bold group-hover:gap-3 transition-all">
                        Read Article <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </Link>
              </MotionDiv>
            </div>
          </section>
        )}

        {/* Articles Grid */}
        {rest.length > 0 && (
          <section className="px-4 pb-24">
            <div className="max-w-6xl mx-auto">
              <MotionDiv
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4 }}
                className="flex items-center justify-between mb-8"
              >
                <h2 className="text-h2 font-bold text-white">
                  {category ? `${category}` : 'Latest Articles'}
                </h2>
                <span className="text-gray-500 text-small">{filteredArticles.length} articles</span>
              </MotionDiv>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                {rest.map((article, index) => {
                  const colors = categoryColors[article.category] || { badge: 'bg-gray-800 text-gray-300 border-gray-700', dot: 'bg-gray-400' };
                  return (
                    <MotionDiv
                      key={article.id}
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: Math.min(index * 0.06, 0.4) }}
                    >
                      <Link href={`/blog/${article.slug}`} className="group flex flex-col h-full bg-[#111611] rounded-xl border border-white/5 hover:border-[#013f2e]/20 transition-all duration-300 overflow-hidden hover:shadow-[0_8px_30px_rgba(1, 63, 46,0.06)]">
                        {/* Image */}
                        <div className="relative aspect-video overflow-hidden">
                          <img
                            src={article.featuredImage}
                            alt={article.featuredImageAlt}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-600"
                          />
                          <div className="absolute top-3 left-3">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-small font-semibold border backdrop-blur-sm ${colors.badge}`}>
                              <Tag className="w-3 h-3" />
                              {article.category}
                            </span>
                          </div>
                        </div>

                        {/* Content */}
                        <div className="p-5 flex flex-col flex-1">
                          <h3 className="text-body font-bold text-white mb-2 group-hover:text-[#013f2e] transition-colors line-clamp-2 leading-snug">
                            {article.title}
                          </h3>
                          <p className="text-gray-500 text-small mb-4 line-clamp-2 flex-1 leading-relaxed">{article.excerpt}</p>

                          <div className="flex items-center justify-between pt-4 border-t border-white/5">
                            <div className="flex items-center gap-3 text-small text-gray-500">
                              <span className="flex items-center gap-1.5"><Calendar className="w-3 h-3" />{article.date}</span>
                              <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" />{article.readTime}</span>
                            </div>
                            <ArrowRight className="w-4 h-4 text-[#013f2e] group-hover:translate-x-0.5 transition-transform" />
                          </div>
                        </div>
                      </Link>
                    </MotionDiv>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* CTA Section */}
        <section className="px-4 pb-24">
          <div className="max-w-7xl mx-auto">
            <MotionDiv
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative rounded-3xl overflow-hidden group shadow-2xl shadow-[#013f2e]/5 border border-[#013f2e]/20 bg-black/60 backdrop-blur-md"
            >
              {/* Dynamic Animated Glow Backdrops */}
              <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-[#013f2e]/25 via-emerald-950/20 to-transparent rounded-full blur-3xl opacity-70 group-hover:opacity-90 transition-opacity duration-1000 -mr-20 -mt-20 pointer-events-none animate-pulse" style={{ animationDuration: '6s' }} />
              <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-emerald-950/40 via-lime-950/20 to-transparent rounded-full blur-3xl opacity-50 group-hover:opacity-75 transition-opacity duration-1000 -ml-20 -mb-20 pointer-events-none" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_1000px_at_50%_-100px,#013f2e/15,transparent_75%)] opacity-100 pointer-events-none" />

              {/* Abstract Glowing Tech Circuit / Waves Overlay */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <svg className="absolute w-[150%] h-[150%] -left-[25%] -top-[25%] text-[#013f2e]/10 opacity-30 group-hover:opacity-40 transition-opacity duration-700" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <path d="M0,50 Q25,20 50,50 T100,50" fill="none" stroke="currentColor" strokeWidth="0.5" className="animate-pulse" style={{ animationDuration: '8s' }} />
                  <path d="M0,40 Q25,70 50,40 T100,40" fill="none" stroke="currentColor" strokeWidth="0.25" className="animate-pulse" style={{ animationDuration: '12s' }} />
                </svg>
                {/* Large abstract glowing orb graphic */}
                <div className="absolute w-72 h-72 bg-gradient-to-tr from-[#013f2e]/10 to-emerald-500/10 rounded-full blur-2xl top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 group-hover:scale-125 transition-transform duration-1000 pointer-events-none" />
              </div>

              <div className="relative p-12 md:p-20 text-center z-10 flex flex-col items-center">
                <h2 className="text-3xl md:text-6xl font-black text-white mb-6 tracking-tight leading-none max-w-3xl">
                  Ready to Build Your <span className="text-[#013f2e] bg-clip-text bg-gradient-to-r from-[#013f2e] via-[#03694c] to-emerald-400">Perfect Resume?</span>
                </h2>
                <p className="text-gray-300 mb-10 max-w-3xl text-body md:text-h2 leading-relaxed">
                  AIResume&apos;s resume builder uses the same keyword strategies from our blog articles — automated for you. Free to start.
                </p>
                <div className="flex flex-col sm:flex-row gap-5 justify-center w-full sm:w-auto">
                  <Link href="/sign-up" className="inline-flex items-center justify-center gap-2.5 bg-[#013f2e] hover:bg-[#025c43] text-white px-12 py-5 rounded-full font-bold active:scale-[0.98] transition-colors duration-200 text-body shadow-lg group/btn">
                    Start Building Free 
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
                  </Link>
                  <Link href="/features" className="inline-flex items-center justify-center gap-2 bg-white/5 text-white border border-white/10 px-12 py-4.5 rounded-full font-extrabold hover:bg-white/10 hover:border-white/20 active:scale-[0.98] transition-all text-body">
                    Explore Features
                  </Link>
                </div>
              </div>
            </MotionDiv>
          </div>
        </section>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
}
