#!/usr/bin/env node
/**
 * Script de autorização OAuth2 para o Google Drive.
 * Roda UMA VEZ para gerar o refresh_token que vai para o .env.
 *
 * Pré-requisito: crie credenciais OAuth2 "Aplicativo de Desktop" no
 *   https://console.cloud.google.com/apis/credentials
 *   (mesmo projeto onde a Drive API está habilitada)
 *
 * Uso:
 *   node scripts/gdrive-auth.js CLIENT_ID CLIENT_SECRET
 *
 * O script abre uma URL no terminal. Você abre no browser, autoriza,
 * copia o código e cola aqui. O refresh_token é impresso no final.
 */

const { google } = require('googleapis');
const readline = require('readline');

const [, , clientId, clientSecret] = process.argv;

if (!clientId || !clientSecret) {
  console.error('Uso: node scripts/gdrive-auth.js CLIENT_ID CLIENT_SECRET');
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
  clientId,
  clientSecret,
  'urn:ietf:wg:oauth:2.0:oob', // não redireciona — mostra o código na tela
);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent', // força emitir refresh_token mesmo se já autorizado antes
  scope: ['https://www.googleapis.com/auth/drive'],
});

console.log('\n========================================================');
console.log('Abra esta URL no browser e autorize o acesso ao Drive:');
console.log('\n' + authUrl + '\n');
console.log('========================================================\n');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question('Cole aqui o código exibido pelo Google: ', async (code) => {
  rl.close();
  try {
    const { tokens } = await oauth2Client.getToken(code.trim());
    console.log('\n✅ Autenticação bem-sucedida!\n');
    console.log('Adicione estas variáveis ao seu .env:\n');
    console.log(`GDRIVE_OAUTH_CLIENT_ID=${clientId}`);
    console.log(`GDRIVE_OAUTH_CLIENT_SECRET=${clientSecret}`);
    console.log(`GDRIVE_OAUTH_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log('\n(mantenha GDRIVE_ROOT_FOLDER_ID já existente no .env)\n');
  } catch (err) {
    console.error('Erro ao trocar o código pelo token:', err.message);
    process.exit(1);
  }
});
