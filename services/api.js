// Este serviço faz chamadas para a nossa API Route (Proxy), que por sua vez chama o backend ClinVida.
// Toda função recebe a unidade (matriz/filial) como primeiro argumento — cada
// unidade tem seu próprio backend/banco, sem nenhum dado compartilhado com a outra.

import { UNIDADES_INFO } from '../lib/unidadesInfo';

function baseUrl(unidadeId) {
  return `/api/agendamento/${unidadeId}`;
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

// Chama fn(unidadeId, ...args) em todas as unidades conhecidas, em
// paralelo. Uma unidade fora do ar (ou ainda sem API_BASE_URL configurada)
// nunca derruba as outras — só fica de fora do resultado.
export async function fanOutUnidades(fn, ...args) {
  const resultados = await Promise.allSettled(UNIDADES_INFO.map(({ id }) => fn(id, ...args)));
  return UNIDADES_INFO.reduce((acc, { id }, idx) => {
    const r = resultados[idx];
    if (r.status === 'fulfilled') {
      acc.push({ unidadeId: id, dados: r.value });
    } else {
      console.warn(`Unidade "${id}" não respondeu:`, r.reason?.message || r.reason);
    }
    return acc;
  }, []);
}

export async function getCentros(unidadeId) {
  const data = await fetchAndUnwrap(`${baseUrl(unidadeId)}/centros`);
  return (data || []).map(item => ({
    CEN_CODIGO: item.cenCodigo,
    CEN_DESCRICAO: item.cenDescricao
  }));
}

export async function getProfissionais(unidadeId, cenCodigo) {
  const data = await fetchAndUnwrap(`${baseUrl(unidadeId)}/profissionais/${cenCodigo}`);
  return (data || []).map(item => ({
    PROF_CODIGO: item.profCodigo,
    PROF_NOME: item.profNome,
    PROF_ESTADO_CONS: item.profEstadoCons,
    CONS_CODIGO: item.consCodigo,
    PROF_CODIGO_EXPR: item.profCodigoExpr
  }));
}

export async function getOpcoes(unidadeId, cen, prof, cons, uf) {
  const data = await fetchAndUnwrap(`${baseUrl(unidadeId)}/opcoes/${cen}/${prof}/${cons}/${uf}`);
  return (data || []).map(item => ({
    TIPO: item.tipo,
    CODIGO: item.codigo,
    DESCRICAO: item.descricao
  }));
}

export async function getDias(unidadeId, cen, prof, cons, uf) {
  const data = await fetchAndUnwrap(`${baseUrl(unidadeId)}/dias/${cen}/${prof}/${cons}/${uf}`);
  return (data || []).map(item => ({
    HAG_DIA: item.hagDia,
    ORDEMDIA: item.ordemdia
  }));
}

export async function getHorarios(unidadeId, cen, prof, cons, uf, dia) {
  const data = await fetchAndUnwrap(`${baseUrl(unidadeId)}/horarios/${cen}/${prof}/${cons}/${uf}/${dia}`);
  return (data || []).map(item => ({
    HDI_CODIGO: item.hdiCodigo,
    AGD_CODIGO: item.agdCodigo,
    HAG_ORDEM_CHEGADA: item.hagOrdemChegada,
    HAG_DIA: item.hagDia,
    HORARIO: item.horario
  }));
}

export async function getAgendasLivres(unidadeId, dia, agd, hdi, semanas = 4) {
  const data = await fetchAndUnwrap(`${baseUrl(unidadeId)}/agendaslivres/${dia}/${agd}/${hdi}/${semanas}`);
  return (data || []).map(item => ({
    Data: item.data,
    Dia: item.dia,
    Marcados: item.marcados,
    Capacidade: item.capacidade,
    Livres: item.livres
  }));
}

export async function agendar(unidadeId, dadosAgendamento) {
  const data = await fetchAndUnwrap(`${baseUrl(unidadeId)}/agendar`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(dadosAgendamento),
  });
  // Map [1] to [{ OK: 1 }]
  if (Array.isArray(data) && data[0] === 1) {
    return [{ OK: 1 }];
  }
  return data;
}

export async function getPaciente(unidadeId, telefone) {
  return fetchAndUnwrap(`${baseUrl(unidadeId)}/paciente/${telefone}`);
}

export async function getHistorico(unidadeId, telefone) {
  return fetchAndUnwrap(`${baseUrl(unidadeId)}/historico/${telefone}`);
}

export async function cancelarAgendamento(unidadeId, dadosCancelamento) {
  const data = await fetchAndUnwrap(`${baseUrl(unidadeId)}/cancelar`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(dadosCancelamento),
  });
  if (Array.isArray(data) && data[0] === 1) {
    return [{ OK: 1 }];
  }
  return data;
}

export async function reagendarAgendamento(unidadeId, dadosReagendamento) {
  const data = await fetchAndUnwrap(`${baseUrl(unidadeId)}/reagendar`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(dadosReagendamento),
  });
  if (Array.isArray(data) && data[0] === 1) {
    return [{ OK: 1 }];
  }
  return data;
}
