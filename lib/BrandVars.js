'use client';

import { useEffect } from 'react';
import { useSiteConfig } from './siteConfigContext';

// app/layout.js aplica --brand-primary/--brand-secondary como estilo inline
// do <html> gerado no servidor — fora da árvore React, então uma
// atualização do contexto (via useSiteConfig) nunca chegava até ali. Isso
// fazia o preview ao vivo do /admin (que só atualiza o contexto via
// postMessage) refletir textos/imagens mas não cores. Este componente
// mantém as duas custom properties sincronizadas com o valor atual do
// contexto sempre que ele mudar — sem efeito em uma visita normal (mesmo
// valor que o servidor já tinha aplicado).
export default function BrandVars() {
  const { BRAND_COLOR_PRIMARY, BRAND_COLOR_SECONDARY } = useSiteConfig();

  useEffect(() => {
    document.documentElement.style.setProperty('--brand-primary', BRAND_COLOR_PRIMARY);
    document.documentElement.style.setProperty('--brand-secondary', BRAND_COLOR_SECONDARY);
  }, [BRAND_COLOR_PRIMARY, BRAND_COLOR_SECONDARY]);

  return null;
}
