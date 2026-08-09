import http from 'http';
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

const PORT = parseInt(process.env.WA_PORT || '5005', 10);
const API_TOKEN = process.env.WA_API_TOKEN || 'almaestro_wa_secret_token_2026';
const AUTH_DIR = path.join(process.cwd(), 'whatsapp_auth_info');

let sock: WASocket | null = null;
let connectionStatus: 'DISCONNECTED' | 'CONNECTING' | 'QR_READY' | 'CONNECTED' = 'DISCONNECTED';
let lastQr: string | null = null;
let connectingPromise: Promise<WASocket> | null = null;

export function formatWhatsAppNumber(phone: string): string {
  if (!phone) return '';
  let clean = phone.replace(/[^\d]/g, '').trim();

  // Egyptian numbers normalization: 01xxxxxxxxx -> 201xxxxxxxxx
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

async function initGatewayWhatsApp(forceNew = false): Promise<WASocket> {
  if (sock && connectionStatus === 'CONNECTED' && !forceNew) {
    return sock;
  }

  if (connectingPromise && !forceNew) {
    return connectingPromise;
  }

  connectingPromise = (async () => {
    try {
      if (!fs.existsSync(AUTH_DIR)) {
        fs.mkdirSync(AUTH_DIR, { recursive: true });
      }

      connectionStatus = 'CONNECTING';
      const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
      const { version } = await fetchLatestBaileysVersion();

      console.log(`🤖 [WhatsApp Gateway] Starting Baileys (v${version.join('.')})...`);

      const socketInstance = makeWASocket({
        version,
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        browser: ['Ubuntu', 'Chrome', '20.0.04'],
        defaultQueryTimeoutMs: 60000,
        connectTimeoutMs: 60000,
        keepAliveIntervalMs: 30000,
      });

      socketInstance.ev.on('creds.update', saveCreds);

      socketInstance.ev.on('connection.update', async (update: Partial<ConnectionState>) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          lastQr = qr;
          connectionStatus = 'QR_READY';
          console.log('\n======================================================');
          console.log('📲 [WhatsApp Gateway QR] Scan with WhatsApp on 01100775230:');
          console.log('======================================================\n');
          qrcode.generate(qr, { small: true });
          console.log('======================================================\n');
        }

        if (connection === 'close') {
          sock = null;
          connectionStatus = 'DISCONNECTED';
          connectingPromise = null;
          const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

          console.log(
            `⚠️ [WhatsApp Gateway] Connection closed. Reason: ${statusCode || 'Unknown'}. Reconnecting: ${shouldReconnect}`
          );

          if (shouldReconnect) {
            setTimeout(() => {
              initGatewayWhatsApp(true).catch((e) => console.error('Reconnect failed:', e.message));
            }, 3000);
          } else {
            console.log('❌ [WhatsApp Gateway] Session logged out.');
            try {
              fs.rmSync(AUTH_DIR, { recursive: true, force: true });
            } catch {}
          }
        } else if (connection === 'open') {
          sock = socketInstance;
          connectionStatus = 'CONNECTED';
          lastQr = null;
          connectingPromise = null;
          const userJid = socketInstance.user?.id || '01100775230';
          console.log('======================================================');
          console.log(`✅ [WhatsApp Gateway] Connected! Logged in as: ${userJid}`);
          console.log(`🚀 Gateway listening for incoming requests on port ${PORT}`);
          console.log('======================================================');
        }
      });

      sock = socketInstance;
      return socketInstance;
    } catch (err: any) {
      connectionStatus = 'DISCONNECTED';
      connectingPromise = null;
      console.error('❌ [WhatsApp Gateway Init Error]:', err.message);
      throw err;
    }
  })();

  return connectingPromise;
}

// HTTP Server
const server = http.createServer(async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url || '/', `http://${req.headers.host}`);

  // Health Check
  if (url.pathname === '/' || url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        status: 'OK',
        service: 'Al Maestro WhatsApp Gateway',
        connectionStatus,
        user: sock?.user?.id || '01100775230',
        timestamp: new Date().toISOString(),
      })
    );
    return;
  }

  // Status endpoint
  if (url.pathname === '/status' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        success: true,
        status: connectionStatus,
        isConnected: connectionStatus === 'CONNECTED',
        user: sock?.user?.id || null,
        hasQr: !!lastQr,
      })
    );
    return;
  }

  // Send Message Endpoint
  if (url.pathname === '/send' && req.method === 'POST') {
    let bodyData = '';
    req.on('data', (chunk) => {
      bodyData += chunk;
    });

    req.on('end', async () => {
      try {
        const body = JSON.parse(bodyData || '{}');
        const authHeader = req.headers['authorization'];
        const token =
          body.token || (authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : authHeader);

        if (token !== API_TOKEN) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Unauthorized: Invalid API Token' }));
          return;
        }

        const targetPhone = body.to || body.phone;
        const messageText = body.body || body.message;

        if (!targetPhone || !messageText) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              success: false,
              error: 'Missing required fields: "to" (phone number) and "body" (message text)',
            })
          );
          return;
        }

        const jid = formatWhatsAppNumber(targetPhone);
        if (!jid || jid === '@s.whatsapp.net') {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Invalid phone number format' }));
          return;
        }

        // Check or wait for connection
        if (!sock || connectionStatus !== 'CONNECTED') {
          console.log('🔄 [Gateway] Socket not ready, initializing...');
          initGatewayWhatsApp().catch(() => {});
          
          // Wait up to 10s
          await new Promise<void>((resolve) => {
            const timeout = setTimeout(resolve, 10000);
            const interval = setInterval(() => {
              if (connectionStatus === 'CONNECTED') {
                clearTimeout(timeout);
                clearInterval(interval);
                resolve();
              }
            }, 300);
          });
        }

        if (!sock || connectionStatus !== 'CONNECTED') {
          res.writeHead(503, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              success: false,
              error:
                connectionStatus === 'QR_READY'
                  ? 'WhatsApp session needs QR scan or Pairing.'
                  : 'WhatsApp service is not connected.',
            })
          );
          return;
        }

        console.log(`📤 [Gateway] Sending message to ${targetPhone}...`);
        const result = await sock.sendMessage(jid, { text: messageText });
        console.log(`✅ [Gateway] Delivered message ID: ${result?.key?.id}`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: true,
            messageId: result?.key?.id,
            to: targetPhone,
          })
        );
      } catch (err: any) {
        console.error('❌ [Gateway Error]:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message || 'Internal Server Error' }));
      }
    });
    return;
  }

  // Not Found
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ success: false, error: 'Not Found' }));
});

// Start Server and WhatsApp
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n======================================================`);
  console.log(`🌟 Al Maestro WhatsApp Gateway Server`);
  console.log(`📡 Server running on http://localhost:${PORT}`);
  console.log(`🔑 API Token: ${API_TOKEN}`);
  console.log(`======================================================\n`);
  initGatewayWhatsApp().catch((e) => console.error('Initial WhatsApp start error:', e.message));
});
