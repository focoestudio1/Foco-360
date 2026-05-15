// Página 404 personalizada para tours inexistentes.
import { Logo } from '@/components/ui/Logo';

export default function TourNotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <Logo asLink={false} className="mb-8 justify-center" />
      <h1 className="mb-2 text-2xl font-light">Tour no encontrado</h1>
      <p className="text-sm text-text-muted">
        El link que intentas abrir no existe o ha sido eliminado.
      </p>
    </main>
  );
}
