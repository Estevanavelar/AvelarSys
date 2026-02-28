// Supabase Storage helpers (server-side)

import { ENV } from './_core/env';

type StorageConfig = { baseUrl: string; apiKey: string; bucket: string };

function getStorageConfig(): StorageConfig {
  const baseUrl = ENV.supabaseUrl;
  const apiKey = ENV.supabaseServiceKey;
  const bucket = ENV.supabaseStorageBucket || "public";

  if (!baseUrl || !apiKey) {
    throw new Error(
      "Supabase storage credentials missing: set SUPABASE_URL and SUPABASE_SERVICE_KEY"
    );
  }

  return { baseUrl: baseUrl.replace(/\/+$/, ""), apiKey, bucket };
}

function buildUploadUrl(baseUrl: string, bucket: string, relKey: string): URL {
  return new URL(
    `storage/v1/object/${bucket}/${normalizeKey(relKey)}`,
    ensureTrailingSlash(baseUrl)
  );
}

function buildPublicUrl(baseUrl: string, bucket: string, relKey: string): string {
  const publicBaseUrl = ENV.supabasePublicUrl || baseUrl;
  return new URL(
    `storage/v1/object/public/${bucket}/${normalizeKey(relKey)}`,
    ensureTrailingSlash(publicBaseUrl)
  ).toString();
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function toFormData(
  data: Buffer | Uint8Array | string,
  contentType: string,
  fileName: string
): FormData {
  const blob =
    typeof data === "string"
      ? new Blob([data], { type: contentType })
      : new Blob([data as any], { type: contentType });
  const form = new FormData();
  form.append("file", blob, fileName || "file");
  return form;
}

function buildAuthHeaders(apiKey: string): HeadersInit {
  return { Authorization: `Bearer ${apiKey}`, apikey: apiKey };
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const { baseUrl, apiKey, bucket } = getStorageConfig();
  const key = normalizeKey(relKey);
  const uploadUrl = buildUploadUrl(baseUrl, bucket, key);
  const formData = toFormData(data, contentType, key.split("/").pop() ?? key);
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: buildAuthHeaders(apiKey),
    body: formData,
  });

  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(
      `Storage upload failed (${response.status} ${response.statusText}): ${message}`
    );
  }
  return { key, url: buildPublicUrl(baseUrl, bucket, key) };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string; }> {
  const { baseUrl, apiKey, bucket } = getStorageConfig();
  const key = normalizeKey(relKey);
  void apiKey;
  return {
    key,
    url: buildPublicUrl(baseUrl, bucket, key),
  };
}
