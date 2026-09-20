'use server';

import { cookies } from 'next/headers';
import { createSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from '../../../lib/auth/session';
import { getCurrentTenant } from '../../../lib/tenant';

// Login é resolvido pelo Host da requisição: no domínio raiz da plataforma,
// só a conta superadmin (.env) faz sentido; num subdomínio/domínio de
// empresa, só o admin daquela empresa (credenciais geradas no /superadmin
// ao criar a empresa — ver lib/platform/db.js).
//
// Devolve { ok, redirectTo } em vez de chamar redirect(): a troca de
// domínio (subdomínio da empresa -> domínio raiz e vice-versa) quebra a
// navegação "soft" que o redirect() do Next dispara via client-side router
// depois de uma Server Action — o app/admin/login/page.js força um
// window.location.href com o valor devolvido aqui, que é uma navegação de
// verdade do navegador (sempre resolve o host certo).
export async function login(formData) {
  const usuario = (formData.get('usuario') || '').toString().trim();
  const senha = (formData.get('senha') || '').toString();
  const tenant = await getCurrentTenant();

  let role = null;
  let tenantSlug = null;

  if (tenant) {
    if (usuario && senha && usuario === tenant.admin_user && senha === tenant.admin_password) {
      role = 'admin';
      tenantSlug = tenant.slug;
    }
  } else if (usuario && process.env.SUPERADMIN_USER && usuario === process.env.SUPERADMIN_USER) {
    if (senha && senha === process.env.SUPERADMIN_PASSWORD) role = 'superadmin';
  }

  if (!role) {
    return { ok: false };
  }

  const token = await createSessionToken(role, tenantSlug);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  return { ok: true, redirectTo: role === 'superadmin' ? '/superadmin' : '/admin' };
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  return { ok: true, redirectTo: '/admin/login' };
}
