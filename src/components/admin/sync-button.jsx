'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

// Receives the sync server action as a prop (passed from the server page).
export function SyncButton({ action }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState(null);
  const router = useRouter();

  function onClick() {
    setResult(null);
    startTransition(async () => {
      const r = await action();
      setResult(r);
      if (r?.ok) router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-3">
      <Button onClick={onClick} disabled={pending}>
        {pending ? 'กำลังซิงค์…' : 'ซิงค์หลักสูตรจาก MSDB'}
      </Button>
      {result?.ok ? (
        <span className="text-sm text-[var(--text-secondary)]">
          ทั้งหมด {result.total} · เพิ่มใหม่ {result.inserted} · อัปเดต {result.updated}
        </span>
      ) : null}
      {result && !result.ok ? (
        <span className="text-sm text-red-600 dark:text-red-400">ซิงค์ล้มเหลว: {result.error}</span>
      ) : null}
    </div>
  );
}
