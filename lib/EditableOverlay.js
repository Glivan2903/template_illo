'use client';

import { useEffect } from 'react';
import { useSiteConfig } from './siteConfigContext';

// Ativa o "clica, seleciona e edita" (estilo Elementor) só quando este
// documento está sendo mostrado dentro do preview do /admin (ver
// __previewMode em siteConfigContext.js) — numa visita normal ao site isso
// nunca liga, então não muda nada pro visitante de verdade.
//
// Qualquer elemento com data-editable="caminho.do.campo" (ver Header,
// Footer, HeroSection etc.) ganha um contorno ao passar o mouse; um clique
// nele avisa a janela pai (o painel /admin) qual campo foi clicado, em vez
// de seguir o link/botão normalmente.
export default function EditableOverlay() {
  const { __previewMode } = useSiteConfig();

  useEffect(() => {
    if (!__previewMode) return;

    const styleEl = document.createElement('style');
    styleEl.textContent = `
      [data-editable] { cursor: pointer !important; }
      [data-editable]:hover { outline: 2px dashed #6d5efc; outline-offset: 2px; background-color: rgba(109, 94, 252, 0.06); }
    `;
    document.head.appendChild(styleEl);

    function handleClick(event) {
      const target = event.target.closest('[data-editable]');
      if (!target) return;
      event.preventDefault();
      event.stopPropagation();
      window.parent.postMessage(
        { type: 'ADMIN_PREVIEW_SELECT', field: target.getAttribute('data-editable') },
        window.location.origin
      );
    }

    document.addEventListener('click', handleClick, true);

    return () => {
      document.removeEventListener('click', handleClick, true);
      styleEl.remove();
    };
  }, [__previewMode]);

  return null;
}
