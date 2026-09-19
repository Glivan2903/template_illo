'use client';

import { useRef } from 'react';
import { gsap, useGSAP } from '../lib/gsap';

// Traçado de eletrocardiograma — assinatura visual do site.
// Desenhado via stroke-dasharray/offset (sem DrawSVGPlugin, que é pago).
const VARIANTS = {
  hero: {
    viewBox: '0 0 1200 80',
    d: 'M0 48 H420 l16 -6 14 6 h20 l8 6 10 -40 10 54 8 -20 h18 q12 -10 24 0 H1200',
    width: '100%',
    height: 80,
    strokeWidth: 2,
  },
  divider: {
    viewBox: '0 0 120 40',
    d: 'M0 24 H32 l6 4 7 -22 8 30 6 -12 h14 q6 -5 12 0 H120',
    width: 120,
    height: 40,
    strokeWidth: 2,
  },
  spinner: {
    viewBox: '0 0 120 40',
    d: 'M0 24 H32 l6 4 7 -22 8 30 6 -12 h14 q6 -5 12 0 H120',
    width: 64,
    height: 22,
    strokeWidth: 2.5,
  },
};

export default function EcgLine({ variant = 'divider', delay = 0, className }) {
  const svgRef = useRef(null);
  const pathRef = useRef(null);
  const spec = VARIANTS[variant] || VARIANTS.divider;

  useGSAP(
    () => {
      const path = pathRef.current;
      if (!path) return;
      const length = path.getTotalLength();
      const mm = gsap.matchMedia();

      mm.add('(prefers-reduced-motion: reduce)', () => {
        gsap.set(path, { strokeDasharray: 'none', strokeDashoffset: 0, opacity: 1 });
      });

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        if (variant === 'spinner') {
          // Pulso viajante em loop: um trecho do traçado percorre o batimento.
          gsap.set(path, { strokeDasharray: `${length * 0.35} ${length * 0.65}`, opacity: 1 });
          gsap.fromTo(
            path,
            { strokeDashoffset: length },
            { strokeDashoffset: -length, duration: 1.6, ease: 'none', repeat: -1 }
          );
          return;
        }

        gsap.set(path, { strokeDasharray: length, strokeDashoffset: length, opacity: 1 });
        const draw = {
          strokeDashoffset: 0,
          duration: variant === 'hero' ? 1.4 : 0.9,
          ease: 'power2.inOut',
          delay,
        };
        if (variant === 'divider') {
          draw.scrollTrigger = { trigger: svgRef.current, start: 'top 85%', once: true };
        }
        gsap.to(path, draw);
      });
    },
    { scope: svgRef, dependencies: [variant, delay] }
  );

  return (
    <svg
      ref={svgRef}
      className={className}
      viewBox={spec.viewBox}
      width={spec.width}
      height={spec.height}
      fill="none"
      aria-hidden="true"
      focusable="false"
      style={{ display: 'block', maxWidth: '100%' }}
    >
      <path
        ref={pathRef}
        d={spec.d}
        stroke="var(--leaf)"
        strokeWidth={spec.strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ opacity: 0 }}
      />
    </svg>
  );
}
