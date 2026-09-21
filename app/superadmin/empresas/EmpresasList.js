'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, X, ExternalLink, ChevronRight, Building2 } from 'lucide-react';
import SaveButton from '../../admin/SaveButton';
import { CopyField, CopyIconButton, CopyAllButton } from '../CopyField';
import fieldStyles from '../../admin/admin.module.css';
import styles from '../superadmin.module.css';

export default function EmpresasList({ empresas, actions }) {
  const { createEmpresaAction } = actions;
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [erro, setErro] = useState(null);
  const [criada, setCriada] = useState(null);

  const [, createFormAction, createPending] = useActionState(async (_prev, formData) => {
    const res = await createEmpresaAction(formData);
    if (res.ok) {
      setCriada(res.empresa);
      setFormOpen(false);
      setErro(null);
      setDirty(false);
    } else {
      setErro(res.erro);
    }
    return null;
  }, null);

  return (
    <div>
      <div className={styles.pageHead}>
        <h1 className={styles.pageTitle}>Empresas</h1>
        <button type="button" className={fieldStyles.btnPrimary} onClick={() => setFormOpen((v) => !v)}>
          <Plus size={15} /> {formOpen ? 'Cancelar' : 'Nova empresa'}
        </button>
      </div>

      {formOpen && (
        <div className={fieldStyles.card} style={{ marginBottom: '0.75rem' }}>
          <form action={createFormAction} className={fieldStyles.form} onChange={() => setDirty(true)}>
            {erro && <p className={fieldStyles.warningBox}>{erro}</p>}
            <label className={fieldStyles.field}>
              <span>Nome da empresa (clínica)</span>
              <input name="nome" required autoFocus />
            </label>
            <label className={fieldStyles.field}>
              <span>Domínio próprio (opcional — pode configurar depois)</span>
              <input name="dominioCustomizado" placeholder="clinicadocliente.com.br" />
            </label>
            <label className={fieldStyles.field}>
              <span>URL base da API do sistema (ClinVida)</span>
              <input name="apiBaseUrl" placeholder="http://host:porta" required />
            </label>
            <label className={fieldStyles.field}>
              <span>Chave da API OpenAI (chat da Sofia — opcional)</span>
              <input name="openaiApiKey" placeholder="sk-..." />
            </label>
            <label className={fieldStyles.field}>
              <span>Modelo OpenAI (opcional, padrão gpt-4.1-mini)</span>
              <input name="openaiModel" placeholder="gpt-4.1-mini" />
            </label>
            <SaveButton pending={createPending} dirty={dirty} label="Criar empresa" pendingLabel="Criando..." />
          </form>
        </div>
      )}

      {criada && (
        <div className={fieldStyles.card} style={{ marginBottom: '0.75rem' }}>
          <div className={fieldStyles.cardHead}>
            <h2 className={fieldStyles.cardTitle} style={{ fontSize: '1rem' }}>
              Empresa &quot;{criada.nome}&quot; criada
            </h2>
            <button type="button" className={fieldStyles.iconBtn} onClick={() => setCriada(null)} aria-label="Fechar">
              <X size={16} />
            </button>
          </div>
          <p className={fieldStyles.cardHint}>
            Copie e repasse pro cliente agora — a senha não aparece de novo depois que você sair desta tela.
          </p>
          <div className={styles.credRow}>
            {criada.link && <CopyField label="Link de acesso" value={criada.link} />}
            <CopyField label="Usuário admin" value={criada.adminUser} />
            <CopyField label="Senha admin" value={criada.adminPassword} />
            {criada.link && (
              <a href={criada.link} target="_blank" rel="noreferrer" className={fieldStyles.secondaryBtn}>
                <ExternalLink size={14} /> Abrir site
              </a>
            )}
            <CopyAllButton
              nome={criada.nome}
              link={criada.link}
              adminUser={criada.adminUser}
              adminPassword={criada.adminPassword}
              className={fieldStyles.btnPrimary}
            />
          </div>
        </div>
      )}

      {empresas.length === 0 ? (
        <p className={fieldStyles.cardHint}>Nenhuma empresa cadastrada ainda — clique em &quot;Nova empresa&quot; acima.</p>
      ) : (
        <div className={fieldStyles.card}>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Empresa</th>
                  <th className={styles.colDominio}>Domínio próprio</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {empresas.map((empresa) => (
                  <tr
                    key={empresa.slug}
                    className={styles.rowLink}
                    onClick={() => router.push(`/superadmin/empresas/${empresa.slug}`)}
                  >
                    <td>
                      <div className={styles.rowNomeLink}>
                        <span className={fieldStyles.avatarIcon}>
                          <Building2 size={18} />
                        </span>
                        <span>
                          <span className={styles.rowNome}>{empresa.nome}</span>
                          {empresa.link && (
                            <span className={styles.cardLinkMuted}>
                              {empresa.link}
                              <CopyIconButton value={empresa.link} label="Copiar link da empresa" />
                            </span>
                          )}
                        </span>
                      </div>
                    </td>
                    <td className={styles.colDominio}>
                      {empresa.dominioCustomizado ? (
                        <span className={fieldStyles.badge}>{empresa.dominioCustomizado}</span>
                      ) : (
                        <span className={fieldStyles.badgeMuted}>não configurado</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className={styles.rowActions}>
                        <CopyAllButton
                          iconOnly
                          label="Copiar dados de acesso"
                          nome={empresa.nome}
                          link={empresa.link}
                          adminUser={empresa.adminUser}
                          adminPassword={empresa.adminPassword}
                        />
                        <Link href={`/superadmin/empresas/${empresa.slug}`} className={styles.detalhesLink}>
                          <span className={styles.detalhesLabel}>Ver detalhes</span> <ChevronRight size={14} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
