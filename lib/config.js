import { getContent } from './store';
import { mapContentToSiteConfig } from './mapSiteConfig';

// Max number of tool-calling round-trips the chat agent may perform for a
// single user turn before it's forced to answer without tools.
export const MAX_TOOL_ROUNDS = 6;

export const SPECIALTIES_CACHE_TTL_MS = 15 * 60 * 1000;

// How long the aggregated directory of professionals (all specialties) stays
// cached before Next.js revalidates it in the background.
export const PROFISSIONAIS_CACHE_REVALIDATE_SECONDS = 60 * 60;

// Identidade da clínica, marca e textos institucionais — hoje editáveis pelo
// /admin (gravados em data/content.json via lib/store, ver defaults.js para
// os valores usados antes de qualquer edição). Assíncrono de propósito: lê o
// storage em runtime, sem precisar de rebuild para refletir uma edição.
export async function getSiteConfig() {
  const content = await getContent();
  return mapContentToSiteConfig(content);
}
