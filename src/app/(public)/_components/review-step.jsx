'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { formatMoney } from '@/lib/format';
import { MobileProgress, Stepper } from '@/components/public/stepper';
import {
  DangerAlert,
  PrimaryButton,
  PublicCheckbox,
  SecondaryButton,
} from '@/components/public/ui';
import {
  ArrowLeftIcon,
  ExpandIcon,
  FileIcon,
  MailIcon,
  PencilIcon,
  SpinnerIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from '@/components/public/icons';
import { BottomSheet } from '@/components/public/sheet';
import { DESKTOP_STICKY_CARD, TotalBox } from './price-summary';

// A4 at 96 dpi — the size the document template is laid out for.
const PAGE_W = 794;
const PAGE_H = 1123;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 1.5;

/**
 * The quotation document, rendered from server-built HTML inside an iframe with
 * an EMPTY sandbox: no scripts, no same-origin access, no navigation. The HTML
 * holds customer-typed text (escaped by the template, but the sandbox is the
 * real boundary). Scaled with a transform so it keeps the PDF's layout.
 */
function ScaledPage({ html, scale }) {
  return (
    <div
      className="relative mx-auto shrink-0 overflow-hidden bg-white shadow-[0_8px_24px_rgba(13,27,42,0.12)]"
      style={{ width: PAGE_W * scale, height: PAGE_H * scale }}
    >
      <iframe
        sandbox=""
        srcDoc={html}
        title="ตัวอย่างใบเสนอราคา"
        className="absolute left-0 top-0 border-0 bg-white"
        style={{
          width: PAGE_W,
          height: PAGE_H,
          transform: `scale(${scale})`,
          transformOrigin: '0 0',
        }}
      />
    </div>
  );
}

function PageSkeleton({ scale }) {
  return (
    <div
      aria-label="กำลังสร้างตัวอย่างใบเสนอราคา"
      className="mx-auto flex shrink-0 animate-pulse flex-col gap-4 bg-white p-[6%] shadow-[0_8px_24px_rgba(13,27,42,0.12)]"
      style={{ width: PAGE_W * scale, height: PAGE_H * scale }}
    >
      <div className="h-[11%] rounded bg-[#e6ebf2]" />
      <div className="h-[16%] rounded bg-[#eef2f7]" />
      <div className="h-[30%] rounded bg-[#eef2f7]" />
      <div className="h-[22%] rounded bg-[#eef2f7]" />
    </div>
  );
}

/** Width of an element, tracked with a ResizeObserver. */
function useWidth() {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}

function PreviewPill() {
  return (
    <span className="rounded-md bg-[var(--warning-bg)] px-2 py-0.5 text-xs font-medium text-[var(--warning)]">
      PREVIEW · ยังไม่ออกเลขที่จริง
    </span>
  );
}

/** Desktop preview panel: toolbar with zoom, grey stage, scaled page. */
function DesktopPreview({ html }) {
  const [stageRef, stageWidth] = useWidth();
  const [zoom, setZoom] = useState(null); // null = fit to width
  const fit = stageWidth > 0 ? Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, stageWidth / PAGE_W)) : 0.8;
  const scale = zoom ?? fit;
  const pct = Math.round(scale * 100);

  function step(delta) {
    const next = Math.round((scale + delta) * 10) / 10;
    setZoom(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, next)));
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--surface-border)] bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--surface-border)] px-6 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <FileIcon className="h-5 w-5 shrink-0 text-[var(--9e-action)]" />
          <span className="font-thai text-sm font-bold">ตัวอย่างใบเสนอราคา</span>
          <PreviewPill />
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => step(-0.1)}
            disabled={scale <= ZOOM_MIN}
            aria-label="ย่อ"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--surface-border)] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] disabled:opacity-40"
          >
            <ZoomOutIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setZoom(null)}
            title="พอดีความกว้าง"
            className="font-en h-8 min-w-14 rounded-lg border border-[var(--surface-border)] px-2 text-sm text-[var(--text-primary)] hover:bg-[var(--surface-muted)]"
          >
            {pct}%
          </button>
          <button
            type="button"
            onClick={() => step(0.1)}
            disabled={scale >= ZOOM_MAX}
            aria-label="ขยาย"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--surface-border)] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] disabled:opacity-40"
          >
            <ZoomInIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="overflow-auto bg-[#e6ebf2] p-8">
        <div ref={stageRef} className="w-full">
          {html ? <ScaledPage html={html} scale={scale} /> : <PageSkeleton scale={scale} />}
        </div>
      </div>
    </div>
  );
}

/** Mobile preview card: fit-to-width page + full-screen viewer. */
function MobilePreview({ html }) {
  const [stageRef, stageWidth] = useWidth();
  const [full, setFull] = useState(false);
  const scale = stageWidth > 0 ? stageWidth / PAGE_W : 0.4;

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--surface-border)] bg-white">
      <div className="flex items-center justify-between px-4 py-3">
        <span className="font-thai text-sm font-bold">ตัวอย่างใบเสนอราคา</span>
        <button
          type="button"
          onClick={() => setFull(true)}
          disabled={!html}
          className="flex items-center gap-1 text-sm font-medium text-[var(--9e-action)] disabled:opacity-40"
        >
          <ExpandIcon className="h-4 w-4" />
          ดูเต็มจอ
        </button>
      </div>
      <div className="bg-[#e6ebf2] p-4">
        <div ref={stageRef} className="w-full">
          {html ? <ScaledPage html={html} scale={scale} /> : <PageSkeleton scale={scale} />}
        </div>
      </div>

      {full && html ? <FullscreenViewer html={html} onClose={() => setFull(false)} /> : null}
    </div>
  );
}

/** Full-screen document viewer: the page at 100%, scrollable and pinch-zoomable. */
function FullscreenViewer({ html, onClose }) {
  return (
    <BottomSheet title="ตัวอย่างใบเสนอราคา" onClose={onClose} className="h-[100dvh] max-h-[100dvh] rounded-none">
      <div className="-mx-4 overflow-auto bg-[#e6ebf2] p-3">
        <ScaledPage html={html} scale={1} />
      </div>
    </BottomSheet>
  );
}

// ---------------------------------------------------------------------------
// Details column
// ---------------------------------------------------------------------------

function Group({ title, onEdit, compact, children }) {
  return (
    <div className={cn('first:pt-0', compact ? 'py-3' : 'py-5')}>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs text-[var(--text-muted)]">{title}</span>
        <button
          type="button"
          onClick={onEdit}
          className="flex items-center gap-1 text-xs font-medium text-[var(--9e-action)] hover:underline"
        >
          <PencilIcon className="h-3.5 w-3.5" />
          แก้ไข
        </button>
      </div>
      {children}
    </div>
  );
}

function DetailGroups({ summary, onEdit, compact }) {
  const s = summary;
  const g = { compact };
  return (
    <div className="divide-y divide-[var(--surface-border)]">
      <Group {...g} title="หลักสูตร" onEdit={() => onEdit('card-course')}>
        <p className="font-semibold text-[var(--text-primary)]">{s.courseName}</p>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          <span className="font-en">{formatMoney(s.sellPrice)} ฿</span> / ท่าน (รวม VAT) · {s.seats} ท่าน
        </p>
      </Group>
      <Group {...g} title="ผู้ติดต่อ" onEdit={() => onEdit('card-contact')}>
        <p className="font-semibold text-[var(--text-primary)]">{s.coordinatorName}</p>
        <p className="mt-1 break-words text-sm text-[var(--text-secondary)]">
          {s.coordinatorEmail} · {s.coordinatorPhone}
        </p>
      </Group>
      <Group {...g} title={`ผู้เรียน ${s.seats} ท่าน`} onEdit={() => onEdit('card-attendees')}>
        <ul className="flex flex-col gap-1 text-sm text-[var(--text-secondary)]">
          {s.attendeeEmails.map((email, i) => (
            <li key={`${email}-${i}`} className="break-words">
              {email}
            </li>
          ))}
          {s.unnamedCount > 0 ? (
            <li>ยังไม่ระบุ {s.unnamedCount} ท่าน — แจ้งภายหลังได้</li>
          ) : null}
        </ul>
      </Group>
      <Group {...g} title="ออกในนาม" onEdit={() => onEdit('card-invoice')}>
        <p className="font-semibold text-[var(--text-primary)]">{s.billedTo}</p>
        {s.taxId ? (
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            เลขผู้เสียภาษี <span className="font-en">{s.taxId}</span>
          </p>
        ) : null}
      </Group>
    </div>
  );
}

function DetailsSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-5" aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex flex-col gap-2">
          <div className="h-3 w-16 rounded bg-[#eef2f7]" />
          <div className="h-4 w-3/4 rounded bg-[#e6ebf2]" />
          <div className="h-3 w-1/2 rounded bg-[#eef2f7]" />
        </div>
      ))}
    </div>
  );
}

function TotalLines({ summary, compact }) {
  return (
    <div className={cn('flex flex-col', compact ? 'mb-2 gap-1.5 text-[13px]' : 'mb-3 gap-2 text-sm')}>
      <div className="flex justify-between">
        <span className="text-[var(--text-secondary)]">รวมเป็นเงิน</span>
        <span className="font-en font-medium">{formatMoney(summary.subtotal)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-[var(--text-secondary)]">ภาษีมูลค่าเพิ่ม 7%</span>
        <span className="font-en font-medium">{formatMoney(summary.vatAmount)}</span>
      </div>
    </div>
  );
}

function ConfirmCheck({ id, checked, onChange, disabled }) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center gap-2.5 text-sm text-[var(--text-primary)]">
      <PublicCheckbox
        id={id}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      ตรวจสอบแล้ว ข้อมูลถูกต้อง
    </label>
  );
}

// ---------------------------------------------------------------------------
// Step 2
// ---------------------------------------------------------------------------

/**
 * @param {object} props
 * @param {string|null} props.html     Preview document HTML (null while loading).
 * @param {object|null} props.summary  Plain values from previewQuotationAction.
 * @param {(cardId?: string) => void} props.onBack  Return to step 1 (optionally to a card).
 * @param {() => void} props.onConfirm Issue the quotation.
 * @param {boolean} props.pending      Confirm in flight.
 * @param {string|null} props.error    Confirm error.
 */
export function ReviewStep({ html, summary, onBack, onConfirm, pending, error }) {
  const [checked, setChecked] = useState(false);
  const ready = Boolean(html && summary);
  const canConfirm = ready && checked && !pending;
  const email = summary?.coordinatorEmail || '';

  const backLink = (
    <button
      type="button"
      onClick={() => onBack()}
      disabled={pending}
      className="flex items-center gap-1.5 text-sm font-medium text-[var(--9e-action)] hover:underline disabled:opacity-50"
    >
      <ArrowLeftIcon className="h-4 w-4" />
      <span className="lg:hidden">กลับไปแก้ไข</span>
      <span className="hidden lg:inline">กลับไปแก้ไขข้อมูล</span>
    </button>
  );

  return (
    <div className="pb-48 lg:pb-0">
      {/* ---- Hero ---- */}
      <MobileProgress current={2} className="mb-4 lg:hidden" />
      <div className="mb-6 lg:mb-0">
        {backLink}
        <h1 className="font-thai mt-3 text-2xl font-bold text-[var(--text-primary)] lg:text-[32px] lg:leading-tight">
          ตรวจสอบใบเสนอราคา
        </h1>
        <p className="mt-2 hidden text-[var(--text-secondary)] lg:block">
          เอกสารจริงจะออกในรูปแบบนี้ กรุณาตรวจสอบความถูกต้องก่อนยืนยัน
        </p>
      </div>
      {/* Desktop stepper: its own centered row, same placement as step 1. */}
      <Stepper current={2} className="hidden justify-center lg:my-8 lg:flex" />

      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start lg:gap-8">
        {/* ---- Preview ---- */}
        <div className="hidden lg:block">
          <DesktopPreview html={html} />
        </div>
        <div className="lg:hidden">
          <MobilePreview html={html} />
        </div>

        {/* ---- Details (desktop card) ---- */}
        {/* Compact and capped to the viewport: only the group list scrolls; the
            total, checkbox and buttons stay pinned at the bottom of the card. */}
        <aside
          data-review-card
          className={cn(
            'hidden flex-col overflow-hidden rounded-2xl border border-[var(--surface-border)] bg-white p-5 lg:flex',
            DESKTOP_STICKY_CARD
          )}
        >
          <h2 className="font-thai mb-3 shrink-0 text-base font-semibold">รายละเอียดคำขอ</h2>
          <div data-review-groups className="-mr-2 min-h-0 flex-1 overflow-y-auto pr-2 [scrollbar-width:thin]">
            {summary ? <DetailGroups summary={summary} onEdit={onBack} compact /> : <DetailsSkeleton />}
          </div>
          <div className="flex shrink-0 flex-col gap-3 border-t border-[var(--surface-border)] pt-3">
            {summary ? (
              <TotalBox total={summary.total} compact>
                <TotalLines summary={summary} compact />
              </TotalBox>
            ) : null}
            <ConfirmCheck id="confirm-desktop" checked={checked} onChange={setChecked} disabled={!ready || pending} />
            <DangerAlert>{error}</DangerAlert>
            <PrimaryButton className="h-12" onClick={onConfirm} disabled={!canConfirm}>
              {pending ? <SpinnerIcon /> : null}
              ยืนยันและส่งใบเสนอราคา
            </PrimaryButton>
            <SecondaryButton className="h-12" onClick={() => onBack()} disabled={pending}>
              ย้อนกลับไปแก้ไข
            </SecondaryButton>
            <div className="flex gap-2 rounded-xl bg-[var(--surface-muted)] px-3 py-2 text-[11px] leading-relaxed text-[var(--text-secondary)]">
              <MailIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <p>
                ระบบจะออกเลขที่ใบเสนอราคาและส่งไฟล์ PDF ไปที่{' '}
                <span className="break-words">{email}</span>
              </p>
            </div>
          </div>
        </aside>

        {/* ---- Details (mobile) ---- */}
        <div className="flex flex-col gap-4 lg:hidden">
          <div className="rounded-2xl border border-[var(--surface-border)] bg-white px-4 py-5">
            {summary ? <DetailGroups summary={summary} onEdit={onBack} /> : <DetailsSkeleton />}
          </div>
          {summary ? (
            <TotalBox total={summary.total}>
              <TotalLines summary={summary} />
            </TotalBox>
          ) : null}
        </div>
      </div>

      {/* ---- Mobile sticky confirm bar ---- */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--surface-border)] bg-white shadow-[0_-8px_24px_rgba(13,27,42,0.08)] lg:hidden">
        <div className="mx-auto flex max-w-[720px] flex-col gap-3 px-4 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))]">
          <DangerAlert>{error}</DangerAlert>
          <ConfirmCheck id="confirm-mobile" checked={checked} onChange={setChecked} disabled={!ready || pending} />
          <PrimaryButton onClick={onConfirm} disabled={!canConfirm}>
            {pending ? <SpinnerIcon /> : null}
            ยืนยันและส่งใบเสนอราคา
          </PrimaryButton>
          <p className="text-center text-xs text-[var(--text-muted)]">
            ระบบจะส่งไฟล์ PDF ไปที่ <span className="break-words">{email}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

