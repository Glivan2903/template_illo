import { Figtree, Fraunces } from "next/font/google";
import "./globals.css";
import { getSiteConfig } from "../lib/config";
import { getFeatureFlags } from "../lib/featureFlags";
import { SiteConfigProvider } from "../lib/siteConfigContext";
import BrandVars from "../lib/BrandVars";
import EditableOverlay from "../lib/EditableOverlay";
import ChatWidget from "../components/chat/ChatWidget";
import { getCurrentTenant } from "../lib/tenant";

// Sem isso, o Next faz build estático de todas as páginas (nenhuma usa
// cookies()/headers()) e congela o conteúdo do content.json/settings.json
// no HTML gerado em `next build` — edições feitas depois em /admin e
// /superadmin nunca apareceriam em produção sem rebuild da imagem. Força
// renderização dinâmica (por request) em todo o site.
export const dynamic = 'force-dynamic';

const figtree = Figtree({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

// Serifa suave com curvas macias — troca a grotesca (propositalmente robusta,
// é literalmente o que "grotesque" significa em tipografia) por um traço
// mais refinado, sem perder personalidade.
const fraunces = Fraunces({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
});

// Nome da clínica vem de content.json (editável em /admin), por isso o
// metadata é gerado em runtime em vez de uma constante estática.
export async function generateMetadata() {
  const { CLINIC_NOME } = await getSiteConfig();
  return {
    title: CLINIC_NOME,
    description: `${CLINIC_NOME} — clínica médica com diversas especialidades e agendamento online.`,
    keywords: ["Clínica", "Saúde", "Agendamento Médico", CLINIC_NOME],
  };
}

export default async function RootLayout({ children }) {
  const tenant = await getCurrentTenant();
  const siteConfig = await getSiteConfig();
  const featureFlags = await getFeatureFlags();
  const providerValue = { ...siteConfig, ...featureFlags };

  return (
    <html
      lang="pt-BR"
      className={`${figtree.variable} ${fraunces.variable}`}
      style={{
        '--brand-primary': siteConfig.BRAND_COLOR_PRIMARY,
        '--brand-secondary': siteConfig.BRAND_COLOR_SECONDARY,
      }}
    >
      <body>
        <SiteConfigProvider value={providerValue}>
          <BrandVars />
          <EditableOverlay />
          {children}
          {tenant && featureFlags.FEATURE_CHAT_FLUTUANTE && <ChatWidget />}
        </SiteConfigProvider>
      </body>
    </html>
  );
}
