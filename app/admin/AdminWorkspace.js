'use client';

import { useMemo, useRef, useState } from 'react';
import { Palette, Users, Menu, Check, Loader2 } from 'lucide-react';
import ColorField from './ColorField';
import Sidebar from './Sidebar';
import LogoutButton from './LogoutButton';
import PreviewFrame from './PreviewFrame';
import ProfissionaisLinksManager from './ProfissionaisLinksManager';
import { mapContentToSiteConfig } from '../../lib/mapSiteConfig';
import styles from './workspace.module.css';
import fieldStyles from './admin.module.css';

const CORES_SAVE_DEBOUNCE_MS = 600;

export default function AdminWorkspace({ initialContent, featureFlags, logoutAction, actions }) {
  const { updateField, updateCores, addEspecialidade, removeEspecialidade, updateEspecialidadeField, toggleLinkProfissional } =
    actions;
  const [draft, setDraft] = useState(initialContent);
  const [activeSection, setActiveSection] = useState(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | saving | saved
  const savedTimerRef = useRef(null);
  const coresSaveTimerRef = useRef(null);

  const previewConfig = useMemo(() => mapContentToSiteConfig(draft, featureFlags), [draft, featureFlags]);

  function flashSaved() {
    setStatus('saved');
    clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setStatus('idle'), 1800);
  }

  function setLocalPath(path, value) {
    setDraft((prev) => {
      const next = structuredClone(prev);
      let obj = next;
      for (let i = 0; i < path.length - 1; i++) obj = obj[path[i]];
      obj[path[path.length - 1]] = value;
      return next;
    });
  }

  // Edição inline vinda do preview (ver lib/EditableOverlay.js): já chega
  // pronta pra salvar — sem formulário, sem botão de "Salvar" no meio do
  // caminho. `especialidades.N.campo` tem tratamento à parte porque é um
  // item dentro de uma lista, não um campo escalar.
  async function handleFieldEdit(field, value, isImage) {
    if (field.startsWith('especialidades.')) {
      const [, idxStr, key] = field.split('.');
      const idx = Number(idxStr);
      setDraft((prev) => {
        const next = structuredClone(prev);
        if (next.especialidades?.[idx]) next.especialidades[idx][key] = value;
        return next;
      });
      setStatus('saving');
      await updateEspecialidadeField(idx, key, value);
      flashSaved();
      return;
    }

    if (isImage) {
      // `value` é o File de verdade (ver lib/EditableOverlay.js) — sobe
      // por uma rota de API comum (multipart), não Server Action, que tem
      // limite de payload baixo por padrão e trava em imagens de 1MB+.
      const objectUrl = URL.createObjectURL(value);
      setLocalPath(field.split('.'), objectUrl); // preview instantâneo, antes do upload terminar
      setStatus('saving');
      const formData = new FormData();
      formData.append('file', value);
      formData.append('field', field);
      try {
        const res = await fetch('/api/admin/upload-image', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.ok) {
          setLocalPath(field.split('.'), data.url);
          flashSaved();
        } else {
          setStatus('idle');
          window.alert(data.erro || 'Não foi possível enviar a imagem.');
        }
      } catch {
        setStatus('idle');
        window.alert('Não foi possível enviar a imagem.');
      }
      return;
    }

    setLocalPath(field.split('.'), value);
    setStatus('saving');
    await updateField(field, value);
    flashSaved();
  }

  async function handleEspecialidadeAdd() {
    setStatus('saving');
    const especialidades = await addEspecialidade();
    setDraft((prev) => ({ ...prev, especialidades }));
    flashSaved();
  }

  async function handleEspecialidadeRemove(index) {
    setStatus('saving');
    const especialidades = await removeEspecialidade(index);
    setDraft((prev) => ({ ...prev, especialidades }));
    flashSaved();
  }

  // Cores não têm "texto" pra clicar no preview (afetam o site inteiro, não
  // um elemento só) — por isso é a única tela que ainda fica no sidebar.
  // Debounce pra não disparar uma Server Action a cada pixel arrastado no
  // seletor nativo de cor.
  function handleCorChange(nextBrand) {
    setLocalPath(['brand', 'colorPrimary'], nextBrand.colorPrimary);
    setLocalPath(['brand', 'colorSecondary'], nextBrand.colorSecondary);
    setStatus('saving');
    clearTimeout(coresSaveTimerRef.current);
    coresSaveTimerRef.current = setTimeout(async () => {
      await updateCores(nextBrand.colorPrimary, nextBrand.colorSecondary);
      flashSaved();
    }, CORES_SAVE_DEBOUNCE_MS);
  }

  const brand = draft.brand || {};

  // "Cores" expande embaixo do próprio botão, dentro do sidebar (ver
  // Sidebar.js), em vez de abrir um painel ao lado do preview. "Profissionais"
  // não cabe nesse formato (lista vinda do ClinVida, pode ser longa) — ao
  // ficar ativa, substitui o preview inteiro (ver corpo do componente).
  // Só aparece quando o /superadmin liga o módulo pra essa empresa (mesma
  // regra de app/medicos/page.js).
  const mostrarLinksProfissionais = featureFlags?.profissionais !== false && featureFlags?.agendamentoPorProfissional !== false;

  const sections = [
    {
      key: 'cores',
      label: 'Cores',
      icon: Palette,
      expanded: (
        <div className={fieldStyles.form}>
          <ColorField
            label="Cor primária"
            name="colorPrimary"
            value={brand.colorPrimary || '#2b7a3e'}
            onChange={(v) => handleCorChange({ colorPrimary: v, colorSecondary: brand.colorSecondary || '#8cc63f' })}
          />
          <ColorField
            label="Cor secundária"
            name="colorSecondary"
            value={brand.colorSecondary || '#8cc63f'}
            onChange={(v) => handleCorChange({ colorPrimary: brand.colorPrimary || '#2b7a3e', colorSecondary: v })}
          />
        </div>
      ),
    },
    ...(mostrarLinksProfissionais ? [{ key: 'profissionais', label: 'Profissionais', icon: Users }] : []),
  ];

  return (
    <div className={styles.shell}>
      <div className={styles.topBar}>
        <div className={styles.topBarLeft}>
          <button
            type="button"
            className={styles.menuBtn}
            onClick={() => setMobileNavOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu size={18} />
          </button>
          <h1 className={styles.topBarTitle}>Painel admin</h1>
        </div>
        <div className={styles.topBarActions}>
          {status !== 'idle' && (
            <span className={fieldStyles.saveStatus} data-state={status}>
              {status === 'saving' ? (
                <>
                  <Loader2 size={14} className={fieldStyles.spin} /> Salvando...
                </>
              ) : (
                <>
                  <Check size={14} /> Salvo
                </>
              )}
            </span>
          )}
        </div>
      </div>

      <div className={styles.body}>
        <Sidebar
          brandLogo={brand.logoUrl}
          brandLabel="Painel admin"
          sections={sections}
          activeSection={activeSection}
          onSelectSection={(key) => setActiveSection((prev) => (prev === key ? null : key))}
          open={mobileNavOpen}
          onClose={() => setMobileNavOpen(false)}
          footer={<LogoutButton action={logoutAction} className={styles.secondaryBtn} />}
        />

        {activeSection === 'profissionais' ? (
          <div className={styles.editorPaneFull}>
            <ProfissionaisLinksManager toggleAction={toggleLinkProfissional} />
          </div>
        ) : (
          <PreviewFrame
            config={previewConfig}
            onFieldEdit={handleFieldEdit}
            onEspecialidadeAdd={handleEspecialidadeAdd}
            onEspecialidadeRemove={handleEspecialidadeRemove}
          />
        )}
      </div>
    </div>
  );
}
