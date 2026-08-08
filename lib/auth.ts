import { SignJWT, jwtVerify } from 'jose';

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.trim().length < 32) {
    throw new Error('FATAL SECURITY ERROR: JWT_SECRET environment variable is missing or too weak (min 32 chars required).');
  }
  return new TextEncoder().encode(secret);
}

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

    if (payload.role === 'OWNER' || payload.role === 'ASSISTANT') {
      return payload;
    }
    return null;
  } catch {
    return null;
  }
}
