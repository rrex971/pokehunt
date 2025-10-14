import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';

export async function middleware(req: NextRequest) {
  const session = await getSession();
  const { pathname } = req.nextUrl;

  if (pathname === '/') {
    if (session.isAdmin) {
      return NextResponse.redirect(new URL('/admin', req.url));
    }
    if (session.teamId) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
    return NextResponse.redirect(new URL('/login', req.url));
  }

  if (pathname.startsWith('/catch')) {
    if (!session.teamId) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    const searchParams = req.nextUrl.searchParams;
    const pokemonHash = searchParams.get('p');

    if (!pokemonHash) {
      return NextResponse.json({ message: 'Missing Pokemon data' }, { status: 400 });
    }

    // Redirect to a client-side catching page. The catching page will
    // perform the POST to /api/catch from the browser (so cookies are
    // automatically included) and display the fullscreen animation before
    // navigating to the dashboard.
    const catchUrl = new URL('/catching', req.url);
    catchUrl.searchParams.set('p', pokemonHash);
    return NextResponse.redirect(catchUrl);
  }

  if (pathname.startsWith('/gym')) {
    if (!session.teamId) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    const searchParams = req.nextUrl.searchParams;
    const gymHash = searchParams.get('p');

    if (!gymHash) {
      return NextResponse.json({ message: 'Missing gym data' }, { status: 400 });
    }

    const gymUrl = new URL('/gym-catching', req.url);
    gymUrl.searchParams.set('p', gymHash);
    return NextResponse.redirect(gymUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/catch', '/gym'],
};
