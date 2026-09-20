'use client';

import { useEffect, useState } from 'react';
import { Loader2, Copy, Check } from 'lucide-react';
import fieldStyles from './admin.module.css';
import workspaceStyles from './workspace.module.css';

async function copyText(value) {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

// Lista carregada sob demanda (ver app/api/admin/profissionais/route.js) —
// só quando essa seção do sidebar é aberta, já que bate no ClinVida
// (rede/token por unidade), diferente do resto do /admin que edita só
// campos locais. Cada profissional já vem com o link pronto (absoluto,
// pra copiar em outros canais) e a especialidade/centro atualmente
// escolhida, pra quem atende em mais de uma.
export default function ProfissionaisLinksManager({ toggleAction, centroAction }) {
  const [profissionais, setProfissionais] = useState(null);
  const [erro, setErro] = useState(null);
  const [pendingId, setPendingId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    let cancelado = false;
    fetch('/api/admin/profissionais')
      .then((res) => res.json())
      .then((data) => {
        if (cancelado) return;
        if (data.ok) setProfissionais(data.profissionais);
        else setErro(data.erro || 'Não foi possível carregar os profissionais.');
      })
      .catch(() => {
        if (!cancelado) setErro('Não foi possível carregar os profissionais.');
      });
    return () => {
      cancelado = true;
    };
  }, []);

  async function handleToggle(prof) {
    setPendingId(prof.identidade);
    const proximoAtivo = !prof.ativo;
    setProfissionais((prev) => prev.map((p) => (p.identidade === prof.identidade ? { ...p, ativo: proximoAtivo } : p)));
    await toggleAction(prof.identidade, proximoAtivo);
    setPendingId(null);
  }

  // Atualiza local em vez de buscar a lista de novo: a rota de API lê
  // content via um cache em memória de alguns segundos (ver lib/store),
  // então um GET logo depois do save poderia devolver o valor antigo por
  // um instante — o admin já tem tudo que precisa (especialidades, dados
  // do profissional) pra montar o link certo na hora, sem esperar.
  function montarLink(prof, especialidade) {
    const params = new URLSearchParams({
      unidade: prof.unidade,
      cen: especialidade.cenCodigo,
      cenNome: especialidade.especialidade,
      prof: prof.profCodigo,
      cons: prof.consCodigo || '',
      uf: prof.profEstadoCons || '',
      nome: prof.nome,
    });
    return `${window.location.origin}/agendamento?${params.toString()}`;
  }

  async function handleCentroChange(prof, cenCodigo) {
    setPendingId(prof.identidade);
    const especialidade = prof.especialidades.find((e) => e.cenCodigo === cenCodigo) || prof.especialidades[0];
    setProfissionais((prev) =>
      prev.map((p) =>
        p.identidade === prof.identidade
          ? { ...p, cenCodigoEscolhido: especialidade.cenCodigo, link: montarLink(p, especialidade) }
          : p
      )
    );
    await centroAction(prof.identidade, cenCodigo);
    setPendingId(null);
  }

  async function handleCopy(prof) {
    if (await copyText(prof.link)) {
      setCopiedId(prof.identidade);
      setTimeout(() => setCopiedId(null), 1500);
    }
  }

  return (
    <section className={fieldStyles.card}>
      <h2 className={fieldStyles.cardTitle}>Profissionais</h2>
      <p className={fieldStyles.cardHint}>
        Ative/desative, edite qual especialidade o link usa (quando o profissional atende em mais de uma) e copie o
        link de cada profissional — o mesmo usado automaticamente nos cards de /medicos.
      </p>

      {erro && <p className={fieldStyles.warningBox}>{erro}</p>}

      {!profissionais && !erro && (
        <p className={fieldStyles.cardHint}>
          <Loader2 size={13} className={fieldStyles.spin} style={{ verticalAlign: '-2px' }} /> Carregando
          profissionais...
        </p>
      )}

      {profissionais && profissionais.length === 0 && (
        <p className={fieldStyles.cardHint}>Nenhum profissional encontrado nas unidades configuradas.</p>
      )}

      {profissionais && profissionais.length > 0 && (
        <div className={workspaceStyles.moduleGrid}>
          {profissionais.map((prof) => (
            <div key={prof.identidade} className={workspaceStyles.profCard}>
              <div className={workspaceStyles.profHead}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <strong className={workspaceStyles.profNome}>{prof.nome}</strong>
                  {prof.especialidades.length > 1 ? (
                    <select
                      className={workspaceStyles.profSelect}
                      value={prof.cenCodigoEscolhido}
                      disabled={pendingId === prof.identidade}
                      onChange={(e) => handleCentroChange(prof, e.target.value)}
                    >
                      {prof.especialidades.map((esp) => (
                        <option key={esp.cenCodigo} value={esp.cenCodigo}>
                          {esp.especialidade}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className={workspaceStyles.profEspecialidade}>{prof.especialidades[0]?.especialidade}</span>
                  )}
                </div>
                <span className={workspaceStyles.switch}>
                  <input
                    type="checkbox"
                    checked={prof.ativo}
                    disabled={pendingId === prof.identidade}
                    onChange={() => handleToggle(prof)}
                  />
                  <span className={workspaceStyles.switchTrack} />
                </span>
              </div>

              <div className={workspaceStyles.profLinkRow}>
                <code className={workspaceStyles.profLinkCode}>{prof.link}</code>
                <button
                  type="button"
                  className={workspaceStyles.profCopyBtn}
                  onClick={() => handleCopy(prof)}
                  aria-label={`Copiar link de ${prof.nome}`}
                  title="Copiar link"
                >
                  {copiedId === prof.identidade ? <Check size={13} /> : <Copy size={13} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
