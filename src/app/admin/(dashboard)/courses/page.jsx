import Link from 'next/link';
import { dbConnect } from '@/lib/db/connect';
import Course from '@/models/Course';
import { formatMoney, isPromotionActive } from '@/lib/format';
import { SyncButton } from '@/components/admin/sync-button';
import { Card } from '@/components/ui/card';
import { syncCoursesAction } from './actions';

export const dynamic = 'force-dynamic';

function Badge({ tone = 'muted', children }) {
  const tones = {
    green: 'bg-green-500/15 text-green-700 dark:text-green-400',
    muted: 'bg-[var(--surface-muted)] text-[var(--text-secondary)]',
    red: 'bg-red-500/15 text-red-700 dark:text-red-400',
  };
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

export default async function CoursesPage() {
  await dbConnect();
  const courses = await Course.find({})
    .sort({ sortOrder: 1, courseName: 1 })
    .lean();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          รายการหลักสูตร
        </h1>
        <SyncButton action={syncCoursesAction} />
      </div>

      {courses.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="mb-4 text-[var(--text-secondary)]">
            ยังไม่มีหลักสูตรในระบบ — กดปุ่ม “ซิงค์หลักสูตรจาก MSDB” เพื่อดึงข้อมูล
          </p>
          <div className="flex justify-center">
            <SyncButton action={syncCoursesAction} />
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--surface-border)] text-left text-[var(--text-secondary)]">
                  <th className="px-4 py-3 font-medium">ปก</th>
                  <th className="px-4 py-3 font-medium">หลักสูตร</th>
                  <th className="px-4 py-3 font-medium text-right">ราคา</th>
                  <th className="px-4 py-3 font-medium">โปรโมชัน</th>
                  <th className="px-4 py-3 font-medium">สถานะ</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {courses.map((c) => {
                  const id = String(c._id);
                  const promoActive = isPromotionActive(c);
                  return (
                    <tr
                      key={id}
                      className="border-b border-[var(--surface-border)] last:border-0"
                    >
                      <td className="px-4 py-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={c.coverUrl || ''}
                          alt=""
                          className="h-10 w-16 rounded object-cover bg-[var(--surface-muted)]"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-[var(--text-primary)]">
                          {c.courseName}
                        </div>
                        <div className="text-xs text-[var(--text-muted)]">
                          {c.courseCode}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {!(Number(c.sellPrice) > 0) ? (
                          // Unpriced courses are hidden from the public form.
                          <span
                            title="ยังไม่ตั้งราคา (ไม่แสดงในฟอร์ม)"
                            className="text-[var(--text-muted)]"
                          >
                            —
                          </span>
                        ) : (
                          <>
                            {/* Struck list price only when there is a discount. */}
                            {Number(c.price) > Number(c.sellPrice) ? (
                              <>
                                <span className="text-[var(--text-muted)] line-through">
                                  {formatMoney(c.price)}
                                </span>{' '}
                              </>
                            ) : null}
                            <span className="font-semibold text-[var(--text-primary)]">
                              {formatMoney(c.sellPrice)}
                            </span>
                          </>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {promoActive ? (
                          <Badge tone="green">กำลังโปรโมชัน</Badge>
                        ) : (
                          <Badge tone="muted">—</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {c.isActive ? (
                          <Badge tone="green">แสดง</Badge>
                        ) : (
                          <Badge tone="red">ซ่อน</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/admin/courses/${id}`}
                          className="text-sm font-medium text-[var(--9e-action)] hover:underline"
                        >
                          แก้ไข
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
