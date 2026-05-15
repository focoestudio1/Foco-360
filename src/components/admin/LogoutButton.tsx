'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';

// Cierra la sesión y vuelve al login.
export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onClick() {
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.refresh();
    router.replace('/admin/login');
  }

  return (
    <Button variant="ghost" onClick={onClick} loading={loading}>
      Cerrar sesión
    </Button>
  );
}
