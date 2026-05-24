#!/usr/bin/env node
// ============================================================
// cleanup-drive.js
// Uso: node scripts/cleanup-drive.js <caminhoPastaDrive> --keep-last <N>
// Ex.: node scripts/cleanup-drive.js "Backups/" --keep-last 7
//
// Lista os arquivos da pasta, ordena por createdTime DESC, mantém os N mais
// recentes e move os demais para a lixeira (trashed=true).
// ============================================================
'use strict';

const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"(.*)"$/, '$1');
  }
}
loadEnv();

const { google } = require('googleapis');

function parseArgs(argv) {
  const out = { folder: null, keepLast: 7 };
  out.folder = argv[0];
  for (let i = 1; i < argv.length; i++) {
    if (argv[i] === '--keep-last' && argv[i + 1]) {
      out.keepLast = parseInt(argv[i + 1], 10);
      i++;
    }
  }
  return out;
}

async function resolveFolder(drive, rootId, folderPath) {
  const segments = folderPath.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);
  let parentId = rootId;
  for (const folder of segments) {
    const found = await drive.files.list({
      q: `'${parentId}' in parents and name='${folder.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id,name)',
      pageSize: 1,
    });
    if (!found.data.files || found.data.files.length === 0) return null;
    parentId = found.data.files[0].id;
  }
  return parentId;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.folder) {
    console.error('Uso: node cleanup-drive.js <caminhoPastaDrive> --keep-last <N>');
    process.exit(2);
  }
  if (!Number.isInteger(args.keepLast) || args.keepLast < 1) {
    console.error('--keep-last deve ser inteiro >= 1');
    process.exit(2);
  }

  const saFile = process.env.GDRIVE_SA_FILE || './secrets/gdrive.json';
  const rootId = process.env.GDRIVE_ROOT_FOLDER_ID;
  if (!fs.existsSync(saFile)) { console.error(`SA não encontrada: ${saFile}`); process.exit(2); }
  if (!rootId) { console.error('GDRIVE_ROOT_FOLDER_ID não definido'); process.exit(2); }

  const auth = new google.auth.GoogleAuth({
    keyFile: saFile,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });
  const drive = google.drive({ version: 'v3', auth });

  const folderId = await resolveFolder(drive, rootId, args.folder);
  if (!folderId) {
    console.log(JSON.stringify({ action: 'noop', reason: 'folder-missing', folder: args.folder }));
    return;
  }

  const files = [];
  let pageToken;
  do {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed=false and mimeType != 'application/vnd.google-apps.folder'`,
      fields: 'nextPageToken, files(id,name,createdTime,size)',
      orderBy: 'createdTime desc',
      pageSize: 1000,
      pageToken,
    });
    files.push(...(res.data.files ?? []));
    pageToken = res.data.nextPageToken;
  } while (pageToken);

  const toTrash = files.slice(args.keepLast);
  for (const f of toTrash) {
    await drive.files.update({ fileId: f.id, requestBody: { trashed: true } });
  }
  console.log(JSON.stringify({
    action: 'cleanup',
    folder: args.folder,
    kept: Math.min(args.keepLast, files.length),
    trashed: toTrash.length,
    trashedNames: toTrash.map((f) => f.name),
  }));
}

main().catch((err) => {
  console.error('[cleanup-drive] erro:', err.message || err);
  process.exit(1);
});
