import { NextResponse } from 'next/server';
import { requireRole } from '../../../../lib/auth/guard';
import { getContent } from '../../../../lib/store';
import { getProfissionaisUnificados, identidadeProfissional } from '../../../../lib/profissionais';

// Lista de profissionais (ao vivo do ClinVida) + quais têm o link direto de
// agendamento desativado nessa empresa — rota de API em vez de embutir no
// carregamento normal do /admin porque bate no ClinVida (rede/token por
// unidade), custo que só vale a pena pagar quando o admin de fato abre a
// página "Profissionais" no sidebar.
export async function GET() {
  try {
    await requireRole(['admin']);
  } catch {
    return NextResponse.json({ ok: false, erro: 'Não autorizado.' }, { status: 401 });
  }

  const [profissionais, content] = await Promise.all([getProfissionaisUnificados(), getContent()]);
  const desativados = new Set(content.profissionaisLinksDesativados || []);

  const lista = profissionais.map((prof) => {
    const identidade = identidadeProfissional(prof);
    return {
      identidade,
      nome: prof.apelido || prof.nome,
      unidade: prof.unidade,
      especialidades: prof.especialidades.map((e) => e.especialidade),
      ativo: !desativados.has(identidade),
    };
  });

  return NextResponse.json({ ok: true, profissionais: lista });
}
