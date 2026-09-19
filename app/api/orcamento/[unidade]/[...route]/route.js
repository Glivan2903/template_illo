import { NextResponse } from 'next/server';
import { clinvidaRequest } from '../../../../../lib/clinvida';

export async function GET(request, { params }) {
  const { unidade, route } = await params;
  const path = route.join('/');

  const { searchParams } = new URL(request.url);
  const queryString = searchParams.toString();
  const fullPath = `${path}${queryString ? `?${queryString}` : ''}`;

  try {
    const data = await clinvidaRequest(unidade, fullPath, { namespace: 'orcamento' });
    return NextResponse.json(data);
  } catch (error) {
    console.error('API Proxy GET Error (Orçamento):', error);
    return NextResponse.json({ error: 'Erro ao conectar com o servidor' }, { status: 500 });
  }
}
