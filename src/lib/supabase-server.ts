// ============================================================
// Clientes Supabase para el servidor.
//
// - createSupabaseServerClient: cliente con la sesión del usuario
//   (lee/escribe cookies). Para auth en RSC y route handlers.
//
// - createSupabaseAdminClient: cliente con Service Role.
//   BYPASEA RLS. Solo usar en server actions / API routes
//   después de verificar que el usuario es admin.
// ============================================================

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// Cliente ligado a las cookies de la request (para sesiones de usuario).
export function createSupabaseServerClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Llamado desde un Server Component — se ignora.
            // El middleware refresca cookies separadamente.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch {
            // idem
          }
        },
      },
    }
  );
}

// Cliente con permisos totales (Service Role). NO exponer al cliente.
export function createSupabaseAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    }
  );
}
