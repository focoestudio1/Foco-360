// ============================================================
// Helper de subida directa a R2 desde el navegador.
//
// Flujo:
//   1. (opcional) Comprimir si la imagen pesa demasiado.
//   2. POST /sign-upload → recibe { uploadUrl, key }
//   3. PUT a uploadUrl con el archivo (con progreso vía XHR)
//   4. POST al endpoint de confirmación (cover o scenes)
//
// Se usa XHR porque fetch() aún no soporta upload progress nativo.
// ============================================================

import imageCompression from 'browser-image-compression';

export type UploadKind = 'cover' | 'scene' | 'logo' | 'audio' | 'floorplan';

export type UploadProgress = {
  // Fase actual: comprimir o subir.
  phase: 'compressing' | 'uploading';
  // Bytes subidos (solo válido en fase 'uploading').
  loaded: number;
  total: number;
  // Porcentaje 0..100 de la fase actual.
  pct: number;
};

// Umbrales por tipo (en MB). Logos suelen ser chicos pero queremos
// optimizar incluso PNG medianos. Escenas/portadas tienen umbral alto.
// Audio: no se comprime (umbral infinito).
const THRESHOLDS_MB: Record<UploadKind, number> = {
  scene: 5,
  cover: 5,
  logo: 1,
  audio: Infinity,
  floorplan: 2,
};

// Comprime si hace falta. Mantiene calidad visual alta:
// - Escenas (panoramas): max 4096×2048, JPEG q=90.
// - Portadas: max 1920 wide, JPEG q=90.
// - Logos: max 800 wide, preserva PNG (transparencia) si era PNG.
async function compressIfNeeded(
  file: File,
  kind: UploadKind,
  onProgress?: (pct: number) => void
): Promise<File> {
  if (!file.type.startsWith('image/')) return file;
  // SVG: vector. Nunca tocar.
  if (file.type === 'image/svg+xml') return file;
  // Salta si ya pesa poco.
  if (file.size < THRESHOLDS_MB[kind] * 1024 * 1024) return file;

  // (audio nunca entra aquí porque su umbral es Infinity)
  const maxDim =
    kind === 'scene' ? 4096 :
    kind === 'logo' ? 800 :
    kind === 'floorplan' ? 2400 :
    1920;
  const targetMB =
    kind === 'scene' ? 5 :
    kind === 'logo' ? 0.5 :
    kind === 'floorplan' ? 1 :
    1.5;

  // Para escenas/portadas convertimos a JPEG (mejor compresión).
  // Para logos preservamos el formato original — un PNG con
  // transparencia debe seguir siendo PNG.
  const isLogo = kind === 'logo';

  const options = {
    maxSizeMB: targetMB,
    maxWidthOrHeight: maxDim,
    initialQuality: 0.9,
    useWebWorker: true,
    ...(isLogo ? {} : { fileType: 'image/jpeg' as const }),
    onProgress,
  };

  const result = await imageCompression(file, options);
  if (result instanceof File) return result;
  // Logo: mantiene nombre/ext originales. Otro: renombra a .jpg.
  if (isLogo) {
    return new File([result], file.name, { type: file.type });
  }
  const renamed = file.name.replace(/\.[^.]+$/, '.jpg');
  return new File([result], renamed, { type: 'image/jpeg' });
}

// PUT con progreso. Resuelve cuando R2 confirma el upload.
function putWithProgress(
  url: string,
  file: File,
  onProgress?: (p: UploadProgress) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url, true);
    xhr.setRequestHeader('Content-Type', file.type);

    xhr.upload.onprogress = (e) => {
      if (!e.lengthComputable || !onProgress) return;
      onProgress({
        phase: 'uploading',
        loaded: e.loaded,
        total: e.total,
        pct: Math.round((e.loaded / e.total) * 100),
      });
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`R2 respondió ${xhr.status}: ${xhr.responseText}`));
    };
    xhr.onerror = () =>
      reject(new Error('Error de red durante el upload (¿CORS configurado?)'));
    xhr.onabort = () => reject(new Error('Upload cancelado'));

    xhr.send(file);
  });
}

// Pide URL firmada al servidor.
async function getSignedUrl(
  projectId: string,
  kind: UploadKind,
  file: File
): Promise<{ uploadUrl: string; key: string }> {
  const res = await fetch(`/api/admin/projects/${projectId}/sign-upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      kind,
      filename: file.name,
      contentType: file.type,
      size: file.size,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `No se pudo firmar (${res.status})`);
  }
  return res.json();
}

// Lee dimensiones de una imagen sin subirla (usando un Image en memoria).
// Devuelve null si no se puede leer.
export function getImageDimensions(
  file: File
): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

// API pública: sube una escena (comprime si hace falta + confirmación DB).
export async function uploadScene(
  projectId: string,
  file: File,
  title: string,
  onProgress?: (p: UploadProgress) => void
): Promise<{ scene: any }> {
  // 1. Compresión si supera el umbral.
  const compressed = await compressIfNeeded(file, 'scene', (pct) =>
    onProgress?.({ phase: 'compressing', loaded: 0, total: 0, pct })
  );
  // 2. Firmamos URL con el archivo (ya comprimido).
  const { uploadUrl, key } = await getSignedUrl(projectId, 'scene', compressed);
  // 3. PUT directo a R2 con progreso.
  await putWithProgress(uploadUrl, compressed, onProgress);
  // 4. Confirmar en DB.
  const confirm = await fetch(`/api/admin/projects/${projectId}/scenes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, title }),
  });
  if (!confirm.ok) {
    const err = await confirm.json().catch(() => ({}));
    throw new Error(err.error || 'Error al confirmar la escena');
  }
  return confirm.json();
}

// API pública: sube el plano 2D del proyecto.
export async function uploadFloorplan(
  projectId: string,
  file: File,
  onProgress?: (p: UploadProgress) => void
): Promise<{ key: string }> {
  const compressed = await compressIfNeeded(file, 'floorplan', (pct) =>
    onProgress?.({ phase: 'compressing', loaded: 0, total: 0, pct })
  );
  const { uploadUrl, key } = await getSignedUrl(projectId, 'floorplan', compressed);
  await putWithProgress(uploadUrl, compressed, onProgress);
  const confirm = await fetch(`/api/admin/projects/${projectId}/floorplan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key }),
  });
  if (!confirm.ok) {
    const err = await confirm.json().catch(() => ({}));
    throw new Error(err.error || 'Error al confirmar el plano');
  }
  return confirm.json();
}

// API pública: sube un audio para una escena. No se comprime.
// La confirmación va al endpoint de la escena, no del proyecto.
export async function uploadAudio(
  projectId: string,
  sceneId: string,
  file: File,
  onProgress?: (p: UploadProgress) => void
): Promise<{ key: string }> {
  const { uploadUrl, key } = await getSignedUrl(projectId, 'audio', file);
  await putWithProgress(uploadUrl, file, onProgress);
  const confirm = await fetch(`/api/admin/scenes/${sceneId}/audio`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key }),
  });
  if (!confirm.ok) {
    const err = await confirm.json().catch(() => ({}));
    throw new Error(err.error || 'Error al confirmar el audio');
  }
  return confirm.json();
}

// API pública: sube el logo del proyecto (comprime + confirmación DB).
export async function uploadLogo(
  projectId: string,
  file: File,
  onProgress?: (p: UploadProgress) => void
): Promise<{ key: string }> {
  const compressed = await compressIfNeeded(file, 'logo', (pct) =>
    onProgress?.({ phase: 'compressing', loaded: 0, total: 0, pct })
  );
  const { uploadUrl, key } = await getSignedUrl(projectId, 'logo', compressed);
  await putWithProgress(uploadUrl, compressed, onProgress);
  const confirm = await fetch(`/api/admin/projects/${projectId}/logo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key }),
  });
  if (!confirm.ok) {
    const err = await confirm.json().catch(() => ({}));
    throw new Error(err.error || 'Error al confirmar el logo');
  }
  return confirm.json();
}

// API pública: sube una portada (comprime si hace falta + confirmación DB).
export async function uploadCover(
  projectId: string,
  file: File,
  onProgress?: (p: UploadProgress) => void
): Promise<{ key: string }> {
  const compressed = await compressIfNeeded(file, 'cover', (pct) =>
    onProgress?.({ phase: 'compressing', loaded: 0, total: 0, pct })
  );
  const { uploadUrl, key } = await getSignedUrl(projectId, 'cover', compressed);
  await putWithProgress(uploadUrl, compressed, onProgress);
  const confirm = await fetch(`/api/admin/projects/${projectId}/cover`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key }),
  });
  if (!confirm.ok) {
    const err = await confirm.json().catch(() => ({}));
    throw new Error(err.error || 'Error al confirmar la portada');
  }
  return confirm.json();
}
