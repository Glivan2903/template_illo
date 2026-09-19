import { NextResponse } from 'next/server';
import { getUnidadesFooterProps } from '../../../lib/unidades';

// Público (sem auth) — só diz quais unidades têm backend configurado, pra
// páginas client-side (ex.: /area-cliente) saberem quais blocos exibir sem
// precisar de acesso direto a API_BASE_URL_MATRIZ/FILIAL (server-only).
export async function GET() {
  return NextResponse.json(await getUnidadesFooterProps());
}
