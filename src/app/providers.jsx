'use client';

import { usePathname } from 'next/navigation';
import { ThemeProvider } from 'next-themes';

// Client wrapper for next-themes. Dark is the admin default; the choice
// persists in localStorage and is applied as a `.dark` class on <html> (class
// strategy). The public customer surface is designed light-only, so every
// route outside /admin forces the light theme regardless of that stored choice.
export function Providers({ children }) {
  const pathname = usePathname() || '';
  const isAdmin = pathname.startsWith('/admin');

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      forcedTheme={isAdmin ? undefined : 'light'}
      enableSystem={false}
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  );
}
