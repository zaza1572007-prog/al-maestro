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

export function extractNumericDigits(rawInput: string): string[] {
  if (!rawInput) return [];
  const arabicIndicDigits: Record<string, string> = {
    '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
    '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9'
  };
  let normalized = '';
  for (const ch of rawInput) {
    if (arabicIndicDigits[ch]) normalized += arabicIndicDigits[ch];
    else normalized += ch;
  }
  const matches = normalized.match(/\d{2,8}/g);
  return matches ? Array.from(new Set(matches)) : [];
}

/**
 * Normalizes and extracts all possible candidate student/parent identifiers from any scanned string
 * (URLs, URL parameters, Arabic keyboard translations, prefixes, and plain codes).
 */
export function extractCodeCandidates(rawInput: string): string[] {
  if (!rawInput) return [];
  const candidates = new Set<string>();

  // Convert Arabic-Indic digits (٠-٩) first
  const arabicIndicDigits: Record<string, string> = {
    '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
    '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9'
  };
  let normalizedDigitsInput = '';
  for (const ch of rawInput) {
    if (arabicIndicDigits[ch]) normalizedDigitsInput += arabicIndicDigits[ch];
    else normalizedDigitsInput += ch;
  }

  // Clean non-printable / control characters (STX, ETX, CR, LF, Tabs, NULL, etc.)
  const cleanInput = normalizedDigitsInput.replace(/[\x00-\x1F\x7F]/g, '').trim();
  if (!cleanInput) return [];

  candidates.add(cleanInput);
  candidates.add(cleanInput.toUpperCase());
  candidates.add(cleanInput.toLowerCase());

  // 1. Full Arabic keyboard layout translation (handles both Unshifted and Shifted equivalents)
  const arabicMap: Record<string, string> = {
    // Unshifted keys
    'ض': 'q', 'ص': 'w', 'ث': 'e', 'ق': 'r', 'ف': 't', 'غ': 'y', 'ع': 'u', 'ه': 'i', 'خ': 'o', 'ح': 'p',
    'ج': '[', 'د': ']', 'ش': 'a', 'س': 's', 'ي': 'd', 'ب': 'f', 'ل': 'g', 'ا': 'h', 'ت': 'j', 'ن': 'k',
    'م': 'l', 'ك': ';', 'ط': "'", 'ئ': 'z', 'ء': 'x', 'ؤ': 'c', 'ر': 'v', 'لا': 'b', 'ى': 'n', 'ة': 'm',
    'و': ',', 'ز': '.', 'ظ': '/', '؟': '?',
    // Shifted keys
    'َ': 'q', 'ً': 'w', 'ُ': 'e', 'ٌ': 'r', 'لإ': 't', 'إ': 'y', '‘': 'u', '÷': 'i', '×': 'o', '؛': 'p',
    'ِ': 'a', 'ٍ': 's', ']': 'd', '[': 'f', 'لأ': 'g', 'أ': 'h', 'ـ': 'j', '،': 'k', '/': 'l',
    '~': 'z', 'ْ': 'x', '}': 'c', '{': 'v', 'لآ': 'b', 'آ': 'n', '"': 'm'
  };

  const translateArabic = (str: string): string => {
    let result = '';
    for (let i = 0; i < str.length; i++) {
      const two = str.substring(i, i + 2);
      if (arabicMap[two]) {
        result += arabicMap[two];
        i++;
      } else if (arabicMap[str[i]]) {
        result += arabicMap[str[i]];
      } else {
        result += str[i];
      }
    }
    return result;
  };

  const translated = translateArabic(cleanInput);
  if (translated && translated !== cleanInput) {
    candidates.add(translated);
    candidates.add(translated.toUpperCase());
    candidates.add(translated.toLowerCase());
  }

  // 2. Extract from URL patterns in both raw and translated strings
  const parseUrlToken = (str: string) => {
    if (!str) return;
    const tokenMatch = str.match(/[?&]token=([^&#\s]+)/i);
    if (tokenMatch && tokenMatch[1]) {
      try {
        const decoded = decodeURIComponent(tokenMatch[1]);
        candidates.add(decoded);
        candidates.add(decoded.toUpperCase());
        candidates.add(decoded.toLowerCase());
      } catch {
        candidates.add(tokenMatch[1]);
      }
    }
    const pathMatch = str.match(/\/(?:qr-login|students|student|card)\/([^?&#\s]+)/i);
    if (pathMatch && pathMatch[1]) {
      try {
        const decoded = decodeURIComponent(pathMatch[1]);
        candidates.add(decoded);
        candidates.add(decoded.toUpperCase());
        candidates.add(decoded.toLowerCase());
      } catch {
        candidates.add(pathMatch[1]);
      }
    }
  };

  parseUrlToken(cleanInput);
  parseUrlToken(translated);

  // 3. Regex match all codes like STU-XXXX, QR-STU-XXXX, QR-XXXX from anywhere in the string
  const allTexts = Array.from(candidates);
  for (const text of allTexts) {
    // Match patterns like QR-STU-1445 or STU-1445
    const fullMatches = text.match(/(?:QR-)?(?:STU-)?\d{2,8}/gi);
    if (fullMatches) {
      for (const m of fullMatches) {
        candidates.add(m);
        candidates.add(m.toUpperCase());
        candidates.add(m.toLowerCase());
      }
    }

    // Match all isolated or embedded numbers (e.g. 1445)
    const digits = text.match(/\d{2,8}/g);
    if (digits) {
      for (const d of digits) {
        candidates.add(d);
        candidates.add(`STU-${d}`);
        candidates.add(`stu-${d}`);
        candidates.add(`QR-STU-${d}`);
        candidates.add(`qr-stu-${d}`);
        candidates.add(`QR-${d}`);
        candidates.add(`qr-${d}`);
      }
    }
  }

  // 4. For every candidate gathered so far, expand prefixes and cases
  const expanded = new Set<string>();
  for (const item of candidates) {
    if (!item) continue;
    const itemTrimmed = item.trim();
    if (!itemTrimmed) continue;

    expanded.add(itemTrimmed);
    expanded.add(itemTrimmed.toUpperCase());
    expanded.add(itemTrimmed.toLowerCase());

    const upper = itemTrimmed.toUpperCase();
    if (upper.startsWith('QR-')) {
      const withoutQR = itemTrimmed.substring(3);
      expanded.add(withoutQR);
      expanded.add(withoutQR.toUpperCase());
      expanded.add(withoutQR.toLowerCase());
    } else {
      expanded.add(`QR-${itemTrimmed}`);
      expanded.add(`QR-${upper}`);
      expanded.add(`qr-${itemTrimmed.toLowerCase()}`);
    }
  }

  return Array.from(expanded).filter(Boolean);
}

