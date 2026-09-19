'use client';

import { useRef } from 'react';
import styles from './AboutSection.module.css';
import { MapPin, Clock } from 'lucide-react';
import AnimatedNumber from './AnimatedNumber';
import EcgLine from './EcgLine';
import { gsap, useGSAP } from '../lib/gsap';
import { useSiteConfig } from '../lib/siteConfigContext';

export default function AboutSection({ mostrarMatriz = true, mostrarFilial = true } = {}) {
  const {
    CLINIC_NOME,
    CLINIC_ENDERECO_MATRIZ,
    CLINIC_ENDERECO_FILIAL,
    CLINIC_PHONE_DISPLAY_MATRIZ,
    CLINIC_PHONE_DISPLAY_FILIAL,
    CLINIC_HORARIO_ATENDIMENTO,
    TEXTOS,
    ESPECIALIDADES,
  } = useSiteConfig();
  const rootRef = useRef(null);
  const totalUnidades = (mostrarMatriz ? 1 : 0) + (mostrarFilial ? 1 : 0);

  const FACTS = [
    { value: 10, suffix: '+', label: 'Anos de atuação' },
    {
      value: totalUnidades,
      suffix: '',
      label: totalUnidades === 1 ? 'Unidade em atendimento' : 'Unidades em atendimento',
    },
    { value: ESPECIALIDADES?.length || 0, suffix: '+', label: 'Especialidades médicas e exames' },
  ];

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.from(`.${styles.reveal}`, {
          opacity: 0,
          y: 24,
          duration: 0.7,
          stagger: 0.08,
          scrollTrigger: { trigger: rootRef.current, start: 'top 82%', once: true },
        });
      });
    },
    { scope: rootRef }
  );

  return (
    <section id="sobre" ref={rootRef} className="section container">
      <div className={styles.divider}>
        <EcgLine variant="divider" />
      </div>

      <div className={styles.grid}>
        <div className={styles.content}>
          <span className={`eyebrow ${styles.reveal}`}>Sobre a clínica</span>
          <h2 className={`${styles.title} ${styles.reveal}`} data-editable="textos.sobreTitulo">
            {TEXTOS?.sobreTitulo}
          </h2>
          <p className={`${styles.description} ${styles.reveal}`} data-editable="textos.sobreDescricao">
            {TEXTOS?.sobreDescricao}
          </p>

          <div className={styles.infoList}>
            {mostrarMatriz && (
              <div className={`${styles.infoItem} ${styles.reveal}`}>
                <div className={styles.iconWrapper}>
                  <MapPin size={20} />
                </div>
                <div>
                  <h4 className={styles.infoTitle}>Unidade Matriz</h4>
                  <p className={styles.infoText}>
                    <span data-editable="unidades.matriz.endereco">{CLINIC_ENDERECO_MATRIZ}</span><br />
                    <strong data-editable="unidades.matriz.telefoneDisplay">{CLINIC_PHONE_DISPLAY_MATRIZ}</strong>
                  </p>
                </div>
              </div>
            )}

            {mostrarFilial && (
              <div className={`${styles.infoItem} ${styles.reveal}`}>
                <div className={styles.iconWrapper}>
                  <MapPin size={20} />
                </div>
                <div>
                  <h4 className={styles.infoTitle}>Unidade Filial</h4>
                  <p className={styles.infoText}>
                    <span data-editable="unidades.filial.endereco">{CLINIC_ENDERECO_FILIAL}</span><br />
                    <strong data-editable="unidades.filial.telefoneDisplay">{CLINIC_PHONE_DISPLAY_FILIAL}</strong>
                  </p>
                </div>
              </div>
            )}

            <div className={`${styles.infoItem} ${styles.reveal}`}>
              <div className={styles.iconWrapper}>
                <Clock size={20} />
              </div>
              <div>
                <h4 className={styles.infoTitle}>Horário de funcionamento</h4>
                <p className={styles.infoText} data-editable="horarioAtendimento">{CLINIC_HORARIO_ATENDIMENTO}</p>
              </div>
            </div>
          </div>
        </div>

        <aside className={`${styles.factsCard} ${styles.reveal}`}>
          <span className="eyebrow" data-editable="clinicNome">{CLINIC_NOME} em números</span>
          <ul className={styles.factsList}>
            {FACTS.map((fact) => (
              <li key={fact.label} className={styles.factItem}>
                <span className={styles.factValue}>
                  <AnimatedNumber value={fact.value} suffix={fact.suffix} />
                </span>
                <span className={styles.factLabel}>{fact.label}</span>
              </li>
            ))}
            <li className={styles.factItem}>
              <span className={styles.factValue}>Seg–Sáb</span>
              <span className={styles.factLabel}>Dias de atendimento</span>
            </li>
          </ul>
          <p className={styles.factsFootnote}>
            Dados da própria clínica.
          </p>
        </aside>
      </div>
    </section>
  );
}
