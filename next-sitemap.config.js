/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.NEXTAUTH_URL || 'https://cvcircle.io',
  generateRobotsTxt: true,
  generateIndexSitemap: false,
  // Skip sitemap generation as we use Next.js dynamic sitemap.ts
  exclude: ['*'], 
  robotsTxtOptions: {
    additionalSitemaps: [
      `${process.env.NEXTAUTH_URL || 'https://cvcircle.io'}/sitemap.xml`,
    ],
  },
}
