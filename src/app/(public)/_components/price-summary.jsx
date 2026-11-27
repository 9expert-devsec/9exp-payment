'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { formatMoney } from '@/lib/format';
import { bahtText } from '@/lib/baht-text';
import { BottomSheet } from '@/components/public/sheet';
import { DangerAlert, PrimaryButton, WarningNote } from '@/components/public/ui';
import { ChevronUpIcon, SpinnerIcon } from '@/components/public/icons';
import { CourseCover } from './course-picker';

export const VAT_NOTICE =
  'รายการข้างต้นต้องเสียภาษีมูลค่าเพิ่ม (VAT 7%) ตามประมวลรัษฎากร มาตรา 77/2 และ 80/1';

// Every figure passed in here comes from computePricing() — the same function
// the server uses for the issued document. Nothing is recomputed in this file.

function Line({ label, value, compact }) {
  return (
    <div className={cn('flex items-center justify-between gap-4', compact ? 'text-[13px]' : 'text-sm')}>
      <span className="text-[var(--text-secondary)]">{label}</span>
      <span className="font-en font-medium text-[var(--text-primary)]">{value}</span>
    </div>
  );
}

/**
 * ราคาต่อท่าน / จำนวน / รวมเป็นเงิน / VAT lines. `compact` = 13px rows, 6px
 * gap (desktop summary card).
 */
export function PriceLines({ pricing, compact, className }) {
  return (
    <div className={cn('flex flex-col', compact ? 'gap-1.5' : 'gap-3.5', className)}>
      <Line compact={compact} label="ราคาต่อท่าน (ก่อน VAT)" value={formatMoney(pricing?.unitPriceExVat)} />
      <Line compact={compact} label="จำนวน" value={`${pricing?.seats ?? 0} ท่าน`} />
      <Line compact={compact} label="รวมเป็นเงิน" value={formatMoney(pricing?.subtotal)} />
      <Line compact={compact} label="ภาษีมูลค่าเพิ่ม 7%" value={formatMoney(pricing?.vatAmount)} />
    </div>
  );
}

/**
 * Brand-tint total box: ยอดเงินสุทธิ + big total + baht text. `compact` =
 * 12x16 padding, 26px figure, 12px baht text (desktop sticky cards).
 */
export function TotalBox({ total, compact, className, children }) {
  return (
    <div className={cn('rounded-xl bg-[var(--brand-tint)]', compact ? 'px-4 py-3' : 'p-4', className)}>
      {children}
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-thai text-sm font-bold text-[var(--text-primary)]">ยอดเงินสุทธิ</span>
        <span className="flex items-baseline gap-1.5">
          <span
            className={cn(
              'font-en font-bold leading-none text-[var(--9e-action)]',
              compact ? 'text-[26px]' : 'text-[32px]'
            )}
          >
            {formatMoney(total)}
          </span>
          <span className="text-sm text-[var(--text-secondary)]">บาท</span>
        </span>
      </div>
      <p className={cn('text-right text-xs text-[var(--text-secondary)]', compact ? 'mt-1' : 'mt-1.5')}>
        ({bahtText(total)})
      </p>
    </div>
  );
}

/**
 * Sticky offset + height cap shared by the desktop right-hand cards: sit 16px
 * under the sticky header and never exceed the viewport (thin inner scroll as
 * a safety net only; the compact layout fits a 1366x768 laptop without it).
 */
export const DESKTOP_STICKY_CARD =
  'lg:sticky lg:top-[calc(var(--public-header-h)+16px)] lg:max-h-[calc(100vh-var(--public-header-h)-32px)] [scrollbar-width:thin]';

/** Desktop sticky summary card (compact so it fits a laptop viewport). */
export function DesktopSummary({ course, pricing, pending, error }) {
  return (
    <aside
      data-summary-card
      className={cn(
        'hidden flex-col gap-3 overflow-y-auto rounded-2xl border border-[var(--surface-border)] bg-white p-5 shadow-[0_12px_32px_rgba(13,27,42,0.08)] lg:flex',
        DESKTOP_STICKY_CARD
      )}
    >
      <h2 className="font-thai text-base font-semibold text-[var(--text-primary)]">สรุปใบเสนอราคา</h2>

      {course ? (
        <div className="flex items-center gap-3">
          <CourseCover course={course} className="h-10 w-[72px] shrink-0 rounded-md" />
          <div className="min-w-0">
            <p className="line-clamp-2 text-sm font-semibold leading-snug text-[var(--text-primary)]">
              {course.courseName}
            </p>
            <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
              <span className="font-en">{formatMoney(course.sellPrice)} ฿</span> / ท่าน (รวม VAT)
            </p>
          </div>
        </div>
      ) : (
        <p className="rounded-xl bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--text-muted)]">
          เลือกหลักสูตรเพื่อดูราคา
        </p>
      )}

      <div className="h-px shrink-0 bg-[var(--surface-border)]" />
      <PriceLines pricing={pricing} compact />
      <div className="h-px shrink-0 bg-[var(--surface-border)]" />

      <TotalBox total={pricing?.total ?? 0} compact />
      <WarningNote compact>{VAT_NOTICE}</WarningNote>

      <DangerAlert>{error}</DangerAlert>

      <PrimaryButton type="submit" className="h-12 shrink-0" disabled={pending}>
        {pending ? <SpinnerIcon /> : null}
        ตรวจสอบใบเสนอราคา
      </PrimaryButton>
      <p className="-mt-1 text-center text-[11px] text-[var(--text-muted)]">
        ใบเสนอราคามีอายุ 30 วัน · ส่ง PDF ไปที่อีเมลผู้ติดต่อ
      </p>
    </aside>
  );
}

/** Mobile sticky bottom bar: total, price-detail sheet link, review button. */
export function MobileSummaryBar({ pricing, pending, error }) {
  const [open, setOpen] = useState(false);
  const seats = pricing?.seats ?? 0;

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--surface-border)] bg-white shadow-[0_-8px_24px_rgba(13,27,42,0.08)] lg:hidden">
        <div className="mx-auto flex max-w-[720px] flex-col gap-3 px-4 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))]">
          <DangerAlert>{error}</DangerAlert>
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-[var(--text-secondary)]">ยอดเงินสุทธิ · {seats} ท่าน</p>
              <p className="flex items-baseline gap-1">
                <span className="font-en text-xl font-bold text-[var(--9e-action)]">
                  {formatMoney(pricing?.total)}
                </span>
                <span className="text-xs text-[var(--text-secondary)]">บาท</span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="flex items-center gap-1 pb-1 text-xs font-medium text-[var(--9e-action)]"
            >
              ดูรายละเอียดราคา
              <ChevronUpIcon className="h-4 w-4" />
            </button>
          </div>
          <PrimaryButton type="submit" disabled={pending}>
            {pending ? <SpinnerIcon /> : null}
            ตรวจสอบใบเสนอราคา
          </PrimaryButton>
        </div>
      </div>

      {open ? (
        <BottomSheet title="รายละเอียดราคา" onClose={() => setOpen(false)}>
          <PriceLines pricing={pricing} />
          <TotalBox total={pricing?.total ?? 0} className="mt-5" />
        </BottomSheet>
      ) : null}
    </>
  );
}
