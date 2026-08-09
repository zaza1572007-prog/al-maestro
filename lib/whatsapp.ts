import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  WASocket,
  ConnectionState,
} from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import pino from 'pino';
import path from 'path';
import fs from 'fs';
import { Boom } from '@hapi/boom';

// Global singleton to prevent multiple socket instances across Next.js reloads
declare global {
  var __waSocket: WASocket | null | undefined;
  var __waConnectionStatus: 'DISCONNECTED' | 'CONNECTING' | 'QR_READY' | 'CONNECTED';
  var __waLastQr: string | null | undefined;
  var __waConnectingPromise: Promise<WASocket> | null | undefined;
}

global.__waSocket = global.__waSocket ?? null;
global.__waConnectionStatus = global.__waConnectionStatus ?? 'DISCONNECTED';
global.__waLastQr = global.__waLastQr ?? null;
global.__waConnectingPromise = global.__waConnectingPromise ?? null;

const AUTH_DIR = path.join(process.cwd(), 'whatsapp_auth_info');

export function formatWhatsAppNumber(phone: string): string {
  if (!phone) return '';
  let clean = phone.replace(/[^\d]/g, '').trim();
  
  // Egyptian numbers: 01xxxxxxxxx -> 201xxxxxxxxx
  if (clean.startsWith('01') && clean.length === 11) {
    clean = '2' + clean;
  } else if (clean.startsWith('002')) {
    clean = clean.slice(2);
  } else if (clean.startsWith('20') && clean.length === 12) {
    // already 201xxxxxxxxx
  } else if (clean.length === 10 && clean.startsWith('1')) {
    clean = '20' + clean;
  }
  
  return clean.includes('@s.whatsapp.net') ? clean : `${clean}@s.whatsapp.net`;
}

export async function initWhatsApp(forceNew = false): Promise<WASocket> {
  if (global.__waSocket && global.__waConnectionStatus === 'CONNECTED' && !forceNew) {
    return global.__waSocket;
  }

  if (global.__waConnectingPromise && !forceNew) {
    return global.__waConnectingPromise;
  }

  global.__waConnectingPromise = (async () => {
    try {
      if (!fs.existsSync(AUTH_DIR)) {
        fs.mkdirSync(AUTH_DIR, { recursive: true });
      }

      global.__waConnectionStatus = 'CONNECTING';
      const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
      const { version } = await fetchLatestBaileysVersion();

      console.log('🤖 [WhatsApp] Initializing Baileys WhatsApp Service (v' + version.join('.') + ')...');

      const sock = makeWASocket({
        version,
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false, // handled manually with qrcode-terminal
        browser: ['Al Maestro Platform', 'Chrome', '1.0.0'],
        defaultQueryTimeoutMs: 60000,
        connectTimeoutMs: 60000,
        keepAliveIntervalMs: 30000,
      });

      sock.ev.on('creds.update', saveCreds);

      sock.ev.on('connection.update', async (update: Partial<ConnectionState>) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          global.__waLastQr = qr;
          global.__waConnectionStatus = 'QR_READY';
          console.log('\n======================================================');
          console.log('📲 [WhatsApp QR Code] Scan this code from WhatsApp:');
          console.log('   (Account target: 01100775230 - أستاذ أحمد راضي كحلة)');
          console.log('======================================================\n');
          qrcode.generate(qr, { small: true });
          console.log('======================================================\n');
        }

        if (connection === 'close') {
          global.__waSocket = null;
          global.__waConnectionStatus = 'DISCONNECTED';
          const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

          console.log(
            `⚠️ [WhatsApp] Connection closed. Reason: ${statusCode || 'Unknown'}. Reconnecting: ${shouldReconnect}`
          );

          if (shouldReconnect) {
            setTimeout(() => {
              initWhatsApp(true).catch((e) => console.error('Reconnect failed:', e.message));
            }, 3000);
          } else {
            console.log('❌ [WhatsApp] Session logged out. Clear auth info to re-pair.');
            try {
              fs.rmSync(AUTH_DIR, { recursive: true, force: true });
            } catch {}
          }
        } else if (connection === 'open') {
          global.__waSocket = sock;
          global.__waConnectionStatus = 'CONNECTED';
          global.__waLastQr = null;
          const userJid = sock.user?.id || '01100775230';
          console.log('======================================================');
          console.log(`✅ [WhatsApp] Connected successfully! Logged in as: ${userJid}`);
          console.log('======================================================');
        }
      });

      global.__waSocket = sock;
      return sock;
    } catch (err: any) {
      global.__waConnectionStatus = 'DISCONNECTED';
      global.__waConnectingPromise = null;
      console.error('❌ [WhatsApp Init Error]:', err.message);
      throw err;
    }
  })();

  return global.__waConnectingPromise;
}

export async function sendWhatsAppMessage(
  phone: string,
  message: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    if (!phone || !message) {
      return { success: false, error: 'Phone and message are required' };
    }

    const jid = formatWhatsAppNumber(phone);
    if (!jid || jid === '@s.whatsapp.net') {
      return { success: false, error: 'Invalid phone number format' };
    }

    let sock = global.__waSocket;
    if (!sock || global.__waConnectionStatus !== 'CONNECTED') {
      sock = await initWhatsApp();
    }

    // If still not connected
    if (!sock || global.__waConnectionStatus !== 'CONNECTED') {
      return {
        success: false,
        error:
          global.__waConnectionStatus === 'QR_READY'
            ? 'يرجى مسح كود الـ QR أولاً من تطبيق الواتساب لربط الرقم.'
            : 'خدمة الواتساب غير متصلة حالياً. جاري إعادة الاتصال...',
      };
    }

    const result = await sock.sendMessage(jid, { text: message });
    return {
      success: true,
      messageId: result?.key?.id || undefined,
    };
  } catch (error: any) {
    console.error('❌ [WhatsApp Send Error]:', error);
    return {
      success: false,
      error: error.message || 'حدث خطأ أثناء إرسال رسالة الواتساب',
    };
  }
}

export function getWhatsAppStatus() {
  return {
    isConnected: global.__waConnectionStatus === 'CONNECTED',
    status: global.__waConnectionStatus,
    hasQr: !!global.__waLastQr,
    qr: global.__waLastQr,
    user: global.__waSocket?.user || null,
  };
}
