'use client';

import { useRef } from 'react';
import { gsap, useGSAP } from '../lib/gsap';

export default function AnimatedNumber({ value, suffix = '' }) {
  const ref = useRef(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const mm = gsap.matchMedia();

      mm.add('(prefers-reduced-motion: reduce)', () => {
        el.textContent = `${value}${suffix}`;
      });

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const counter = { v: 0 };
        el.textContent = `0${suffix}`;
        gsap.to(counter, {
          v: value,
          duration: 1.2,
          snap: { v: 1 },
          scrollTrigger: { trigger: el, start: 'top 85%', once: true },
          onUpdate: () => {
            el.textContent = `${Math.round(counter.v)}${suffix}`;
          },
        });
      });
    },
    { scope: ref, dependencies: [value, suffix] }
  );

  // Renderiza o valor final para SSR/no-JS; o GSAP zera antes de contar.
  return <span ref={ref}>{value}{suffix}</span>;
}
