import { NextResponse } from 'next/server';
import { requireRole } from '../../../../lib/auth/guard';
import { updateEmpresaBranding } from '../../../../lib/platform/db';
import { tenantUploadsDir, tenantUploadsUrlPrefix } from '../../../../lib/tenant';
import { saveUpload } from '../../../../lib/store/sqliteDriver';

// Mesmo motivo de app/api/admin/upload-image/route.js: upload de logotipo
// (superadmin editando a marca de uma empresa) por rota de API comum, não
// Server Action — evita o limite de payload e o teto de aninhamento do
// protocolo Flight pra strings grandes (base64 de imagem).
export async function POST(request) {
  try {
    await requireRole(['superadmin']);
  } catch {
    return NextResponse.json({ ok: false, erro: 'Não autorizado.' }, { status: 401 });
  }

  const formData = await request.formData();
  const slug = (formData.get('slug') || '').toString().trim();
  const colorPrimary = (formData.get('colorPrimary') || '').toString().trim();
  const colorSecondary = (formData.get('colorSecondary') || '').toString().trim();
  const file = formData.get('file');

  if (!slug) {
    return NextResponse.json({ ok: false, erro: 'Empresa inválida.' }, { status: 400 });
  }

  let logoUrl = null;
  if (file && typeof file !== 'string') {
    const rawExt = (file.name || '').split('.').pop() || 'png';
    const ext = rawExt.toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
    const filename = `logo-${Date.now()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await saveUpload(tenantUploadsDir(slug), filename, buffer);
    logoUrl = `${tenantUploadsUrlPrefix(slug)}/${filename}`;
  }

  await updateEmpresaBranding(slug, { logoUrl, colorPrimary, colorSecondary });

  return NextResponse.json({ ok: true, logoUrl });
}
