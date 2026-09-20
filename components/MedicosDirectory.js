'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { Search, ChevronRight } from 'lucide-react';
import styles from './MedicosDirectory.module.css';
import { gsap, ScrollTrigger, useGSAP } from '../lib/gsap';
import { UNIDADES_INFO } from '../lib/unidadesInfo';

function nomeUnidade(unidadeId) {
  return UNIDADES_INFO.find((u) => u.id === unidadeId)?.nome || unidadeId;
}

// Monta a URL de /agendamento já filtrada pro profissional (pula direto pro
// passo 3 do wizard — ver initialCentro/initialProfissional em
// BookingWizard e a leitura desses parâmetros em app/agendamento/page.js).
// `centroEscolhido` (especialidade/centro) já vem resolvido de
// app/medicos/page.js — o admin escolhe qual usar, pelo /admin, quando o
// profissional atende em mais de uma (ver ProfissionaisLinksManager).
function linkAgendamentoDoProfissional(prof) {
  const centro = prof.centroEscolhido;
  const params = new URLSearchParams({
    unidade: prof.unidade,
    cen: centro.cenCodigo,
    cenNome: centro.especialidade,
    prof: prof.profCodigo,
    cons: prof.consCodigo || '',
    uf: prof.profEstadoCons || '',
    nome: prof.apelido || prof.nome,
  });
  return `/agendamento?${params.toString()}`;
}

export default function MedicosDirectory({ profissionais, linkPorProfissional }) {
  const [searchQuery, setSearchQuery] = useState('');
  const rootRef = useRef(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.set(`.${styles.card}`, { opacity: 0, y: 24 });
        ScrollTrigger.batch(`.${styles.card}`, {
          start: 'top 90%',
          once: true,
          onEnter: (batch) =>
            gsap.to(batch, { opacity: 1, y: 0, duration: 0.55, stagger: 0.05 }),
        });
      });
    },
    { scope: rootRef }
  );

  const lift = (e, up) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    gsap.to(e.currentTarget, { y: up ? -2 : 0, duration: 0.25 });
  };

  const query = searchQuery.toLowerCase();
  const filtrados = profissionais.filter(
    (p) =>
      p.nome.toLowerCase().includes(query) ||
      p.especialidades.some((e) => e.especialidade.toLowerCase().includes(query))
  );
  // Só mostra a unidade quando ela de fato diferencia alguma coisa no
  // diretório (2+ unidades configuradas) — com só a Matriz, seria ruído.
  const mostrarUnidade = new Set(profissionais.map((p) => p.unidade)).size > 1;

  return (
    <div ref={rootRef}>
      <div className={styles.searchWrapper}>
        <Search size={18} className={styles.searchIcon} />
        <input
          type="text"
          placeholder="Buscar por nome ou especialidade"
          className={styles.searchInput}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-label="Buscar profissional por nome ou especialidade"
        />
      </div>

      <div className={styles.grid}>
        {filtrados.map((prof) => (
          <Link
            key={prof.slug}
            href={linkPorProfissional && prof.linkAtivo ? linkAgendamentoDoProfissional(prof) : '/agendamento'}
            className={styles.card}
            onMouseEnter={(e) => lift(e, true)}
            onMouseLeave={(e) => lift(e, false)}
          >
            <div className={styles.avatar}>{(prof.apelido || prof.nome).charAt(0)}</div>
            <div className={styles.info}>
              <span className={styles.nome}>{prof.apelido || prof.nome}</span>
              <span className={styles.especialidade}>
                {prof.especialidades.map((e) => e.especialidade).join(' · ')}
              </span>
              {prof.consCodigo && (
                <span className={styles.conselho}>
                  {prof.consCodigo} {prof.profCodigo}/{prof.profEstadoCons}
                </span>
              )}
              {mostrarUnidade && (
                <div className={styles.tags}>
                  <span className={styles.unidade}>{nomeUnidade(prof.unidade)}</span>
                </div>
              )}
            </div>
            <ChevronRight className={styles.arrow} size={18} />
          </Link>
        ))}
      </div>

      {filtrados.length === 0 && (
        <p className={styles.noResults}>
          Não encontramos profissionais para essa busca. Tente outro nome ou
          especialidade.
        </p>
      )}
    </div>
  );
}
