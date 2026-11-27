import Link from 'next/link';
import mongoose from 'mongoose';
import { notFound } from 'next/navigation';
import { dbConnect } from '@/lib/db/connect';
import Quotation from '@/models/Quotation';
import { auth } from '@/lib/auth/options';
import { canViewQuotation } from '@/lib/quotation-access';
import { formatMoney, formatBuddhistDate } from '@/lib/format';
import { Stepper } from '@/components/public/stepper';
import { CheckIcon, FileIcon, PlusIcon } from '@/components/public/icons';
import { ResendButton } from './resend-button';

export const dynamic = 'force-dynamic';
// The resend action on this page renders the PDF with Chromium before sending;
// cold starts need the headroom (server actions inherit the page's limit).
export const maxDuration = 60;

// The URL carries the access token: keep it out of search indexes and out of
// the Referer header sent to any page linked from here.
export const metadata = {
  title: 'ใบเสนอราคา — 9Expert',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

const QUOTE_VALID_DAYS = 30;

/** The three "what happens next" items, each with a lime numbered dot. */
const NEXT_STEPS = [
  {
    title: 'ชำระเงิน',
    body: 'โอนเข้าบัญชี บจก.นายน์เอ็กซ์เพิร์ท ธนาคารไทยพาณิชย์ (SCB) สาขาสยามสแควร์ เลขที่บัญชี 038-458929-7',
  },
  {
    title: 'ส่งหลักฐานการโอน',
    body: 'ส่งสำเนาใบนำฝากที่ training@9expert.co.th โดยระบุชื่อผู้เข้าอบรม และวันที่เริ่มอบรม',
  },
  {
    title: 'เริ่มเรียนได้ทันทีที่อนุมัติ',
    body: 'อนุมัติภายใน 3 วันทำการ แล้วเข้าเรียนที่ academy.9experttraining.com ได้ 365 วัน',
  },
];

/** Small labelled tile in the quotation card. */
function MetaTile({ label, value, className = '' }) {
  return (
    <div className={`rounded-xl bg-[var(--surface-muted)] px-4 py-3 ${className}`}>
      <p className="text-xs text-[var(--text-muted)]">{label}</p>
      <p className="mt-1 truncate text-sm font-bold text-[var(--text-primary)]">{value}</p>
    </div>
  );
}

export default async function QuotationSuccessPage({ params, searchParams }) {
  const { id } = await params;
  const { t } = await searchParams;
  if (!mongoose.isValidObjectId(id)) notFound();

  await dbConnect();
  const doc = await Quotation.findById(id).lean();
  if (!doc) notFound();

  // 404 (not 403) on denial, so the response does not confirm the id exists.
  const session = await auth();
  if (!canViewQuotation(doc, t, session)) notFound();
  const pdfHref =
    typeof t === 'string' && t
      ? `/api/pdf/${id}?t=${encodeURIComponent(t)}`
      : `/api/pdf/${id}`;

  const pricing = doc.pricing || {};
  const coordinator = doc.coordinator || {};
  const coordinatorName = [coordinator.firstName, coordinator.lastName]
    .filter(Boolean)
    .join(' ');

  const createdAt = doc.createdAt ? new Date(doc.createdAt) : new Date();
  const validUntil = new Date(createdAt.getTime() + QUOTE_VALID_DAYS * 24 * 60 * 60 * 1000);
  const invoice = doc.invoice || {};
  const billedTo =
    invoice.type === 'corporate' ? invoice.companyName || '—' : coordinatorName || '—';
  const seats = pricing.seats ?? doc.attendeesCount ?? 0;

  return (
    <div className="mx-auto max-w-[720px] px-4 pt-8 pb-12 lg:pt-10 lg:pb-16">
      <Stepper current={4} className="mb-8 hidden justify-center lg:flex" />

      <div className="text-center">
        <div className="mx-auto flex h-[72px] w-[72px] items-center justify-center rounded-full bg-[var(--success-bg)] text-[var(--success)] lg:h-20 lg:w-20">
          <CheckIcon className="h-9 w-9 lg:h-10 lg:w-10" strokeWidth={2} />
        </div>
        <h1 className="font-thai mt-5 text-2xl font-bold text-[var(--text-primary)] lg:mt-6 lg:text-[32px]">
          ส่งใบเสนอราคาเรียบร้อยแล้ว
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-[var(--text-secondary)] lg:text-base">
          เราได้ส่งใบเสนอราคาเลขที่ <span className="font-en">{doc.quotationNo}</span> ไปที่{' '}
          <span className="break-words">{coordinator.email}</span> แล้ว
          <br />
          หากไม่พบอีเมล กรุณาตรวจสอบในกล่อง Junk / Spam
        </p>
      </div>

      {/* ---- Quotation card ---- */}
      <section className="mt-8 rounded-2xl border border-[var(--surface-border)] bg-white p-4 shadow-[0_12px_32px_rgba(13,27,42,0.06)] lg:p-7">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <span className="hidden h-[52px] w-[52px] shrink-0 items-center justify-center rounded-xl bg-[var(--brand-tint)] text-[var(--9e-action)] lg:flex">
              <FileIcon className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <p className="text-xs text-[var(--text-muted)] lg:hidden">เลขที่ใบเสนอราคา</p>
              <p className="font-en text-xl font-bold text-[var(--text-primary)]">
                {doc.quotationNo}
              </p>
              <p className="mt-0.5 hidden truncate text-sm text-[var(--text-secondary)] lg:block">
                {doc.course?.courseName || '—'} · {seats} ท่าน
              </p>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-xs text-[var(--text-muted)]">ยอดเงินสุทธิ</p>
            <p className="font-en text-xl font-bold text-[var(--9e-action)]">
              {formatMoney(pricing.total)} ฿
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-3">
          <MetaTile label="วันที่ออก" value={formatBuddhistDate(createdAt)} />
          <MetaTile label="ยืนราคาถึง" value={formatBuddhistDate(validUntil)} />
          <MetaTile label="ออกในนาม" value={billedTo} className="hidden lg:block" />
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-2">
          <a
            href={pdfHref}
            target="_blank"
            rel="noopener noreferrer"
            className="font-thai flex h-[52px] w-full items-center justify-center rounded-xl bg-[var(--9e-action)] px-6 text-base font-bold text-white transition-colors hover:bg-[#004fe0] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(36,134,255,0.3)]"
          >
            ดาวน์โหลด PDF
          </a>
          <ResendButton id={id} token={typeof t === 'string' ? t : undefined} />
        </div>
      </section>

      {/* ---- Next steps ---- */}
      <section className="mt-5 rounded-2xl border border-[var(--surface-border)] bg-white p-4 lg:p-7">
        <h2 className="font-thai text-base font-bold text-[var(--text-primary)] lg:text-lg">
          ขั้นตอนถัดไป
        </h2>
        <ol className="mt-4 flex flex-col gap-4">
          {NEXT_STEPS.map((item, i) => (
            <li key={item.title} className="flex gap-3">
              <span className="font-en flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--9e-lime)] text-sm font-bold text-[var(--9e-navy)]">
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-[var(--text-primary)]">{item.title}</p>
                <p className="mt-0.5 text-sm text-[var(--text-secondary)]">{item.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <div className="mt-6 text-center">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-bold text-[var(--9e-action)] hover:underline"
        >
          <PlusIcon className="h-4 w-4" />
          ขอใบเสนอราคาหลักสูตรอื่น
        </Link>
      </div>
    </div>
  );
}
