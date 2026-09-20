import dns from 'dns';
import { getUnidade } from './unidades';

dns.setDefaultResultOrder('ipv4first');

const tokenCache = new Map(); // unidadeId -> token

async function getOrFetchToken(unidade) {
  const cached = tokenCache.get(unidade.id);
  if (cached) return cached;

  try {
    const response = await fetch(`${unidade.apiBaseUrl}/auth/login`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error(`Failed to login (${unidade.id}): ${response.status}`);
    }
    const token = (await response.text()).trim();
    tokenCache.set(unidade.id, token);
    return token;
  } catch (error) {
    console.error(`Error fetching auth token (${unidade.id}):`, error);
    return null;
  }
}

// Fetches a path under /api/<namespace> on the ClinVida backend of a
// specific unidade (matriz/filial), handling bearer token
// acquisition/caching (per unidade) and a single retry on 401.
// namespace: 'agendamento' (default) ou 'orcamento' — o ClinVida expõe as
// duas APIs sob o mesmo backend/token de cada unidade.
export async function clinvidaRequest(unidadeId, path, options = {}) {
  const unidade = await getUnidade(unidadeId);
  if (!unidade) {
    throw new Error(`Unidade não configurada: ${unidadeId}`);
  }
  return clinvidaRequestFor(unidade, path, options);
}

// Mesma requisição, mas recebendo a unidade já resolvida (com apiBaseUrl em
// mãos) em vez do id — usada por quem já resolveu a unidade fora de um
// escopo de cache (ver lib/profissionais.js): resolver por id aqui dentro
// chamaria getUnidade() -> getSettings() -> headers(), que o Next não
// permite dentro de um unstable_cache.
export async function clinvidaRequestFor(unidade, path, { method = 'GET', body, namespace = 'agendamento' } = {}) {
  let token = await getOrFetchToken(unidade);

  const headers = {};
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${unidade.apiBaseUrl}/api/${namespace}/${path}`;
  const requestInit = {
    method,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  };

  let response = await fetch(url, requestInit);

  if (response.status === 401) {
    tokenCache.delete(unidade.id);
    token = await getOrFetchToken(unidade);

    const retryHeaders = { ...headers };
    if (token) {
      retryHeaders['Authorization'] = `Bearer ${token}`;
    } else {
      delete retryHeaders['Authorization'];
    }
    response = await fetch(url, { ...requestInit, headers: retryHeaders });
  }

  return response.json();
}
