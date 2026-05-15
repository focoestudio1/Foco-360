import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utilidad para combinar clases de Tailwind sin conflictos.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Genera un slug URL-safe a partir de un nombre.
// Ejemplo: "Casa Azul #2" → "casa-azul-2"
export function generateSlug(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quita acentos
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60);
}

// Formato de fecha legible en español (DD MMM YYYY).
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// Genera un sufijo aleatorio corto (para evitar colisiones de slug).
export function randomSuffix(len = 5): string {
  return Math.random().toString(36).slice(2, 2 + len);
}
