import Link from 'next/link';

type WorkspaceNavLink = {
  icon: string;
  label: string;
  href: string;
  active?: boolean;
};

type OrganizerWorkspaceHeaderProps = {
  children: React.ReactNode;
  navLinks?: readonly WorkspaceNavLink[];
};

export default function OrganizerWorkspaceHeader({
  children,
  navLinks = [],
}: OrganizerWorkspaceHeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-lp-background/60 backdrop-blur-md border-b border-outline-variant/10">
      {children}

      {navLinks.length > 0 && (
        <div className="lg:hidden px-4 sm:px-6 pb-4 overflow-x-auto">
          <div className="flex items-center gap-2 min-w-max">
            {navLinks.map(({ icon, label, href, active }) => (
              <Link
                key={label}
                href={href}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold border transition-colors ${
                  active
                    ? 'bg-brand text-white border-brand shadow-lg shadow-brand/15'
                    : 'bg-white/70 text-on-surface-variant border-outline-variant/10'
                }`}
              >
                <span
                  className="material-symbols-outlined text-base"
                  style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
                >
                  {icon}
                </span>
                <span>{label}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
