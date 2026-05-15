import Link from 'next/link';
import { cn } from '@/lib/utils';

// Logo de la marca — placeholder texto que se puede reemplazar
// por un SVG cambiando este componente.
export function Logo({
  className,
  asLink = true,
}: {
  className?: string;
  asLink?: boolean;
}) {
  const brand = process.env.NEXT_PUBLIC_BRAND_NAME || 'MI PRODUCTORA 360°';
  const content = (
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
