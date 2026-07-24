'use client';

import { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { quotationFormSchema } from '@/lib/validation/quotation';
import { computePricing } from '@/lib/pricing';
import { formatMoney } from '@/lib/format';
import { createQuotationAction } from './actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';

const EMPTY_PERSON = { firstName: '', lastName: '', email: '', phone: '' };
const MAX_SEATS = 50;

/** Small red field-level error line. Renders nothing when there is no error. */
function FieldError({ error }) {
  if (!error?.message) return null;
  return <span className="text-xs text-red-500">{error.message}</span>;
}

/** Label + input + error, the layout used by every field on this form. */
function Field({ id, label, error, hint, children, className = '' }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && !error ? (
        <span className="text-xs text-[var(--text-muted)]">{hint}</span>
      ) : null}
      <FieldError error={error} />
    </div>
  );
}

export function QuotationForm({ courses }) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(quotationFormSchema),
    // onTouched keeps the form quiet until a field has been visited once, then
    // gives live feedback. Validating on every keystroke from the start turns a
    // long mobile form into a wall of red before anything has been filled in.
    mode: 'onTouched',
    defaultValues: {
      courseId: '',
      coordinator: { firstName: '', lastName: '', email: '', phone: '' },
      attendeesCount: 1,
      attendeesListProvided: true,
      attendees: [{ ...EMPTY_PERSON }],
      coordinatorIsAttending: false,
      invoice: {
        type: 'individual',
        companyName: '',
        branch: '',
        taxId: '',
        addressLine: '',
        subDistrict: '',
        district: '',
        province: '',
        postalCode: '',
      },
      notes: '',
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'attendees' });

  const courseId = watch('courseId');
  const seatsRaw = watch('attendeesCount');
  const attendeesListProvided = watch('attendeesListProvided');
  const coordinatorIsAttending = watch('coordinatorIsAttending');
  const invoiceType = watch('invoice.type');
  const notes = watch('notes');

  const coordFirstName = watch('coordinator.firstName');
  const coordLastName = watch('coordinator.lastName');
  const coordEmail = watch('coordinator.email');
  const coordPhone = watch('coordinator.phone');

  const selectedCourse = courses.find((c) => c.id === courseId) || null;
  const seats = Math.min(MAX_SEATS, Math.max(1, Math.trunc(Number(seatsRaw) || 1)));

  // The SAME function the server uses to build the persisted pricing block.
  // Do not inline the arithmetic here: two copies drift, and the drift shows up
  // as a customer seeing one total on screen and another on the PDF.
  const pricing = selectedCourse ? computePricing(selectedCourse, seats) : null;

  // ---- Keep the attendee rows in step with the seat count ----
  // Grow by appending blanks, shrink by dropping from the END, so rows the user
  // already filled in are never wiped by nudging the number up and back down.
  useEffect(() => {
    if (fields.length < seats) {
      append(
        Array.from({ length: seats - fields.length }, () => ({ ...EMPTY_PERSON })),
        { shouldFocus: false }
      );
    } else if (fields.length > seats) {
      remove(
        Array.from({ length: fields.length - seats }, (_, i) => seats + i)
      );
    }
  }, [seats, fields.length, append, remove]);

  // ---- Mirror the coordinator into attendee #1 while the box stays ticked ----
  useEffect(() => {
    if (!coordinatorIsAttending) return;
    setValue('attendees.0.firstName', coordFirstName || '');
    setValue('attendees.0.lastName', coordLastName || '');
    setValue('attendees.0.email', coordEmail || '');
    setValue('attendees.0.phone', coordPhone || '');
  }, [
    coordinatorIsAttending,
    coordFirstName,
    coordLastName,
    coordEmail,
    coordPhone,
    setValue,
  ]);

  function handleCoordinatorAttendingChange(e) {
    const checked = e.target.checked;
    setValue('coordinatorIsAttending', checked);
    // Unticking must hand row #1 back empty and editable, not leave the
    // coordinator's details sitting there looking like a deliberate entry.
    if (!checked) setValue('attendees.0', { ...EMPTY_PERSON });
  }

  // The visible checkbox reads "names not decided yet", which is the INVERSE of
  // the persisted attendeesListProvided flag.
  function handleNamesUnknownChange(e) {
    setValue('attendeesListProvided', !e.target.checked, { shouldValidate: false });
  }

  async function onSubmit(values) {
    setSubmitError(null);
    try {
      const result = await createQuotationAction(values);
      if (result?.ok) {
        router.push(`/quotation/${result.id}`);
      } else {
        setSubmitError(result?.error || 'ไม่สามารถสร้างใบเสนอราคาได้ กรุณาลองใหม่');
      }
    } catch (err) {
      setSubmitError(String(err?.message || err));
    }
  }

  // ---- Price summary, shared by the desktop sidebar and the mobile bar ----
  function SummaryRows() {
    if (!pricing) {
      return (
        <p className="text-sm text-[var(--text-muted)]">
          เลือกหลักสูตรเพื่อดูราคา
        </p>
      );
    }
    return (
      <div className="flex flex-col gap-1.5 text-sm">
        <div className="flex justify-between text-[var(--text-secondary)]">
          <span>จำนวนผู้เข้าอบรม</span>
          <span>{pricing.seats} คน</span>
        </div>
        <div className="flex justify-between text-[var(--text-secondary)]">
          <span>ราคาต่อคน (ก่อน VAT)</span>
          <span>{formatMoney(pricing.unitPriceExVat)}</span>
        </div>
        <div className="flex justify-between text-[var(--text-secondary)]">
          <span>รวมราคา</span>
          <span>{formatMoney(pricing.subtotal)}</span>
        </div>
        <div className="flex justify-between text-[var(--text-secondary)]">
          <span>ภาษีมูลค่าเพิ่ม 7%</span>
          <span>{formatMoney(pricing.vatAmount)}</span>
        </div>
        <div className="mt-1.5 flex justify-between border-t border-[var(--surface-border)] pt-2.5 text-base font-semibold text-[var(--text-primary)]">
          <span>ยอดเงินสุทธิ</span>
          <span>{formatMoney(pricing.total)} ฿</span>
        </div>
        {pricing.promoSavings > 0 && (
          <div className="flex justify-between text-green-600 dark:text-green-400">
            <span>ประหยัด</span>
            <span>{formatMoney(pricing.promoSavings)} ฿</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      // Bottom padding clears the fixed mobile summary bar.
      className="pb-40 lg:pb-0"
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-8">
        {/* ================= Fields ================= */}
        <div className="flex min-w-0 flex-col gap-6">
          {/* ---- Course ---- */}
          <Card>
            <CardHeader>
              <CardTitle>เลือกหลักสูตร</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Field id="courseId" label="หลักสูตร" error={errors.courseId}>
                <select
                  id="courseId"
                  {...register('courseId')}
                  className="flex h-10 w-full rounded-[var(--radius-md)] border border-[var(--surface-border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--9e-action)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--page-bg)]"
                >
                  <option value="">— กรุณาเลือกหลักสูตร —</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.courseName}
                    </option>
                  ))}
                </select>
              </Field>

              {selectedCourse && (
                <div className="flex flex-col gap-3 rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-4 sm:flex-row sm:items-start">
                  {selectedCourse.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={selectedCourse.coverUrl}
                      alt=""
                      className="h-28 w-full rounded-[var(--radius-sm)] object-cover sm:h-20 sm:w-32 sm:shrink-0"
                    />
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-[var(--text-primary)]">
                      {selectedCourse.courseName}
                    </div>
                    <div className="mt-0.5 text-xs text-[var(--text-muted)]">
                      รหัส {selectedCourse.courseCode}
                    </div>
                    <div className="mt-2 flex flex-wrap items-baseline gap-2">
                      <span className="text-lg font-semibold text-[var(--text-primary)]">
                        {formatMoney(selectedCourse.sellPrice)} ฿
                      </span>
                      {selectedCourse.isPromoActive &&
                        selectedCourse.price > selectedCourse.sellPrice && (
                          <>
                            <span className="text-sm text-[var(--text-muted)] line-through">
                              {formatMoney(selectedCourse.price)} ฿
                            </span>
                            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/40 dark:text-green-400">
                              ประหยัด{' '}
                              {formatMoney(
                                selectedCourse.price - selectedCourse.sellPrice
                              )}{' '}
                              ฿
                            </span>
                          </>
                        )}
                    </div>
                    <div className="mt-1 text-xs text-[var(--text-muted)]">
                      ราคาต่อคน (รวม VAT 7% แล้ว)
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ---- Coordinator ---- */}
          <Card>
            <CardHeader>
              <CardTitle>ผู้ประสานงาน</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                id="coordFirstName"
                label="ชื่อ"
                error={errors.coordinator?.firstName}
              >
                <Input id="coordFirstName" {...register('coordinator.firstName')} />
              </Field>
              <Field
                id="coordLastName"
                label="นามสกุล"
                error={errors.coordinator?.lastName}
              >
                <Input id="coordLastName" {...register('coordinator.lastName')} />
              </Field>
              <Field
                id="coordEmail"
                label="อีเมล"
                error={errors.coordinator?.email}
                hint="ใบเสนอราคาจะถูกส่งไปที่อีเมลนี้"
              >
                <Input
                  id="coordEmail"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  {...register('coordinator.email')}
                />
              </Field>
              <Field
                id="coordPhone"
                label="เบอร์โทรศัพท์"
                error={errors.coordinator?.phone}
              >
                <Input
                  id="coordPhone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  {...register('coordinator.phone')}
                />
              </Field>
            </CardContent>
          </Card>

          {/* ---- Attendees ---- */}
          <Card>
            <CardHeader>
              <CardTitle>ผู้เข้าอบรม</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <Field
                id="attendeesCount"
                label="จำนวนผู้เข้าอบรม"
                error={errors.attendeesCount}
                className="max-w-[200px]"
              >
                <Input
                  id="attendeesCount"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  max={MAX_SEATS}
                  step="1"
                  {...register('attendeesCount')}
                />
              </Field>

              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="namesUnknown"
                    checked={!attendeesListProvided}
                    onChange={handleNamesUnknownChange}
                  />
                  <Label htmlFor="namesUnknown">ยังไม่ระบุรายชื่อผู้เข้าอบรม</Label>
                </div>

                {attendeesListProvided && (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="coordinatorIsAttending"
                      checked={coordinatorIsAttending}
                      onChange={handleCoordinatorAttendingChange}
                    />
                    <Label htmlFor="coordinatorIsAttending">
                      ผู้ประสานงานเข้าอบรมด้วย
                    </Label>
                  </div>
                )}
              </div>

              {attendeesListProvided ? (
                <div className="flex flex-col gap-4">
                  {typeof errors.attendees?.message === 'string' && (
                    <FieldError error={errors.attendees} />
                  )}

                  {fields.map((field, index) => {
                    // Row #1 is driven by the coordinator while the box is ticked.
                    const locked = coordinatorIsAttending && index === 0;
                    return (
                      <div
                        key={field.id}
                        className="rounded-[var(--radius-md)] border border-[var(--surface-border)] p-4"
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <span className="text-sm font-medium text-[var(--text-primary)]">
                            ผู้เข้าอบรมคนที่ {index + 1}
                          </span>
                          {locked && (
                            <span className="text-xs text-[var(--text-muted)]">
                              ใช้ข้อมูลผู้ประสานงาน
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <Field
                            id={`att-${index}-first`}
                            label="ชื่อ"
                            error={errors.attendees?.[index]?.firstName}
                          >
                            <Input
                              id={`att-${index}-first`}
                              readOnly={locked}
                              disabled={locked}
                              {...register(`attendees.${index}.firstName`)}
                            />
                          </Field>
                          <Field
                            id={`att-${index}-last`}
                            label="นามสกุล"
                            error={errors.attendees?.[index]?.lastName}
                          >
                            <Input
                              id={`att-${index}-last`}
                              readOnly={locked}
                              disabled={locked}
                              {...register(`attendees.${index}.lastName`)}
                            />
                          </Field>
                          <Field
                            id={`att-${index}-email`}
                            label="อีเมล"
                            error={errors.attendees?.[index]?.email}
                          >
                            <Input
                              id={`att-${index}-email`}
                              type="email"
                              inputMode="email"
                              readOnly={locked}
                              disabled={locked}
                              {...register(`attendees.${index}.email`)}
                            />
                          </Field>
                          <Field
                            id={`att-${index}-phone`}
                            label="เบอร์โทรศัพท์ (ไม่บังคับ)"
                            error={errors.attendees?.[index]?.phone}
                          >
                            <Input
                              id={`att-${index}-phone`}
                              type="tel"
                              inputMode="tel"
                              readOnly={locked}
                              disabled={locked}
                              {...register(`attendees.${index}.phone`)}
                            />
                          </Field>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-4 text-sm text-[var(--text-secondary)]">
                  สามารถแจ้งรายชื่อผู้เข้าอบรมภายหลังได้
                  ใบเสนอราคาจะออกตามจำนวนที่ระบุไว้
                </p>
              )}
            </CardContent>
          </Card>

          {/* ---- Invoice ---- */}
          <Card>
            <CardHeader>
              <CardTitle>ข้อมูลออกใบเสนอราคา / ใบกำกับภาษี</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <Label>ประเภท</Label>
                <div className="flex flex-col gap-2 sm:flex-row sm:gap-4">
                  {[
                    { value: 'individual', label: 'บุคคลธรรมดา' },
                    { value: 'corporate', label: 'นิติบุคคล (บริษัท)' },
                  ].map((opt) => (
                    <label
                      key={opt.value}
                      className="flex cursor-pointer items-center gap-2 rounded-[var(--radius-md)] border border-[var(--surface-border)] px-4 py-2.5 text-sm text-[var(--text-primary)] has-[:checked]:border-[var(--9e-action)] has-[:checked]:bg-[var(--surface-muted)]"
                    >
                      <input
                        type="radio"
                        value={opt.value}
                        {...register('invoice.type')}
                        className="h-4 w-4 accent-[var(--9e-action)]"
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
                <FieldError error={errors.invoice?.type} />
              </div>

              {invoiceType === 'corporate' && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field
                    id="companyName"
                    label="ชื่อบริษัท"
                    error={errors.invoice?.companyName}
                    className="sm:col-span-2"
                  >
                    <Input id="companyName" {...register('invoice.companyName')} />
                  </Field>
                  <Field
                    id="branch"
                    label="สาขา"
                    error={errors.invoice?.branch}
                    hint="เช่น สำนักงานใหญ่"
                  >
                    <Input id="branch" {...register('invoice.branch')} />
                  </Field>
                  <Field
                    id="taxId"
                    label="เลขประจำตัวผู้เสียภาษี (13 หลัก)"
                    error={errors.invoice?.taxId}
                  >
                    <Input
                      id="taxId"
                      inputMode="numeric"
                      maxLength={13}
                      {...register('invoice.taxId')}
                    />
                  </Field>
                </div>
              )}

              {invoiceType === 'individual' && (
                <Field
                  id="taxIdIndividual"
                  label="เลขประจำตัวผู้เสียภาษี / เลขบัตรประชาชน (ไม่บังคับ)"
                  error={errors.invoice?.taxId}
                  className="sm:max-w-[320px]"
                >
                  <Input
                    id="taxIdIndividual"
                    inputMode="numeric"
                    maxLength={13}
                    {...register('invoice.taxId')}
                  />
                </Field>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field
                  id="addressLine"
                  label="ที่อยู่"
                  error={errors.invoice?.addressLine}
                  hint="บ้านเลขที่ อาคาร ถนน"
                  className="sm:col-span-2"
                >
                  <Input id="addressLine" {...register('invoice.addressLine')} />
                </Field>
                <Field
                  id="subDistrict"
                  label="แขวง / ตำบล"
                  error={errors.invoice?.subDistrict}
                >
                  <Input id="subDistrict" {...register('invoice.subDistrict')} />
                </Field>
                <Field
                  id="district"
                  label="เขต / อำเภอ"
                  error={errors.invoice?.district}
                >
                  <Input id="district" {...register('invoice.district')} />
                </Field>
                <Field
                  id="province"
                  label="จังหวัด"
                  error={errors.invoice?.province}
                >
                  <Input id="province" {...register('invoice.province')} />
                </Field>
                <Field
                  id="postalCode"
                  label="รหัสไปรษณีย์"
                  error={errors.invoice?.postalCode}
                >
                  <Input
                    id="postalCode"
                    inputMode="numeric"
                    maxLength={5}
                    {...register('invoice.postalCode')}
                  />
                </Field>
              </div>
            </CardContent>
          </Card>

          {/* ---- Notes ---- */}
          <Card>
            <CardHeader>
              <CardTitle>หมายเหตุเพิ่มเติม</CardTitle>
            </CardHeader>
            <CardContent>
              <Field id="notes" label="หมายเหตุ (ไม่บังคับ)" error={errors.notes}>
                <Textarea id="notes" rows={4} maxLength={500} {...register('notes')} />
                <span className="text-right text-xs text-[var(--text-muted)]">
                  {(notes || '').length}/500
                </span>
              </Field>
            </CardContent>
          </Card>
        </div>

        {/* ================= Desktop summary ================= */}
        <aside className="hidden lg:block lg:sticky lg:top-6">
          <Card>
            <CardHeader>
              <CardTitle>สรุปราคา</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <SummaryRows />
              <Button type="submit" size="lg" disabled={isSubmitting} className="w-full">
                {isSubmitting ? 'กำลังสร้าง…' : 'ขอใบเสนอราคา'}
              </Button>
              {submitError && (
                <p className="text-sm text-red-500">{submitError}</p>
              )}
              <p className="text-xs text-[var(--text-muted)]">
                ราคารวมภาษีมูลค่าเพิ่ม 7% แล้ว · ยืนราคา 30 วัน
              </p>
            </CardContent>
          </Card>
        </aside>
      </div>

      {/* ================= Mobile summary bar ================= */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--surface-border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-lg)] lg:hidden">
        <div className="mx-auto flex max-w-6xl flex-col gap-3">
          {submitError && <p className="text-sm text-red-500">{submitError}</p>}
          <div className="flex items-end justify-between">
            <div className="min-w-0">
              <div className="text-xs text-[var(--text-muted)]">
                ยอดเงินสุทธิ (รวม VAT)
              </div>
              <div className="text-xl font-semibold text-[var(--text-primary)]">
                {pricing ? `${formatMoney(pricing.total)} ฿` : '—'}
              </div>
              {pricing && (
                <div className="text-xs text-[var(--text-muted)]">
                  {pricing.seats} คน · VAT {formatMoney(pricing.vatAmount)}
                </div>
              )}
            </div>
            <Button type="submit" size="lg" disabled={isSubmitting} className="shrink-0">
              {isSubmitting ? 'กำลังสร้าง…' : 'ขอใบเสนอราคา'}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
