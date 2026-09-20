import { notFound } from 'next/navigation';
import { getEmpresaBySlug, getEmpresaSettings, getEmpresaContent, empresaLink } from '../../../../lib/platform/db';
import { getRequestOrigin } from '../../../../lib/tenant';
import { updateEmpresaAction, updateModulosAction, regenerarSenhaAction, deleteEmpresaAction } from '../../actions';
import EmpresaDetail from './EmpresaDetail';

export default async function EmpresaDetailPage({ params }) {
  const { slug } = await params;
  const empresa = getEmpresaBySlug(slug);
  if (!empresa) notFound();

  const origin = await getRequestOrigin();
  const settings = await getEmpresaSettings(slug);
  const content = await getEmpresaContent(slug);

  return (
    <EmpresaDetail
      empresa={{
        slug: empresa.slug,
        nome: empresa.nome,
        dominioCustomizado: empresa.dominio_customizado,
        adminUser: empresa.admin_user,
        adminPassword: empresa.admin_password,
        link: empresaLink(empresa, origin),
        settings,
        content,
      }}
      actions={{
        updateEmpresaAction,
        updateModulosAction,
        regenerarSenhaAction,
        deleteEmpresaAction,
      }}
    />
  );
}
