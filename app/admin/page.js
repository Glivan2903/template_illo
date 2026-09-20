import { getContent, getSettings } from '../../lib/store';
import { logout } from './login/actions';
import {
  updateField,
  updateCores,
  addEspecialidade,
  removeEspecialidade,
  updateEspecialidadeField,
  toggleLinkProfissional,
  updateLinkProfissionalCentro,
} from './actions';
import AdminWorkspace from './AdminWorkspace';

export default async function AdminPage() {
  const content = await getContent();
  const settings = await getSettings();

  return (
    <AdminWorkspace
      initialContent={content}
      featureFlags={settings.featureFlags}
      logoutAction={logout}
      actions={{
        updateField,
        updateCores,
        addEspecialidade,
        removeEspecialidade,
        updateEspecialidadeField,
        toggleLinkProfissional,
        updateLinkProfissionalCentro,
      }}
    />
  );
}
