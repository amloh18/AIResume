import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://cvcircle.io'
  const now = new Date()

  // Role pages
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

  // Tool pages
  const toolPages = [
    'ai-resume-builder',
    'ats-resume-checker',
    'resume-score',
    'ai-career-report',
  ]

  // Example/template pages
  const examplePages = [
    'resume/data-analyst-example',
    'resume/data-analyst-template',
    'resume/software-engineer-example',
    'resume/software-engineer-template',
    'resume/frontend-developer-example',
    'resume/frontend-developer-template',
  ]

  // Blog listing page
  const blogListingRoutes = ['blog']

  // Existing blog posts
  const existingBlogPosts = [
    'blog/resume-writing/fresher-resume-guide',
    'blog/ats-optimization/ats-tips',
    'blog/resume-writing/resume-mistakes',
    'blog/resume-writing/tech-resume-format',
  ]

  // Static pages
  const staticPages = [
    { url: baseUrl, priority: 1.0, changeFrequency: 'daily' as const },
    { url: `${baseUrl}/features`, priority: 0.9, changeFrequency: 'weekly' as const },
    { url: `${baseUrl}/templates`, priority: 0.9, changeFrequency: 'weekly' as const },
  ]

  const roleSitemapEntries = rolePages.map(role => ({
    url: `${baseUrl}/resume/${role}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.9,
  }))

  const toolSitemapEntries = toolPages.map(tool => ({
    url: `${baseUrl}/${tool}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.9,
  }))

  const exampleSitemapEntries = examplePages.map(page => ({
    url: `${baseUrl}/${page}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }))

  const blogListingSitemapEntries = blogListingRoutes.map(route => ({
    url: `${baseUrl}/${route}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  const blogPostSitemapEntries = existingBlogPosts.map(post => ({
    url: `${baseUrl}/${post}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  const legalPages = [
    { url: `${baseUrl}/privacy-policy`, priority: 0.3, changeFrequency: 'yearly' as const },
    { url: `${baseUrl}/terms`, priority: 0.3, changeFrequency: 'yearly' as const },
    { url: `${baseUrl}/cookie-policy`, priority: 0.3, changeFrequency: 'yearly' as const },
  ]

  return [
    ...staticPages,
    ...roleSitemapEntries,
    ...toolSitemapEntries,
    ...exampleSitemapEntries,
    ...blogListingSitemapEntries,
    ...blogPostSitemapEntries,
    ...legalPages.map(page => ({ ...page, lastModified: now })),
  ]
}
