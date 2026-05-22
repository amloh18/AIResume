import Link from 'next/link';
import { Metadata } from 'next';
import { ArrowRight, Calendar, Clock, Tag, BookOpen, ChevronRight, Sparkles, CheckCircle, FileText, Briefcase, Chrome, Globe, LayoutDashboard } from 'lucide-react';
import { getAllArticles, getAllCategories } from '@/data/blogs';
import { MotionDiv, MotionH1, MotionP } from '@/components/ui/motion-wrapper';
import CardNav from '@/components/landing/CardNav';

export const metadata: Metadata = {
  title: 'Blog — Career Advice, CV Tips & ATS Optimization | CVCircle',
  description: 'Expert career advice, CV writing tips, ATS optimization strategies, and resume guides from CVCircle. Learn how to build a resume that gets callbacks in 2026.',
  keywords: ['CV blog', 'resume tips', 'ATS optimization', 'career advice', 'job search 2026', 'AI resume'],
  alternates: { canonical: '/blog' },
};

const navLinks = [
  {
    label: 'Products',
    href: '#features',
    ariaLabel: 'View products section',
    submenu: [
      {
        label: 'AI Resume Builder',
        description: 'Create ATS-friendly resumes in minutes with AI assistance and mix-and-match layout blocks.',
        href: '#features',
        ariaLabel: 'AI-powered resume builder',
        icon: <Sparkles className="w-6 h-6 text-lime-400" />,
        snapshot: 'bg-gradient-to-br from-lime-500/20 to-green-600/20 border-lime-500/30',
      },
      {
        label: 'ATS Scanner',
        description: 'Test your resume against job descriptions for keyword matches and format compatibility.',
        href: '#features',
        ariaLabel: 'ATS compatibility check',
        icon: <CheckCircle className="w-6 h-6 text-blue-400" />,
        snapshot: 'bg-gradient-to-br from-blue-500/20 to-cyan-600/20 border-blue-500/30',
      },
      {
        label: 'Cover Letter Generator',
        description: 'Generate tailored, professional cover letters perfectly matching your target role.',
        href: '#features',
        ariaLabel: 'Cover letter generator',
        icon: <FileText className="w-6 h-6 text-purple-400" />,
      },
      {
        label: 'Smart Job Tracker',
        description: 'Organize and track all your applications and upcoming interviews in one place.',
        href: '#features',
        ariaLabel: 'Job tracker',
        icon: <Briefcase className="w-6 h-6 text-orange-400" />,
      },
    ],
  },
  {
    label: 'Extension',
    href: '#chrome-extension',
    ariaLabel: 'View browser extension section',
    submenu: [
      {
        label: 'Chrome Add-on',
        description: 'Analyze jobs, extract requirements, and sync data directly from Google Chrome.',
        href: '#chrome-extension',
        ariaLabel: 'Chrome extension',
        icon: <Chrome className="w-6 h-6 text-yellow-400" />,
      },
      {
        label: 'Edge Add-on',
        description: 'Native support for Microsoft Edge browser with full tracking capabilities.',
        href: '#chrome-extension',
        ariaLabel: 'Edge extension',
        icon: <Globe className="w-6 h-6 text-blue-400" />,
      },
      {
        label: 'One-Click Save',
        description: 'Save job descriptions from LinkedIn, Indeed, and more with a single click.',
        href: '#chrome-extension',
        ariaLabel: 'One-click save',
        icon: <LayoutDashboard className="w-6 h-6 text-emerald-400" />,
      },
    ],
  },
  {
    label: 'Resources',
    href: '#how-it-works',
    ariaLabel: 'View resources',
    submenu: [
      {
        label: 'How it Works',
        description: 'Step-by-step guide to building your master CV and landing your dream job.',
        href: '#how-it-works',
        ariaLabel: 'Learn how to create a resume',
        icon: <LayoutDashboard className="w-5 h-5 text-gray-400" />,
      },
      {
        label: 'Blog',
        description: 'Research-backed career guides, ATS tips, and resume tutorials from CVCircle.',
        href: '/blog',
        ariaLabel: 'Read the CVCircle blog',
        icon: <BookOpen className="w-5 h-5 text-gray-400" />,
      },
      {
        label: 'Interview Prep',
        description: 'Practice answering questions tailored specifically to your target job descriptions.',
        href: '#features',
        ariaLabel: 'Interview preparation',
        icon: <Sparkles className="w-5 h-5 text-gray-400" />,
      },
      {
        label: 'FAQ',
        description: 'Find answers to common questions and get support from our team.',
        href: '#faq',
        ariaLabel: 'View FAQ',
        icon: <Briefcase className="w-5 h-5 text-gray-400" />,
      },
    ],
  },
  {
    label: 'Pricing',
    href: '/sign-up',
    ariaLabel: 'View pricing section',
  },
];

const categoryColors: Record<string, { badge: string; dot: string }> = {
  'CVCircle vs Competitors': { badge: 'bg-purple-900/40 text-purple-300 border-purple-700/30', dot: 'bg-purple-400' },
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
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-[#81ff00]/4 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-0 w-[400px] h-[400px] bg-green-900/8 rounded-full blur-3xl" />
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.04) 1px, transparent 0)', backgroundSize: '40px 40px' }} />
      </div>

      <div className="relative z-10">
        <CardNav
          logo="CVCircle"
          links={navLinks}
        />

        {/* Hero */}
        <section className="relative pt-36 pb-16 px-4">
          <div className="max-w-5xl mx-auto text-center">
            <MotionDiv
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#81ff00]/10 border border-[#81ff00]/20 rounded-full text-[#81ff00] text-sm font-medium mb-6"
            >
              <BookOpen className="w-4 h-4" />
              CVCircle Career Journal
            </MotionDiv>

            <MotionH1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl md:text-6xl font-bold text-white mb-5 leading-tight"
            >
              Research-Backed<br />
              <span className="text-[#81ff00]">Career Advice</span>
            </MotionH1>

            <MotionP
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="text-lg text-gray-400 max-w-2xl mx-auto"
            >
              Expert guides on CV building, ATS optimisation, interview prep, and job search strategy — written by the CVCircle research team.
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
                className={`px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                  !category
                    ? 'bg-[#81ff00] text-black shadow-[0_0_16px_rgba(129,255,0,0.3)]'
                    : 'bg-[#1a1f1a] text-gray-300 border border-white/5 hover:border-[#81ff00]/30 hover:text-white'
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
                    className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                      isActive
                        ? 'bg-[#81ff00] text-black shadow-[0_0_16px_rgba(129,255,0,0.3)]'
                        : 'bg-[#1a1f1a] text-gray-300 border border-white/5 hover:border-[#81ff00]/30 hover:text-white'
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
                <Link href={`/blog/${featured.slug}`} className="group relative block rounded-2xl overflow-hidden border border-white/5 hover:border-[#81ff00]/30 transition-all duration-500 bg-[#111611]">
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
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${categoryColors[featured.category]?.badge || 'bg-gray-800 text-gray-300 border-gray-700'}`}>
                          <Tag className="w-3 h-3" />
                          {featured.category}
                        </span>
                        <span className="px-3 py-1 bg-[#81ff00]/10 border border-[#81ff00]/20 text-[#81ff00] rounded-full text-xs font-semibold">Featured</span>
                      </div>

                      <h2 className="text-2xl md:text-3xl font-bold text-white mb-3 group-hover:text-[#81ff00] transition-colors duration-300 leading-tight">
                        {featured.title}
                      </h2>

                      <p className="text-gray-400 mb-5 line-clamp-3 leading-relaxed text-sm">{featured.excerpt}</p>

                      <div className="flex items-center gap-4 text-xs text-gray-500 mb-6">
                        <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />{featured.date}</span>
                        <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{featured.readTime}</span>
                      </div>

                      <div className="flex items-center gap-2 text-[#81ff00] text-sm font-bold group-hover:gap-3 transition-all">
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
                <h2 className="text-2xl font-bold text-white">
                  {category ? `${category}` : 'Latest Articles'}
                </h2>
                <span className="text-gray-500 text-sm">{filteredArticles.length} articles</span>
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
                      <Link href={`/blog/${article.slug}`} className="group flex flex-col h-full bg-[#111611] rounded-xl border border-white/5 hover:border-[#81ff00]/20 transition-all duration-300 overflow-hidden hover:shadow-[0_8px_30px_rgba(129,255,0,0.06)]">
                        {/* Image */}
                        <div className="relative aspect-video overflow-hidden">
                          <img
                            src={article.featuredImage}
                            alt={article.featuredImageAlt}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-600"
                          />
                          <div className="absolute top-3 left-3">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border backdrop-blur-sm ${colors.badge}`}>
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
                            <ArrowRight className="w-4 h-4 text-[#81ff00] group-hover:translate-x-0.5 transition-transform" />
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
          <div className="max-w-4xl mx-auto">
            <MotionDiv
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="relative rounded-2xl overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#81ff00]/15 via-green-900/10 to-[#0d1209]" />
              <div className="absolute inset-0 border border-[#81ff00]/20 rounded-2xl" />
              <div className="relative p-12 text-center">
                <h2 className="text-3xl font-bold text-white mb-4">
                  Ready to Build Your Perfect Resume?
                </h2>
                <p className="text-gray-400 mb-8 max-w-xl mx-auto leading-relaxed">
                  CVCircle&apos;s AI-powered resume builder uses the same keyword strategies from our blog articles — automated for you. Free to start.
                </p>
                <div className="flex flex-wrap gap-4 justify-center">
                  <Link href="/sign-up" className="inline-flex items-center gap-2 bg-[#81ff00] text-black px-8 py-4 rounded-full font-bold hover:bg-lime-400 transition-colors text-sm shadow-[0_0_24px_rgba(129,255,0,0.3)]">
                    Start Building Free <ArrowRight className="w-5 h-5" />
                  </Link>
                  <Link href="/features" className="inline-flex items-center gap-2 bg-white/8 text-white border border-white/15 px-8 py-4 rounded-full font-bold hover:bg-white/15 transition-colors text-sm">
                    Explore Features
                  </Link>
                </div>
              </div>
            </MotionDiv>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12 px-4 border-t border-white/5">
          <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-4 gap-8 mb-8">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Link href="/" className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-[#81ff00] rounded-lg flex items-center justify-center shadow-[0_0_10px_rgba(129,255,0,0.3)]">
                      <span className="text-black font-bold text-sm">CV</span>
                    </div>
                    <span className="text-white font-bold text-lg">CVCircle</span>
                  </Link>
                </div>
                <p className="text-gray-500 text-sm">AI-powered CV builder by Morigrid Labs. Build ATS-optimised resumes in minutes.</p>
              </div>
              <div>
                <h4 className="text-white font-semibold mb-4">Product</h4>
                <div className="space-y-2">
                  <Link href="/ai-resume-builder" className="block text-gray-500 hover:text-white text-sm transition-colors">AI Resume Builder</Link>
                  <Link href="/ats-resume-checker" className="block text-gray-500 hover:text-white text-sm transition-colors">ATS Resume Checker</Link>
                  <Link href="/templates" className="block text-gray-500 hover:text-white text-sm transition-colors">Templates</Link>
                  <Link href="/pricing" className="block text-gray-500 hover:text-white text-sm transition-colors">Pricing</Link>
                </div>
              </div>
              <div>
                <h4 className="text-white font-semibold mb-4">Resources</h4>
                <div className="space-y-2">
                  <Link href="/blog" className="block text-[#81ff00] text-sm">Blog</Link>
                  <Link href="/features" className="block text-gray-500 hover:text-white text-sm transition-colors">Features</Link>
                  <Link href="/resume/software-engineer" className="block text-gray-500 hover:text-white text-sm transition-colors">SE Resume Guide</Link>
                  <Link href="/resume/data-analyst" className="block text-gray-500 hover:text-white text-sm transition-colors">DA Resume Guide</Link>
                </div>
              </div>
              <div>
                <h4 className="text-white font-semibold mb-4">Company</h4>
                <div className="space-y-2">
                  <Link href="/privacy-policy" className="block text-gray-500 hover:text-white text-sm transition-colors">Privacy Policy</Link>
                  <Link href="/terms" className="block text-gray-500 hover:text-white text-sm transition-colors">Terms of Service</Link>
                  <Link href="/business" className="block text-gray-500 hover:text-white text-sm transition-colors">B2B Enterprise</Link>
                </div>
              </div>
            </div>
            <div className="pt-8 border-t border-white/5 flex items-center justify-between text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Link href="/" className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-[#81ff00] rounded flex items-center justify-center"><span className="text-black font-bold text-[10px]">CV</span></div>
                  <span className="text-gray-500">© 2026 CVCircle by Morigrid Labs</span>
                </Link>
              </div>
              <div className="flex gap-6">
                <Link href="/privacy-policy" className="hover:text-gray-400 transition-colors">Privacy</Link>
                <Link href="/terms" className="hover:text-gray-400 transition-colors">Terms</Link>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
