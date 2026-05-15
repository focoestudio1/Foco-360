'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

// Sistema simple de toasts (sin dependencias) — eventos por window.
type ToastEvent = { type: 'success' | 'error' | 'info'; message: string };

declare global {
  interface WindowEventMap {
    'foco:toast': CustomEvent<ToastEvent>;
  }
}

// Helper para disparar toasts desde cualquier componente.
export function showToast(type: ToastEvent['type'], message: string) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent<ToastEvent>('foco:toast', { detail: { type, message } })
  );
}

// Contenedor que debe montarse una sola vez (en layouts).
export function ToastHost() {
  const [items, setItems] = useState<(ToastEvent & { id: number })[]>([]);

  useEffect(() => {
    let counter = 0;
    const handler = (e: CustomEvent<ToastEvent>) => {
      const id = ++counter;
      setItems((prev) => [...prev, { ...e.detail, id }]);
      setTimeout(() => {
        setItems((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    };
    window.addEventListener('foco:toast', handler);
    return () => window.removeEventListener('foco:toast', handler);
  }, []);

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-[100] flex flex-col gap-2">
      {items.map((t) => (
        <div
          key={t.id}
          className={cn(
            'pointer-events-auto animate-slide-up rounded-md border px-4 py-3 text-sm shadow-xl backdrop-blur',
            t.type === 'success' &&
              'border-gold/40 bg-bg-elevated/90 text-gold',
            t.type === 'error' &&
              'border-red-700/50 bg-red-950/80 text-red-200',
            t.type === 'info' && 'border-border bg-bg-elevated/90 text-text'
          )}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
