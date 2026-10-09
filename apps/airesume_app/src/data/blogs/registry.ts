import { BlogArticle, BlogArticleMeta } from './types';
export type { BlogArticle, BlogArticleMeta, BlogSection } from './types';

// All article slugs for this project
export const ARTICLE_SLUGS = [
  'why-ai-resume-beats-cakecv',
  'ai-resume-builder-2026',
  'ats-score-optimization',
  'data-analyst-resume-2026',
  'software-engineer-resume-2026',
  'worst-resume-mistakes',
  'vs-resume-now-zety',
  'tailoring-resume-job-description',
  'professional-summary-examples',
  'semantic-keywords-tech-resumes',
  'modern-cv-editor-platform-concepts',
  'primary-cv-method',
  'ai-cover-letter-generator-guide',
  'career-gap-resume-guide',
  'how-to-build-ats-friendly-resume',
  'find-jobs-matching-skills-not-job-titles',
  'how-ats-resume-scoring-works',
  'how-to-tailor-resume-for-every-job',
  'how-to-find-hidden-job-opportunities',
  'complete-job-search-workflow-guide',
  'what-is-a-good-resume-match-score',
  'how-to-search-jobs-by-skills',
  'prepare-for-interview-using-job-description',
  'why-you-keep-applying-getting-no-interviews',
  // Fills 2026-07-31 — the single 14-day hole in an otherwise unbroken weekly Friday cadence.
  'job-application-checklist',
  'how-ai-helps-apply-for-jobs-without-spam',
  'resume-vs-job-description-skills-gap-analysis',
  'prepare-for-technical-behavioral-interviews-with-ai',
  'modern-job-search-all-in-one-workflow',
  // Weekly Fridays continuing from 2026-09-04 through to the current date.
  'ats-resume-checker-guide',
  'improve-your-resume-score',
  'best-resume-builders-2026',
  'choose-a-resume-template',
  'product-manager-resume-2026',
  'what-is-an-ai-resume-builder',
] as const;

export type ArticleSlug = (typeof ARTICLE_SLUGS)[number];

// Static import map for all articles
// When a new JSON file is added to src/data/blogs/, just add its import here
import article01 from './01-why-ai-resume-beats-cakecv.json';
import article02 from './02-ai-resume-builder-2026.json';
import article03 from './03-ats-score-optimization.json';
import article04 from './04-data-analyst-resume-2026.json';
import article05 from './05-software-engineer-resume-2026.json';
import article06 from './06-worst-resume-mistakes.json';
import article07 from './07-vs-resume-now-zety.json';
import article08 from './08-tailoring-resume-job-description.json';
import article09 from './09-professional-summary-examples.json';
import article10 from './10-semantic-keywords-tech-resumes.json';
import article11 from './11-modern-cv-editor-platform-concepts.json';
import article12 from './12-primary-cv-method.json';
import article13 from './13-ai-cover-letter-generator-guide.json';
import article14 from './14-career-gap-resume-guide.json';
import article15 from './15-how-to-build-ats-friendly-resume.json';
import article16 from './16-find-jobs-matching-skills-not-job-titles.json';
import article17 from './17-how-ats-resume-scoring-works.json';
import article18 from './18-how-to-tailor-resume-for-every-job.json';
import article19 from './19-how-to-find-hidden-job-opportunities.json';
import article20 from './20-complete-job-search-workflow-guide.json';
import article21 from './21-what-is-a-good-resume-match-score.json';
import article22 from './22-how-to-search-jobs-by-skills.json';
import article23 from './23-prepare-for-interview-using-job-description.json';
import article24 from './24-why-you-keep-applying-getting-no-interviews.json';
import article25 from './25-how-ai-helps-apply-for-jobs-without-spam.json';
import article26 from './26-resume-vs-job-description-skills-gap-analysis.json';
import article27 from './27-prepare-for-technical-behavioral-interviews-with-ai.json';
import article28 from './28-modern-job-search-all-in-one-workflow.json';
import article29 from './29-job-application-checklist.json';
import article30 from './30-ats-resume-checker-guide.json';
import article31 from './31-improve-your-resume-score.json';
import article32 from './32-best-resume-builders-2026.json';
import article33 from './33-choose-a-resume-template.json';
import article34 from './34-product-manager-resume-2026.json';
import article35 from './35-what-is-an-ai-resume-builder.json';

const ARTICLE_REGISTRY: Record<ArticleSlug, BlogArticle> = {
  'why-ai-resume-beats-cakecv': article01,
  'ai-resume-builder-2026': article02,
  'ats-score-optimization': article03,
  'data-analyst-resume-2026': article04,
  'software-engineer-resume-2026': article05,
  'worst-resume-mistakes': article06,
  'vs-resume-now-zety': article07,
  'tailoring-resume-job-description': article08,
  'professional-summary-examples': article09,
  'semantic-keywords-tech-resumes': article10,
  'modern-cv-editor-platform-concepts': article11,
  'primary-cv-method': article12,
  'ai-cover-letter-generator-guide': article13,
  'career-gap-resume-guide': article14,
  'how-to-build-ats-friendly-resume': article15,
  'find-jobs-matching-skills-not-job-titles': article16,
  'how-ats-resume-scoring-works': article17,
  'how-to-tailor-resume-for-every-job': article18,
  'how-to-find-hidden-job-opportunities': article19,
  'complete-job-search-workflow-guide': article20,
  'what-is-a-good-resume-match-score': article21,
  'how-to-search-jobs-by-skills': article22,
  'prepare-for-interview-using-job-description': article23,
  'why-you-keep-applying-getting-no-interviews': article24,
  'job-application-checklist': article29,
  'how-ai-helps-apply-for-jobs-without-spam': article25,
  'resume-vs-job-description-skills-gap-analysis': article26,
  'prepare-for-technical-behavioral-interviews-with-ai': article27,
  'modern-job-search-all-in-one-workflow': article28,
  'ats-resume-checker-guide': article30,
  'improve-your-resume-score': article31,
  'best-resume-builders-2026': article32,
  'choose-a-resume-template': article33,
  'product-manager-resume-2026': article34,
  'what-is-an-ai-resume-builder': article35,
};

/**
 * Build table-of-contours from article sections (used at render time)
 */
export function buildTableOfContents(sections: { id: string; heading: string }[]): { id: string; heading: string }[] {
  return sections.map(s => ({ id: s.id, heading: s.heading }));
}

/**
 * Metadata for every article, newest first.
 *
 * This used to be a plain `Object.values()` pass, so the order was file-insertion order — which is
 * not chronological: files 01–10 are numbered newest-first and 11–35 oldest-first. The blog index
 * calls `filteredArticles[0]` "Featured" and heads the grid "Latest Articles", and the article
 * pager walks the same array for prev/next, so both were presenting an arbitrary order as if it
 * were recency. Sorting on `date` descending makes those labels true and keeps the weekly
 * publishing timeline legible as the catalogue grows.
 *
 * `date` is an ISO string (`YYYY-MM-DD`), so a lexicographic comparison is also chronological;
 * the `Date` conversion only guards against a malformed value dragging a post out of position.
 */
export function getAllArticles(): BlogArticleMeta[] {
  return Object.values(ARTICLE_REGISTRY)
    .map(a => ({
      id: a.id,
      slug: a.slug,
      title: a.title,
      excerpt: a.excerpt,
      category: a.category,
      readTime: a.readTime,
      date: a.date,
      featuredImage: a.featuredImage,
      featuredImageAlt: a.featuredImageAlt,
      author: a.author,
    }))
    .sort((a, b) => {
      const ta = Date.parse(a.date);
      const tb = Date.parse(b.date);
      return (Number.isNaN(tb) ? 0 : tb) - (Number.isNaN(ta) ? 0 : ta);
    });
}

/**
 * Get a single article by slug
 */
export function getArticleBySlug(slug: string): BlogArticle | undefined {
  return ARTICLE_REGISTRY[slug as ArticleSlug];
}

/**
 * Get articles filtered by category
 */
export function getArticlesByCategory(category: string): BlogArticleMeta[] {
  return Object.values(ARTICLE_REGISTRY)
    .filter(a => a.category.toLowerCase() === category.toLowerCase())
    .map(a => ({
      id: a.id,
      slug: a.slug,
      title: a.title,
      excerpt: a.excerpt,
      category: a.category,
      readTime: a.readTime,
      date: a.date,
      featuredImage: a.featuredImage,
      featuredImageAlt: a.featuredImageAlt,
      author: a.author,
    }));
}

/**
 * Get all unique categories
 */
export function getAllCategories(): string[] {
  const cats = new Set<string>();
  Object.values(ARTICLE_REGISTRY).forEach(a => cats.add(a.category));
  return Array.from(cats);
}

/**
 * Get all valid slugs (useful for build-time validation)
 */
export function getAllSlugs(): ArticleSlug[] {
  return [...ARTICLE_SLUGS];
}

/**
 * Get prev/next articles by slug.
 *
 * Indexes into the date-ordered array from `getAllArticles()` rather than into `ARTICLE_SLUGS`:
 * walking one ordering while reading values from another pairs the wrong neighbours. (Mirrors the
 * inlined logic of `ArticleNavigation` in `blog/[slug]/page.tsx`.)
 */
export function getAdjacentArticles(slug: string): {
  prev?: Pick<BlogArticleMeta, 'id' | 'slug' | 'title' | 'featuredImage' | 'featuredImageAlt'>;
  next?: Pick<BlogArticleMeta, 'id' | 'slug' | 'title' | 'featuredImage' | 'featuredImageAlt'>;
} {
  const all = getAllArticles();
  const index = all.findIndex(a => a.slug === slug);
  if (index === -1) return {};
  const prev = index > 0 ? all[index - 1] : undefined;
  const next = index < all.length - 1 ? all[index + 1] : undefined;
  return {
    prev: prev ? { id: prev.id, slug: prev.slug, title: prev.title, featuredImage: prev.featuredImage, featuredImageAlt: prev.featuredImageAlt } : undefined,
    next: next ? { id: next.id, slug: next.slug, title: next.title, featuredImage: next.featuredImage, featuredImageAlt: next.featuredImageAlt } : undefined,
  };
}
