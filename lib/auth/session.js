// Sessão de login via cookie assinado (HMAC), sem tabela de usuários e sem
// biblioteca de JWT. Usa Web Crypto (crypto.subtle) em vez de node:crypto de
// propósito: este módulo é importado pelo middleware.js, que pode rodar em
// runtime Edge — Web Crypto funciona igual em Edge e em Node.
export const SESSION_COOKIE_NAME = 'clinsaude_session';
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8; // 8h

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error('SESSION_SECRET não configurada no .env.');
  }
  return secret;
}

function bytesToBase64Url(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(str) {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/');
  const padLength = (4 - (padded.length % 4)) % 4;
  const binary = atob(padded + '='.repeat(padLength));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function getKey() {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(getSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export async function createSessionToken(role) {
  const payload = JSON.stringify({ role, exp: Date.now() + SESSION_MAX_AGE_SECONDS * 1000 });
  const encodedPayload = bytesToBase64Url(new TextEncoder().encode(payload));
  const key = await getKey();
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(encodedPayload));
  return `${encodedPayload}.${bytesToBase64Url(new Uint8Array(signature))}`;
}

export async function verifySessionToken(token) {
  if (!token || !token.includes('.')) return null;
  const [encodedPayload, signaturePart] = token.split('.');
  try {
    const key = await getKey();
    const signature = base64UrlToBytes(signaturePart);
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      signature,
      new TextEncoder().encode(encodedPayload)
    );
    if (!valid) return null;
    const payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(encodedPayload)));
    if (!payload?.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
