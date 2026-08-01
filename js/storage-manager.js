// ============================================================
//  storage-manager.js — Quản lý dọn dẹp bộ nhớ (LocalStorage + IndexedDB + OPFS + Cache Storage)
// ============================================================

window.StorageManager = {
    // --- 1. TÍNH TOÁN DUNG LƯỢNG LƯU TRỮ CHUNG (ESTIMATE STORAGE USAGE) ---
    async getStorageEstimate() {
        let usage = 0;
        let quota = 0;
        if (navigator.storage && navigator.storage.estimate) {
            try {
                const estimate = await navigator.storage.estimate();
                usage = estimate.usage || 0;
                quota = estimate.quota || 0;
            } catch (e) {
                console.warn('[StorageManager] Lỗi lấy ước tính dung lượng:', e);
            }
        }
        return { usage, quota };
    },

    // --- 2. TÍNH TOÁN CHI TIẾT BỘ NHỚ OPFS (ORIGIN PRIVATE FILE SYSTEM) ---
    async getOPFSEstimate() {
        let totalAudioBytes = 0;
        let audioCount = 0;
        let jsonCount = 0;
        const hasOPFS = typeof navigator !== 'undefined' && navigator.storage && typeof navigator.storage.getDirectory === 'function';

        if (!hasOPFS) return { hasOPFS: false, totalAudioBytes: 0, audioCount: 0, jsonCount: 0 };

        try {
            const root = await navigator.storage.getDirectory();

            // 1. Quét thư mục 'audio' trong OPFS
            try {
                const audioDirHandle = await root.getDirectoryHandle('audio', { create: false });
                for await (const entry of audioDirHandle.values()) {
                    if (entry.kind === 'file') {
                        audioCount++;
                        try {
                            const file = await entry.getFile();
                            totalAudioBytes += file.size || 0;
                        } catch (e) {}
                    }
                }
            } catch (e) {}

            // 2. Quét thư mục 'json' trong OPFS
            try {
                const jsonDirHandle = await root.getDirectoryHandle('json', { create: false });
                for await (const entry of jsonDirHandle.values()) {
                    if (entry.kind === 'file') {
                        jsonCount++;
                    }
                }
            } catch (e) {}
        } catch (e) {
            console.warn('[StorageManager] Lỗi kiểm tra OPFS:', e);
        }

        return { hasOPFS: true, totalAudioBytes, audioCount, jsonCount };
    },

    // --- 3. TÍNH TOÁN CHI TIẾT BỘ NHỚ INDEXEDDB (ESTIMATE INDEXEDDB USAGE) ---
    async getIndexedDBEstimate() {
        let totalAudioBytes = 0;
        let audioCount = 0;
        let jsonCount = 0;
        let scoreCount = 0;

        try {
            const db = typeof getDB === 'function' ? await getDB() : (typeof initDB === 'function' ? await initDB() : null);
            if (db) {
                // 1. Tính toán dung lượng & số lượng audio_cache
                if (db.objectStoreNames.contains('audio_cache')) {
                    const tx = db.transaction('audio_cache', 'readonly');
                    const store = tx.objectStore('audio_cache');
                    const cursorReq = store.openCursor();
                    await new Promise((resolve) => {
                        cursorReq.onsuccess = (e) => {
                            const cursor = e.target.result;
                            if (cursor) {
                                audioCount++;
                                const val = cursor.value;
                                if (val) {
                                    if (val instanceof ArrayBuffer) totalAudioBytes += val.byteLength;
                                    else if (val instanceof Blob) totalAudioBytes += val.size;
                                    else if (typeof val === 'string') totalAudioBytes += val.length;
                                    else if (val.data && val.data instanceof ArrayBuffer) totalAudioBytes += val.data.byteLength;
                                }
                                cursor.continue();
                            } else {
                                resolve();
                            }
                        };
                        cursorReq.onerror = () => resolve();
                    });
                }

                // 2. Đếm số lượng json_cache
                if (db.objectStoreNames.contains('json_cache')) {
                    const tx = db.transaction('json_cache', 'readonly');
                    const store = tx.objectStore('json_cache');
                    const countReq = store.count();
                    jsonCount = await new Promise((resolve) => {
                        countReq.onsuccess = () => resolve(countReq.result || 0);
                        countReq.onerror = () => resolve(0);
                    });
                }

                // 3. Đếm số lượng highScores
                if (db.objectStoreNames.contains('highScores')) {
                    const tx = db.transaction('highScores', 'readonly');
                    const store = tx.objectStore('highScores');
                    const countReq = store.count();
                    scoreCount = await new Promise((resolve) => {
                        countReq.onsuccess = () => resolve(countReq.result || 0);
                        countReq.onerror = () => resolve(0);
                    });
                }
            }
        } catch (e) {
            console.warn('[StorageManager] Lỗi tính toán IndexedDB:', e);
        }

        return { totalAudioBytes, audioCount, jsonCount, scoreCount };
    },

    // --- 4. CẬP NHẬT UI HIỂN THỊ DUNG LƯỢNG (UPDATE UI STATS FOR OPFS + INDEXEDDB + STORAGE API) ---
    async updateStorageUI() {
        const usedText = document.getElementById('storage-used-text');
        const usedBar = document.getElementById('storage-used-bar');
        const opfsAudioStats = document.getElementById('opfs-audio-stats');
        const opfsBeatmapStats = document.getElementById('opfs-beatmap-stats');
        const idbAudioStats = document.getElementById('idb-audio-stats');
        const idbBeatmapStats = document.getElementById('idb-beatmap-stats');

        try {
            // 1. Cập nhật dung lượng chung (Storage API)
            const { usage, quota } = await this.getStorageEstimate();
            const usageMB = (usage / (1024 * 1024)).toFixed(2);

            let displayText = `${usageMB} MB`;
            let percentage = 0;

            if (quota > 0) {
                percentage = Math.min(100, Math.max(0, (usage / quota) * 100)).toFixed(1);
                const quotaGB = (quota / (1024 * 1024 * 1024)).toFixed(1);
                displayText = `${usageMB} MB / ${quotaGB} GB (${percentage}%)`;
            }

            if (usedText) usedText.innerText = displayText;
            if (usedBar) usedBar.style.width = `${Math.max(2, percentage)}%`;

            // 2. Cập nhật thống kê chi tiết OPFS
            const opfsStats = await this.getOPFSEstimate();
            if (opfsAudioStats) {
                if (opfsStats.hasOPFS) {
                    const mb = (opfsStats.totalAudioBytes / (1024 * 1024)).toFixed(2);
                    opfsAudioStats.innerText = `${opfsStats.audioCount} bài (${mb} MB)`;
                } else {
                    opfsAudioStats.innerText = 'Không hỗ trợ';
                }
            }
            if (opfsBeatmapStats) {
                if (opfsStats.hasOPFS) {
                    opfsBeatmapStats.innerText = `${opfsStats.jsonCount} map`;
                } else {
                    opfsBeatmapStats.innerText = 'Không hỗ trợ';
                }
            }

            // 3. Cập nhật thống kê chi tiết IndexedDB
            const idbStats = await this.getIndexedDBEstimate();
            if (idbAudioStats) {
                const mb = (idbStats.totalAudioBytes / (1024 * 1024)).toFixed(2);
                idbAudioStats.innerText = `${idbStats.audioCount} bài (${mb} MB)`;
            }
            if (idbBeatmapStats) {
                idbBeatmapStats.innerText = `${idbStats.jsonCount} map`;
            }

            // Reload danh sách bài hát trong storage nếu có hàm
            if (typeof window.renderStorageSongsList === 'function') {
                window.renderStorageSongsList();
            }
        } catch (e) {
            console.error('[StorageManager] Lỗi cập nhật UI storage:', e);
        }
    },

    // --- 5. SỰ KIỆN NÚT LÀM MỚI (REFRESH STORAGE) ---
    async refreshStorage() {
        const icon = document.getElementById('refresh-storage-icon');
        if (icon) icon.classList.add('animate-spin');

        await this.updateStorageUI();

        setTimeout(() => {
            if (icon) icon.classList.remove('animate-spin');
            const msg = typeof t === 'function' ? t('msg_storage_refreshed') : 'Đã cập nhật dung lượng bộ nhớ!';
            if (typeof showCyberToast === 'function') {
                showCyberToast(msg, 'info');
            }
        }, 300);
    },

    // --- HELPER DỌN DẸP THƯ MỤC OPFS ---
    async clearOPFSDir(dirName) {
        if (typeof clearOPFSDirectory === 'function') {
            await clearOPFSDirectory(dirName).catch(() => {});
        } else if (typeof navigator !== 'undefined' && navigator.storage && typeof navigator.storage.getDirectory === 'function') {
            try {
                const root = await navigator.storage.getDirectory();
                await root.removeEntry(dirName, { recursive: true }).catch(() => {});
            } catch (e) {}
        }
    },

    // --- 6. LUỒNG XỬ LÝ DỌN DẸP BỘ NHỚ CÁC PHÍA (LOCALSTORAGE + INDEXEDDB + OPFS + CACHE API) ---
    async handleClearStorage(mode) {
        console.log(`[StorageManager] Bắt đầu dọn dẹp tất cả các phía (LocalStorage + IndexedDB + OPFS) với mode: ${mode}`);

        try {
            switch (mode) {
                case 'keep_audio':
                    await this.clearKeepAudio();
                    break;
                case 'full_beatmap':
                    await this.clearFullBeatmap();
                    break;
                case 'audio_only':
                    await this.clearAudioOnly();
                    break;
                case 'reset_all':
                    await this.clearResetAll();
                    break;
                default:
                    throw new Error(`Mode không hợp lệ: ${mode}`);
            }

            // Cập nhật lại UI dung lượng tất cả các phía ngay lập tức
            await this.updateStorageUI();
            return { success: true, mode };
        } catch (error) {
            console.error(`[StorageManager] Lỗi khi thực thi mode ${mode}:`, error);
            return { success: false, mode, error: error.message };
        }
    },

    // --- MODE 1: Beatmap - Chỉ giữ lại nhạc (keep_audio) ---
    async clearKeepAudio() {
        // [1. IndexedDB] Clear toàn bộ json_cache & playlist_cache (Giữ lại audio_cache)
        if (typeof getDB === 'function') {
            try {
                const db = await getDB();
                if (db.objectStoreNames.contains('json_cache')) {
                    const tx = db.transaction('json_cache', 'readwrite');
                    tx.objectStore('json_cache').clear();
                }
                if (db.objectStoreNames.contains('playlist_cache')) {
                    const tx = db.transaction('playlist_cache', 'readwrite');
                    tx.objectStore('playlist_cache').clear();
                }
            } catch (e) { console.warn('[StorageManager] Lỗi clear json_cache DB:', e); }
        }

        // [2. OPFS] Clear thư mục json & playlist (Giữ lại thư mục audio)
        await this.clearOPFSDir('json');
        await this.clearOPFSDir('playlist');

        // [3. Cache Storage API] Clear các response JSON beatmap / playlist
        if ('caches' in window) {
            try {
                const cacheKeys = await caches.keys();
                await Promise.all(cacheKeys.map(async key => {
                    const cache = await caches.open(key);
                    const requests = await cache.keys();
                    for (const req of requests) {
                        if (req.url.endsWith('.json') || req.url.includes('/beatmap/') || req.url.includes('/playlist/')) {
                            await cache.delete(req);
                        }
                    }
                }));
            } catch (e) { console.warn('[StorageManager] Lỗi clear json caches:', e); }
        }

        // [4. LocalStorage] Quét sạch tất cả key liên quan đến Beatmap, note, timing, etag, dữ liệu rác
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (
                key.startsWith('map_etag_') ||
                key.startsWith('beatmap_') ||
                key.startsWith('custom_beatmap_') ||
                key.startsWith('temp_map_') ||
                key.startsWith('beat_cache_') ||
                key.startsWith('song_metadata_') ||
                key.includes('_notes') ||
                key.includes('_timing')
            )) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));

        localStorage.removeItem('cached_playlist_data');
        localStorage.removeItem('playlist_last_updated');

        // [5. RAM] Reset cờ beatmap trong playlist RAM
        if (typeof playlist !== 'undefined' && Array.isArray(playlist)) {
            playlist.forEach(song => {
                if (song.lazyUrl) {
                    song.loaded = false;
                    song.beats = [0, 1, 2, 3];
                }
            });
        }
    },

    // --- MODE 2: Beatmap - Xóa toàn bộ (Nhạc + Beatmap + Dữ liệu rác) (full_beatmap) ---
    async clearFullBeatmap() {
        // Xóa cả phía âm thanh và phía beatmap ở tất cả kho chứa (IndexedDB, OPFS, LocalStorage, Cache API)
        await this.clearKeepAudio();
        await this.clearAudioOnly();

        // Quét sạch rác bổ sung
        localStorage.removeItem('music_cache_metadata');
        localStorage.removeItem('cached_playlist_data');
        localStorage.removeItem('playlist_last_updated');
    },

    // --- MODE 3: Chỉ xóa Nhạc (Music Only) (audio_only) ---
    async clearAudioOnly() {
        // [1. IndexedDB] Clear audio_cache
        if (typeof getDB === 'function') {
            try {
                const db = await getDB();
                if (db.objectStoreNames.contains('audio_cache')) {
                    const tx = db.transaction('audio_cache', 'readwrite');
                    tx.objectStore('audio_cache').clear();
                }
            } catch (e) { console.warn('[StorageManager] Lỗi clear audio_cache DB:', e); }
        }

        // [2. OPFS] Clear audio directory
        await this.clearOPFSDir('audio');

        // [3. RAM] Giải phóng Blob URLs bài hát (Bỏ qua file SFX / âm thanh mặc định của game)
        if (typeof cachedAudioUrls !== 'undefined' && cachedAudioUrls instanceof Map) {
            for (const [url, blobUrl] of cachedAudioUrls.entries()) {
                const lowerUrl = url.toLowerCase();
                const isSystemSfx = lowerUrl.includes('/sfx/') || lowerUrl.includes('/sounds/') || lowerUrl.includes('/assets/');
                if (!isSystemSfx) {
                    URL.revokeObjectURL(blobUrl);
                    cachedAudioUrls.delete(url);
                }
            }
        }

        // [4. Cache Storage API] Clear audio entries (Bỏ qua các file SFX / âm thanh mặc định của hệ thống)
        if ('caches' in window) {
            try {
                const cacheKeys = await caches.keys();
                await Promise.all(cacheKeys.map(async key => {
                    const cache = await caches.open(key);
                    const requests = await cache.keys();
                    for (const req of requests) {
                        const url = req.url.toLowerCase();
                        const isSystemSfx = url.includes('/sfx/') || url.includes('/sounds/') || url.includes('/assets/') || url.includes('click') || url.includes('jump');
                        if (!isSystemSfx && (url.endsWith('.mp3') || url.endsWith('.ogg') || url.endsWith('.wav') || url.includes('/songs/') || url.includes('/audio/'))) {
                            await cache.delete(req);
                        }
                    }
                }));
            } catch (e) { console.warn('[StorageManager] Lỗi clear audio caches:', e); }
        }

        // [5. LocalStorage] Clear metadata cache nhạc (Bảo lưu toàn bộ cài đặt Âm lượng & SFX mặc định)
        localStorage.removeItem('music_cache_metadata');
    },

    // --- MODE 4: Xóa toàn bộ dữ liệu (Clear All) (reset_all) ---
    async clearResetAll() {
        // Bảo lưu toàn bộ Cài đặt Âm lượng & SFX Mặc định
        const audioSettings = {};
        const audioKeys = [
            'menuVolume', 'previewVolume', 'gameVolume', 'sfxVolume', 'playSfxVolume',
            'pregameVolume', 'roundVolume', 'mfxGameOverVolume', 'uiVolume', 'breakBlockVolume',
            'isMenuMuted', 'isPreviewMuted', 'isGameMuted', 'isSfxMuted'
        ];
        audioKeys.forEach(k => {
            const val = localStorage.getItem(k);
            if (val !== null) audioSettings[k] = val;
        });

        // [1. IndexedDB] Clear tất cả store và xóa toàn bộ DB file
        if (typeof getDB === 'function') {
            try {
                const db = await getDB();
                const stores = Array.from(db.objectStoreNames);
                if (stores.length > 0) {
                    const tx = db.transaction(stores, 'readwrite');
                    stores.forEach(storeName => tx.objectStore(storeName).clear());
                }
                if (typeof db.close === 'function') db.close();
            } catch (e) { console.warn('[StorageManager] Lỗi clear IndexedDB stores:', e); }
        }

        if (window.indexedDB) {
            try {
                indexedDB.deleteDatabase("MagicHopDB");
            } catch (e) {}
        }

        // [2. OPFS] Clear toàn bộ thư mục audio, json, playlist
        await this.clearOPFSDir('audio');
        await this.clearOPFSDir('json');
        await this.clearOPFSDir('playlist');

        // [3. Cache Storage] Clear toàn bộ
        if ('caches' in window) {
            try {
                const cacheKeys = await caches.keys();
                await Promise.all(cacheKeys.map(key => caches.delete(key)));
            } catch (e) {}
        }

        // [4. RAM] Revoke Blob URLs
        if (typeof cachedAudioUrls !== 'undefined' && cachedAudioUrls instanceof Map) {
            for (const blobUrl of cachedAudioUrls.values()) {
                URL.revokeObjectURL(blobUrl);
            }
            cachedAudioUrls.clear();
        }

        // [5. LocalStorage] Reset toàn bộ LocalStorage (khôi phục auth token & Cài đặt Âm thanh/SFX)
        const authToken = localStorage.getItem('auth_token');
        const authTokenExp = localStorage.getItem('auth_token_exp');

        localStorage.clear();

        if (authToken) {
            localStorage.setItem('auth_token', authToken);
            if (authTokenExp) localStorage.setItem('auth_token_exp', authTokenExp);
        }

        // Khôi phục cài đặt âm lượng & SFX mặc định
        Object.keys(audioSettings).forEach(k => {
            localStorage.setItem(k, audioSettings[k]);
        });
    },

    // --- 7. HIỂN THỊ MODAL CHỌN CHẾ ĐỘ XÓA (CLEAR OPTIONS MODAL WITH I18N) ---
    openClearStorageModal() {
        const getT = (key, fallback) => (typeof t === 'function' ? t(key) : fallback);

        const modalSelectText = getT('modal_clear_storage_select', 'Vui lòng chọn 1 trong 4 chế độ dọn dẹp bộ nhớ bên dưới:');
        const mode1Title = getT('clear_mode_1_title', '1. Beatmap — Chỉ giữ lại nhạc');
        const mode1Desc = getT('clear_mode_1_desc', 'Xóa dữ liệu note, timing, metadata beatmap nhưng giữ nguyên file nhạc mp3/ogg.');
        const mode2Title = getT('clear_mode_2_title', '2. Beatmap — Xóa toàn bộ (Nhạc + Beatmap + Rác)');
        const mode2Desc = getT('clear_mode_2_desc', 'Xóa toàn bộ nhạc, cấu hình beatmap và dọn dẹp tất cả dữ liệu tạm liên quan.');
        const mode3Title = getT('clear_mode_3_title', '3. Chỉ xóa Nhạc (Music Only)');
        const mode3Desc = getT('clear_mode_3_desc', 'Chỉ xóa các file âm thanh đã tải về, giữ nguyên cấu hình beatmap và cài đặt.');
        const mode4Title = getT('clear_mode_4_title', '4. Xóa toàn bộ dữ liệu (Clear All)');
        const mode4Desc = getT('clear_mode_4_desc', 'Reset toàn bộ Local Storage, Cache, IndexedDB về mặc định ban đầu.');

        const modalHtml = `
            <div class="space-y-4 text-left">
                <p class="text-xs text-gray-300 leading-relaxed font-orbitron">
                    ${modalSelectText}
                </p>

                <div class="space-y-2.5">
                    <!-- Option 1: Keep Audio -->
                    <label class="flex items-start gap-3 p-2.5 rounded-lg bg-cyan-950/30 border border-cyan-500/30 hover:border-cyan-400 cursor-pointer transition-all">
                        <input type="radio" name="clear-storage-mode" value="keep_audio" class="mt-1 accent-cyan-400" checked>
                        <div class="flex flex-col">
                            <span class="text-xs font-bold text-cyan-300 font-orbitron uppercase">${mode1Title}</span>
                            <span class="text-[10px] text-gray-400 mt-0.5">${mode1Desc}</span>
                        </div>
                    </label>

                    <!-- Option 2: Full Beatmap -->
                    <label class="flex items-start gap-3 p-2.5 rounded-lg bg-cyan-950/30 border border-cyan-500/30 hover:border-cyan-400 cursor-pointer transition-all">
                        <input type="radio" name="clear-storage-mode" value="full_beatmap" class="mt-1 accent-cyan-400">
                        <div class="flex flex-col">
                            <span class="text-xs font-bold text-yellow-300 font-orbitron uppercase">${mode2Title}</span>
                            <span class="text-[10px] text-gray-400 mt-0.5">${mode2Desc}</span>
                        </div>
                    </label>

                    <!-- Option 3: Music Only -->
                    <label class="flex items-start gap-3 p-2.5 rounded-lg bg-cyan-950/30 border border-cyan-500/30 hover:border-cyan-400 cursor-pointer transition-all">
                        <input type="radio" name="clear-storage-mode" value="audio_only" class="mt-1 accent-cyan-400">
                        <div class="flex flex-col">
                            <span class="text-xs font-bold text-orange-300 font-orbitron uppercase">${mode3Title}</span>
                            <span class="text-[10px] text-gray-400 mt-0.5">${mode3Desc}</span>
                        </div>
                    </label>

                    <!-- Option 4: Clear All -->
                    <label class="flex items-start gap-3 p-2.5 rounded-lg bg-red-950/30 border border-red-500/40 hover:border-red-400 cursor-pointer transition-all">
                        <input type="radio" name="clear-storage-mode" value="reset_all" class="mt-1 accent-red-400">
                        <div class="flex flex-col">
                            <span class="text-xs font-bold text-red-400 font-orbitron uppercase">${mode4Title}</span>
                            <span class="text-[10px] text-gray-400 mt-0.5">${mode4Desc}</span>
                        </div>
                    </label>
                </div>
            </div>
        `;

        if (typeof showCyberModal === 'function') {
            showCyberModal({
                title: getT('btn_clear_storage', 'CLEAR STORAGE'),
                message: modalHtml,
                type: 'confirm',
                doubleConfirm: true,
                onConfirm: async () => {
                    const selectedMode = document.querySelector('input[name="clear-storage-mode"]:checked');
                    if (!selectedMode) {
                        const msgWarn = getT('msg_select_cleanup_mode', 'Vui lòng chọn 1 chế độ dọn dẹp!');
                        if (typeof showCyberToast === 'function') {
                            showCyberToast(msgWarn, 'warning');
                        }
                        return;
                    }

                    const mode = selectedMode.value;

                    // Thực thi trực tiếp khi click lần 2 (không hiện thêm popup xác nhận)
                    const res = await this.handleClearStorage(mode);
                    if (res.success) {
                        const msgSuccess = getT('msg_storage_cleaned_success', 'Đã hoàn tất dọn dẹp bộ nhớ thành công!');
                        if (typeof showCyberToast === 'function') {
                            showCyberToast(msgSuccess, 'success');
                        }
                    } else {
                        const msgFail = getT('msg_storage_cleanup_failed', 'Lỗi dọn dẹp bộ nhớ: ') + res.error;
                        if (typeof showCyberToast === 'function') {
                            showCyberToast(msgFail, 'error');
                        }
                    }
                }
            });
        }
    },

    // --- 8. KHỞI TẠO EVENT LISTENERS (INIT) ---
    init() {
        const btnClearLocalStorage = document.getElementById('btn-clear-local-storage');
        if (btnClearLocalStorage) {
            btnClearLocalStorage.addEventListener('click', () => {
                this.openClearStorageModal();
            });
        }

        const btnRefreshStorage = document.getElementById('btn-refresh-storage');
        if (btnRefreshStorage) {
            btnRefreshStorage.addEventListener('click', () => {
                this.refreshStorage();
            });
        }

        // Tích hợp đồng bộ xóa cho các nút xóa nhanh khác
        const clearCacheBtn = document.getElementById('clear-cache-btn');
        if (clearCacheBtn) {
            clearCacheBtn.addEventListener('click', async () => {
                const res = await this.handleClearStorage('audio_only');
                if (res.success && typeof showCyberToast === 'function') {
                    showCyberToast(typeof t === 'function' ? t('msg_cleared') : 'Đã xóa toàn bộ bộ nhớ đệm âm thanh!', 'success');
                }
            });
        }

        const clearBeatmapCacheBtn = document.getElementById('clear-beatmap-cache-btn');
        if (clearBeatmapCacheBtn) {
            clearBeatmapCacheBtn.addEventListener('click', async () => {
                const res = await this.handleClearStorage('keep_audio');
                if (res.success && typeof showCyberToast === 'function') {
                    showCyberToast(typeof t === 'function' ? t('msg_storage_cleaned_success') : 'Đã xóa toàn bộ cache beatmap!', 'success');
                }
            });
        }

        const clearAllStorageBtn = document.getElementById('clear-all-storage-btn');
        if (clearAllStorageBtn) {
            clearAllStorageBtn.addEventListener('click', async () => {
                const res = await this.handleClearStorage('full_beatmap');
                if (res.success && typeof showCyberToast === 'function') {
                    showCyberToast(typeof t === 'function' ? t('msg_all_storage_cleared') : 'Đã xóa toàn bộ nhạc và beatmap tải về thành công!', 'success');
                }
            });
        }

        const tabBtns = document.querySelectorAll('.tab-btn[data-tab="tab-storage"]');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.updateStorageUI();
            });
        });

        setTimeout(() => {
            this.updateStorageUI();
        }, 1000);
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.StorageManager.init());
} else {
    window.StorageManager.init();
}
