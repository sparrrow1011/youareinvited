import type { Metadata } from 'next';

export const siteUrl = new URL(
  process.env.NEXT_PUBLIC_SITE_URL || 'https://youare-invited.com'
);

export const siteName = 'YouAreInvited';

export const defaultDescription =
  'Create premium digital invitations with guest list management, personalized invite links, QR check-in, templates, and event-day analytics.';

export const seoKeywords = [
  'digital invitations',
  'online invitations',
  'event invitations',
  'wedding invitations',
  'birthday invitations',
  'QR code check-in',
  'guest list management',
  'event RSVP',
];

export const publicRoutes = [
  { path: '/', priority: 1 },
  { path: '/features', priority: 0.9 },
  { path: '/how-it-works', priority: 0.85 },
  { path: '/templates', priority: 0.85 },
  { path: '/guest-experience', priority: 0.8 },
  { path: '/faq', priority: 0.7 },
  { path: '/support', priority: 0.65 },
  { path: '/support/status', priority: 0.5 },
  { path: '/csv-import-guide', priority: 0.55 },
  { path: '/template-design-guide', priority: 0.55 },
  { path: '/privacy', priority: 0.3 },
  { path: '/terms', priority: 0.3 },
  { path: '/cookies', priority: 0.3 },
  { path: '/signup', priority: 0.75 },
  { path: '/login', priority: 0.35 },
] as const;

export const absoluteUrl = (path = '/') => new URL(path, siteUrl).toString();

type SeoMetadataInput = {
  title: string;
  description: string;
  path: string;
  image?: string;
};

export function createPageMetadata({
  title,
  description,
  path,
  image = '/img/event.jpg',
}: SeoMetadataInput): Metadata {
  const url = absoluteUrl(path);
  const imageUrl = absoluteUrl(image);

  return {
    title,
    description,
    alternates: { canonical: url },
    keywords: seoKeywords,
    openGraph: {
      title,
      description,
      url,
      siteName,
      type: 'website',
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: `${siteName} digital invitation platform`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
  };
}

export const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: siteName,
  url: siteUrl.toString(),
  description: defaultDescription,
};

export const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: siteName,
  url: siteUrl.toString(),
};

export const softwareApplicationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: siteName,
  applicationCategory: 'EventManagementApplication',
  operatingSystem: 'Web',
  url: siteUrl.toString(),
  description: defaultDescription,
};
