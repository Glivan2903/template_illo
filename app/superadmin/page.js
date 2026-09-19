import { getSettings, getStorageStatus } from '../../lib/store';
import { logout } from '../admin/login/actions';
import { updateModulos, updateIntegracoes } from './actions';
import SuperadminWorkspace from './SuperadminWorkspace';

export default async function SuperadminPage() {
  const settings = await getSettings();
  const storageStatus = getStorageStatus();

  return (
    <SuperadminWorkspace
      settings={settings}
      storageStatus={storageStatus}
      logoutAction={logout}
      actions={{ updateModulos, updateIntegracoes }}
    />
  );
}
