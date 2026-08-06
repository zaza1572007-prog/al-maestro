import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'almaestro-secret-key-2026');

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;

  // Public paths
  const pathname = request.nextUrl.pathname;
  const isPublicPath =
    pathname === '/login' ||
    pathname === '/api/auth/login' ||
    pathname === '/register' ||
    pathname === '/select-role' ||
    pathname === '/forgot-password' ||
    pathname === '/api/registration' || // submit registration (POST)
    pathname.startsWith('/api/registration/options') || // get options
    pathname.startsWith('/api/registration/check-phone') || // check phone
    pathname.startsWith('/api/auth/forgot-password');

  if (isPublicPath) {
    return NextResponse.next();
  }

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (!payload) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const role = payload.role as string;
    const pathname = request.nextUrl.pathname;

    // Allowed paths for each role
    const isStudentPath = pathname.startsWith('/student-portal') || pathname.startsWith('/api/student-portal');
    const isParentPath = pathname.startsWith('/parent-portal') || pathname.startsWith('/api/parent-portal');
    const isCommonApi = pathname.startsWith('/api/auth');

    if (role === 'STUDENT' && !isStudentPath && !isCommonApi) {
      return NextResponse.redirect(new URL('/student-portal', request.url));
    }

    if (role === 'PARENT' && !isParentPath && !isCommonApi) {
      return NextResponse.redirect(new URL('/parent-portal', request.url));
    }

  } catch (err) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};

