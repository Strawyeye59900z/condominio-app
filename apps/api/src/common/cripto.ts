import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGO = 'aes-256-gcm';
const IV_LEN = 12;
const TAG_LEN = 16;

function getKey(): Buffer {
  const hex = process.env.APP_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error('APP_ENCRYPTION_KEY deve ser 64 caracteres hex (32 bytes). Gere com: openssl rand -hex 32');
  }
  return Buffer.from(hex, 'hex');
}

/** Cifra texto com AES-256-GCM. Retorna string `iv:tag:ciphertext` em hex. */
export function encrypt(plaintext: string): string {
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, getKey(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`;
}

/** Decifra string `iv:tag:ciphertext` produzida por `encrypt`. */
export function decrypt(stored: string): string {
  const parts = stored.split(':');
  if (parts.length !== 3) throw new Error('Formato de dado cifrado inválido');
  const [ivHex, tagHex, encHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const enc = Buffer.from(encHex, 'hex');
  const decipher = createDecipheriv(ALGO, getKey(), iv);
  decipher.setAuthTag(tag);
  return decipher.update(enc).toString('utf8') + decipher.final('utf8');
}
