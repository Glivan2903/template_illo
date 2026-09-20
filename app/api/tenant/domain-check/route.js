import { NextResponse } from 'next/server';
import { getEmpresaByHost, isPlatformRootHost } from '../../../../lib/platform/db';
import { normalizeHost } from '../../../../lib/tenant';

// Endpoint "ask" do TLS on-demand do Caddy (ver Caddyfile): antes de pedir
// um certificado Let's Encrypt pra um host que ainda não conhece, o Caddy
// confere aqui se esse host é o domínio raiz da plataforma ou pertence a
// alguma empresa cadastrada (subdomínio ou domínio próprio) — sem isso,
// qualquer domínio que alguém apontasse pro servidor conseguiria emitir
// certificado através dele.
export async function GET(request) {
  const url = new URL(request.url);
  const domain = normalizeHost(url.searchParams.get('domain'));
  if (!domain) return new NextResponse('domínio ausente', { status: 400 });
  if (isPlatformRootHost(domain) || getEmpresaByHost(domain)) {
    return new NextResponse('ok', { status: 200 });
  }
  return new NextResponse('domínio desconhecido', { status: 403 });
}
