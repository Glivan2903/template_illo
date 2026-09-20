'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Building2, Menu } from 'lucide-react';
import Sidebar from '../admin/Sidebar';
import LogoutButton from '../admin/LogoutButton';
import styles from '../admin/workspace.module.css';

// Chrome fixo do /superadmin (sidebar + topbar), compartilhado por todas as
// rotas reais debaixo dele — Dashboard (/superadmin), lista de empresas
// (/superadmin/empresas) e detalhe de uma empresa
// (/superadmin/empresas/[slug]). Ao contrário do /admin (que é uma
// single-page app por natureza — edição inline no preview), aqui faz
// sentido ter navegação de verdade: histórico do navegador, botão de
// voltar, URL compartilhável.
export default function SuperadminShell({ logoutAction, children }) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const sections = [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/superadmin', active: pathname === '/superadmin' },
    {
      key: 'empresas',
      label: 'Empresas',
      icon: Building2,
      href: '/superadmin/empresas',
      active: pathname.startsWith('/superadmin/empresas'),
    },
  ];

  return (
    <div className={styles.shell}>
      <button
        type="button"
        className={styles.mobileMenuFab}
        onClick={() => setMobileNavOpen(true)}
        aria-label="Abrir menu"
      >
        <Menu size={18} />
      </button>

      <div className={styles.body}>
        <Sidebar
          brandLabel="Superadmin"
          brandSubtitle="Plataforma"
          sections={sections}
          open={mobileNavOpen}
          onClose={() => setMobileNavOpen(false)}
          footer={<LogoutButton action={logoutAction} className={styles.secondaryBtn} />}
        />

        <div className={styles.editorPaneFull}>{children}</div>
      </div>
    </div>
  );
}
