import { notFound } from "next/navigation";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import BookingWizard from "../../components/BookingWizard";
import { getFeatureFlags } from "../../lib/featureFlags";
import { getUnidadesFooterProps } from "../../lib/unidades";
import { getSiteConfig } from "../../lib/config";

export async function generateMetadata() {
  const { CLINIC_NOME } = await getSiteConfig();
  return {
    title: `Agendar Consulta - ${CLINIC_NOME}`,
    description: `Marque sua consulta ou exame na ${CLINIC_NOME} de forma fácil, rápida e online.`,
  };
}

export default async function Agendamento() {
  const { FEATURE_AGENDAMENTO } = await getFeatureFlags();
  if (!FEATURE_AGENDAMENTO) notFound();

  const { TEXTOS } = await getSiteConfig();

  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header />

      <section className="pageSection container">
        <div className="contentCard" style={{ maxWidth: "1200px", background: "var(--surface)", border: "1px solid var(--line)", boxShadow: "var(--shadow-sm)" }}>
          <span className="eyebrow text-center" style={{ display: "block" }} data-editable="textos.agendamentoEyebrow">{TEXTOS?.agendamentoEyebrow}</span>
          <h2 className="text-center responsiveTitle" data-editable="textos.agendamentoTitulo">
            {TEXTOS?.agendamentoTitulo}
          </h2>
          <BookingWizard />
        </div>
      </section>

      <Footer {...(await getUnidadesFooterProps())} />
    </main>
  );
}
