// Toda função recebe a unidade (matriz/filial) como primeiro argumento —
// mesmo padrão de services/api.js, incluindo fanOutUnidades (reaproveitada
// de lá) para consultar as unidades configuradas em paralelo.
import { fanOutUnidades } from './api';

function baseUrl(unidadeId) {
  return `/api/orcamento/${unidadeId}`;
}

async function fetchAndUnwrap(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) {
    throw new Error(`HTTP error! status: ${res.status}`);
  }
  const json = await res.json();
  if (json && typeof json === 'object') {
    if ('success' in json) {
      if (json.success === false) {
        throw new Error(json.error || 'Ocorreu um erro ao processar a solicitação.');
      }
      return json.data;
    }
  }
  return json;
}

export async function getCentros(unidadeId) {
  return fetchAndUnwrap(`${baseUrl(unidadeId)}/centros`);
}

export async function getConvenios(unidadeId) {
  return fetchAndUnwrap(`${baseUrl(unidadeId)}/convenios`);
}

export async function getProcedimentosPreco(unidadeId, convenioId) {
  const url = convenioId
    ? `${baseUrl(unidadeId)}/procedimentos-preco?convenio=${convenioId}`
    : `${baseUrl(unidadeId)}/procedimentos-preco`;
  return fetchAndUnwrap(url);
}

export { fanOutUnidades };
