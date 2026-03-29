import type { Metadata } from 'next';
import LegalPageShell from '@/components/LegalPageShell';

export const metadata: Metadata = {
  title: 'Privacy Policy | YouAreInvited',
  description: 'Learn how YouAreInvited collects, uses, stores, and protects organizer and guest data.',
};

const PRIVACY_SECTIONS = [
  {
    title: 'Overview',
    paragraphs: [
      'This Privacy Policy explains how YouAreInvited collects, uses, and protects information when organizers create events, upload invitation designs, manage guest lists, and use venue check-in tools.',
      'We collect only the information needed to operate the platform, support event delivery, secure access, and improve the service experience for organizers, guests, security staff, and platform administrators.',
    ],
  },
  {
    title: 'Information We Collect',
    paragraphs: [
      'We collect organizer account details such as name, email address, login credentials, profile settings, plan information, and support communications.',
      'We also collect event and guest data supplied by organizers, including event details, invitation designs, guest names, seat assignments, guest tags, invitation links, check-in status, and invitation performance metrics such as views and share activity.',
    ],
    bullets: [
      'Account information used to authenticate users and manage subscriptions.',
      'Event and invitation data required to create, personalize, and deliver invites.',
      'Operational data such as device, browser, logs, and security events used to prevent abuse and troubleshoot issues.',
      'Support messages, bug reports, and other communications submitted through the platform.',
    ],
  },
  {
    title: 'How We Use Information',
    paragraphs: [
      'We use personal and event data to run the service, generate invitations and QR codes, enable guest check-in, process organizer requests, provide support, and maintain platform security.',
      'We may also use aggregated or de-identified data to understand product usage, monitor performance, improve features, and plan future roadmap decisions.',
    ],
    bullets: [
      'Authenticate users and keep accounts secure.',
      'Create invitation pages, e-invite images, QR codes, and public or staff-facing links.',
      'Track delivery, invitation views, shares, and check-in progress.',
      'Communicate service updates, respond to support requests, and investigate suspected misuse.',
    ],
  },
  {
    title: 'When We Share Information',
    paragraphs: [
      'We do not sell organizer or guest personal data. We share data only when needed to provide the service, comply with law, protect rights, or work with infrastructure providers that host or process data on our behalf.',
      'This may include cloud hosting, email delivery, media storage, analytics, payment processing, and customer support tools, each under appropriate contractual or operational controls.',
    ],
  },
  {
    title: 'Retention and Security',
    paragraphs: [
      'We retain data for as long as necessary to operate active accounts, support event history, comply with legal obligations, resolve disputes, and enforce our terms.',
      'We apply reasonable administrative, technical, and organizational safeguards designed to protect account access, invitation records, uploaded assets, and venue check-in data. No system is perfectly secure, so organizers should also protect their own credentials and staff access links.',
    ],
  },
  {
    title: 'Your Choices',
    paragraphs: [
      'Organizers can update profile details, event content, templates, and support preferences from within the platform. Organizers may also request account deletion or data export where available.',
      'Guests who believe their information was included in an invitation should contact the event organizer first, since organizers control the guest list data they upload to the platform.',
    ],
    bullets: [
      'Manage optional cookie preferences from the Cookie Settings page.',
      'Request support, data export, or account deletion from the Settings or Support areas.',
      'Use updated sharing or security settings to limit how invitation links are distributed.',
    ],
  },
  {
    title: 'Contact',
    paragraphs: [
      'If you have privacy questions, contact YouAreInvited at support@youare-invited.com. We may update this policy from time to time, and material changes will be reflected by updating the effective date on this page.',
    ],
  },
] as const;

export default function PrivacyPage() {
  return (
    <LegalPageShell
      eyebrow="Privacy"
      title="Privacy Policy"
      description="A clear summary of what data YouAreInvited collects, why we collect it, and how organizers and guests can control it."
      lastUpdated="March 28, 2026"
      sections={[...PRIVACY_SECTIONS]}
    />
  );
}
