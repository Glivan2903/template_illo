'use client';

import { useEffect, useRef } from 'react';
import { useSiteConfig } from './siteConfigContext';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function postToParent(message) {
  window.parent.postMessage(message, window.location.origin);
}

// Edição inline "ao vivo" no preview do /admin (estilo Elementor): qualquer
// elemento marcado com data-editable="caminho.do.campo" (ver Header,
// Footer, HeroSection, SpecialtiesSection etc.) vira editável ao clicar —
// texto vira contentEditable, imagem abre o seletor de arquivo — e manda o
// valor final pro painel (AdminWorkspace, via PreviewFrame) por postMessage
// quando o campo perde o foco. Só liga em __previewMode (dentro do iframe
// do /admin); numa visita normal ao site isso nunca ativa.
export default function EditableOverlay() {
  const { __previewMode } = useSiteConfig();
  const editingRef = useRef(null);
  const originalTextRef = useRef('');
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (!__previewMode) return;

    const styleEl = document.createElement('style');
    styleEl.textContent = `
      [data-editable] { cursor: pointer !important; }
      [data-editable]:hover { outline: 2px dashed #6d5efc; outline-offset: 2px; background-color: rgba(109, 94, 252, 0.06); }
      [data-editable][contenteditable="true"] {
        outline: 2px solid #6d5efc !important;
        outline-offset: 2px;
        background-color: rgba(109, 94, 252, 0.1);
        cursor: text !important;
      }
      [data-remove-especialidade],
      [data-add-especialidade] { cursor: pointer !important; }
    `;
    document.head.appendChild(styleEl);

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);
    let pendingImageField = null;

    fileInput.addEventListener('change', () => {
      const file = fileInput.files?.[0];
      fileInput.value = '';
      if (!file || !pendingImageField) return;
      if (file.size > MAX_IMAGE_BYTES) {
        window.alert('Imagem muito grande (máximo 5MB).');
        return;
      }
      const field = pendingImageField;
      pendingImageField = null;
      // Manda o File de verdade (postMessage clona File/Blob nativamente),
      // não um data URL em base64 — o painel sobe pra uma rota de upload
      // comum (multipart), não por Server Action, que tem limite de
      // tamanho de payload baixo por padrão.
      postToParent({ type: 'ADMIN_PREVIEW_EDIT', field, value: file, isImage: true });
    });

    function stopEditing(commit) {
      const el = editingRef.current;
      if (!el) return;
      el.removeAttribute('contenteditable');
      editingRef.current = null;
      if (commit) {
        const field = el.getAttribute('data-editable');
        const value = el.textContent.replace(/\n+$/, '').trim();
        if (value !== originalTextRef.current) {
          postToParent({ type: 'ADMIN_PREVIEW_EDIT', field, value });
        }
      }
    }

    function startEditing(target) {
      originalTextRef.current = target.textContent.replace(/\n+$/, '').trim();
      cancelledRef.current = false;
      target.setAttribute('contenteditable', 'true');
      editingRef.current = target;
      target.focus();
      const range = document.createRange();
      range.selectNodeContents(target);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }

    function handleClick(event) {
      const removeBtn = event.target.closest('[data-remove-especialidade]');
      if (removeBtn) {
        event.preventDefault();
        event.stopPropagation();
        postToParent({
          type: 'ADMIN_PREVIEW_ESPECIALIDADE_REMOVE',
          index: Number(removeBtn.getAttribute('data-remove-especialidade')),
        });
        return;
      }

      const addBtn = event.target.closest('[data-add-especialidade]');
      if (addBtn) {
        event.preventDefault();
        event.stopPropagation();
        postToParent({ type: 'ADMIN_PREVIEW_ESPECIALIDADE_ADD' });
        return;
      }

      const target = event.target.closest('[data-editable]');
      if (!target) return;

      // Clique dentro do próprio elemento já em edição: deixa posicionar o
      // cursor normalmente, sem reiniciar a edição.
      if (target === editingRef.current) return;

      event.preventDefault();
      event.stopPropagation();

      if (editingRef.current) stopEditing(true);

      if (target.tagName === 'IMG') {
        pendingImageField = target.getAttribute('data-editable');
        fileInput.click();
        return;
      }

      startEditing(target);
    }

    function handleFocusOut(event) {
      const target = event.target;
      if (!target || target !== editingRef.current) return;
      const commit = !cancelledRef.current;
      cancelledRef.current = false;
      stopEditing(commit);
    }

    function handleKeyDown(event) {
      const target = editingRef.current;
      if (!target) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        cancelledRef.current = true;
        target.textContent = originalTextRef.current;
        target.blur();
      } else if (event.key === 'Enter' && !event.shiftKey) {
        // Campos de uma linha só confirmam com Enter (a maioria dos
        // data-editable do site é assim — títulos, botões, telefones).
        event.preventDefault();
        target.blur();
      }
    }

    document.addEventListener('click', handleClick, true);
    document.addEventListener('focusout', handleFocusOut, true);
    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('focusout', handleFocusOut, true);
      document.removeEventListener('keydown', handleKeyDown, true);
      styleEl.remove();
      fileInput.remove();
    };
  }, [__previewMode]);

  return null;
}
