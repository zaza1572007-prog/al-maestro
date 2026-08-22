const CACHE_NAME = 'almaestro-offline-v10';

// Core routes and assets to pre-cache for offline usage
const PRECACHE_URLS = [
  '/',
  '/dashboard',
  '/attendance',
  '/daily-attendance',
  '/students',
  '/settings',
  '/manifest.json',
  '/teacher.jpg'
];

// Install Event: Pre-cache essential pages and resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching core routes and assets...');
      return cache.addAll(PRECACHE_URLS).catch((err) => {
        console.warn('[SW] Partial precache warning:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate Event: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => {
            console.log('[SW] Removing old cache:', key);
            return caches.delete(key);
          })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event: Smart Offline Caching Strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // 1. Next.js Static Chunks & Media (JS, CSS, Images, Fonts) -> Cache First with Network Fallback
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.ico') ||
    url.pathname.endsWith('.json')
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Fetch updated version in background to refresh cache (Stale-While-Revalidate)
          fetch(request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
              }
            })
            .catch(() => {});
          return cachedResponse;
        }
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // 2. API Requests -> Network First with Offline JSON fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(
          JSON.stringify({
            success: false,
            offline: true,
            message: 'أنت تعمل حالياً في وضع الأوفلاين (بدون إنترنت).',
          }),
          {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      })
    );
    return;
  }

  // 3. Page Navigation Requests (HTML / Next.js Page Routes) -> Network First with Cache Fallback
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        })
        .catch(async () => {
          // Offline fallback for pages: try exact cached route first
          const cachedPage = await caches.match(request);
          if (cachedPage) return cachedPage;

          // If navigating to /attendance offline
          if (url.pathname.includes('/attendance')) {
            const attendanceCached = await caches.match('/attendance');
            if (attendanceCached) return attendanceCached;
          }

          // Fallback to cached dashboard or root shell
          const dashboardCached = await caches.match('/dashboard');
          if (dashboardCached) return dashboardCached;

          const rootCached = await caches.match('/');
          if (rootCached) return rootCached;

          // Final fallback Response
          return new Response(
            `<!DOCTYPE html>
            <html lang="ar" dir="rtl">
              <head>
                <meta charset="utf-8"/>
                <meta name="viewport" content="width=device-width, initial-scale=1"/>
                <title>منصة المايسترو - وضع الأوفلاين</title>
                <style>
                  body { background: #020617; color: #f8fafc; font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; p-4; }
                  .card { background: rgba(30,41,59,0.8); border: 1px solid rgba(255,255,255,0.1); padding: 2rem; border-radius: 1.5rem; max-width: 400px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
                  h1 { color: #38bdf8; font-size: 1.25rem; margin-bottom: 0.5rem; }
                  p { color: #94a3b8; font-size: 0.875rem; line-height: 1.5; }
                  button { margin-top: 1rem; background: #0284c7; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 0.75rem; font-weight: bold; cursor: pointer; }
                </style>
              </head>
              <body>
                <div class="card">
                  <h1>📡 أنت تعمل في وضع الأوفلاين (بدون إنترنت)</h1>
                  <p>تم حفظ الصفحات والنسخ الاحتياطية محلياً. يرجى فتح الصفحة من التطبيق المثبّت أو إعادة الاتصال بالشبكة.</p>
                  <button onclick="window.location.reload()">🔄 إعادة المحاولة</button>
                </div>
              </body>
            </html>`,
            {
              headers: { 'Content-Type': 'text/html; charset=utf-8' },
            }
          );
        })
    );
    return;
  }
});
