'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import styles from './Header.module.css';
import { gsap, ScrollTrigger, useGSAP } from '../lib/gsap';
import { useSiteConfig } from '../lib/siteConfigContext';

export default function Header() {
  const {
    FEATURE_SOBRE,
    FEATURE_ESPECIALIDADES,
    FEATURE_PROFISSIONAIS,
    FEATURE_ORCAMENTO,
    FEATURE_AGENDAMENTO,
    FEATURE_AREA_CLIENTE,
    FEATURE_CHAT,
    CLINIC_NOME,
    LOGO_URL,
    TEXTOS,
  } = useSiteConfig();

  const NAV_LINKS = [
    ...(FEATURE_SOBRE ? [{ href: '/#sobre', label: TEXTOS?.navSobre, field: 'textos.navSobre' }] : []),
    ...(FEATURE_ESPECIALIDADES
      ? [{ href: '/#especialidades', label: TEXTOS?.navEspecialidades, field: 'textos.navEspecialidades' }]
      : []),
    ...(FEATURE_PROFISSIONAIS
      ? [{ href: '/medicos', label: TEXTOS?.navProfissionais, field: 'textos.navProfissionais' }]
      : []),
    ...(FEATURE_ORCAMENTO ? [{ href: '/orcamento', label: TEXTOS?.navOrcamento, field: 'textos.navOrcamento' }] : []),
    ...(FEATURE_CHAT ? [{ href: '/chat', label: TEXTOS?.navChat, field: 'textos.navChat' }] : []),
    { href: '/#contato', label: TEXTOS?.navContato, field: 'textos.navContato' },
  ];

  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef(null);
  const panelRef = useRef(null);
  const menuTl = useRef(null);
  const iconTl = useRef(null);

  useGSAP(
    () => {
      // Estado "rolado": sombra + barra mais compacta.
      ScrollTrigger.create({
        start: 8,
        end: 'max',
        toggleClass: { className: styles.scrolled, targets: rootRef.current },
      });

      const mm = gsap.matchMedia();
      mm.add(
        [
          '(prefers-reduced-motion: no-preference)',
          '(prefers-reduced-motion: reduce)',
        ],
        (ctx) => {
          const reduced = ctx.conditions[1] || false;
          const speed = reduced ? 0 : 1;

          gsap.set(panelRef.current, { xPercent: 100 });

          menuTl.current = gsap
            .timeline({ paused: true })
            .set(panelRef.current, { visibility: 'visible' })
            .to(panelRef.current, { xPercent: 0, duration: 0.35 * speed, ease: 'power3.out' })
            .from(
              `.${styles.mobileNavLink}`,
              { opacity: 0, x: 16, stagger: 0.05 * speed, duration: 0.3 * speed },
              reduced ? 0 : '-=0.15'
            );

          iconTl.current = gsap
            .timeline({ paused: true })
            .to(`.${styles.barTop}`, { y: 5, rotate: 45, duration: 0.25 * speed }, 0)
            .to(`.${styles.barBottom}`, { y: -5, rotate: -45, duration: 0.25 * speed }, 0);
        }
      );
    },
    { scope: rootRef }
  );

  useEffect(() => {
    if (!menuTl.current) return;
    if (isOpen) {
      menuTl.current.play();
      iconTl.current?.play();
    } else {
      menuTl.current.reverse();
      iconTl.current?.reverse();
    }
  }, [isOpen]);

  const close = () => setIsOpen(false);

  return (
    <header ref={rootRef} className={styles.header}>
      <div className={`container ${styles.headerContent}`}>
        <div className={styles.logo}>
          <Link href="/" onClick={close}>
            <img src={LOGO_URL} alt={CLINIC_NOME} className={styles.logoImg} data-editable="brand.logoUrl" />
          </Link>
        </div>

        <nav className={styles.desktopNav} aria-label="Navegação principal">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className={styles.navLink} data-editable={link.field}>
              {link.label}
            </Link>
          ))}
        </nav>

        <div className={styles.desktopActions}>
          {FEATURE_AREA_CLIENTE && (
            <Link href="/area-cliente" className={styles.navLink} data-editable="textos.navAreaCliente">
              {TEXTOS?.navAreaCliente}
            </Link>
          )}
          {FEATURE_AGENDAMENTO && (
            <Link href="/agendamento" className="btn-primary" data-editable="textos.botaoAgendarConsulta">
              {TEXTOS?.botaoAgendarConsulta}
            </Link>
          )}
        </div>

        <button
          type="button"
          className={styles.hamburgerBtn}
          onClick={() => setIsOpen((v) => !v)}
          aria-expanded={isOpen}
          aria-controls="menu-mobile"
          aria-label={isOpen ? 'Fechar menu' : 'Abrir menu'}
        >
          <span className={styles.barTop} />
          <span className={styles.barBottom} />
        </button>
      </div>

      <div
        id="menu-mobile"
        ref={panelRef}
        className={styles.mobileMenu}
        aria-hidden={!isOpen}
      >
        <nav className={styles.mobileNav} aria-label="Navegação móvel">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={styles.mobileNavLink}
              onClick={close}
              tabIndex={isOpen ? 0 : -1}
              data-editable={link.field}
            >
              {link.label}
            </Link>
          ))}
          <hr className={styles.divider} />
          {FEATURE_AREA_CLIENTE && (
            <Link
              href="/area-cliente"
              className={styles.mobileNavLink}
              onClick={close}
              tabIndex={isOpen ? 0 : -1}
              data-editable="textos.navAreaCliente"
            >
              {TEXTOS?.navAreaCliente}
            </Link>
          )}
          {FEATURE_AGENDAMENTO && (
            <Link
              href="/agendamento"
              className={`btn-primary ${styles.mobileCta}`}
              onClick={close}
              tabIndex={isOpen ? 0 : -1}
              data-editable="textos.botaoAgendarConsulta"
            >
              {TEXTOS?.botaoAgendarConsulta}
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
