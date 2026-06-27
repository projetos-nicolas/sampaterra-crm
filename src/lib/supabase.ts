import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Client-side Supabase (anon key — respeita RLS, seguro para o browser)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ============================================================
// Helpers de Storage
// ============================================================

export const STORAGE_BUCKETS = {
  DOCUMENTOS: "documentos-tecnicos",
  FOTOS_OBRA: "fotos-obra",
} as const;

export function getPublicUrl(bucket: string, path: string): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadFile(
  bucket: string,
  path: string,
  file: File
): Promise<string> {
  const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: false,
  });
  if (error) throw new Error(`Upload falhou: ${error.message}`);
  return data.path;
}

export async function deleteFile(bucket: string, path: string): Promise<void> {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) throw new Error(`Delete falhou: ${error.message}`);
}
