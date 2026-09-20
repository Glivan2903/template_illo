'use client';

import { useActionState, useEffect, useState, startTransition } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Building2, ExternalLink, KeyRound, Trash2 } from 'lucide-react';
import ConfirmDialog from '../../../../components/ConfirmDialog';
import SaveButton from '../../../admin/SaveButton';
import { CopyInline, CopyIconButton, CopyAllButton } from '../../CopyField';
import BrandSection from './BrandSection';
import fieldStyles from '../../../admin/admin.module.css';
import workspaceStyles from '../../../admin/workspace.module.css';
import styles from '../../superadmin.module.css';

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
  { key: 'chatFlutuante', label: 'Chat flutuante — Sofia (widget em todas as páginas)' },
];

export default function EmpresaDetail({ empresa, actions }) {
  const { updateEmpresaAction, updateModulosAction, regenerarSenhaAction, deleteEmpresaAction } = actions;
  const router = useRouter();

  const [erro, setErro] = useState(null);
  const [novaSenha, setNovaSenha] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [dirtyEdit, setDirtyEdit] = useState(false);
  const [dirtyModulos, setDirtyModulos] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const [, editFormAction, editPending] = useActionState(async (_prev, formData) => {
    const res = await updateEmpresaAction(formData);
    if (res.ok) {
      setErro(null);
      setDirtyEdit(false);
    } else {
      setErro(res.erro);
    }
    return null;
  }, null);

  const [, modulosFormAction, modulosPending] = useActionState(async (_prev, formData) => {
    await updateModulosAction(formData);
    setDirtyModulos(false);
    return null;
  }, null);

  const [, senhaFormAction, senhaPending] = useActionState(async (_prev, formData) => {
    const res = await regenerarSenhaAction(formData);
    if (res.ok) setNovaSenha(res.senha);
    return null;
  }, null);

  const [, deleteFormAction] = useActionState(async (_prev, formData) => {
    await deleteEmpresaAction(formData);
    router.push('/superadmin/empresas');
    return null;
  }, null);

  const flags = empresa.settings.featureFlags || {};

  return (
    <div>
      <Link href="/superadmin/empresas" className={styles.backLink}>
        <ArrowLeft size={15} /> Voltar pra empresas
      </Link>

      <div className={styles.stack}>
        <div className={fieldStyles.card}>
          <div className={fieldStyles.cardHead}>
            <div className={styles.cardHeadInfo}>
              <span className={fieldStyles.avatarIcon}>
                <Building2 size={20} />
              </span>
              <div>
                <span className={fieldStyles.eyebrow}>Empresa</span>
                <h1 className={fieldStyles.cardTitle}>{empresa.nome}</h1>
                {empresa.link && (
                  <span className={styles.cardLinkMuted}>
                    <a href={empresa.link} target="_blank" rel="noreferrer" className={styles.cardLink}>
                      {empresa.link} <ExternalLink size={12} />
                    </a>
                    <CopyIconButton value={empresa.link} label="Copiar link da empresa" />
                  </span>
                )}
              </div>
            </div>
            <button type="button" className={fieldStyles.iconBtnDanger} onClick={() => setConfirmOpen(true)} aria-label="Excluir empresa">
              <Trash2 size={16} />
            </button>
          </div>

          <p className={fieldStyles.cardHint}>Credenciais de acesso ao painel admin dessa empresa.</p>

          <div className={styles.credRow}>
            <div className={styles.copyField}>
              <span className={styles.copyFieldLabel}>Usuário admin</span>
              <CopyInline value={empresa.adminUser} />
            </div>
            <div className={styles.copyField}>
              <span className={styles.copyFieldLabel}>Senha admin</span>
              <CopyInline value={novaSenha || empresa.adminPassword} />
            </div>
          </div>

          <div className={fieldStyles.cardActions}>
            <form action={senhaFormAction}>
              <input type="hidden" name="slug" value={empresa.slug} />
              <button type="submit" className={fieldStyles.secondaryBtn} disabled={senhaPending}>
                <KeyRound size={13} /> Gerar nova senha
              </button>
            </form>
            <CopyAllButton
              nome={empresa.nome}
              link={empresa.link}
              adminUser={empresa.adminUser}
              adminPassword={novaSenha || empresa.adminPassword}
            />
          </div>

          {novaSenha && (
            <p className={fieldStyles.statusBox}>
              Senha trocada — repasse a nova senha pro cliente, ela some desta tela ao sair/atualizar a página.
            </p>
          )}
        </div>

        <BrandSection empresa={empresa} />

        <div className={fieldStyles.card}>
          <h2 className={fieldStyles.cardTitle}>Configurações</h2>
          <p className={fieldStyles.cardHint}>Nome, domínio próprio, API do sistema e chave da OpenAI dessa empresa.</p>
          <form action={editFormAction} className={fieldStyles.form} onChange={() => setDirtyEdit(true)}>
            <input type="hidden" name="slug" value={empresa.slug} />
            {erro && <p className={fieldStyles.warningBox}>{erro}</p>}
            <label className={fieldStyles.field}>
              <span>Nome da empresa</span>
              <input name="nome" defaultValue={empresa.nome} required />
            </label>
            <label className={fieldStyles.field}>
              <span>Domínio próprio (opcional)</span>
              <input name="dominioCustomizado" defaultValue={empresa.dominioCustomizado || ''} placeholder="clinicadocliente.com.br" />
            </label>
            <label className={fieldStyles.field}>
              <span>URL base da API do sistema (ClinVida)</span>
              <input name="apiBaseUrl" defaultValue={empresa.settings.unidades?.matriz?.apiBaseUrl || ''} required />
            </label>
            <label className={fieldStyles.field}>
              <span>Chave da API OpenAI (chat da Sofia)</span>
              <input name="openaiApiKey" defaultValue={empresa.settings.openai?.apiKey || ''} placeholder="sk-..." />
            </label>
            <label className={fieldStyles.field}>
              <span>Modelo OpenAI (opcional)</span>
              <input name="openaiModel" defaultValue={empresa.settings.openai?.model || ''} placeholder="gpt-4.1-mini" />
            </label>
            <SaveButton pending={editPending} dirty={dirtyEdit} label="Salvar empresa" />
          </form>
        </div>

        <div className={fieldStyles.card}>
          <h2 className={fieldStyles.cardTitle}>Módulos</h2>
          <p className={fieldStyles.cardHint}>Liga/desliga cada funcionalidade do site dessa empresa por completo.</p>
          <form action={modulosFormAction} className={fieldStyles.form} onChange={() => setDirtyModulos(true)}>
            <input type="hidden" name="slug" value={empresa.slug} />
            <div className={workspaceStyles.moduleGrid}>
              {FLAG_LABELS.map(({ key, label }) => (
                <label key={key} className={workspaceStyles.moduleCard}>
                  <span>{label}</span>
                  <span className={workspaceStyles.switch}>
                    <input type="checkbox" name={key} defaultChecked={flags[key] !== false} />
                    <span className={workspaceStyles.switchTrack} />
                  </span>
                </label>
              ))}
            </div>
            <SaveButton pending={modulosPending} dirty={dirtyModulos} label="Salvar módulos" />
          </form>
        </div>
      </div>

      {mounted &&
        createPortal(
          <ConfirmDialog
            open={confirmOpen}
            title="Excluir empresa"
            message={`Isso apaga o banco de dados e os uploads de "${empresa.nome}" permanentemente — não tem como desfazer.`}
            confirmLabel="Excluir"
            danger
            dialogClassName={fieldStyles.confirmDialog}
            confirmClassName={fieldStyles.confirmBtnDanger}
            onCancel={() => setConfirmOpen(false)}
            onConfirm={() => {
              setConfirmOpen(false);
              const fd = new FormData();
              fd.set('slug', empresa.slug);
              startTransition(() => deleteFormAction(fd));
            }}
          />,
          document.body
        )}
    </div>
  );
}
