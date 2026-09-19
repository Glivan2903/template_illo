import { clinvidaRequest } from './clinvida';
import { getUnidadesConfiguradas } from './unidades';
import { UNIDADES_INFO } from './unidadesInfo';
import { SPECIALTIES_CACHE_TTL_MS, getSiteConfig } from './config';

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

function onlyDigits(value) {
  return (value || '').toString().replace(/\D/g, '');
}

function nomeUnidade(unidadeId) {
  return UNIDADES_INFO.find((u) => u.id === unidadeId)?.nome || unidadeId;
}

// Chama clinvidaRequest(unidade, path) em todas as unidades configuradas,
// em paralelo. Uma unidade fora do ar (ou ainda sem API_BASE_URL) nunca
// impede as outras de responder.
async function fanOutUnidadesClinvida(path) {
  const unidades = await getUnidadesConfiguradas();
  const resultados = await Promise.allSettled(unidades.map((u) => clinvidaRequest(u.id, path)));
  return unidades.reduce((acc, u, idx) => {
    const r = resultados[idx];
    if (r.status === 'fulfilled') {
      acc.push({ unidadeId: u.id, dados: unwrap(r.value) || [] });
    } else {
      console.warn(`Unidade "${u.id}" não respondeu (${path}):`, r.reason?.message || r.reason);
    }
    return acc;
  }, []);
}

// profissional_ref, slot_ref, agendamento_ref e os "codigo" de especialidade
// /convênio/procedimento carregam a unidade embutida como primeiro campo —
// assim o modelo nunca precisa perguntar (ou adivinhar) em qual unidade
// operar: ele só continua usando os valores exatos retornados pelas
// ferramentas anteriores, como o prompt já instrui hoje.
function parseCodigoComUnidade(ref, label) {
  const partes = String(ref || '').split(':');
  if (partes.length < 2 || !partes[0] || !partes[1]) {
    throw new Error(`${label} inválido. Use exatamente o valor retornado pela ferramenta anterior.`);
  }
  return { unidade: partes[0], codigo: partes.slice(1).join(':') };
}

function parseProfissionalRef(ref) {
  const [unidade, cen, prof, cons, uf] = String(ref || '').split(':');
  if (!unidade || !cen || !prof || !cons || !uf) {
    throw new Error('profissional_ref inválido. Use exatamente o valor retornado por listar_profissionais.');
  }
  return { unidade, cen, prof, cons, uf };
}

function parseSlotRef(ref) {
  const [unidade, dia, agdCodigo, hdiCodigo] = String(ref || '').split(':');
  if (!unidade || !dia || !agdCodigo || !hdiCodigo) {
    throw new Error('slot_ref inválido. Use exatamente o valor retornado por listar_horarios.');
  }
  return { unidade, dia, agdCodigo, hdiCodigo };
}

function parseAgendamentoRef(ref) {
  const [unidade, agdCodigo, hdiCodigo, hmaNumero, data, cnvCodigo, exaCodigo] = String(ref || '').split('|');
  if (!unidade || !agdCodigo || !hdiCodigo || !hmaNumero || !data) {
    throw new Error('agendamento_ref inválido. Use exatamente o valor retornado por listar_historico.');
  }
  return { unidade, agdCodigo, hdiCodigo, hmaNumero, data, cnvCodigo, exaCodigo };
}

function formatDateToDDMMYYYY(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

function requireConfirmation(confirmado_pelo_usuario, acao) {
  if (!confirmado_pelo_usuario) {
    throw new Error(
      `Confirmação pendente: pergunte ao paciente se ele confirma a ${acao} e só chame esta ferramenta novamente com confirmado_pelo_usuario=true depois de uma resposta afirmativa explícita.`
    );
  }
}

let especialidadesCache = null;

export async function listar_especialidades() {
  if (especialidadesCache && especialidadesCache.expiresAt > Date.now()) {
    return especialidadesCache.data;
  }
  const porUnidade = await fanOutUnidadesClinvida('centros');
  const result = porUnidade.flatMap(({ unidadeId, dados }) =>
    (dados || []).map((item) => ({
      codigo: `${unidadeId}:${clean(item.cenCodigo)}`,
      nome: clean(item.cenDescricao),
      unidade: nomeUnidade(unidadeId),
    }))
  );
  especialidadesCache = { data: result, expiresAt: Date.now() + SPECIALTIES_CACHE_TTL_MS };
  return result;
}

export async function listar_profissionais({ codigo_especialidade }) {
  const { unidade, codigo: cen } = parseCodigoComUnidade(codigo_especialidade, 'codigo_especialidade');
  const json = await clinvidaRequest(unidade, `profissionais/${encodeURIComponent(cen)}`);
  const data = unwrap(json);
  return (data || []).map((item) => ({
    profissional_ref: `${unidade}:${cen}:${item.profCodigo}:${item.consCodigo}:${item.profEstadoCons}`,
    nome: clean(item.profNome),
  }));
}

export async function listar_opcoes({ profissional_ref }) {
  const { unidade, cen, prof, cons, uf } = parseProfissionalRef(profissional_ref);
  const json = await clinvidaRequest(unidade, `opcoes/${cen}/${prof}/${cons}/${uf}`);
  const data = unwrap(json) || [];
  return {
    convenios: data
      .filter((o) => o.tipo === 'CONVENIO')
      .map((o) => ({ codigo: `${unidade}:${clean(o.codigo)}`, nome: clean(o.descricao) })),
    procedimentos: data
      .filter((o) => o.tipo === 'EXAME')
      .map((o) => ({ codigo: `${unidade}:${clean(o.codigo)}`, nome: clean(o.descricao) })),
  };
}

export async function consultar_valor({ convenio_codigo, procedimento_codigo }) {
  const cnvParsed = parseCodigoComUnidade(convenio_codigo, 'convenio_codigo');
  const exaParsed = parseCodigoComUnidade(procedimento_codigo, 'procedimento_codigo');
  if (cnvParsed.unidade !== exaParsed.unidade) {
    throw new Error(
      'convenio_codigo e procedimento_codigo vêm de unidades diferentes — use os valores exatos retornados juntos por listar_opcoes.'
    );
  }
  const unidade = cnvParsed.unidade;
  const json = await clinvidaRequest(
    unidade,
    `valor/${encodeURIComponent(cnvParsed.codigo)}/${encodeURIComponent(exaParsed.codigo)}`
  );
  const data = unwrap(json) || [];
  const item = data[0];
  if (!item) {
    return { convenio: null, procedimento: null, valor: null };
  }
  return {
    convenio: clean(item.cnvNome),
    procedimento: clean(item.exaDescricao),
    valor: item.valor ?? null,
  };
}

export async function listar_dias_disponiveis({ profissional_ref }) {
  const { unidade, cen, prof, cons, uf } = parseProfissionalRef(profissional_ref);
  const json = await clinvidaRequest(unidade, `dias/${cen}/${prof}/${cons}/${uf}`);
  const data = unwrap(json) || [];
  return data.map((item) => ({ dia: clean(item.hagDia), ordem: item.ordemdia }));
}

export async function listar_horarios({ profissional_ref, dia }) {
  const { unidade, cen, prof, cons, uf } = parseProfissionalRef(profissional_ref);
  const diaLimpo = clean(dia);
  const json = await clinvidaRequest(unidade, `horarios/${cen}/${prof}/${cons}/${uf}/${encodeURIComponent(diaLimpo)}`);
  const data = unwrap(json) || [];
  // Mantém o "dia" de origem (não o hagDia retornado aqui, que vem em outra
  // capitalização) para ficar consistente com o restante da cadeia
  // (agendaslivres e agendar usam o mesmo código de dia de listar_dias_disponiveis).
  return data.map((item) => ({
    slot_ref: `${unidade}:${diaLimpo}:${item.agdCodigo}:${item.hdiCodigo}`,
    horario: clean(item.horario),
  }));
}

export async function listar_datas_disponiveis({ slot_ref, semanas = 4 }) {
  const { unidade, dia, agdCodigo, hdiCodigo } = parseSlotRef(slot_ref);
  const json = await clinvidaRequest(unidade, `agendaslivres/${dia}/${agdCodigo}/${hdiCodigo}/${semanas}`);
  const data = unwrap(json) || [];
  return data
    .filter((item) => Number(item.livres) > 0)
    .map((item) => ({
      data: item.data,
      dia_semana: item.dia,
      vagas: item.livres,
    }));
}

export async function criar_agendamento({
  slot_ref,
  data,
  nome,
  telefone,
  convenio_codigo,
  procedimento_codigo,
  confirmado_pelo_usuario,
}) {
  requireConfirmation(confirmado_pelo_usuario, 'criação deste agendamento');
  const { unidade, dia, agdCodigo, hdiCodigo } = parseSlotRef(slot_ref);
  const cnv = parseCodigoComUnidade(convenio_codigo, 'convenio_codigo');
  const exa = parseCodigoComUnidade(procedimento_codigo, 'procedimento_codigo');
  const payload = {
    dia,
    agd_codigo: Number(agdCodigo),
    hdi_codigo: Number(hdiCodigo),
    data,
    nome: clean(nome),
    telefone: onlyDigits(telefone),
    cnv_codigo: Number(cnv.codigo),
    exa_codigo: exa.codigo,
  };
  const json = await clinvidaRequest(unidade, 'agendar', { method: 'POST', body: payload });
  const result = unwrap(json);
  const sucesso = Array.isArray(result) && result[0] === 1;
  return {
    sucesso,
    mensagem: sucesso
      ? 'Agendamento confirmado com sucesso.'
      : 'Não foi possível concluir o agendamento. O horário pode não estar mais disponível.',
  };
}

export async function buscar_paciente({ telefone }) {
  const porUnidade = await fanOutUnidadesClinvida(`paciente/${onlyDigits(telefone)}`);
  for (const { dados } of porUnidade) {
    if (dados && dados.length > 0 && dados[0].cliNome) {
      return { nome: clean(dados[0].cliNome) };
    }
  }
  return null;
}

export async function listar_historico({ telefone }) {
  const porUnidade = await fanOutUnidadesClinvida(`historico/${onlyDigits(telefone)}`);
  return porUnidade.flatMap(({ unidadeId, dados }) =>
    (dados || []).map((item) => {
      const dataFormatada = formatDateToDDMMYYYY(item.hmaData);
      return {
        agendamento_ref: `${unidadeId}|${item.agdCodigo}|${item.hdiCodigo}|${item.hmaNumero}|${dataFormatada}|${item.cnvCodigo}|${item.exaCodigo}`,
        data: dataFormatada,
        dia_semana: clean(item.hagDia),
        procedimento: clean(item.exaDescricao),
        profissional: clean(item.profissional),
        especialidade: clean(item.centro),
        convenio: clean(item.convenio),
        status: clean(item.status),
        // Pré-calculado aqui pra Sofia não precisar comparar a string de
        // status ela mesma (evita variação de caixa/espaço na comparação) —
        // só agendamentos com cancelavel:true podem ser cancelados/remarcados.
        cancelavel: clean(item.status).toUpperCase() === 'AGENDADO',
        unidade: nomeUnidade(unidadeId),
      };
    })
  );
}

export async function cancelar_agendamento({ agendamento_ref, confirmado_pelo_usuario }) {
  requireConfirmation(confirmado_pelo_usuario, 'cancelamento deste agendamento');
  const { unidade, agdCodigo, hdiCodigo, hmaNumero, data } = parseAgendamentoRef(agendamento_ref);
  const payload = {
    agd_codigo: Number(agdCodigo),
    hdi_codigo: Number(hdiCodigo),
    hma_numero: Number(hmaNumero),
    data,
  };
  const json = await clinvidaRequest(unidade, 'cancelar', { method: 'POST', body: payload });
  const result = unwrap(json);
  const sucesso = Array.isArray(result) && result[0] === 1;
  return {
    sucesso,
    mensagem: sucesso ? 'Agendamento cancelado com sucesso.' : 'Não foi possível cancelar o agendamento.',
  };
}

export async function reagendar_agendamento({
  agendamento_ref,
  slot_ref,
  data_nova,
  nome,
  telefone,
  confirmado_pelo_usuario,
}) {
  requireConfirmation(confirmado_pelo_usuario, 'remarcação deste agendamento');
  const old = parseAgendamentoRef(agendamento_ref);
  const novo = parseSlotRef(slot_ref);
  if (old.unidade !== novo.unidade) {
    throw new Error(
      'O novo horário pertence a uma unidade diferente da consulta original. Use listar_horarios a partir do mesmo profissional do agendamento a remarcar.'
    );
  }
  const payload = {
    agd_codigo_old: Number(old.agdCodigo),
    hdi_codigo_old: Number(old.hdiCodigo),
    hma_numero_old: Number(old.hmaNumero),
    data_old: old.data,
    dia_new: novo.dia,
    agd_codigo_new: Number(novo.agdCodigo),
    hdi_codigo_new: Number(novo.hdiCodigo),
    data_new: data_nova,
    nome: clean(nome),
    telefone: onlyDigits(telefone),
    cnv_codigo: Number(old.cnvCodigo),
    exa_codigo: old.exaCodigo,
  };
  const json = await clinvidaRequest(old.unidade, 'reagendar', { method: 'POST', body: payload });
  const result = unwrap(json);
  const sucesso = Array.isArray(result) && result[0] === 1;
  return {
    sucesso,
    mensagem: sucesso
      ? 'Reagendamento concluído com sucesso.'
      : 'Não foi possível reagendar. Verifique se o novo horário ainda está disponível.',
  };
}

// Este template não tem um canal de notificação automática para um
// atendente humano (isso dependeria de uma integração de WhatsApp, fora do
// escopo do template). A ferramenta continua existindo para que o prompt
// possa chamá-la sem erro — ela só orienta a Sofia a direcionar o paciente
// para o WhatsApp/telefone da clínica. Para reativar uma escalada real,
// implemente aqui o envio (WhatsApp, e-mail, webhook de um CRM etc.).
export async function escalar_atendimento({ resumo, motivo } = {}) {
  console.log('Atendimento escalado para humano (sem canal automático configurado):', {
    resumo: clean(resumo),
    motivo: clean(motivo),
  });
  const { CLINIC_PHONE_DISPLAY } = await getSiteConfig();
  return {
    sucesso: false,
    mensagem: `Não há atendente automático disponível agora. Oriente o paciente a entrar em contato pelo WhatsApp/telefone da clínica (${CLINIC_PHONE_DISPLAY}).`,
  };
}

export const toolDefinitions = [
  {
    type: 'function',
    function: {
      name: 'listar_especialidades',
      description:
        'Lista todas as especialidades médicas e tipos de exame oferecidos pela clínica, nas unidades disponíveis. Use sempre que precisar saber quais especialidades existem ou para começar um agendamento — nunca invente ou suponha uma lista fixa. Cada item já vem com a unidade certa embutida no "codigo"; não é preciso perguntar ao paciente qual unidade ele quer.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'listar_profissionais',
      description: 'Lista os profissionais (médicos) que atendem em uma especialidade específica.',
      parameters: {
        type: 'object',
        properties: {
          codigo_especialidade: {
            type: 'string',
            description: 'Valor exato do campo "codigo" retornado por listar_especialidades.',
          },
        },
        required: ['codigo_especialidade'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'listar_opcoes',
      description:
        'Lista os convênios aceitos e os procedimentos/exames disponíveis para um profissional específico.',
      parameters: {
        type: 'object',
        properties: {
          profissional_ref: {
            type: 'string',
            description: 'Valor exato do campo "profissional_ref" retornado por listar_profissionais.',
          },
        },
        required: ['profissional_ref'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'consultar_valor',
      description:
        'Consulta o valor em R$ de um procedimento para um convênio específico. Use somente depois de saber o convênio e o procedimento (via listar_opcoes), e sempre com os dois códigos vindos da mesma chamada de listar_opcoes. O campo "valor" pode vir nulo quando o preço exato não está disponível para aquele convênio/forma de pagamento — nesse caso, nunca informe um número, avise o paciente e direcione para o WhatsApp da clínica.',
      parameters: {
        type: 'object',
        properties: {
          convenio_codigo: {
            type: 'string',
            description: 'Código do convênio, campo "codigo" da lista "convenios" retornada por listar_opcoes.',
          },
          procedimento_codigo: {
            type: 'string',
            description:
              'Código do procedimento/exame, campo "codigo" da lista "procedimentos" retornada por listar_opcoes.',
          },
        },
        required: ['convenio_codigo', 'procedimento_codigo'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'listar_dias_disponiveis',
      description: 'Lista os dias da semana em que um profissional atende.',
      parameters: {
        type: 'object',
        properties: {
          profissional_ref: {
            type: 'string',
            description: 'Valor exato do campo "profissional_ref" retornado por listar_profissionais.',
          },
        },
        required: ['profissional_ref'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'listar_horarios',
      description: 'Lista os horários de atendimento de um profissional em um dia específico da semana.',
      parameters: {
        type: 'object',
        properties: {
          profissional_ref: {
            type: 'string',
            description: 'Valor exato do campo "profissional_ref" retornado por listar_profissionais.',
          },
          dia: {
            type: 'string',
            description: 'Dia da semana, campo "dia" retornado por listar_dias_disponiveis (ex: "QUI").',
          },
        },
        required: ['profissional_ref', 'dia'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'listar_datas_disponiveis',
      description:
        'Lista as próximas datas de calendário com vaga livre para um horário específico de um profissional. Só retorna datas com pelo menos 1 vaga.',
      parameters: {
        type: 'object',
        properties: {
          slot_ref: {
            type: 'string',
            description: 'Valor exato do campo "slot_ref" retornado por listar_horarios.',
          },
          semanas: {
            type: 'integer',
            description: 'Quantidade de semanas à frente para buscar datas. Padrão 4.',
          },
        },
        required: ['slot_ref'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'criar_agendamento',
      description:
        'Cria (confirma) um novo agendamento de consulta ou exame. NUNCA chame esta ferramenta sem antes resumir data, horário, profissional, convênio e procedimento para o paciente e obter uma confirmação afirmativa explícita dele.',
      parameters: {
        type: 'object',
        properties: {
          slot_ref: { type: 'string', description: 'Valor exato do campo "slot_ref" retornado por listar_horarios.' },
          data: {
            type: 'string',
            description: 'Data escolhida no formato DD/MM/AAAA, campo "data" retornado por listar_datas_disponiveis.',
          },
          nome: { type: 'string', description: 'Nome completo do paciente.' },
          telefone: { type: 'string', description: 'Telefone/WhatsApp do paciente, com DDD.' },
          convenio_codigo: {
            type: 'string',
            description: 'Código do convênio escolhido, da lista "convenios" de listar_opcoes.',
          },
          procedimento_codigo: {
            type: 'string',
            description: 'Código do procedimento escolhido, da lista "procedimentos" de listar_opcoes.',
          },
          confirmado_pelo_usuario: {
            type: 'boolean',
            description: 'Deve ser true somente se o paciente já confirmou explicitamente esta ação nesta conversa.',
          },
        },
        required: [
          'slot_ref',
          'data',
          'nome',
          'telefone',
          'convenio_codigo',
          'procedimento_codigo',
          'confirmado_pelo_usuario',
        ],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'buscar_paciente',
      description: 'Busca o nome de um paciente já cadastrado a partir do telefone, em qualquer unidade da clínica.',
      parameters: {
        type: 'object',
        properties: {
          telefone: { type: 'string', description: 'Telefone/WhatsApp do paciente, com DDD.' },
        },
        required: ['telefone'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'listar_historico',
      description:
        'Lista o histórico de consultas/exames (agendados, cancelados e realizados) de um paciente a partir do telefone, somando as consultas de todas as unidades da clínica. Use antes de cancelar ou remarcar. Cada item já vem com "cancelavel" (true/false) pronto — para escolher o que cancelar/remarcar, mostre ao paciente só os itens com cancelavel:true.',
      parameters: {
        type: 'object',
        properties: {
          telefone: { type: 'string', description: 'Telefone/WhatsApp do paciente, com DDD.' },
        },
        required: ['telefone'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'cancelar_agendamento',
      description:
        'Cancela um agendamento existente. NUNCA chame esta ferramenta sem antes confirmar com o paciente qual agendamento cancelar e obter uma confirmação afirmativa explícita.',
      parameters: {
        type: 'object',
        properties: {
          agendamento_ref: {
            type: 'string',
            description: 'Valor exato do campo "agendamento_ref" retornado por listar_historico.',
          },
          confirmado_pelo_usuario: {
            type: 'boolean',
            description: 'Deve ser true somente se o paciente já confirmou explicitamente esta ação nesta conversa.',
          },
        },
        required: ['agendamento_ref', 'confirmado_pelo_usuario'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'reagendar_agendamento',
      description:
        'Remarca um agendamento existente para uma nova data/horário, mantendo o mesmo convênio e procedimento originais. O novo horário (slot_ref) precisa vir do mesmo profissional/unidade do agendamento original — siga o fluxo de horários a partir dele. NUNCA chame esta ferramenta sem antes confirmar com o paciente a nova data/horário e obter uma confirmação afirmativa explícita.',
      parameters: {
        type: 'object',
        properties: {
          agendamento_ref: {
            type: 'string',
            description: 'Valor exato do campo "agendamento_ref" retornado por listar_historico (o agendamento antigo).',
          },
          slot_ref: {
            type: 'string',
            description: 'Valor exato do campo "slot_ref" retornado por listar_horarios (o novo horário).',
          },
          data_nova: {
            type: 'string',
            description: 'Nova data escolhida no formato DD/MM/AAAA, de listar_datas_disponiveis.',
          },
          nome: { type: 'string', description: 'Nome completo do paciente.' },
          telefone: { type: 'string', description: 'Telefone/WhatsApp do paciente, com DDD.' },
          confirmado_pelo_usuario: {
            type: 'boolean',
            description: 'Deve ser true somente se o paciente já confirmou explicitamente esta ação nesta conversa.',
          },
        },
        required: ['agendamento_ref', 'slot_ref', 'data_nova', 'nome', 'telefone', 'confirmado_pelo_usuario'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'escalar_atendimento',
      description:
        'Registra que a conversa precisa de um atendente humano. Use sempre que: (1) o paciente pedir explicitamente pra falar com um atendente/humano/pessoa/gerente, ou (2) você não tiver uma informação que o paciente precisa e nenhuma outra ferramenta resolve isso. Este template não notifica ninguém automaticamente — a ferramenta retorna uma orientação para direcionar o paciente ao WhatsApp/telefone da clínica.',
      parameters: {
        type: 'object',
        properties: {
          resumo: {
            type: 'string',
            description: 'Resumo curto (2-4 frases) do que o paciente já disse/pediu nesta conversa.',
          },
          motivo: {
            type: 'string',
            description:
              'Motivo específico da transferência (ex.: "paciente pediu falar com atendente", "não temos essa informação no sistema", "convênio não listado").',
          },
        },
        required: ['resumo', 'motivo'],
      },
    },
  },
];

const toolFunctions = {
  listar_especialidades,
  listar_profissionais,
  listar_opcoes,
  consultar_valor,
  listar_dias_disponiveis,
  listar_horarios,
  listar_datas_disponiveis,
  criar_agendamento,
  buscar_paciente,
  listar_historico,
  cancelar_agendamento,
  reagendar_agendamento,
  escalar_atendimento,
};

export async function executeTool(name, args) {
  const fn = toolFunctions[name];
  if (!fn) {
    throw new Error(`Ferramenta desconhecida: ${name}`);
  }
  return fn(args || {});
}
