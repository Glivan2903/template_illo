'use client';

import { useActionState, useEffect } from 'react';
import { login } from './actions';
import styles from './login.module.css';

export default function LoginForm({ tenantNome }) {
  const [state, formAction, pending] = useActionState(async (_prev, formData) => login(formData), null);

  // Navegação de verdade (não o router do Next): garante que o navegador
  // resolve o host certo mesmo trocando de subdomínio (empresa -> raiz ou
  // vice-versa) — ver comentário em actions.js.
  useEffect(() => {
    if (state?.ok && state.redirectTo) {
      window.location.href = state.redirectTo;
    }
  }, [state]);

  const comErro = state && !state.ok;
  const redirecionando = state?.ok;

  return (
    <main className={styles.page}>
      <form action={formAction} className={styles.card}>
        <span className={styles.eyebrow}>{tenantNome ? tenantNome : 'Plataforma'}</span>
        <h1 className={styles.title}>Entrar</h1>
        <p className={styles.hint}>
          {tenantNome ? (
            <>
              Você está entrando no painel admin de <strong>{tenantNome}</strong>. Use o usuário e a senha gerados
              para essa empresa no <code>/superadmin</code>.
            </>
          ) : (
            <>
              Você está no domínio da plataforma — aqui só funciona o login de <strong>superadmin</strong>. Pra
              entrar como admin de uma empresa, acesse o link dela (subdomínio ou domínio próprio).
            </>
          )}
        </p>

        {comErro && <p className={styles.error}>Usuário ou senha inválidos.</p>}

        <label className={styles.field}>
          <span>Usuário</span>
          <input type="text" name="usuario" autoComplete="username" required autoFocus />
        </label>

        <label className={styles.field}>
          <span>Senha</span>
          <input type="password" name="senha" autoComplete="current-password" required />
        </label>

        <button type="submit" className={styles.submitBtn} disabled={pending || redirecionando}>
          {pending || redirecionando ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </main>
  );
}
