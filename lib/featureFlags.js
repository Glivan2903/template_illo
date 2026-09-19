// Liga/desliga funcionalidades inteiras (página pública, link de navegação
// e/ou rota de API correspondente). Hoje editável pelo /superadmin, gravado
// em data/settings.json via lib/store — por padrão tudo fica ativado (ver
// lib/store/defaults.js). Assíncrono: lê o storage em runtime, sem precisar
// de rebuild para refletir uma alteração.
import { getSettings } from './store';

export async function getFeatureFlags() {
  const settings = await getSettings();
  const f = settings.featureFlags || {};

  return {
    // Seções da Home.
    FEATURE_SOBRE: f.sobre !== false,
    FEATURE_ESPECIALIDADES: f.especialidades !== false,
    FEATURE_CTA: f.cta !== false,

    // Diretório de profissionais (/medicos), agrupado por especialidade, com
    // busca. Não existe página individual por profissional — todos levam ao
    // fluxo de agendamento genérico.
    FEATURE_PROFISSIONAIS: f.profissionais !== false,

    // Orçamento de exames/procedimentos (/orcamento).
    FEATURE_ORCAMENTO: f.orcamento !== false,

    // Wizard de marcar uma consulta NOVA pelo site (/agendamento e a aba
    // "Novo Agendamento" da Central de Agendamento) — não afeta o
    // cancelamento/reagendamento de consultas já existentes na Área do Cliente.
    FEATURE_AGENDAMENTO: f.agendamento !== false,

    // Área do Cliente (/area-cliente e a aba "Minhas Consultas" da Central
    // de Agendamento): login por telefone, histórico, cancelamento e reagendamento.
    FEATURE_AREA_CLIENTE: f.areaCliente !== false,

    // Central de Agendamento (/central-agendamento): página única com abas
    // "Novo Agendamento" / "Minhas Consultas", reaproveitando os fluxos acima.
    FEATURE_CENTRAL_AGENDAMENTO: f.centralAgendamento !== false,

    // Chat com IA (Sofia) no site (/chat) — precisa da chave da OpenAI
    // configurada no .env (OPENAI_API_KEY).
    FEATURE_CHAT: f.chat !== false,

    // Widget flutuante da Sofia (bolinha de chat visível em todas as
    // páginas, exceto /chat e /medicos — ver components/chat/ChatWidget.js).
    // Independente de FEATURE_CHAT: dá pra ter só a página /chat, só o
    // flutuante, os dois, ou nenhum. Usa o mesmo motor/ferramentas/prompt
    // (lib/sofiaEngine.js) da página /chat — mesmo fluxo de agendamento.
    FEATURE_CHAT_FLUTUANTE: f.chatFlutuante !== false,
  };
}
