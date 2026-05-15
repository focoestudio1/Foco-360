# Foco 360° — Plataforma de tours virtuales inmobiliarios

Plataforma web para publicar tours virtuales 360° privados (estilo Pixieset, pero para contenido inmersivo). Cada tour tiene su propio link único + contraseña, las imágenes se sirven con URLs firmadas desde Cloudflare R2, y el panel admin permite gestionar todo desde el navegador.

## Stack

- **Framework**: Next.js 14 (App Router)
- **DB + Auth**: Supabase (PostgreSQL)
- **Storage**: Cloudflare R2 (S3-compatible)
- **Visor 360°**: Pannellum.js (cargado por CDN)
- **Estilos**: Tailwind CSS (tema oscuro + dorado)
- **Hosting**: Vercel

## Características

- Panel admin privado (`/admin`) con auth de Supabase + whitelist por email.
- CRUD completo de proyectos: nombre, cliente, descripción, portada, contraseña, activo/inactivo.
- Subida de fotos 360° equirrectangulares por proyecto.
- Reordenamiento de escenas vía **drag-and-drop**.
- **Hotspots** clickeables entre escenas (pitch/yaw editables).
- Link único por proyecto: `tudominio.com/tour/<slug>`.
- Acceso al tour protegido por contraseña (bcrypt + cookie HttpOnly).
- Contador de vistas y timestamp de última visita.
- Visor responsive con miniaturas, fullscreen y logo overlay.
- Imágenes privadas en R2 — siempre servidas con URL firmada temporal.

## Estructura

```
src/
├── app/
│   ├── admin/
│   │   ├── login/                  # Login público del admin
│   │   └── (authed)/               # Route group protegido por middleware
│   │       ├── layout.tsx          # Topbar admin
│   │       ├── page.tsx            # Dashboard
│   │       └── projects/
│   │           ├── page.tsx        # Lista
│   │           ├── new/page.tsx    # Crear
│   │           └── [id]/page.tsx   # Editar
│   ├── tour/[slug]/                # Visor público
│   ├── api/
│   │   ├── admin/                  # Endpoints protegidos (requireAdmin)
│   │   └── tour/[slug]/            # Endpoints públicos (cookie de acceso)
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── admin/                      # ProjectEditor, ScenesManager, etc.
│   ├── viewer/                     # PannellumViewer, TourViewer, TourAccess
│   └── ui/                         # Button, Input, Logo, Toast
├── lib/
│   ├── auth.ts                     # getAdminUser / requireAdmin
│   ├── r2.ts                       # Cliente Cloudflare R2 (S3 SDK)
│   ├── supabase.ts                 # Cliente browser
│   ├── supabase-server.ts          # Cliente server + service role
│   └── utils.ts                    # slug, cn, fechas
└── middleware.ts                   # Protege /admin/* (excepto /admin/login)

supabase/
└── schema.sql                      # Tablas projects, scenes, hotspots
```

---

## Instalación paso a paso

### 1. Clonar e instalar dependencias

```bash
cd "F:/Foco 360"
npm install
```

### 2. Configurar Supabase

1. Crea un proyecto gratis en https://supabase.com/dashboard
2. Ve a **SQL Editor → New Query**, pega el contenido de [`supabase/schema.sql`](supabase/schema.sql) y ejecuta.
3. Ve a **Authentication → Providers → Email** y verifica que esté habilitado.
4. Ve a **Authentication → Users → Add user → Create new user**:
   - Email: el email que vayas a usar como admin (debe coincidir con `ADMIN_EMAIL` del .env).
   - Password: el que quieras para el login del admin.
   - Marca **Auto-confirm email** para no tener que verificar.
5. Ve a **Settings → API** y copia:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` (clic en "Reveal") → `SUPABASE_SERVICE_ROLE_KEY` ⚠️ secreto

### 3. Configurar Cloudflare R2

1. Entra a https://dash.cloudflare.com → **R2**.
2. Crea un nuevo bucket (ej. `foco-360-tours`). Déjalo **privado**.
3. Anota el **endpoint** del bucket: `https://<account_id>.r2.cloudflarestorage.com`.
4. Ve a **R2 → Manage R2 API Tokens → Create API Token**:
   - Permission: **Object Read & Write**
   - Specify bucket: tu bucket (`foco-360-tours`)
   - TTL: el que prefieras
5. Copia:
   - `Access Key ID` → `R2_ACCESS_KEY_ID`
   - `Secret Access Key` → `R2_SECRET_ACCESS_KEY`
   - El Account ID lo encuentras arriba a la derecha en R2 → `R2_ACCOUNT_ID`

> Las imágenes nunca se sirven públicamente: el backend genera URLs firmadas temporales (1h por defecto) cada vez que el visor las necesita.

### 4. Configurar variables de entorno

Copia el ejemplo y completa:

```bash
cp .env.example .env.local
```

Edita `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

ADMIN_EMAIL=tu-email@ejemplo.com         # mismo email que creaste en Supabase

R2_ACCOUNT_ID=xxxxxxxxxxxx
R2_ACCESS_KEY_ID=xxxxxxxxxxxx
R2_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxx
R2_BUCKET_NAME=foco-360-tours
R2_ENDPOINT=https://xxxxxxxxxxxx.r2.cloudflarestorage.com
R2_SIGNED_URL_EXPIRES=3600

NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_BRAND_NAME=MI PRODUCTORA 360°
```

### 5. Correr en local

```bash
npm run dev
```

Abre http://localhost:3000

- Landing pública: `/`
- Login admin: `/admin/login`
- Después de login: `/admin`

---

## Deploy en Vercel

1. Sube el proyecto a un repo de GitHub.
2. Entra a https://vercel.com → **New Project** → importa el repo.
3. En **Environment Variables**, copia TODAS las del `.env.local`. Importante:
   - Marca como **Production / Preview / Development** las que aplique.
   - `NEXT_PUBLIC_SITE_URL` debe apuntar a tu dominio real (`https://tudominio.com` o `https://tu-proyecto.vercel.app`).
4. **Deploy**.
5. Una vez deployado, en Supabase ve a **Authentication → URL Configuration** y agrega tu dominio Vercel a **Redirect URLs** (no es estrictamente necesario para login con password, pero conviene tenerlo).

---

## Primer login y primer tour

1. Abre `https://tudominio.com/admin/login`.
2. Ingresa con el email/password que creaste en Supabase.
3. En el dashboard: **+ Nuevo proyecto**.
4. Después de crear, te lleva al editor: sube portada → sube escenas 360° → arrastra para ordenar.
5. (Opcional) Selecciona una escena, agrega un hotspot, elige escena destino y ajusta `pitch/yaw`.
6. Copia el **Link público** y compártelo con tu cliente junto con la contraseña.

> 💡 Tip: para obtener las coordenadas exactas de un hotspot, abre el visor del tour en la escena origen, navega hasta apuntar al punto donde quieres el hotspot, abre la consola del navegador y ejecuta:
> ```js
> document.querySelector('.pnlm-container').__viewer?.getYaw?.()
> document.querySelector('.pnlm-container').__viewer?.getPitch?.()
> ```

---

## Notas técnicas

### Seguridad

- **Admin**: protegido por middleware (`src/middleware.ts`) que valida sesión Supabase + email contra `ADMIN_EMAIL`. Cualquier otro usuario es rechazado.
- **Tours**: la contraseña se guarda hasheada con bcrypt (10 rounds). Tras login exitoso, el servidor setea una cookie HttpOnly específica del slug con TTL de 4h.
- **R2**: el bucket es privado. Las URLs se firman con AWS SDK y caducan en `R2_SIGNED_URL_EXPIRES` segundos.
- **RLS**: las tablas tienen Row Level Security activado sin políticas públicas. Todo el acceso va por API routes con Service Role.

### Límites de Vercel

- En el plan Hobby el body de las requests está limitado a ~4.5 MB. Si subes panorámicas pesadas (>4 MB) considera:
  - Comprimirlas antes (recomendado: JPEG calidad 85, máx. 8192×4096).
  - Migrar a subida directa con URL firmada (PUT desde el navegador). Esto es un TODO para una v2.

### Escalabilidad / próximos pasos

- Soporte multi-admin con tabla `admins`.
- Estadísticas más ricas (vistas por escena, tiempo promedio).
- Vista previa del visor desde el admin para colocar hotspots con click visual.
- Multi-resolución (tiles) para imágenes muy grandes.
- Branding personalizable por proyecto (logo, color).

---

## Licencia

Privado — uso interno de la productora.
