import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
    const token = request.cookies.get('token')?.value;
    const { pathname } = request.nextUrl;

    // If accessing dashboard without token, redirect to login
    if (pathname.startsWith('/dashboard') && !token) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // If accessing auth pages with token, redirect to dashboard
    if ((pathname === '/login' || pathname === '/register') && token) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/dashboard/:path*', '/login', '/register'],
};
