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

export default async function Agendamento({ searchParams }) {
  const { FEATURE_AGENDAMENTO } = await getFeatureFlags();
  if (!FEATURE_AGENDAMENTO) notFound();

  const { TEXTOS } = await getSiteConfig();

  // Chegando de um card em /medicos com o link direto por profissional
  // (ver MedicosDirectory linkAgendamentoDoProfissional) — pula pro passo
  // 3 do wizard já com centro/profissional escolhidos.
  const sp = await searchParams;
  const initialCentro =
    sp?.unidade && sp?.cen ? { unidade: sp.unidade, CEN_CODIGO: sp.cen, CEN_DESCRICAO: sp.cenNome || '' } : null;
  const initialProfissional =
    sp?.prof && initialCentro
      ? { PROF_CODIGO: sp.prof, CONS_CODIGO: sp.cons || '', PROF_ESTADO_CONS: sp.uf || '', PROF_NOME: sp.nome || '' }
      : null;

  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header />

      <section className="pageSection container">
        <div className="contentCard" style={{ maxWidth: "1200px", background: "var(--surface)", border: "1px solid var(--line)", boxShadow: "var(--shadow-sm)" }}>
          <span className="eyebrow text-center" style={{ display: "block" }} data-editable="textos.agendamentoEyebrow">{TEXTOS?.agendamentoEyebrow}</span>
          <h2 className="text-center responsiveTitle" data-editable="textos.agendamentoTitulo">
            {TEXTOS?.agendamentoTitulo}
          </h2>
          <BookingWizard initialCentro={initialCentro} initialProfissional={initialProfissional} />
        </div>
      </section>

      <Footer {...(await getUnidadesFooterProps())} />
    </main>
  );
}
