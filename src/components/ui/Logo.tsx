import Link from 'next/link';
import { cn } from '@/lib/utils';

// ============================================================
// Logo de la marca.
//
// Lee dos variables de entorno:
//  - NEXT_PUBLIC_LOGO_URL: ruta a la imagen del logo (ej. /logo.png).
//    Si está definida, renderiza la imagen.
//  - NEXT_PUBLIC_BRAND_NAME: texto fallback (si no hay imagen) y alt
//    de la imagen para lectores de pantalla.
//
// Para temas oscuros: la imagen se renderiza dentro de un "chip"
// claro con bordes redondeados para garantizar contraste sin
// importar el color del logo original.
// ============================================================

export function Logo({
  className,
  asLink = true,
}: {
  className?: string;
  asLink?: boolean;
}) {
  const brand = process.env.NEXT_PUBLIC_BRAND_NAME || 'FOCO';
  const logoUrl = process.env.NEXT_PUBLIC_LOGO_URL;

  const content = logoUrl ? (
    <span
      className={cn(
        'inline-flex items-center rounded-md bg-white/95 px-2 py-1 shadow-sm',
        className
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logoUrl}
        alt={brand}
        className="h-6 w-auto"
        draggable={false}
      />
    </span>
  ) : (
    <span
      className={cn(
        'flex items-center gap-2 text-sm font-semibold tracking-wider',
        className
      )}
    >
      <span className="inline-block h-2 w-2 rounded-full bg-gold shadow-[0_0_12px_rgba(212,175,55,0.6)]" />
      <span className="text-text">{brand}</span>
    </span>
  );
  return asLink ? <Link href="/">{content}</Link> : content;
}
