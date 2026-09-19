import { login } from './actions';
import styles from './login.module.css';

export default async function AdminLoginPage({ searchParams }) {
  const params = await searchParams;
  const comErro = params?.erro === '1';

  return (
    <main className={styles.page}>
      <form action={login} className={styles.card}>
        <span className="eyebrow">Painel administrativo</span>
        <h1 className={styles.title}>Entrar</h1>
        <p className={styles.hint}>
          Use as credenciais de admin (conteúdo do site) ou superadmin (módulos e integrações).
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

        <button type="submit" className="btn-primary">Entrar</button>
      </form>
    </main>
  );
}
