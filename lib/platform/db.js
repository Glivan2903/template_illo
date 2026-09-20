// Banco da plataforma (usado só pelo /superadmin, no domínio raiz): cadastro
// de empresas (tenants) — nome, slug (subdomínio), domínio próprio opcional
// e credenciais do /admin daquela empresa. Cada empresa tem seu próprio
// banco separado (lib/tenant.js), provisionado aqui a partir dos mesmos
// padrões do template (lib/store/defaults.js) — isso é o "replicar o banco".
import path from 'node:path';
import crypto from 'node:crypto';
import { rm } from 'node:fs/promises';
import { getDb, readFile, writeFile, closeDb } from '../store/sqliteDriver';
import { encrypt, decrypt } from '../store/crypto';
import { DEFAULT_CONTENT, DEFAULT_SETTINGS } from '../store/defaults';
import { tenantDbPath, tenantUploadsDir } from '../tenant';

const PLATFORM_DB_PATH = path.join(process.cwd(), 'data', 'platform.db');

function platformDb() {
  const db = getDb(PLATFORM_DB_PATH);
  db.exec(`
    CREATE TABLE IF NOT EXISTS empresas (
      slug TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      dominio_customizado TEXT UNIQUE,
      admin_user TEXT NOT NULL,
      admin_password TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )
  `);
  return db;
}

function slugify(nome) {
  const base = nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return base || 'empresa';
}

function uniqueSlug(base) {
  const db = platformDb();
  let slug = base;
  let n = 2;
  while (db.prepare('SELECT 1 FROM empresas WHERE slug = ?').get(slug)) {
    slug = `${base}-${n++}`;
  }
  return slug;
}

function randomPassword() {
  return crypto.randomBytes(6).toString('hex'); // 12 caracteres
}

export function listEmpresas() {
  return platformDb().prepare('SELECT * FROM empresas ORDER BY created_at DESC').all();
}

export function getEmpresaBySlug(slug) {
  return platformDb().prepare('SELECT * FROM empresas WHERE slug = ?').get(slug) || null;
}

function getEmpresaByDominio(dominio) {
  if (!dominio) return null;
  return platformDb().prepare('SELECT * FROM empresas WHERE dominio_customizado = ?').get(dominio) || null;
}

// Domínio raiz da plataforma (onde vive o /superadmin): o próprio
// PLATFORM_DOMAIN, ou qualquer host quando PLATFORM_DOMAIN não está
// configurada (dev local, ex.: localhost/127.0.0.1, sem subdomínio).
export function isPlatformRootHost(host) {
  const platformDomain = (process.env.PLATFORM_DOMAIN || '').toLowerCase();
  if (!host) return true;
  if (!platformDomain) return true;
  return host === platformDomain;
}

export function getEmpresaByHost(host) {
  if (!host) return null;
  const platformDomain = (process.env.PLATFORM_DOMAIN || '').toLowerCase();
  if (platformDomain && host.endsWith(`.${platformDomain}`)) {
    const slug = host.slice(0, host.length - platformDomain.length - 1);
    if (slug && !slug.includes('.')) {
      const empresa = getEmpresaBySlug(slug);
      if (empresa) return empresa;
    }
  }
  return getEmpresaByDominio(host);
}

// `origin` vem da requisição atual (ver app/superadmin/page.js) pra o link
// funcionar tanto em produção atrás do Caddy (https, sem porta) quanto em
// dev local (http, com a porta do `next dev`) — sem isso, o link gerado
// sempre apontava pra https:// sem porta, que não existe rodando localmente.
export function empresaLink(empresa, origin = {}) {
  const { protocol = 'https', portSuffix = '' } = origin;
  if (empresa.dominio_customizado) return `${protocol}://${empresa.dominio_customizado}${portSuffix}`;
  const platformDomain = process.env.PLATFORM_DOMAIN;
  return platformDomain ? `${protocol}://${empresa.slug}.${platformDomain}${portSuffix}` : null;
}

async function provisionTenantDb(slug, { nome, apiBaseUrl, openaiApiKey, openaiModel }) {
  const dbPath = tenantDbPath(slug);
  // Sem isso, o site da empresa nasce mostrando "Sua Clínica" (placeholder
  // do template) até alguém entrar no /admin e editar manualmente — o nome
  // dado na criação já devia aparecer no site na hora.
  await writeFile(dbPath, 'content', { ...DEFAULT_CONTENT, clinicNome: nome });
  const settings = {
    ...DEFAULT_SETTINGS,
    unidades: {
      ...DEFAULT_SETTINGS.unidades,
      matriz: { ...DEFAULT_SETTINGS.unidades.matriz, apiBaseUrl: (apiBaseUrl || '').trim() },
    },
    openai: {
      apiKey: (openaiApiKey || '').trim(),
      model: (openaiModel || '').trim(),
    },
  };
  await writeFile(dbPath, 'settings', encrypt(settings));
}

export async function createEmpresa({ nome, dominioCustomizado, apiBaseUrl, openaiApiKey, openaiModel }) {
  const nomeTrim = (nome || '').trim();
  if (!nomeTrim) throw new Error('Nome da empresa é obrigatório.');
  if (!(apiBaseUrl || '').trim()) throw new Error('URL base da API do sistema é obrigatória.');

  const dominio = (dominioCustomizado || '').trim().toLowerCase() || null;
  if (dominio && getEmpresaByDominio(dominio)) {
    throw new Error('Esse domínio já está em uso por outra empresa.');
  }

  const slug = uniqueSlug(slugify(nomeTrim));
  const adminUser = 'admin';
  const adminPassword = randomPassword();

  await provisionTenantDb(slug, { nome: nomeTrim, apiBaseUrl, openaiApiKey, openaiModel });

  platformDb()
    .prepare(
      `INSERT INTO empresas (slug, nome, dominio_customizado, admin_user, admin_password, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(slug, nomeTrim, dominio, adminUser, adminPassword, Date.now());

  return getEmpresaBySlug(slug);
}

async function readTenantSettings(slug) {
  const stored = await readFile(tenantDbPath(slug), 'settings');
  if (!stored) return {};
  try {
    return decrypt(stored) || {};
  } catch {
    return {};
  }
}

export async function updateEmpresa(slug, { nome, dominioCustomizado, apiBaseUrl, openaiApiKey, openaiModel }) {
  const empresa = getEmpresaBySlug(slug);
  if (!empresa) throw new Error('Empresa não encontrada.');

  const dominio = (dominioCustomizado || '').trim().toLowerCase() || null;
  if (dominio) {
    const existing = getEmpresaByDominio(dominio);
    if (existing && existing.slug !== slug) throw new Error('Esse domínio já está em uso por outra empresa.');
  }

  const nomeTrim = (nome || '').trim() || empresa.nome;
  platformDb()
    .prepare('UPDATE empresas SET nome = ?, dominio_customizado = ? WHERE slug = ?')
    .run(nomeTrim, dominio, slug);

  const current = await readTenantSettings(slug);
  const next = {
    ...DEFAULT_SETTINGS,
    ...current,
    unidades: {
      ...DEFAULT_SETTINGS.unidades,
      ...current.unidades,
      matriz: {
        ...DEFAULT_SETTINGS.unidades.matriz,
        ...current.unidades?.matriz,
        apiBaseUrl: (apiBaseUrl || '').trim(),
      },
    },
    openai: {
      apiKey: (openaiApiKey || '').trim(),
      model: (openaiModel || '').trim(),
    },
  };
  await writeFile(tenantDbPath(slug), 'settings', encrypt(next));

  return getEmpresaBySlug(slug);
}

export async function updateEmpresaModulos(slug, featureFlags) {
  const current = await readTenantSettings(slug);
  const next = { ...DEFAULT_SETTINGS, ...current, featureFlags };
  await writeFile(tenantDbPath(slug), 'settings', encrypt(next));
}

export function regenerarSenhaEmpresa(slug) {
  const senha = randomPassword();
  platformDb().prepare('UPDATE empresas SET admin_password = ? WHERE slug = ?').run(senha, slug);
  return senha;
}

export async function deleteEmpresa(slug) {
  platformDb().prepare('DELETE FROM empresas WHERE slug = ?').run(slug);
  closeDb(tenantDbPath(slug));
  await rm(path.dirname(tenantDbPath(slug)), { recursive: true, force: true });
  await rm(tenantUploadsDir(slug), { recursive: true, force: true });
}

// Documento "settings" decriptado de uma empresa — usado pelo /superadmin
// pra preencher o formulário de edição (URL da API, chave OpenAI, módulos).
export async function getEmpresaSettings(slug) {
  const current = await readTenantSettings(slug);
  return { ...DEFAULT_SETTINGS, ...current };
}

// Documento "content" de uma empresa, direto pelo slug — usado pelo
// /superadmin pra editar marca (logo/cores) de uma empresa sem precisar
// estar no domínio dela (getContent()/lib/store resolve por Host, só
// funciona dentro do próprio site da empresa).
export async function getEmpresaContent(slug) {
  const stored = await readFile(tenantDbPath(slug), 'content');
  return { ...DEFAULT_CONTENT, ...stored };
}

export async function updateEmpresaBranding(slug, { logoUrl, colorPrimary, colorSecondary }) {
  const current = await getEmpresaContent(slug);
  const brand = { ...current.brand };
  if (logoUrl) brand.logoUrl = logoUrl;
  if (colorPrimary) brand.colorPrimary = colorPrimary;
  if (colorSecondary) brand.colorSecondary = colorSecondary;
  const next = { ...current, brand };
  await writeFile(tenantDbPath(slug), 'content', next);
  return next;
}
