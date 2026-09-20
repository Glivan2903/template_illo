import { NextResponse } from 'next/server';
import { requireRole } from '../../../../lib/auth/guard';
import { saveContent, saveUpload } from '../../../../lib/store';

// Constrói { a: { b: { c: valor } } } a partir de ['a','b','c'] — mesmo
// helper de app/admin/actions.js (saveContent faz deep-merge com o resto).
function buildPartial(pathParts, value) {
  if (pathParts.length === 0) return value;
  return { [pathParts[0]]: buildPartial(pathParts.slice(1), value) };
}

// Upload de imagem do preview inline (logo, foto da fachada) via rota de
// API comum (multipart/form-data), não Server Action: Server Actions têm
// um limite de payload (1MB por padrão) e, mesmo aumentado, o protocolo
// Flight tem um teto de aninhamento que strings/base64 grandes estouram
// ("Maximum array nesting exceeded") — upload de arquivo de verdade não
// tem esse problema.
export async function POST(request) {
  let session;
  try {
    session = await requireRole(['admin']);
  } catch {
    return NextResponse.json({ ok: false, erro: 'Não autorizado.' }, { status: 401 });
  }
  void session;

  const formData = await request.formData();
  const file = formData.get('file');
  const field = (formData.get('field') || '').toString();

  if (!file || typeof file === 'string' || !field) {
    return NextResponse.json({ ok: false, erro: 'Requisição inválida.' }, { status: 400 });
  }

  const rawExt = (file.name || '').split('.').pop() || 'png';
  const ext = rawExt.toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
  const prefix = field.toLowerCase().includes('logo') ? 'logo' : 'hero';
  const filename = `${prefix}-${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const url = await saveUpload(filename, buffer, file.type || 'application/octet-stream');
  await saveContent(buildPartial(field.split('.'), url));

  return NextResponse.json({ ok: true, url });
}
