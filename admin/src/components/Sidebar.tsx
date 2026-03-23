'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { clearAdminToken } from '@/lib/auth';

const links = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/users', label: 'Users' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    clearAdminToken();
    router.push('/');
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-secondary flex flex-col p-6 z-20">
      <div className="mb-8">
        <p className="text-accent font-bold tracking-widest text-xs uppercase">YouAreInvited</p>
        <p className="text-light text-xs mt-1">Platform Admin</p>
      </div>
      <nav className="flex-1 space-y-1">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`block px-4 py-2 rounded-lg text-sm transition-colors ${
              pathname.startsWith(l.href)
                ? 'bg-accent text-white font-semibold'
                : 'text-light hover:bg-primary'
            }`}
          >
            {l.label}
          </Link>
        ))}
      </nav>
      <button
        onClick={handleLogout}
        className="text-light text-sm hover:text-accent transition-colors text-left"
      >
        Sign Out
      </button>
    </aside>
  );
}
