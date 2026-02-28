#!/usr/bin/env node
/**
 * Backup de Storage - StockTech
 * Bucket: public (apenas pastas de StockTech)
 * URL: https://banco.avelarcompany.dev.br
 */

import { createClient } from '@supabase/supabase-js';
import { mkdir, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const BACKUP_DIR = join(ROOT, 'backups', 'storage-stocktech');

const IMAGE_EXTENSIONS = new Set(
  ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico', '.avif'].map((e) => e.toLowerCase())
);

function isImagePath(path) {
  const ext = path.slice(path.lastIndexOf('.')).toLowerCase();
  return IMAGE_EXTENSIONS.has(ext);
}

// Apenas pastas do StockTech
const STOCKTECH_FOLDERS = ['products', 'categories', 'sellers', 'orders'];

function isStockTechPath(path) {
  return STOCKTECH_FOLDERS.some((folder) => path.startsWith(folder + '/'));
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

  const url = 'https://banco.avelarcompany.dev.br';
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UtZGVtbyIsImlhdCI6MTc2ODUyMjYxMywiZXhwIjoxNzk5NTM1NjAwfQ.uvVvMMMpWQH7qgI5PHmfsvtsq_SLo-XQ1OBB65AQAfU';

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  await mkdir(BACKUP_DIR, { recursive: true });
  console.log('📁 Destino:', BACKUP_DIR);
  console.log('🔗 Supabase:', url);
  console.log('📦 Projeto: StockTech (Bucket: public)');
  console.log('---');

  const bucketName = 'public';
  const bucketDir = join(BACKUP_DIR, bucketName);
  await mkdir(bucketDir, { recursive: true });

  let total = 0;
  let failed = 0;

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
        // É uma pasta
        await listAll(fullPath);
        continue;
      }

      // Verifica se é arquivo de StockTech
      if (!isStockTechPath(fullPath)) continue;
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

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✨ Backup StockTech concluído!`);
  console.log(`   ✅ ${total} imagens salvas`);
  console.log(`   ❌ ${failed} falhas`);
  console.log(`   📂 ${BACKUP_DIR}`);
}

main().catch((err) => {
  console.error('❌ Erro fatal:', err.message);
  process.exit(1);
});
