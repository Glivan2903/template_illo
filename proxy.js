import { NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME, verifySessionToken } from './lib/auth/session';
import { getEmpresaByHost, isPlatformRootHost } from './lib/platform/db';
import { normalizeHost } from './lib/tenant';

// Multi-tenant: cada empresa mora num subdomínio de PLATFORM_DOMAIN (ou num
// domínio próprio cadastrado no /superadmin); o domínio raiz da plataforma
// (só PLATFORM_DOMAIN, ou qualquer host quando ela não está configurada,
// como em dev local) é onde vive o /superadmin. Proxy roda em runtime
// Node.js por padrão no Next 16, então pode acessar o SQLite diretamente
// aqui (ver lib/platform/db.js).
export async function proxy(request) {
  const { pathname } = request.nextUrl;
  const host = normalizeHost(request.headers.get('host'));
  const isRootHost = isPlatformRootHost(host);

  if (pathname === '/admin/login') {
    return NextResponse.next();
  }

  // /api/admin/* e /api/superadmin/* (rotas de upload — ver
  // app/api/admin/upload-image, app/api/superadmin/upload-logo) contam
  // como parte da respectiva área pra fins de autenticação: mesma
  // exigência de sessão, e sem isso cairiam no redirect genérico pro
  // domínio raiz/`/superadmin` mais abaixo, quebrando o upload.
  const isSuperadminArea = pathname.startsWith('/superadmin') || pathname.startsWith('/api/superadmin');
  const isAdminArea = pathname.startsWith('/admin') || pathname.startsWith('/api/admin');

  if (isSuperadminArea) {
    if (!isRootHost) {
      // /superadmin só existe no domínio raiz — numa empresa, esse caminho
      // não tem sentido (evita expor a rota por engano num subdomínio).
      return NextResponse.redirect(new URL('/', request.url));
    }
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = await verifySessionToken(token);
    if (!session || session.role !== 'superadmin') {
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  if (isAdminArea) {
    if (isRootHost) {
      // Não existe "admin" no domínio raiz — só superadmin. Manda pro
      // login, que já resolve certo a partir do host.
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(loginUrl);
    }
    const empresa = getEmpresaByHost(host);
    if (!empresa) {
      return new NextResponse('Empresa não encontrada para este domínio.', { status: 404 });
    }
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = await verifySessionToken(token);
    if (!session || session.role !== 'admin' || session.tenantSlug !== empresa.slug) {
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // Demais rotas: no domínio raiz da plataforma não existe "site" nenhum
  // pra mostrar (o conteúdo institucional é sempre de uma empresa) — manda
  // pro /superadmin. Rotas de infra (ex.: checagem de domínio do Caddy)
  // ficam de fora via matcher, abaixo.
  if (isRootHost) {
    return NextResponse.redirect(new URL('/superadmin', request.url));
  }

  // Host de empresa, mas que não bate com nenhuma cadastrada (subdomínio
  // errado, ou domínio próprio removido/ainda não propagado).
  if (!getEmpresaByHost(host)) {
    return new NextResponse('Empresa não encontrada para este domínio.', { status: 404 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/tenant/).*)'],
};
