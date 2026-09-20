// Resolve a empresa (tenant) da requisição atual a partir do Host: cada
// empresa mora num subdomínio de PLATFORM_DOMAIN (ex.: clinica-x.dominio.com)
// ou num domínio próprio configurado no /superadmin. O domínio "raiz"
// (PLATFORM_DOMAIN sozinho, ou localhost em dev) não pertence a nenhuma
// empresa — é onde vive o /superadmin.
import path from 'node:path';
import { headers } from 'next/headers';
import { getEmpresaByHost, isPlatformRootHost } from './platform/db';

export function normalizeHost(hostHeader) {
  return (hostHeader || '').split(':')[0].trim().toLowerCase();
}

export async function getRequestHost() {
  const h = await headers();
  return normalizeHost(h.get('host'));
}

// Retorna o registro da empresa (slug, nome, dominio_customizado,
// admin_user, admin_password) para o host atual, ou null se for o domínio
// raiz da plataforma (ou um host que não bate com nenhuma empresa).
export async function getCurrentTenant() {
  const host = await getRequestHost();
  if (isPlatformRootHost(host)) return null;
  return getEmpresaByHost(host);
}

export function tenantDbPath(slug) {
  return path.join(process.cwd(), 'data', 'tenants', slug, 'app.db');
}

export function tenantUploadsDir(slug) {
  return path.join(process.cwd(), 'public', 'uploads', slug);
}

export function tenantUploadsUrlPrefix(slug) {
  return `/uploads/${slug}`;
}

// Protocolo/porta da requisição atual, pra montar o link de uma empresa (ver
// lib/platform/db.js empresaLink) do jeito certo tanto atrás do Caddy em
// produção (que manda X-Forwarded-Proto: https, sem porta) quanto em dev
// local (sem proxy na frente — usa http e a porta do `next dev`).
export async function getRequestOrigin() {
  const h = await headers();
  // Next em dev já manda x-forwarded-proto: http por conta própria (não é
  // "atrás de um proxy real"), então não dá pra usar só a presença desse
  // header pra decidir se ignora a porta — em vez disso, sempre compara a
  // porta do Host com a porta padrão do protocolo. Atrás do Caddy em
  // produção, o Host chega sem porta (443/80 padrão) e cai em portSuffix=''.
  const protocol = h.get('x-forwarded-proto') || 'http';
  const hostHeader = h.get('host') || '';
  const port = hostHeader.includes(':') ? hostHeader.split(':')[1] : null;
  const isDefaultPort = !port || (protocol === 'https' && port === '443') || (protocol === 'http' && port === '80');
  return { protocol, portSuffix: isDefaultPort ? '' : `:${port}` };
}
