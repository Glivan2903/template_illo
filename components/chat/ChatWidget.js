'use client';

import { useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { MessageCircle, X } from 'lucide-react';
import ChatInterface from './ChatInterface';
import styles from './ChatWidget.module.css';
import { gsap, useGSAP } from '../../lib/gsap';
import { useSiteConfig } from '../../lib/siteConfigContext';

export default function ChatWidget() {
  const { CLINIC_NOME } = useSiteConfig();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef(null);
  const fabRef = useRef(null);
  const panelRef = useRef(null);

  const hidden = pathname === '/chat' || pathname.startsWith('/medicos/');

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        if (isOpen && panelRef.current) {
          gsap.fromTo(
            panelRef.current,
            { opacity: 0, scale: 0.95, y: 16, transformOrigin: 'bottom right' },
            { opacity: 1, scale: 1, y: 0, duration: 0.25, ease: 'power3.out' }
          );
        }
        if (!isOpen && fabRef.current) {
          gsap.fromTo(
            fabRef.current,
            { opacity: 0, scale: 0.7, transformOrigin: 'bottom right' },
            { opacity: 1, scale: 1, duration: 0.22, ease: 'power3.out' }
          );
        }
      });
    },
    { scope: rootRef, dependencies: [isOpen, hidden] }
  );

  if (hidden) return null;

  return (
    <div ref={rootRef}>
      {!isOpen && (
        <button
          ref={fabRef}
          type="button"
          className={styles.fab}
          onClick={() => setIsOpen(true)}
          aria-label="Abrir chat com a Sofia"
        >
          <MessageCircle size={26} />
        </button>
      )}

      {isOpen && (
        <div ref={panelRef} className={styles.panel}>
          <div className={styles.panelHeader}>
            <div className={styles.panelHeaderInfo}>
              <div className={styles.avatar}>S</div>
              <div>
                <span className={styles.panelTitle}>Sofia</span>
                <span className={styles.panelSubtitle}>
                  <span className={styles.onlineDot} /> {CLINIC_NOME}
                </span>
              </div>
            </div>
            <button className={styles.closeBtn} onClick={() => setIsOpen(false)} aria-label="Fechar chat">
              <X size={20} />
            </button>
          </div>
          <ChatInterface className={styles.panelChat} />
        </div>
      )}
    </div>
  );
}
