// ============================================================
// Cliente Supabase para el navegador (client-side).
// Usa la anon key — RLS bloquea todo acceso directo a tablas,
// solo Auth funciona sin Service Role.
// ============================================================

import { createBrowserClient } from '@supabase/ssr';

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
