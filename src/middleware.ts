import { NextRequest, NextResponse } from 'next/server';

const PROTECTED_ROUTES = [
  '/dashboard',
  '/quick-check',
  '/my-money',
  '/savings',
  '/add-expense',
  '/can-i-spend',
  '/plan-ahead',
  '/opportunities',
  '/my-plan',
  '/action-plan',
  '/profile',
  '/upload',
  '/analyze',
  '/review',
  '/export',
  '/settings',
  '/income',
  '/expenses',
  '/what-if',
  '/resilience',
  '/credit',
  '/money-calendar',
  '/my-goals',
  '/help-safety',
];


const AUTH_PAGES = ['/login', '/signup'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const sessionCookie = req.cookies.get('flexifund_session')?.value;
  const hasSession = Boolean(sessionCookie && sessionCookie.trim().length > 0);

  // 1. Check Protected Routes
  const isProtected = PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  if (isProtected && !hasSession) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 2. Redirect logged-in users visiting login/signup to dashboard
  const isAuthPage = AUTH_PAGES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  if (isAuthPage && hasSession) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - api routes (handled individually)
     * - _next/static (static assets)
     * - _next/image (image optimization files)
     * - public assets (*.png, *.jpg, *.jpeg, *.webp, *.svg, *.traineddata, *.csv, favicon.ico)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|traineddata|csv)$).*)',
  ],
};
