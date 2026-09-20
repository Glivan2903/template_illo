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
// botão de voltar do navegador funcionando). Um item local pode trazer
// `expanded` (conteúdo React) — some abre embaixo do próprio botão, dentro
// do sidebar, em vez de abrir um painel separado ao lado do preview (ver
// AdminWorkspace/"Cores"). Por isso, ao contrário de um link, selecionar um
// item local NÃO fecha o drawer no mobile — é dentro dele que o conteúdo
// expandido aparece.
export default function Sidebar({
  brandLabel,
  brandSubtitle,
  brandLogo,
  sections,
  activeSection,
  onSelectSection,
  open,
  onClose,
  footer,
}) {
  return (
    <>
      {open && <div className={styles.backdrop} onClick={onClose} />}
      <aside className={`${styles.sidebar} ${open ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarHeader}>
          {brandLogo ? (
            <span className={styles.sidebarLogoWrap}>
              <img src={brandLogo} alt={brandLabel || ''} className={styles.sidebarLogo} />
            </span>
          ) : (
            <div>
              <p className={styles.sidebarBrand}>{brandLabel}</p>
              {brandSubtitle && <p className={styles.sidebarSubtitle}>{brandSubtitle}</p>}
            </div>
          )}
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Fechar menu">
            <X size={18} />
          </button>
        </div>

        <nav className={styles.nav}>
          {sections.map(({ key, label, icon: Icon, href, active, expanded }) => {
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
              <div key={key} className={styles.navGroup}>
                <button type="button" className={className} onClick={() => onSelectSection?.(key)}>
                  <Icon size={18} />
                  <span>{label}</span>
                </button>
                {isActive && expanded && <div className={styles.navExpanded}>{expanded}</div>}
              </div>
            );
          })}
        </nav>

        {footer && <div className={styles.sidebarFooter}>{footer}</div>}
      </aside>
    </>
  );
}
