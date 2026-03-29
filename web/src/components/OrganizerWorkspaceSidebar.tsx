import Link from 'next/link';

type WorkspaceNavLink = {
  icon: string;
  label: string;
  href: string;
  active?: boolean;
};

type WorkspaceSecondaryAction = {
  icon: string;
  label: string;
  href?: string;
  onClick?: () => void;
};

type OrganizerWorkspaceSidebarProps = {
  identityName: string;
  identityMeta: string;
  avatarInitial: string;
  brandLogoUrl?: string;
  navLinks: readonly WorkspaceNavLink[];
  primaryAction?: React.ReactNode;
  secondaryActions?: readonly WorkspaceSecondaryAction[];
};

export default function OrganizerWorkspaceSidebar({
  identityName,
  identityMeta,
  avatarInitial,
  brandLogoUrl = '',
  navLinks,
  primaryAction,
  secondaryActions = [],
}: OrganizerWorkspaceSidebarProps) {
  return (
    <aside className="hidden lg:flex h-screen w-64 fixed left-0 top-0 bg-surface-container-low flex-col py-8 z-40">
      <div className="px-8 mb-10">
        <Link href="/" className="text-xl font-headline italic text-tertiary">
          YouAreInvited
        </Link>
      </div>

      <div className="px-6 mb-8">
        <div className="flex items-center gap-3 bg-white/50 p-3 rounded-xl">
          {brandLogoUrl ? (
            <img
              src={brandLogoUrl}
              alt={`${identityName} logo`}
              className="w-10 h-10 rounded-2xl object-cover border border-white/60 bg-white"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-brand text-white flex items-center justify-center text-sm font-bold">
              {avatarInitial}
            </div>
          )}
          <div>
            <p className="text-sm font-medium tracking-tight text-on-surface truncate">{identityName}</p>
            <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">{identityMeta}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1">
        {navLinks.map(({ icon, label, href, active }) => (
          <Link
            key={label}
            href={href}
            className={`py-3 pl-8 flex items-center gap-3 transition-all ${
              active
                ? 'text-brand font-bold bg-white rounded-r-full'
                : 'text-on-surface-variant hover:translate-x-1 hover:text-brand'
            }`}
          >
            <span
              className="material-symbols-outlined"
              style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              {icon}
            </span>
            <span className="text-sm font-medium tracking-tight">{label}</span>
          </Link>
        ))}
      </nav>

      {primaryAction && <div className="px-6 pt-4">{primaryAction}</div>}

      {secondaryActions.length > 0 && (
        <div className="mt-6 space-y-1 border-t border-outline-variant/10 pt-4">
          {secondaryActions.map(({ icon, label, href, onClick }) => (
            href ? (
              <Link
                key={label}
                href={href}
                className="text-on-surface-variant py-2 pl-8 hover:translate-x-1 transition-transform flex items-center gap-3 hover:text-brand"
              >
                <span className="material-symbols-outlined">{icon}</span>
                <span className="text-sm font-medium tracking-tight">{label}</span>
              </Link>
            ) : (
              <button
                key={label}
                onClick={onClick}
                className="w-full text-left text-on-surface-variant py-2 pl-8 hover:translate-x-1 transition-transform flex items-center gap-3 hover:text-brand"
              >
                <span className="material-symbols-outlined">{icon}</span>
                <span className="text-sm font-medium tracking-tight">{label}</span>
              </button>
            )
          ))}
        </div>
      )}
    </aside>
  );
}
