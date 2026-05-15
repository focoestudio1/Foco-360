'use client';

import { useState } from 'react';
import { showToast } from '@/components/ui/Toast';

// Botón pequeño que copia un link al clipboard.
export function CopyLinkButton({ url, label = 'Copiar link' }: { url: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function onCopy(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      showToast('success', 'Link copiado al portapapeles');
      setTimeout(() => setCopied(false), 1500);
    } catch {
      showToast('error', 'No se pudo copiar');
    }
  }

  return (
    <button
      type="button"
      onClick={onCopy}
      className="text-gold hover:text-gold-light"
    >
      {copied ? '✓ Copiado' : label}
    </button>
  );
}
