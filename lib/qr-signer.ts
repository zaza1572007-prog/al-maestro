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

      const sigBuf = Buffer.from(parsed.sig);
      const expectedBuf = Buffer.from(expectedHmac);

      if (sigBuf.length === expectedBuf.length && crypto.timingSafeEqual(sigBuf, expectedBuf)) {
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

/**
 * Normalizes and extracts all possible candidate student/parent identifiers from any scanned string
 * (URLs, URL parameters, Arabic keyboard translations, prefixes, and plain codes).
 */
export function extractCodeCandidates(rawInput: string): string[] {
  if (!rawInput) return [];
  const candidates = new Set<string>();
  const trimmed = rawInput.trim();
  candidates.add(trimmed);

  // 1. Arabic keyboard layout translation
  const arabicMap: Record<string, string> = {
    'ض': 'q', 'ص': 'w', 'ث': 'e', 'ق': 'r', 'ف': 't', 'غ': 'y', 'ع': 'u', 'ه': 'i', 'خ': 'o', 'ح': 'p',
    'ج': '[', 'د': ']', 'ش': 'a', 'س': 's', 'ي': 'd', 'ب': 'f', 'ل': 'g', 'ا': 'h', 'ت': 'j', 'ن': 'k',
    'م': 'l', 'ك': ';', 'ط': "'", 'ئ': 'z', 'ء': 'x', 'ؤ': 'c', 'ر': 'v', 'لا': 'b', 'ى': 'n', 'ة': 'm',
    'و': ',', 'ز': '.', 'ظ': '/', '؟': '?', '،': ',', '؛': ';', 'ـ': '_',
    'أ': 's', 'إ': 'u', 'آ': 'n', 'لإ': 't', 'لأ': 'g', 'لآ': 'b'
  };

  const translateArabic = (str: string): string => {
    let result = '';
    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      if (i < str.length - 1 && arabicMap[char + str[i + 1]]) {
        result += arabicMap[char + str[i + 1]];
        i++;
      } else if (arabicMap[char]) {
        result += arabicMap[char];
      } else {
        result += char;
      }
    }
    return result;
  };

  const translated = translateArabic(trimmed);
  if (translated !== trimmed) {
    candidates.add(translated);
    candidates.add(translated.toUpperCase());
  }

  // 2. Extract from URL patterns in both raw and translated strings
  const parseUrlToken = (str: string) => {
    // Check query params ?token=... or &token=...
    const tokenMatch = str.match(/[?&]token=([^&#\s]+)/i);
    if (tokenMatch && tokenMatch[1]) {
      try {
        const decoded = decodeURIComponent(tokenMatch[1]);
        candidates.add(decoded);
        candidates.add(tokenMatch[1]);
      } catch {
        candidates.add(tokenMatch[1]);
      }
    }
    // Check URL paths like /qr-login/... or /students/...
    const pathMatch = str.match(/\/(?:qr-login|students|student|card)\/([^?&#\s]+)/i);
    if (pathMatch && pathMatch[1]) {
      try {
        candidates.add(decodeURIComponent(pathMatch[1]));
      } catch {
        candidates.add(pathMatch[1]);
      }
    }
  };

  parseUrlToken(trimmed);
  parseUrlToken(translated);

  // 3. For every candidate gathered so far, expand prefixes and suffixes
  const baseCandidates = Array.from(candidates);
  for (const item of baseCandidates) {
    if (!item) continue;
    
    // If it starts with QR-
    if (item.toUpperCase().startsWith('QR-')) {
      candidates.add(item.substring(3));
    } else {
      candidates.add(`QR-${item}`);
    }

    // If it has digits
    const digitMatches = item.match(/\d+/g);
    if (digitMatches) {
      const lastDigits = digitMatches[digitMatches.length - 1];
      candidates.add(`STU-${lastDigits}`);
      candidates.add(`QR-STU-${lastDigits}`);
      candidates.add(lastDigits);
    }
  }

  return Array.from(candidates).filter(Boolean);
}

