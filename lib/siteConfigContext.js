'use client';

// Ponte entre os dados lidos no servidor (content.json + settings.json, via
// lib/config.js/lib/featureFlags.js) e os componentes client ('use client')
// que hoje precisam desses valores (Header, Footer, HeroSection etc.). Um
// único fetch acontece no app/layout.js (Server Component); daqui pra baixo
// é só contexto React, sem nenhuma leitura extra de storage.
//
// Também é a ponte do preview ao vivo do /admin: quando esta página está
// embutida num <iframe> pelo painel (ver app/admin/PreviewFrame.js), ela
// escuta por postMessage({ type: 'ADMIN_PREVIEW_UPDATE', payload }) da
// janela pai e passa a usar esses valores em vez dos vindos do servidor —
// sem afetar em nada uma visita normal ao site (nenhuma mensagem chega). A
// primeira mensagem recebida também liga "__previewMode" no contexto, que é
// o que lib/EditableOverlay.js usa para saber se deve ativar o
// "clica, seleciona e edita" — sem essa mensagem, o site se comporta 100%
// normal pra um visitante de verdade.
import { createContext, useContext, useEffect, useState } from 'react';

const SiteConfigContext = createContext(null);

export function SiteConfigProvider({ value, children }) {
  const [config, setConfig] = useState(value);
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    function handleMessage(event) {
      if (event.origin !== window.location.origin) return;
      const data = event.data;
      if (!data || data.type !== 'ADMIN_PREVIEW_UPDATE') return;
      setPreviewMode(true);
      setConfig((prev) => ({ ...prev, ...data.payload }));
    }
    window.addEventListener('message', handleMessage);
    // Handshake: se esta página está dentro de um iframe (o preview do
    // /admin), avisa a janela pai que já está pronta pra receber
    // ADMIN_PREVIEW_UPDATE — sem isso, o pai podia mandar a primeira
    // mensagem antes deste listener existir (postMessage não é bufferizado;
    // uma mensagem sem listener no momento do envio simplesmente se perde),
    // e o preview ficava sem refletir cor/imagem/texto até a próxima edição.
    if (window.self !== window.top) {
      window.parent.postMessage({ type: 'ADMIN_PREVIEW_READY' }, window.location.origin);
    }

    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <SiteConfigContext.Provider value={{ ...config, __previewMode: previewMode }}>
      {children}
    </SiteConfigContext.Provider>
  );
}

export function useSiteConfig() {
  const ctx = useContext(SiteConfigContext);
  if (!ctx) {
    throw new Error('useSiteConfig() precisa estar dentro de <SiteConfigProvider> (ver app/layout.js).');
  }
  return ctx;
}
