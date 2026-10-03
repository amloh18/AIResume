import { MetadataRoute } from 'next'
import { getAllArticles } from '@/data/blogs'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://buildairesume.com'
  const now = new Date()

  // Landing & Main Pages
  const staticPages = [
    { url: baseUrl, priority: 1.0, changeFrequency: 'daily' as const },
    { url: `${baseUrl}/ai-resume-builder`, priority: 0.9, changeFrequency: 'weekly' as const },
    { url: `${baseUrl}/templates`, priority: 0.9, changeFrequency: 'weekly' as const },
    { url: `${baseUrl}/ats-resume-checker`, priority: 0.9, changeFrequency: 'weekly' as const },
    { url: `${baseUrl}/resume-score`, priority: 0.9, changeFrequency: 'weekly' as const },
    { url: `${baseUrl}/features`, priority: 0.9, changeFrequency: 'weekly' as const },
    { url: `${baseUrl}/blog`, priority: 0.8, changeFrequency: 'weekly' as const },
  ]

  // Tool pages
  const toolPages = [
    'interview-coach',
    'linkedin-enhancer',
  ]

  const toolSitemapEntries = toolPages.map(tool => ({
    url: `${baseUrl}/${tool}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  // Role-specific resume pages (only roles with real content)
  const rolePages = [
    'data-analyst',
    'software-engineer',
    'frontend-developer',
    'backend-developer',
    'fullstack-developer',
    'product-manager',
    'business-analyst',
    'data-scientist',
    'ui-ux-designer',
    'devops-engineer',
  ]

  const roleSitemapEntries = rolePages.map(role => ({
    url: `${baseUrl}/resume/${role}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  // Example pages
  const examplePages = [
    'resume/data-analyst-example',
    'resume/software-engineer-example',
    'resume/frontend-developer-example',
  ]

  const exampleSitemapEntries = examplePages.map(page => ({
    url: `${baseUrl}/${page}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))

  // Dynamic Blog Posts from Registry
  const articles = getAllArticles()
  const blogPostSitemapEntries = articles.map(post => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))

  // Legal & Policy Pages
  const legalPages = [
    { url: `${baseUrl}/privacy-policy`, priority: 0.3, changeFrequency: 'yearly' as const },
    { url: `${baseUrl}/terms`, priority: 0.3, changeFrequency: 'yearly' as const },
    { url: `${baseUrl}/legal`, priority: 0.3, changeFrequency: 'yearly' as const },
  ]

  // Comparison Pages
  const comparisonPages = [
    'compare/ai-resume-vs-cakeresume',
    'compare/resume-builders',
  ]

  const comparisonSitemapEntries = comparisonPages.map(page => ({
    url: `${baseUrl}/${page}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }))

  return [
    ...staticPages,
    ...toolSitemapEntries,
    ...roleSitemapEntries,
    ...exampleSitemapEntries,
    ...blogPostSitemapEntries,
    ...comparisonSitemapEntries,
    ...legalPages.map(page => ({ ...page, lastModified: now })),
  ]
}