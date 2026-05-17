import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/'],
        disallow: [
          '/api/',
          '/admin',
          '/admin/',
          '/dashboard',
          '/inquiries',
          '/applications',
          '/favorites',
          '/my-listings',
          '/payouts',
          '/payment/',
          '/profile',
          '/messages',
          '/messages/',
          '/callback',
          '/verify-email',
        ],
      },
    ],
    sitemap: 'https://wroomly.app/sitemap.xml',
    host: 'https://wroomly.app',
  }
}
