import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import ChatInterface from '../../components/chat/ChatInterface';
import { getFeatureFlags } from '../../lib/featureFlags';
import { getSiteConfig } from '../../lib/config';
import styles from './chat.module.css';

export async function generateMetadata() {
  const { CLINIC_NOME } = await getSiteConfig();
  return {
    title: `Fale com a Sofia - ${CLINIC_NOME}`,
    description: `Converse com a Sofia, atendente virtual da ${CLINIC_NOME}, e agende, remarque ou cancele consultas.`,
  };
}

export default async function ChatPage() {
  const { FEATURE_CHAT } = await getFeatureFlags();
  if (!FEATURE_CHAT) notFound();

  const { CLINIC_NOME } = await getSiteConfig();

  return (
    <main className={styles.page}>
      <header className={styles.topBar}>
        <Link href="/" className={styles.backLink} aria-label="Voltar para a home">
          <ArrowLeft size={20} />
        </Link>
        <div className={styles.topBarInfo}>
          <div className={styles.avatar}>S</div>
          <div>
            <span className={styles.title}>Sofia</span>
            <span className={styles.subtitle}>
              <span className={styles.onlineDot} /> {CLINIC_NOME}
            </span>
          </div>
        </div>
        <span className={styles.topBarSpacer} />
      </header>

      <ChatInterface className={styles.chatArea} />
    </main>
  );
}
