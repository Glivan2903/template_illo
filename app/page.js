import styles from "./page.module.css";
import Header from "../components/Header";
import HeroSection from "../components/HeroSection";
import AboutSection from "../components/AboutSection";
import SpecialtiesSection from "../components/SpecialtiesSection";
import Footer from "../components/Footer";
import CTASection from "../components/CTASection";
import { getUnidadesFooterProps } from "../lib/unidades";
import { getFeatureFlags } from "../lib/featureFlags";

export default async function Home() {
  const unidadesProps = await getUnidadesFooterProps();
  const { FEATURE_SOBRE, FEATURE_ESPECIALIDADES, FEATURE_CTA } = await getFeatureFlags();

  return (
    <main className={styles.main}>
      <Header />
      <HeroSection />
      {FEATURE_CTA && <CTASection />}
      {FEATURE_SOBRE && <AboutSection {...unidadesProps} />}
      {FEATURE_ESPECIALIDADES && <SpecialtiesSection />}
      <Footer {...unidadesProps} />
    </main>
  );
}
