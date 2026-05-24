import { MetadataRoute } from 'next'
import { getAllArticles } from '@/data/blogs'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://cvcircle.io'
  const now = new Date()

  // Landing & Main Pages
  const staticPages = [
    { url: baseUrl, priority: 1.0, changeFrequency: 'daily' as const },
    { url: `${baseUrl}/features`, priority: 0.9, changeFrequency: 'weekly' as const },
    { url: `${baseUrl}/templates`, priority: 0.9, changeFrequency: 'weekly' as const },
    { url: `${baseUrl}/blog`, priority: 0.8, changeFrequency: 'weekly' as const },
    { url: `${baseUrl}/about`, priority: 0.7, changeFrequency: 'monthly' as const },
    { url: `${baseUrl}/careers`, priority: 0.6, changeFrequency: 'monthly' as const },
  ]

  // Tool pages
  const toolPages = [
    'ai-resume-builder',
    'ats-resume-checker',
    'resume-score',
    'ai-career-report',
    'interview-coach',
    'linkedin-enhancer',
  ]

  const toolSitemapEntries = toolPages.map(tool => ({
    url: `${baseUrl}/${tool}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.9,
  }))

  // Role-specific resume pages
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
    'project-manager',
    'marketing-manager',
    'sales-representative',
    'customer-service',
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
    { url: `${baseUrl}/cookie-policy`, priority: 0.3, changeFrequency: 'yearly' as const },
  ]

  // Comparison Pages
  const comparisonPages = [
    'compare/cvcircle-vs-cakeresume',
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
