'use client';

import { useId, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { formatMoney } from '@/lib/format';
import { BottomSheet } from '@/components/public/sheet';
import { Chip, PrimaryButton } from '@/components/public/ui';
import { CheckIcon, ChevronDownIcon, SearchIcon } from '@/components/public/icons';

/** Whether a struck-through list price should show next to the sell price. */
export function showListPrice(course) {
  return Boolean(course?.isPromoActive && course.price > course.sellPrice);
}

/** Course cover, or a brand gradient when the course has none. */
export function CourseCover({ course, className }) {
  if (course?.coverUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={course.coverUrl}
        alt=""
        className={cn('shrink-0 rounded-lg object-cover', className)}
      />
    );
  }
  return (
    <div
      aria-hidden="true"
      className={cn(
        'shrink-0 rounded-lg bg-gradient-to-br from-[var(--9e-action)] to-[var(--9e-air)]',
        className
      )}
    />
  );
}

/** "2,990.00 ฿" with the struck list price when a promotion applies. */
function PriceInline({ course, className }) {
  return (
    <span className={cn('font-en flex flex-wrap items-baseline gap-x-2', className)}>
      <span className="font-semibold text-[var(--text-primary)]">
        {formatMoney(course.sellPrice)} ฿
      </span>
      {showListPrice(course) ? (
        <span className="text-xs text-[var(--text-muted)] line-through">
          {formatMoney(course.price)}
        </span>
      ) : null}
    </span>
  );
}

function filterCourses(courses, query) {
  const q = query.trim().toLowerCase();
  if (!q) return courses;
  return courses.filter(
    (c) =>
      c.courseName.toLowerCase().includes(q) ||
      c.courseCode.toLowerCase().includes(q)
  );
}

// ---------------------------------------------------------------------------
// Desktop: searchable combobox + selected-course panel
// ---------------------------------------------------------------------------

export function CourseCombobox({ id, courses, value, onChange, invalid }) {
  const listId = useId();
  const inputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  const selected = courses.find((c) => c.id === value) || null;
  const results = useMemo(() => filterCourses(courses, query), [courses, query]);

  function openList() {
    setQuery('');
    setActive(Math.max(0, courses.findIndex((c) => c.id === value)));
    setOpen(true);
  }

  function choose(course) {
    onChange(course.id);
    setOpen(false);
    setQuery('');
    inputRef.current?.blur();
  }

  function onKeyDown(e) {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      e.preventDefault();
      openList();
      return;
    }
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(results.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[active]) choose(results[active]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      setQuery('');
    }
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-invalid={invalid ? 'true' : undefined}
        autoComplete="off"
        placeholder={selected ? selected.courseName : 'ค้นหาหรือเลือกหลักสูตร'}
        value={open ? query : selected?.courseName || ''}
        onFocus={openList}
        onClick={() => !open && openList()}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          if (!open) setOpen(true);
        }}
        onKeyDown={onKeyDown}
        className={cn(
          'h-12 w-full rounded-[10px] border border-[var(--surface-border)] bg-white pl-3.5 pr-10 text-base text-[var(--text-primary)]',
          'placeholder:text-[var(--text-muted)]',
          'focus:outline-none focus:border-[var(--9e-brand)] focus:shadow-[inset_0_0_0_1px_var(--9e-brand),0_0_0_4px_rgba(36,134,255,0.18)]',
          'aria-[invalid=true]:border-[var(--danger)]'
        )}
      />
      <ChevronDownIcon
        className={cn(
          'pointer-events-none absolute right-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--text-secondary)] transition-transform',
          open && 'rotate-180'
        )}
      />
      {open ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 max-h-80 overflow-y-auto rounded-xl border border-[var(--surface-border)] bg-white p-1.5 shadow-[0_12px_32px_rgba(13,27,42,0.12)]"
        >
          {results.length === 0 ? (
            <li className="px-3 py-3 text-sm text-[var(--text-muted)]">ไม่พบหลักสูตร</li>
          ) : (
            results.map((c, i) => (
              <li
                key={c.id}
                role="option"
                aria-selected={c.id === value}
                // Cancelling mousedown keeps focus in the input, so its blur
                // does not close the list before the click lands.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(c)}
                onMouseEnter={() => setActive(i)}
                className={cn(
                  'flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2',
                  i === active && 'bg-[var(--surface-muted)]',
                  c.id === value && 'bg-[var(--brand-tint)]'
                )}
              >
                <CourseCover course={c} className="h-9 w-16 rounded-md" />
                <span className="min-w-0 flex-1 truncate text-sm text-[var(--text-primary)]">
                  {c.courseName}
                </span>
                <PriceInline course={c} className="shrink-0 text-sm" />
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}

/** Desktop "selected course" panel under the combobox. */
export function SelectedCoursePanel({ course }) {
  if (!course) return null;
  return (
    <div className="mt-4 flex items-center gap-5 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-muted)] p-4">
      <CourseCover course={course} className="h-[90px] w-40" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-[var(--text-primary)]">{course.courseName}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Chip>รหัส {course.courseCode}</Chip>
          <Chip>เรียนได้ 365 วัน</Chip>
          {course.isPromoActive ? <Chip tone="success">โปรโมชัน</Chip> : null}
        </div>
      </div>
      <div className="font-en shrink-0 text-right">
        {showListPrice(course) ? (
          <p className="text-sm text-[var(--text-muted)] line-through">
            {formatMoney(course.price)}
          </p>
        ) : null}
        <p className="text-xl font-bold text-[var(--text-primary)]">
          {formatMoney(course.sellPrice)} ฿
        </p>
        <p className="font-thai text-xs text-[var(--text-muted)]">ต่อท่าน · รวม VAT</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mobile: tappable picker row + bottom sheet
// ---------------------------------------------------------------------------

export function MobileCoursePicker({ id, courses, value, onChange, invalid }) {
  const [open, setOpen] = useState(false);
  const selected = courses.find((c) => c.id === value) || null;

  return (
    <>
      <button
        id={id}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className={cn(
          'flex w-full items-center gap-3 rounded-xl border bg-white p-3 text-left',
          selected
            ? 'border-[var(--9e-brand)] bg-[var(--brand-tint)]'
            : 'border-[var(--surface-border)]',
          invalid && 'border-[var(--danger)]'
        )}
      >
        {selected ? (
          <>
            <CourseCover course={selected} className="h-[54px] w-24 rounded-md" />
            <span className="min-w-0 flex-1">
              <span className="line-clamp-2 text-sm font-semibold text-[var(--text-primary)]">
                {selected.courseName}
              </span>
              <PriceInline course={selected} className="mt-0.5 text-sm" />
            </span>
          </>
        ) : (
          <span className="flex-1 py-3 text-base text-[var(--text-muted)]">
            แตะเพื่อเลือกหลักสูตร
          </span>
        )}
        <ChevronDownIcon className="h-5 w-5 shrink-0 text-[var(--text-secondary)]" />
      </button>

      {selected ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {selected.isPromoActive ? <Chip tone="success">โปรโมชัน</Chip> : null}
          <Chip>เรียนได้ 365 วัน</Chip>
        </div>
      ) : null}

      {open ? (
        <CourseSheet
          courses={courses}
          value={value}
          onClose={() => setOpen(false)}
          onConfirm={(courseId) => {
            onChange(courseId);
            setOpen(false);
          }}
        />
      ) : null}
    </>
  );
}

function CourseSheet({ courses, value, onClose, onConfirm }) {
  const [query, setQuery] = useState('');
  const [pending, setPending] = useState(value || '');
  const results = useMemo(() => filterCourses(courses, query), [courses, query]);

  return (
    <BottomSheet
      title="เลือกหลักสูตร"
      onClose={onClose}
      footer={
        <PrimaryButton disabled={!pending} onClick={() => onConfirm(pending)}>
          เลือกหลักสูตรนี้
        </PrimaryButton>
      }
    >
      <div className="relative mb-3">
        <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--text-muted)]" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ค้นหาชื่อหลักสูตร"
          aria-label="ค้นหาชื่อหลักสูตร"
          className="h-12 w-full rounded-[10px] border border-[var(--surface-border)] bg-[var(--surface-muted)] pl-11 pr-3.5 text-base placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--9e-brand)] focus:shadow-[inset_0_0_0_1px_var(--9e-brand),0_0_0_4px_rgba(36,134,255,0.18)]"
        />
      </div>
      <ul role="listbox" aria-label="หลักสูตร" className="flex flex-col gap-2">
        {results.length === 0 ? (
          <li className="py-6 text-center text-sm text-[var(--text-muted)]">ไม่พบหลักสูตร</li>
        ) : (
          results.map((c) => {
            const isSel = c.id === pending;
            return (
              <li key={c.id} role="option" aria-selected={isSel}>
                <button
                  type="button"
                  onClick={() => setPending(c.id)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl border p-2.5 text-left',
                    isSel
                      ? 'border-[var(--9e-brand)] bg-[var(--brand-tint)]'
                      : 'border-[var(--surface-border)] bg-white'
                  )}
                >
                  <CourseCover course={c} className="h-[50px] w-[88px] rounded-md" />
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 text-sm font-semibold text-[var(--text-primary)]">
                      {c.courseName}
                    </span>
                    <PriceInline course={c} className="mt-0.5 text-sm" />
                  </span>
                  {isSel ? (
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--9e-action)] text-white">
                      <CheckIcon className="h-3.5 w-3.5" />
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })
        )}
      </ul>
    </BottomSheet>
  );
}
