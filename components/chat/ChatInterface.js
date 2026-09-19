'use client';

import { useEffect, useRef, useState } from 'react';
import { Send, RotateCcw } from 'lucide-react';
import styles from './ChatInterface.module.css';
import EcgLine from '../EcgLine';
import { gsap, useGSAP } from '../../lib/gsap';
import { useSiteConfig } from '../../lib/siteConfigContext';

const STORAGE_KEY = 'clinicaTemplate_chatHistory';

function greetingMessage(clinicNome) {
  return {
    role: 'assistant',
    content: `Oi! Eu sou a Sofia, da ${clinicNome} 😊 Posso agendar, remarcar ou cancelar uma consulta, ou tirar dúvidas. Como posso ajudar?`,
  };
}

function loadHistory(clinicNome) {
  if (typeof window === 'undefined') return [greetingMessage(clinicNome)];
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore corrupted storage
  }
  return [greetingMessage(clinicNome)];
}

export default function ChatInterface({ className }) {
  const { CLINIC_NOME, CLINIC_PHONE_DISPLAY } = useSiteConfig();
  const fallbackText = `Ops, tive um probleminha aqui. Pode tentar de novo? Se preferir, fala com a gente pelo WhatsApp ${CLINIC_PHONE_DISPLAY}.`;

  const [messages, setMessages] = useState(() => [greetingMessage(CLINIC_NOME)]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    setMessages(loadHistory(CLINIC_NOME));
    setLoaded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loaded || typeof window === 'undefined') return;
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages, loaded]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, isSending]);

  const visibleMessages = messages.filter(
    (m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim().length > 0
  );

  // Entrada da última mensagem ("swap", §5.4).
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const rows = listRef.current?.querySelectorAll(`.${styles.bubbleRow}`);
        if (!rows || rows.length === 0) return;
        gsap.fromTo(
          rows[rows.length - 1],
          { opacity: 0, y: 8 },
          { opacity: 1, y: 0, duration: 0.3 }
        );
      });
    },
    { scope: listRef, dependencies: [visibleMessages.length, isSending] }
  );

  const handleReset = () => {
    const fresh = [greetingMessage(CLINIC_NOME)];
    setMessages(fresh);
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isSending) return;

    const userMessage = { role: 'user', content: text };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput('');
    setIsSending(true);

    try {
      const payload = nextMessages.filter((m) => !m._local);
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: payload }),
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.messages) && data.messages.length > 0) {
        setMessages(data.messages);
      } else {
        setMessages([...nextMessages, { role: 'assistant', content: data.reply || fallbackText, _local: true }]);
      }
    } catch {
      setMessages([...nextMessages, { role: 'assistant', content: fallbackText, _local: true }]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className={`${styles.chat} ${className || ''}`}>
      <div className={styles.messageList} ref={listRef}>
        {visibleMessages.map((m, idx) => (
          <div
            key={idx}
            className={`${styles.bubbleRow} ${m.role === 'user' ? styles.bubbleRowUser : ''}`}
          >
            <div className={`${styles.bubble} ${m.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant}`}>
              {m.content}
            </div>
          </div>
        ))}

        {isSending && (
          <div className={styles.bubbleRow}>
            <div className={`${styles.bubble} ${styles.bubbleAssistant} ${styles.typingBubble}`}>
              <EcgLine variant="spinner" />
            </div>
          </div>
        )}
      </div>

      <form className={styles.inputBar} onSubmit={handleSend}>
        <button
          type="button"
          className={styles.resetBtn}
          onClick={handleReset}
          aria-label="Reiniciar conversa"
          title="Reiniciar conversa"
        >
          <RotateCcw size={16} />
        </button>
        <input
          type="text"
          className={styles.textInput}
          placeholder="Digite sua mensagem"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isSending}
        />
        <button type="submit" className={styles.sendBtn} disabled={isSending || !input.trim()} aria-label="Enviar">
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
