import { notFound } from "next/navigation";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import BudgetWizard from "../../components/BudgetWizard";
import { getFeatureFlags } from "../../lib/featureFlags";
import { getUnidadesFooterProps } from "../../lib/unidades";
import { getSiteConfig } from "../../lib/config";

export async function generateMetadata() {
  const { CLINIC_NOME } = await getSiteConfig();
  return {
    title: `Orçamento de Exames - ${CLINIC_NOME}`,
    description: "Gere seu orçamento de exames e consultas de forma fácil, rápida e online.",
  };
}

export default async function Orcamento() {
  const { FEATURE_ORCAMENTO } = await getFeatureFlags();
  if (!FEATURE_ORCAMENTO) notFound();

  const { TEXTOS } = await getSiteConfig();

  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header />

      <section className="pageSection container">
        <div className="contentCard" style={{ maxWidth: "1200px", background: "var(--surface)", border: "1px solid var(--line)", boxShadow: "var(--shadow-sm)" }}>
          <h2 className="text-center responsiveTitle" data-editable="textos.orcamentoTitulo">
            {TEXTOS?.orcamentoTitulo}
          </h2>
          <p className="text-center" style={{ color: "var(--text-muted)", marginBottom: "2rem", marginTop: "-1.5rem", maxWidth: "600px", marginLeft: "auto", marginRight: "auto" }} data-editable="textos.orcamentoIntro">
            {TEXTOS?.orcamentoIntro}
          </p>
          <BudgetWizard />
        </div>
      </section>

      <Footer {...(await getUnidadesFooterProps())} />
    </main>
  );
}
