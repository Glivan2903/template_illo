'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '../../lib/auth/guard';
import { saveSettings } from '../../lib/store';

function checked(formData, key) {
  return formData.get(key) === 'on';
}

function str(formData, key) {
  return (formData.get(key) || '').toString().trim();
}

export async function updateModulos(formData) {
  await requireRole(['superadmin']);

  await saveSettings({
    featureFlags: {
      sobre: checked(formData, 'sobre'),
      especialidades: checked(formData, 'especialidades'),
      cta: checked(formData, 'cta'),
      profissionais: checked(formData, 'profissionais'),
      orcamento: checked(formData, 'orcamento'),
      agendamento: checked(formData, 'agendamento'),
      areaCliente: checked(formData, 'areaCliente'),
      centralAgendamento: checked(formData, 'centralAgendamento'),
      chat: checked(formData, 'chat'),
      chatFlutuante: checked(formData, 'chatFlutuante'),
    },
  });

  revalidatePath('/', 'layout');
}

export async function updateIntegracoes(formData) {
  await requireRole(['superadmin']);

  await saveSettings({
    unidades: {
      matriz: { apiBaseUrl: str(formData, 'matrizApiBaseUrl') },
      filial: { apiBaseUrl: str(formData, 'filialApiBaseUrl') },
    },
  });

  revalidatePath('/', 'layout');
}
