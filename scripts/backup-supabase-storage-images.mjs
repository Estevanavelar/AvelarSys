#!/usr/bin/env node
/**
 * Backup de todas as imagens do Supabase Storage para backups/storage-images/
 * Com modo REST API fallback quando a SDK falha
 */

import { createClient } from '@supabase/supabase-js';
import { mkdir, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const BACKUP_DIR = join(ROOT, 'backups', 'storage-images');

const IMAGE_EXTENSIONS = new Set(
  ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico', '.avif'].map((e) => e.toLowerCase())
);

function isImagePath(path) {
  const ext = path.slice(path.lastIndexOf('.')).toLowerCase();
  return IMAGE_EXTENSIONS.has(ext);
}

async function loadEnv() {
  try {
    const { config } = await import('dotenv');
    config({ path: join(ROOT, '.env.production') });
    config({ path: join(ROOT, '.env') });
  } catch (_) {}
}

function httpsGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) });
      });
    });
    req.on('error', reject);
  });
}

async function downloadViaRest(supabaseUrl, bucket, path, serviceKey) {
  const url = `${supabaseUrl}/storage/v1/object/authenticated/${bucket}/${path}`;
  const headers = { Authorization: `Bearer ${serviceKey}` };
  const { status, body } = await httpsGet(url, headers);
  if (status !== 200) {
    const msg = body.toString('utf-8').slice(0, 200);
    throw new Error(`HTTP ${status}: ${msg}`);
  }
  return body;
}

async function main() {
  await loadEnv();

  const url =
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    'https://banco.avelarcompany.dev.br';
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY;

  if (!key) {
    console.error(
      'Defina SUPABASE_SERVICE_ROLE_KEY (ou SUPABASE_SERVICE_KEY) no .env ou .env.production'
    );
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  await mkdir(BACKUP_DIR, { recursive: true });
  console.log('📁 Destino:', BACKUP_DIR);
  console.log('🔗 Supabase:', url);
  console.log('---');

  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
  if (bucketsError) {
    console.error('❌ Erro ao listar buckets:', bucketsError.message);
    process.exit(1);
  }

  if (!buckets || buckets.length === 0) {
    console.log('⚠️  Nenhum bucket encontrado.');
    return;
  }

  let total = 0;
  let failed = 0;

  for (const bucket of buckets) {
    const bucketName = bucket.name;
    const bucketDir = join(BACKUP_DIR, bucketName);
    await mkdir(bucketDir, { recursive: true });
    console.log(`\n📦 Bucket: ${bucketName}`);

    async function listAll(path = '') {
      const { data: files, error } = await supabase.storage.from(bucketName).list(path, { limit: 1000 });
      if (error) {
        console.warn(`  ⚠️  Erro em ${path}:`, error.message);
        return;
      }
      if (!files || files.length === 0) return;

      for (const f of files) {
        const fullPath = path ? `${path}/${f.name}` : f.name;
        if (f.id == null) {
          await listAll(fullPath);
          continue;
        }
        if (!isImagePath(f.name)) continue;

        try {
          let blob;
          try {
            const { data: d, error: err } = await supabase.storage
              .from(bucketName)
              .download(fullPath);
            if (err) throw err;
            blob = d;
          } catch (sdkErr) {
            console.log(`    🔄 Tentando via REST API: ${fullPath}`);
            blob = await downloadViaRest(url, bucketName, fullPath, key);
          }

          const localPath = join(bucketDir, fullPath);
          await mkdir(dirname(localPath), { recursive: true });
          const buf = Buffer.from(await blob.arrayBuffer?.() ?? blob);
          await writeFile(localPath, buf);
          total++;
          console.log(`    ✅ ${fullPath}`);
        } catch (err) {
          failed++;
          console.log(`    ❌ ${fullPath} - ${err.message?.slice(0, 60)}`);
        }
      }
    }

    await listAll();
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✨ Backup concluído!`);
  console.log(`   ✅ ${total} imagens salvas`);
  console.log(`   ❌ ${failed} falhas`);
  console.log(`   📂 ${BACKUP_DIR}`);
}

main().catch((err) => {
  console.error('❌ Erro fatal:', err.message);
  process.exit(1);
});
