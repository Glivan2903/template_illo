'use client';

import { useRef } from 'react';
import Link from 'next/link';
import styles from './CTASection.module.css';
import { gsap, useGSAP } from '../lib/gsap';
import { useSiteConfig } from '../lib/siteConfigContext';

export default function CTASection() {
  const { CLINIC_WHATSAPP_URL, TEXTOS, FEATURE_AGENDAMENTO } = useSiteConfig();
  const rootRef = useRef(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.from(`.${styles.inner}`, {
          opacity: 0,
          y: 24,
          duration: 0.7,
          scrollTrigger: { trigger: rootRef.current, start: 'top 82%', once: true },
        });
      });
    },
    { scope: rootRef }
  );

  return (
    <section id="agendamento" ref={rootRef} className={styles.band}>
      <div className={`container ${styles.inner}`}>
        {FEATURE_AGENDAMENTO ? (
          <>
            <div>
              <h2 className={styles.title} data-editable="textos.ctaComAgendamentoTitulo">{TEXTOS?.ctaComAgendamentoTitulo}</h2>
              <p className={styles.text} data-editable="textos.ctaComAgendamentoTexto">
                {TEXTOS?.ctaComAgendamentoTexto}
              </p>
            </div>
            <Link href="/agendamento" className={`btn-primary ${styles.cta}`} data-editable="textos.botaoAgendarConsulta">
              {TEXTOS?.botaoAgendarConsulta}
            </Link>
          </>
        ) : (
          <>
            <div>
              <h2 className={styles.title} data-editable="textos.ctaSemAgendamentoTitulo">{TEXTOS?.ctaSemAgendamentoTitulo}</h2>
              <p className={styles.text} data-editable="textos.ctaSemAgendamentoTexto">
                {TEXTOS?.ctaSemAgendamentoTexto}
              </p>
            </div>
            <a
              href={CLINIC_WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={`btn-primary ${styles.cta}`}
              data-editable="textos.botaoFalarWhatsapp"
            >
              {TEXTOS?.botaoFalarWhatsapp}
            </a>
          </>
        )}
      </div>
    </section>
  );
}
