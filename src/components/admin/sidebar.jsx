'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/admin/courses', label: 'รายการหลักสูตร' },
  { href: '/admin/quotations', label: 'ใบเสนอราคา' },
];

function NavLinks({ pathname, onNavigate }) {
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => {
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              'rounded-[var(--radius-md)] px-3 py-2 text-sm font-medium transition-colors duration-[var(--motion-micro)]',
              active
                ? 'bg-[var(--9e-action)] text-white'
                : 'text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]'
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden w-60 shrink-0 border-r border-[var(--surface-border)] bg-[var(--surface)] p-4 md:block">
      <div className="mb-6 px-3 text-xl font-bold text-[var(--9e-brand)]">
        9Expert
      </div>
      <NavLinks pathname={pathname} />
    </aside>
  );
}

// Mobile version: horizontal nav shown under the header on small screens.
export function MobileNav() {
  const pathname = usePathname();
  return (
    <div className="border-b border-[var(--surface-border)] bg-[var(--surface)] p-2 md:hidden">
      <NavLinks pathname={pathname} />
    </div>
  );
}
