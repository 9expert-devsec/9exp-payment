'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Public header shell: sticky at the top, solid white, bottom border, and a
 * soft shadow once the page has scrolled more than 4px. Height comes from the
 * --public-header-h token (globals.css) so sticky elements below can offset by
 * it. z-35 sits above page content (the course dropdown is z-30) and below the
 * mobile bottom bars (z-40) and bottom sheets (z-50).
 */
export function StickyHeader({ children }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'sticky top-0 z-[35] h-[var(--public-header-h)] border-b border-[var(--surface-border)] bg-white transition-shadow duration-[var(--motion-micro)]',
        scrolled && 'shadow-[0_1px_0_var(--surface-border),0_4px_12px_rgba(13,27,42,.06)]'
      )}
    >
      {children}
    </header>
  );
}
