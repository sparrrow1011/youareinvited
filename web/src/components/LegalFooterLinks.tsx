import Link from 'next/link';

const LEGAL_LINKS = [
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/terms', label: 'Terms of Service' },
  { href: '/cookies', label: 'Cookie Settings' },
];

type LegalFooterLinksProps = {
  className?: string;
  linkClassName?: string;
};

export default function LegalFooterLinks({
  className = '',
  linkClassName = '',
}: LegalFooterLinksProps) {
  return (
    <div className={`flex flex-wrap items-center justify-center gap-x-6 gap-y-2 ${className}`.trim()}>
      {LEGAL_LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={`transition-colors hover:text-on-lp-background ${linkClassName}`.trim()}
        >
          {link.label}
        </Link>
      ))}
    </div>
  );
}
