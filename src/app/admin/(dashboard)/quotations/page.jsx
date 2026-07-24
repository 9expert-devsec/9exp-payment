import Link from 'next/link';
import { dbConnect } from '@/lib/db/connect';
import Quotation from '@/models/Quotation';
import { formatMoney, formatBuddhistDate } from '@/lib/format';
import { Card } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 20;

export default async function QuotationsPage({ searchParams }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp?.page) || 1);

  await dbConnect();
  const total = await Quotation.countDocuments({});
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const current = Math.min(page, totalPages);

  const rows = await Quotation.find({})
    .sort({ createdAt: -1 })
    .skip((current - 1) * PAGE_SIZE)
    .limit(PAGE_SIZE)
    .lean();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-[var(--text-primary)]">ใบเสนอราคา</h1>

      {rows.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-[var(--text-secondary)]">
            ยังไม่มีใบเสนอราคาในระบบ
          </p>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            ใบเสนอราคาจะปรากฏที่นี่เมื่อเริ่มใช้งานแบบฟอร์มสาธารณะ
          </p>
        </Card>
      ) : (
        <>
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--surface-border)] text-left text-[var(--text-secondary)]">
                    <th className="px-4 py-3 font-medium">เลขที่</th>
                    <th className="px-4 py-3 font-medium">วันที่</th>
                    <th className="px-4 py-3 font-medium">หลักสูตร</th>
                    <th className="px-4 py-3 font-medium">ผู้ติดต่อ</th>
                    <th className="px-4 py-3 font-medium text-right">ยอดสุทธิ</th>
                    <th className="px-4 py-3 font-medium">PDF</th>
                    <th className="px-4 py-3 font-medium">อีเมล</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((q) => {
                    const id = String(q._id);
                    const coord = q.coordinator || {};
                    return (
                      <tr
                        key={id}
                        className="border-b border-[var(--surface-border)] last:border-0"
                      >
                        <td className="px-4 py-3 font-medium text-[var(--text-primary)] whitespace-nowrap">
                          {q.quotationNo}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-[var(--text-secondary)]">
                          {formatBuddhistDate(q.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-[var(--text-primary)]">
                          {q.course?.courseName || '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-[var(--text-primary)]">
                            {[coord.firstName, coord.lastName].filter(Boolean).join(' ') || '—'}
                          </div>
                          <div className="text-xs text-[var(--text-muted)]">
                            {coord.email || ''}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap font-semibold text-[var(--text-primary)]">
                          {formatMoney(q.pricing?.total)}
                        </td>
                        {/* PDFs are rendered on demand from the stored snapshot,
                            not saved to storage, so every row always has a link.
                            `pdfUrl` stays in the schema for Phase 4, which may
                            persist a rendered copy. */}
                        <td className="px-4 py-3">
                          <a
                            href={`/api/pdf/${id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[var(--9e-action)] hover:underline"
                          >
                            เปิด
                          </a>
                        </td>
                        <td className="px-4 py-3">
                          {q.emailSentAt ? (
                            <span className="text-green-600 dark:text-green-400">
                              ส่งแล้ว
                            </span>
                          ) : (
                            <span className="text-[var(--text-muted)]">ยังไม่ส่ง</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--text-secondary)]">
                หน้า {current} จาก {totalPages} · ทั้งหมด {total} รายการ
              </span>
              <div className="flex gap-2">
                {current > 1 && (
                  <Link
                    href={`/admin/quotations?page=${current - 1}`}
                    className="rounded-[var(--radius-md)] border border-[var(--surface-border)] px-3 py-1.5 text-[var(--text-primary)] hover:bg-[var(--surface-muted)]"
                  >
                    ก่อนหน้า
                  </Link>
                )}
                {current < totalPages && (
                  <Link
                    href={`/admin/quotations?page=${current + 1}`}
                    className="rounded-[var(--radius-md)] border border-[var(--surface-border)] px-3 py-1.5 text-[var(--text-primary)] hover:bg-[var(--surface-muted)]"
                  >
                    ถัดไป
                  </Link>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
