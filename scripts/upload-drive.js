#!/usr/bin/env node
// ============================================================
// upload-drive.js
// Uso: node scripts/upload-drive.js <arquivoLocal> <caminhoDriveRelativo>
// Ex.: node scripts/upload-drive.js /tmp/db.dump.gz "Backups/db-20260523.dump.gz"
//
// Lê a Service Account em GDRIVE_SA_FILE (default ./secrets/gdrive.json).
// Usa a pasta-raiz em GDRIVE_ROOT_FOLDER_ID (deve estar compartilhada com a SA).
// Cria subpastas conforme o caminho relativo (idempotente).
// Se já existir um arquivo com o mesmo nome no destino, sobrescreve (update).
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

async function main() {
  const [localFile, drivePath] = process.argv.slice(2);
  if (!localFile || !drivePath) {
    console.error('Uso: node upload-drive.js <arquivoLocal> <caminhoDriveRelativo>');
    process.exit(2);
  }
  if (!fs.existsSync(localFile)) {
    console.error(`Arquivo local não encontrado: ${localFile}`);
    process.exit(2);
  }

  const saFile = process.env.GDRIVE_SA_FILE || './secrets/gdrive.json';
  const rootId = process.env.GDRIVE_ROOT_FOLDER_ID;
  if (!fs.existsSync(saFile)) {
    console.error(`Service Account não encontrada: ${saFile}`);
    process.exit(2);
  }
  if (!rootId) {
    console.error('GDRIVE_ROOT_FOLDER_ID não definido');
    process.exit(2);
  }

  const auth = new google.auth.GoogleAuth({
    keyFile: saFile,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });
  const drive = google.drive({ version: 'v3', auth });

  // Resolve cada segmento de pasta (cria se faltar)
  const segments = drivePath.replace(/^\/+|\/+$/g, '').split('/');
  const fileName = segments.pop();
  let parentId = rootId;

  for (const folder of segments) {
    const found = await drive.files.list({
      q: `'${parentId}' in parents and name='${folder.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id,name)',
      pageSize: 1,
    });
    if (found.data.files && found.data.files.length > 0) {
      parentId = found.data.files[0].id;
    } else {
      const created = await drive.files.create({
        requestBody: {
          name: folder,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [parentId],
        },
        fields: 'id',
      });
      parentId = created.data.id;
    }
  }

  // Verifica se já existe um arquivo com esse nome no destino → update; senão create
  const existing = await drive.files.list({
    q: `'${parentId}' in parents and name='${fileName.replace(/'/g, "\\'")}' and trashed=false`,
    fields: 'files(id,name)',
    pageSize: 1,
  });

  const media = { body: fs.createReadStream(localFile) };

  if (existing.data.files && existing.data.files.length > 0) {
    const fileId = existing.data.files[0].id;
    const res = await drive.files.update({
      fileId,
      media,
      fields: 'id,name,size,webViewLink',
    });
    console.log(JSON.stringify({ action: 'update', id: res.data.id, name: res.data.name, size: res.data.size, link: res.data.webViewLink }));
  } else {
    const res = await drive.files.create({
      requestBody: { name: fileName, parents: [parentId] },
      media,
      fields: 'id,name,size,webViewLink',
    });
    console.log(JSON.stringify({ action: 'create', id: res.data.id, name: res.data.name, size: res.data.size, link: res.data.webViewLink }));
  }
}

main().catch((err) => {
  console.error('[upload-drive] erro:', err.message || err);
  process.exit(1);
});
