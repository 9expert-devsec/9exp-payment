'use client';

import { ThemeProvider } from 'next-themes';

// Client wrapper for next-themes. Dark is the default; the choice persists in
// localStorage and is applied as a `.dark` class on <html> (class strategy).
export function Providers({ children }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  );
}
