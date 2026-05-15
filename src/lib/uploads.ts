// ============================================================
// Helper de subida directa a R2 desde el navegador.
//
// Flujo:
//   1. POST /sign-upload → recibe { uploadUrl, key }
//   2. PUT a uploadUrl con el archivo (con progreso vía XHR)
//   3. POST al endpoint de confirmación (cover o scenes)
//
// Se usa XHR porque fetch() aún no soporta upload progress nativo.
// ============================================================

export type UploadKind = 'cover' | 'scene';

export type UploadProgress = {
  loaded: number;
  total: number;
  pct: number; // 0..100
};

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

// API pública: sube una escena (con confirmación DB).
export async function uploadScene(
  projectId: string,
  file: File,
  title: string,
  onProgress?: (p: UploadProgress) => void
): Promise<{ scene: any }> {
  const { uploadUrl, key } = await getSignedUrl(projectId, 'scene', file);
  await putWithProgress(uploadUrl, file, onProgress);
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

// API pública: sube una portada (con confirmación DB).
export async function uploadCover(
  projectId: string,
  file: File,
  onProgress?: (p: UploadProgress) => void
): Promise<{ key: string }> {
  const { uploadUrl, key } = await getSignedUrl(projectId, 'cover', file);
  await putWithProgress(uploadUrl, file, onProgress);
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
