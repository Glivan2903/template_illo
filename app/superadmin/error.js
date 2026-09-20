'use client';

import { useEffect } from 'react';
import fieldStyles from '../admin/admin.module.css';

// Ver app/admin/error.js — mesmo motivo: sem isso, um erro não tratado numa
// Server Action derruba a página inteira na tela genérica de erro do Next.
export default function SuperadminError({ error, unstable_retry }) {
  useEffect(() => {
    console.error('Erro no painel /superadmin:', error);
  }, [error]);

  return (
    <div style={{ maxWidth: 560, margin: '4rem auto', padding: '0 1rem' }}>
      <section className={fieldStyles.card}>
        <h2 className={fieldStyles.cardTitle}>Não foi possível concluir a ação</h2>
        <p className={fieldStyles.cardHint}>
          Algo deu errado ao salvar. Tente novamente — se persistir, confira se o banco
          local (data/app.db) está acessível e com permissão de escrita.
        </p>
        {error?.digest && <p className={fieldStyles.warningBox}>Código do erro: {error.digest}</p>}
        <button type="button" className={fieldStyles.secondaryBtn} onClick={() => unstable_retry()}>
          Tentar novamente
        </button>
      </section>
    </div>
  );
}
