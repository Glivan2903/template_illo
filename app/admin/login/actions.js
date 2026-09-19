'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyPassword } from '../../../lib/auth/password';
import { createSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from '../../../lib/auth/session';

export async function login(formData) {
  const usuario = (formData.get('usuario') || '').toString().trim();
  const senha = (formData.get('senha') || '').toString();

  let role = null;
  if (usuario && process.env.SUPERADMIN_USER && usuario === process.env.SUPERADMIN_USER) {
    if (verifyPassword(senha, process.env.SUPERADMIN_PASSWORD_HASH)) role = 'superadmin';
  } else if (usuario && process.env.ADMIN_USER && usuario === process.env.ADMIN_USER) {
    if (verifyPassword(senha, process.env.ADMIN_PASSWORD_HASH)) role = 'admin';
  }

  if (!role) {
    redirect('/admin/login?erro=1');
  }

  const token = await createSessionToken(role);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  redirect(role === 'superadmin' ? '/superadmin' : '/admin');
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  redirect('/admin/login');
}
