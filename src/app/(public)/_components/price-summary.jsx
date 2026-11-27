'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { formatMoney } from '@/lib/format';
import { bahtText } from '@/lib/baht-text';
import { SCHEDULE_URL } from '@/lib/public-contact';
import { BottomSheet } from '@/components/public/sheet';
import { DangerAlert, PrimaryButton, WarningNote } from '@/components/public/ui';
import { ArrowRightIcon, ChevronUpIcon, SpinnerIcon } from '@/components/public/icons';
import { CourseCover } from './course-picker';

export const VAT_NOTICE =
  'รายการข้างต้นต้องเสียภาษีมูลค่าเพิ่ม (VAT 7%) ตามประมวลรัษฎากร มาตรา 77/2 และ 80/1';

// Every figure passed in here comes from computePricing() — the same function
// the server uses for the issued document. Nothing is recomputed in this file.

function Line({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-[var(--text-secondary)]">{label}</span>
      <span className="font-en font-medium text-[var(--text-primary)]">{value}</span>
    </div>
  );
}

/** ราคาต่อท่าน / จำนวน / รวมเป็นเงิน / VAT lines. */
export function PriceLines({ pricing, className }) {
  return (
    <div className={cn('flex flex-col gap-3.5', className)}>
      <Line label="ราคาต่อท่าน (ก่อน VAT)" value={formatMoney(pricing?.unitPriceExVat)} />
      <Line label="จำนวน" value={`${pricing?.seats ?? 0} ท่าน`} />
      <Line label="รวมเป็นเงิน" value={formatMoney(pricing?.subtotal)} />
      <Line label="ภาษีมูลค่าเพิ่ม 7%" value={formatMoney(pricing?.vatAmount)} />
    </div>
  );
}

/** Brand-tint total box: ยอดเงินสุทธิ + big total + baht text. */
export function TotalBox({ total, className, children }) {
  return (
    <div className={cn('rounded-xl bg-[var(--brand-tint)] p-4', className)}>
      {children}
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-thai text-sm font-bold text-[var(--text-primary)]">ยอดเงินสุทธิ</span>
        <span className="flex items-baseline gap-1.5">
          <span className="font-en text-[32px] font-bold leading-none text-[var(--9e-action)]">
            {formatMoney(total)}
          </span>
          <span className="text-sm text-[var(--text-secondary)]">บาท</span>
        </span>
      </div>
      <p className="mt-1.5 text-right text-xs text-[var(--text-secondary)]">
        ({bahtText(total)})
      </p>
    </div>
  );
}

/** Desktop sticky summary card + the navy cross-sell card beneath it. */
export function DesktopSummary({ course, pricing, pending, error }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-[var(--surface-border)] bg-white p-6 shadow-[0_12px_32px_rgba(13,27,42,0.08)]">
        <h2 className="font-thai text-lg font-bold text-[var(--text-primary)]">สรุปใบเสนอราคา</h2>

        {course ? (
          <div className="mt-4 flex items-center gap-3">
            <CourseCover course={course} className="h-[54px] w-24 rounded-md" />
            <div className="min-w-0">
              <p className="line-clamp-2 text-sm font-semibold text-[var(--text-primary)]">
                {course.courseName}
              </p>
              <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                <span className="font-en">{formatMoney(course.sellPrice)} ฿</span> / ท่าน (รวม VAT)
              </p>
            </div>
          </div>
        ) : (
          <p className="mt-4 rounded-xl bg-[var(--surface-muted)] p-4 text-sm text-[var(--text-muted)]">
            เลือกหลักสูตรเพื่อดูราคา
          </p>
        )}

        <div className="my-5 h-px bg-[var(--surface-border)]" />
        <PriceLines pricing={pricing} />
        <div className="my-5 h-px bg-[var(--surface-border)]" />

        <TotalBox total={pricing?.total ?? 0} />
        <WarningNote className="mt-4">{VAT_NOTICE}</WarningNote>

        <DangerAlert className="mt-4">{error}</DangerAlert>

        <PrimaryButton type="submit" className="mt-4" disabled={pending}>
          {pending ? <SpinnerIcon /> : null}
          ตรวจสอบใบเสนอราคา
        </PrimaryButton>
        <p className="mt-3 text-center text-xs text-[var(--text-muted)]">
          ใบเสนอราคามีอายุ 30 วัน · ส่ง PDF ไปที่อีเมลผู้ติดต่อ
        </p>
      </div>

      <div className="rounded-2xl bg-[var(--9e-navy)] p-5">
        <p className="font-thai text-sm font-bold text-white">
          สนใจเรียนแบบ Virtual Training หรือ Classroom?
        </p>
        <p className="mt-1.5 text-xs text-[#9aa8bb]">
          รู้ลึก สอนสไตล์ใช้งานจริง ด้วยวิทยากรมากประสบการณ์
        </p>
        <a
          href={SCHEDULE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-[var(--9e-lime)] hover:underline"
        >
          ดูหลักสูตรทั้งหมด
          <ArrowRightIcon className="h-4 w-4" />
        </a>
      </div>
    </div>
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
