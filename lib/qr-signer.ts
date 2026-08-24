import crypto from 'crypto';

const QR_SECRET = process.env.QR_SECRET || process.env.JWT_SECRET || 'al-maestro-super-secure-qr-secret-key-2026';

export interface QRPayload {
  studentId: string;
  ts: number;
  sig: string;
}

/**
 * Generates an HMAC-SHA256 signature for a student's QR payload.
 */
export function generateSignedStudentQR(studentId: string): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const dataToSign = `${studentId}:${timestamp}`;
  const hmac = crypto.createHmac('sha256', QR_SECRET).update(dataToSign).digest('hex').substring(0, 16);
  
  return JSON.stringify({
    studentId,
    ts: timestamp,
    sig: hmac,
  });
}

/**
 * Verifies a QR payload string (Supports both Signed HMAC QR and legacy raw student code/ID).
 */
export function verifyStudentQR(qrData: string): { valid: boolean; studentId: string; isLegacy: boolean; reason?: string } {
  if (!qrData) {
    return { valid: false, studentId: '', isLegacy: false, reason: 'كود الباركود فارغ' };
  }

  const trimmed = qrData.trim();

  // Try parsing as JSON (Signed Dynamic QR)
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed: QRPayload = JSON.parse(trimmed);
      if (!parsed.studentId || !parsed.ts || !parsed.sig) {
        return { valid: false, studentId: '', isLegacy: false, reason: 'صيغة كود التوقيع غير مكتملة' };
      }

      const dataToSign = `${parsed.studentId}:${parsed.ts}`;
      const expectedHmac = crypto.createHmac('sha256', QR_SECRET).update(dataToSign).digest('hex').substring(0, 16);

      if (crypto.timingSafeEqual(Buffer.from(parsed.sig), Buffer.from(expectedHmac))) {
        return { valid: true, studentId: parsed.studentId, isLegacy: false };
      } else {
        return { valid: false, studentId: parsed.studentId, isLegacy: false, reason: 'توقيع الكود غير مطابق أو تم التلاعب به' };
      }
    } catch {
      // Fallback if JSON parse failed
    }
  }

  // Legacy fallback: treat raw string as plain student code / UUID
  return { valid: true, studentId: trimmed, isLegacy: true };
}
