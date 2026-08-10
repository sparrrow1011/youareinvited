import type { Metadata } from 'next';
import InvitationClient from './InvitationClient';

interface Props {
  params: { id: string };
}

const BACKEND_URL = (process.env.BACKEND_URL ?? 'https://backend.v0.youare-invited.com').replace(/\/$/, '');
const SERVER_API_BASE_URL = `${BACKEND_URL}/api`;
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? SERVER_API_BASE_URL;
const API_ORIGIN = (() => {
  try { return new URL(API_BASE_URL).origin; } catch { return ''; }
})();

const resolveMedia = (path?: string | null): string => {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const res = await fetch(`${SERVER_API_BASE_URL}/invitations/${params.id}/`, { cache: 'no-store' });
    if (!res.ok) throw new Error('not found');
    const inv = await res.json();

    const imageUrl = resolveMedia(inv.e_invite_image);
    const title = `${inv.name}'s Invitation`;

    return {
      title,
      description: `View your personal invitation — ${inv.name}`,
      robots: {
        index: false,
        follow: false,
      },
      openGraph: {
        title,
        description: `You're invited! View your invitation here.`,
        images: imageUrl ? [{ url: imageUrl, width: 600, height: 900, alt: title }] : [],
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title,
        images: imageUrl ? [imageUrl] : [],
      },
    };
  } catch {
    return {
      title: 'Your Invitation',
      description: 'View your personal invitation.',
      robots: {
        index: false,
        follow: false,
      },
    };
  }
}

export default function InvitationPage({ params }: Props) {
  return <InvitationClient id={params.id} />;
}
