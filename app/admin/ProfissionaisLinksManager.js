'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import fieldStyles from './admin.module.css';
import workspaceStyles from './workspace.module.css';

// Lista carregada sob demanda (ver app/api/admin/profissionais/route.js) —
// só quando essa seção do sidebar é aberta, já que bate no ClinVida
// (rede/token por unidade), diferente do resto do /admin que edita só
// campos locais.
export default function ProfissionaisLinksManager({ toggleAction }) {
  const [profissionais, setProfissionais] = useState(null);
  const [erro, setErro] = useState(null);
  const [pendingId, setPendingId] = useState(null);

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

  return (
    <section className={fieldStyles.card}>
      <h2 className={fieldStyles.cardTitle}>Profissionais</h2>
      <p className={fieldStyles.cardHint}>
        Liga/desliga, por profissional, o link direto de agendamento em /medicos — desativado, o card dele volta a
        levar pro fluxo genérico de agendamento.
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
            <label key={prof.identidade} className={workspaceStyles.moduleCard}>
              <span>
                <strong style={{ display: 'block' }}>{prof.nome}</strong>
                <span style={{ fontSize: '0.72rem', opacity: 0.7 }}>{prof.especialidades.join(' · ')}</span>
              </span>
              <span className={workspaceStyles.switch}>
                <input
                  type="checkbox"
                  checked={prof.ativo}
                  disabled={pendingId === prof.identidade}
                  onChange={() => handleToggle(prof)}
                />
                <span className={workspaceStyles.switchTrack} />
              </span>
            </label>
          ))}
        </div>
      )}
    </section>
  );
}
