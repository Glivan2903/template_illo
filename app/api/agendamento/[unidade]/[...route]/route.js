import { NextResponse } from 'next/server';
import { clinvidaRequest } from '../../../../../lib/clinvida';

export async function GET(request, { params }) {
  const { unidade, route } = await params;
  const path = route.join('/');

  try {
    const data = await clinvidaRequest(unidade, path);
    return NextResponse.json(data);
  } catch (error) {
    console.error('API Proxy GET Error:', error);
    return NextResponse.json({ error: 'Erro ao conectar com o servidor' }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  const { unidade, route } = await params;
  const path = route.join('/');

  try {
    const body = await request.json();
    const data = await clinvidaRequest(unidade, path, { method: 'POST', body });
    return NextResponse.json(data);
  } catch (error) {
    console.error('API Proxy POST Error:', error);
    return NextResponse.json({ error: 'Erro ao conectar com o servidor' }, { status: 500 });
  }
}
