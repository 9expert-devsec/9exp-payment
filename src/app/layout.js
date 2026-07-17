import localFont from 'next/font/local';
import './globals.css';
import { Providers } from './providers';

// LINE Seed Sans TH — Thai + headings. Exposed as --font-thai.
const lineSeed = localFont({
  variable: '--font-thai',
  display: 'swap',
  src: [
    { path: '../fonts/LINESeedSansTH_W_Th.woff2', weight: '300', style: 'normal' },
    { path: '../fonts/LINESeedSansTH_W_Rg.woff2', weight: '400', style: 'normal' },
    { path: '../fonts/LINESeedSansTH_W_Bd.woff2', weight: '700', style: 'normal' },
    { path: '../fonts/LINESeedSansTH_W_XBd.woff2', weight: '800', style: 'normal' },
    { path: '../fonts/LINESeedSansTH_W_He.woff2', weight: '900', style: 'normal' },
  ],
});

// Google Sans — body / EN / numerals. Exposed as --font-en.
const googleSans = localFont({
  variable: '--font-en',
  display: 'swap',
  src: [
    { path: '../fonts/GoogleSans-Regular.ttf', weight: '400', style: 'normal' },
    { path: '../fonts/GoogleSans-Medium.ttf', weight: '500', style: 'normal' },
    { path: '../fonts/GoogleSans-SemiBold.ttf', weight: '600', style: 'normal' },
    { path: '../fonts/GoogleSans-Bold.ttf', weight: '700', style: 'normal' },
  ],
});

export const metadata = {
  title: '9Expert Payment — Admin',
  description: 'Quotation management for 9Expert online courses',
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="th"
      suppressHydrationWarning
      className={`${lineSeed.variable} ${googleSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
