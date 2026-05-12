'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Users, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { clearAdminToken } from '@/lib/auth';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/users', label: 'Users', icon: Users },
] as const;

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    clearAdminToken();
    router.push('/');
  };

  return (
    <aside className="fixed inset-x-0 top-0 z-10 flex h-20 flex-row items-center border-b border-gray-200 bg-white md:bottom-0 md:right-auto md:h-full md:w-60 md:flex-col md:items-stretch md:border-b-0 md:border-r">
      <div className="shrink-0 px-4 py-3 md:border-b md:border-gray-200 md:px-6 md:py-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#e94560] sm:text-xs">YouAreInvited</p>
        <p className="mt-0.5 text-sm font-semibold text-gray-900">Admin</p>
      </div>

      <nav className="flex flex-1 items-center gap-1 overflow-x-auto px-2 py-3 md:block md:space-y-1 md:px-3 md:py-4">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors md:gap-3 ${
                active
                  ? 'bg-[#e94560]/10 text-[#e94560] md:border-l-2 md:border-[#e94560] md:pl-[10px]'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="shrink-0 px-2 py-3 md:border-t md:border-gray-200 md:px-3 md:py-4">
        <Button
          variant="ghost"
          className="h-10 gap-2 px-3 text-gray-600 hover:text-gray-900 md:w-full md:justify-start md:gap-3"
          onClick={handleLogout}
          aria-label="Logout"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Logout</span>
        </Button>
      </div>
    </aside>
  );
}
