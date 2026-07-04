/**
 * Cloudflare R2 upload — uses Supabase JWT (no Firebase dependency).
 * Presign endpoint: Supabase Edge Function /r2-presign
 */

import { supabase } from '@/lib/supabase';

export const R2_UPLOAD_ENABLED = import.meta.env.VITE_R2_UPLOAD_ENABLED === 'true';
export const R2_MAX_BYTES = 5 * 1024 * 1024; // 5MB

export type R2UploadResult = {
  url: string;
  key: string;
  bytes: number;
  contentType: string;
};

type PresignResponse = {
  uploadUrl: string;
  publicUrl: string;
  key: string;
  contentType: string;
};

export type R2Folder = 'products' | 'templates' | 'builder' | 'users' | 'stores';

export async function uploadImageToR2(
  file: File,
  folder: R2Folder,
  storeId?: string,
): Promise<R2UploadResult> {
  if (!R2_UPLOAD_ENABLED) {
    throw new Error('R2 uploads not enabled. Set VITE_R2_UPLOAD_ENABLED=true');
  }
  if (file.size > R2_MAX_BYTES) {
    throw new Error(`Image must be under ${R2_MAX_BYTES / 1024 / 1024}MB`);
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Sign in required to upload');

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const presignRes = await fetch(`${supabaseUrl}/functions/v1/r2-presign`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      storeId,
      folder,
      fileName: file.name,
      contentType: file.type || 'image/jpeg',
      sizeBytes: file.size,
    }),
  });

  if (!presignRes.ok) {
    const err = await presignRes.text();
    throw new Error(err || 'Failed to get upload URL');
  }

  const presign = (await presignRes.json()) as PresignResponse;

  const putRes = await fetch(presign.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': presign.contentType },
    body: file,
  });

  if (!putRes.ok) throw new Error('R2 upload failed');

  return {
    url: presign.publicUrl,
    key: presign.key,
    bytes: file.size,
    contentType: presign.contentType,
  };
}
