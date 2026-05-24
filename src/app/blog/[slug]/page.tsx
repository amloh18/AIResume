import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, Calendar, Clock, Tag, BookOpen, Sparkles, CheckCircle, FileText, Briefcase, Chrome, Globe, LayoutDashboard } from 'lucide-react';
import { getArticleBySlug, getAllArticles } from '@/data/blogs';
import type { BlogArticleMeta } from '@/data/blogs';
import TableOfContentsClient from '@/components/blog/TableOfContentsClient';
import { MotionDiv, MotionH1 } from '@/components/ui/motion-wrapper';
import CardNav from '@/components/landing/CardNav';
import { Metadata } from 'next';

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  const article = getArticleBySlug(params.slug);
  if (!article) return { title: 'Article Not Found | CVCircle' };

  return {
    title: `${article.title} | Career Tips & ATS Strategy | CVCircle`,
    description: article.excerpt || article.subtitle,
    alternates: { canonical: `/blog/${params.slug}` },
    openGraph: {
      title: article.title,
      description: article.excerpt || article.subtitle,
      images: [article.featuredImage],
    },
  };
}

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

const categoryColors: Record<string, string> = {
  'CVCircle vs Competitors': 'bg-purple-900/30 text-purple-300 border-purple-700/30',
  'AI & Technology': 'bg-blue-900/30 text-blue-300 border-blue-700/30',
  'ATS Optimization': 'bg-amber-900/30 text-amber-300 border-amber-700/30',
  'Resume Guides': 'bg-green-900/30 text-green-300 border-green-700/30',
  'Resume Mistakes': 'bg-red-900/30 text-red-300 border-red-700/30',
  'Resume Writing': 'bg-cyan-900/30 text-cyan-300 border-cyan-700/30',
};

function ArticleNavigation({ currentSlug, articles }: { currentSlug: string, articles: BlogArticleMeta[] }) {
  const currentIndex = articles.findIndex(a => a.slug === currentSlug);
  const prev = currentIndex > 0 ? articles[currentIndex - 1] : null;
  const next = currentIndex < articles.length - 1 ? articles[currentIndex + 1] : null;

  return (
    <div className="grid md:grid-cols-2 gap-4 mt-16">
      {prev ? (
        <Link href={`/blog/${prev.slug}`} className="group block p-6 bg-[#1a1f1a] rounded-xl border border-white/5 hover:border-[#81ff00]/30 transition-all duration-300">
          <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">Previous Article</span>
          <p className="text-white font-semibold mt-1 group-hover:text-[#81ff00] transition-colors line-clamp-2">{prev.title}</p>
          <span className="inline-flex items-center gap-1 text-gray-500 text-sm mt-2 group-hover:text-gray-300">
            <ArrowLeft className="w-4 h-4" /> Read
          </span>
        </Link>
      ) : <div />}
      {next ? (
        <Link href={`/blog/${next.slug}`} className="group block p-6 bg-[#1a1f1a] rounded-xl border border-white/5 hover:border-[#81ff00]/30 transition-all duration-300 md:text-right">
          <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">Next Article</span>
          <p className="text-white font-semibold mt-1 group-hover:text-[#81ff00] transition-colors line-clamp-2">{next.title}</p>
          <span className="inline-flex items-center gap-1 text-gray-500 text-sm mt-2 justify-end md:ml-auto group-hover:text-gray-300">
            Read <ArrowRight className="w-4 h-4" />
          </span>
        </Link>
      ) : <div />}
    </div>
  );
}

export default async function BlogPostPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const params = await props.params;
  const slug = params.slug;
  const article = getArticleBySlug(slug);
  const allArticles = getAllArticles();

  if (!article) {
    notFound();
  }

  const categoryColor = categoryColors[article.category] || 'bg-gray-800 text-gray-300 border-gray-700';

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": article.title,
    "description": article.excerpt || article.subtitle,
    "image": article.featuredImage,
    "author": {
      "@type": "Organization",
      "name": "CVCircle Research Team",
      "url": "https://cvcircle.io"
    },
    "publisher": {
      "@type": "Organization",
      "name": "CVCircle",
      "logo": {
        "@type": "ImageObject",
        "url": "https://cvcircle.io/images/favicon.png"
      }
    },
    "datePublished": article.date,
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `https://cvcircle.io/blog/${slug}`
    }
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://cvcircle.io"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Blog",
        "item": "https://cvcircle.io/blog"
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": article.title,
        "item": `https://cvcircle.io/blog/${slug}`
      }
    ]
  };

  return (
    <div className="min-h-screen bg-[#0d1209]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#81ff00]/3 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-green-900/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10">
        <CardNav
          logo="CVCircle"
          links={navLinks}
        />

        <header className="pt-32 pb-8 px-4">
          <div className="max-w-3xl mx-auto">
            <MotionDiv initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
              <Link href="/blog" className="inline-flex items-center gap-2 text-gray-500 hover:text-[#81ff00] text-sm mb-8 transition-colors group">
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" /> Back to Blog
              </Link>
            </MotionDiv>

            <MotionDiv initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05 }} className="flex flex-wrap items-center gap-3 mb-5">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${categoryColor}`}>
                <Tag className="w-3 h-3" />
                {article.category}
              </span>
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <Calendar className="w-3.5 h-3.5" /> {article.date}
              </span>
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <Clock className="w-3.5 h-3.5" /> {article.readTime}
              </span>
            </MotionDiv>

            <MotionH1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="text-3xl md:text-5xl font-bold text-white mb-4 leading-tight">
              {article.title}
            </MotionH1>

            <MotionDiv initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }}>
              <p className="text-lg text-gray-400 mb-6 leading-relaxed">{article.subtitle}</p>
              <div className="flex items-center gap-4 pb-6 border-b border-white/5">
                <div className="w-10 h-10 bg-gradient-to-br from-[#81ff00]/30 to-green-600/20 rounded-full flex items-center justify-center border border-[#81ff00]/20">
                  <span className="text-[#81ff00] font-bold text-sm">{article.author.split(' ').map((n: string) => n[0]).join('')}</span>
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{article.author}</p>
                  <p className="text-gray-500 text-xs">CVCircle Research Team</p>
                </div>
              </div>
            </MotionDiv>
          </div>
        </header>

        <MotionDiv initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 0.2 }} className="px-4 pb-12">
          <div className="max-w-4xl mx-auto rounded-2xl overflow-hidden border border-white/5 shadow-2xl">
            <img src={article.featuredImage} alt={article.featuredImageAlt} className="w-full" />
          </div>
        </MotionDiv>

        <div className="px-4 pb-8">
          <div className="max-w-6xl mx-auto">
            {/* TOC on left, article content on right */}
            <div className="grid grid-cols-1 xl:grid-cols-[260px_1fr] gap-12">
              <aside className="hidden xl:block">
                <TableOfContentsClient sections={article.tableOfContents} slug={article.slug} />
                
                {/* Related Tools Links */}
                <div className="mt-12 sticky top-32">
                  <h4 className="text-white font-bold text-sm mb-4 uppercase tracking-wider">Essential Tools</h4>
                  <div className="flex flex-col gap-3">
                    <Link href="/ai-resume-builder" className="group flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/5 hover:border-[#81ff00]/30 transition-all">
                      <div className="w-8 h-8 bg-lime-400/10 rounded-md flex items-center justify-center text-lime-400">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <span className="text-xs text-gray-300 font-medium group-hover:text-white transition-colors">AI Resume Builder</span>
                    </Link>
                    <Link href="/ats-resume-checker" className="group flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/5 hover:border-blue-400/30 transition-all">
                      <div className="w-8 h-8 bg-blue-400/10 rounded-md flex items-center justify-center text-blue-400">
                        <CheckCircle className="w-4 h-4" />
                      </div>
                      <span className="text-xs text-gray-300 font-medium group-hover:text-white transition-colors">ATS Scanner</span>
                    </Link>
                    <Link href="/templates" className="group flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/5 hover:border-purple-400/30 transition-all">
                      <div className="w-8 h-8 bg-purple-400/10 rounded-md flex items-center justify-center text-purple-400">
                        <FileText className="w-4 h-4" />
                      </div>
                      <span className="text-xs text-gray-300 font-medium group-hover:text-white transition-colors">Resume Templates</span>
                    </Link>
                  </div>
                </div>
              </aside>
              <article className="max-w-3xl">
                {article.sections.map((section, index) => (
                  <section key={section.id} id={section.id} className="mb-12 scroll-mt-28">
                    <MotionDiv
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: '-50px' }}
                      transition={{ duration: 0.4, delay: Math.min(index * 0.03, 0.3) }}
                    >
                      <h2 className="text-2xl md:text-3xl font-bold text-white mb-5 leading-tight">{section.heading}</h2>
                      {section.content && (
                        <div className="prose-content text-gray-300 leading-relaxed" dangerouslySetInnerHTML={{ __html: section.content }} />
                      )}
                      {section.subSections?.map((sub, si) => (
                        <div key={si} className="mt-6">
                          <h3 className="text-xl font-bold text-white mb-3">{sub.heading}</h3>
                          <div className="prose-content text-gray-300" dangerouslySetInnerHTML={{ __html: sub.content }} />
                        </div>
                      ))}
                    </MotionDiv>
                  </section>
                ))}
                
                {/* FAQ Section if present in JSON */}
                {article.faqs && article.faqs.length > 0 && (
                  <section id="faqs" className="mt-16 pt-16 border-t border-white/5 scroll-mt-28">
                    <h2 className="text-2xl md:text-3xl font-bold text-white mb-8">Frequently Asked Questions</h2>
                    <div className="space-y-6">
                      {article.faqs.map((faq: any, i: number) => (
                        <div key={i} className="bg-[#1a1f1a] p-6 rounded-xl border border-white/5">
                          <h3 className="text-lg font-bold text-white mb-3">{faq.question}</h3>
                          <p className="text-gray-400 text-sm leading-relaxed">{faq.answer}</p>
                        </div>
                      ))}
                    </div>
                    {/* FAQ Schema */}
                    <script
                      type="application/ld+json"
                      dangerouslySetInnerHTML={{
                        __html: JSON.stringify({
                          "@context": "https://schema.org",
                          "@type": "FAQPage",
                          "mainEntity": article.faqs.map((faq: any) => ({
                            "@type": "Question",
                            "name": faq.question,
                            "acceptedAnswer": {
                              "@type": "Answer",
                              "text": faq.answer
                            }
                          }))
                        })
                      }}
                    />
                  </section>
                )}
              </article>
            </div>
          </div>
        </div>

        <section className="px-4 pb-12">
          <div className="max-w-3xl mx-auto">
            <MotionDiv initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="relative rounded-2xl overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-[#81ff00]/15 via-green-900/10 to-transparent" />
              <div className="absolute inset-0 border border-[#81ff00]/20 rounded-2xl" />
              <div className="relative p-10 text-center">
                <div className="w-12 h-12 bg-[#81ff00]/15 rounded-xl flex items-center justify-center mx-auto mb-5 border border-[#81ff00]/20">
                  <span className="text-[#81ff00] font-bold text-sm">CV</span>
                </div>
                <h2 className="text-2xl font-bold text-white mb-3">Ready to Build Your CV?</h2>
                <p className="text-gray-400 mb-7 max-w-lg mx-auto leading-relaxed">
                  Apply the strategies from this article in CVCircle&apos;s AI-powered resume builder. Build your ATS-optimised resume in minutes — free to start.
                </p>
                <div className="flex flex-wrap gap-3 justify-center">
                  <Link href="/sign-up" className="inline-flex items-center gap-2 bg-[#81ff00] text-black px-7 py-3 rounded-full font-bold hover:bg-lime-400 transition-colors text-sm shadow-[0_0_20px_rgba(129,255,0,0.25)]">Build My CV Free</Link>
                  <Link href="/ai-resume-builder" className="inline-flex items-center gap-2 bg-white/10 text-white border border-white/15 px-7 py-3 rounded-full font-bold hover:bg-white/15 transition-colors text-sm">Try AI Resume Builder</Link>
                </div>
              </div>
            </MotionDiv>
          </div>
        </section>

        <section className="px-4 pb-24">
          <div className="max-w-3xl mx-auto">
            <ArticleNavigation currentSlug={slug} articles={allArticles} />
          </div>
        </section>

        <footer className="py-8 px-4 border-t border-white/5">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-[#81ff00] rounded flex items-center justify-center shadow-[0_0_8px_rgba(129,255,0,0.3)]">
                <span className="text-black font-bold text-xs">CV</span>
              </div>
              <span className="text-gray-500 text-sm">© 2026 CVCircle by Morigrid Labs</span>
            </div>
            <div className="flex gap-6">
              <Link href="/privacy-policy" className="text-gray-500 hover:text-white text-sm transition-colors">Privacy</Link>
              <Link href="/terms" className="text-gray-500 hover:text-white text-sm transition-colors">Terms</Link>
              <Link href="/blog" className="text-gray-500 hover:text-white text-sm transition-colors">All Posts</Link>
            </div>
          </div>
        </footer>

        <style dangerouslySetInnerHTML={{
          __html: `
            .prose-content table { width: 100%; border-collapse: collapse; border-radius: 0.75rem; overflow: hidden; margin: 1.5rem 0; }
            .prose-content th { background-color: #0d1209; color: white; font-weight: 700; padding: 0.75rem 1rem; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.1); }
            .prose-content td { padding: 0.75rem 1rem; color: #d1d5db; border-bottom: 1px solid rgba(255,255,255,0.05); }
            .prose-content tr:last-child td { border-bottom: none; }
            .prose-content tr:nth-child(even) { background-color: rgba(26, 31, 26, 0.5); }
            .prose-content h3 { font-size: 1.125rem; font-weight: 700; color: white; margin: 1.25rem 0 0.5rem; }
            .prose-content ul, .prose-content ol { margin: 0.75rem 0; padding-left: 1.25rem; color: #d1d5db; }
            .prose-content li { margin-bottom: 0.375rem; }
            .prose-content strong { color: white; font-weight: 600; }
            .prose-content p { margin-bottom: 1rem; line-height: 1.75; color: #d1d5db; }
            .prose-content a { color: #81ff00; text-decoration: underline; text-underline-offset: 2px; }
            .prose-content a:hover { color: #a8ff47; }
            .prose-content blockquote { border-left: 3px solid rgba(129,255,0,0.4); padding-left: 1rem; margin: 1.5rem 0; color: #9ca3af; font-style: italic; }
          `
        }} />
      </div>
    </div>
  );
}
