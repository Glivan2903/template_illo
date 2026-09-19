import { getContent, getSettings } from '../../lib/store';
import { getSession } from '../../lib/auth/guard';
import { logout } from './login/actions';
import { updateIdentidade, updateMarca, updateTextos, updateEspecialidades } from './actions';
import AdminWorkspace from './AdminWorkspace';

export default async function AdminPage() {
  const content = await getContent();
  const settings = await getSettings();
  const session = await getSession();

  return (
    <AdminWorkspace
      initialContent={content}
      featureFlags={settings.featureFlags}
      isSuperadmin={session?.role === 'superadmin'}
      logoutAction={logout}
      actions={{ updateIdentidade, updateMarca, updateTextos, updateEspecialidades }}
    />
  );
}
