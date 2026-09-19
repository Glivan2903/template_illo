import { notFound } from "next/navigation";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import MedicosDirectory from "../../components/MedicosDirectory";
import { getProfissionaisUnificados } from "../../lib/profissionais";
import { getFeatureFlags } from "../../lib/featureFlags";
import { getUnidadesFooterProps } from "../../lib/unidades";
import { getSiteConfig } from "../../lib/config";

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const { CLINIC_NOME } = await getSiteConfig();
  return {
    title: `Nossos Profissionais - ${CLINIC_NOME}`,
    description: `Conheça os médicos e profissionais da ${CLINIC_NOME} e agende sua consulta diretamente.`,
  };
}

export default async function Medicos() {
  const { FEATURE_PROFISSIONAIS } = await getFeatureFlags();
  if (!FEATURE_PROFISSIONAIS) notFound();

  const { TEXTOS } = await getSiteConfig();
  const profissionais = await getProfissionaisUnificados();

  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header />

      <section className="pageSection container">
        <span className="eyebrow" style={{ marginBottom: "0.75rem" }} data-editable="textos.medicosEyebrow">{TEXTOS?.medicosEyebrow}</span>
        <h1 className="responsiveTitle" style={{ marginBottom: "1.5rem" }} data-editable="textos.medicosTitulo">{TEXTOS?.medicosTitulo}</h1>
        <MedicosDirectory profissionais={profissionais} />
      </section>

      <Footer {...(await getUnidadesFooterProps())} />
    </main>
  );
}
