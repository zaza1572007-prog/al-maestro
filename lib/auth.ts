import { SignJWT, jwtVerify } from 'jose';
import { ENV } from '@/lib/env';

function getJwtSecret(): Uint8Array {
  return ENV.JWT_SECRET_BYTES;
}

/**
 * Standard bcrypt salt rounds: fixed at 10 to balance maximum security with CPU efficiency.
 */
export const BCRYPT_SALT_ROUNDS = 10;

export interface JWTPayload {
  userId: string;
  role: 'OWNER' | 'ASSISTANT' | 'STUDENT' | 'PARENT';
  phone?: string;
  name?: string;
}

export async function signToken(payload: JWTPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getJwtSecret());
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

import { prisma } from '@/lib/prisma';

export async function verifyStaff(req: Request): Promise<JWTPayload | null> {
  try {
    const cookieHeader = req.headers.get('cookie') || '';
    const authHeader = req.headers.get('authorization') || '';
    
    let token = cookieHeader.split('auth-token=')[1]?.split(';')[0];
    if (!token && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7).trim();
    }
    
    if (!token) return null;

    const payload = await verifyToken(token);
    if (!payload) return null;

    if (payload.role === 'OWNER') {
      return payload;
    }

    if (payload.role === 'ASSISTANT') {
      const dbUser = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { isActive: true }
      });
      if (dbUser && dbUser.isActive) {
        return payload;
      }
      return null;
    }

    return null;
  } catch {
    return null;
  }
}

import { hasPermission } from '@/lib/permissions';

export async function verifyOwner(req: Request): Promise<JWTPayload | null> {
  const staff = await verifyStaff(req);
  if (staff && staff.role === 'OWNER') {
    return staff;
  }
  return null;
}

/**
 * Verifies that the incoming request is authenticated as staff (OWNER or ASSISTANT)
 * and holds the required permission. OWNER bypasses all permission checks.
 */
export async function verifyStaffWithPermission(
  req: Request,
  requiredPermission?: string
): Promise<JWTPayload | null> {
  const staff = await verifyStaff(req);
  if (!staff) return null;

  // OWNER always has full access
  if (staff.role === 'OWNER') {
    return staff;
  }

  // If no specific permission is required, any active staff is allowed
  if (!requiredPermission) {
    return staff;
  }

  // Verify Assistant's permissions against the database
  if (staff.role === 'ASSISTANT') {
    const dbUser = await prisma.user.findUnique({
      where: { id: staff.userId },
      select: { isActive: true, permissions: true, role: true },
    });
    if (dbUser && dbUser.isActive && hasPermission(dbUser, requiredPermission)) {
      return staff;
    }
  }

  return null;
}

