'use client';

import { useEffect, useRef, useState } from 'react';
import { Monitor, Smartphone } from 'lucide-react';
import styles from './workspace.module.css';

const PAGES = [
  { path: '/', label: 'Home' },
  { path: '/agendamento', label: 'Agendamento' },
  { path: '/orcamento', label: 'Orçamento' },
  { path: '/medicos', label: 'Médicos' },
  { path: '/central-agendamento', label: 'Central de Agendamento' },
  { path: '/area-cliente', label: 'Área do Cliente' },
];

// Canvas de preview ao vivo, ao estilo Elementor: um <iframe> carregando o
// site real (mesma origem) e recebendo as edições ainda não salvas via
// postMessage — o site escuta isso em lib/siteConfigContext.js. Fidelidade
// total (é a mesma renderização de produção, incluindo as animações GSAP,
// que dependem de scroll/observer e por isso não dariam pra reproduzir de
// forma confiável fora de um documento próprio).
//
// Também recebe de volta ADMIN_PREVIEW_SELECT quando o visitante clica num
// elemento marcado com data-editable dentro do iframe (ver
// lib/EditableOverlay.js) — repassa pro pai via onSelectField, que decide
// pra qual seção/campo pular.
export default function PreviewFrame({
  config,
  onSelectField,
  onFieldEdit,
  onEspecialidadeAdd,
  onEspecialidadeRemove,
}) {
  const iframeRef = useRef(null);
  const configRef = useRef(config);
  const [ready, setReady] = useState(false);
  const [device, setDevice] = useState('desktop');
  const [activePath, setActivePath] = useState('/');

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  function sendUpdate() {
    iframeRef.current?.contentWindow?.postMessage(
      { type: 'ADMIN_PREVIEW_UPDATE', payload: configRef.current },
      window.location.origin
    );
  }

  // Manda a config sempre que ela muda (edição em andamento) — funciona na
  // maioria das vezes, mas há uma corrida possível logo depois de um
  // onLoad: o listener de mensagens dentro do iframe pode ainda não ter
  // montado. Por isso o handshake abaixo (ADMIN_PREVIEW_READY) é quem
  // garante a entrega da primeira config, e este efeito cobre o resto.
  useEffect(() => {
    if (!ready) return;
    sendUpdate();
  }, [config, ready]);

  useEffect(() => {
    function handleMessage(event) {
      if (event.origin !== window.location.origin) return;
      const data = event.data;
      if (data?.type === 'ADMIN_PREVIEW_READY') {
        sendUpdate();
        return;
      }
      if (data?.type === 'ADMIN_PREVIEW_SELECT') {
        onSelectField?.(data.field);
        return;
      }
      if (data?.type === 'ADMIN_PREVIEW_EDIT') {
        onFieldEdit?.(data.field, data.value, Boolean(data.isImage));
        return;
      }
      if (data?.type === 'ADMIN_PREVIEW_ESPECIALIDADE_ADD') {
        onEspecialidadeAdd?.();
        return;
      }
      if (data?.type === 'ADMIN_PREVIEW_ESPECIALIDADE_REMOVE') {
        onEspecialidadeRemove?.(data.index);
      }
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onSelectField, onFieldEdit, onEspecialidadeAdd, onEspecialidadeRemove]);

  return (
    <section className={styles.previewPane}>
      <div className={styles.previewToolbar}>
        <select
          className={styles.pageSelect}
          value={activePath}
          onChange={(e) => setActivePath(e.target.value)}
          aria-label="Página exibida no preview"
        >
          {PAGES.map((p) => (
            <option key={p.path} value={p.path}>{p.label}</option>
          ))}
        </select>
        <div className={styles.previewToolbarActions}>
          <button
            type="button"
            className={`${styles.deviceBtn} ${device === 'desktop' ? styles.deviceBtnActive : ''}`}
            onClick={() => setDevice('desktop')}
            aria-label="Visualizar em largura desktop"
            title="Desktop"
          >
            <Monitor size={16} />
          </button>
          <button
            type="button"
            className={`${styles.deviceBtn} ${device === 'mobile' ? styles.deviceBtnActive : ''}`}
            onClick={() => setDevice('mobile')}
            aria-label="Visualizar em largura mobile"
            title="Mobile"
          >
            <Smartphone size={16} />
          </button>
        </div>
      </div>
      <p className={styles.previewHint}>Clique em um texto, botão ou imagem do preview para editá-lo.</p>
      <div className={styles.previewFrameWrap}>
        <iframe
          ref={iframeRef}
          src={activePath}
          onLoad={() => setReady(true)}
          title="Preview do site"
          className={`${styles.previewIframe} ${device === 'mobile' ? styles.previewIframeMobile : ''}`}
        />
      </div>
    </section>
  );
}
