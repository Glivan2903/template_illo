import { cookies } from 'next/headers';
import { SESSION_COOKIE_NAME, verifySessionToken } from './session';

// Lido pelas Server Actions do /admin e /superadmin como segunda camada de
// proteção (o middleware.js já bloqueia o acesso às páginas em si, mas as
// actions rodam de novo aqui por segurança — nunca confie só na página).
export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  return verifySessionToken(token);
}

export async function requireRole(allowedRoles) {
  const session = await getSession();
  if (!session || !allowedRoles.includes(session.role)) {
    throw new Error('Não autorizado.');
  }
  return session;
}
