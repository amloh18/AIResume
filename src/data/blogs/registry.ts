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
};

/**
 * Build table-of-contours from article sections (used at render time)
 */
export function buildTableOfContents(sections: { id: string; heading: string }[]): { id: string; heading: string }[] {
  return sections.map(s => ({ id: s.id, heading: s.heading }));
}

/**
 * Get metadata for all articles (used for listing/index page)
 */
export function getAllArticles(): BlogArticleMeta[] {
  return Object.values(ARTICLE_REGISTRY).map(a => ({
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
 * Get prev/next articles by slug
 */
export function getAdjacentArticles(slug: string): {
  prev?: Pick<BlogArticleMeta, 'id' | 'slug' | 'title' | 'featuredImage' | 'featuredImageAlt'>;
  next?: Pick<BlogArticleMeta, 'id' | 'slug' | 'title' | 'featuredImage' | 'featuredImageAlt'>;
} {
  const slugs = getAllSlugs();
  const all = getAllArticles();
  const index = slugs.indexOf(slug as ArticleSlug);
  if (index === -1) return {};
  const prev = index > 0 ? all[index - 1] : undefined;
  const next = index < slugs.length - 1 ? all[index + 1] : undefined;
  return {
    prev: prev ? { id: prev.id, slug: prev.slug, title: prev.title, featuredImage: prev.featuredImage, featuredImageAlt: prev.featuredImageAlt } : undefined,
    next: next ? { id: next.id, slug: next.slug, title: next.title, featuredImage: next.featuredImage, featuredImageAlt: next.featuredImageAlt } : undefined,
  };
}
