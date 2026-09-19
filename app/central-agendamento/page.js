'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, notFound } from 'next/navigation';
import { CalendarPlus, History } from 'lucide-react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import BookingWizard from '../../components/BookingWizard';
import ClientAreaPortal from '../../components/ClientAreaPortal';
import { useSiteConfig } from '../../lib/siteConfigContext';
import styles from './central-agendamento.module.css';

function CentralAgendamentoContent() {
  const { FEATURE_AGENDAMENTO, FEATURE_AREA_CLIENTE, TEXTOS } = useSiteConfig();
  const searchParams = useSearchParams();
  const abaPadrao = FEATURE_AGENDAMENTO ? 'agendar' : 'minhas-consultas';
  const [activeTab, setActiveTab] = useState(abaPadrao);
  // API_BASE_URL_* é server-only — busca via API a mesma forma que
  // ClientAreaPortal/AreaCliente usam para saber quais unidades exibir.
  const [unidadesFooter, setUnidadesFooter] = useState({ mostrarMatriz: true, mostrarFilial: true });

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'minhas-consultas' || tabParam === 'consultas' || tabParam === 'area-cliente') {
      if (FEATURE_AREA_CLIENTE) setActiveTab('minhas-consultas');
    } else if (FEATURE_AGENDAMENTO) {
      setActiveTab('agendar');
    }
  }, [searchParams, FEATURE_AREA_CLIENTE, FEATURE_AGENDAMENTO]);

  useEffect(() => {
    fetch('/api/unidades')
      .then((res) => res.json())
      .then(setUnidadesFooter)
      .catch(() => {});
  }, []);

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />

      <section className="pageSection container">
        {FEATURE_AGENDAMENTO && FEATURE_AREA_CLIENTE && (
          <div className={styles.tabWrapper}>
            <button
              className={`${styles.tabButton} ${activeTab === 'agendar' ? styles.activeTabButton : ''}`}
              onClick={() => setActiveTab('agendar')}
              aria-label="Novo Agendamento"
              data-editable="textos.centralTabNovo"
            >
              <CalendarPlus size={18} />
              {TEXTOS?.centralTabNovo}
            </button>
            <button
              className={`${styles.tabButton} ${activeTab === 'minhas-consultas' ? styles.activeTabButton : ''}`}
              onClick={() => setActiveTab('minhas-consultas')}
              aria-label="Minhas Consultas"
              data-editable="textos.centralTabConsultas"
            >
              <History size={18} />
              {TEXTOS?.centralTabConsultas}
            </button>
          </div>
        )}

        <div className={styles.tabContent}>
          {activeTab === 'agendar' && FEATURE_AGENDAMENTO ? (
            <div className="contentCard" style={{ maxWidth: '1200px', background: 'var(--surface)', border: '1px solid var(--line)', boxShadow: 'var(--shadow-sm)' }}>
              <h2 className="text-center responsiveTitle" data-editable="textos.centralTitulo">
                {TEXTOS?.centralTitulo}
              </h2>
              <BookingWizard />
            </div>
          ) : FEATURE_AREA_CLIENTE ? (
            <ClientAreaPortal />
          ) : null}
        </div>
      </section>

      <Footer {...unidadesFooter} />
    </main>
  );
}

export default function CentralAgendamentoPage() {
  const { FEATURE_CENTRAL_AGENDAMENTO } = useSiteConfig();
  if (!FEATURE_CENTRAL_AGENDAMENTO) notFound();

  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>Carregando Central de Agendamento...</p>
      </div>
    }>
      <CentralAgendamentoContent />
    </Suspense>
  );
}
