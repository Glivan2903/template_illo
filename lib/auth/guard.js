import { cookies } from 'next/headers';
import { SESSION_COOKIE_NAME, verifySessionToken } from './session';
import { getCurrentTenant } from '../tenant';

// Lido pelas Server Actions do /admin e /superadmin como segunda camada de
// proteção (o proxy.js já bloqueia o acesso às páginas em si, mas as actions
// rodam de novo aqui por segurança — nunca confie só na página).
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
  // Sessão de admin é presa à empresa em que foi criada — sem isso, um
  // token roubado de uma empresa poderia ser reenviado com o Host de outra
  // empresa e editar o conteúdo dela (o cookie por si só já é host-only e
  // não vaza entre subdomínios num navegador normal, mas isso não protege
  // contra uma requisição forjada direto pra API).
  if (session.role === 'admin') {
    const tenant = await getCurrentTenant();
    if (!tenant || tenant.slug !== session.tenantSlug) {
      throw new Error('Não autorizado.');
    }
  }
  return session;
}
