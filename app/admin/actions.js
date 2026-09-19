'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '../../lib/auth/guard';
import { saveContent } from '../../lib/store';
import { ICON_KEYS } from '../../lib/iconMap';

function str(formData, key) {
  return (formData.get(key) || '').toString().trim();
}

async function handleUploadedFile(file, prefix) {
  if (!file || typeof file === 'string' || !file.size) return null;
  const rawExt = (file.name || '').split('.').pop() || 'png';
  const ext = rawExt.toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
  const filename = `${prefix}-${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const { saveUpload } = await import('../../lib/store');
  return saveUpload(filename, buffer, file.type || 'application/octet-stream');
}

export async function updateIdentidade(formData) {
  await requireRole(['admin', 'superadmin']);

  await saveContent({
    clinicNome: str(formData, 'clinicNome'),
    horarioAtendimento: str(formData, 'horarioAtendimento'),
    instagramHandle: str(formData, 'instagramHandle'),
    instagramUrl: str(formData, 'instagramUrl'),
    unidades: {
      matriz: {
        telefoneDisplay: str(formData, 'matrizTelefone'),
        whatsappUrl: str(formData, 'matrizWhatsapp'),
        endereco: str(formData, 'matrizEndereco'),
      },
      filial: {
        telefoneDisplay: str(formData, 'filialTelefone'),
        whatsappUrl: str(formData, 'filialWhatsapp'),
        endereco: str(formData, 'filialEndereco'),
      },
    },
  });

  revalidatePath('/', 'layout');
}

export async function updateMarca(formData) {
  await requireRole(['admin', 'superadmin']);

  const logoUrl = await handleUploadedFile(formData.get('logoFile'), 'logo');
  const heroFotoUrl = await handleUploadedFile(formData.get('heroFile'), 'hero');

  const brand = {
    colorPrimary: str(formData, 'colorPrimary'),
    colorSecondary: str(formData, 'colorSecondary'),
  };
  if (logoUrl) brand.logoUrl = logoUrl;

  const partial = { brand };
  if (heroFotoUrl) partial.heroFotoUrl = heroFotoUrl;

  await saveContent(partial);
  revalidatePath('/', 'layout');
}

export async function updateTextos(formData) {
  await requireRole(['admin', 'superadmin']);

  await saveContent({
    textos: {
      heroTituloLinha1: str(formData, 'heroTituloLinha1'),
      heroTituloLinha2: str(formData, 'heroTituloLinha2'),
      heroSubtitle: str(formData, 'heroSubtitle'),
      sobreTitulo: str(formData, 'sobreTitulo'),
      sobreDescricao: str(formData, 'sobreDescricao'),
      footerDescricao: str(formData, 'footerDescricao'),
      ctaComAgendamentoTitulo: str(formData, 'ctaComAgendamentoTitulo'),
      ctaComAgendamentoTexto: str(formData, 'ctaComAgendamentoTexto'),
      ctaSemAgendamentoTitulo: str(formData, 'ctaSemAgendamentoTitulo'),
      ctaSemAgendamentoTexto: str(formData, 'ctaSemAgendamentoTexto'),

      navSobre: str(formData, 'navSobre'),
      navEspecialidades: str(formData, 'navEspecialidades'),
      navProfissionais: str(formData, 'navProfissionais'),
      navOrcamento: str(formData, 'navOrcamento'),
      navChat: str(formData, 'navChat'),
      navContato: str(formData, 'navContato'),
      navAreaCliente: str(formData, 'navAreaCliente'),
      botaoAgendarConsulta: str(formData, 'botaoAgendarConsulta'),
      botaoFalarWhatsapp: str(formData, 'botaoFalarWhatsapp'),
      botaoFalarWhatsappRodape: str(formData, 'botaoFalarWhatsappRodape'),

      agendamentoEyebrow: str(formData, 'agendamentoEyebrow'),
      agendamentoTitulo: str(formData, 'agendamentoTitulo'),

      orcamentoTitulo: str(formData, 'orcamentoTitulo'),
      orcamentoIntro: str(formData, 'orcamentoIntro'),

      medicosEyebrow: str(formData, 'medicosEyebrow'),
      medicosTitulo: str(formData, 'medicosTitulo'),

      centralTitulo: str(formData, 'centralTitulo'),
      centralTabNovo: str(formData, 'centralTabNovo'),
      centralTabConsultas: str(formData, 'centralTabConsultas'),

      areaClienteTitulo: str(formData, 'areaClienteTitulo'),
      areaClienteSubtitulo: str(formData, 'areaClienteSubtitulo'),
    },
  });

  revalidatePath('/', 'layout');
}

export async function updateEspecialidades(formData) {
  await requireRole(['admin', 'superadmin']);

  let parsed = [];
  try {
    parsed = JSON.parse(formData.get('especialidadesJson') || '[]');
  } catch {
    parsed = [];
  }

  const especialidades = (Array.isArray(parsed) ? parsed : [])
    .filter((item) => item && String(item.nome || '').trim())
    .map((item, idx) => ({
      id: idx + 1,
      nome: String(item.nome).trim(),
      descricao: String(item.descricao || '').trim(),
      icone: ICON_KEYS.includes(item.icone) ? item.icone : 'Stethoscope',
    }));

  await saveContent({ especialidades });
  revalidatePath('/', 'layout');
}
