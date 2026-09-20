import { getCurrentTenant } from '../../../lib/tenant';
import LoginForm from './LoginForm';

export default async function AdminLoginPage() {
  const tenant = await getCurrentTenant();
  return <LoginForm tenantNome={tenant?.nome || null} />;
}
