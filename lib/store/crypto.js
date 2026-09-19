// Criptografia em repouso do settings.json (contém segredo: URLs de API das
// unidades). Necessário porque o driver Blob da Vercel só oferece acesso
// público — sem isso, quem descobrisse a URL do blob leria os segredos em
// texto puro. content.json não tem segredo e não passa por aqui.
import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';

function getKey() {
  const secret = process.env.SETTINGS_ENC_KEY;
  if (!secret) {
    throw new Error(
      'SETTINGS_ENC_KEY não configurada no .env — necessária para ler/gravar as configurações do superadmin.'
    );
  }
  return crypto.createHash('sha256').update(secret).digest();
}

export function encrypt(obj) {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const plaintext = Buffer.from(JSON.stringify(obj), 'utf8');
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    data: ciphertext.toString('base64'),
  };
}

export function decrypt(payload) {
  if (!payload || !payload.iv || !payload.authTag || !payload.data) return null;
  const key = getKey();
  const iv = Buffer.from(payload.iv, 'base64');
  const authTag = Buffer.from(payload.authTag, 'base64');
  const ciphertext = Buffer.from(payload.data, 'base64');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return JSON.parse(plaintext.toString('utf8'));
}
