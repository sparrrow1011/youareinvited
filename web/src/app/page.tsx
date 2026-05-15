import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import HomePageClient from '@/components/HomePageClient';
import { isExpiredJwt } from '@/lib/jwt';
import { createPageMetadata } from '@/lib/seo';

export const metadata = createPageMetadata({
  title: 'Digital Invitations With QR Check-In',
  description:
    'Design personalized digital invitations, manage guest lists, share invite links, and verify arrivals with QR check-in from one event platform.',
  path: '/',
});

export default async function Home() {
  // Redirect authenticated users to dashboard when the cookie still holds a live JWT.
  const cookieStore = cookies();
  const token = cookieStore.get('access_token')?.value;
  if (token && !isExpiredJwt(token)) redirect('/dashboard');

  return <HomePageClient />;
}
