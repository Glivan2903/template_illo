'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '../../lib/auth/guard';
import { getContent, saveContent } from '../../lib/store';

// Constrói { a: { b: { c: valor } } } a partir de ['a','b','c'] — usado por
// updateField pra gravar só o campo editado (saveContent já faz deep-merge
// com o resto do conteúdo, ver lib/store/index.js). Upload de imagem
// (logo/foto da fachada) vai por app/api/admin/upload-image/route.js, não
// por aqui — Server Actions têm limite de payload baixo pra base64 de
// imagem (ver comentário na rota).
function buildPartial(pathParts, value) {
  if (pathParts.length === 0) return value;
  return { [pathParts[0]]: buildPartial(pathParts.slice(1), value) };
}

// Edição inline de texto: clicar num elemento do preview, editar ali mesmo
// (ver lib/EditableOverlay.js) e sair do campo já salva — sem formulário
// separado. `field` é o mesmo caminho usado em data-editable (ex.:
// "textos.heroTituloLinha1", "clinicNome", "unidades.matriz.endereco").
export async function updateField(field, value) {
  await requireRole(['admin']);
  await saveContent(buildPartial(field.split('.'), value));
  revalidatePath('/', 'layout');
}

// Página "Cores" do sidebar — única tela que ainda é um formulário (não dá
// pra "clicar num texto" pra mudar uma cor de marca, ela não é um texto).
export async function updateCores(colorPrimary, colorSecondary) {
  await requireRole(['admin']);
  await saveContent({ brand: { colorPrimary, colorSecondary } });
  revalidatePath('/', 'layout');
}

// Página "Profissionais" do sidebar — liga/desliga o link direto de
// agendamento por profissional individualmente (ver
// identidadeProfissional em lib/profissionais.js e
// app/api/admin/profissionais/route.js, que monta a lista pro cliente).
export async function toggleLinkProfissional(identidade, ativo) {
  await requireRole(['admin']);
  const content = await getContent();
  const atual = content.profissionaisLinksDesativados || [];
  const proximo = ativo ? atual.filter((id) => id !== identidade) : [...new Set([...atual, identidade])];
  await saveContent({ profissionaisLinksDesativados: proximo });
  revalidatePath('/', 'layout');
}

// Escolhe qual especialidade/centro o link do profissional usa, pra quem
// atende em mais de uma (o link só pode apontar pra uma por vez).
export async function updateLinkProfissionalCentro(identidade, cenCodigo) {
  await requireRole(['admin']);
  const content = await getContent();
  const atual = content.profissionaisLinkCentro || {};
  await saveContent({ profissionaisLinkCentro: { ...atual, [identidade]: cenCodigo } });
  revalidatePath('/', 'layout');
}

export async function addEspecialidade() {
  await requireRole(['admin']);
  const content = await getContent();
  const list = content.especialidades || [];
  const nextId = Math.max(0, ...list.map((item) => item.id || 0)) + 1;
  const next = [
    ...list,
    { id: nextId, nome: 'Nova especialidade', descricao: 'Descrição da especialidade.', icone: 'Stethoscope' },
  ];
  const saved = await saveContent({ especialidades: next });
  revalidatePath('/', 'layout');
  return saved.especialidades;
}

export async function removeEspecialidade(index) {
  await requireRole(['admin']);
  const content = await getContent();
  const list = content.especialidades || [];
  const next = list.filter((_, i) => i !== index);
  const saved = await saveContent({ especialidades: next });
  revalidatePath('/', 'layout');
  return saved.especialidades;
}

export async function updateEspecialidadeField(index, key, value) {
  await requireRole(['admin']);
  if (key !== 'nome' && key !== 'descricao') return;
  const content = await getContent();
  const list = content.especialidades || [];
  const next = list.map((item, i) => (i === index ? { ...item, [key]: value } : item));
  await saveContent({ especialidades: next });
  revalidatePath('/', 'layout');
}
