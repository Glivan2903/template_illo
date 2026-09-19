import { notFound } from 'next/navigation';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import ClientAreaPortal from '../../components/ClientAreaPortal';
import { getFeatureFlags } from '../../lib/featureFlags';
import { getUnidadesFooterProps } from '../../lib/unidades';
import { getSiteConfig } from '../../lib/config';

export async function generateMetadata() {
  const { CLINIC_NOME } = await getSiteConfig();
  return {
    title: `Área do Cliente - ${CLINIC_NOME}`,
    description: 'Consulte seu histórico de consultas e exames, cancele ou reagende pelo telefone cadastrado.',
  };
}

export default async function AreaCliente() {
  const { FEATURE_AREA_CLIENTE } = await getFeatureFlags();
  if (!FEATURE_AREA_CLIENTE) notFound();

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />
      <ClientAreaPortal />
      <Footer {...(await getUnidadesFooterProps())} />
    </main>
  );
}
