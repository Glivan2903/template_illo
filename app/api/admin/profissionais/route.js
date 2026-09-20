import { NextResponse } from 'next/server';
import { requireRole } from '../../../../lib/auth/guard';
import { getContent } from '../../../../lib/store';
import { getRequestOrigin, getRequestHost } from '../../../../lib/tenant';
import { getProfissionaisUnificados, identidadeProfissional } from '../../../../lib/profissionais';

// Mesma URL que MedicosDirectory monta (client-side, relativa) — aqui em
// absoluto, porque essa lista existe pra o admin poder COPIAR o link e
// colar em outro canal (WhatsApp, bio, etc.), fora do fluxo automático de
// /medicos.
function montarLinkAbsoluto({ protocol, host, portSuffix }, params) {
  const query = new URLSearchParams(params);
  return `${protocol}://${host}${portSuffix}/agendamento?${query.toString()}`;
}

// Lista de profissionais (ao vivo do ClinVida) + estado do link direto de
// agendamento de cada um nessa empresa — rota de API em vez de embutir no
// carregamento normal do /admin porque bate no ClinVida (rede/token por
// unidade), custo que só vale a pena pagar quando o admin de fato abre a
// página "Profissionais" no sidebar.
export async function GET() {
  try {
    await requireRole(['admin']);
  } catch {
    return NextResponse.json({ ok: false, erro: 'Não autorizado.' }, { status: 401 });
  }

  const [profissionais, content, origin, host] = await Promise.all([
    getProfissionaisUnificados(),
    getContent(),
    getRequestOrigin(),
    getRequestHost(),
  ]);
  const desativados = new Set(content.profissionaisLinksDesativados || []);
  const centroEscolhido = content.profissionaisLinkCentro || {};

  const lista = profissionais.map((prof) => {
    const identidade = identidadeProfissional(prof);
    const cenCodigoEscolhido = centroEscolhido[identidade] || prof.especialidades[0].cenCodigo;
    const especialidade =
      prof.especialidades.find((e) => e.cenCodigo === cenCodigoEscolhido) || prof.especialidades[0];
    const nome = prof.apelido || prof.nome;

    return {
      identidade,
      nome,
      unidade: prof.unidade,
      profCodigo: prof.profCodigo,
      consCodigo: prof.consCodigo,
      profEstadoCons: prof.profEstadoCons,
      ativo: !desativados.has(identidade),
      especialidades: prof.especialidades.map((e) => ({ cenCodigo: e.cenCodigo, especialidade: e.especialidade })),
      cenCodigoEscolhido: especialidade.cenCodigo,
      link: montarLinkAbsoluto(
        { protocol: origin.protocol, host, portSuffix: origin.portSuffix },
        {
          unidade: prof.unidade,
          cen: especialidade.cenCodigo,
          cenNome: especialidade.especialidade,
          prof: prof.profCodigo,
          cons: prof.consCodigo || '',
          uf: prof.profEstadoCons || '',
          nome,
        }
      ),
    };
  });

  return NextResponse.json({ ok: true, profissionais: lista });
}
