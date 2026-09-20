/** @type {import('next').NextConfig} */
const nextConfig = {
  // Gera .next/standalone (server + node_modules mínimos) — usado pelo
  // Dockerfile para uma imagem de produção enxuta (ver Dockerfile).
  output: 'standalone',
  experimental: {
    serverActions: {
      // Uploads de imagem (logo, foto da fachada) via Server Action chegam
      // como data URL em base64 — inflama ~33% o tamanho do arquivo, e o
      // limite padrão do Next pra uma Server Action é só 1MB. Sem isso,
      // qualquer imagem um pouco maior falha com "Body exceeded 1 MB
      // limit" mesmo estando dentro do limite de 5MB validado no cliente
      // (ver MAX_IMAGE_BYTES em lib/EditableOverlay.js e BrandSection.js).
      bodySizeLimit: '8mb',
    },
  },
};

export default nextConfig;
