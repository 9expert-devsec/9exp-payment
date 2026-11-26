import Link from 'next/link';
import mongoose from 'mongoose';
import { notFound } from 'next/navigation';
import { dbConnect } from '@/lib/db/connect';
import Quotation from '@/models/Quotation';
import { auth } from '@/lib/auth/options';
import { canViewQuotation } from '@/lib/quotation-access';
import { formatMoney, formatBuddhistDate } from '@/lib/format';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

// The URL carries the access token: keep it out of search indexes and out of
// the Referer header sent to any page linked from here.
export const metadata = {
  title: 'ใบเสนอราคา — 9Expert',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

/** One label/value row in the summary tables. */
function Row({ label, value, strong = false }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <span className="text-[var(--text-secondary)]">{label}</span>
      <span
        className={
          strong
            ? 'text-right font-semibold text-[var(--text-primary)]'
            : 'text-right text-[var(--text-primary)]'
        }
      >
        {value}
      </span>
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

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-2xl dark:bg-green-900/40">
          ✓
        </div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">
          สร้างใบเสนอราคาเรียบร้อยแล้ว
        </h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          เลขที่ใบเสนอราคาของคุณคือ
        </p>
        <p className="mt-1 text-2xl font-bold tracking-wide text-[var(--9e-action)]">
          {doc.quotationNo}
        </p>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          วันที่ {formatBuddhistDate(doc.createdAt)}
        </p>
      </div>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>รายละเอียด</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-[var(--surface-border)]">
          <div className="pb-2">
            <Row label="หลักสูตร" value={doc.course?.courseName || '—'} />
            <Row label="รหัสหลักสูตร" value={doc.course?.courseCode || '—'} />
            <Row label="จำนวนผู้เข้าอบรม" value={`${pricing.seats ?? 0} คน`} />
            {!doc.attendeesListProvided && (
              <p className="pt-1 text-xs text-[var(--text-muted)]">
                ยังไม่ได้ระบุรายชื่อผู้เข้าอบรม — แจ้งรายชื่อภายหลังได้
              </p>
            )}
          </div>

          <div className="py-2">
            <Row label="ผู้ประสานงาน" value={coordinatorName || '—'} />
            <Row label="อีเมล" value={coordinator.email || '—'} />
            <Row label="เบอร์โทรศัพท์" value={coordinator.phone || '—'} />
          </div>

          <div className="pt-2">
            <Row
              label="ราคาต่อคน (ก่อน VAT)"
              value={formatMoney(pricing.unitPriceExVat)}
            />
            <Row label="รวมราคา" value={formatMoney(pricing.subtotal)} />
            <Row label="ภาษีมูลค่าเพิ่ม 7%" value={formatMoney(pricing.vatAmount)} />
            <Row
              label="ยอดเงินสุทธิ"
              value={`${formatMoney(pricing.total)} บาท`}
              strong
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row">
        <a
          href={pdfHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-11 flex-1 items-center justify-center rounded-[var(--radius-md)] bg-[var(--9e-action)] px-6 text-base font-medium text-white transition-colors hover:bg-[var(--9e-brand)]"
        >
          เปิดใบเสนอราคา (PDF)
        </a>
        <Link
          href="/"
          className="inline-flex h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--surface-border)] bg-[var(--surface)] px-6 text-base font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-muted)]"
        >
          ขอใบเสนอราคาใหม่
        </Link>
      </div>

      <p className="mt-6 rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-4 text-sm text-[var(--text-secondary)]">
        กรุณาบันทึกหรือดาวน์โหลดไฟล์ PDF ไว้
        การส่งใบเสนอราคาทางอีเมลอัตโนมัติจะเปิดให้บริการเร็ว ๆ นี้ —
        หากต้องการรับทางอีเมลตอนนี้ กรุณาติดต่อ training@9expert.co.th
      </p>
    </div>
  );
}
