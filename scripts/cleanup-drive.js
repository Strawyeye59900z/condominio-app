#!/usr/bin/env node

/**
 * cleanup-drive.js
 * Deleta backups antigos do Google Drive, mantendo apenas os últimos N dias
 * Uso: node cleanup-drive.js "Backups/" --keep-days 7
 */

const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

async function cleanupDrive() {
  const args = process.argv.slice(2);
  const folderPath = args[0] || 'Backups/';
  const keepDays = parseInt(args[args.indexOf('--keep-days') + 1] || '7', 10);

  try {
    // Carrega credenciais OAuth2 do .env
    const clientId = process.env.GDRIVE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.GDRIVE_OAUTH_CLIENT_SECRET;
    const refreshToken = process.env.GDRIVE_OAUTH_REFRESH_TOKEN;

    if (!clientId || !clientSecret || !refreshToken) {
      console.error('Erro: variáveis GDRIVE_OAUTH_* não configuradas no .env');
      process.exit(1);
    }

    const auth = new google.auth.OAuth2(
      clientId,
      clientSecret,
      'http://localhost:3000/auth/google/callback'
    );

    auth.setCredentials({
      refresh_token: refreshToken,
    });

    const drive = google.drive({ version: 'v3', auth });

    // Encontra folder
    const parts = folderPath.replace(/\/$/, '').split('/');
    let parentId = 'root';

    for (const folderName of parts) {
      const res = await drive.files.list({
        q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`,
        spaces: 'drive',
        fields: 'files(id)',
        pageSize: 1,
      });

      if (res.data.files.length === 0) {
        console.log(`Pasta "${folderPath}" não encontrada.`);
        process.exit(0);
      }
      parentId = res.data.files[0].id;
    }

    // Lista arquivos na pasta
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - keepDays);

    const res = await drive.files.list({
      q: `'${parentId}' in parents and trashed=false and mimeType != 'application/vnd.google-apps.folder'`,
      spaces: 'drive',
      fields: 'files(id, name, createdTime)',
      pageSize: 100,
      orderBy: 'createdTime desc',
    });

    const files = res.data.files || [];
    let deletedCount = 0;

    for (const file of files) {
      const createdTime = new Date(file.createdTime);
      if (createdTime < cutoffDate) {
        await drive.files.delete({ fileId: file.id });
        console.log(`Deletado: ${file.name} (${createdTime.toISOString()})`);
        deletedCount++;
      }
    }

    console.log(`Cleanup concluído: ${deletedCount} arquivo(s) deletado(s)`);
  } catch (error) {
    console.error('Erro no cleanup:', error.message);
    process.exit(1);
  }
}

cleanupDrive();
