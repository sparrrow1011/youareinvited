import type { Metadata } from 'next';
import LegalPageShell from '@/components/LegalPageShell';

export const metadata: Metadata = {
  title: 'Terms of Service | YouAreInvited',
  description: 'Read the terms that govern access to YouAreInvited and use of its invitation, guest, and check-in tools.',
};

const TERMS_SECTIONS = [
  {
    title: 'Acceptance of Terms',
    paragraphs: [
      'By accessing or using YouAreInvited, you agree to these Terms of Service. If you use the platform on behalf of an organization, you confirm that you have authority to bind that organization to these terms.',
      'If you do not agree to these terms, do not use the service.',
    ],
  },
  {
    title: 'Accounts and Eligibility',
    paragraphs: [
      'You must provide accurate account information, keep your login credentials secure, and promptly update information that changes.',
      'You are responsible for all activity that occurs under your account, including actions taken by team members, security staff, or anyone with access to your event links and settings.',
    ],
  },
  {
    title: 'Organizer Responsibilities',
    paragraphs: [
      'Organizers control the event data, guest data, invitation content, seating information, and staff links uploaded to the platform. Organizers are responsible for having the right to use that content and for complying with applicable privacy, consumer, and event-related laws.',
    ],
    bullets: [
      'Upload only content and guest information you are authorized to use.',
      'Protect staff access links, security PINs, and organizer credentials.',
      'Review invitation links, QR flows, and check-in setup before event day.',
      'Avoid unlawful, abusive, deceptive, or infringing use of the service.',
    ],
  },
  {
    title: 'Plans, Billing, and Platform Controls',
    paragraphs: [
      'Some features may depend on plan level, account status, or administrator approval. Plan details, billing terms, and feature availability may change over time.',
      'Platform-level controls, including watermark behavior or account restrictions, may be managed by YouAreInvited administrators where applicable.',
    ],
  },
  {
    title: 'Acceptable Use',
    paragraphs: [
      'You may not use the platform to distribute malware, impersonate others, scrape data without permission, interfere with the service, or use invitation flows for spam, harassment, fraud, or illegal activity.',
      'You may not attempt to bypass security features, gain unauthorized access, or reverse engineer the service except as permitted by law.',
    ],
  },
  {
    title: 'Intellectual Property',
    paragraphs: [
      'You retain ownership of the content you upload, subject to the rights needed for us to host, process, display, and deliver that content through the service.',
      'YouAreInvited retains ownership of the platform, software, design system, branding, and related intellectual property, except where otherwise stated.',
    ],
  },
  {
    title: 'Service Availability and Changes',
    paragraphs: [
      'We work to keep the service available and reliable, but we do not guarantee uninterrupted access, perfect uptime, or error-free operation.',
      'We may update, improve, suspend, or discontinue features, integrations, or parts of the service at any time, including when required for security, maintenance, or legal reasons.',
    ],
  },
  {
    title: 'Disclaimers and Liability',
    paragraphs: [
      'The service is provided on an as-is and as-available basis to the fullest extent permitted by law. We disclaim all warranties not expressly stated in these terms, including implied warranties of merchantability, fitness for a particular purpose, and non-infringement.',
      'To the fullest extent permitted by law, YouAreInvited will not be liable for indirect, incidental, special, consequential, or punitive damages, or for loss of profits, revenues, goodwill, data, or business opportunity arising from your use of the service.',
    ],
  },
  {
    title: 'Suspension and Termination',
    paragraphs: [
      'We may suspend or terminate accounts that violate these terms, create security risk, fail to pay required fees, or misuse the platform. You may stop using the service at any time.',
      'Sections that by their nature should survive termination, including ownership, payment obligations, disclaimers, and limitations of liability, will continue to apply.',
    ],
  },
  {
    title: 'Contact',
    paragraphs: [
      'Questions about these terms can be sent to support@youare-invited.com. Continued use of the platform after changes take effect means you accept the updated terms.',
    ],
  },
] as const;

export default function TermsPage() {
  return (
    <LegalPageShell
      eyebrow="Terms"
      title="Terms of Service"
      description="The rules that govern organizer accounts, guest data, invitation delivery, and use of YouAreInvited."
      lastUpdated="March 28, 2026"
      sections={[...TERMS_SECTIONS]}
    />
  );
}
