import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const maintenanceMode = process.env.MAINTENANCE_MODE === 'true';

  if (!maintenanceMode) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  // Allow critical paths even in maintenance
  const isAllowed =
    pathname.startsWith('/maintenance') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/robots.txt') ||
    pathname.startsWith('/opengraph-image');

  // Allow requests for files with extensions (assets)
  const hasExtension = /\.[a-zA-Z0-9]+$/.test(pathname);

  if (isAllowed || hasExtension) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = '/maintenance';
  return NextResponse.redirect(url);
}

// Apply to all paths except next/image optimizer, static files are allowed by extension rule above
export const config = {
  matcher: ['/((?!_next/image).*)'],
};


