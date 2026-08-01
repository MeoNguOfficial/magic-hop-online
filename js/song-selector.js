const songSearchInput = document.getElementById('song-search');
const songSearchClearBtn = document.getElementById('song-search-clear');
let currentFilterTerm = '';
let filteredIndices = []; // Lưu trữ các index bài hát thỏa mãn điều kiện tìm kiếm
let renderId = 0;

// Thêm cấu hình Virtual Scrolling
const PLAYLIST_MAX_VISIBLE = 20;
let playlistRenderStartIndex = 0;

window.selectedArtistFilter = '';
window.selectedGenreFilter = '';
window.selectedCopyrightFilter = '';

var _songFilterArtistInited = false;
var _songFilterGenreInited = false;
var _songFilterCopyrightInited = false;

// --- KIỂM TRA TRẠNG THÁI PASSED BÀI HÁT (ƯU TIÊN SERVER, NGOẠI TUYẾN 60S MỚI DÙNG LOCAL) ---
let lastBackendCheckTimestamp = 0;
let cachedBackendOnlineState = true;

async function checkBackendOnlineStatusWith60sCache() {
    const now = Date.now();
    // Cache kết quả kiểm tra backend trong 60s (60,000 ms)
    if (now - lastBackendCheckTimestamp < 60000) {
        return cachedBackendOnlineState;
    }

    lastBackendCheckTimestamp = now;

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
        cachedBackendOnlineState = false;
        return false;
    }

    try {
        if (window.ApiService && typeof apiClient !== 'undefined') {
            await apiClient.get('/beatmaps', { timeout: 3000, params: { limit: 1 } });
            cachedBackendOnlineState = true;
        } else {
            cachedBackendOnlineState = false;
        }
    } catch (err) {
        cachedBackendOnlineState = false;
    }

    return cachedBackendOnlineState;
}

async function checkSongPassedStatus(song, songIndex) {
    if (!song) return false;

    // 1. Kiểm tra trạng thái Online của Backend (Cache kết quả 60s)
    const isOnline = await checkBackendOnlineStatusWith60sCache();

    // 2. Nếu Backend Online: Ưu tiên tuyệt đối lấy từ Server metadata
    if (isOnline) {
        const isServerPassed = !!(
            song.is_normal_mode_passed || 
            song.is_hard_mode_passed || 
            song.is_passed || 
            song.isPassed
        );
        return isServerPassed;
    }

    // 3. Nếu Backend Ngoại tuyến (Check offline trong 60s): Mới dùng đến Local IndexedDB
    let isLocalPassed = !!(
        song.is_normal_mode_passed || 
        song.is_hard_mode_passed || 
        song.is_passed || 
        song.isPassed
    );

    try {
        const db = typeof getDB === 'function' ? await getDB() : (typeof initDB === 'function' ? await initDB() : null);
        if (db) {
            const tx = db.transaction("highScores", "readonly");
            const store = tx.objectStore("highScores");
            const request = store.get(songIndex);
            const record = await new Promise((resolve) => {
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => resolve(null);
            });
            if (record && (record.isNormalModePassed || record.isRageModePassed)) {
                isLocalPassed = true;
            }
        }
    } catch (err) {
        console.error("[SongSelector] Lỗi đọc trạng thái passed từ Local DB:", err);
    }

    return isLocalPassed;
}
window.checkSongPassedStatus = checkSongPassedStatus;

// --- QUÉT TRƯỚC HỆ THỐNG BACKEND & PASSED METADATA NGAY TỪ LÚC MỞ GAME ---
async function preloadBackendAndPassedStatusOnStartup() {
    console.log('[SongSelector] Quét trước trạng thái Backend & Passed metadata ngay khi mở game...');

    // 1. Quét trước kết nối Backend Server ngay lập tức
    const isOnline = await checkBackendOnlineStatusWith60sCache();

    // 2. Nếu Online và có playlist, đồng bộ cờ passed cho các bài hát từ Server metadata
    if (isOnline && typeof playlist !== 'undefined' && Array.isArray(playlist)) {
        try {
            let userToken = localStorage.getItem('auth_token');
            if (userToken && window.ApiService) {
                const res = await window.ApiService.getScores({ limit: 1000 }).catch(() => null);
                const scoresData = res?.data?.data || res?.data || [];
                if (Array.isArray(scoresData)) {
                    scoresData.forEach(item => {
                        const targetSong = playlist.find(s => s.id === item.beatmap_id || s.id === item.song_id);
                        if (targetSong) {
                            if (item.is_normal_mode_passed || item.is_normal_passed || item.mode === 'normal') {
                                targetSong.is_normal_mode_passed = true;
                                targetSong.is_passed = true;
                            }
                            if (item.is_hard_mode_passed || item.is_rage_mode_passed || item.mode === 'hard' || item.mode === 'rage') {
                                targetSong.is_hard_mode_passed = true;
                                targetSong.is_passed = true;
                            }
                        }
                    });
                }
            }
        } catch (e) {
            console.warn('[SongSelector] Lỗi quét trước Server passed status:', e);
        }
    }
}
window.preloadBackendAndPassedStatusOnStartup = preloadBackendAndPassedStatusOnStartup;

// Khởi chạy quét ngay lập tức khi trang vừa load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => preloadBackendAndPassedStatusOnStartup());
} else {
    preloadBackendAndPassedStatusOnStartup();
}

function updateFilteredList(term, forceUpdate = false, specificIndices = null) {
    const newFilterTerm = term === null ? '' : term.toLowerCase().trim();
    
    if (specificIndices !== null) {
        currentFilterTerm = newFilterTerm;
        filteredIndices = [...specificIndices];
    } else {
        currentFilterTerm = newFilterTerm;
        filteredIndices = typeof currentPlaylistIndices !== 'undefined' ? [...currentPlaylistIndices] : [];
    }

    // Áp dụng bộ lọc ca sĩ, thể loại và bản quyền phía Client
    if (window.selectedArtistFilter) {
        filteredIndices = filteredIndices.filter(i => playlist[i] && playlist[i].artist && playlist[i].artist.toLowerCase() === window.selectedArtistFilter.toLowerCase());
    }
    if (window.selectedGenreFilter) {
        filteredIndices = filteredIndices.filter(i => playlist[i] && playlist[i].genre && playlist[i].genre.toLowerCase() === window.selectedGenreFilter.toLowerCase());
    }
    if (window.selectedCopyrightFilter) {
        filteredIndices = filteredIndices.filter(i => {
            const song = playlist[i];
            if (!song) return false;
            const copyright = (song.copyright_status || '').toLowerCase();
            if (window.selectedCopyrightFilter === 'free') {
                return !copyright || copyright.includes('no') || copyright.includes('free') || copyright.includes('không');
            } else if (window.selectedCopyrightFilter === 'claimed') {
                return copyright && !copyright.includes('no') && !copyright.includes('free') && !copyright.includes('không');
            }
            return true;
        });
    }
    
    if (!currentFilterTerm && !window.selectedArtistFilter && !window.selectedGenreFilter && !window.selectedCopyrightFilter && playlist[selectedSongIndex]) {
        if (!filteredIndices.includes(selectedSongIndex)) {
            filteredIndices.unshift(selectedSongIndex);
        } else {
            filteredIndices = filteredIndices.filter(i => i !== selectedSongIndex);
            filteredIndices.unshift(selectedSongIndex);
        }
    }
}

function renderSongList(filterTerm = null, specificIndices = null) {
    const currentRenderId = ++renderId;
    const selector = document.getElementById('song-selector');
    if (!selector) return;
    
    // Cập nhật lại bộ lọc nếu có chuỗi tìm kiếm truyền vào (bao gồm chuỗi rỗng)
    if (filterTerm !== null) {
        updateFilteredList(filterTerm, false, specificIndices);
    } else {
        updateFilteredList(currentFilterTerm, false, typeof currentPlaylistIndices !== 'undefined' ? currentPlaylistIndices : null); 
    }

    // Populate dynamic filter options
    populateFilterDropdowns();

    // Áp dụng Virtual Scrolling (Chỉ hiển thị tối đa PLAYLIST_MAX_VISIBLE bài)
    const totalItems = filteredIndices.length;
    if (playlistRenderStartIndex > totalItems) {
        playlistRenderStartIndex = Math.max(0, totalItems - PLAYLIST_MAX_VISIBLE);
    }
    
    const endIndex = Math.min(playlistRenderStartIndex + PLAYLIST_MAX_VISIBLE, totalItems);
    const displayIndices = filteredIndices.slice(playlistRenderStartIndex, endIndex);

    selector.innerHTML = '';

    // Thêm nút Làm mới danh sách ở đầu
    if (playlistRenderStartIndex === 0) {
        const refreshBtn = document.createElement('button');
        refreshBtn.className = "w-full mb-3 py-2.5 text-xs font-bold text-cyan-400 border border-cyan-500/30 bg-cyan-950/20 hover:bg-cyan-900/40 rounded uppercase font-orbitron transition-all flex items-center justify-center gap-2 shadow-[0_0_10px_rgba(6,182,212,0.15)]";
        refreshBtn.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg> ${(typeof t === 'function' ? t('btn_refresh_playlist') : 'LÀM MỚI DANH SÁCH NHẠC')}`;
        refreshBtn.onclick = async () => {
            refreshBtn.disabled = true;
            refreshBtn.innerHTML = `<svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> ${(typeof t === 'function' ? t('msg_loading_data') : 'ĐANG TẢI DỮ LIỆU...')}`;
            
            if (typeof window.refreshPlaylist === 'function') {
                await window.refreshPlaylist(currentFilterTerm);
            }
            
            if (typeof showCyberModal === 'function') {
                showCyberModal({ title: (typeof t === 'function' ? t('success_title') : 'THÀNH CÔNG'), message: (typeof t === 'function' ? t('msg_sync_success') : 'Đã đồng bộ danh sách nhạc mới nhất từ máy chủ!'), type: 'alert' });
            }
        };
        selector.appendChild(refreshBtn);
    }

    // Thêm nút "Tải phần trước" ở đầu danh sách
    if (playlistRenderStartIndex > 0) {
        const loadPrevBtn = document.createElement('button');
        loadPrevBtn.id = 'load-prev-btn';
        loadPrevBtn.className = "w-full mb-2 py-2.5 text-xs font-bold text-cyan-400 border border-cyan-500/30 hover:bg-cyan-950/20 rounded uppercase font-orbitron transition-all flex items-center justify-center gap-2";
        const prevText = typeof t === 'function' ? t('btn_load_prev_hidden').replace('{count}', playlistRenderStartIndex) : `TẢI PHẦN TRƯỚC (${playlistRenderStartIndex} BỊ ẨN)`;
        loadPrevBtn.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path></svg> ${prevText}`;
        loadPrevBtn.onclick = () => {
            playlistRenderStartIndex = Math.max(0, playlistRenderStartIndex - PLAYLIST_MAX_VISIBLE);
            renderSongList();
            selector.scrollTop = 0;
        };
        selector.appendChild(loadPrevBtn);
    }

    displayIndices.forEach((originalIndex, i) => {
        const song = playlist[originalIndex];
        const opt = document.createElement('div');
        opt.className = `song-option ${selectedSongIndex === originalIndex ? 'active' : ''} group cursor-pointer p-2.5 rounded-lg border border-cyan-500/10 bg-cyan-950/5 hover:border-cyan-400/40 flex justify-between items-center transition-all duration-200`;
        opt.dataset.index = originalIndex;
        opt.innerHTML = `
            <div class="flex-1 min-w-0 pr-2 overflow-hidden">
                <div class="flex items-center gap-1.5 min-w-0 w-full">
                    <h3 class="font-bold text-white group-hover:text-cyan-300 font-orbitron text-sm pointer-events-none overflow-hidden whitespace-nowrap flex-1 min-w-0 marquee-container">
                        <span class="marquee-text inline-block">${song.name}</span>
                    </h3>
                    <div id="cache-status-${originalIndex}" class="shrink-0 pointer-events-none flex items-center gap-1"></div>
                </div>
                <p class="text-[10px] text-gray-400 pointer-events-none">${song.artist || 'Unknown Artist'}</p>
            </div>
            <div class="flex items-center gap-3">
                <button id="preview-btn-${originalIndex}" class="preview-btn p-1.5 rounded-full bg-cyan-950 hover:bg-cyan-900 text-cyan-400 transition-all border border-cyan-500/30 flex items-center justify-center shrink-0" title="${t('preview_btn')}">
                    <svg class="w-3.5 h-3.5 preview-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                </button>
                <div id="action-area-${originalIndex}" class="flex items-center">
                    <span class="text-cyan-400 group-hover:neon-glow-cyan text-xs font-bold whitespace-nowrap shrink-0 pointer-events-none">PLAY ▶</span>
                </div>
            </div>
        `;

        // Setup Context Menu (Right Click on PC, Long Press on mobile)
        let longPressTimeout = null;
        let lastTouchX = 0;
        let lastTouchY = 0;
        let isLongPressTriggered = false;

        opt.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            showSongContextMenu(e, originalIndex, e.clientX, e.clientY);
        });

        opt.addEventListener('touchstart', (e) => {
            isLongPressTriggered = false;
            if (e.touches.length !== 1) return;
            const touch = e.touches[0];
            lastTouchX = touch.clientX;
            lastTouchY = touch.clientY;
            
            if (longPressTimeout) clearTimeout(longPressTimeout);
            
            longPressTimeout = setTimeout(() => {
                isLongPressTriggered = true;
                if (navigator.vibrate) {
                    navigator.vibrate(50);
                }
                showSongContextMenu(null, originalIndex, lastTouchX, lastTouchY);
            }, 1000);
        }, { passive: true });

        opt.addEventListener('touchmove', (e) => {
            if (e.touches.length !== 1) return;
            const touch = e.touches[0];
            const dx = touch.clientX - lastTouchX;
            const dy = touch.clientY - lastTouchY;
            if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
                if (longPressTimeout) {
                    clearTimeout(longPressTimeout);
                    longPressTimeout = null;
                }
            }
        }, { passive: true });

        opt.addEventListener('touchend', (e) => {
            if (longPressTimeout) {
                clearTimeout(longPressTimeout);
                longPressTimeout = null;
            }
            if (isLongPressTriggered) {
                e.preventDefault();
                e.stopPropagation();
            }
        });

        opt.addEventListener('click', async (e) => {
            if (isLongPressTriggered) {
                e.preventDefault();
                e.stopPropagation();
                isLongPressTriggered = false;
                return;
            }
            const previewBtn = e.target.closest('.preview-btn');
            if (previewBtn) {
                if (typeof togglePreview === 'function') togglePreview(originalIndex);
            } else {
                playlistRenderStartIndex = 0; // Trở về đầu để thấy bài đang chơi khi mở lại Menu
                
                // Kiểm tra xem đã vượt qua (Passed) bài hát chưa (Ưu tiên Server metadata, ngoại tuyến 60s mới dùng đến Local DB)
                let isPassed = await checkSongPassedStatus(song, originalIndex);

                const isHelperMode = typeof isAnyHelperModeActive === 'function' ? isAnyHelperModeActive() : false;

                if (isHelperMode || isPassed) {
                    promptPlayModeSelection((mode) => {
                        window.chosenPlayMode = mode;
                        changeSong(originalIndex, true);
                    });
                } else {
                    window.chosenPlayMode = 'normal';
                    changeSong(originalIndex, true);
                }
            }
        });

        selector.appendChild(opt);

        // Apply auto-scroll marquee for long song title
        const songTitleText = opt.querySelector('.marquee-text');
        if (songTitleText && typeof window.applyMarquee === 'function') {
            window.applyMarquee(songTitleText);
        }

        // Tối ưu thuật toán: Lazy load kiểm tra Cache cả audio và JSON beatmap
        const audioPromise = typeof isAudioCached === 'function' ? isAudioCached(song.url) : Promise.resolve(false);
        const jsonPromise = (song.lazyUrl && typeof isJsonCached === 'function') ? isJsonCached(song.lazyUrl) : Promise.resolve(false);
        
        Promise.all([audioPromise, jsonPromise]).then(([isAudioCached, isJsonCached]) => {
            if (currentRenderId !== renderId) return;
            const isCached = isAudioCached || isJsonCached;
            opt.dataset.isCached = isCached;
            if (isCached) {
                const statusDiv = document.getElementById(`cache-status-${originalIndex}`);
                if (statusDiv) {
                    statusDiv.innerHTML = `<svg class="w-3.5 h-3.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>`;
                }
            }
        });
    });

    // Xóa nút "Tải thêm" cũ nếu có
    const oldLoadMoreBtn = document.getElementById('load-more-btn');
    if (oldLoadMoreBtn) oldLoadMoreBtn.remove();
    const oldLoadNextBtn = document.getElementById('load-next-btn');
    if (oldLoadNextBtn) oldLoadNextBtn.remove();

    // Thêm nút "Tải phần tiếp theo" (từ bộ nhớ) hoặc "Tải thêm" (từ API)
    if (endIndex < totalItems) {
        const hiddenCount = totalItems - endIndex;
        const loadNextBtn = document.createElement('button');
        loadNextBtn.id = 'load-next-btn';
        loadNextBtn.className = "w-full mt-2 py-2.5 text-xs font-bold text-cyan-400 border border-cyan-500/30 hover:bg-cyan-950/20 rounded uppercase font-orbitron transition-all flex items-center justify-center gap-2";
        const nextText = typeof t === 'function' ? t('btn_load_next_hidden').replace('{count}', hiddenCount) : `TẢI PHẦN TIẾP THEO (${hiddenCount} BỊ ẨN)`;
        loadNextBtn.innerHTML = `${nextText} <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>`;
        loadNextBtn.onclick = () => {
            playlistRenderStartIndex = Math.min(totalItems - PLAYLIST_MAX_VISIBLE, playlistRenderStartIndex + PLAYLIST_MAX_VISIBLE);
            renderSongList();
            selector.scrollTop = 0;
        };
        selector.appendChild(loadNextBtn);
    } else if (typeof hasMore !== 'undefined' && hasMore && !currentFilterTerm && typeof isLoadingMore !== 'undefined' && !isLoadingMore) {
        const loadMoreBtn = document.createElement('button');
        loadMoreBtn.id = 'load-more-btn';
        loadMoreBtn.className = "w-full mt-2 py-2.5 text-xs font-bold text-cyan-400 border border-cyan-500/30 hover:bg-cyan-950/20 rounded uppercase font-orbitron transition-all flex items-center justify-center gap-2";
        const moreText = typeof t === 'function' ? t('btn_load_more') : `TẢI THÊM DỮ LIỆU`;
        loadMoreBtn.innerHTML = `${moreText} <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>`;
        loadMoreBtn.onclick = () => {
            if (typeof loadMoreSongs === 'function') {
                loadMoreSongs();
            }
        };
        selector.appendChild(loadMoreBtn);
    }

    if (typeof currentPreviewIndex !== 'undefined' && currentPreviewIndex !== -1) {
        updatePreviewUI(currentPreviewIndex, 'playing');
    }
}

function updatePreviewUI(index, state) {
    const btn = document.getElementById(`preview-btn-${index}`);
    if (!btn) return;
    const icon = btn.querySelector('.preview-icon');
    
    btn.classList.remove('animate-pulse', 'text-pink-400', 'border-pink-500/50', 'bg-cyan-800/80', 'text-cyan-400');
    if (icon) icon.classList.remove('animate-spin');
    
    if (state === 'loading') {
        btn.classList.add('animate-pulse', 'text-pink-400');
        if (icon) {
            icon.classList.add('animate-spin');
            icon.innerHTML = '<circle cx="12" cy="12" r="10" stroke-dasharray="16 16"></circle>';
        }
    } else if (state === 'playing') {
        btn.classList.add('text-pink-400', 'border-pink-500/50', 'bg-cyan-800/80');
        if (icon) {
            icon.innerHTML = '<circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="3"></circle>';
        }
    } else {
        btn.classList.add('text-cyan-400');
        if (icon) {
            icon.innerHTML = '<circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="3"></circle>';
        }
    }
}

async function showLeaderboard(songIndex, forceRefresh = false) {
    const song = playlist[songIndex];
    if (!song || !song.id) {
        if (typeof showCyberModal === 'function') {
            showCyberModal({ title: "BẢNG XẾP HẠNG", message: "Bài hát này chưa được đồng bộ từ Server.", type: 'alert' });
        }
        return;
    }

    const isRage = (window.HardModeManager && window.HardModeManager.isEnabled) || (window.AsianModeManager && window.AsianModeManager.isEnabled);
    const titleMode = isRage ? ((window.AsianModeManager && window.AsianModeManager.isEnabled) ? " (ASIAN MODE)" : " (RAGE MODE)") : "";
    const modalTitle = `TOP 10 - ${song.name}${titleMode}`;

    const skeletonHtml = `
        <div id="lb-modal-container" class="w-full text-left space-y-2">
            <div id="lb-modal-list" class="w-full h-[260px] space-y-2 overflow-y-auto pr-1 custom-scrollbar">
                <div class="animate-pulse space-y-2">
                    ${[1, 2, 3, 4, 5].map(i => `
                        <div class="flex justify-between items-center bg-cyan-950/20 border border-cyan-500/10 p-2.5 rounded-lg h-[44px]">
                            <div class="flex items-center gap-3">
                                <div class="w-6 h-4 bg-cyan-500/20 rounded animate-pulse"></div>
                                <div class="w-28 h-4 bg-cyan-500/20 rounded animate-pulse"></div>
                            </div>
                            <div class="flex flex-col items-end gap-1">
                                <div class="w-12 h-4 bg-cyan-500/30 rounded animate-pulse"></div>
                                <div class="w-16 h-2.5 bg-gray-700/40 rounded animate-pulse"></div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="mt-3 flex justify-end h-8 items-center">
                <button id="btn-refresh-lb-${song.id}" class="px-3 py-1.5 bg-cyan-950/40 border border-cyan-500/30 hover:border-cyan-400 text-[11px] text-cyan-400 rounded-lg font-orbitron flex items-center gap-1.5 transition-all opacity-50 cursor-not-allowed" disabled>
                    <svg class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Đang tải...
                </button>
            </div>
        </div>
    `;

    // Nếu cửa sổ modal chưa mở (hoặc đã bị đóng trước đó), tạo mới/mở lại cửa sổ
    let modalBackdrop = document.getElementById('dynamic-cyber-modal');
    let container = document.getElementById('lb-modal-container');
    let isModalOpen = modalBackdrop && modalBackdrop.style.display !== 'none' && modalBackdrop.style.opacity !== '0' && container;

    if (typeof cyberModalTitle !== 'undefined' && cyberModalTitle) {
        cyberModalTitle.innerText = modalTitle;
    }

    if (!isModalOpen && typeof showCyberModal === 'function') {
        showCyberModal({
            title: modalTitle,
            message: skeletonHtml,
            type: 'alert'
        });
    } else {
        // Cửa sổ đang mở sẵn -> giữ nguyên khung modal & danh sách, chỉ cập nhật nút refresh thành đang xoay icon
        const btnRef = document.getElementById(`btn-refresh-lb-${song.id}`);
        if (btnRef) {
            btnRef.disabled = true;
            btnRef.classList.add('opacity-50', 'cursor-not-allowed');
            btnRef.innerHTML = `
                <svg class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Đang tải...
            `;
        }
    }

    try {
        const params = isRage ? { mode: 'hard' } : {};
        const options = forceRefresh ? { forceRefresh: true } : {};
        const response = await window.ApiService.getLeaderboard(song.id, params, options);
        const scores = response.data?.data || response.data || [];

        let listHtml = '';
        if (scores.length === 0) {
            listHtml = `<div class="h-full flex items-center justify-center text-gray-400 text-xs font-orbitron">Chưa có ai đạt điểm trên bài hát này.</div>`;
        } else {
            scores.forEach((s, idx) => {
                let colorClass = idx === 0 ? "text-yellow-400 font-bold drop-shadow-[0_0_5px_rgba(250,204,21,0.5)]" : (idx === 1 ? "text-gray-200 font-bold" : (idx === 2 ? "text-orange-400 font-bold" : "text-gray-300"));
                const scoreValue = isRage ? (s.hard_mode_score ?? s.rage_score ?? s.score ?? 0) : (s.score ?? 0);
                listHtml += `
                <div class="flex justify-between items-center bg-cyan-950/30 border border-cyan-500/20 p-2.5 rounded-lg hover:border-cyan-400/50 transition-all h-[44px]">
                    <div class="flex items-center gap-3">
                        <span class="w-6 text-center text-xs font-orbitron ${colorClass}">#${idx+1}</span>
                        <span class="text-xs font-bold text-white truncate max-w-[130px] font-orbitron">${s.user?.name || s.user?.username || 'Unknown'}</span>
                    </div>
                    <div class="flex flex-col items-end">
                        <span class="text-cyan-400 font-orbitron font-bold text-xs">${scoreValue}</span>
                        <span class="text-[9px] text-gray-500 font-orbitron">${new Date(s.created_at).toLocaleDateString()}</span>
                    </div>
                </div>
                `;
            });
        }

        // Cập nhật dữ liệu thật vào đúng khung danh sách trong cửa sổ hiện tại
        const listEl = document.getElementById('lb-modal-list');
        if (listEl) {
            listEl.innerHTML = listHtml;
        }

        const btnRef = document.getElementById(`btn-refresh-lb-${song.id}`);
        if (btnRef) {
            btnRef.disabled = false;
            btnRef.classList.remove('opacity-50', 'cursor-not-allowed');
            btnRef.innerHTML = `
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                Làm mới Bảng xếp hạng
            `;
            btnRef.onclick = () => showLeaderboard(songIndex, true);
        }

    } catch (e) {
        const listEl = document.getElementById('lb-modal-list');
        if (listEl) {
            listEl.innerHTML = `<div class="h-full flex items-center justify-center text-red-400 text-xs font-orbitron">Không thể lấy dữ liệu bảng xếp hạng lúc này.</div>`;
        }
        const btnRef = document.getElementById(`btn-refresh-lb-${song.id}`);
        if (btnRef) {
            btnRef.disabled = false;
            btnRef.classList.remove('opacity-50', 'cursor-not-allowed');
            btnRef.innerHTML = `
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                Thử lại
            `;
            btnRef.onclick = () => showLeaderboard(songIndex, true);
        }
    }
}

// Logic xử lý ô tìm kiếm
let searchTimeoutId = null;

if (songSearchInput) {
    songSearchInput.addEventListener('input', (e) => {
        const term = e.target.value;
        if (songSearchClearBtn) songSearchClearBtn.classList.toggle('hidden', term.length === 0);
        
        if (searchTimeoutId) clearTimeout(searchTimeoutId);
        
        searchTimeoutId = setTimeout(async () => {
            const selector = document.getElementById('song-selector');
            if (selector) selector.innerHTML = `<div class="p-4 text-center text-cyan-400 font-orbitron animate-pulse">${typeof t === 'function' ? t('msg_searching') : 'ĐANG TÌM KIẾM...'}</div>`;
            
            if (typeof window.refreshPlaylist === 'function') {
                await window.refreshPlaylist(term);
            }
        }, 500);
    });
}

if (songSearchClearBtn) {
    songSearchClearBtn.addEventListener('click', async () => {
        songSearchInput.value = '';
        songSearchClearBtn.classList.add('hidden');
        songSearchInput.focus();
        
        const selector = document.getElementById('song-selector');
        if (selector) selector.innerHTML = `<div class="p-4 text-center text-cyan-400 font-orbitron animate-pulse">${typeof t === 'function' ? t('msg_loading_data') : 'ĐANG TẢI DỮ LIỆU...'}</div>`;
        
        if (typeof window.refreshPlaylist === 'function') {
            await window.refreshPlaylist('');
        }
    });
}

/* Khởi tạo danh sách lần đầu sẽ được gọi trong bootGame() của game.js 
   sau khi loadPlaylistData() hoàn tất */
// Tự động kích hoạt render nếu script này nạp sau khi dữ liệu đã sẵn sàng
if (typeof playlist !== 'undefined' && playlist.length > 0) {
    renderSongList();
}

/**
 * Khởi tạo custom searchable dropdown.
 * @param {object} cfg
 *   - btnId       : id của nút toggle
 *   - dropdownId  : id của panel dropdown
 *   - searchId    : id của input tìm kiếm bên trong dropdown
 *   - listId      : id của container chứa các item
 *   - hiddenId    : id của input hidden lưu giá trị đang chọn
 *   - labelId     : id của span hiển thị nhãn đang chọn
 *   - allLabel    : text hiển thị khi chọn "Tất cả"
 *   - onSelect    : callback(value) khi người dùng chọn một item
 */
function initSearchableFilterDropdown(cfg) {
    const btn      = document.getElementById(cfg.btnId);
    const dropdown = document.getElementById(cfg.dropdownId);
    const searchEl = document.getElementById(cfg.searchId);
    const listEl   = document.getElementById(cfg.listId);
    const hidden   = document.getElementById(cfg.hiddenId);
    const labelEl  = document.getElementById(cfg.labelId);
    if (!btn || !dropdown || !listEl || !hidden || !labelEl) return;

    function getAllLabel() {
        if (cfg.allKey && typeof t === 'function') {
            return t(cfg.allKey);
        }
        if (typeof t === 'function') {
            if (cfg.btnId && cfg.btnId.includes('artist')) return t('filter_all_artists');
            if (cfg.btnId && cfg.btnId.includes('genre')) return t('filter_all_genres');
            if (cfg.btnId && cfg.btnId.includes('copyright')) return t('filter_all_copyright');
        }
        return cfg.allLabel || 'TẤT CẢ';
    }

    function closeAllDropdowns() {
        document.querySelectorAll('.searchable-filter-dropdown').forEach(d => {
            if (!d.classList.contains('hidden')) {
                const parentWrapper = d.closest('.relative');
                const parentBtn = parentWrapper ? parentWrapper.querySelector('button') : null;
                if (parentBtn) {
                    const svg = parentBtn.querySelector('svg');
                    if (svg) svg.classList.remove('rotate-180');
                }
                d.classList.add('hidden');
            }
        });
    }

    // Toggle mở/đóng
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = !dropdown.classList.contains('hidden');
        closeAllDropdowns();

        if (!isOpen) {
            dropdown.classList.remove('hidden');
            const svg = btn.querySelector('svg');
            if (svg) svg.classList.add('rotate-180');

            if (searchEl) {
                searchEl.value = '';
                searchEl.focus();
            }
            renderList('');

            if (typeof anime !== 'undefined' && (typeof uiAnimationsEnabled === 'undefined' || uiAnimationsEnabled)) {
                anime.remove(dropdown);
                anime({
                    targets: dropdown,
                    opacity: [0, 1],
                    translateY: [-6, 0],
                    scale: [0.98, 1],
                    duration: 180,
                    easing: 'easeOutQuad'
                });
            } else {
                dropdown.style.opacity = 1;
                dropdown.style.transform = 'none';
            }
        }
    });

    // Search input
    if (searchEl) {
        searchEl.addEventListener('input', () => renderList(searchEl.value));
    }

    // Click outside đóng dropdown
    document.addEventListener('click', (e) => {
        if (!btn.contains(e.target) && !dropdown.contains(e.target)) {
            if (!dropdown.classList.contains('hidden')) {
                const svg = btn.querySelector('svg');
                if (svg) svg.classList.remove('rotate-180');
                dropdown.classList.add('hidden');
            }
        }
    });

    dropdown.classList.add('searchable-filter-dropdown');

    function renderList(query) {
        listEl.innerHTML = '';

        if (cfg.staticOptions) {
            cfg.staticOptions.forEach(opt => {
                const labelText = typeof t === 'function' ? (t(opt.labelKey) || opt.defaultText) : opt.defaultText;
                const isActive = hidden.value === opt.value;
                const item = document.createElement('div');
                item.className = `px-2.5 py-1.5 text-[10px] font-orbitron cursor-pointer transition-colors truncate ${isActive ? 'text-cyan-400 bg-cyan-950/50 font-bold' : 'text-gray-300 hover:text-white hover:bg-cyan-950/30'}`;
                item.textContent = labelText;
                item.addEventListener('click', () => select(opt.value, labelText));
                listEl.appendChild(item);
            });
            return;
        }

        const q = query.toLowerCase().trim();
        const items = (hidden.dataset.allItems ? JSON.parse(hidden.dataset.allItems) : []);
        const filtered = q ? items.filter(v => v.toLowerCase().includes(q)) : items;

        // Option "Tất cả"
        const currentAllLabel = getAllLabel();
        const allItem = document.createElement('div');
        allItem.className = `px-2.5 py-1.5 text-[10px] font-orbitron cursor-pointer transition-colors ${!hidden.value ? 'text-cyan-400 bg-cyan-950/50 font-bold' : 'text-gray-400 hover:text-white hover:bg-cyan-950/30'}`;
        allItem.textContent = currentAllLabel;
        allItem.addEventListener('click', () => select('', currentAllLabel));
        listEl.appendChild(allItem);

        if (filtered.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'px-2.5 py-2 text-[10px] text-gray-600 font-orbitron text-center';
            empty.textContent = typeof t === 'function' ? t('filter_no_results') : 'Không tìm thấy';
            listEl.appendChild(empty);
            return;
        }
        filtered.forEach(val => {
            const item = document.createElement('div');
            const isActive = hidden.value === val;
            item.className = `px-2.5 py-1.5 text-[10px] font-orbitron cursor-pointer transition-colors truncate ${isActive ? 'text-cyan-400 bg-cyan-950/50 font-bold' : 'text-gray-300 hover:text-white hover:bg-cyan-950/30'}`;
            item.textContent = val.toUpperCase();
            item.title = val;
            item.addEventListener('click', () => select(val, val));
            listEl.appendChild(item);
        });
    }

    function select(value, display) {
        hidden.value = value;
        if (cfg.staticOptions) {
            const matched = cfg.staticOptions.find(o => o.value === value);
            labelEl.textContent = matched ? (typeof t === 'function' ? (t(matched.labelKey) || matched.defaultText) : matched.defaultText) : display;
        } else {
            labelEl.textContent = value ? value.toUpperCase() : getAllLabel();
        }

        const svg = btn.querySelector('svg');
        if (svg) svg.classList.remove('rotate-180');
        dropdown.classList.add('hidden');
        if (typeof cfg.onSelect === 'function') cfg.onSelect(value);
    }

    // Expose hàm cập nhật danh sách items từ bên ngoài
    btn._updateItems = function(items) {
        hidden.dataset.allItems = JSON.stringify(items);
        renderList(searchEl ? searchEl.value : '');
    };
    btn._getValue = () => hidden.value;
    btn._setValue = (v, display) => {
        hidden.value = v;
        if (cfg.staticOptions) {
            const matched = cfg.staticOptions.find(o => o.value === v);
            labelEl.textContent = matched ? (typeof t === 'function' ? (t(matched.labelKey) || matched.defaultText) : matched.defaultText) : getAllLabel();
        } else {
            labelEl.textContent = v ? v.toUpperCase() : getAllLabel();
        }
    };
    btn._refreshLabel = () => {
        if (cfg.staticOptions) {
            const matched = cfg.staticOptions.find(o => o.value === hidden.value);
            labelEl.textContent = matched ? (typeof t === 'function' ? (t(matched.labelKey) || matched.defaultText) : matched.defaultText) : getAllLabel();
        } else if (!hidden.value) {
            labelEl.textContent = getAllLabel();
        }
        renderList(searchEl ? searchEl.value : '');
    };
}

// Khởi tạo 3 dropdown searchable/custom cho game
function populateFilterDropdowns() {
    let artists, genres;

    // Ưu tiên dùng filter_options từ API (toàn bộ DB) nếu có
    if (window.apiFilterOptions) {
        artists = (window.apiFilterOptions.artists || []).filter(a => a && a !== 'Unknown').map(a => a.trim()).sort();
        genres  = (window.apiFilterOptions.genres  || []).filter(g => g).map(g => g.trim()).sort();
    } else {
        // Fallback: scan local playlist (offline hoặc chưa load xong)
        const artistSet = new Set();
        const genreSet  = new Set();
        playlist.forEach(song => {
            if (song.artist && song.artist !== 'Unknown') artistSet.add(song.artist.trim());
            if (song.genre) genreSet.add(song.genre.trim());
        });
        artists = Array.from(artistSet).sort();
        genres  = Array.from(genreSet).sort();
    }

    // Khởi tạo dropdown lần đầu
    if (!_songFilterArtistInited) {
        _songFilterArtistInited = true;
        initSearchableFilterDropdown({
            btnId:      'song-filter-artist-btn',
            dropdownId: 'song-filter-artist-dropdown',
            searchId:   'song-filter-artist-search',
            listId:     'song-filter-artist-list',
            hiddenId:   'song-filter-artist',
            labelId:    'song-filter-artist-label',
            allKey:     'filter_all_artists',
            allLabel:   typeof t === 'function' ? t('filter_all_artists') : 'TẤT CẢ CA SĨ',
            onSelect: (value) => {
                window.selectedArtistFilter = value;
                playlistRenderStartIndex = 0;
                if (typeof window.refreshPlaylist === 'function') {
                    window.refreshPlaylist(songSearchInput ? songSearchInput.value : '');
                }
            }
        });
    }
    if (!_songFilterGenreInited) {
        _songFilterGenreInited = true;
        initSearchableFilterDropdown({
            btnId:      'song-filter-genre-btn',
            dropdownId: 'song-filter-genre-dropdown',
            searchId:   'song-filter-genre-search',
            listId:     'song-filter-genre-list',
            hiddenId:   'song-filter-genre',
            labelId:    'song-filter-genre-label',
            allKey:     'filter_all_genres',
            allLabel:   typeof t === 'function' ? t('filter_all_genres') : 'TẤT CẢ THỂ LOẠI',
            onSelect: (value) => {
                window.selectedGenreFilter = value;
                playlistRenderStartIndex = 0;
                if (typeof window.refreshPlaylist === 'function') {
                    window.refreshPlaylist(songSearchInput ? songSearchInput.value : '');
                }
            }
        });
    }
    if (!_songFilterCopyrightInited) {
        _songFilterCopyrightInited = true;
        initSearchableFilterDropdown({
            btnId:      'song-filter-copyright-btn',
            dropdownId: 'song-filter-copyright-dropdown',
            listId:     'song-filter-copyright-list',
            hiddenId:   'song-filter-copyright',
            labelId:    'song-filter-copyright-label',
            allKey:     'filter_all_copyright',
            allLabel:   typeof t === 'function' ? t('filter_all_copyright') : 'BẢN QUYỀN: TẤT CẢ',
            staticOptions: [
                { value: '', labelKey: 'filter_all_copyright', defaultText: 'BẢN QUYỀN: TẤT CẢ' },
                { value: 'free', labelKey: 'filter_copyright_free', defaultText: 'MIỄN PHÍ' },
                { value: 'claimed', labelKey: 'filter_copyright_claimed', defaultText: 'CÓ BẢN QUYỀN' }
            ],
            onSelect: (value) => {
                window.selectedCopyrightFilter = value;
                playlistRenderStartIndex = 0;
                if (typeof window.refreshPlaylist === 'function') {
                    window.refreshPlaylist(songSearchInput ? songSearchInput.value : '');
                }
            }
        });
    }

    // Cập nhật danh sách items vào dropdown
    const artistBtn    = document.getElementById('song-filter-artist-btn');
    const genreBtn     = document.getElementById('song-filter-genre-btn');
    const copyrightBtn = document.getElementById('song-filter-copyright-btn');
    if (artistBtn && artistBtn._updateItems) artistBtn._updateItems(artists);
    if (genreBtn  && genreBtn._updateItems)  genreBtn._updateItems(genres);
    if (copyrightBtn && copyrightBtn._refreshLabel) copyrightBtn._refreshLabel();
}

function resetSongFilters() {
    // Reset search term input & clear button
    if (songSearchInput) {
        songSearchInput.value = '';
    }
    if (songSearchClearBtn) {
        songSearchClearBtn.classList.add('hidden');
    }
    currentFilterTerm = '';

    // Reset filter globals
    window.selectedArtistFilter = '';
    window.selectedGenreFilter = '';
    window.selectedCopyrightFilter = '';

    // Reset Artist dropdown UI & label
    const artistHidden = document.getElementById('song-filter-artist');
    const artistBtn = document.getElementById('song-filter-artist-btn');
    const artistLabel = document.getElementById('song-filter-artist-label');
    if (artistHidden) artistHidden.value = '';
    if (artistBtn && typeof artistBtn._setValue === 'function') {
        artistBtn._setValue('');
    } else if (artistLabel) {
        artistLabel.textContent = typeof t === 'function' ? t('filter_all_artists') : 'TẤT CẢ CA SĨ';
    }

    // Reset Genre dropdown UI & label
    const genreHidden = document.getElementById('song-filter-genre');
    const genreBtn = document.getElementById('song-filter-genre-btn');
    const genreLabel = document.getElementById('song-filter-genre-label');
    if (genreHidden) genreHidden.value = '';
    if (genreBtn && typeof genreBtn._setValue === 'function') {
        genreBtn._setValue('');
    } else if (genreLabel) {
        genreLabel.textContent = typeof t === 'function' ? t('filter_all_genres') : 'TẤT CẢ THỂ LOẠI';
    }

    // Reset Copyright dropdown UI & label
    const copyrightHidden = document.getElementById('song-filter-copyright');
    const copyrightBtn = document.getElementById('song-filter-copyright-btn');
    const copyrightLabel = document.getElementById('song-filter-copyright-label');
    if (copyrightHidden) copyrightHidden.value = '';
    if (copyrightBtn && typeof copyrightBtn._setValue === 'function') {
        copyrightBtn._setValue('');
    } else if (copyrightLabel) {
        copyrightLabel.textContent = typeof t === 'function' ? t('filter_all_copyright') : 'BẢN QUYỀN: TẤT CẢ';
    }

    playlistRenderStartIndex = 0;

    // Re-render playlist with clear filters
    if (typeof window.refreshPlaylist === 'function') {
        window.refreshPlaylist('');
    } else {
        renderSongList('');
    }
}
window.resetSongFilters = resetSongFilters;

function initSongFilters() {
    const resetBtn = document.getElementById('song-filter-reset-btn');

    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            resetSongFilters();
        });
    }
}

// Kích hoạt bộ lọc
initSongFilters();


// ==========================================
// Context Menu for Beatmaps
// ==========================================

function showSongContextMenu(e, songIndex, x, y) {
    // Ensure listeners are initialized when we show the menu (since the HTML is parsed after the script)
    initSongContextMenu();

    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    const menu = document.getElementById('song-context-menu');
    if (!menu) return;
    
    menu.dataset.songIndex = songIndex;
    
    // Check if cached
    const opt = document.querySelector(`.song-option[data-index="${songIndex}"]`);
    const isCached = opt ? (opt.dataset.isCached === 'true') : false;
    
    const deleteCacheBtn = document.getElementById('ctx-delete-cache-btn');
    if (deleteCacheBtn) {
        if (isCached) {
            deleteCacheBtn.style.display = 'flex';
        } else {
            deleteCacheBtn.style.display = 'none';
        }
    }
    
    menu.classList.remove('hidden');
    menu.style.display = 'block';
    
    const menuWidth = menu.offsetWidth || 170;
    const menuHeight = menu.offsetHeight || 90;
    
    let left = x;
    let top = y;
    
    if (left + menuWidth > window.innerWidth) {
        left = window.innerWidth - menuWidth - 10;
    }
    if (top + menuHeight > window.innerHeight) {
        top = window.innerHeight - menuHeight - 10;
    }
    
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
}

function initSongContextMenu() {
    const menu = document.getElementById('song-context-menu');
    const playBtn = document.getElementById('ctx-play-btn');
    const leaderboardBtn = document.getElementById('ctx-leaderboard-btn');
    const deleteCacheBtn = document.getElementById('ctx-delete-cache-btn');
    
    if (playBtn && !playBtn.dataset.listenerBound) {
        playBtn.dataset.listenerBound = 'true';
        playBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (menu) {
                menu.classList.add('hidden');
                menu.style.display = 'none';
                const songIndex = parseInt(menu.dataset.songIndex);
                if (!isNaN(songIndex)) {
                    playlistRenderStartIndex = 0; // Trở về đầu để thấy bài đang chơi khi mở lại Menu
                    
                    // Kiểm tra xem đã vượt qua (Passed) bài hát chưa (Ưu tiên Server metadata, ngoại tuyến 60s mới dùng đến Local DB)
                    let currentSong = activePlaylist && activePlaylist[songIndex] ? activePlaylist[songIndex] : (typeof songs !== 'undefined' && songs ? songs[songIndex] : null);
                    let isPassed = await checkSongPassedStatus(currentSong, songIndex);

                    const isHelperMode = typeof isAnyHelperModeActive === 'function' ? isAnyHelperModeActive() : false;

                    if (isHelperMode || isPassed) {
                        promptPlayModeSelection((mode) => {
                            window.chosenPlayMode = mode;
                            changeSong(songIndex, true);
                        });
                    } else {
                        window.chosenPlayMode = 'normal';
                        changeSong(songIndex, true);
                    }
                }
            }
        });
    }
    
    if (leaderboardBtn && !leaderboardBtn.dataset.listenerBound) {
        leaderboardBtn.dataset.listenerBound = 'true';
        leaderboardBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (menu) {
                menu.classList.add('hidden');
                menu.style.display = 'none';
                const songIndex = parseInt(menu.dataset.songIndex);
                if (!isNaN(songIndex) && typeof showLeaderboard === 'function') {
                    showLeaderboard(songIndex);
                }
            }
        });
    }
    
    if (deleteCacheBtn && !deleteCacheBtn.dataset.listenerBound) {
        deleteCacheBtn.dataset.listenerBound = 'true';
        deleteCacheBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (menu) {
                menu.classList.add('hidden');
                menu.style.display = 'none';
                const songIndex = parseInt(menu.dataset.songIndex);
                if (!isNaN(songIndex)) {
                    const song = playlist[songIndex];
                    if (song && typeof showCyberModal === 'function') {
                        showCyberModal({
                            title: typeof t === 'function' ? t('confirm_title') : "XÁC NHẬN",
                            message: typeof t === 'function' ? t('msg_confirm_delete_song_cache').replace('{name}', song.name) : `Bạn có chắc chắn muốn xóa bộ nhớ đệm của bài hát "${song.name}" không?`,
                            type: 'confirm',
                            onConfirm: async () => {
                                if (typeof deleteSongCache === 'function') {
                                    await deleteSongCache(song.url, song.lazyUrl);
                                }
                                song.loaded = false;
                                song.beats = [0, 1, 2, 3];
                                renderSongList();
                            }
                        });
                    }
                }
            }
        });
    }
}

function promptPlayModeSelection(onSelect) {
    const isAsian = window.AsianModeManager && window.AsianModeManager.isEnabled;
    const isHard  = window.HardModeManager && window.HardModeManager.isEnabled;
    const isEasy  = window.EasyModeManager && window.EasyModeManager.isEnabled;

    let normalBorderBg = "border-cyan-500/30 bg-cyan-950/20 hover:border-cyan-400 hover:bg-cyan-900/40";
    let normalTitleColor = "text-cyan-400";
    let endlessBorderBg = "border-pink-500/30 bg-pink-950/20 hover:border-pink-400 hover:bg-pink-900/40 shadow-[0_0_15px_rgba(236,72,153,0.05)] hover:shadow-[0_0_15px_rgba(236,72,153,0.15)]";
    let endlessTitleColor = "text-pink-400";

    if (isAsian) {
        normalBorderBg = "border-red-500/40 bg-red-950/30 hover:border-red-400 hover:bg-red-900/50";
        normalTitleColor = "text-red-400";
        endlessBorderBg = "border-rose-500/50 bg-rose-950/40 hover:border-rose-400 hover:bg-rose-900/60 shadow-[0_0_15px_rgba(225,29,72,0.2)] hover:shadow-[0_0_20px_rgba(225,29,72,0.4)]";
        endlessTitleColor = "text-rose-400";
    } else if (isHard) {
        normalBorderBg = "border-yellow-500/40 bg-yellow-950/30 hover:border-yellow-400 hover:bg-yellow-900/50";
        normalTitleColor = "text-yellow-400";
        endlessBorderBg = "border-orange-500/50 bg-orange-950/40 hover:border-orange-400 hover:bg-orange-900/60 shadow-[0_0_15px_rgba(249,115,22,0.2)] hover:shadow-[0_0_20px_rgba(249,115,22,0.4)]";
        endlessTitleColor = "text-orange-400";
    } else if (isEasy) {
        normalBorderBg = "border-emerald-500/40 bg-emerald-950/30 hover:border-emerald-400 hover:bg-emerald-900/50";
        normalTitleColor = "text-emerald-400";
        endlessBorderBg = "border-teal-500/50 bg-teal-950/40 hover:border-teal-400 hover:bg-teal-900/60 shadow-[0_0_15px_rgba(20,184,166,0.2)] hover:shadow-[0_0_20px_rgba(20,184,166,0.4)]";
        endlessTitleColor = "text-teal-400";
    }

    const messageHtml = `
        <div class="flex flex-col gap-3 py-4 w-full">
            <button id="modal-play-normal" class="w-full p-4 rounded-xl border ${normalBorderBg} text-left transition-all group">
                <div class="${normalTitleColor} font-bold text-sm font-orbitron uppercase flex items-center gap-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    ${t('play_mode_normal') || "Normal Mode (Warm-up)"}
                </div>
                <p class="text-gray-400 text-xs mt-1.5 leading-relaxed font-sans">${t('play_mode_normal_desc') || "Chơi bản nhạc cơ bản một lần. Vượt qua để mở khóa chế độ Vô tận."}</p>
            </button>
            <button id="modal-play-endless" class="w-full p-4 rounded-xl border ${endlessBorderBg} text-left transition-all group">
                <div class="${endlessTitleColor} font-bold text-sm font-orbitron uppercase flex items-center gap-2">
                    <svg class="w-4 h-4 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                    ${t('play_mode_endless') || "Endless Mode"}
                </div>
                <p class="text-gray-400 text-xs mt-1.5 leading-relaxed font-sans">${t('play_mode_endless_desc') || "Chạy vô hạn với tốc độ tăng dần. Thách thức giới hạn điểm số!"}</p>
            </button>
        </div>
    `;

    showCyberModal({
        title: t('play_mode_title') || "CHỌN CHẾ ĐỘ CHƠI",
        message: messageHtml,
        type: 'alert',
        confirmText: t('btn_cancel') || "HỦY"
    });

    const btnNormal = document.getElementById('modal-play-normal');
    const btnEndless = document.getElementById('modal-play-endless');
    const closeBtn = document.querySelector('#cyber-modal-actions button');

    const isRelax = localStorage.getItem('relaxModeEnabled') === 'true' || (typeof relaxModeEnabled !== 'undefined' && relaxModeEnabled);
    const isBot = localStorage.getItem('botAssistEnabled') === 'true' || (typeof botAssistEnabled !== 'undefined' && botAssistEnabled);
    const isAdminAuto = typeof isAutoplay !== 'undefined' && isAutoplay;
    const isNaturalAuto = typeof isNaturalAutoplay !== 'undefined' && isNaturalAutoplay;
    const isHelperMode = isRelax || isBot || isAdminAuto || isNaturalAuto;

    if (btnNormal) {
        btnNormal.onclick = () => {
            if (closeBtn) closeBtn.click();
            onSelect('normal');
        };
    }

    if (btnEndless) {
        btnEndless.onclick = () => {
            if (closeBtn) closeBtn.click();
            onSelect('endless');
        };
    }
}

// Dismiss context menu on click/touchstart outside
document.addEventListener('click', (e) => {
    const menu = document.getElementById('song-context-menu');
    if (menu && !menu.contains(e.target)) {
        menu.classList.add('hidden');
        menu.style.display = 'none';
    }
});

document.addEventListener('touchstart', (e) => {
    const menu = document.getElementById('song-context-menu');
    if (menu && !menu.contains(e.target)) {
        menu.classList.add('hidden');
        menu.style.display = 'none';
    }
}, { passive: true });

document.addEventListener('contextmenu', (e) => {
    const menu = document.getElementById('song-context-menu');
    if (menu && !e.target.closest('.song-option') && !menu.contains(e.target)) {
        menu.classList.add('hidden');
        menu.style.display = 'none';
    }
});

// Initialize listeners
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSongContextMenu);
} else {
    initSongContextMenu();
}