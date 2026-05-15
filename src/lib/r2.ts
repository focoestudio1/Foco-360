// ============================================================
// Cliente Cloudflare R2 (S3-compatible).
//
// Funciones:
//  - uploadBuffer: sube un archivo a R2 (server-side).
//  - getSignedReadUrl: genera URL firmada temporal para leer
//    un objeto (las imágenes son privadas en el bucket).
//  - deleteObject: elimina un objeto.
//  - buildSceneKey: convención de nombres dentro del bucket.
// ============================================================

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Instancia única (reusable entre invocaciones serverless).
let _client: S3Client | null = null;

function getClient(): S3Client {
  if (_client) return _client;
  _client = new S3Client({
    region: 'auto', // R2 ignora la región pero el SDK la requiere.
    endpoint: process.env.R2_ENDPOINT!,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
  return _client;
}

const BUCKET = () => process.env.R2_BUCKET_NAME!;
const EXPIRES = () => Number(process.env.R2_SIGNED_URL_EXPIRES ?? 3600);

// Sube un buffer a R2 bajo la key indicada.
export async function uploadBuffer(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string
): Promise<void> {
  await getClient().send(
    new PutObjectCommand({
      Bucket: BUCKET(),
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
}

// Genera URL firmada temporal para leer un objeto.
export async function getSignedReadUrl(
  key: string,
  expiresIn = EXPIRES()
): Promise<string> {
  const cmd = new GetObjectCommand({ Bucket: BUCKET(), Key: key });
  return getSignedUrl(getClient(), cmd, { expiresIn });
}

// Elimina un objeto por key.
export async function deleteObject(key: string): Promise<void> {
  await getClient().send(
    new DeleteObjectCommand({ Bucket: BUCKET(), Key: key })
  );
}

// Elimina todos los objetos bajo un prefijo (ej. al borrar proyecto).
export async function deletePrefix(prefix: string): Promise<void> {
  const client = getClient();
  let continuationToken: string | undefined;
  do {
    const list = await client.send(
      new ListObjectsV2Command({
        Bucket: BUCKET(),
        Prefix: prefix,
        ContinuationToken: continuationToken,
      })
    );
    const keys = list.Contents?.map((o) => ({ Key: o.Key! })) ?? [];
    if (keys.length > 0) {
      await client.send(
        new DeleteObjectsCommand({
          Bucket: BUCKET(),
          Delete: { Objects: keys },
        })
      );
    }
    continuationToken = list.IsTruncated ? list.NextContinuationToken : undefined;
  } while (continuationToken);
}

// Construye keys consistentes para escenas: projects/<slug>/<filename>
export function buildSceneKey(slug: string, filename: string): string {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const stamp = Date.now();
  return `projects/${slug}/${stamp}-${safe}`;
}

// Key para la portada del proyecto.
export function buildCoverKey(slug: string, filename: string): string {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `projects/${slug}/cover-${Date.now()}-${safe}`;
}
