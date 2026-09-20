import { listEmpresas, empresaLink } from '../../../lib/platform/db';
import { getRequestOrigin } from '../../../lib/tenant';
import { createEmpresaAction } from '../actions';
import EmpresasList from './EmpresasList';

export default async function EmpresasPage() {
  const origin = await getRequestOrigin();
  const rows = listEmpresas().map((empresa) => ({
    slug: empresa.slug,
    nome: empresa.nome,
    dominioCustomizado: empresa.dominio_customizado,
    link: empresaLink(empresa, origin),
    adminUser: empresa.admin_user,
    adminPassword: empresa.admin_password,
  }));

  return <EmpresasList empresas={rows} actions={{ createEmpresaAction }} />;
}
