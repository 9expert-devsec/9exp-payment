'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { courseZoneBSchema } from '@/lib/validation/course';
import { saveCourseAction } from '../actions';
import { formatMoney } from '@/lib/format';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';

const VAT_RATE = 7; // percent, VAT-inclusive model

export function CourseEditForm({ id, initial }) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(courseZoneBSchema),
    defaultValues: initial,
  });

  const price = Number(watch('price')) || 0;
  const sellPrice = Number(watch('sellPrice')) || 0;
  const promotionStart = watch('promotionStart');
  const promotionEnd = watch('promotionEnd');

  // sellPrice is VAT-INCLUSIVE — derive the ex-VAT figure, do not treat it as pre-tax.
  const vatAmount = sellPrice - sellPrice / (100 + VAT_RATE) * VAT_RATE;
  const exVat = sellPrice - vatAmount;
  const promoSavings = price > sellPrice ? price - sellPrice : 0;

  // Non-blocking warnings.
  const warnSellGtPrice = sellPrice > price && price > 0;
  const onlyOneDate = !!promotionStart !== !!promotionEnd;

  async function onSubmit(values) {
    setSaved(false);
    setSaveError(null);
    try {
      const r = await saveCourseAction(id, values);
      if (r?.ok) {
        setSaved(true);
        router.refresh();
      } else {
        setSaveError('บันทึกไม่สำเร็จ');
      }
    } catch (err) {
      setSaveError(String(err?.message || err));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      {/* Zone A — read-only mirror of MSDB */}
      <Card>
        <CardHeader>
          <CardTitle>ข้อมูลจาก MSDB (แก้ไขไม่ได้)</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-xs text-[var(--text-muted)]">
            ฟิลด์เหล่านี้ซิงค์มาจาก MSDB และเป็นแบบอ่านอย่างเดียว —
            แก้ไขได้ที่ระบบต้นทางเท่านั้น
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>รหัสหลักสูตร</Label>
              <Input value={initial.courseCode} readOnly disabled />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>ชื่อหลักสูตร</Label>
              <Input value={initial.courseName} readOnly disabled />
            </div>
          </div>
          {initial.coverUrl ? (
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={initial.coverUrl}
                alt=""
                className="h-14 w-24 rounded object-cover bg-[var(--surface-muted)]"
              />
              <span className="text-xs text-[var(--text-muted)] break-all">
                {initial.coverUrl}
              </span>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Zone B — editable, app-owned */}
      <Card>
        <CardHeader>
          <CardTitle>ราคาและการตั้งค่า (แก้ไขได้)</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="price">ราคาเต็ม (บาท)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                {...register('price')}
              />
              {errors.price && (
                <span className="text-xs text-red-600 dark:text-red-400">{errors.price.message}</span>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sellPrice">ราคาขาย (รวม VAT แล้ว)</Label>
              <Input
                id="sellPrice"
                type="number"
                step="0.01"
                min="0"
                {...register('sellPrice')}
              />
              <span className="text-xs text-[var(--text-muted)]">
                นี่คือยอดที่ลูกค้าจ่ายจริง — <b>รวม VAT 7% แล้ว</b> ไม่ใช่ราคาก่อนภาษี
              </span>
              {errors.sellPrice && (
                <span className="text-xs text-red-600 dark:text-red-400">
                  {errors.sellPrice.message}
                </span>
              )}
            </div>
          </div>

          {/* Live VAT-inclusive breakdown */}
          <div className="rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-4 text-sm">
            <div className="mb-1 font-medium text-[var(--text-primary)]">
              รายละเอียดราคา (คำนวณจากราคาขาย)
            </div>
            <div className="flex justify-between text-[var(--text-secondary)]">
              <span>ราคาก่อน VAT</span>
              <span>{formatMoney(exVat)}</span>
            </div>
            <div className="flex justify-between text-[var(--text-secondary)]">
              <span>VAT 7%</span>
              <span>{formatMoney(vatAmount)}</span>
            </div>
            <div className="flex justify-between font-semibold text-[var(--text-primary)]">
              <span>ยอดสุทธิ (ลูกค้าจ่าย)</span>
              <span>{formatMoney(sellPrice)}</span>
            </div>
            {promoSavings > 0 && (
              <div className="mt-1 flex justify-between text-green-700 dark:text-green-400">
                <span>ประหยัด</span>
                <span>{formatMoney(promoSavings)}</span>
              </div>
            )}
          </div>

          {warnSellGtPrice && (
            <p className="text-xs text-amber-700 dark:text-amber-400">
              ⚠ ราคาขายสูงกว่าราคาเต็ม — ตรวจสอบอีกครั้ง (ไม่บล็อกการบันทึก)
            </p>
          )}

          <div className="flex items-center gap-2">
            <Checkbox id="isPromotion" {...register('isPromotion')} />
            <Label htmlFor="isPromotion">ตั้งเป็นโปรโมชัน</Label>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="promotionStart">เริ่มโปรโมชัน</Label>
              <Input id="promotionStart" type="date" {...register('promotionStart')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="promotionEnd">สิ้นสุดโปรโมชัน</Label>
              <Input id="promotionEnd" type="date" {...register('promotionEnd')} />
            </div>
          </div>
          {onlyOneDate && (
            <p className="text-xs text-amber-700 dark:text-amber-400">
              ⚠ กำหนดวันเพียงด้านเดียว — ช่วงโปรโมชันจะนับจากวันที่ระบุถึงไม่จำกัด
              (แนะนำให้ระบุทั้งสองวัน)
            </p>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">หมายเหตุ</Label>
            <Textarea id="notes" rows={3} {...register('notes')} />
            {errors.notes && (
              <span className="text-xs text-red-600 dark:text-red-400">{errors.notes.message}</span>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-2">
              <Checkbox id="isActive" {...register('isActive')} />
              <Label htmlFor="isActive">แสดงในรายการหลักสูตร (สาธารณะ)</Label>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sortOrder">ลำดับการแสดง</Label>
              <Input id="sortOrder" type="number" step="1" {...register('sortOrder')} />
              {errors.sortOrder && (
                <span className="text-xs text-red-600 dark:text-red-400">
                  {errors.sortOrder.message}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-4">
        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting ? 'กำลังบันทึก…' : 'บันทึก'}
        </Button>
        {saved && <span className="text-sm text-green-700 dark:text-green-400">บันทึกแล้ว</span>}
        {saveError && <span className="text-sm text-red-600 dark:text-red-400">{saveError}</span>}
      </div>
    </form>
  );
}
