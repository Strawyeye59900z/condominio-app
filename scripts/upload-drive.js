#!/usr/bin/env node

/**
 * upload-drive.js
 * Faz upload de um arquivo para Google Drive usando OAuth2
 * Uso: node upload-drive.js <filePath> <remotePath>
 */

const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const CREDENTIALS_PATH = path.join(
  process.env.INSTALL_DIR || '/opt/condominio',
  'secrets',
  'gdrive.json'
);

async function uploadToDrive() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error('Uso: node upload-drive.js <filePath> <remotePath>');
    process.exit(1);
  }

  const filePath = args[0];
  const remotePath = args[1]; // ex: "Backups/20260524-150000.dump.gz"

  if (!fs.existsSync(filePath)) {
    console.error(`Erro: arquivo não encontrado: ${filePath}`);
    process.exit(1);
  }

  if (!fs.existsSync(CREDENTIALS_PATH)) {
    console.error(`Erro: arquivo de credenciais não encontrado: ${CREDENTIALS_PATH}`);
    process.exit(1);
  }

  try {
    const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf-8'));

    const auth = new google.auth.OAuth2(
      credentials.client_id,
      credentials.client_secret,
      credentials.redirect_uri || 'http://localhost:3000/auth/google/callback'
    );

    auth.setCredentials({
      refresh_token: credentials.refresh_token,
    });

    const drive = google.drive({ version: 'v3', auth });

    // Parse remotePath: "Backups/file.gz" -> folder="Backups", name="file.gz"
    const parts = remotePath.split('/');
    const fileName = parts[parts.length - 1];
    const folderPath = parts.slice(0, -1);

    let parentId = 'root';

    // Cria/encontra pastas aninhadas
    for (const folderName of folderPath) {
      const res = await drive.files.list({
        q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`,
        spaces: 'drive',
        fields: 'files(id, name)',
        pageSize: 1,
      });

      if (res.data.files.length > 0) {
        parentId = res.data.files[0].id;
      } else {
        // Cria pasta
        const folderRes = await drive.files.create({
          requestBody: {
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [parentId],
          },
          fields: 'id',
        });
        parentId = folderRes.data.id;
      }
    }

    // Upload do arquivo
    const fileMetadata = {
      name: fileName,
      parents: [parentId],
    };

    const media = {
      mimeType: 'application/octet-stream',
      body: fs.createReadStream(filePath),
    };

    const file = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, name, webViewLink',
    });

    console.log(`Upload concluído: ${remotePath}`);
    console.log(`ID no Drive: ${file.data.id}`);
    console.log(`Link: ${file.data.webViewLink}`);
  } catch (error) {
    console.error('Erro ao fazer upload:', error.message);
    process.exit(1);
  }
}

uploadToDrive();
