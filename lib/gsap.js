'use client';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger, useGSAP);

// Easing sóbrio como padrão do projeto — nada de bounce/elastic.
gsap.defaults({ ease: 'power2.out', duration: 0.7 });

export { gsap, ScrollTrigger, useGSAP };
