'use client';

import { useRef } from 'react';
import styles from './SpecialtiesSection.module.css';
import { gsap, ScrollTrigger, useGSAP } from '../lib/gsap';
import { useSiteConfig } from '../lib/siteConfigContext';
import { getIconComponent } from '../lib/iconMap';

export default function SpecialtiesSection() {
  const { ESPECIALIDADES } = useSiteConfig();
  const rootRef = useRef(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.from(`.${styles.sectionHeader}`, {
          opacity: 0,
          y: 24,
          duration: 0.7,
          scrollTrigger: { trigger: rootRef.current, start: 'top 82%', once: true },
        });

        gsap.set(`.${styles.card}`, { opacity: 0, y: 24 });
        ScrollTrigger.batch(`.${styles.card}`, {
          start: 'top 88%',
          once: true,
          onEnter: (batch) =>
            gsap.to(batch, { opacity: 1, y: 0, duration: 0.6, stagger: 0.06 }),
        });
      });
    },
    { scope: rootRef }
  );

  // Hover "lift": elevação sutil via GSAP (§5.4 padrão 3).
  const lift = (e, up) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    gsap.to(e.currentTarget, { y: up ? -3 : 0, duration: 0.25 });
  };

  return (
    <section id="especialidades" ref={rootRef} className={`section ${styles.sectionBg}`}>
      <div className="container">
        <div className={styles.sectionHeader}>
          <span className="eyebrow">Especialidades</span>
          <h2 className={styles.sectionTitle}>O que cuidamos aqui</h2>
          <p className={styles.sectionSubtitle}>
            Serviços médicos e exames para atender você e sua família em um só
            lugar.
          </p>
        </div>

        <div className={styles.grid}>
          {(ESPECIALIDADES || []).map((spec) => {
            const Icon = getIconComponent(spec.icone);
            return (
              <div
                key={spec.id}
                className={styles.card}
                onMouseEnter={(e) => lift(e, true)}
                onMouseLeave={(e) => lift(e, false)}
                data-editable="especialidades"
              >
                <div className={styles.iconWrapper}>
                  <Icon size={20} />
                </div>
                <h3 className={styles.cardTitle}>{spec.nome}</h3>
                <p className={styles.cardDesc}>{spec.descricao}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
