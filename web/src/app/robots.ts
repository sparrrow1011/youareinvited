import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/analytics',
        '/dashboard',
        '/events/',
        '/invite/',
        '/invitation/',
        '/security/',
        '/settings',
        '/verify-email',
      ],
    },
    sitemap: absoluteUrl('/sitemap.xml'),
  };
}
