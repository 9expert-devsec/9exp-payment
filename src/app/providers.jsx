'use client';

import { usePathname } from 'next/navigation';
import { ThemeProvider } from 'next-themes';

// Client wrapper for next-themes. The admin (login included) opens LIGHT by
// default; the header toggle lets each admin switch to dark, and next-themes
// persists that choice in this browser's localStorage and restores it on the
// next admin visit. The theme is applied as a `.dark` class on <html> (class
// strategy). The public customer surface is designed light-only, so every
// route outside /admin forces the light theme regardless of that stored choice.
export function Providers({ children }) {
  const pathname = usePathname() || '';
  const isAdmin = pathname.startsWith('/admin');

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      forcedTheme={isAdmin ? undefined : 'light'}
      enableSystem={false}
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  );
}
