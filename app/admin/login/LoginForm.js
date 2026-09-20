'use client';

import { useActionState, useEffect, useRef } from 'react';
import { MessageCircle } from 'lucide-react';
import { TextPlugin } from 'gsap/TextPlugin';
import { gsap, useGSAP } from '../../../lib/gsap';
import { login } from './actions';
import styles from './login.module.css';

gsap.registerPlugin(TextPlugin);

// Frases genéricas o bastante pra caber tanto no login de uma empresa
// quanto no login da plataforma (superadmin) — o parágrafo abaixo do
// título já cobre o contexto específico de cada um.
const TAGLINES = [
  'O site da sua clínica, sempre pronto.',
  'Edite textos e fotos direto na tela — sem código.',
  'Agendamento, exames e a Sofia, tudo em um painel.',
  'Sua marca, suas cores, seu domínio.',
];

export default function LoginForm({ tenantNome, logoUrl }) {
  const [state, formAction, pending] = useActionState(async (_prev, formData) => login(formData), null);

  const rootRef = useRef(null);
  const blobRef = useRef(null);
  const ringRef = useRef(null);
  const brandRef = useRef(null);
  const formPanelRef = useRef(null);
  const taglineRef = useRef(null);
  const cursorRef = useRef(null);
  const shape1Ref = useRef(null);
  const shape2Ref = useRef(null);
  const shape3Ref = useRef(null);
  const badgeRef = useRef(null);

  useGSAP(
    () => {
      const camposEBotoes = formPanelRef.current?.querySelectorAll('input, button') ?? [];
      gsap.set(brandRef.current, { opacity: 0, y: -16 });
      gsap.set(formPanelRef.current, { opacity: 0, y: 24 });
      gsap.set(camposEBotoes, { opacity: 0, y: 8 });

      gsap
        .timeline()
        .to(brandRef.current, { opacity: 1, y: 0, duration: 0.5 })
        .to(formPanelRef.current, { opacity: 1, y: 0, duration: 0.5 }, '-=0.3')
        .to(camposEBotoes, { opacity: 1, y: 0, stagger: 0.05, duration: 0.35 }, '-=0.2');

      const mm = gsap.matchMedia();

      // Loops ambiente (blob, anel, formas flutuantes, texto digitando) —
      // só com "no-preference": em prefers-reduced-motion, fixa a primeira
      // frase estática e não anima mais nada depois da entrada acima.
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.to(blobRef.current, { opacity: 0.7, scale: 1.08, duration: 5, ease: 'sine.inOut', yoyo: true, repeat: -1 });
        gsap.to(ringRef.current, { rotate: 360, duration: 16, ease: 'none', repeat: -1 });

        [shape1Ref, shape2Ref, shape3Ref].forEach((ref, i) => {
          gsap.to(ref.current, {
            y: i === 1 ? 16 : -16,
            x: i === 2 ? -10 : 10,
            rotate: i === 1 ? -4 : 4,
            duration: 6 + i,
            ease: 'sine.inOut',
            yoyo: true,
            repeat: -1,
          });
        });

        gsap.to(badgeRef.current, { y: -14, x: -6, rotate: -3, duration: 7, ease: 'sine.inOut', yoyo: true, repeat: -1 });
        gsap.to(cursorRef.current, { opacity: 0, duration: 0.5, repeat: -1, yoyo: true, ease: 'steps(1)' });

        const taglineTl = gsap.timeline({ repeat: -1, delay: 0.7 });
        TAGLINES.forEach((frase) => {
          taglineTl
            .to(taglineRef.current, { duration: frase.length * 0.045, text: frase, ease: 'none' })
            .to({}, { duration: 2 })
            .to(taglineRef.current, { duration: frase.length * 0.022, text: '', ease: 'none' })
            .to({}, { duration: 0.3 });
        });
      });

      mm.add('(prefers-reduced-motion: reduce)', () => {
        if (taglineRef.current) taglineRef.current.textContent = TAGLINES[0];
        if (cursorRef.current) cursorRef.current.style.opacity = '0';
      });
    },
    { scope: rootRef }
  );

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
  const marca = tenantNome || 'Plataforma';

  return (
    <div ref={rootRef} className={styles.page}>
      <aside aria-label="Apresentação" className={styles.brandPanel}>
        <div aria-hidden className={styles.grain} />
        <div ref={blobRef} aria-hidden className={styles.blob} />
        <div ref={ringRef} aria-hidden className={styles.ring} />

        <div ref={shape1Ref} aria-hidden className={`${styles.shape} ${styles.shape1}`} />
        <div ref={shape2Ref} aria-hidden className={`${styles.shape} ${styles.shape2}`} />
        <div ref={shape3Ref} aria-hidden className={`${styles.shape} ${styles.shape3}`} />

        <div ref={badgeRef} aria-hidden className={styles.badge}>
          <MessageCircle size={18} />
          <span className={styles.badgeDot} />
        </div>

        <div ref={brandRef} className={styles.brandContent}>
          <div className={styles.brandMark}>
            <span className={styles.logoWrap}>
              <img src={logoUrl} alt="" className={styles.logoImg} />
            </span>
            <h1 className={styles.brandName}>{marca}</h1>
          </div>
          <p className={styles.tagline}>
            <span ref={taglineRef} aria-live="off" />
            <span ref={cursorRef} aria-hidden className={styles.cursor} />
          </p>
        </div>
      </aside>

      <main className={styles.formPanel}>
        <div ref={formPanelRef} className={styles.formInner}>
          <div className={styles.mobileBrand}>
            <span className={styles.logoWrapSmall}>
              <img src={logoUrl} alt="" className={styles.logoImgSmall} />
            </span>
            <span className={styles.mobileBrandName}>{marca}</span>
          </div>

          <h2 className={styles.title}>Entrar</h2>
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

          <form action={formAction} className={styles.form}>
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
        </div>
      </main>
    </div>
  );
}
