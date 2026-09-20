import { unstable_cache } from 'next/cache';
import { clinvidaRequestFor } from './clinvida';
import { getUnidadesConfiguradas } from './unidades';
import { PROFISSIONAIS_CACHE_REVALIDATE_SECONDS } from './config';

function unwrap(json) {
  if (json && typeof json === 'object' && 'success' in json) {
    if (json.success === false) {
      throw new Error(json.error || 'Erro ao processar a solicitação no sistema da clínica.');
    }
    return json.data;
  }
  return json;
}

function clean(value) {
  return (value || '').toString().trim();
}

export function slugify(value) {
  return clean(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(new RegExp('[̀-ͯ]', 'g'), '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function fetchProfissionaisDoCentro(unidade, cenCodigo, cenDescricao) {
  const json = await clinvidaRequestFor(unidade, `profissionais/${encodeURIComponent(cenCodigo)}`);
  const data = unwrap(json) || [];
  return data.map((item) => {
    const nomeExibicao = clean(item.profApelido) || clean(item.profNome);
    // profCodigo só é único dentro de um cenCodigo (mesmo médico pode ter
    // profCodigo diferente em outra especialidade), por isso ambos compõem o
    // slug — junto da unidade, já que os códigos de uma base nunca são
    // comparáveis com os da outra.
    return {
      slug: `${slugify(nomeExibicao)}-${unidade.id}-${cenCodigo.toLowerCase()}-${item.profCodigo}`,
      unidade: unidade.id,
      cenCodigo,
      especialidade: cenDescricao,
      profCodigo: item.profCodigo,
      consCodigo: clean(item.consCodigo),
      profEstadoCons: clean(item.profEstadoCons),
      nome: clean(item.profNome),
      apelido: clean(item.profApelido),
      obs: clean(item.profObs),
    };
  });
}

async function buildDiretorioDaUnidade(unidade) {
  const centrosJson = await clinvidaRequestFor(unidade, 'centros');
  const centros = unwrap(centrosJson) || [];
  const listas = await Promise.all(
    centros.map((centro) => fetchProfissionaisDoCentro(unidade, clean(centro.cenCodigo), clean(centro.cenDescricao)))
  );
  return listas.flat();
}

// Agrega profissionais de todas as unidades e especialidades numa única
// lista. Cada unidade é uma base do ClinVida independente (sem nenhum dado
// compartilhado) — por isso o fan-out usa Promise.allSettled: uma unidade
// fora do ar (ou ainda sem API_BASE_URL configurada) só tira as entradas
// dela do diretório, nunca quebra o resto.
//
// `unidades` chega pronta de fora (ver getTodosProfissionais) — resolvê-la
// aqui dentro exigiria chamar getUnidadesConfiguradas() -> getSettings() ->
// getCurrentTenant() -> headers() dentro do escopo do unstable_cache, que o
// Next não permite (dado dinâmico dentro de cache). Como bônus, receber
// `unidades` como argumento faz o unstable_cache usá-la na chave do cache
// automaticamente — essencial aqui, já que cada empresa tem seu próprio
// apiBaseUrl por unidade: sem isso, o diretório de uma empresa vazaria pro
// cache das outras.
async function buildDiretorioProfissionais(unidades) {
  const resultados = await Promise.allSettled(unidades.map((u) => buildDiretorioDaUnidade(u)));
  return resultados.reduce((acc, r, idx) => {
    if (r.status === 'fulfilled') {
      acc.push(...r.value);
    } else {
      console.warn(`Unidade "${unidades[idx].id}" falhou ao montar o diretório:`, r.reason?.message || r.reason);
    }
    return acc;
  }, []);
}

const cachedBuildDiretorioProfissionais = unstable_cache(buildDiretorioProfissionais, ['profissionais-diretorio'], {
  revalidate: PROFISSIONAIS_CACHE_REVALIDATE_SECONDS,
  tags: ['profissionais'],
});

export async function getTodosProfissionais() {
  const unidades = await getUnidadesConfiguradas();
  return cachedBuildDiretorioProfissionais(unidades);
}

export async function getProfissionalPorSlug(slug) {
  const todos = await getTodosProfissionais();
  return todos.find((profissional) => profissional.slug === slug) || null;
}

// O ClinVida cadastra o mesmo profissional uma vez por especialidade/exame em
// que atua (mesmo CRM, cenCodigo diferente) — por isso a lista "crua" tem
// Hamilcar Torres, por exemplo, aparecendo em "Angiologia" e "Duplex-Scan"
// como duas entradas distintas. Essa chave agrupa essas entradas pela
// identidade real do profissional (conselho + código + estado = o próprio
// registro do CRM/CRN) DENTRO DA MESMA UNIDADE — nunca entre unidades
// diferentes, já que os códigos de uma base não são comparáveis com os da
// outra. Um profissional que atende nas duas unidades gera duas entradas
// unificadas distintas (uma por unidade), de propósito. Quando algum dos
// três campos vem vazio (equipe sem conselho cadastrado), não há como
// confirmar a identidade com segurança, então o item fica "sozinho" (nunca
// agrupamos por suposição).
function chaveIdentidade(item) {
  if (item.consCodigo && item.profCodigo && item.profEstadoCons) {
    return `${item.unidade}|${item.consCodigo}|${item.profCodigo}|${item.profEstadoCons}`;
  }
  return null;
}

async function buildProfissionaisUnificados() {
  const todos = await getTodosProfissionais();
  const grupos = new Map();

  for (const item of todos) {
    const chave = chaveIdentidade(item) || `solo:${item.slug}`;
    if (!grupos.has(chave)) {
      const nomeExibicao = item.apelido || item.nome;
      grupos.set(chave, {
        slug: `${slugify(nomeExibicao)}-${item.unidade}-${item.profCodigo}`,
        unidade: item.unidade,
        nome: item.nome,
        apelido: item.apelido,
        consCodigo: item.consCodigo,
        profCodigo: item.profCodigo,
        profEstadoCons: item.profEstadoCons,
        obs: item.obs,
        especialidades: [],
      });
    }
    grupos.get(chave).especialidades.push({
      especialidade: item.especialidade,
      cenCodigo: item.cenCodigo,
      slugOriginal: item.slug,
    });
  }

  return Array.from(grupos.values());
}

// Visão pública/admin: um único card/link por profissional (dentro de uma
// unidade), com todos os serviços (especialidades/exames) que ele realiza
// ali. Não precisa de cache próprio — a chamada cara (fetch no ClinVida) já
// está cacheada dentro de getTodosProfissionais(); agrupar em memória é
// praticamente grátis.
export async function getProfissionaisUnificados() {
  return buildProfissionaisUnificados();
}
