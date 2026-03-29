import type { Metadata } from 'next';
import CookieSettingsClient from './CookieSettingsClient';

export const metadata: Metadata = {
  title: 'Cookie Settings | YouAreInvited',
  description: 'Manage essential and optional cookie preferences for YouAreInvited.',
};

export default function CookieSettingsPage() {
  return <CookieSettingsClient />;
}
