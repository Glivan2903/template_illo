// Ponto único de acesso ao "banco" do painel: dois documentos JSON
// (content.json editável pelo admin, settings.json editável pelo
// superadmin), gravados por um driver de arquivo (VPS/local) ou por Vercel
// Blob (serverless) — ver fileDriver.js/blobDriver.js. Sem banco de dados.
import * as fileDriver from './fileDriver';
import { encrypt, decrypt } from './crypto';
import { DEFAULT_CONTENT, DEFAULT_SETTINGS } from './defaults';

const CACHE_TTL_MS = 5000;

function usingBlob() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

// Import dinâmico: evita exigir @vercel/blob instalado/configurado quando o
// projeto roda só em VPS (driver de arquivo).
async function getDriver() {
  if (usingBlob()) {
    return import('./blobDriver');
  }
  return fileDriver;
}

const cache = { content: null, settings: null, contentAt: 0, settingsAt: 0 };

export async function getContent() {
  if (cache.content && Date.now() - cache.contentAt < CACHE_TTL_MS) return cache.content;
  const driver = await getDriver();
  const stored = await driver.readFile('content');
  const merged = stored ? deepMerge(DEFAULT_CONTENT, stored) : DEFAULT_CONTENT;
  cache.content = merged;
  cache.contentAt = Date.now();
  return merged;
}

export async function saveContent(partial) {
  const current = await getContent();
  const next = deepMerge(current, partial);
  const driver = await getDriver();
  await driver.writeFile('content', next);
  cache.content = next;
  cache.contentAt = Date.now();
  return next;
}

export async function getSettings() {
  if (cache.settings && Date.now() - cache.settingsAt < CACHE_TTL_MS) return cache.settings;
  const driver = await getDriver();
  const stored = await driver.readFile('settings');
  let decrypted = null;
  if (stored) {
    try {
      decrypted = decrypt(stored);
    } catch (error) {
      console.error('Falha ao descriptografar settings.json — usando padrões.', error);
    }
  }
  const merged = decrypted ? deepMerge(DEFAULT_SETTINGS, decrypted) : DEFAULT_SETTINGS;
  cache.settings = merged;
  cache.settingsAt = Date.now();
  return merged;
}

export async function saveSettings(partial) {
  const current = await getSettings();
  const next = deepMerge(current, partial);
  const driver = await getDriver();
  await driver.writeFile('settings', encrypt(next));
  cache.settings = next;
  cache.settingsAt = Date.now();
  return next;
}

export async function saveUpload(filename, buffer, contentType) {
  const driver = await getDriver();
  return driver.saveUpload(filename, buffer, contentType);
}

export function getStorageStatus() {
  const driver = usingBlob() ? 'blob' : 'file';
  const onVercel = Boolean(process.env.VERCEL);
  const warning =
    driver === 'file' && onVercel
      ? 'Rodando na Vercel sem BLOB_READ_WRITE_TOKEN configurado: o filesystem das functions é efêmero, então alterações feitas aqui podem não persistir entre deploys ou novas instâncias. Configure o Vercel Blob e a variável BLOB_READ_WRITE_TOKEN.'
      : null;
  return { driver, onVercel, warning };
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
