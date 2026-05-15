// ============================================================
// Helpers de autenticación para el panel admin.
//
// El acceso a /admin requiere DOS condiciones:
//   1. Sesión válida de Supabase Auth.
//   2. El email del usuario coincide con ADMIN_EMAIL del .env.
//
// Esto evita que cualquier registro en Supabase pueda
// entrar al admin si por error se habilita el signup público.
// ============================================================

import { createSupabaseServerClient } from './supabase-server';

export type AdminUser = {
  id: string;
  email: string;
};

// Devuelve el usuario admin o null si no está autenticado / no es el admin.
export async function getAdminUser(): Promise<AdminUser | null> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) return null;

  const allowed = process.env.ADMIN_EMAIL?.toLowerCase().trim();
  if (!allowed) {
    console.warn('[auth] ADMIN_EMAIL no está configurado en .env');
    return null;
  }

  if (user.email.toLowerCase().trim() !== allowed) {
    return null;
  }

  return { id: user.id, email: user.email };
}

// Variante que lanza error 401 — útil en API routes.
export async function requireAdmin(): Promise<AdminUser> {
  const user = await getAdminUser();
  if (!user) {
    throw new Response('Unauthorized', { status: 401 });
  }
  return user;
}
