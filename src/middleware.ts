import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const { pathname } = req.nextUrl;
    if (pathname.startsWith('/admin') && token?.role !== 'ADMIN')
      return NextResponse.redirect(new URL('/', req.url));
    if ((pathname.startsWith('/owner')) && !['OWNER','ADMIN'].includes(token?.role as string))
      return NextResponse.redirect(new URL('/', req.url));
    return NextResponse.next();
  },
  { callbacks: { authorized: ({ token, req }) => {
    const { pathname } = req.nextUrl;
    if (['/dashboard','/admin','/owner','/booking'].some(p=>pathname.startsWith(p))) return !!token;
    return true;
  }}}
);
export const config = { matcher: ['/dashboard/:path*','/admin/:path*','/owner/:path*','/booking/:path*'] };
