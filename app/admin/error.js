'use client';

import { useEffect } from 'react';
import fieldStyles from './admin.module.css';

// Sem isso, um erro não tratado numa Server Action (ex.: falha ao gravar no
// storage) derruba a página inteira na tela genérica de erro do Next, sem
// nenhum contexto. Com este boundary, o erro fica só aqui, com uma forma de
// tentar de novo — e error.digest ajuda a achar o log certo do container.
export default function AdminError({ error, unstable_retry }) {
  useEffect(() => {
    console.error('Erro no painel /admin:', error);
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
