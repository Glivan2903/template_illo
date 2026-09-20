'use client';

import { useActionState, useEffect } from 'react';
import { LogOut } from 'lucide-react';

// Mesmo motivo do app/admin/login/page.js: não usa redirect() no server —
// window.location.href garante uma navegação de verdade do navegador, que
// resolve o host certo mesmo saindo de um subdomínio de empresa.
export default function LogoutButton({ action, className }) {
  const [state, formAction, pending] = useActionState(async () => action(), null);

  useEffect(() => {
    if (state?.redirectTo) {
      window.location.href = state.redirectTo;
    }
  }, [state]);

  return (
    <form action={formAction}>
      <button type="submit" className={className} disabled={pending}>
        <LogOut size={15} /> Sair
      </button>
    </form>
  );
}
