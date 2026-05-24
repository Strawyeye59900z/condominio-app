import { randomBytes } from 'crypto';

// Caracteres seguros (sem símbolos confusos como I/l/1/O/0)
const ALPHABET =
  'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

export function randomPassword(length = 12): string {
  if (length < 4) throw new Error('length deve ser >= 4');
  const bytes = randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}
