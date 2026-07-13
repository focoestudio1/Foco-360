// ============================================================
// FOCO 360 — Supabase Keep-Alive Worker
// ============================================================
// Corre en Cloudflare cada 3 dias y le pega a Supabase para que
// cuente como actividad y NO pause el proyecto (plan Free pausa
// despues de 7 dias sin actividad de la base).
//
// Variables de entorno (configurar en dashboard de Cloudflare):
//   - SUPABASE_URL           Plaintext (variable normal)
//   - SUPABASE_ANON_KEY      Secret (encriptado)
//
// Cron trigger: 0 6 */3 * *   (cada 3 dias, 6 AM UTC = 1 AM COL)
// ============================================================

export default {
  async scheduled(event, env, ctx) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] FOCO360 keep-alive ping starting`);

    try {
      const url = `${env.SUPABASE_URL}/rest/v1/projects?select=id&limit=1`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'apikey': env.SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${env.SUPABASE_ANON_KEY}`,
          'Accept': 'application/json',
        },
      });

      const ok = response.ok;
      const status = response.status;
      const body = await response.text();

      console.log(`[${timestamp}] Ping result: ${status} ${ok ? 'OK' : 'FAIL'}`);
      console.log(`[${timestamp}] Body preview: ${body.substring(0, 200)}`);

      if (!ok) {
        throw new Error(`Supabase returned ${status}: ${body}`);
      }

      return { success: true, status, timestamp };
    } catch (err) {
      console.error(`[${timestamp}] Keep-alive FAILED:`, err.message);
      return { success: false, error: err.message, timestamp };
    }
  },

  async fetch(request, env, ctx) {
    const result = await this.scheduled({}, env, ctx);
    return new Response(JSON.stringify(result, null, 2), {
      headers: { 'Content-Type': 'application/json' },
    });
  },
};
