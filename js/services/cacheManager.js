// ============================================================
//  cacheManager.js — Quản lý tải và lưu trữ nhạc Offline bằng OPFS & IndexedDB
// ============================================================

const DB_NAME = 'MagicHopDB';
const DB_VERSION = 3; // Nâng version lên 3 để tạo store api_cache
const STORE_AUDIO = 'audio_cache';
const STORE_JSON = 'json_cache';
const STORE_PLAYLIST = 'playlist_cache';
const STORE_API_CACHE = 'api_cache';
const STATIC_CACHE_NAME = 'magic-hop-static-v1'; // Vẫn dùng Cache Storage cho file tĩnh

let dbPromise = null;

function getDB() {
    if (!dbPromise) {
        dbPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(STORE_AUDIO)) db.createObjectStore(STORE_AUDIO);
                if (!db.objectStoreNames.contains(STORE_JSON)) db.createObjectStore(STORE_JSON);
                if (!db.objectStoreNames.contains(STORE_PLAYLIST)) db.createObjectStore(STORE_PLAYLIST);
                if (!db.objectStoreNames.contains('highScores')) db.createObjectStore('highScores', { keyPath: "songIndex" });
                if (!db.objectStoreNames.contains(STORE_API_CACHE)) db.createObjectStore(STORE_API_CACHE);
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    return dbPromise;
}

const cachedAudioUrls = new Map();

// --- AUTO-CLEANUP CACHE METADATA (LRU EVICTION) ---
function isProtectedUrl(url) {
    if (!url) return true;

    // Check against hardcoded static whitelisted URLs (default SFX and menu BGMs)
    const PROTECTED_FILENAMES = [
        "new-bg-menu.mp3",
        "30-success-ring.mp3",
        "tick-deepfrozenapps-397275646-2.mp3",
        "result_star.ogg",
        "minecraft-wood-break-place.mp3",
        "whoosh-dark.mp3",
        "s468.ogg",
        "start_song.ogg",
        "gameCompleted.ogg",
        "result_bgm.ogg",
        "FreeGift_collect.ogg"
    ];

    const isStaticSfx = PROTECTED_FILENAMES.some(filename => url.includes(filename));
    if (isStaticSfx) return true;

    // If playlist is loaded and the URL is NOT in the playlist, it is a default asset or extension, protect it.
    if (typeof playlist !== 'undefined' && Array.isArray(playlist) && playlist.length > 0) {
        const isBeatmap = playlist.some(song => song.url === url);
        if (!isBeatmap) return true;
    }

    return false;
}

function updateSongAccessTime(url) {
    if (!url || isProtectedUrl(url)) return;
    try {
        let meta = {};
        const metaStr = localStorage.getItem('music_cache_metadata');
        if (metaStr) {
            try {
                meta = JSON.parse(metaStr);
            } catch (e) {
                localStorage.removeItem('music_cache_metadata');
            }
        }
        meta[url] = {
            lastUsed: Date.now()
        };
        localStorage.setItem('music_cache_metadata', JSON.stringify(meta));
    } catch (e) {
        console.error('[CacheManager] Lỗi cập nhật timestamp truy cập:', e);
    }
}

async function evictCacheIfNeeded() {
    try {
        const metaStr = localStorage.getItem('music_cache_metadata');
        if (!metaStr) return;

        let meta;
        try {
            meta = JSON.parse(metaStr);
        } catch (parseError) {
            console.warn('[CacheManager] music_cache_metadata không hợp lệ, đang xóa để làm mới...');
            localStorage.removeItem('music_cache_metadata');
            return;
        }

        const urls = Object.keys(meta);
        if (urls.length === 0) return;

        // Filter out URLs that are no longer cached or are protected
        const cachedUrls = [];
        for (const url of urls) {
            if (isProtectedUrl(url)) {
                delete meta[url];
                continue;
            }
            if (await isAudioCached(url)) {
                cachedUrls.push(url);
            } else {
                delete meta[url];
            }
        }

        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        let updatedMetadata = { ...meta };

        const songsToEvict = [];
        const remainingSongs = [];

        for (const url of cachedUrls) {
            const lastUsed = meta[url]?.lastUsed || 0;
            if (lastUsed < thirtyDaysAgo) {
                songsToEvict.push({ url, lastUsed });
            } else {
                remainingSongs.push({ url, lastUsed });
            }
        }

        // Sort remaining songs by last used time ascending (oldest first)
        remainingSongs.sort((a, b) => a.lastUsed - b.lastUsed);

        const limitSetting = localStorage.getItem('limitBeatmapAudioCount');
        const LIMIT = limitSetting !== null ? parseInt(limitSetting) : 30;
        if (LIMIT > 0 && remainingSongs.length > LIMIT) {
            const overflowCount = remainingSongs.length - LIMIT;
            const overflowSongs = remainingSongs.slice(0, overflowCount);
            songsToEvict.push(...overflowSongs);

            overflowSongs.forEach(s => {
                delete updatedMetadata[s.url];
            });
        }

        for (const s of songsToEvict) {
            if (isProtectedUrl(s.url)) continue; // Safeguard

            console.log('[CacheManager] [Eviction] Tự động xóa bài hát ít dùng nhất:', s.url);

            let lazyUrl = null;
            if (typeof playlist !== 'undefined' && Array.isArray(playlist)) {
                const songObj = playlist.find(item => item.url === s.url);
                if (songObj) {
                    lazyUrl = songObj.lazyUrl;
                    songObj.loaded = false;
                    songObj.beats = [0, 1, 2, 3];
                }
            }

            await deleteSongCache(s.url, lazyUrl);
            delete updatedMetadata[s.url];
        }

        localStorage.setItem('music_cache_metadata', JSON.stringify(updatedMetadata));

        if (songsToEvict.length > 0 && typeof renderSongList === 'function') {
            renderSongList();
        }
    } catch (e) {
        console.error('[CacheManager] Lỗi dọn dẹp bộ nhớ đệm tự động:', e);
    }
}

// --- ORIGIN PRIVATE FILE SYSTEM (OPFS) HELPERS ---
const hasOPFS = typeof navigator !== 'undefined' && navigator.storage && typeof navigator.storage.getDirectory === 'function';

if (hasOPFS) {
    console.log('[CacheManager] Trình duyệt hỗ trợ OPFS. Sử dụng OPFS làm bộ lưu trữ tối ưu.');
} else {
    console.warn('[CacheManager] OPFS không khả dụng. Chuyển sang sử dụng IndexedDB fallback.');
}

// Chuyển URL thành tên file an toàn cho OPFS
function urlToFilename(url) {
    if (!url) return '';
    let safeStr = encodeURIComponent(url).replace(/[*"\/\\<>:|?]/g, '_');
    if (safeStr.length > 200) {
        let hash = 0;
        for (let i = 0; i < url.length; i++) {
            hash = (hash << 5) - hash + url.charCodeAt(i);
            hash |= 0;
        }
        safeStr = safeStr.substring(0, 150) + '_' + Math.abs(hash);
    }
    return safeStr;
}

async function writeToOPFS(dirName, url, data) {
    try {
        const root = await navigator.storage.getDirectory();
        const dir = await root.getDirectoryHandle(dirName, { create: true });
        const fileName = urlToFilename(url);
        const fileHandle = await dir.getFileHandle(fileName, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(data);
        await writable.close();
        return true;
    } catch (err) {
        console.error('[CacheManager] [OPFS] Lỗi ghi file:', dirName, url, err);
        return false;
    }
}

async function readBlobFromOPFS(dirName, url) {
    try {
        const root = await navigator.storage.getDirectory();
        const dir = await root.getDirectoryHandle(dirName, { create: true });
        const fileName = urlToFilename(url);
        const fileHandle = await dir.getFileHandle(fileName);
        return await fileHandle.getFile();
    } catch (err) {
        return null;
    }
}

async function readJsonFromOPFS(dirName, url) {
    try {
        const root = await navigator.storage.getDirectory();
        const dir = await root.getDirectoryHandle(dirName, { create: true });
        const fileName = urlToFilename(url);
        const fileHandle = await dir.getFileHandle(fileName);
        const file = await fileHandle.getFile();
        const text = await file.text();
        return JSON.parse(text);
    } catch (err) {
        return null;
    }
}

async function existsInOPFS(dirName, url) {
    try {
        const root = await navigator.storage.getDirectory();
        const dir = await root.getDirectoryHandle(dirName, { create: true });
        const fileName = urlToFilename(url);
        await dir.getFileHandle(fileName);
        return true;
    } catch (err) {
        return false;
    }
}

async function deleteFromOPFS(dirName, url) {
    try {
        const root = await navigator.storage.getDirectory();
        const dir = await root.getDirectoryHandle(dirName, { create: true });
        const fileName = urlToFilename(url);
        await dir.removeEntry(fileName);
        return true;
    } catch (err) {
        return false;
    }
}

async function clearOPFSDirectory(dirName) {
    try {
        const root = await navigator.storage.getDirectory();
        await root.removeEntry(dirName, { recursive: true });
        await root.getDirectoryHandle(dirName, { create: true });
        return true;
    } catch (err) {
        return false;
    }
}

// --- CORE CACHE MANAGER INTERFACES ---

// Lấy URL nhạc từ cache (OPFS hoặc IndexedDB)
async function getCachedAudioUrl(url) {
    if (!url) return url;

    // Update access time for LRU tracking
    updateSongAccessTime(url);

    try {
        if (hasOPFS) {
            const file = await readBlobFromOPFS('audio', url);
            if (file) {
                console.log('[CacheManager] [OPFS] Đã tải bài hát từ OPFS:', url);
                if (!cachedAudioUrls.has(url)) {
                    cachedAudioUrls.set(url, URL.createObjectURL(file));
                }
                return cachedAudioUrls.get(url);
            } else {
                console.log('[CacheManager] [OPFS] Lần đầu phát, chơi qua mạng & Tải ngầm vào OPFS:', url);
                cacheAudioInBackground(url);
                return url;
            }
        }

        // Fallback IndexedDB
        const db = await getDB();
        const tx = db.transaction(STORE_AUDIO, 'readonly');
        const store = tx.objectStore(STORE_AUDIO);
        const blob = await new Promise((resolve, reject) => {
            const req = store.get(url);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });

        if (blob) {
            console.log('[CacheManager] Đã tải bài hát từ IndexedDB:', url);
            if (!cachedAudioUrls.has(url)) {
                cachedAudioUrls.set(url, URL.createObjectURL(blob));
            }
            return cachedAudioUrls.get(url);
        } else {
            console.log('[CacheManager] Lần đầu phát, chơi qua mạng & Tải ngầm vào IndexedDB:', url);
            cacheAudioInBackground(url);
            return url;
        }
    } catch (error) {
        console.error('[CacheManager] Lỗi đọc bộ nhớ đệm, sử dụng URL gốc:', error);
        return url;
    }
}

// Lấy URL nhạc kèm báo cáo tiến trình tải (phần trăm)
async function getCachedAudioUrlWithProgress(url, onProgress) {
    if (!url) {
        if (onProgress) onProgress(100);
        return url;
    }

    // Update access time for LRU tracking
    updateSongAccessTime(url);

    try {
        if (hasOPFS) {
            const file = await readBlobFromOPFS('audio', url);
            if (file) {
                console.log('[CacheManager] [OPFS] Đã tìm thấy audio trong OPFS:', url);
                if (onProgress) onProgress(100);
                if (!cachedAudioUrls.has(url)) {
                    cachedAudioUrls.set(url, URL.createObjectURL(file));
                }
                return cachedAudioUrls.get(url);
            }
        } else {
            // Fallback IndexedDB
            const db = await getDB();
            const tx = db.transaction(STORE_AUDIO, 'readonly');
            const store = tx.objectStore(STORE_AUDIO);
            const blob = await new Promise((resolve, reject) => {
                const req = store.get(url);
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            });

            if (blob) {
                console.log('[CacheManager] [IndexedDB] Đã tìm thấy audio trong IndexedDB:', url);
                if (onProgress) onProgress(100);
                if (!cachedAudioUrls.has(url)) {
                    cachedAudioUrls.set(url, URL.createObjectURL(blob));
                }
                return cachedAudioUrls.get(url);
            }
        }

        // Tải qua mạng nếu chưa có trong cache và báo cáo tiến trình
        console.log('[CacheManager] Bắt đầu tải nhạc từ mạng:', url);
        const response = await fetch(url, { mode: 'cors' });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const contentLength = response.headers.get('content-length');
        const total = contentLength ? parseInt(contentLength, 10) : 4 * 1024 * 1024; // Giả định 4MB nếu server ẩn Content-Length
        let loaded = 0;
        const reader = response.body.getReader();
        const chunks = [];

        while (true) {
            if (window.isSongLoadingCancelled) {
                reader.cancel();
                throw new Error("User cancelled song loading");
            }
            const { done, value } = await reader.read();
            if (done) break;

            chunks.push(value);
            loaded += value.length;

            let percent = Math.round((loaded / total) * 100);
            // Nếu không có contentLength, giữ tối đa 95% cho đến khi tải xong thực sự
            if (!contentLength && percent > 95) percent = 95; 
            if (onProgress) onProgress(percent);
        }
        if (!contentLength && onProgress) onProgress(100);
        const downloadedBlob = new Blob(chunks);

        // Lưu vào cache
        if (hasOPFS) {
            await writeToOPFS('audio', url, downloadedBlob);
        } else {
            const db = await getDB();
            const tx = db.transaction(STORE_AUDIO, 'readwrite');
            const store = tx.objectStore(STORE_AUDIO);
            store.put(downloadedBlob, url);
        }

        await evictCacheIfNeeded();

        if (!cachedAudioUrls.has(url)) {
            cachedAudioUrls.set(url, URL.createObjectURL(downloadedBlob));
        }
        return cachedAudioUrls.get(url);

    } catch (error) {
        console.error('[CacheManager] Lỗi tải nhạc với tiến trình:', error);
        if (onProgress) onProgress(100);
        return url;
    }
}

// Tải ngầm bài hát lưu vào cache để dùng cho lần sau
async function cacheAudioInBackground(url) {
    if (!url) return;
    try {
        const response = await fetch(url, { mode: 'cors' });
        if (response.ok) {
            const blob = await response.blob();
            if (hasOPFS) {
                await writeToOPFS('audio', url, blob);
                console.log('[CacheManager] [OPFS] Đã tải ngầm và lưu audio:', url);
            } else {
                const db = await getDB();
                const tx = db.transaction(STORE_AUDIO, 'readwrite');
                const store = tx.objectStore(STORE_AUDIO);
                store.put(blob, url);
                console.log('[CacheManager] [IndexedDB] Đã tải ngầm và lưu audio:', url);
            }

            // Cập nhật timestamp truy cập cho bài hát vừa tải xong
            updateSongAccessTime(url);

            // Tiến hành dọn dẹp cache nếu vượt giới hạn
            await evictCacheIfNeeded();
        }
    } catch (error) {
        console.warn('[CacheManager] Lỗi tải ngầm audio:', url, error);
    }
}

// Kiểm tra xem bài hát đã có trong cache chưa
async function isAudioCached(url) {
    if (!url) return false;
    try {
        if (hasOPFS) {
            return await existsInOPFS('audio', url);
        }
        const db = await getDB();
        const tx = db.transaction(STORE_AUDIO, 'readonly');
        const store = tx.objectStore(STORE_AUDIO);
        const blob = await new Promise((resolve, reject) => {
            const req = store.get(url);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
        return !!blob;
    } catch (e) {
        return false;
    }
}

// Kiểm tra xem tài nguyên (JS/CSS/Khác) đã có trong cache chưa
async function isResourceCached(url) {
    if (!('caches' in window)) return false;
    try {
        const cacheKeys = await caches.keys();
        for (const key of cacheKeys) {
            const cache = await caches.open(key);
            const response = await cache.match(url);
            if (response) return true;
        }
        return false;
    } catch (e) {
        return false;
    }
}

// --- CACHE CHO THƯ VIỆN VÀ FONT CHỮ ---

// Tải và lưu các tài nguyên tĩnh
async function cacheStaticResources(urls = []) {
    if (!('caches' in window)) return;
    try {
        const cache = await caches.open(STATIC_CACHE_NAME);
        await Promise.all(urls.map(async (url) => {
            const response = await cache.match(url);
            if (!response) {
                console.log('[CacheManager] Đang tải và lưu cache tĩnh:', url);
                try {
                    const res = await fetch(url, { mode: 'cors' });
                    if (res.ok || res.type === 'opaque') {
                        await cache.put(url, res);
                    }
                } catch (err) {
                    console.warn('[CacheManager] Lỗi fetch static url:', url, err);
                }
            }
        }));
    } catch (error) {
        console.error('[CacheManager] Lỗi khi lưu cache static:', error);
    }
}

// Lấy URL của tài nguyên tĩnh 
async function getCachedStaticUrl(url) {
    return url;
}

// --- QUẢN LÝ CACHE BEATMAP (JSON & LAZY LOADING) ---

function isLocalhostOrDeadUrl(url) {
    if (!url || typeof url !== 'string') return false;
    return url.includes('127.0.0.1') || url.includes('localhost') || url.includes(':9091') || url.includes(':8000');
}
window.isLocalhostOrDeadUrl = isLocalhostOrDeadUrl;

function getBeatmapLookupKeys(input) {
    if (!input) return [];
    const keys = new Set();
    let str = '';
    let id = null;

    if (typeof input === 'object' && input !== null) {
        if (input.id !== undefined && input.id !== null && input.id !== '') id = String(input.id);
        if (input.lazyUrl && !isLocalhostOrDeadUrl(input.lazyUrl)) keys.add(input.lazyUrl);
        if (input.beatmapUrl && !isLocalhostOrDeadUrl(input.beatmapUrl)) keys.add(input.beatmapUrl);
        if (input.beatmap_url && !isLocalhostOrDeadUrl(input.beatmap_url)) keys.add(input.beatmap_url);
        if (input.url && !isLocalhostOrDeadUrl(input.url)) keys.add(input.url);
        str = input.lazyUrl || input.beatmapUrl || input.beatmap_url || (id ? `beatmap_${id}.json` : '');
    } else {
        str = String(input);
        const match = str.match(/(\d+)/);
        if (match) id = match[1];
    }

    if (str && !isLocalhostOrDeadUrl(str)) keys.add(str);

    if (id) {
        keys.add(`beatmap_${id}.json`);
        keys.add(`beatmap/music_${id}.json`);
        keys.add(`music_${id}.json`);
        keys.add(`music_${id}`);
        keys.add(`id_${id}`);
        keys.add(id);
    }

    return Array.from(keys);
}
window.getBeatmapLookupKeys = getBeatmapLookupKeys;

async function isJsonCached(url) {
    if (!url) return false;
    try {
        const keys = getBeatmapLookupKeys(url);
        if (hasOPFS) {
            for (const k of keys) {
                if (await existsInOPFS('json', k)) return true;
            }
        }
        const db = await getDB();
        const tx = db.transaction(STORE_JSON, 'readonly');
        const store = tx.objectStore(STORE_JSON);
        for (const k of keys) {
            const data = await new Promise((resolve) => {
                const req = store.get(k);
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => resolve(null);
            });
            if (data) return true;
        }

        // Kiểm tra thêm trong STORE_API_CACHE nếu có ID
        const match = String(url).match(/(\d+)/);
        if (match) {
            const apiCached = await getApiCache(`GET:/beatmaps/${match[1]}`, { allowExpired: true });
            if (apiCached && (apiCached.data?.beats || apiCached.beats)) return true;
        }

        return false;
    } catch (e) { return false; }
}

const jsonMemoryCache = new Map();

async function getCachedJson(url) {
    if (!url) return null;
    try {
        const keys = getBeatmapLookupKeys(url);
        for (const k of keys) {
            if (jsonMemoryCache.has(k)) {
                try {
                    const data = jsonMemoryCache.get(k);
                    return typeof data === 'string' ? JSON.parse(data) : data;
                } catch (e) {}
            }
        }
        if (hasOPFS) {
            for (const k of keys) {
                const data = await readJsonFromOPFS('json', k);
                if (data) {
                    try { jsonMemoryCache.set(k, JSON.stringify(data)); } catch (e) {}
                    return data;
                }
            }
        }
        const db = await getDB();
        const tx = db.transaction(STORE_JSON, 'readonly');
        const store = tx.objectStore(STORE_JSON);
        for (const k of keys) {
            const data = await new Promise((resolve) => {
                const req = store.get(k);
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => resolve(null);
            });
            if (data) {
                try { jsonMemoryCache.set(k, JSON.stringify(data)); } catch (e) {}
                return data;
            }
        }

        // Fallback kiểm tra trong STORE_API_CACHE nếu có ID
        const match = String(url).match(/(\d+)/);
        if (match) {
            const apiCached = await getApiCache(`GET:/beatmaps/${match[1]}`, { allowExpired: true });
            if (apiCached) {
                const innerData = apiCached.data || apiCached;
                if (innerData && (innerData.beats || Array.isArray(innerData))) {
                    return innerData;
                }
            }
        }

        return null;
    } catch (e) { }
    return null;
}

async function cacheJson(url, data) {
    if (!url || !data) return false;
    try {
        const dataStr = typeof data === 'string' ? data : JSON.stringify(data);

        // 1. Kiểm tra nhanh qua Memory Cache: nếu dữ liệu giống hệt, bỏ qua cập nhật
        if (jsonMemoryCache.has(url) && jsonMemoryCache.get(url) === dataStr) {
            return false;
        }

        // 2. So sánh với nội dung đã có trong OPFS hoặc IndexedDB
        let existingJson = null;
        if (hasOPFS) {
            existingJson = await readJsonFromOPFS('json', url);
        }
        if (!existingJson) {
            try {
                const db = await getDB();
                const tx = db.transaction(STORE_JSON, 'readonly');
                const store = tx.objectStore(STORE_JSON);
                existingJson = await new Promise((resolve) => {
                    const req = store.get(url);
                    req.onsuccess = () => resolve(req.result);
                    req.onerror = () => resolve(null);
                });
            } catch (e) {}
        }

        const parsedData = typeof data === 'string' ? JSON.parse(data) : data;

        if (existingJson) {
            const existingBeats = Array.isArray(existingJson.beats) ? existingJson.beats : (Array.isArray(existingJson) ? existingJson : null);
            const newBeats = Array.isArray(parsedData.beats) ? parsedData.beats : (Array.isArray(parsedData) ? parsedData : null);

            const isBeatsEqual = existingBeats && newBeats && (
                existingBeats === newBeats ||
                (existingBeats.length === newBeats.length && JSON.stringify(existingBeats) === JSON.stringify(newBeats))
            );
            const isBpmEqual = (existingJson.bpm || null) === (parsedData.bpm || null);
            const isSpeedEqual = (existingJson.speed || null) === (parsedData.speed || null);
            const isFakeEqual = (existingJson.no_fake_block === true) === (parsedData.no_fake_block === true);

            if (isBeatsEqual && isBpmEqual && isSpeedEqual && isFakeEqual) {
                // DB và Cache không có gì thay đổi, lưu vào memory để tra cứu nhanh và bỏ qua ghi đĩa
                jsonMemoryCache.set(url, dataStr);
                const match = String(url).match(/(\d+)/);
                if (match) {
                    jsonMemoryCache.set(`beatmap_${match[1]}.json`, dataStr);
                }
                return false;
            }
        }

        // 3. Có sự thay đổi hoặc chưa từng cache, tiến hành ghi vào Cache
        jsonMemoryCache.set(url, dataStr);
        const match = String(url).match(/(\d+)/);
        const alt = match ? `beatmap_${match[1]}.json` : null;
        if (alt) {
            jsonMemoryCache.set(alt, dataStr);
        }

        if (hasOPFS) {
            await writeToOPFS('json', url, dataStr);
            if (alt && alt !== url) {
                await writeToOPFS('json', alt, dataStr);
            }
            console.log('[CacheManager] [OPFS] Đã cập nhật beatmap JSON mới:', url);
            return true;
        }

        const db = await getDB();
        const tx = db.transaction(STORE_JSON, 'readwrite');
        const store = tx.objectStore(STORE_JSON);
        store.put(parsedData, url);
        if (alt && alt !== url) {
            store.put(parsedData, alt);
        }
        console.log('[CacheManager] [IndexedDB] Đã cập nhật beatmap JSON mới:', url);
        return true;
    } catch (e) {
        return false;
    }
}

/**
 * Trình giải quyết Beatmap thống nhất (Unified Beatmap Resolver):
 * Tìm nốt nhạc của bài hát trên toàn bộ các tầng Cache (OPFS 'json', STORE_JSON, STORE_API_CACHE, STORE_PLAYLIST)
 */
async function getCachedBeatmap(songOrId) {
    if (!songOrId) return null;
    const keys = getBeatmapLookupKeys(songOrId);

    // 1. Kiểm tra qua getCachedJson (bao gồm cả OPFS 'json', STORE_JSON và STORE_API_CACHE)
    for (const k of keys) {
        const json = await getCachedJson(k);
        if (json) {
            if (Array.isArray(json) && json.length > 0) {
                return { beats: json };
            }
            if (typeof json === 'object' && json !== null) {
                if (json.beats && Array.isArray(json.beats) && json.beats.length > 0) {
                    return json;
                }
                if (json.data && json.data.beats) {
                    return json.data;
                }
            }
        }
    }

    // 2. Kiểm tra trong STORE_PLAYLIST nếu có id hoặc url
    let id = null;
    if (typeof songOrId === 'object' && songOrId !== null) {
        id = songOrId.id;
    } else {
        const match = String(songOrId).match(/(\d+)/);
        if (match) id = match[1];
    }

    try {
        const dbPlaylist = await getCachedPlaylistFromDB();
        if (dbPlaylist && Array.isArray(dbPlaylist)) {
            const found = dbPlaylist.find(s => {
                if (id && (String(s.id) === String(id) || s.id === id)) return true;
                if (typeof songOrId === 'object' && songOrId !== null) {
                    if (songOrId.url && s.url === songOrId.url) return true;
                    if (songOrId.beatmapUrl && (s.beatmapUrl === songOrId.beatmapUrl || s.beatmap_url === songOrId.beatmapUrl)) return true;
                    if (songOrId.name && (s.name === songOrId.name || s.title === songOrId.name)) return true;
                }
                return false;
            });
            if (found && found.beats && Array.isArray(found.beats) && found.beats.length > 4) {
                return {
                    id: found.id,
                    title: found.title || found.name,
                    name: found.name || found.title,
                    artist: found.artist,
                    bpm: found.bpm,
                    speed: found.speed,
                    beats: found.beats,
                    url: found.url || found.file_url,
                    no_fake_block: found.no_fake_block === true
                };
            }
        }
    } catch (e) {}

    return null;
}
window.getCachedBeatmap = getCachedBeatmap;

async function isBeatmapCached(songOrId) {
    if (!songOrId) return false;
    if (typeof songOrId === 'object' && songOrId !== null && songOrId.beats && Array.isArray(songOrId.beats) && songOrId.beats.length > 4) {
        return true;
    }
    const keys = getBeatmapLookupKeys(songOrId);
    for (const k of keys) {
        if (await isJsonCached(k)) return true;
    }
    let id = (typeof songOrId === 'object' && songOrId !== null) ? songOrId.id : null;
    if (!id) {
        const match = String(songOrId).match(/(\d+)/);
        if (match) id = match[1];
    }
    try {
        const dbPlaylist = await getCachedPlaylistFromDB();
        if (dbPlaylist && Array.isArray(dbPlaylist)) {
            const found = dbPlaylist.find(s => {
                if (id && (String(s.id) === String(id) || s.id === id)) return true;
                if (typeof songOrId === 'object' && songOrId !== null) {
                    if (songOrId.url && s.url === songOrId.url) return true;
                    if (songOrId.beatmapUrl && (s.beatmapUrl === songOrId.beatmapUrl || s.beatmap_url === songOrId.beatmapUrl)) return true;
                    if (songOrId.name && (s.name === songOrId.name || s.title === songOrId.name)) return true;
                }
                return false;
            });
            if (found && found.beats && Array.isArray(found.beats) && found.beats.length > 4) {
                return true;
            }
        }
    } catch (e) {}
    return false;
}
window.isBeatmapCached = isBeatmapCached;

/**
 * Cập nhật một bài hát cụ thể trong STORE_PLAYLIST khi beatmap được tải ngầm (lazy loaded)
 */
async function updateCachedSongInPlaylistDB(songId, updatedFields) {
    if (!songId || !updatedFields || typeof updatedFields !== 'object') return;
    try {
        const storeKey = (typeof isCurrentUserAdmin === 'function' && isCurrentUserAdmin()) ? 'admin_playlist' : 'public_playlist';
        const pl = await getCachedPlaylistFromDB(storeKey);
        if (!pl || !Array.isArray(pl) || pl.length === 0) return;

        const targetIdStr = String(songId);
        const idx = pl.findIndex(s => {
            if (s.id !== undefined && s.id !== null && String(s.id) === targetIdStr) return true;
            if (typeof getBeatmapIdFromSong === 'function' && getBeatmapIdFromSong(s) === `id_${targetIdStr}`) return true;
            return false;
        });

        if (idx !== -1) {
            let hasChanged = false;
            for (const key of Object.keys(updatedFields)) {
                if (key === 'beats') {
                    if (JSON.stringify(pl[idx].beats) !== JSON.stringify(updatedFields.beats)) {
                        hasChanged = true;
                        break;
                    }
                } else if (pl[idx][key] !== updatedFields[key]) {
                    hasChanged = true;
                    break;
                }
            }
            if (!hasChanged) return; // Dữ liệu không thay đổi, bỏ qua ghi đĩa

            Object.assign(pl[idx], updatedFields);
            if (hasOPFS) {
                await writeToOPFS('playlist', storeKey, JSON.stringify(pl));
            }
            const db = await getDB();
            const tx = db.transaction(STORE_PLAYLIST, 'readwrite');
            const store = tx.objectStore(STORE_PLAYLIST);
            store.put(pl, storeKey);
            console.log(`[CacheManager] [Lazy Load] Đã cập nhật STORE_PLAYLIST cho bài #${songId}`);
        }
    } catch (e) {
        console.warn('[CacheManager] Lỗi cập nhật STORE_PLAYLIST:', e);
    }
}
window.updateCachedSongInPlaylistDB = updateCachedSongInPlaylistDB;

// Helper kiểm tra bài hát hợp lệ
function isValidSongItem(item) {
    if (!item || typeof item !== 'object') return false;
    const name = item.name || item.title;
    if (!name || typeof name !== 'string' || !name.trim()) return false;
    // Bắt buộc phải có thêm một trong các trường bài hát đặc thù
    return Boolean(item.url || item.file_url || item.beatmap_url || item.beatmapUrl || (Array.isArray(item.beats) && item.beats.length > 0) || item.bpm || item.artist);
}

// --- QUẢN LÝ CACHE PLAYLIST (TỐI ƯU CẬP NHẬT TRƯỜNG THAY ĐỔI) ---
async function cachePlaylistToDB(maps, customKey = null) {
    if (!Array.isArray(maps) || maps.length === 0) return;
    // LỌC NGHIÊM NGẶT: Chỉ lưu các bài hát thực sự hợp lệ có tên
    maps = maps.filter(isValidSongItem);
    if (maps.length === 0) return;

    const storeKey = customKey || ((typeof isCurrentUserAdmin === 'function' && isCurrentUserAdmin()) ? 'admin_playlist' : 'public_playlist');
    try {
        const existing = await getCachedPlaylistFromDB(storeKey, { rawOnly: true });
        if (existing && Array.isArray(existing) && existing.length > 0) {
            const getSongKey = (item) => {
                if (typeof getBeatmapIdFromSong === 'function') {
                    const id = getBeatmapIdFromSong(item);
                    if (id) return id;
                }
                if (item.id !== undefined && item.id !== null && item.id !== '') return `id_${item.id}`;
                if (item.beatmapUrl) return `bm_${item.beatmapUrl}`;
                if (item.url) return `url_${item.url}`;
                return `meta_${item.name || item.title || ''}_${item.artist || ''}`;
            };

            const existingMapById = new Map();
            existing.forEach(item => {
                if (!isValidSongItem(item)) return;
                const key = getSongKey(item);
                if (key) existingMapById.set(key, item);
            });

            let hasAnyChange = false;
            const visitedKeys = new Set();
            const merged = maps.map(newSong => {
                const key = getSongKey(newSong);
                if (key) visitedKeys.add(key);
                const oldSong = key ? existingMapById.get(key) : null;
                if (!oldSong) {
                    hasAnyChange = true;
                    return newSong;
                }

                // So sánh từng trường thay đổi
                let songChanged = false;
                const updatedSong = { ...oldSong };
                const fieldsToCheck = [
                    'name', 'title', 'artist', 'url', 'genre', 'bpm', 'speed',
                    'copyright_status', 'verified', 'warning_alert', 'is_available', 'no_fake_block',
                    'day_show', 'day_hide', 'date_show', 'time_hide'
                ];

                fieldsToCheck.forEach(f => {
                    if (newSong[f] !== undefined && newSong[f] !== oldSong[f]) {
                        updatedSong[f] = newSong[f];
                        songChanged = true;
                    }
                });

                if (newSong.beats && Array.isArray(newSong.beats) && newSong.beats.length > 0) {
                    if (JSON.stringify(newSong.beats) !== JSON.stringify(oldSong.beats)) {
                        updatedSong.beats = newSong.beats;
                        songChanged = true;
                    }
                }

                if (songChanged) {
                    hasAnyChange = true;
                    return updatedSong;
                }
                return oldSong;
            });

            // Giữ lại tất cả các bài hát đã có trong existing mà không có trong maps mới tải về
            // (tránh tình trạng chỉ tải page 1 có 20 bài làm xóa mất hàng chục bài nhạc đã lưu ngoại tuyến!)
            existing.forEach(oldSong => {
                if (!isValidSongItem(oldSong)) return;
                const key = getSongKey(oldSong);
                if (key && !visitedKeys.has(key)) {
                    merged.push(oldSong);
                }
            });

            // Nếu không có bất kỳ thay đổi nào và số lượng bài hát giữ nguyên, bỏ qua ghi để tối ưu hiệu năng
            if (!hasAnyChange && existing.length === merged.length) {
                return;
            }

            maps = merged;
        }

        if (hasOPFS) {
            await writeToOPFS('playlist', storeKey, JSON.stringify(maps));
        }
        const db = await getDB();
        const tx = db.transaction(STORE_PLAYLIST, 'readwrite');
        const store = tx.objectStore(STORE_PLAYLIST);
        store.put(maps, storeKey);

        // Nếu lưu admin_playlist, đồng bộ thêm các bài public vào public_playlist để người chơi offline không bị thiếu bài
        if (storeKey === 'admin_playlist') {
            const publicOnly = maps.filter(m => m.is_available !== false && m.is_available !== 0);
            if (publicOnly.length > 0) {
                if (hasOPFS) {
                    await writeToOPFS('playlist', 'public_playlist', JSON.stringify(publicOnly)).catch(() => {});
                }
                const txPub = db.transaction(STORE_PLAYLIST, 'readwrite');
                txPub.objectStore(STORE_PLAYLIST).put(publicOnly, 'public_playlist');
            }
        }
    } catch (e) {
        console.warn('[CacheManager] Lỗi lưu cache playlist:', e);
    }
}

async function getCachedPlaylistFromDB(customKey = null, options = {}) {
    const isAdmin = typeof isCurrentUserAdmin === 'function' && isCurrentUserAdmin();
    const primaryKey = customKey || (isAdmin ? 'admin_playlist' : 'public_playlist');
    const secondaryKey = primaryKey === 'admin_playlist' ? 'public_playlist' : 'admin_playlist';

    const getSongKey = (item) => {
        if (!item) return null;
        if (typeof getBeatmapIdFromSong === 'function') {
            const id = getBeatmapIdFromSong(item);
            if (id) return id;
        }
        if (item.id !== undefined && item.id !== null && item.id !== '') return `id_${item.id}`;
        if (item.beatmapUrl) return `bm_${item.beatmapUrl}`;
        if (item.beatmap_url) return `bm_${item.beatmap_url}`;
        if (item.url) return `url_${item.url}`;
        return `meta_${item.name || item.title || ''}_${item.artist || ''}`;
    };

    const mergeSongLists = (targetList, sourceList) => {
        if (!Array.isArray(sourceList) || sourceList.length === 0) return targetList;
        const keyMap = new Map();
        targetList.forEach((s, idx) => {
            const k = getSongKey(s);
            if (k) keyMap.set(k, idx);
        });

        sourceList.forEach(item => {
            // LỌC BỎ NGAY CÁC ITEM RÁC (ĐIỂM SỐ, LEADERBOARD, NOTIFICATION) KHÔNG PHẢI BÀI HÁT
            if (!isValidSongItem(item)) return;
            const k = getSongKey(item);
            if (!k) return;
            if (keyMap.has(k)) {
                const existing = targetList[keyMap.get(k)];
                // Giữ lại nốt nhạc beats nếu item mới có beats mà existing chưa có
                if ((!existing.beats || existing.beats.length <= 4) && item.beats && item.beats.length > 4) {
                    existing.beats = item.beats;
                    existing.loaded = true;
                }
                if (!existing.url && (item.url || item.file_url)) existing.url = item.url || item.file_url;
                if (!existing.bpm && item.bpm) existing.bpm = item.bpm;
                if (!existing.speed && item.speed) existing.speed = item.speed;
                if (existing.is_available === undefined && item.is_available !== undefined) existing.is_available = item.is_available;
            } else {
                keyMap.set(k, targetList.length);
                targetList.push(item);
            }
        });
        return targetList;
    };

    try {
        let combined = [];

        // 1. Đọc từ OPFS
        let primaryOpfs = null;
        let secondaryOpfs = null;
        if (hasOPFS) {
            primaryOpfs = await readJsonFromOPFS('playlist', primaryKey).catch(() => null);
            secondaryOpfs = await readJsonFromOPFS('playlist', secondaryKey).catch(() => null);
        }

        // 2. Đọc từ IndexedDB STORE_PLAYLIST
        let primaryIdb = null;
        let secondaryIdb = null;
        try {
            const db = await getDB();
            const tx = db.transaction(STORE_PLAYLIST, 'readonly');
            const store = tx.objectStore(STORE_PLAYLIST);
            primaryIdb = await new Promise(r => {
                const req = store.get(primaryKey);
                req.onsuccess = () => r(req.result);
                req.onerror = () => r(null);
            });
            secondaryIdb = await new Promise(r => {
                const req = store.get(secondaryKey);
                req.onsuccess = () => r(req.result);
                req.onerror = () => r(null);
            });
        } catch (e) {}

        const primaryList = (Array.isArray(primaryOpfs) && primaryOpfs.length > 0) ? primaryOpfs.filter(isValidSongItem) : (Array.isArray(primaryIdb) ? primaryIdb.filter(isValidSongItem) : []);
        const secondaryList = (Array.isArray(secondaryOpfs) && secondaryOpfs.length > 0) ? secondaryOpfs.filter(isValidSongItem) : (Array.isArray(secondaryIdb) ? secondaryIdb.filter(isValidSongItem) : []);

        combined = [...primaryList];
        mergeSongLists(combined, secondaryList);

        // 3. Quét thêm beatmaps từ STORE_API_CACHE có chọn lọc (CHỈ QUÉT KEY DANH SÁCH /beatmaps)
        try {
            const db = await getDB();
            const tx = db.transaction(STORE_API_CACHE, 'readonly');
            const store = tx.objectStore(STORE_API_CACHE);
            
            const apiMaps = [];
            if (typeof store.openCursor === 'function') {
                await new Promise((resolve) => {
                    const req = store.openCursor();
                    req.onsuccess = (e) => {
                        const cursor = e.target.result;
                        if (cursor) {
                            const key = String(cursor.key || '');
                            // CHỈ LẤY CÁC KEY LIÊN QUAN ĐẾN DANH SÁCH BÀI HÁT (/beatmaps) VÀ KHÔNG PHẢI LEADERBOARD/SCORES/IMPORT
                            if (key.includes('/beatmaps') && !key.includes('/leaderboard') && !key.includes('/scores') && !key.includes('/import')) {
                                const record = cursor.value;
                                const data = (record && record.data !== undefined) ? record.data : record;
                                const list = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
                                list.forEach(item => {
                                    if (isValidSongItem(item)) {
                                        apiMaps.push(item);
                                    }
                                });
                            }
                            cursor.continue();
                        } else {
                            resolve();
                        }
                    };
                    req.onerror = () => resolve();
                });
            }
            if (apiMaps.length > 0) {
                mergeSongLists(combined, apiMaps);
            }
        } catch (e) {}

        // 4. Bổ sung các bài hát mặc định (playlistSource) nếu chưa có
        if (!options.rawOnly && typeof playlistSource !== 'undefined' && Array.isArray(playlistSource) && playlistSource.length > 0) {
            mergeSongLists(combined, playlistSource);
        }

        // Đảm bảo 100% không còn bài rác
        combined = combined.filter(isValidSongItem);

        return combined.length > 0 ? combined : null;
    } catch (e) { return null; }
}

// Tự động quét và dọn sạch các bài hát rác (undefined/Unknown) bị kẹt trong Cache người dùng
async function sanitizeAndCleanPlaylistCache() {
    try {
        const db = await getDB();
        const tx = db.transaction(STORE_PLAYLIST, 'readwrite');
        const store = tx.objectStore(STORE_PLAYLIST);
        
        ['public_playlist', 'admin_playlist'].forEach(async (key) => {
            const req = store.get(key);
            req.onsuccess = async () => {
                const list = req.result;
                if (Array.isArray(list)) {
                    const cleanList = list.filter(isValidSongItem);
                    if (cleanList.length !== list.length) {
                        console.warn(`[CacheManager] Đã dọn dẹp ${list.length - cleanList.length} bài hát rác khỏi ${key}`);
                        const putTx = db.transaction(STORE_PLAYLIST, 'readwrite');
                        putTx.objectStore(STORE_PLAYLIST).put(cleanList, key);
                        if (hasOPFS) {
                            writeToOPFS('playlist', key, JSON.stringify(cleanList)).catch(() => {});
                        }
                    }
                }
            };
        });
    } catch (e) {}
}
// Chạy dọn rác ngầm khi khởi tạo
setTimeout(sanitizeAndCleanPlaylistCache, 1500);

// --- QUẢN LÝ CACHE REQUEST BACKEND (API CACHE) ---
const apiMemoryCache = new Map();

async function getApiCache(key, options = {}) {
    if (!key) return null;
    const todayStr = new Date().toISOString().split('T')[0];
    const isBeatmaps = key.includes('/beatmaps');
    const isOffline = (typeof navigator !== 'undefined' && !navigator.onLine) ||
                      (typeof window.isDatabaseOnline !== 'undefined' && window.isDatabaseOnline === false) ||
                      (typeof window.ApiService !== 'undefined' && typeof window.ApiService.isDbHealthy === 'function' && !window.ApiService.isDbHealthy());

    if (apiMemoryCache.has(key)) {
        const entry = apiMemoryCache.get(key);
        if (entry && typeof entry === 'object' && 'data' in entry) {
            // Nếu offline hoặc có cờ allowExpired: Trả về cache ngay lập tức dù khác ngày
            if (isBeatmaps && entry.cached_date && entry.cached_date !== todayStr && !options.allowExpired && !isOffline) {
                // Giữ lại trong memory để làm fallback nếu Backend/DB gặp sự cố
            } else {
                return entry.data;
            }
        } else {
            return entry;
        }
    }
    try {
        const db = await getDB();
        const tx = db.transaction(STORE_API_CACHE, 'readonly');
        const store = tx.objectStore(STORE_API_CACHE);
        const record = await new Promise((resolve) => {
            const req = store.get(key);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => resolve(null);
        });
        if (record) {
            const data = (record.data !== undefined) ? record.data : record;
            const cachedDate = record.cached_date;

            // Nếu offline hoặc có cờ allowExpired: Tự động dùng cache ngay!
            if (isBeatmaps && cachedDate && cachedDate !== todayStr && !options.allowExpired && !isOffline) {
                console.log('[CacheManager] Cache beatmap đã cũ (khác ngày hiện tại), ưu tiên làm mới từ Backend:', key);
                return null;
            }

            apiMemoryCache.set(key, record);
            return data;
        }
    } catch (e) {
        console.warn('[CacheManager] Lỗi đọc API Cache:', e);
    }
    return null;
}

async function setApiCache(key, data) {
    if (!key || data === undefined) return false;
    try {
        const todayStr = new Date().toISOString().split('T')[0];
        let existing = apiMemoryCache.get(key);
        if (!existing) {
            try {
                const db = await getDB();
                const tx = db.transaction(STORE_API_CACHE, 'readonly');
                const store = tx.objectStore(STORE_API_CACHE);
                existing = await new Promise((resolve) => {
                    const req = store.get(key);
                    req.onsuccess = () => resolve(req.result);
                    req.onerror = () => resolve(null);
                });
                if (existing) {
                    apiMemoryCache.set(key, existing);
                }
            } catch (e) {}
        }

        const dataStr = JSON.stringify(data);
        const existingData = existing ? (existing.data !== undefined ? existing.data : existing) : null;
        const existingDataStr = existingData ? JSON.stringify(existingData) : null;

        // Nếu dữ liệu Server và Cache hoàn toàn giống hệt nhau:
        if (existingDataStr && existingDataStr === dataStr) {
            if (existing && existing.cached_date !== todayStr) {
                existing.cached_date = todayStr;
                existing.updated_at = Date.now();
            }
            return false; // Không thay đổi, bỏ qua ghi đè!
        }

        const record = {
            data,
            updated_at: Date.now(),
            cached_date: todayStr
        };
        apiMemoryCache.set(key, record);
        const db = await getDB();
        const tx = db.transaction(STORE_API_CACHE, 'readwrite');
        const store = tx.objectStore(STORE_API_CACHE);
        store.put(record, key);
        return true; // Có thay đổi thực sự
    } catch (e) {
        console.warn('[CacheManager] Lỗi ghi API Cache:', e);
        return false;
    }
}

async function deleteApiCache(pattern) {
    try {
        for (const k of apiMemoryCache.keys()) {
            if (!pattern || k.includes(pattern)) {
                apiMemoryCache.delete(k);
            }
        }
        const db = await getDB();
        const tx = db.transaction(STORE_API_CACHE, 'readwrite');
        const store = tx.objectStore(STORE_API_CACHE);
        if (!pattern) {
            store.clear();
        } else {
            await new Promise((resolve) => {
                const req = store.getAllKeys();
                req.onsuccess = () => {
                    const keys = req.result || [];
                    for (const k of keys) {
                        if (typeof k === 'string' && k.includes(pattern)) {
                            store.delete(k);
                        }
                    }
                    resolve();
                };
                req.onerror = () => resolve();
            });
        }

        // Nếu xóa cache beatmaps, cũng xóa luôn cache playlist lưu trong IndexedDB & OPFS
        if (!pattern || pattern.includes('beatmap') || pattern.includes('playlist')) {
            try {
                const txPl = db.transaction(STORE_PLAYLIST, 'readwrite');
                txPl.objectStore(STORE_PLAYLIST).clear();
                if (hasOPFS) {
                    await clearOPFSDirectory('playlist');
                }
            } catch (e) {}
        }
    } catch (e) {
        console.warn('[CacheManager] Lỗi xóa API Cache theo pattern:', pattern, e);
    }
}

async function clearAllApiCache() {
    apiMemoryCache.clear();
    try {
        const db = await getDB();
        const tx = db.transaction(STORE_API_CACHE, 'readwrite');
        tx.objectStore(STORE_API_CACHE).clear();
        console.log('[CacheManager] Đã xóa toàn bộ API Cache.');
    } catch (e) {}
}

// Xóa toàn bộ bộ nhớ đệm
async function clearAllCache() {
    try {
        // Xóa dữ liệu trong IndexedDB
        const db = await getDB();
        const tx = db.transaction([STORE_AUDIO, STORE_JSON, STORE_PLAYLIST, STORE_API_CACHE], 'readwrite');
        tx.objectStore(STORE_AUDIO).clear();
        tx.objectStore(STORE_JSON).clear();
        tx.objectStore(STORE_PLAYLIST).clear();
        tx.objectStore(STORE_API_CACHE).clear();
        apiMemoryCache.clear();

        // Xóa dữ liệu trong OPFS nếu có
        if (hasOPFS) {
            await clearOPFSDirectory('audio');
            await clearOPFSDirectory('json');
            await clearOPFSDirectory('playlist');
        }

        // Giải phóng Blob URLs
        for (const blobUrl of cachedAudioUrls.values()) {
            URL.revokeObjectURL(blobUrl);
        }
        cachedAudioUrls.clear();

        // Xóa Cache Storage (Static)
        if ('caches' in window) {
            const cacheKeys = await caches.keys();
            await Promise.all(cacheKeys.map(key => caches.delete(key)));
        }

        // Xóa map_etag_ trong localStorage
        for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            if (key && key.startsWith('map_etag_')) {
                localStorage.removeItem(key);
            }
        }

        console.log('[CacheManager] Đã xóa toàn bộ bộ nhớ đệm và giải phóng RAM.');
    } catch (e) { }
}

// Xóa riêng bộ nhớ đệm beatmap (JSON)
async function clearBeatmapCache() {
    try {
        const db = await getDB();
        const tx = db.transaction([STORE_JSON, STORE_PLAYLIST], 'readwrite');
        tx.objectStore(STORE_JSON).clear();
        tx.objectStore(STORE_PLAYLIST).clear();

        // Xóa trong OPFS
        if (hasOPFS) {
            await clearOPFSDirectory('json');
            await clearOPFSDirectory('playlist');
        }

        // Xóa API cache beatmaps
        await deleteApiCache('/beatmaps');

        // Xóa map_etag_ trong localStorage
        for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            if (key && key.startsWith('map_etag_')) {
                localStorage.removeItem(key);
            }
        }

        // Đặt lại cờ loaded và beats mặc định của playlist
        if (typeof playlist !== 'undefined' && Array.isArray(playlist)) {
            playlist.forEach(song => {
                if (song.lazyUrl) {
                    song.loaded = false;
                    song.beats = [0, 1, 2, 3];
                }
            });
        }
        console.log('[CacheManager] Đã xóa toàn bộ cache beatmap.');
    } catch (e) {
        console.error('[CacheManager] Lỗi khi xóa cache beatmap:', e);
    }
}

// Xóa cache âm thanh & beatmap của một bài hát cụ thể
async function deleteSongCache(url, lazyUrl) {
    try {
        const db = await getDB();

        // 1. Thực hiện toàn bộ thao tác xóa trên IndexedDB đồng bộ (tránh await giữa chừng khiến transaction bị auto-commit)
        await new Promise((resolve, reject) => {
            const tx = db.transaction([STORE_AUDIO, STORE_JSON], 'readwrite');
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
            tx.onabort = () => reject(tx.error);

            if (url) {
                tx.objectStore(STORE_AUDIO).delete(url);
            }
            if (lazyUrl) {
                tx.objectStore(STORE_JSON).delete(lazyUrl);

                // Xóa kèm các biến thể format key nếu có ID
                const match = lazyUrl.match(/(\d+)/);
                if (match) {
                    const songId = match[1];
                    tx.objectStore(STORE_JSON).delete(`beatmap_${songId}.json`);
                    tx.objectStore(STORE_JSON).delete(`beatmap/music_${songId}.json`);
                }
            }
        });

        // 2. Xóa cache OPFS, ObjectURL và localStorage / API cache sau khi IDB transaction đã hoàn tất
        if (url) {
            if (hasOPFS) {
                await deleteFromOPFS('audio', url);
            }
            if (cachedAudioUrls.has(url)) {
                URL.revokeObjectURL(cachedAudioUrls.get(url));
                cachedAudioUrls.delete(url);
            }

            // Xóa khỏi metadata dọn dẹp cache
            try {
                const metaStr = localStorage.getItem('music_cache_metadata');
                if (metaStr) {
                    const meta = JSON.parse(metaStr);
                    if (meta[url]) {
                        delete meta[url];
                        localStorage.setItem('music_cache_metadata', JSON.stringify(meta));
                    }
                }
            } catch (e) { }
        }

        if (lazyUrl) {
            if (hasOPFS) {
                await deleteFromOPFS('json', lazyUrl);
            }
            localStorage.removeItem(`map_etag_${lazyUrl}`);

            // Xóa kèm các biến thể format key nếu có ID
            const match = lazyUrl.match(/(\d+)/);
            if (match) {
                const songId = match[1];
                const alt1 = `beatmap_${songId}.json`;
                const alt2 = `beatmap/music_${songId}.json`;
                if (hasOPFS) {
                    await deleteFromOPFS('json', alt1);
                    await deleteFromOPFS('json', alt2);
                }
                localStorage.removeItem(`map_etag_${alt1}`);
                localStorage.removeItem(`map_etag_${alt2}`);

                if (typeof deleteApiCache === 'function') {
                    deleteApiCache(`/beatmaps/${songId}`);
                }
                if (typeof updateCachedSongInPlaylistDB === 'function') {
                    updateCachedSongInPlaylistDB(songId, { loaded: false, beats: [0, 1, 2, 3] });
                }
            }
        }
        console.log(`[CacheManager] Đã xóa cache bài hát: ${url} / ${lazyUrl}`);
    } catch (e) {
        console.error('[CacheManager] Lỗi khi xóa cache bài hát:', e);
    }
}

const clearAudioCache = clearAllCache;

// --- EXPOSE TO GLOBAL SCOPE ---
window.getCachedAudioUrl = getCachedAudioUrl;
window.getCachedAudioUrlWithProgress = getCachedAudioUrlWithProgress;
window.cacheAudioInBackground = cacheAudioInBackground;
window.isAudioCached = isAudioCached;
window.isResourceCached = isResourceCached;
window.cacheStaticResources = cacheStaticResources;
window.getCachedStaticUrl = getCachedStaticUrl;
window.isJsonCached = isJsonCached;
window.getCachedJson = getCachedJson;
window.getCachedBeatmap = getCachedBeatmap;
window.isBeatmapCached = isBeatmapCached;
window.updateCachedSongInPlaylistDB = updateCachedSongInPlaylistDB;
window.getBeatmapLookupKeys = getBeatmapLookupKeys;
window.cacheJson = cacheJson;
window.cachePlaylistToDB = cachePlaylistToDB;
window.getCachedPlaylistFromDB = getCachedPlaylistFromDB;
window.clearAllCache = clearAllCache;
window.clearBeatmapCache = clearBeatmapCache;
window.deleteSongCache = deleteSongCache;
window.clearAudioCache = clearAudioCache;
window.getApiCache = getApiCache;
window.setApiCache = setApiCache;
window.deleteApiCache = deleteApiCache;
window.clearAllApiCache = clearAllApiCache;

// Tự động kiểm tra và dọn dẹp cache cũ sau 2 giây khi khởi động game
setTimeout(() => {
    evictCacheIfNeeded();
}, 2000);