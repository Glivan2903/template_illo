// Ponto único de acesso ao "banco" de uma empresa (tenant): dois documentos
// JSON por empresa (content.json editável pelo /admin dela, settings.json
// editável centralmente pelo /superadmin), gravados em SQLite — um arquivo
// por empresa (ver lib/tenant.js), resolvida a cada chamada a partir do Host
// da requisição atual. Fora do contexto de uma empresa (domínio raiz da
// plataforma) estas funções não têm o que ler/gravar e lançam erro — quem
// atende o domínio raiz é o /superadmin (ver lib/platform/db.js).
import * as driver from './sqliteDriver';
import { encrypt, decrypt } from './crypto';
import { DEFAULT_CONTENT, DEFAULT_SETTINGS } from './defaults';
import { getCurrentTenant, tenantDbPath, tenantUploadsDir, tenantUploadsUrlPrefix } from '../tenant';

const CACHE_TTL_MS = 5000;

// slug -> { content, settings, contentAt, settingsAt }
const cache = new Map();

function cacheFor(slug) {
  let entry = cache.get(slug);
  if (!entry) {
    entry = { content: null, settings: null, contentAt: 0, settingsAt: 0 };
    cache.set(slug, entry);
  }
  return entry;
}

async function requireTenant() {
  const tenant = await getCurrentTenant();
  if (!tenant) {
    throw new Error(
      'Nenhuma empresa resolvida para este domínio — lib/store só funciona no contexto de uma empresa.'
    );
  }
  return tenant;
}

// getContent/getSettings toleram "sem empresa" (domínio raiz da
// plataforma) devolvendo os padrões — o RootLayout chama isso pra QUALQUER
// página, inclusive /admin/login e /superadmin, que não pertencem a
// nenhuma empresa. saveContent/saveSettings/saveUpload continuam exigindo
// uma empresa: não faz sentido gravar sem saber em qual banco.
export async function getContent() {
  const tenant = await getCurrentTenant();
  if (!tenant) return DEFAULT_CONTENT;
  const entry = cacheFor(tenant.slug);
  if (entry.content && Date.now() - entry.contentAt < CACHE_TTL_MS) return entry.content;
  const stored = await driver.readFile(tenantDbPath(tenant.slug), 'content');
  const merged = stored ? deepMerge(DEFAULT_CONTENT, stored) : DEFAULT_CONTENT;
  entry.content = merged;
  entry.contentAt = Date.now();
  return merged;
}

export async function saveContent(partial) {
  const tenant = await requireTenant();
  const current = await getContent();
  const next = deepMerge(current, partial);
  await driver.writeFile(tenantDbPath(tenant.slug), 'content', next);
  const entry = cacheFor(tenant.slug);
  entry.content = next;
  entry.contentAt = Date.now();
  return next;
}

export async function getSettings() {
  const tenant = await getCurrentTenant();
  if (!tenant) return DEFAULT_SETTINGS;
  const entry = cacheFor(tenant.slug);
  if (entry.settings && Date.now() - entry.settingsAt < CACHE_TTL_MS) return entry.settings;
  const stored = await driver.readFile(tenantDbPath(tenant.slug), 'settings');
  let decrypted = null;
  if (stored) {
    try {
      decrypted = decrypt(stored);
    } catch (error) {
      console.error('Falha ao descriptografar settings da empresa — usando padrões.', error);
    }
  }
  const merged = decrypted ? deepMerge(DEFAULT_SETTINGS, decrypted) : DEFAULT_SETTINGS;
  entry.settings = merged;
  entry.settingsAt = Date.now();
  return merged;
}

export async function saveSettings(partial) {
  const tenant = await requireTenant();
  const current = await getSettings();
  const next = deepMerge(current, partial);
  await driver.writeFile(tenantDbPath(tenant.slug), 'settings', encrypt(next));
  const entry = cacheFor(tenant.slug);
  entry.settings = next;
  entry.settingsAt = Date.now();
  return next;
}

export async function saveUpload(filename, buffer) {
  const tenant = await requireTenant();
  await driver.saveUpload(tenantUploadsDir(tenant.slug), filename, buffer);
  return `${tenantUploadsUrlPrefix(tenant.slug)}/${filename}`;
}

function isPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function deepMerge(base, overrides) {
  if (!isPlainObject(base) || !isPlainObject(overrides)) return overrides ?? base;
  const result = { ...base };
  for (const key of Object.keys(overrides)) {
    result[key] = isPlainObject(base[key]) && isPlainObject(overrides[key])
      ? deepMerge(base[key], overrides[key])
      : overrides[key];
  }
  return result;
}
