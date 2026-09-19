// Mapeia o formato "cru" de content.json/settings.json para o formato plano
// (CLINIC_NOME, TEXTOS, FEATURE_*...) que os componentes públicos consomem
// via useSiteConfig(). Função pura, sem import server-only, de propósito:
// lib/config.js usa isto no servidor, e o preview ao vivo do /admin
// (AdminWorkspace/PreviewFrame) usa a mesma função no navegador para montar
// o payload que é enviado por postMessage ao iframe do site.
export function mapContentToSiteConfig(content = {}, featureFlags = {}) {
  const matriz = content.unidades?.matriz || {};
  const filial = content.unidades?.filial || {};

  return {
    CLINIC_NOME: content.clinicNome,

    CLINIC_PHONE_DISPLAY_MATRIZ: matriz.telefoneDisplay,
    CLINIC_WHATSAPP_URL_MATRIZ: matriz.whatsappUrl,
    CLINIC_ENDERECO_MATRIZ: matriz.endereco,

    CLINIC_PHONE_DISPLAY_FILIAL: filial.telefoneDisplay,
    CLINIC_WHATSAPP_URL_FILIAL: filial.whatsappUrl,
    CLINIC_ENDERECO_FILIAL: filial.endereco,

    CLINIC_PHONE_DISPLAY: matriz.telefoneDisplay,
    CLINIC_WHATSAPP_URL: matriz.whatsappUrl,

    CLINIC_HORARIO_ATENDIMENTO: content.horarioAtendimento,

    CLINIC_INSTAGRAM_HANDLE: content.instagramHandle,
    CLINIC_INSTAGRAM_URL: content.instagramUrl,

    CLINIC_TIMEZONE: content.timezone,

    BRAND_COLOR_PRIMARY: content.brand?.colorPrimary,
    BRAND_COLOR_SECONDARY: content.brand?.colorSecondary,
    LOGO_URL: content.brand?.logoUrl,
    HERO_FOTO_URL: content.heroFotoUrl,

    TEXTOS: content.textos,
    ESPECIALIDADES: content.especialidades,

    FEATURE_SOBRE: featureFlags.sobre !== false,
    FEATURE_ESPECIALIDADES: featureFlags.especialidades !== false,
    FEATURE_CTA: featureFlags.cta !== false,
    FEATURE_PROFISSIONAIS: featureFlags.profissionais !== false,
    FEATURE_ORCAMENTO: featureFlags.orcamento !== false,
    FEATURE_AGENDAMENTO: featureFlags.agendamento !== false,
    FEATURE_AREA_CLIENTE: featureFlags.areaCliente !== false,
    FEATURE_CENTRAL_AGENDAMENTO: featureFlags.centralAgendamento !== false,
    FEATURE_CHAT: featureFlags.chat !== false,
  };
}
