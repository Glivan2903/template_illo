'use client';

import { useActionState, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { IdCard, Palette, Type, Stethoscope, Eye, LogOut, ArrowLeftRight } from 'lucide-react';
import ColorField from './ColorField';
import SaveButton from './SaveButton';
import SpecialtiesEditor from './SpecialtiesEditor';
import PreviewFrame from './PreviewFrame';
import { mapContentToSiteConfig } from '../../lib/mapSiteConfig';
import styles from './workspace.module.css';
import fieldStyles from './admin.module.css';

const SECTIONS = [
  { key: 'identidade', label: 'Identidade e contato', icon: IdCard },
  { key: 'marca', label: 'Marca', icon: Palette },
  { key: 'textos', label: 'Textos institucionais', icon: Type },
  { key: 'especialidades', label: 'Especialidades', icon: Stethoscope },
];

const MAX_PREVIEW_IMAGE_BYTES = 5 * 1024 * 1024;

// Nomes de campo que não seguem o padrão "última parte do caminho" (ex.:
// "textos.agendamentoTitulo" -> name="agendamentoTitulo") — usados pelo
// clica-e-edita do canvas (ver onSelectField) para achar o input certo.
const FIELD_NAME_OVERRIDES = {
  'unidades.matriz.telefoneDisplay': 'matrizTelefone',
  'unidades.matriz.whatsappUrl': 'matrizWhatsapp',
  'unidades.matriz.endereco': 'matrizEndereco',
  'unidades.filial.telefoneDisplay': 'filialTelefone',
  'unidades.filial.whatsappUrl': 'filialWhatsapp',
  'unidades.filial.endereco': 'filialEndereco',
  'brand.logoUrl': 'logoFile',
  'heroFotoUrl': 'heroFile',
};

function sectionForField(field) {
  if (field === 'especialidades') return 'especialidades';
  if (field.startsWith('brand.') || field === 'heroFotoUrl') return 'marca';
  if (field.startsWith('textos.')) return 'textos';
  return 'identidade';
}

function inputNameForField(field) {
  if (FIELD_NAME_OVERRIDES[field]) return FIELD_NAME_OVERRIDES[field];
  const parts = field.split('.');
  return parts[parts.length - 1];
}

export default function AdminWorkspace({ initialContent, featureFlags, isSuperadmin, logoutAction, actions }) {
  const { updateIdentidade, updateMarca, updateTextos, updateEspecialidades } = actions;
  const [draft, setDraft] = useState(initialContent);
  const [activeSection, setActiveSection] = useState('identidade');
  const [previewOpen, setPreviewOpen] = useState(false);
  const editorPaneRef = useRef(null);

  // Cada seção só pode salvar de novo depois de uma alteração nova — ver
  // SaveButton.js. Some junto com useActionState (pending) pra cobrir tanto
  // "nada mudou" quanto "já está salvando".
  const [dirty, setDirty] = useState({ identidade: false, marca: false, textos: false, especialidades: false });

  const previewConfig = useMemo(
    () => mapContentToSiteConfig(draft, featureFlags),
    [draft, featureFlags]
  );

  function set(path, value) {
    setDraft((prev) => {
      const next = structuredClone(prev);
      let obj = next;
      for (let i = 0; i < path.length - 1; i++) obj = obj[path[i]];
      obj[path[path.length - 1]] = value;
      return next;
    });
    const section = sectionForField(path.join('.'));
    setDirty((d) => (d[section] ? d : { ...d, [section]: true }));
  }

  const [, identidadeFormAction, identidadePending] = useActionState(async (_prev, formData) => {
    await updateIdentidade(formData);
    setDirty((d) => ({ ...d, identidade: false }));
    return null;
  }, null);

  const [, marcaFormAction, marcaPending] = useActionState(async (_prev, formData) => {
    await updateMarca(formData);
    setDirty((d) => ({ ...d, marca: false }));
    return null;
  }, null);

  const [, textosFormAction, textosPending] = useActionState(async (_prev, formData) => {
    await updateTextos(formData);
    setDirty((d) => ({ ...d, textos: false }));
    return null;
  }, null);

  const [, especialidadesFormAction, especialidadesPending] = useActionState(async (_prev, formData) => {
    await updateEspecialidades(formData);
    setDirty((d) => ({ ...d, especialidades: false }));
    return null;
  }, null);

  function previewFileAsDataUrl(file, path) {
    if (!file || file.size > MAX_PREVIEW_IMAGE_BYTES) return;
    const reader = new FileReader();
    reader.onload = () => set(path, reader.result);
    reader.readAsDataURL(file);
  }

  // Clique num elemento marcado (data-editable) dentro do canvas: muda pra
  // seção certa e foca/realça o campo correspondente — "clica, seleciona e
  // edita", ao estilo Elementor.
  function handleSelectField(field) {
    setActiveSection(sectionForField(field));
    setPreviewOpen(false); // no mobile, sai do overlay de preview pra mostrar o formulário
    const inputName = inputNameForField(field);
    requestAnimationFrame(() => {
      setTimeout(() => {
        const el = editorPaneRef.current?.querySelector(`[name="${inputName}"]`);
        if (!el) return;
        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        el.focus({ preventScroll: true });
        el.classList.add(fieldStyles.fieldHighlight);
        setTimeout(() => el.classList.remove(fieldStyles.fieldHighlight), 1400);
      }, 60);
    });
  }

  const matriz = draft.unidades?.matriz || {};
  const filial = draft.unidades?.filial || {};
  const textos = draft.textos || {};

  return (
    <div className={styles.shell}>
      <div className={styles.topBar}>
        <h1 className={styles.topBarTitle}>Painel admin — conteúdo do site</h1>
        <div className={styles.topBarActions}>
          <button type="button" className={styles.previewToggleBtn} onClick={() => setPreviewOpen(true)}>
            <Eye size={16} /> Visualizar
          </button>
          {isSuperadmin && (
            <Link href="/superadmin" className={styles.topBarLink}>
              <ArrowLeftRight size={15} /> Ir para superadmin
            </Link>
          )}
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

        <div className={styles.editorPane} ref={editorPaneRef}>
          {activeSection === 'identidade' && (
            <section className={fieldStyles.card}>
              <h2 className={fieldStyles.cardTitle}>Identidade e contato</h2>
              <p className={fieldStyles.cardHint}>Nome da clínica, telefones, WhatsApp, endereços, horário e Instagram.</p>
              <form action={identidadeFormAction} className={fieldStyles.form}>
                <label className={fieldStyles.field}>
                  <span>Nome da clínica</span>
                  <input
                    name="clinicNome"
                    value={draft.clinicNome || ''}
                    onChange={(e) => set(['clinicNome'], e.target.value)}
                    required
                  />
                </label>

                <div className={fieldStyles.fieldset}>
                  <span className={fieldStyles.fieldsetTitle}>Unidade Matriz</span>
                  <div className={fieldStyles.grid2}>
                    <label className={fieldStyles.field}>
                      <span>Telefone exibido</span>
                      <input
                        name="matrizTelefone"
                        value={matriz.telefoneDisplay || ''}
                        onChange={(e) => set(['unidades', 'matriz', 'telefoneDisplay'], e.target.value)}
                      />
                    </label>
                    <label className={fieldStyles.field}>
                      <span>Link do WhatsApp</span>
                      <input
                        name="matrizWhatsapp"
                        value={matriz.whatsappUrl || ''}
                        onChange={(e) => set(['unidades', 'matriz', 'whatsappUrl'], e.target.value)}
                      />
                    </label>
                  </div>
                  <label className={fieldStyles.field}>
                    <span>Endereço</span>
                    <input
                      name="matrizEndereco"
                      value={matriz.endereco || ''}
                      onChange={(e) => set(['unidades', 'matriz', 'endereco'], e.target.value)}
                    />
                  </label>
                </div>

                <div className={fieldStyles.fieldset}>
                  <span className={fieldStyles.fieldsetTitle}>Unidade Filial</span>
                  <div className={fieldStyles.grid2}>
                    <label className={fieldStyles.field}>
                      <span>Telefone exibido</span>
                      <input
                        name="filialTelefone"
                        value={filial.telefoneDisplay || ''}
                        onChange={(e) => set(['unidades', 'filial', 'telefoneDisplay'], e.target.value)}
                      />
                    </label>
                    <label className={fieldStyles.field}>
                      <span>Link do WhatsApp</span>
                      <input
                        name="filialWhatsapp"
                        value={filial.whatsappUrl || ''}
                        onChange={(e) => set(['unidades', 'filial', 'whatsappUrl'], e.target.value)}
                      />
                    </label>
                  </div>
                  <label className={fieldStyles.field}>
                    <span>Endereço</span>
                    <input
                      name="filialEndereco"
                      value={filial.endereco || ''}
                      onChange={(e) => set(['unidades', 'filial', 'endereco'], e.target.value)}
                    />
                  </label>
                </div>

                <label className={fieldStyles.field}>
                  <span>Horário de atendimento</span>
                  <input
                    name="horarioAtendimento"
                    value={draft.horarioAtendimento || ''}
                    onChange={(e) => set(['horarioAtendimento'], e.target.value)}
                  />
                </label>

                <div className={fieldStyles.grid2}>
                  <label className={fieldStyles.field}>
                    <span>Instagram (@handle exibido)</span>
                    <input
                      name="instagramHandle"
                      value={draft.instagramHandle || ''}
                      onChange={(e) => set(['instagramHandle'], e.target.value)}
                    />
                  </label>
                  <label className={fieldStyles.field}>
                    <span>Instagram (URL do perfil)</span>
                    <input
                      name="instagramUrl"
                      value={draft.instagramUrl || ''}
                      onChange={(e) => set(['instagramUrl'], e.target.value)}
                    />
                  </label>
                </div>

                <SaveButton pending={identidadePending} dirty={dirty.identidade} label="Salvar identidade e contato" />
              </form>
            </section>
          )}

          {activeSection === 'marca' && (
            <section className={fieldStyles.card}>
              <h2 className={fieldStyles.cardTitle}>Marca</h2>
              <p className={fieldStyles.cardHint}>Cores do site, logotipo e foto da fachada (Hero da Home). O preview reflete a imagem escolhida antes mesmo de salvar.</p>
              <form action={marcaFormAction} className={fieldStyles.form}>
                <div className={fieldStyles.grid2}>
                  <ColorField
                    label="Cor primária"
                    name="colorPrimary"
                    value={draft.brand?.colorPrimary || '#2b7a3e'}
                    onChange={(v) => set(['brand', 'colorPrimary'], v)}
                  />
                  <ColorField
                    label="Cor secundária"
                    name="colorSecondary"
                    value={draft.brand?.colorSecondary || '#8cc63f'}
                    onChange={(v) => set(['brand', 'colorSecondary'], v)}
                  />
                </div>

                <label className={fieldStyles.field}>
                  <span>Logotipo (arquivo novo — deixe em branco para manter o atual)</span>
                  <input
                    type="file"
                    name="logoFile"
                    accept="image/*"
                    onChange={(e) => previewFileAsDataUrl(e.target.files?.[0], ['brand', 'logoUrl'])}
                  />
                  <div className={fieldStyles.currentImage}>
                    Atual: <img src={draft.brand?.logoUrl} alt="Logo atual" />
                  </div>
                </label>

                <label className={fieldStyles.field}>
                  <span>Foto da fachada / Hero (arquivo novo — deixe em branco para manter o atual)</span>
                  <input
                    type="file"
                    name="heroFile"
                    accept="image/*"
                    onChange={(e) => previewFileAsDataUrl(e.target.files?.[0], ['heroFotoUrl'])}
                  />
                  <div className={fieldStyles.currentImage}>
                    Atual: <img src={draft.heroFotoUrl} alt="Foto atual da fachada" />
                  </div>
                </label>

                <SaveButton pending={marcaPending} dirty={dirty.marca} label="Salvar marca" />
              </form>
            </section>
          )}

          {activeSection === 'textos' && (
            <section className={fieldStyles.card}>
              <h2 className={fieldStyles.cardTitle}>Textos institucionais</h2>
              <p className={fieldStyles.cardHint}>Textos que aparecem na Home (Hero, Sobre, CTA) e no rodapé.</p>
              <form action={textosFormAction} className={fieldStyles.form}>
                <div className={fieldStyles.fieldset}>
                  <span className={fieldStyles.fieldsetTitle}>Título do Hero (slogan, 2 linhas)</span>
                  <label className={fieldStyles.field}>
                    <span>Linha 1</span>
                    <input
                      name="heroTituloLinha1"
                      value={textos.heroTituloLinha1 || ''}
                      onChange={(e) => set(['textos', 'heroTituloLinha1'], e.target.value)}
                    />
                  </label>
                  <label className={fieldStyles.field}>
                    <span>Linha 2</span>
                    <input
                      name="heroTituloLinha2"
                      value={textos.heroTituloLinha2 || ''}
                      onChange={(e) => set(['textos', 'heroTituloLinha2'], e.target.value)}
                    />
                  </label>
                </div>
                <label className={fieldStyles.field}>
                  <span>Subtítulo do Hero (abaixo do título principal)</span>
                  <textarea
                    name="heroSubtitle"
                    value={textos.heroSubtitle || ''}
                    onChange={(e) => set(['textos', 'heroSubtitle'], e.target.value)}
                  />
                </label>
                <label className={fieldStyles.field}>
                  <span>Título da seção “Sobre”</span>
                  <input
                    name="sobreTitulo"
                    value={textos.sobreTitulo || ''}
                    onChange={(e) => set(['textos', 'sobreTitulo'], e.target.value)}
                  />
                </label>
                <label className={fieldStyles.field}>
                  <span>Descrição da seção “Sobre”</span>
                  <textarea
                    name="sobreDescricao"
                    value={textos.sobreDescricao || ''}
                    onChange={(e) => set(['textos', 'sobreDescricao'], e.target.value)}
                  />
                </label>
                <label className={fieldStyles.field}>
                  <span>Descrição no rodapé (abaixo do logo)</span>
                  <textarea
                    name="footerDescricao"
                    value={textos.footerDescricao || ''}
                    onChange={(e) => set(['textos', 'footerDescricao'], e.target.value)}
                  />
                </label>

                <div className={fieldStyles.fieldset}>
                  <span className={fieldStyles.fieldsetTitle}>Chamada final (com agendamento online ativado)</span>
                  <label className={fieldStyles.field}>
                    <span>Título</span>
                    <input
                      name="ctaComAgendamentoTitulo"
                      value={textos.ctaComAgendamentoTitulo || ''}
                      onChange={(e) => set(['textos', 'ctaComAgendamentoTitulo'], e.target.value)}
                    />
                  </label>
                  <label className={fieldStyles.field}>
                    <span>Texto</span>
                    <textarea
                      name="ctaComAgendamentoTexto"
                      value={textos.ctaComAgendamentoTexto || ''}
                      onChange={(e) => set(['textos', 'ctaComAgendamentoTexto'], e.target.value)}
                    />
                  </label>
                </div>

                <div className={fieldStyles.fieldset}>
                  <span className={fieldStyles.fieldsetTitle}>Chamada final (sem agendamento online — módulo desligado)</span>
                  <label className={fieldStyles.field}>
                    <span>Título</span>
                    <input
                      name="ctaSemAgendamentoTitulo"
                      value={textos.ctaSemAgendamentoTitulo || ''}
                      onChange={(e) => set(['textos', 'ctaSemAgendamentoTitulo'], e.target.value)}
                    />
                  </label>
                  <label className={fieldStyles.field}>
                    <span>Texto</span>
                    <textarea
                      name="ctaSemAgendamentoTexto"
                      value={textos.ctaSemAgendamentoTexto || ''}
                      onChange={(e) => set(['textos', 'ctaSemAgendamentoTexto'], e.target.value)}
                    />
                  </label>
                </div>

                <div className={fieldStyles.fieldset}>
                  <span className={fieldStyles.fieldsetTitle}>Navegação e botões (todas as páginas)</span>
                  <label className={fieldStyles.field}>
                    <span>Link “Sobre Nós”</span>
                    <input name="navSobre" value={textos.navSobre || ''} onChange={(e) => set(['textos', 'navSobre'], e.target.value)} />
                  </label>
                  <label className={fieldStyles.field}>
                    <span>Link “Especialidades”</span>
                    <input name="navEspecialidades" value={textos.navEspecialidades || ''} onChange={(e) => set(['textos', 'navEspecialidades'], e.target.value)} />
                  </label>
                  <label className={fieldStyles.field}>
                    <span>Link “Profissionais”</span>
                    <input name="navProfissionais" value={textos.navProfissionais || ''} onChange={(e) => set(['textos', 'navProfissionais'], e.target.value)} />
                  </label>
                  <label className={fieldStyles.field}>
                    <span>Link “Orçamento”</span>
                    <input name="navOrcamento" value={textos.navOrcamento || ''} onChange={(e) => set(['textos', 'navOrcamento'], e.target.value)} />
                  </label>
                  <label className={fieldStyles.field}>
                    <span>Link do chat da Sofia</span>
                    <input name="navChat" value={textos.navChat || ''} onChange={(e) => set(['textos', 'navChat'], e.target.value)} />
                  </label>
                  <label className={fieldStyles.field}>
                    <span>Link “Contato”</span>
                    <input name="navContato" value={textos.navContato || ''} onChange={(e) => set(['textos', 'navContato'], e.target.value)} />
                  </label>
                  <label className={fieldStyles.field}>
                    <span>Link “Área do Cliente”</span>
                    <input name="navAreaCliente" value={textos.navAreaCliente || ''} onChange={(e) => set(['textos', 'navAreaCliente'], e.target.value)} />
                  </label>
                  <label className={fieldStyles.field}>
                    <span>Botão “Agendar consulta”</span>
                    <input name="botaoAgendarConsulta" value={textos.botaoAgendarConsulta || ''} onChange={(e) => set(['textos', 'botaoAgendarConsulta'], e.target.value)} />
                  </label>
                  <label className={fieldStyles.field}>
                    <span>Botão “Falar no WhatsApp”</span>
                    <input name="botaoFalarWhatsapp" value={textos.botaoFalarWhatsapp || ''} onChange={(e) => set(['textos', 'botaoFalarWhatsapp'], e.target.value)} />
                  </label>
                  <label className={fieldStyles.field}>
                    <span>Link “Fale pelo WhatsApp” (rodapé)</span>
                    <input name="botaoFalarWhatsappRodape" value={textos.botaoFalarWhatsappRodape || ''} onChange={(e) => set(['textos', 'botaoFalarWhatsappRodape'], e.target.value)} />
                  </label>
                </div>

                <div className={fieldStyles.fieldset}>
                  <span className={fieldStyles.fieldsetTitle}>Página /agendamento</span>
                  <label className={fieldStyles.field}>
                    <span>Selo acima do título</span>
                    <input name="agendamentoEyebrow" value={textos.agendamentoEyebrow || ''} onChange={(e) => set(['textos', 'agendamentoEyebrow'], e.target.value)} />
                  </label>
                  <label className={fieldStyles.field}>
                    <span>Título</span>
                    <input name="agendamentoTitulo" value={textos.agendamentoTitulo || ''} onChange={(e) => set(['textos', 'agendamentoTitulo'], e.target.value)} />
                  </label>
                </div>

                <div className={fieldStyles.fieldset}>
                  <span className={fieldStyles.fieldsetTitle}>Página /orcamento</span>
                  <label className={fieldStyles.field}>
                    <span>Título</span>
                    <input name="orcamentoTitulo" value={textos.orcamentoTitulo || ''} onChange={(e) => set(['textos', 'orcamentoTitulo'], e.target.value)} />
                  </label>
                  <label className={fieldStyles.field}>
                    <span>Texto de introdução</span>
                    <textarea name="orcamentoIntro" value={textos.orcamentoIntro || ''} onChange={(e) => set(['textos', 'orcamentoIntro'], e.target.value)} />
                  </label>
                </div>

                <div className={fieldStyles.fieldset}>
                  <span className={fieldStyles.fieldsetTitle}>Página /medicos</span>
                  <label className={fieldStyles.field}>
                    <span>Selo acima do título</span>
                    <input name="medicosEyebrow" value={textos.medicosEyebrow || ''} onChange={(e) => set(['textos', 'medicosEyebrow'], e.target.value)} />
                  </label>
                  <label className={fieldStyles.field}>
                    <span>Título</span>
                    <input name="medicosTitulo" value={textos.medicosTitulo || ''} onChange={(e) => set(['textos', 'medicosTitulo'], e.target.value)} />
                  </label>
                </div>

                <div className={fieldStyles.fieldset}>
                  <span className={fieldStyles.fieldsetTitle}>Página /central-agendamento</span>
                  <label className={fieldStyles.field}>
                    <span>Título</span>
                    <input name="centralTitulo" value={textos.centralTitulo || ''} onChange={(e) => set(['textos', 'centralTitulo'], e.target.value)} />
                  </label>
                  <label className={fieldStyles.field}>
                    <span>Aba “Novo Agendamento”</span>
                    <input name="centralTabNovo" value={textos.centralTabNovo || ''} onChange={(e) => set(['textos', 'centralTabNovo'], e.target.value)} />
                  </label>
                  <label className={fieldStyles.field}>
                    <span>Aba “Minhas Consultas”</span>
                    <input name="centralTabConsultas" value={textos.centralTabConsultas || ''} onChange={(e) => set(['textos', 'centralTabConsultas'], e.target.value)} />
                  </label>
                </div>

                <div className={fieldStyles.fieldset}>
                  <span className={fieldStyles.fieldsetTitle}>Página /area-cliente</span>
                  <label className={fieldStyles.field}>
                    <span>Título</span>
                    <input name="areaClienteTitulo" value={textos.areaClienteTitulo || ''} onChange={(e) => set(['textos', 'areaClienteTitulo'], e.target.value)} />
                  </label>
                  <label className={fieldStyles.field}>
                    <span>Subtítulo</span>
                    <textarea name="areaClienteSubtitulo" value={textos.areaClienteSubtitulo || ''} onChange={(e) => set(['textos', 'areaClienteSubtitulo'], e.target.value)} />
                  </label>
                </div>

                <SaveButton pending={textosPending} dirty={dirty.textos} label="Salvar textos" />
              </form>
            </section>
          )}

          {activeSection === 'especialidades' && (
            <section className={fieldStyles.card}>
              <h2 className={fieldStyles.cardTitle}>Especialidades</h2>
              <p className={fieldStyles.cardHint}>Lista exibida na Home, seção "O que cuidamos aqui".</p>
              <SpecialtiesEditor
                rows={draft.especialidades || []}
                onChange={(rows) => set(['especialidades'], rows)}
                formAction={especialidadesFormAction}
                pending={especialidadesPending}
                dirty={dirty.especialidades}
              />
            </section>
          )}
        </div>

        <PreviewFrame
          config={previewConfig}
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
          onSelectField={handleSelectField}
        />
      </div>
    </div>
  );
}
