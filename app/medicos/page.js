import { notFound } from "next/navigation";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import MedicosDirectory from "../../components/MedicosDirectory";
import { getProfissionaisUnificados, identidadeProfissional } from "../../lib/profissionais";
import { getFeatureFlags } from "../../lib/featureFlags";
import { getUnidadesFooterProps } from "../../lib/unidades";
import { getSiteConfig } from "../../lib/config";
import { getContent } from "../../lib/store";

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const { CLINIC_NOME } = await getSiteConfig();
  return {
    title: `Nossos Profissionais - ${CLINIC_NOME}`,
    description: `Conheça os médicos e profissionais da ${CLINIC_NOME} e agende sua consulta diretamente.`,
  };
}

export default async function Medicos() {
  const { FEATURE_PROFISSIONAIS, FEATURE_AGENDAMENTO_POR_PROFISSIONAL } = await getFeatureFlags();
  if (!FEATURE_PROFISSIONAIS) notFound();

  const { TEXTOS } = await getSiteConfig();
  const [profissionaisBrutos, content] = await Promise.all([getProfissionaisUnificados(), getContent()]);
  const desativados = new Set(content.profissionaisLinksDesativados || []);
  const centroEscolhido = content.profissionaisLinkCentro || {};
  const profissionais = profissionaisBrutos.map((prof) => {
    const identidade = identidadeProfissional(prof);
    const cenCodigoEscolhido = centroEscolhido[identidade] || prof.especialidades[0].cenCodigo;
    return {
      ...prof,
      linkAtivo: !desativados.has(identidade),
      centroEscolhido:
        prof.especialidades.find((e) => e.cenCodigo === cenCodigoEscolhido) || prof.especialidades[0],
    };
  });

  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header />

      <section className="pageSection container">
        <span className="eyebrow" style={{ marginBottom: "0.75rem" }} data-editable="textos.medicosEyebrow">{TEXTOS?.medicosEyebrow}</span>
        <h1 className="responsiveTitle" style={{ marginBottom: "1.5rem" }} data-editable="textos.medicosTitulo">{TEXTOS?.medicosTitulo}</h1>
        <MedicosDirectory profissionais={profissionais} linkPorProfissional={FEATURE_AGENDAMENTO_POR_PROFISSIONAL} />
      </section>

      <Footer {...(await getUnidadesFooterProps())} />
    </main>
  );
}
