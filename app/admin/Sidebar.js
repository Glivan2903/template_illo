'use client';

import Link from 'next/link';
import { X } from 'lucide-react';
import styles from './sidebar.module.css';

// Sidebar moderno e responsivo, compartilhado por /admin (AdminWorkspace) e
// /superadmin (SuperadminShell): coluna fixa no desktop, drawer off-canvas
// (com backdrop) em telas estreitas — ver breakpoint em sidebar.module.css.
// O estado de aberto/fechado no mobile é controlado pelo componente pai
// (que também renderiza o botão de menu na topbar).
//
// Cada item de `sections` pode ser um botão de estado local (key + onClick
// via onSelectSection, usado pelo /admin pra alternar a página de "Cores")
// ou um link de verdade (href, usado pelo /superadmin pra navegar entre
// Dashboard/Empresas/detalhe de uma empresa — rotas reais, com histórico e
// botão de voltar do navegador funcionando).
export default function Sidebar({
  brandLabel,
  brandSubtitle,
  sections,
  activeSection,
  onSelectSection,
  open,
  onClose,
  footer,
}) {
  function handleSelect(key) {
    onSelectSection?.(key);
    onClose?.();
  }

  return (
    <>
      {open && <div className={styles.backdrop} onClick={onClose} />}
      <aside className={`${styles.sidebar} ${open ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarHeader}>
          <div>
            <p className={styles.sidebarBrand}>{brandLabel}</p>
            {brandSubtitle && <p className={styles.sidebarSubtitle}>{brandSubtitle}</p>}
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Fechar menu">
            <X size={18} />
          </button>
        </div>

        <nav className={styles.nav}>
          {sections.map(({ key, label, icon: Icon, href, active }) => {
            const isActive = href ? Boolean(active) : activeSection === key;
            const className = `${styles.navItem} ${isActive ? styles.navItemActive : ''}`;
            if (href) {
              return (
                <Link key={key} href={href} className={className} onClick={onClose}>
                  <Icon size={18} />
                  <span>{label}</span>
                </Link>
              );
            }
            return (
              <button key={key} type="button" className={className} onClick={() => handleSelect(key)}>
                <Icon size={18} />
                <span>{label}</span>
              </button>
            );
          })}
        </nav>

        {footer && <div className={styles.sidebarFooter}>{footer}</div>}
      </aside>
    </>
  );
}
