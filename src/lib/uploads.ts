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

export type UploadKind = 'cover' | 'scene';

export type UploadProgress = {
  // Fase actual: comprimir o subir.
  phase: 'compressing' | 'uploading';
  // Bytes subidos (solo válido en fase 'uploading').
  loaded: number;
  total: number;
  // Porcentaje 0..100 de la fase actual.
  pct: number;
};

// Umbral: si el archivo pesa más que esto, se comprime.
// Por debajo del umbral se sube tal cual (las portadas chicas no necesitan).
const COMPRESS_THRESHOLD_MB = 5;

// Comprime si hace falta. Mantiene calidad visual alta:
// - Max 4096×2048 (4K, suficiente para visor 360 web)
// - JPEG quality 90 (visualmente sin pérdida perceptible)
// - Web Worker para no congelar la UI
async function compressIfNeeded(
  file: File,
  kind: UploadKind,
  onProgress?: (pct: number) => void
): Promise<File> {
  // Solo comprimimos imágenes y solo si superan el umbral.
  if (!file.type.startsWith('image/')) return file;
  if (file.size < COMPRESS_THRESHOLD_MB * 1024 * 1024) return file;

  // Para escenas (panoramas equirrectangulares) queremos máx 4096×2048.
  // Para portadas basta con 1920 de ancho — son thumbnails.
  const maxDim = kind === 'scene' ? 4096 : 1920;
  const targetMB = kind === 'scene' ? 5 : 1.5;

  const options = {
    maxSizeMB: targetMB,
    maxWidthOrHeight: maxDim,
    initialQuality: 0.9,
    useWebWorker: true,
    fileType: 'image/jpeg' as const,
    onProgress, // recibe 0..100
  };

  const result = await imageCompression(file, options);
  // Aseguramos que el resultado es un File con nombre coherente.
  if (result instanceof File) return result;
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
