import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
} from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import pino from 'pino';
import path from 'path';
import fs from 'fs';
import { Boom } from '@hapi/boom';

const AUTH_DIR = path.join(process.cwd(), 'whatsapp_auth_info');
const TARGET_PHONE = '201100775230';

async function startWhatsAppDaemon() {
  console.log('========================================================');
  console.log('🚀 [Al Maestro WhatsApp Daemon]');
  console.log(`   Target Account: 01100775230 (+${TARGET_PHONE})`);
  console.log(`   Session Storage: ${AUTH_DIR}`);
  console.log('========================================================\n');

  if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
  }

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();

  console.log(`📦 Using Baileys version: v${version.join('.')}`);

  const sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: 'silent' }),
    browser: ['Ubuntu', 'Chrome', '20.0.04'],
    defaultQueryTimeoutMs: 60000,
  });

  sock.ev.on('creds.update', saveCreds);

  // Request Pairing Code if not already registered
  if (!sock.authState.creds.registered) {
    setTimeout(async () => {
      try {
        console.log('⏳ Generating Pairing Code for 01100775230...');
        const code = await sock.requestPairingCode(TARGET_PHONE);
        console.log('\n======================================================');
        console.log('🔑 [كود الربط برقم الهاتف - Pairing Code]:');
        console.log(`\n             👉  ${code}  👈\n`);
        console.log('📲 في شاشة هاتفك، اضغط على "الربط برقم الهاتف بدلاً من ذلك"');
        console.log(`   وأدخل الكود الموضح أعلاه لإتمام الربط فوراً.`);
        console.log('======================================================\n');
      } catch (err: any) {
        console.error('⚠️ Could not generate pairing code:', err.message);
      }
    }, 3000);
  }

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr && !sock.authState.creds.registered) {
      console.log('\n======================================================');
      console.log('📲 أو يمكنك مسح كود الـ QR:');
      console.log('======================================================\n');
      qrcode.generate(qr, { small: true });
      console.log('======================================================\n');
    }

    if (connection === 'close') {
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      console.log(`⚠️ Connection closed (Status: ${statusCode}). Reconnecting: ${shouldReconnect}`);

      if (shouldReconnect) {
        setTimeout(startWhatsAppDaemon, 3000);
      } else {
        console.log('❌ Logged out. Delete whatsapp_auth_info folder and restart.');
      }
    } else if (connection === 'open') {
      console.log('======================================================');
      console.log(`✅ WhatsApp Connected & Authenticated Successfully!`);
      console.log(`👤 Connected User: ${sock.user?.id || TARGET_PHONE}`);
      console.log('💬 Ready to dispatch automated WhatsApp messages.');
      console.log('======================================================\n');
    }
  });
}

startWhatsAppDaemon().catch((err) => {
  console.error('Fatal WhatsApp Daemon Error:', err);
});

