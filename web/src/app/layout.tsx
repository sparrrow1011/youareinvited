import type { Metadata } from 'next';
import { Inter, Noto_Serif, Manrope } from 'next/font/google';
import GoogleAuthProvider from '@/components/GoogleAuthProvider';
import {
  defaultDescription,
  organizationJsonLd,
  seoKeywords,
  siteName,
  siteUrl,
  softwareApplicationJsonLd,
  websiteJsonLd,
} from '@/lib/seo';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

const notoSerif = Noto_Serif({
  subsets: ['latin'],
  variable: '--font-noto-serif',
  style: ['normal', 'italic'],
  weight: ['300', '400', '700'],
});

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  weight: ['300', '400', '500', '600', '700'],
});

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: {
    default: 'YouAreInvited | Digital Invitations With QR Check-In',
    template: `%s | ${siteName}`,
  },
  description: defaultDescription,
  applicationName: siteName,
  keywords: seoKeywords,
  authors: [{ name: siteName }],
  creator: siteName,
  publisher: siteName,
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  openGraph: {
    title: 'YouAreInvited | Digital Invitations With QR Check-In',
    description: defaultDescription,
    url: '/',
    siteName,
    type: 'website',
    images: [
      {
        url: '/img/event.jpg',
        width: 1200,
        height: 630,
        alt: 'YouAreInvited digital event invitation platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'YouAreInvited | Digital Invitations With QR Check-In',
    description: defaultDescription,
    images: ['/img/event.jpg'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,300,0,0"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([
              organizationJsonLd,
              websiteJsonLd,
              softwareApplicationJsonLd,
            ]),
          }}
        />
      </head>
      <body className={`${inter.className} ${notoSerif.variable} ${manrope.variable}`}>
        <GoogleAuthProvider>
          {children}
        </GoogleAuthProvider>
      </body>
    </html>
  );
}
