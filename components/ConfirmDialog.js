'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import styles from './ConfirmDialog.module.css';

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  danger = false,
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    if (!open) return;
    function aoTeclar(e) {
      if (e.key === 'Escape') onCancel?.();
    }
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div
        className={styles.dialog}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirmDialogTitle"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <h3 id="confirmDialogTitle">{title}</h3>
          <button type="button" className={styles.closeBtn} onClick={onCancel} aria-label="Fechar">
            <X size={18} />
          </button>
        </div>
        <div className={styles.body}>
          <p>{message}</p>
        </div>
        <div className={styles.footer}>
          <button type="button" className={styles.btnSecondary} onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={danger ? styles.btnDanger : 'btn-primary'}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
