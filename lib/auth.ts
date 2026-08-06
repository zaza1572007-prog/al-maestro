import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'almaestro-secret-key-2026'
);

export interface JWTPayload {
  userId: string;
  role: 'OWNER' | 'ASSISTANT' | 'STUDENT' | 'PARENT';
  phone: string;
  name?: string;
  passwordHash?: string;
}

export async function signToken(payload: JWTPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as JWTPayload;
  } catch (error) {
    return null;
  }
}

export async function verifyStaff(req: Request): Promise<JWTPayload | null> {
  try {
    const cookieHeader = req.headers.get('cookie') || '';
    const token = cookieHeader.split('auth-token=')[1]?.split(';')[0];
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
