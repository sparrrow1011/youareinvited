import Link from 'next/link';
import LegalFooterLinks from '@/components/LegalFooterLinks';

type PublicSiteFooterProps = {
  id?: string;
  className?: string;
};

export default function PublicSiteFooter({ id, className = '' }: PublicSiteFooterProps) {
  return (
    <footer
      id={id}
      className={`py-20 px-6 md:px-12 border-t border-outline-variant/10 max-w-screen-2xl mx-auto ${className}`.trim()}
    >
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-10 md:gap-12">
        <div className="col-span-2 space-y-5">
          <div className="text-3xl font-headline italic text-on-lp-background">YouAreInvited</div>
          <p className="text-on-surface-variant max-w-xs text-sm leading-relaxed">
            A digital invitation platform for those who value elegance, intentionality, and cinematic storytelling.
          </p>
        </div>

        <div className="space-y-4">
          <div className="font-bold text-sm uppercase tracking-widest text-on-lp-background">Platform</div>
          <ul className="space-y-2 text-sm text-on-surface-variant">
            {[
              { label: 'Features', href: '/features' },
              { label: 'How It Works', href: '/how-it-works' },
              { label: 'Templates', href: '/templates' },
              { label: 'Guest Experience', href: '/guest-experience' },
              { label: 'Create Event', href: '/signup' },
            ].map((item) => (
              <li key={item.label}>
                <Link href={item.href} className="hover:text-brand transition-colors">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-4">
          <div className="font-bold text-sm uppercase tracking-widest text-on-lp-background">Resources</div>
          <ul className="space-y-2 text-sm text-on-surface-variant">
            {[
              { label: 'FAQ', href: '/faq' },
              { label: 'CSV Import Guide', href: '/csv-import-guide' },
              { label: 'Template Design Guide', href: '/template-design-guide' },
              { label: 'Support Center', href: '/support' },
              { label: 'Status Page', href: '/support/status' },
            ].map((item) => (
              <li key={item.label}>
                <Link href={item.href} className="hover:text-brand transition-colors">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="col-span-2 space-y-5">
          <div className="font-bold text-sm uppercase tracking-widest text-on-lp-background">Get Started</div>
          <p className="text-xs text-on-surface-variant max-w-sm">
            Browse the public guides, see how the platform works, or create your first event when you are ready.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-full bg-on-lp-background px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand"
            >
              Create Event
            </Link>
            <Link
              href="/support"
              className="inline-flex items-center gap-2 rounded-full border border-outline-variant/20 bg-surface-container-low px-5 py-3 text-sm font-semibold text-on-lp-background transition-colors hover:border-brand/20 hover:text-brand"
            >
              Support Center
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-full border border-outline-variant/20 bg-transparent px-5 py-3 text-sm font-semibold text-on-surface-variant transition-colors hover:border-brand/20 hover:text-brand"
            >
              Login
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-16 pt-8 border-t border-outline-variant/10 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="text-xs text-on-surface-variant">© {new Date().getFullYear()} YouAreInvited. All Rights Reserved.</div>
        <LegalFooterLinks className="text-xs text-on-surface-variant font-medium" />
      </div>
    </footer>
  );
}
