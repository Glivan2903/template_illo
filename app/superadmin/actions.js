'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '../../lib/auth/guard';
import {
  createEmpresa,
  updateEmpresa,
  updateEmpresaModulos,
  regenerarSenhaEmpresa,
  deleteEmpresa,
  empresaLink,
} from '../../lib/platform/db';
import { getRequestOrigin } from '../../lib/tenant';

function str(formData, key) {
  return (formData.get(key) || '').toString().trim();
}

function checked(formData, key) {
  return formData.get(key) === 'on';
}

export async function createEmpresaAction(formData) {
  await requireRole(['superadmin']);

  try {
    const empresa = await createEmpresa({
      nome: str(formData, 'nome'),
      dominioCustomizado: str(formData, 'dominioCustomizado'),
      apiBaseUrl: str(formData, 'apiBaseUrl'),
      openaiApiKey: str(formData, 'openaiApiKey'),
      openaiModel: str(formData, 'openaiModel'),
    });
    revalidatePath('/superadmin', 'layout');
    const origin = await getRequestOrigin();
    return {
      ok: true,
      empresa: {
        slug: empresa.slug,
        nome: empresa.nome,
        adminUser: empresa.admin_user,
        adminPassword: empresa.admin_password,
        link: empresaLink(empresa, origin),
      },
    };
  } catch (error) {
    return { ok: false, erro: error.message || 'Não foi possível criar a empresa.' };
  }
}

export async function updateEmpresaAction(formData) {
  await requireRole(['superadmin']);

  try {
    await updateEmpresa(str(formData, 'slug'), {
      nome: str(formData, 'nome'),
      dominioCustomizado: str(formData, 'dominioCustomizado'),
      apiBaseUrl: str(formData, 'apiBaseUrl'),
      openaiApiKey: str(formData, 'openaiApiKey'),
      openaiModel: str(formData, 'openaiModel'),
    });
    revalidatePath('/superadmin', 'layout');
    return { ok: true };
  } catch (error) {
    return { ok: false, erro: error.message || 'Não foi possível salvar a empresa.' };
  }
}

export async function updateModulosAction(formData) {
  await requireRole(['superadmin']);

  await updateEmpresaModulos(str(formData, 'slug'), {
    sobre: checked(formData, 'sobre'),
    especialidades: checked(formData, 'especialidades'),
    cta: checked(formData, 'cta'),
    profissionais: checked(formData, 'profissionais'),
    agendamentoPorProfissional: checked(formData, 'agendamentoPorProfissional'),
    orcamento: checked(formData, 'orcamento'),
    agendamento: checked(formData, 'agendamento'),
    areaCliente: checked(formData, 'areaCliente'),
    centralAgendamento: checked(formData, 'centralAgendamento'),
    chat: checked(formData, 'chat'),
    chatFlutuante: checked(formData, 'chatFlutuante'),
  });

  revalidatePath('/superadmin', 'layout');
  return { ok: true };
}

export async function regenerarSenhaAction(formData) {
  await requireRole(['superadmin']);

  const senha = regenerarSenhaEmpresa(str(formData, 'slug'));
  revalidatePath('/superadmin', 'layout');
  return { ok: true, senha };
}

// Marca (logotipo + cores) de uma empresa não passa por Server Action —
// vai por app/api/superadmin/upload-logo/route.js (upload de arquivo de
// verdade, sem o limite de payload/aninhamento que base64 grande estoura
// numa Server Action).

export async function deleteEmpresaAction(formData) {
  await requireRole(['superadmin']);

  await deleteEmpresa(str(formData, 'slug'));
  revalidatePath('/superadmin', 'layout');
  return { ok: true };
}
