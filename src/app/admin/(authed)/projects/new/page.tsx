// ============================================================
// Página: crear nuevo proyecto.
// ============================================================

import Link from 'next/link';
import { NewProjectForm } from './NewProjectForm';

export const metadata = { title: 'Nuevo proyecto' };

export default function NewProjectPage() {
  return (
    <div className="animate-fade-in mx-auto max-w-xl space-y-6">
      <div>
        <Link
          href="/admin/projects"
          className="text-xs text-text-muted hover:text-text"
        >
          ← Volver
        </Link>
        <h1 className="mt-2 text-2xl font-light tracking-tight">
          Nuevo proyecto
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          Crea un nuevo tour. Podrás subir las escenas 360° en el siguiente
          paso.
        </p>
      </div>

      <div className="card">
        <NewProjectForm />
      </div>
    </div>
  );
}
