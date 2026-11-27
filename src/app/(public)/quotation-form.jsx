'use client';

import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { quotationFormSchema } from '@/lib/validation/quotation';
import { computePricing } from '@/lib/pricing';
import { TH_PROVINCES } from '@/lib/th-provinces';
import { createQuotationAction, previewQuotationAction } from './actions';
import { MobileProgress, Stepper } from '@/components/public/stepper';
import {
  Chip,
  Field,
  FieldError,
  FieldLabel,
  PublicCheckbox,
  PublicInput,
  PublicSelect,
  PublicTextarea,
  SectionCard,
  WarningNote,
} from '@/components/public/ui';
import { ChevronDownIcon, MinusIcon, PlusIcon } from '@/components/public/icons';
import {
  CourseCombobox,
  MobileCoursePicker,
  SelectedCoursePanel,
} from './_components/course-picker';
import { DesktopSummary, MobileSummaryBar, VAT_NOTICE } from './_components/price-summary';
import { ReviewStep } from './_components/review-step';

const EMPTY_PERSON = { firstName: '', lastName: '', email: '', phone: '' };
const MAX_SEATS = 50;
const HQ = 'สำนักงานใหญ่';

/**
 * The public quotation flow. Step 1 (form) and step 2 (review) are client
 * state on `/`; step 3 is the /quotation/[id]?t= page.
 *
 * Step 1 stays MOUNTED (just hidden) during step 2, so going back keeps every
 * value — including local UI state such as the branch picker and expanded
 * attendee rows — exactly as the customer left it.
 */
export function QuotationForm({ courses }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [formError, setFormError] = useState(null);
  const [reviewing, setReviewing] = useState(false);
  const [preview, setPreview] = useState(null); // { html, summary }
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState(null);

  // Corporate branch picker. Stored on submit as "สำนักงานใหญ่" or "สาขาที่ 00001".
  const [branchMode, setBranchMode] = useState('hq');
  const [branchNo, setBranchNo] = useState('');
  const [branchError, setBranchError] = useState(null);

  // Mobile: attendee rows after the second start collapsed.
  const [expandedRows, setExpandedRows] = useState(() => new Set());

  // The exact payload that was previewed is the one that gets confirmed.
  const previewPayload = useRef(null);
  // Ignore a preview response that arrives after the customer went back.
  const previewRequest = useRef(0);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors },
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
  const pricing = computePricing(selectedCourse || { sellPrice: 0, price: 0 }, seats);

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
      remove(Array.from({ length: fields.length - seats }, (_, i) => seats + i));
    }
  }, [seats, fields.length, append, remove]);

  // ---- Mirror the coordinator into attendee #1 while the box stays ticked ----
  useEffect(() => {
    if (!coordinatorIsAttending) return;
    setValue('attendees.0.firstName', coordFirstName || '');
    setValue('attendees.0.lastName', coordLastName || '');
    setValue('attendees.0.email', coordEmail || '');
    setValue('attendees.0.phone', coordPhone || '');
  }, [coordinatorIsAttending, coordFirstName, coordLastName, coordEmail, coordPhone, setValue]);

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

  function setSeats(n) {
    const next = Math.min(MAX_SEATS, Math.max(1, n));
    setValue('attendeesCount', next, { shouldValidate: true, shouldDirty: true });
  }

  function onCourseChange(id) {
    setValue('courseId', id, { shouldValidate: true, shouldDirty: true });
  }

  // ---- Step 1 → step 2 ----
  async function onValid(values) {
    setFormError(null);

    let branch = '';
    if (values.invoice.type === 'corporate') {
      if (branchMode === 'branch') {
        if (!/^\d{5}$/.test(branchNo.trim())) {
          setBranchError('กรุณากรอกเลขที่สาขา 5 หลัก');
          document.getElementById('branchNo')?.focus();
          return;
        }
        branch = `สาขาที่ ${branchNo.trim()}`;
      } else {
        branch = HQ;
      }
    }
    setBranchError(null);
    setValue('invoice.branch', branch);
    const payload = { ...values, invoice: { ...values.invoice, branch } };

    const requestId = ++previewRequest.current;
    setReviewing(true);
    previewPayload.current = payload;
    setPreview(null);
    setConfirmError(null);
    flushSync(() => setStep(2));
    window.scrollTo({ top: 0 });

    try {
      const result = await previewQuotationAction(payload);
      if (requestId !== previewRequest.current) return;
      if (result?.ok) {
        setPreview({ html: result.html, summary: result.summary });
      } else {
        backToForm();
        setFormError(result?.error || 'ไม่สามารถสร้างตัวอย่างใบเสนอราคาได้ กรุณาลองใหม่');
      }
    } catch {
      if (requestId !== previewRequest.current) return;
      backToForm();
      setFormError('ไม่สามารถเชื่อมต่อระบบได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      if (requestId === previewRequest.current) setReviewing(false);
    }
  }

  function onInvalid() {
    setFormError('กรุณากรอกข้อมูลให้ครบถ้วนและถูกต้อง');
    if (invoiceType === 'corporate' && branchMode === 'branch' && !/^\d{5}$/.test(branchNo.trim())) {
      setBranchError('กรุณากรอกเลขที่สาขา 5 หลัก');
    }
  }

  /** Return to step 1, optionally scrolled to one card. */
  function backToForm(cardId) {
    previewRequest.current += 1; // drop any in-flight preview
    setReviewing(false);
    setConfirmError(null);
    flushSync(() => setStep(1));
    const target = cardId ? document.getElementById(cardId) : null;
    if (target) target.scrollIntoView({ block: 'start' });
    else window.scrollTo({ top: 0 });
  }

  // ---- Step 2 → step 3 ----
  async function onConfirm() {
    if (!previewPayload.current) return;
    setConfirmError(null);
    setConfirming(true);
    try {
      const result = await createQuotationAction(previewPayload.current);
      if (result?.ok) {
        // Keep `confirming` on: the buttons stay disabled until navigation.
        router.push(`/quotation/${result.id}?t=${result.token}`);
        return;
      }
      setConfirmError(result?.error || 'ไม่สามารถสร้างใบเสนอราคาได้ กรุณาลองใหม่');
    } catch {
      setConfirmError('ไม่สามารถเชื่อมต่อระบบได้ กรุณาลองใหม่อีกครั้ง');
    }
    setConfirming(false);
  }

  const seatReg = register('attendeesCount');

  return (
    <div className="mx-auto max-w-[720px] px-4 pt-5 pb-10 lg:max-w-[1248px] lg:px-6 lg:pt-10 lg:pb-16">
      {step === 2 ? (
        <ReviewStep
          html={preview?.html || null}
          summary={preview?.summary || null}
          onBack={backToForm}
          onConfirm={onConfirm}
          pending={confirming}
          error={confirmError}
        />
      ) : null}

      <form
        onSubmit={handleSubmit(onValid, onInvalid)}
        noValidate
        className={cn('pb-52 lg:pb-0', step !== 1 && 'hidden')}
      >
        {/* ================= Hero ================= */}
        <MobileProgress current={1} className="mb-4 lg:hidden" />
        <div className="mb-6 lg:mb-8 lg:flex lg:items-end lg:justify-between lg:gap-8">
          <div>
            <span className="font-en mb-3 hidden rounded-full bg-[var(--brand-tint)] px-3 py-1 text-xs font-bold tracking-wider text-[var(--9e-action)] lg:inline-block">
              ONLINE VIDEO COURSE
            </span>
            <h1 className="font-thai text-2xl font-bold text-[var(--text-primary)] lg:text-[32px] lg:leading-tight">
              ขอใบเสนอราคาหลักสูตรออนไลน์
            </h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)] lg:text-base">
              กรอกข้อมูลไม่กี่ขั้นตอน รับใบเสนอราคา (PDF) ทางอีเมลได้ทันที
            </p>
          </div>
          <Stepper current={1} className="hidden shrink-0 lg:flex" />
        </div>

        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start lg:gap-8">
          <div className="flex min-w-0 flex-col gap-4 lg:gap-6">
            {/* ---- 1. Course ---- */}
            <SectionCard
              id="card-course"
              number={1}
              title="เลือกหลักสูตร"
              subtitle="หลักสูตรออนไลน์ 1 หลักสูตร ต่อใบเสนอราคา"
            >
              <div className="hidden lg:block">
                <div className="flex flex-col gap-1.5">
                  <FieldLabel htmlFor="courseId" required>
                    หลักสูตร
                  </FieldLabel>
                  <CourseCombobox
                    id="courseId"
                    courses={courses}
                    value={courseId}
                    onChange={onCourseChange}
                    invalid={Boolean(errors.courseId)}
                  />
                  <FieldError error={errors.courseId} />
                </div>
                <SelectedCoursePanel course={selectedCourse} />
              </div>
              <div className="lg:hidden">
                <MobileCoursePicker
                  id="courseIdMobile"
                  courses={courses}
                  value={courseId}
                  onChange={onCourseChange}
                  invalid={Boolean(errors.courseId)}
                />
                <FieldError error={errors.courseId} />
              </div>
            </SectionCard>

            {/* ---- 2. Contact ---- */}
            <SectionCard
              id="card-contact"
              number={2}
              title="ข้อมูลผู้ติดต่อ"
              subtitle="ผู้ประสานงาน — ใบเสนอราคาจะส่งไปที่อีเมลนี้"
            >
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-x-4 lg:gap-y-5">
                <Field id="coordFirstName" label="ชื่อ" required error={errors.coordinator?.firstName}>
                  <PublicInput
                    id="coordFirstName"
                    autoComplete="given-name"
                    invalid={errors.coordinator?.firstName}
                    {...register('coordinator.firstName')}
                  />
                </Field>
                <Field id="coordLastName" label="นามสกุล" required error={errors.coordinator?.lastName}>
                  <PublicInput
                    id="coordLastName"
                    autoComplete="family-name"
                    invalid={errors.coordinator?.lastName}
                    {...register('coordinator.lastName')}
                  />
                </Field>
                <Field id="coordEmail" label="อีเมล" required error={errors.coordinator?.email}>
                  <PublicInput
                    id="coordEmail"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="name@company.co.th"
                    invalid={errors.coordinator?.email}
                    {...register('coordinator.email')}
                  />
                </Field>
                <Field id="coordPhone" label="เบอร์โทรศัพท์" required error={errors.coordinator?.phone}>
                  <PublicInput
                    id="coordPhone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="081-234-5678"
                    invalid={errors.coordinator?.phone}
                    {...register('coordinator.phone')}
                  />
                </Field>
              </div>
            </SectionCard>

            {/* ---- 3. Attendees ---- */}
            <SectionCard
              id="card-attendees"
              number={3}
              title="ผู้เรียนออนไลน์"
              subtitle="อีเมลผู้เรียนใช้เปิดสิทธิ์เข้าเรียน — เปลี่ยนแปลงได้ภายหลัง"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <FieldLabel htmlFor="attendeesCount">จำนวนผู้เรียน</FieldLabel>
                  <p className="text-xs text-[var(--text-muted)]">สูงสุด 50 ท่านต่อใบเสนอราคา</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 items-stretch overflow-hidden rounded-[10px] border border-[var(--surface-border)] bg-white">
                    <button
                      type="button"
                      onClick={() => setSeats(seats - 1)}
                      disabled={seats <= 1}
                      aria-label="ลดจำนวนผู้เรียน"
                      className="flex w-11 items-center justify-center bg-[var(--surface-muted)] text-[var(--text-primary)] disabled:opacity-40"
                    >
                      <MinusIcon className="h-5 w-5" />
                    </button>
                    <input
                      id="attendeesCount"
                      inputMode="numeric"
                      autoComplete="off"
                      className="font-en w-14 border-x border-[var(--surface-border)] text-center text-xl font-semibold text-[var(--text-primary)] focus:outline-none"
                      {...seatReg}
                      onBlur={(e) => {
                        seatReg.onBlur(e);
                        setSeats(seats);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setSeats(seats + 1)}
                      disabled={seats >= MAX_SEATS}
                      aria-label="เพิ่มจำนวนผู้เรียน"
                      className="flex w-11 items-center justify-center bg-[var(--surface-muted)] text-[var(--text-primary)] disabled:opacity-40"
                    >
                      <PlusIcon className="h-5 w-5" />
                    </button>
                  </div>
                  <span className="text-sm text-[var(--text-secondary)]">ท่าน</span>
                </div>
              </div>
              <FieldError error={errors.attendeesCount} />

              <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:gap-8">
                {attendeesListProvided ? (
                  <label htmlFor="coordinatorIsAttending" className="flex cursor-pointer items-center gap-2.5 text-sm">
                    <PublicCheckbox
                      id="coordinatorIsAttending"
                      checked={coordinatorIsAttending}
                      onChange={handleCoordinatorAttendingChange}
                    />
                    ผู้ติดต่อเป็นผู้เรียนด้วย
                  </label>
                ) : null}
                <label htmlFor="namesUnknown" className="flex cursor-pointer items-center gap-2.5 text-sm">
                  <PublicCheckbox
                    id="namesUnknown"
                    checked={!attendeesListProvided}
                    onChange={handleNamesUnknownChange}
                  />
                  ยังไม่ระบุรายชื่อผู้เรียน (แจ้งภายหลัง)
                </label>
              </div>

              {attendeesListProvided ? (
                <div className="mt-5 flex flex-col gap-3">
                  {typeof errors.attendees?.message === 'string' ? (
                    <FieldError error={errors.attendees} />
                  ) : null}

                  {fields.map((field, index) => {
                    // Row #1 is driven by the coordinator while the box is ticked.
                    const locked = coordinatorIsAttending && index === 0;
                    const rowErrors = errors.attendees?.[index];
                    const collapsible = index >= 2 && !expandedRows.has(index) && !rowErrors;
                    return (
                      <div key={field.id}>
                        {collapsible ? (
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedRows((prev) => new Set(prev).add(index))
                            }
                            className="flex w-full items-center justify-between rounded-xl bg-[var(--surface-muted)] px-4 py-3.5 text-left lg:hidden"
                          >
                            <span className="text-sm font-bold text-[var(--text-primary)]">
                              ผู้เรียนคนที่ {index + 1}
                            </span>
                            <span className="flex items-center gap-1 text-xs font-medium text-[var(--9e-action)]">
                              กรอกข้อมูล
                              <ChevronDownIcon className="h-4 w-4" />
                            </span>
                          </button>
                        ) : null}
                        <div
                          className={cn(
                            'rounded-xl p-4',
                            locked ? 'bg-[var(--brand-tint)]' : 'bg-[var(--surface-muted)]',
                            collapsible && 'hidden lg:block'
                          )}
                        >
                          <div className="mb-3 flex items-center gap-2">
                            <span className="text-sm font-bold text-[var(--text-primary)]">
                              ผู้เรียนคนที่ {index + 1}
                            </span>
                            {locked ? <Chip tone="brand">ผู้ติดต่อ</Chip> : null}
                          </div>
                          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-4">
                            <Field id={`att-${index}-first`} label="ชื่อ" required error={rowErrors?.firstName}>
                              <PublicInput
                                id={`att-${index}-first`}
                                readOnly={locked}
                                invalid={rowErrors?.firstName}
                                {...register(`attendees.${index}.firstName`)}
                              />
                            </Field>
                            <Field id={`att-${index}-last`} label="นามสกุล" required error={rowErrors?.lastName}>
                              <PublicInput
                                id={`att-${index}-last`}
                                readOnly={locked}
                                invalid={rowErrors?.lastName}
                                {...register(`attendees.${index}.lastName`)}
                              />
                            </Field>
                            <Field
                              id={`att-${index}-email`}
                              label="อีเมลผู้เรียน"
                              required
                              error={rowErrors?.email}
                              className="lg:col-span-2"
                            >
                              <PublicInput
                                id={`att-${index}-email`}
                                type="email"
                                inputMode="email"
                                placeholder="name@company.co.th"
                                readOnly={locked}
                                invalid={rowErrors?.email}
                                {...register(`attendees.${index}.email`)}
                              />
                            </Field>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-5 rounded-xl bg-[var(--surface-muted)] p-4 text-sm text-[var(--text-secondary)]">
                  สามารถแจ้งรายชื่อผู้เรียนภายหลังได้ ใบเสนอราคาจะออกตามจำนวนที่ระบุไว้
                </p>
              )}
            </SectionCard>

            {/* ---- 4. Invoice ---- */}
            <SectionCard
              id="card-invoice"
              number={4}
              title="ข้อมูลออกใบเสนอราคา / ใบกำกับภาษี"
              subtitle="ข้อมูลนี้จะแสดงบนใบเสนอราคา"
            >
              <div
                role="radiogroup"
                aria-label="ประเภทผู้ออกใบเสนอราคา"
                className="grid grid-cols-2 gap-1 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-muted)] p-1"
              >
                {[
                  { value: 'corporate', label: 'นิติบุคคล' },
                  { value: 'individual', label: 'บุคคลธรรมดา' },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    className={cn(
                      'flex h-11 cursor-pointer items-center justify-center rounded-[9px] text-sm text-[var(--text-secondary)]',
                      'has-[:checked]:bg-white has-[:checked]:font-bold has-[:checked]:text-[var(--text-primary)] has-[:checked]:shadow-[0_1px_3px_rgba(13,27,42,0.12)]',
                      'has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-[rgba(36,134,255,0.18)]'
                    )}
                  >
                    <input type="radio" value={opt.value} className="sr-only" {...register('invoice.type')} />
                    {opt.label}
                  </label>
                ))}
              </div>
              <FieldError error={errors.invoice?.type} />

              <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-x-4 lg:gap-y-5">
                {invoiceType === 'corporate' ? (
                  <>
                    <Field
                      id="companyName"
                      label="ชื่อบริษัท / นิติบุคคล"
                      required
                      error={errors.invoice?.companyName}
                      className="lg:col-span-2"
                    >
                      <PublicInput
                        id="companyName"
                        autoComplete="organization"
                        invalid={errors.invoice?.companyName}
                        {...register('invoice.companyName')}
                      />
                    </Field>
                    <Field id="taxId" label="เลขประจำตัวผู้เสียภาษี (13 หลัก)" required error={errors.invoice?.taxId}>
                      <PublicInput
                        id="taxId"
                        inputMode="numeric"
                        maxLength={13}
                        invalid={errors.invoice?.taxId}
                        {...register('invoice.taxId')}
                      />
                    </Field>
                    <Field id="branchMode" label="สำนักงานใหญ่ / สาขา" required>
                      <PublicSelect
                        id="branchMode"
                        value={branchMode}
                        onChange={(e) => {
                          setBranchMode(e.target.value);
                          setBranchError(null);
                        }}
                      >
                        <option value="hq">สำนักงานใหญ่</option>
                        <option value="branch">สาขา</option>
                      </PublicSelect>
                    </Field>
                    {branchMode === 'branch' ? (
                      <Field id="branchNo" label="เลขที่สาขา (5 หลัก)" required error={branchError}>
                        <PublicInput
                          id="branchNo"
                          inputMode="numeric"
                          maxLength={5}
                          placeholder="00001"
                          value={branchNo}
                          invalid={branchError}
                          onChange={(e) => {
                            setBranchNo(e.target.value.replace(/\D/g, ''));
                            setBranchError(null);
                          }}
                        />
                      </Field>
                    ) : null}
                  </>
                ) : (
                  <Field
                    id="taxIdIndividual"
                    label="เลขประจำตัวผู้เสียภาษี / เลขบัตรประชาชน"
                    hint="ไม่บังคับ · ตัวเลข 13 หลัก"
                    error={errors.invoice?.taxId}
                    className="lg:col-span-2 lg:max-w-[calc(50%-8px)]"
                  >
                    <PublicInput
                      id="taxIdIndividual"
                      inputMode="numeric"
                      maxLength={13}
                      invalid={errors.invoice?.taxId}
                      {...register('invoice.taxId')}
                    />
                  </Field>
                )}

                <Field
                  id="addressLine"
                  label="ที่อยู่"
                  required
                  error={errors.invoice?.addressLine}
                  className="lg:col-span-2"
                >
                  <PublicInput
                    id="addressLine"
                    autoComplete="street-address"
                    placeholder="บ้านเลขที่ อาคาร ถนน"
                    invalid={errors.invoice?.addressLine}
                    {...register('invoice.addressLine')}
                  />
                </Field>
                <Field id="subDistrict" label="แขวง / ตำบล" error={errors.invoice?.subDistrict}>
                  <PublicInput id="subDistrict" {...register('invoice.subDistrict')} />
                </Field>
                <Field id="district" label="เขต / อำเภอ" error={errors.invoice?.district}>
                  <PublicInput id="district" {...register('invoice.district')} />
                </Field>
                <Field id="province" label="จังหวัด" required error={errors.invoice?.province}>
                  <PublicSelect
                    id="province"
                    invalid={errors.invoice?.province}
                    {...register('invoice.province')}
                  >
                    <option value="">เลือกจังหวัด</option>
                    {TH_PROVINCES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </PublicSelect>
                </Field>
                <Field id="postalCode" label="รหัสไปรษณีย์" required error={errors.invoice?.postalCode}>
                  <PublicInput
                    id="postalCode"
                    inputMode="numeric"
                    autoComplete="postal-code"
                    maxLength={5}
                    invalid={errors.invoice?.postalCode}
                    {...register('invoice.postalCode')}
                  />
                </Field>
              </div>
            </SectionCard>

            {/* ---- 5. Notes ---- */}
            <SectionCard id="card-notes" number={5} title="หมายเหตุเพิ่มเติม" subtitle="ไม่บังคับ">
              <Field id="notes" error={errors.notes}>
                <PublicTextarea
                  id="notes"
                  aria-label="หมายเหตุเพิ่มเติม"
                  maxLength={500}
                  placeholder="เช่น ต้องการให้ระบุเลขที่ใบสั่งซื้อ (PO) บนใบเสนอราคา"
                  invalid={errors.notes}
                  {...register('notes')}
                />
                <span className="font-en text-right text-xs text-[var(--text-muted)]">
                  {(notes || '').length}/500
                </span>
              </Field>
            </SectionCard>

            <WarningNote className="lg:hidden">{VAT_NOTICE}</WarningNote>
          </div>

          {/* ================= Desktop summary ================= */}
          <aside className="hidden lg:sticky lg:top-6 lg:block">
            <DesktopSummary
              course={selectedCourse}
              pricing={pricing}
              pending={reviewing}
              error={formError}
            />
          </aside>
        </div>

        {/* ================= Mobile summary bar ================= */}
        {step === 1 ? (
          <MobileSummaryBar pricing={pricing} pending={reviewing} error={formError} />
        ) : null}
      </form>
    </div>
  );
}
