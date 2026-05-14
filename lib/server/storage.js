import { createClient } from '@supabase/supabase-js';

const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'sipagi-documents';

export function getStorageClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Konfigurasi Supabase Storage belum lengkap');
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function ensureBucket() {
  const supabase = getStorageClient();
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) throw error;
  if (buckets.some((row) => row.name === bucket)) return bucket;
  const createResult = await supabase.storage.createBucket(bucket, { public: false });
  if (createResult.error) throw createResult.error;
  return bucket;
}

export async function uploadDocument({ sppgId, moduleKey, entityType, entityId, fileName, mimeType, bytes }) {
  const supabase = getStorageClient();
  const objectKey = `${sppgId}/${moduleKey}/${entityType}/${entityId}/${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]+/g, '-')}`;
  const { data, error } = await supabase.storage.from(bucket).upload(objectKey, bytes, {
    contentType: mimeType,
    upsert: false
  });
  if (error) throw error;
  return { bucket, storageKey: data.path };
}
