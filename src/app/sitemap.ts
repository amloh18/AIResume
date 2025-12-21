import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXTAUTH_URL || 'https://cvcircle.io'
  const now = new Date()
  
  return [
    // Tier 1: Main Landing Page (Highest Priority)
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    // Tier 2: Core Product Pages (High Priority)
    {
      url: `${baseUrl}/features`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9, // Features Page
    },
    {
      url: `${baseUrl}/templates`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9, // Templates Page
    },
    // Tier 3: Conversion Pages (Medium-High Priority)
    {
      url: `${baseUrl}/sign-up`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/sign-in`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    // Tier 4: Legal/Support Pages (Low Priority)
    {
      url: `${baseUrl}/privacy-policy`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/cookie-policy`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ]
}
