import Link from 'next/link';
import { MailIcon, PhoneIcon } from '@/components/public/icons';
import { StickyHeader } from '@/components/public/sticky-header';
import { PUBLIC_EMAIL, PUBLIC_PHONE, PUBLIC_PHONE_TEL } from '@/lib/public-contact';

/**
 * Shell for the public (customer-facing) surface. Separate from the admin
 * layout: no sidebar, no session, no theme toggle — and always light (see
 * src/app/providers.jsx). A customer arriving from an email link gets a plain
 * branded page. The header is sticky (see StickyHeader); its height is the
 * --public-header-h token.
 *
 * The root layout's <title> says "— Admin", so every public page sets its own.
 */
export default function PublicLayout({ children }) {
  const year = new Date().getFullYear();

  return (
    <div className="flex min-h-full flex-1 flex-col bg-[var(--public-page-bg)] text-[var(--text-primary)]">
      <StickyHeader>
        <div className="mx-auto flex h-full max-w-[720px] items-center justify-between px-4 lg:max-w-[1248px] lg:px-6">
          <div className="flex items-center gap-4">
            <Link href="/" aria-label="9Expert — หน้าแรกใบเสนอราคา" className="shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo-9expert.svg"
                alt="9Expert"
                width={900}
                height={295}
                className="h-[26px] w-auto lg:h-8"
              />
            </Link>
            <span aria-hidden="true" className="hidden h-6 w-px bg-[var(--surface-border)] lg:block" />
            <span className="font-thai hidden text-sm font-bold text-[var(--text-secondary)] lg:block">
              ใบเสนอราคา · หลักสูตรออนไลน์
            </span>
          </div>

          <div className="hidden items-center gap-6 text-sm text-[var(--text-secondary)] lg:flex">
            <a href={PUBLIC_PHONE_TEL} className="flex items-center gap-2 hover:text-[var(--9e-action)]">
              <PhoneIcon className="h-[18px] w-[18px]" />
              {PUBLIC_PHONE}
            </a>
            <a href={`mailto:${PUBLIC_EMAIL}`} className="flex items-center gap-2 hover:text-[var(--9e-action)]">
              <MailIcon className="h-[18px] w-[18px]" />
              {PUBLIC_EMAIL}
            </a>
          </div>

          <a
            href={PUBLIC_PHONE_TEL}
            aria-label={`โทร ${PUBLIC_PHONE}`}
            className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-[var(--surface-border)] text-[var(--text-primary)] lg:hidden"
          >
            <PhoneIcon className="h-5 w-5" />
          </a>
        </div>
      </StickyHeader>

      <main className="flex-1">{children}</main>

      <footer className="bg-[var(--9e-navy)] text-xs text-[#9aa8bb]">
        <div className="mx-auto flex max-w-[720px] flex-col items-center gap-1 px-4 py-6 text-center lg:max-w-[1248px] lg:flex-row lg:justify-between lg:px-6 lg:text-left">
          <p className="lg:order-1">
            Copyright © {year} 9ExpertTraining.com All Rights Reserved
          </p>
          <p className="order-first lg:order-2">
            {PUBLIC_PHONE} · {PUBLIC_EMAIL}
          </p>
        </div>
      </footer>
    </div>
  );
}
