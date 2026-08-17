import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is required');
  return new TextEncoder().encode(secret);
}

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
    pathname === '/qr-login' ||                       // QR auto-login page
    pathname === '/api/auth/qr-login' ||              // QR auto-login API
    pathname === '/api/registration' || // submit registration (POST)
    pathname.startsWith('/api/registration/options') || // get options
    pathname.startsWith('/api/registration/check-phone') || // check phone
    pathname.startsWith('/api/auth/forgot-password') ||
    pathname.startsWith('/parent-report') ||
    pathname === '/api/settings/whatsapp/update-tunnel';

  if (isPublicPath) {
    return NextResponse.next();
  }

  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ success: false, error: 'غير مصرح بالدخول (Unauthorized)' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    if (!payload) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ success: false, error: 'جلسة الدخول غير صالحة' }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const role = payload.role as string;

    // Allowed paths for each role
    const isStudentPath = pathname.startsWith('/student-portal') || pathname.startsWith('/api/student-portal');
    const isParentPath = pathname.startsWith('/parent-portal') || pathname.startsWith('/api/parent-portal');
    const isCommonApi = pathname.startsWith('/api/auth');

    if (role === 'STUDENT' && !isStudentPath && !isCommonApi) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ success: false, error: 'غير مصرح لك بالوصول إلى هذا المسار' }, { status: 403 });
      }
      return NextResponse.redirect(new URL('/student-portal', request.url));
    }

    if (role === 'PARENT' && !isParentPath && !isCommonApi) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ success: false, error: 'غير مصرح لك بالوصول إلى هذا المسار' }, { status: 403 });
      }
      return NextResponse.redirect(new URL('/parent-portal', request.url));
    }

  } catch (err) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ success: false, error: 'جلسة الدخول منتهية أو غير صالحة' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};

