import { getCurrentTenant } from '../../../lib/tenant';
import { getContent } from '../../../lib/store';
import LoginForm from './LoginForm';

export default async function AdminLoginPage() {
  const tenant = await getCurrentTenant();
  const content = await getContent();

  return <LoginForm tenantNome={tenant?.nome || null} logoUrl={content.brand.logoUrl} />;
}
