// ============================================================
// Dashboard admin de leads capturados.
//
// Muestra todos los leads de todos los proyectos, ordenados por
// fecha desc. Filtro por proyecto y export CSV (client-side).
// ============================================================

import { createSupabaseAdminClient } from '@/lib/supabase-server';
import { formatDate } from '@/lib/utils';
import { LeadsTable } from '@/components/admin/LeadsTable';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Leads · FOCO 360°' };

export default async function LeadsPage() {
  const supabase = createSupabaseAdminClient();

  // Traemos leads con el nombre del proyecto (join manual).
  const { data: leads } = await supabase
    .from('leads')
    .select(
      'id, project_id, name, email, phone, message, created_at'
    )
    .order('created_at', { ascending: false });

  const { data: projects } = await supabase
    .from('projects')
    .select('id, name, slug')
    .order('name', { ascending: true });

  const projectById = new Map(
    (projects ?? []).map((p) => [p.id, p])
  );

  // Enriquecemos cada lead con el nombre del proyecto para la tabla.
  const rows = (leads ?? []).map((lead) => ({
    ...lead,
    project_name: projectById.get(lead.project_id)?.name ?? '(borrado)',
    project_slug: projectById.get(lead.project_id)?.slug ?? '',
    created_at_formatted: formatDate(lead.created_at),
  }));

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-light tracking-tight">Leads</h1>
          <p className="mt-1 text-sm text-text-muted">
            {rows.length} contacto{rows.length === 1 ? '' : 's'} recibido
            {rows.length === 1 ? '' : 's'} en total.
          </p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 text-center">
          <p className="mb-2 text-text-muted">
            Aún no hay leads capturados.
          </p>
          <p className="max-w-md text-xs text-text-subtle">
            Activá <span className="text-gold">&quot;Requerir formulario de contacto&quot;</span> en
            los settings de cualquier proyecto para empezar a capturar
            leads de los visitantes.
          </p>
        </div>
      ) : (
        <LeadsTable rows={rows} projects={projects ?? []} />
      )}
    </div>
  );
}
