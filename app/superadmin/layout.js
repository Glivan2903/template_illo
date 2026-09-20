import { logout } from '../admin/login/actions';
import SuperadminShell from './SuperadminShell';

export default function SuperadminLayout({ children }) {
  return <SuperadminShell logoutAction={logout}>{children}</SuperadminShell>;
}
