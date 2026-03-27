import type { Metadata } from 'next';
import { Inter, Noto_Serif, Manrope } from 'next/font/google';
import GoogleAuthProvider from '@/components/GoogleAuthProvider';
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
  title: 'YouAreInvited | The Art of Invitation',
  description: 'Cinematic digital invitations for your most meaningful moments.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,300,0,0"
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
