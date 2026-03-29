import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import HomePageClient from '@/components/HomePageClient';
import { isExpiredJwt } from '@/lib/jwt';

export default async function Home() {
  // Redirect authenticated users to dashboard when the cookie still holds a live JWT.
  const cookieStore = cookies();
  const token = cookieStore.get('access_token')?.value;
  if (token && !isExpiredJwt(token)) redirect('/dashboard');

  return <HomePageClient />;
}
