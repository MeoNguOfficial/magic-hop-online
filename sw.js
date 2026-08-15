// ============================================================
//  sw.js — Service Worker (PWA)
//  Chức năng: Pre-load thư viện cốt lõi. Tải động Extensions.
//  Chiến lược: Network-First (Ưu tiên mạng, dự phòng Cache)
// ============================================================

const STATIC_CACHE = 'magic-hop-static-v1.0.0.8';
const DYNAMIC_CACHE = 'magic-hop-dynamic-v1.0.0.8';

// Pre-load toàn bộ các file hệ thống cốt lõi & JS
const CORE_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './css/style.css',
    'https://cdn.jsdelivr.net/npm/disable-devtool@latest/disable-devtool.min.js',
    './js/config.js',
    './js/app-main.js',
    './js/playlist.js',
    './js/cacheManager.js',
    './js/api.js',
    './js/i18n.js',
    './language/vi.json',
    './language/en.json',
    './language/fr.json',
    './language/zh-CN.json',
    './language/zh-TW.json',
    './language/ko.json',
    './language/ja.json',
    './language/es.json',
    './language/pt.json',
    './language/ru.json',
    './js/global.js',
    './js/settings.js',
    './js/storage-manager.js',
    './js/audio-manager.js',
    './js/copyright_check.js',
    './js/game.js',
    './js/autoplay.js',
    './js/bot-assist.js',
    './js/music-player.js',
    './js/song-selector.js',
    './js/fake-blocks.js',
    './js/easy-mode.js',
    './js/hard-mode.js',
    './js/asian-mode.js',
    './js/account.js',
    './js/chat.js',
    './js/admin-panel.js',
    './js/pwa-installer.js',
    'https://flagcdn.io/flags/4x3/vn.svg',
    'https://flagcdn.io/flags/4x3/us.svg',
    'https://flagcdn.io/flags/4x3/fr.svg',
    'https://flagcdn.io/flags/4x3/cn.svg',
    'https://flagcdn.io/flags/4x3/tw.svg',
    'https://flagcdn.io/flags/4x3/kr.svg',
    'https://flagcdn.io/flags/4x3/jp.svg',
    'https://flagcdn.io/flags/4x3/es.svg',
    'https://flagcdn.io/flags/4x3/pt.svg',
    'https://flagcdn.io/flags/4x3/ru.svg'
];

// Thay đoạn cache.addAll(...) hoặc cache.add(...) trong sự kiện install:
self.addEventListener('install', event => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(STATIC_CACHE).then(async cache => {
            console.log('[ServiceWorker] Pre-load assets...');
            
            return Promise.allSettled(
                CORE_ASSETS.map(async url => {
                    try {
                        // Nếu là link CDN bên ngoài, dùng mode no-cors
                        const isExternal = url.startsWith('http') && !url.includes(location.hostname);
                        const request = isExternal ? new Request(url, { mode: 'no-cors' }) : url;
                        
                        const response = await fetch(request);
                        await cache.put(url, response);
                    } catch (err) {
                        console.warn('[ServiceWorker] Lỗi cache:', url, err);
                    }
                })
            );
        })
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.map(key => {
                    if (key !== STATIC_CACHE && key !== DYNAMIC_CACHE && !key.startsWith('magic-hop-audio')) {
                        return caches.delete(key);
                    }
                })
            );
        })
    );
});

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // Bỏ qua các request không thuộc HTTP/HTTPS
    if (event.request.method !== 'GET' || !url.protocol.startsWith('http')) return;

    // Bỏ qua file âm thanh
    if (url.pathname.match(/\.(mp3|m4a|wav|ogg)$/i)) return;

    event.respondWith(
        fetch(event.request)
            .then(networkResponse => {
                // Kiểm tra response hợp lệ trước khi cache
                if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
                    const responseToCache = networkResponse.clone();
                    
                    // Thêm .catch() ở đây để triệt tiêu lỗi Uncaught (in promise) khi cache.put thất bại
                    caches.open(DYNAMIC_CACHE)
                        .then(cache => cache.put(event.request, responseToCache))
                        .catch(err => console.warn('[ServiceWorker] Lỗi lưu DYNAMIC_CACHE:', err));
                }
                return networkResponse;
            })
            .catch(async () => {
                // Khi mất mạng/Fetch thất bại -> Lấy từ Cache
                const cachedResponse = await caches.match(event.request);
                if (cachedResponse) return cachedResponse;

                // Nếu trong Cache cũng không có -> Trả về lỗi 503 thay vì ném (throw) lỗi ra Console
                return new Response('Ngoại tuyến: Tài nguyên chưa có trong Cache', {
                    status: 503,
                    statusText: 'Service Unavailable',
                    headers: new Headers({ 'Content-Type': 'text/plain; charset=utf-8' })
                });
            })
    );
});

self.addEventListener('message', (event) => {
    if (event.data === 'skipWaiting') {
        self.skipWaiting();
    }
});