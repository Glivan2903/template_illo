'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { Database, ToggleLeft, Plug, LogOut, ArrowLeftRight } from 'lucide-react';
import SaveButton from '../admin/SaveButton';
import styles from '../admin/workspace.module.css';
import fieldStyles from '../admin/admin.module.css';

const SECTIONS = [
  { key: 'status', label: 'Status do storage', icon: Database },
  { key: 'modulos', label: 'Módulos', icon: ToggleLeft },
  { key: 'integracoes', label: 'Unidades e integrações', icon: Plug },
];

const FLAG_LABELS = [
  { key: 'sobre', label: 'Seção "Sobre Nós" (Home)' },
  { key: 'especialidades', label: 'Seção "Especialidades" (Home)' },
  { key: 'cta', label: 'Seção de chamada final (Home)' },
  { key: 'profissionais', label: 'Diretório de profissionais (/medicos)' },
  { key: 'orcamento', label: 'Orçamento de exames (/orcamento)' },
  { key: 'agendamento', label: 'Agendamento online (/agendamento)' },
  { key: 'areaCliente', label: 'Área do Cliente (/area-cliente)' },
  { key: 'centralAgendamento', label: 'Central de Agendamento (/central-agendamento)' },
  { key: 'chat', label: 'Chat com IA — Sofia (/chat)' },
];

export default function SuperadminWorkspace({ settings, storageStatus, logoutAction, actions }) {
  const { updateModulos, updateIntegracoes } = actions;
  const [activeSection, setActiveSection] = useState('status');
  const [dirty, setDirty] = useState({ modulos: false, integracoes: false });

  const [, modulosFormAction, modulosPending] = useActionState(async (_prev, formData) => {
    await updateModulos(formData);
    setDirty((d) => ({ ...d, modulos: false }));
    return null;
  }, null);

  const [, integracoesFormAction, integracoesPending] = useActionState(async (_prev, formData) => {
    await updateIntegracoes(formData);
    setDirty((d) => ({ ...d, integracoes: false }));
    return null;
  }, null);

  const flags = settings.featureFlags || {};
  const unidades = settings.unidades || {};

  return (
    <div className={styles.shell}>
      <div className={styles.topBar}>
        <h1 className={styles.topBarTitle}>Painel superadmin — módulos e integrações</h1>
        <div className={styles.topBarActions}>
          <Link href="/admin" className={styles.topBarLink}>
            <ArrowLeftRight size={15} /> Ir para admin
          </Link>
          <form action={logoutAction}>
            <button type="submit" className={styles.secondaryBtn}>
              <LogOut size={15} /> Sair
            </button>
          </form>
        </div>
      </div>

      <div className={styles.body}>
        <nav className={styles.sidebarNav}>
          {SECTIONS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              className={`${styles.navItem} ${activeSection === key ? styles.navItemActive : ''}`}
              onClick={() => setActiveSection(key)}
            >
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className={styles.editorPaneFull}>
          {activeSection === 'status' && (
            <section className={fieldStyles.card}>
              <h2 className={fieldStyles.cardTitle}>Status do storage</h2>
              <p className={fieldStyles.cardHint}>Onde o painel está gravando as configurações (sem banco de dados).</p>
              <p className={fieldStyles.statusBox}>
                Driver ativo: <strong>{storageStatus.driver === 'blob' ? 'Vercel Blob' : 'arquivo local (VPS/disco)'}</strong>
                {storageStatus.onVercel ? ' · Rodando na Vercel' : ''}
              </p>
              {storageStatus.warning && <p className={fieldStyles.warningBox}>{storageStatus.warning}</p>}
            </section>
          )}

          {activeSection === 'modulos' && (
            <section className={fieldStyles.card}>
              <h2 className={fieldStyles.cardTitle}>Módulos</h2>
              <p className={fieldStyles.cardHint}>Liga/desliga cada funcionalidade do site por completo (página, link de navegação e rota de API correspondente).</p>
              <form action={modulosFormAction} className={fieldStyles.form}>
                <div className={styles.moduleGrid}>
                  {FLAG_LABELS.map(({ key, label }) => (
                    <label key={key} className={styles.moduleCard}>
                      <span>{label}</span>
                      <span className={styles.switch}>
                        <input
                          type="checkbox"
                          name={key}
                          defaultChecked={flags[key] !== false}
                          onChange={() => setDirty((d) => ({ ...d, modulos: true }))}
                        />
                        <span className={styles.switchTrack} />
                      </span>
                    </label>
                  ))}
                </div>
                <SaveButton pending={modulosPending} dirty={dirty.modulos} label="Salvar módulos" />
              </form>
            </section>
          )}

          {activeSection === 'integracoes' && (
            <section className={fieldStyles.card}>
              <h2 className={fieldStyles.cardTitle}>Unidades e integrações</h2>
              <p className={fieldStyles.cardHint}>URLs de API das unidades (ClinVida) — sem precisar editar o .env nem redeployar. A chave da OpenAI (IA da Sofia) é configurada no .env.</p>
              <form action={integracoesFormAction} className={fieldStyles.form} onChange={() => setDirty((d) => ({ ...d, integracoes: true }))}>
                <div className={fieldStyles.fieldset}>
                  <span className={fieldStyles.fieldsetTitle}>API ClinVida</span>
                  <label className={fieldStyles.field}>
                    <span>URL da API — Matriz</span>
                    <input name="matrizApiBaseUrl" defaultValue={unidades.matriz?.apiBaseUrl} placeholder="http://..." />
                  </label>
                  <label className={fieldStyles.field}>
                    <span>URL da API — Filial</span>
                    <input name="filialApiBaseUrl" defaultValue={unidades.filial?.apiBaseUrl} placeholder="Deixe em branco para manter desligada" />
                  </label>
                </div>

                <SaveButton pending={integracoesPending} dirty={dirty.integracoes} label="Salvar unidades e integrações" />
              </form>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
