import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/user/', '/edit/'],
    },
    sitemap: 'https://fairytail-platform.web.app/sitemap.xml',
  }
}