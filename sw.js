// ============================================================
//  sw.js — Service Worker (PWA)
//  Chức năng: Pre-load thư viện cốt lõi. Tải động Extensions.
//  Chiến lược: Network-First (Ưu tiên mạng, dự phòng Cache)
// ============================================================

const STATIC_CACHE = 'magic-hop-static-v1.0.0.5';
const DYNAMIC_CACHE = 'magic-hop-dynamic-v1.0.0.5';

// Pre-load toàn bộ các file hệ thống cốt lõi & JS (Không cache nhạc hay extensions động)
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
    // Lá cờ ngôn ngữ (flagcdn.io SVG 4x3)
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

self.addEventListener('install', event => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(STATIC_CACHE).then(cache => {
            console.log('[ServiceWorker] Đang pre-load các file hệ thống và JS mới...');
            return cache.addAll(CORE_ASSETS);
        })
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.map(key => {
                    // Xóa các cache cũ của SW nhưng giữ lại cache âm thanh của cacheManager.js
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

    // Bỏ qua các request không thuộc HTTP/HTTPS (như blob URL, chrome-extension)
    if (event.request.method !== 'GET' || !url.protocol.startsWith('http')) return;

    // Bỏ qua các file âm thanh, để cacheManager.js tự xử lý qua fetch+blob (tránh lỗi Range Request iOS)
    if (url.pathname.match(/\.(mp3|m4a|wav|ogg)$/i)) return;

    event.respondWith(
        // Chiến lược Network-First: Ưu tiên tải bản mới nhất từ mạng
        fetch(event.request).then(networkResponse => {
            if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
                const responseToCache = networkResponse.clone();
                caches.open(DYNAMIC_CACHE).then(cache => cache.put(event.request, responseToCache));
            }
            return networkResponse;
        }).catch(async err => {
            // Nếu mất mạng (Offline), lập tức lục tìm trong Cache để sử dụng
            console.warn('[ServiceWorker] Ngoại tuyến, đang dùng Cache cho:', event.request.url);
            const cachedResponse = await caches.match(event.request);
            if (cachedResponse) return cachedResponse;
            throw err;
        })
    );
});

// Lắng nghe lệnh skipWaiting từ giao diện chính
self.addEventListener('message', (event) => {
    if (event.data === 'skipWaiting') {
        self.skipWaiting();
    }
});