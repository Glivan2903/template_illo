import { UNIDADES_INFO } from './unidadesInfo';
import { getSettings } from './store';

// "false" (deixado assim de propósito, sem apagar o campo) conta como não
// configurada, igual string vazia.
function normalizarApiBaseUrl(valor) {
  if (!valor || valor.trim().toLowerCase() === 'false') return null;
  return valor;
}

// Registro server-only das unidades — cada uma aponta pro seu próprio
// backend/banco ClinVida. Uma unidade sem apiBaseUrl configurado em
// data/settings.json (via /superadmin) simplesmente não aparece em
// getUnidadesConfiguradas() nem é resolvida por getUnidade(): é assim que a
// Filial pode ficar desligada até sua URL ser preenchida, sem quebrar nada
// que já funciona só com a Matriz.
async function getUnidadesRegistry() {
  const settings = await getSettings();
  return Object.fromEntries(
    UNIDADES_INFO.map(({ id, nome }) => [
      id,
      {
        id,
        nome: `Unidade ${nome}`,
        apiBaseUrl: normalizarApiBaseUrl(settings.unidades?.[id]?.apiBaseUrl),
      },
    ])
  );
}

export async function getUnidade(unidadeId) {
  const unidades = await getUnidadesRegistry();
  const unidade = unidades[unidadeId];
  if (!unidade || !unidade.apiBaseUrl) return null;
  return unidade;
}

export async function getUnidadesConfiguradas() {
  const unidades = await getUnidadesRegistry();
  return Object.values(unidades).filter((u) => Boolean(u.apiBaseUrl));
}

// Atalho pros componentes visuais (Footer, AboutSection) que mostram um
// bloco fixo por unidade — evita repetir esse cálculo em cada página.
export async function getUnidadesFooterProps() {
  const configuradas = await getUnidadesConfiguradas();
  const ids = configuradas.map((u) => u.id);
  return { mostrarMatriz: ids.includes('matriz'), mostrarFilial: ids.includes('filial') };
}
