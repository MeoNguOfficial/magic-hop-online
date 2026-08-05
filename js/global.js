// ============================================================
//  global.js — Cấu hình, DOM, Settings UI & Khởi chạy
//  Chứa: DOM refs, biến trạng thái toàn cục, applySettings,
//         changeSong, event listeners UI, bootstrap hệ thống.
//  Phụ thuộc: game.js (phải load sau global.js)
// ============================================================

// --- DOM REFERENCES ---
const container = document.getElementById('canvas-container');
const scoreEl = document.getElementById('score');
const comboEl = document.getElementById('combo-ui');
const autoplayIndicator = document.getElementById('autoplay-indicator');
const speedEl = document.getElementById('speed');
const perfectStreakHud = document.getElementById('perfect-streak-hud');
const startScreen = document.getElementById('start-screen');
const startScreenWindow = document.getElementById('start-screen-window');
const gameoverScreen = document.getElementById('gameover-screen');
const gameoverScreenWindow = document.getElementById('gameover-screen-window');
const restartBtn = document.getElementById('restart-btn');
const finalScoreEl = document.getElementById('final-score');
const finalSpeedEl = document.getElementById('final-speed');
const tapToPlayOverlay = document.getElementById('tap-to-play-overlay');
const loadingOverlay = document.getElementById('loading-overlay');
const menuBtn = document.getElementById('menu-btn');
const countdownNumber = document.getElementById('countdown-number');
const graphicsQualityOptions = document.getElementById('graphics-quality-options');
const graphicsApiOptions = document.getElementById('graphics-api-options');
const togglePerfMode = document.getElementById('toggle-perf-mode');
const toggleShockwaves = document.getElementById('toggle-shockwaves');
const toggleRelativePC = document.getElementById('toggle-relative-pc');
const toggleRawInput = document.getElementById('toggle-raw-input');
const toggleAntialiasing = document.getElementById('toggle-antialiasing');
const toggleDynamicColors = document.getElementById('toggle-dynamic-colors');
const toggleVisualizer = document.getElementById('toggle-visualizer');
const bgVisualizerCanvas = document.getElementById('bg-visualizer');
const toggleBgParticles = document.getElementById('toggle-bg-particles');
const toggleTileBounce = document.getElementById('toggle-tile-bounce');
const toggleBlockShatter = document.getElementById('toggle-block-shatter');
const toggleUiAnimations = document.getElementById('toggle-ui-animations');
const spawnAnimationSelect = document.getElementById('spawn-animation-mode');
const toggleBallGlow = document.getElementById('toggle-ball-glow');
const toggleBallTrail = document.getElementById('toggle-ball-trail');
const toggleShowBoundaries = document.getElementById('toggle-show-boundaries');
const sensitivitySlider = document.getElementById('sensitivity-slider');
const tileDetailSlider = document.getElementById('tile-detail-slider');
const tileDetailValue = document.getElementById('tile-detail-value');
const sensitivityValueSpan = document.getElementById('sensitivity-value');
const blocksAheadSlider = document.getElementById('blocks-ahead-slider');
const blocksAheadValue = document.getElementById('blocks-ahead-value');
const maxFpsSlider = document.getElementById('max-fps-slider');
const maxFpsValue = document.getElementById('max-fps-value');
const blocksBehindSlider = document.getElementById('blocks-behind-slider');
const blocksBehindValue = document.getElementById('blocks-behind-value');
const menuVolumeSlider = document.getElementById('menu-volume-slider');
const menuVolumeValue = document.getElementById('menu-volume-value');
const previewVolumeSlider = document.getElementById('preview-volume-slider');
const previewVolumeValue = document.getElementById('preview-volume-value');
const playSfxVolumeSlider = document.getElementById('play-sfx-volume-slider');
const playSfxVolumeValue = document.getElementById('play-sfx-volume-value');
const pregameVolumeSlider = document.getElementById('pregame-volume-slider');
const pregameVolumeValue = document.getElementById('pregame-volume-value');
const sfxVolumeSlider = document.getElementById('sfx-volume-slider');
const sfxVolumeValue = document.getElementById('sfx-volume-value');
const roundVolumeSlider = document.getElementById('round-volume-slider');
const roundVolumeValue = document.getElementById('round-volume-value');
const mfxGameOverVolumeSlider = document.getElementById('mfx-game-over-volume-slider');
const mfxGameOverVolumeValue = document.getElementById('mfx-game-over-volume-value');
const uiVolumeSlider = document.getElementById('ui-volume-slider');
const uiVolumeValue = document.getElementById('ui-volume-value');
const breakBlockVolumeSlider = document.getElementById('break-block-volume-slider');
const breakBlockVolumeValue = document.getElementById('break-block-volume-value');
const gameVolumeSlider = document.getElementById('game-volume-slider');
const gameVolumeValue = document.getElementById('game-volume-value');
const autoplayBackBtn = document.getElementById('autoplay-back-btn');
const holdProgressEl = document.getElementById('hold-progress');
const introOverlay = document.getElementById('intro-overlay');
const introProgressBar = document.getElementById('intro-progress-bar');
const loadPercentText = document.getElementById('load-percent');
const startGameBtn = document.getElementById('start-game-btn');
const introLoadingContainer = document.getElementById('intro-loading-container');
const updateDataBtn = document.getElementById('update-data-btn');
const clearCacheBtn = document.getElementById('clear-cache-btn');
const clearBeatmapCacheBtn = document.getElementById('clear-beatmap-cache-btn');
const checkStorageIntegrityBtn = document.getElementById('check-storage-integrity-btn');
const clearAllStorageBtn = document.getElementById('clear-all-storage-btn');
const refreshDataBtn = document.getElementById('refresh-data-btn');
const bestScoreLabel = document.getElementById('best-score-label');
const highScoreDisplay = document.getElementById('high-score-display');
const cyberModal = document.getElementById('cyber-modal');
const cyberModalWindow = document.getElementById('cyber-modal-window');
const cyberModalTitle = document.getElementById('cyber-modal-title');
const cyberModalMessage = document.getElementById('cyber-modal-message');
const cyberModalActions = document.getElementById('cyber-modal-actions');
const secretCreditBtn = document.getElementById('secret-credit-btn');
const adminPanelModal = document.getElementById('admin-panel-modal');
const closeAdminBtn = document.getElementById('close-admin-btn');
const adminAutoplayToggle = document.getElementById('admin-autoplay-toggle');
const adminDevModeToggle = document.getElementById('admin-devmode-toggle');
const adminClearScores = document.getElementById('admin-clear-scores');
const adminSpeedGainInput = document.getElementById('admin-speed-gain-input');
const adminSpeedGainReset = document.getElementById('admin-speed-gain-reset');
const togglePreservePitch = document.getElementById('toggle-preserve-pitch');
const limitBeatmapAudioSelect = document.getElementById('limit-beatmap-audio-select');

// --- FULLSCREEN HELPERS ---
function triggerEnterFullscreen() {
    const docElm = document.documentElement;
    if (docElm.requestFullscreen) {
        docElm.requestFullscreen().then(() => {
            if (navigator.keyboard && typeof navigator.keyboard.lock === 'function') {
                navigator.keyboard.lock(['Escape']).catch(err => console.warn('[Fullscreen] Lock Escape failed:', err));
            }
        }).catch(err => console.warn('[Fullscreen] Lỗi:', err));
    } else if (docElm.webkitRequestFullscreen) {
        docElm.webkitRequestFullscreen();
    } else if (docElm.mozRequestFullScreen) {
        docElm.mozRequestFullScreen();
    } else if (docElm.msRequestFullscreen) {
        docElm.msRequestFullscreen();
    }
}

function triggerExitFullscreen() {
    if (navigator.keyboard && typeof navigator.keyboard.unlock === 'function') {
        navigator.keyboard.unlock();
    }
    if (!document.fullscreenElement && !document.webkitFullscreenElement && !document.mozFullScreenElement && !document.msFullscreenElement) {
        return;
    }
    if (document.exitFullscreen) {
        document.exitFullscreen().catch(err => console.warn('[Fullscreen] Lỗi:', err));
    } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
    } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
    } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
    }
}

// --- BIẾN THREE.JS ---
let scene, camera, renderer;
let ball, tiles = [], shockwaves = [];
let perfectRings = [];
let ballTrailSegments = [];
let exitingTiles = [];
let particlesGeo, particlesMat;
let ballGlowMesh, ballGlowLight;
let starField;

// --- BACKGROUND CUSTOMIZATION STATE ---
let selectedBackground = localStorage.getItem('selectedBackground') || 'default';
let bgMesh = null;
let bgTexture = null;
let bgMaterial = null;
const targetBgColor = new THREE.Color(0x00ffff);
const currentBgColor = new THREE.Color(0x00ffff);

// --- OBJECT POOLING ---
const tilePool = [];
let maxTilePoolSize = 15; // Cập nhật động dựa trên blocksAheadLimit và blocksBehindLimit
const shockwavePool = [];
const perfectRingPool = [];
let cachedTileGeo = null;
let cachedCenterGeo = null;
let cachedBorderGeo = null;

let cachedTrailGeo = null;
let cachedShockwaveGeo = null;
let cachedPerfectRingGeo = null;
let cachedGlowGeo = null;
let currentGlowHeight = 1.0;
const trailPool = [];

// Tối ưu: Dùng lại đối tượng để tránh Garbage Collector
const tempColor = new THREE.Color();
const tempVec3 = new THREE.Vector3();
let lastDisplayedSpeedText = "";
let lastDisplayedScore = -1;
let lastDisplayedPerfectHUD = -1;

// --- PLAYLIST & BEATMAP ---
let selectedSongIndex = parseInt(localStorage.getItem('selectedSongIndex')) || 0;
let activePlaylist = [{ name: 'Loading...', url: '', beats: [0, 1, 2, 3] }];

let beatmapBeats = activePlaylist[0].beats;
let BEATMAP_TOTAL_TIME = 10;
let SPEED_GAIN_PER_ROUND = 0.2;

let currentBeatIndex = 0;
let isEndlessMode = false;
let endlessBufferCount = 0;

// --- QUẢN LÝ ROUND & TỐC ĐỘ ---
let roundCount = 0;
let transitionStep = 0;
let blocksSinceLastRound = 0;
let countdownInterval = null;
let activeRoundCount = 0;
let activeEndlessMode = false;
let targetSpeed = 1.0;

// --- TRẠNG THÁI INPUT ---
let holdTime = 0;
let isHoldingBtn = false;
const keys = {};

// --- TRẠNG THÁI GAME ---
let score = 0;
let comboCount = 0;
let gameSpeed = 1.0;
let isPlaying = false;
let isAutoplay = false;
let isNaturalAutoplay = localStorage.getItem('relaxModeEnabled') === 'true';
let nonPerfectStreak = 0;
let currentTileScale = 1.0;
let lastInputX = 0;
let isMouseDown = false;
let currentBeatHits = [];
window.currentBeatHits = currentBeatHits;

// --- THÔNG SỐ VẬT LÝ ---
let baseBallVelocityZ = -18; //Vận tốc lướt của block
let ballVelocityZ = baseBallVelocityZ;

let jumpElapsedTime = 0;
let flightTime = 0;
let jumpStartRawZ = 0;
let currentGravity = -70;
let currentBounceVelocityY = 24;
let isFalling = false;
let isRescuing = false;
let rescueTargetTile = null;
let isVictoryTransition = false;
let victoryTimeElapsed = 0;
let ballVictoryVelocityY = 0;
let ballVictoryGravity = -25;
let victoryCameraDecay = 1.0;
// Vận tốc camera cho SmoothDamp (ease-in-out / quán tính)
let camVelX = 0, camVelY = 0, camVelZ = 0;
let fallVelocityY = 0, fallVelocityZ = 0, fallVelocityX = 0;
let accumulatedSongTime = 0;

let ballTargetX = 0;

// Hiệu ứng sụt âm thanh khi Game Over
let isFailTransition = false;
let isHoldExitTransition = false;
const failDuration = 1.5;
const failWaitDuration = 0.2;
let failTimeElapsed = 0;
let initialFailSpeed = 1.0;

// --- CẤU HÌNH Ô GẠCH ---
let lastTileZ = 0;
const tileSpacingMin = 14;
const tileSpacingMax = 32;
const tileWidth = 4.3;
const tileLength = 4.3;

const ballRadius = 0.75;

let clock = new THREE.Clock();

// --- RESTART ---
restartBtn.addEventListener('click', () => {
    if (window.RageGameOverFireManager) window.RageGameOverFireManager.stop();
    if (window.AsianGameOverFireManager) window.AsianGameOverFireManager.stop();
    if (window.EasyGameOverCloverManager) window.EasyGameOverCloverManager.stop();
    if (window.DefaultGameOverParticleManager) window.DefaultGameOverParticleManager.stop();
    if (restartBtn.getAttribute('data-action') === 'endless') {
        window.chosenPlayMode = 'endless';
    }
    if (typeof anime !== 'undefined' && (typeof uiAnimationsEnabled === 'undefined' || uiAnimationsEnabled)) {
        anime({
            targets: gameoverScreen,
            opacity: 0,
            duration: 300,
            easing: 'easeInOutQuad',
            complete: () => gameoverScreen.style.display = 'none'
        });
        if (gameoverScreenWindow) {
            anime({
                targets: gameoverScreenWindow,
                scale: [1, 0.92],
                duration: 300,
                easing: 'easeInQuad'
            });
        }
    } else {
        gameoverScreen.style.opacity = 0;
        gameoverScreen.style.display = 'none';
        if (gameoverScreenWindow) gameoverScreenWindow.style.transform = 'scale(1)';
    }
    resetGameScene();
    startCountdown();
});

// --- CHUYỂN BÀI HÁT ---
let isSongLoadingCancelled = false;
Object.defineProperty(window, 'isSongLoadingCancelled', {
    get: () => isSongLoadingCancelled,
    set: (v) => { isSongLoadingCancelled = v; },
    configurable: true
});
let loadingCancelTimeout = null;
let currentChangeSongRequest = 0;
let tipInterval = null;

// Cập nhật tiến trình tải nhạc & beatmap trên giao diện
function updateMusicLoadingProgress(percent) {
    const progressBar = document.getElementById('music-progress-bar');
    const percentText = document.getElementById('music-load-percent');
    if (progressBar) progressBar.style.width = `${percent}%`;
    if (percentText) percentText.innerText = `${percent}%`;
}

async function changeSong(index, autoStart = false) {
    const requestId = ++currentChangeSongRequest;

    // --- HIỆN LOADING NGAY LẬP TỨC KHI NHẤN PLAY ---
    if (autoStart) {
        if (typeof autoFullscreenEnabled !== 'undefined' && autoFullscreenEnabled) {
            triggerEnterFullscreen();
        }
        isSongLoadingCancelled = false;
        loadingOverlay.style.display = 'flex';

        // --- HIỂN THỊ MẸO NGẪU NHIÊN ---
        if (tipInterval) clearInterval(tipInterval);
        let tipContainer = document.getElementById('loading-tip-container');
        if (!tipContainer && loadingOverlay) {
            tipContainer = document.createElement('div');
            tipContainer.id = 'loading-tip-container';
            tipContainer.className = "absolute bottom-8 left-1/2 -translate-x-1/2 w-full max-w-md text-center px-4";
            tipContainer.innerHTML = `
                <p class="text-cyan-400 font-orbitron text-sm font-bold animate-pulse" id="loading-tip-title"></p>
                <p class="text-gray-300 text-xs mt-1" id="loading-tip-text"></p>
            `;
            loadingOverlay.appendChild(tipContainer);
        }

        const showRandomTip = () => {
            const tipCount = 8; // Số lượng mẹo đã định nghĩa trong i18n.js
            const randomIndex = Math.floor(Math.random() * tipCount) + 1;
            const tipTitleEl = document.getElementById('loading-tip-title');
            const tipTextEl = document.getElementById('loading-tip-text');
            if (tipTitleEl && tipTextEl && typeof t === 'function') {
                tipTitleEl.innerText = t('loading_tip_title');
                tipTextEl.innerText = t(`loading_tip_${randomIndex}`);
            }
        };

        showRandomTip(); // Hiển thị ngay một mẹo
        tipInterval = setInterval(showRandomTip, 4000); // Thay đổi mẹo mỗi 4 giây

        let loadingCancelBtn = document.getElementById('loading-cancel-btn');
        if (!loadingCancelBtn && loadingOverlay) {
            loadingCancelBtn = document.createElement('button');
            loadingCancelBtn.id = 'loading-cancel-btn';
            loadingCancelBtn.className = "mt-6 px-6 py-2 bg-red-900/80 hover:bg-red-800 text-white font-bold text-sm rounded uppercase border border-red-500/50 font-orbitron transition-all shadow-[0_0_10px_rgba(220,38,38,0.3)]";
            loadingCancelBtn.style.display = 'none';
            loadingOverlay.appendChild(loadingCancelBtn);

            loadingCancelBtn.addEventListener('click', () => {
                isSongLoadingCancelled = true;
                loadingOverlay.style.display = 'none';
                if (typeof autoFullscreenEnabled !== 'undefined' && autoFullscreenEnabled) {
                    triggerExitFullscreen();
                }
                if (loadingCancelTimeout) clearTimeout(loadingCancelTimeout);
                if (tipInterval) clearInterval(tipInterval);
                if (audio) {
                    audio.pause();
                    audio.removeAttribute('src');
                    audio.load(); // Hủy request tải nhạc để tiết kiệm mạng
                }
                if (menuAudio && startScreen.style.display !== 'none') {
                    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
                    if (menuFilterNode && menuGainNode) {
                        const now = audioCtx.currentTime;
                        menuFilterNode.frequency.cancelScheduledValues(now);
                        menuGainNode.gain.cancelScheduledValues(now);
                        menuFilterNode.frequency.setValueAtTime(menuFilterNode.frequency.value, now);
                        menuGainNode.gain.setValueAtTime(menuGainNode.gain.value, now);
                        menuFilterNode.frequency.linearRampToValueAtTime(22050, now + 0.1);
                        menuGainNode.gain.linearRampToValueAtTime((typeof isMenuMuted !== 'undefined' && isMenuMuted) ? 0 : (typeof menuVolume !== 'undefined' ? menuVolume : 0.5), now + 0.1);
                    } else if (!audioCtx && menuAudio) {
                        menuAudio.volume = (typeof isMenuMuted !== 'undefined' && isMenuMuted) ? 0 : (typeof menuVolume !== 'undefined' ? menuVolume : 0.5);
                    }
                    const playPromise = menuAudio.play();
                    if (playPromise !== undefined) {
                        playPromise.catch(e => {
                            setTimeout(() => { menuAudio.play().catch(() => { }); }, 50);
                        });
                    }
                }
            });
        }
        if (loadingCancelBtn) {
            loadingCancelBtn.style.display = 'none';
            loadingCancelBtn.innerText = typeof t === 'function' ? t('btn_cancel') : 'CANCEL';
            if (loadingCancelTimeout) clearTimeout(loadingCancelTimeout);
            loadingCancelTimeout = setTimeout(() => {
                if (loadingOverlay.style.display !== 'none' && !isSongLoadingCancelled) {
                    loadingCancelBtn.style.display = 'block';
                }
            }, 3000); // Sẽ hiện nút Hủy sau 3 giây chờ
        }
    }

    if (autoStart) {
        updateMusicLoadingProgress(0);
        if (typeof updateLoadingStatus === 'function') {
            updateLoadingStatus('msg_map_downloading');
        }
    }

    if (typeof ensureSongLoaded === 'function') {
        await ensureSongLoaded(index, true);
    }

    // Nếu quá trình nạp map bị lỗi (Timeout/Network) hoặc bị hủy
    if (isSongLoadingCancelled || requestId !== currentChangeSongRequest) {
        if (tipInterval) clearInterval(tipInterval);
        if (typeof autoFullscreenEnabled !== 'undefined' && autoFullscreenEnabled) {
            triggerExitFullscreen();
        }
        return;
    }

    if (autoStart) {
        updateMusicLoadingProgress(10);
        if (typeof updateLoadingStatus === 'function') {
            updateLoadingStatus('loading_music');
        }
    } else {
        if (typeof updateLoadingStatus === 'function') {
            updateLoadingStatus('msg_entering_map');
        }
    }

    // --- OFFLINE CHECK ---
    if (!navigator.onLine) {
        const isCached = typeof isAudioCached === 'function' ? await isAudioCached(activePlaylist[index].url) : false;
        if (!isCached) {
            if (autoStart) {
                loadingOverlay.style.display = 'none';
                if (typeof autoFullscreenEnabled !== 'undefined' && autoFullscreenEnabled) {
                    triggerExitFullscreen();
                }
            }
            if (tipInterval) clearInterval(tipInterval);
            if (typeof showCyberModal === 'function') {
                showCyberModal({
                    title: typeof t === 'function' ? t('offline_title') : "OFFLINE",
                    message: typeof t === 'function' ? t('offline_msg') : "Bạn đang ngoại tuyến! Chỉ có thể phát các bài hát đã được lưu trong bộ nhớ đệm (Cache).",
                    type: 'alert'
                });
            }
            // Khôi phục giao diện (active state) về bài cũ
            const options = document.querySelectorAll('.song-option');
            options.forEach((opt) => {
                opt.classList.toggle('active', parseInt(opt.dataset.index) === selectedSongIndex);
            });
            return; // Hủy chuyển bài
        }
    }

    selectedSongIndex = index;
    localStorage.setItem('selectedSongIndex', index);
    if (activePlaylist && activePlaylist[index]) {
        if (activePlaylist[index].id) localStorage.setItem('selectedSongId', activePlaylist[index].id);
        if (activePlaylist[index].url) localStorage.setItem('selectedSongUrl', activePlaylist[index].url);
    }

    if (!autoStart && typeof stopPreview === 'function') stopPreview(true);

    const options = document.querySelectorAll('.song-option');
    options.forEach((opt) => {
        opt.classList.toggle('active', parseInt(opt.dataset.index) === index);
    });

    // Khi trở lại Menu chính, làm mới danh sách để ép bài hát vừa chơi lên trên cùng
    if (!autoStart && typeof renderSongList === 'function' && typeof currentFilterTerm !== 'undefined') {
        renderSongList(currentFilterTerm);
        const selector = document.getElementById('song-selector');
        if (selector) selector.scrollTop = 0;
    }

    let changeSongBeats = activePlaylist[index].beats;
    if (!Array.isArray(changeSongBeats) || changeSongBeats.length === 0) {
        console.warn('[changeSong] Beats không hợp lệ cho bài', index, '- dùng fallback an toàn.');
        changeSongBeats = [0, 1, 2, 3];
        activePlaylist[index].beats = changeSongBeats;
    }
    beatmapBeats = changeSongBeats;
    BEATMAP_TOTAL_TIME = beatmapBeats[beatmapBeats.length - 1] || 10;

    // --- ÁP DỤNG SPEED TỪ PLAYLIST (NẾU CÓ) ---
    if (activePlaylist[index].speed != null) {
        baseBallVelocityZ = -Math.abs(activePlaylist[index].speed);
    } else {
        baseBallVelocityZ = -18;
    }

    if (!menuAudio || !audioCtx) initAudio();

    // Đảm bảo AudioContext hoạt động khi có tương tác (chuyển bài cũng là tương tác)
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }

    if (!autoStart) {
        if (menuFilterNode && menuGainNode && currentPreviewIndex === -1) {
            const now = audioCtx.currentTime;
            menuFilterNode.frequency.cancelScheduledValues(now);
            menuGainNode.gain.cancelScheduledValues(now);
            menuFilterNode.frequency.setValueAtTime(menuFilterNode.frequency.value, now);
            menuGainNode.gain.setValueAtTime(menuGainNode.gain.value, now);
            menuFilterNode.frequency.linearRampToValueAtTime(22050, now + 0.1);
            menuGainNode.gain.linearRampToValueAtTime((typeof isMenuMuted !== 'undefined' && isMenuMuted) ? 0 : (typeof menuVolume !== 'undefined' ? menuVolume : 0.5), now + 0.1);
        } else if (!audioCtx && menuAudio) {
            menuAudio.volume = (typeof isMenuMuted !== 'undefined' && isMenuMuted) ? 0 : (typeof menuVolume !== 'undefined' ? menuVolume : 0.5);
        }
        const isIntroVisible = typeof introOverlay !== 'undefined' && introOverlay && introOverlay.style.display !== 'none';
        if (!isIntroVisible && menuAudio && currentPreviewIndex === -1) {
            const playPromise = menuAudio.play();
            if (playPromise !== undefined) {
                playPromise.catch(e => {
                    console.log("Menu Audio Play failed, attempting to recover...", e);
                    setTimeout(() => {
                        menuAudio.play().catch(() => { });
                    }, 50);
                });
            }
        }
    }

    if (!audio) initAudio();

    let audioUrl;
    if (autoStart && typeof getCachedAudioUrlWithProgress === 'function') {
        try {
            audioUrl = await getCachedAudioUrlWithProgress(activePlaylist[index].url, (audioPercent) => {
                if (isSongLoadingCancelled || requestId !== currentChangeSongRequest) return;
                const finalPercent = Math.round(10 + audioPercent * 0.9);
                updateMusicLoadingProgress(finalPercent);
            });
        } catch (e) {
            console.error("[changeSong] Lỗi tải nhạc có tiến trình:", e);
            if (!isSongLoadingCancelled && requestId === currentChangeSongRequest) {
                loadingOverlay.style.display = 'none';
                isSongLoadingCancelled = true;
                if (typeof showCyberModal === 'function') {
                    showCyberModal({
                        title: typeof t === 'function' ? t('msg_map_error_title') : "LỖI KẾT NỐI",
                        message: typeof t === 'function' ? t('msg_map_error_desc') : "Không thể tải dữ liệu. Vui lòng kiểm tra lại kết nối mạng của bạn.",
                        type: 'alert'
                    });
                }
            }
            return;
        }
    } else {
        audioUrl = typeof getCachedAudioUrl === 'function' ? await getCachedAudioUrl(activePlaylist[index].url) : activePlaylist[index].url;
    }

    if (isSongLoadingCancelled || requestId !== currentChangeSongRequest) {
        return;
    }

    audio.src = audioUrl;
    audio.load();
    audio.loop = false;

    const checkReady = () => {
        if (isSongLoadingCancelled) {
            if (tipInterval) clearInterval(tipInterval);
            return; // Dừng vòng lặp nạp nếu đã hủy
        }
        if (audio.readyState >= 3 && menuAudio.readyState >= 3) {
            if (loadingCancelTimeout) clearTimeout(loadingCancelTimeout);
            if (tipInterval) clearInterval(tipInterval);
            if (autoStart) {
                if (audioCtx && menuFilterNode) {
                    const now = audioCtx.currentTime;
                    menuFilterNode.frequency.cancelScheduledValues(now);
                    menuFilterNode.frequency.setValueAtTime(menuFilterNode.frequency.value, now);
                    menuFilterNode.frequency.exponentialRampToValueAtTime(350, now + 0.8);

                    if (menuGainNode) {
                        menuGainNode.gain.cancelScheduledValues(now);
                        menuGainNode.gain.setValueAtTime(menuGainNode.gain.value, now);
                        menuGainNode.gain.linearRampToValueAtTime(0, now + 1.2);
                    }
                    if (typeof previewGainNode !== 'undefined' && previewGainNode) {
                        previewGainNode.gain.cancelScheduledValues(now);
                        previewGainNode.gain.setValueAtTime(previewGainNode.gain.value, now);
                        previewGainNode.gain.linearRampToValueAtTime(0, now + 1.2);
                    }
                } else if (!audioCtx) {
                    if (menuAudio) menuAudio.volume = 0;
                    if (typeof previewAudio !== 'undefined' && previewAudio) previewAudio.volume = 0;
                }

                setTimeout(() => {
                    if (isSongLoadingCancelled) return;
                    if (typeof stopPreview === 'function') stopPreview(true);
                    loadingOverlay.style.display = 'none';
                    if (typeof anime !== 'undefined' && (typeof uiAnimationsEnabled === 'undefined' || uiAnimationsEnabled)) {
                        anime({
                            targets: startScreen,
                            opacity: 0,
                            duration: 300,
                            easing: 'easeInOutQuad',
                            complete: () => startScreen.style.display = 'none'
                        });
                        if (startScreenWindow) {
                            anime({
                                targets: startScreenWindow,
                                scale: [1, 0.92],
                                duration: 300,
                                easing: 'easeInQuad'
                            });
                        }
                    } else {
                        startScreen.style.opacity = 0;
                        startScreen.style.display = 'none';
                        if (startScreenWindow) startScreenWindow.style.transform = 'scale(1)';
                    }

                    menuAudio.pause();
                    menuAudio.currentTime = 0;
                    if (audioCtx) {
                        const now = audioCtx.currentTime;
                        if (menuFilterNode) {
                            menuFilterNode.frequency.cancelScheduledValues(now);
                            menuFilterNode.frequency.setValueAtTime(22050, now);
                        }
                        if (menuGainNode) {
                            menuGainNode.gain.cancelScheduledValues(now);
                            menuGainNode.gain.setValueAtTime((typeof isMenuMuted !== 'undefined' && isMenuMuted ? 0 : menuVolume), now);
                        }
                        if (gainNode) {
                            gainNode.gain.cancelScheduledValues(now);
                            gainNode.gain.setValueAtTime((typeof isGameMuted !== 'undefined' && isGameMuted ? 0 : gameVolume), now);
                        }
                    } else {
                        if (menuFilterNode) menuFilterNode.frequency.value = 22050;
                        if (menuGainNode) menuGainNode.gain.value = menuVolume;
                        if (gainNode) gainNode.gain.value = gameVolume;
                    }

                    resetGameScene();
                    startCountdown();
                }, 1300);
            }
        } else {
            setTimeout(checkReady, 100);
        }
    };
    if (autoStart) checkReady();
}

// --- CYBERPUNK CUSTOM MODAL ---
function showCyberModal({ title, message, type = 'alert', confirmText, cancelText, doubleConfirm = false, onConfirm = null, onCancel = null }) {
    if (cyberModalTitle) cyberModalTitle.innerText = title || t('data_mng_title') || "THÔNG BÁO";
    if (cyberModalMessage) cyberModalMessage.innerHTML = message || "";
    if (cyberModalActions) cyberModalActions.innerHTML = '';

    const closeDialog = () => {
        if (typeof anime !== 'undefined' && (typeof uiAnimationsEnabled === 'undefined' || uiAnimationsEnabled)) {
            anime({ targets: cyberModal, opacity: 0, duration: 300, easing: 'easeInOutQuad', complete: () => cyberModal.style.display = 'none' });
            anime({ targets: cyberModalWindow, scale: [1, 0.92], duration: 300, easing: 'easeInQuad' });
        } else {
            if (cyberModal) {
                cyberModal.style.opacity = 0;
                cyberModal.style.display = 'none';
            }
        }
    };

    if (type === 'confirm' && cyberModalActions) {
        const cancelBtn = document.createElement('button');
        cancelBtn.className = "flex-1 py-2 text-xs font-bold text-gray-400 border border-gray-500/50 hover:bg-gray-800/50 rounded uppercase font-orbitron transition-all";
        cancelBtn.innerText = cancelText || (typeof t === 'function' ? t('btn_cancel') : 'CANCEL');
        cancelBtn.onclick = () => {
            closeDialog();
            if (onCancel) onCancel();
        };
        cyberModalActions.appendChild(cancelBtn);
    }

    if (cyberModalActions) {
        const confirmBtn = document.createElement('button');
        const defaultText = confirmText || (typeof t === 'function' ? t('btn_ok') : 'OK');
        const defaultClass = "flex-1 py-2 text-xs font-bold text-black bg-cyan-400 hover:bg-cyan-300 rounded uppercase font-orbitron transition-all shadow-[0_0_10px_rgba(34,211,238,0.4)]";
        confirmBtn.className = defaultClass;
        confirmBtn.innerText = defaultText;

        let clickCount = 0;
        let resetTimer = null;

        confirmBtn.onclick = () => {
            if (doubleConfirm && clickCount === 0) {
                clickCount = 1;
                const clickAgainText = typeof t === 'function' ? t('btn_click_again_to_confirm') : 'Click again to confirm';
                confirmBtn.innerText = clickAgainText;
                confirmBtn.className = "flex-1 py-2 text-xs font-bold text-white bg-red-500 hover:bg-red-400 rounded uppercase font-orbitron transition-all shadow-[0_0_15px_rgba(239,68,68,0.6)] animate-pulse";

                resetTimer = setTimeout(() => {
                    clickCount = 0;
                    confirmBtn.innerText = defaultText;
                    confirmBtn.className = defaultClass;
                }, 3500);
                return;
            }

            if (resetTimer) clearTimeout(resetTimer);
            closeDialog();
            if (onConfirm) onConfirm();
        };
        cyberModalActions.appendChild(confirmBtn);
    }

    if (cyberModal) {
        const isAlreadyVisible = cyberModal.style.display === 'flex' && parseFloat(cyberModal.style.opacity || '1') > 0.5;

        cyberModal.style.display = 'flex';
        if (!isAlreadyVisible && typeof anime !== 'undefined' && (typeof uiAnimationsEnabled === 'undefined' || uiAnimationsEnabled)) {
            cyberModal.style.opacity = 0;
            if (cyberModalWindow) cyberModalWindow.style.transform = 'scale(0.92)';
            anime({ targets: cyberModal, opacity: 1, duration: 400, easing: 'easeOutQuint' });
            if (cyberModalWindow) anime({ targets: cyberModalWindow, scale: [0.92, 1], duration: 400, easing: 'easeOutQuint' });
        } else {
            cyberModal.style.opacity = 1;
            if (cyberModalWindow) cyberModalWindow.style.transform = 'scale(1)';
        }
    }
}

// --- KIỂM TRA CÁC CHẾ ĐỘ HỖ TRỢ (AUTOPLAY / BOT NATURAL / RELAX / BOT ASSIST) ---
function isAnyHelperModeActive() {
    const isRelax = (typeof relaxModeEnabled !== 'undefined' && relaxModeEnabled) ||
                    localStorage.getItem('relaxModeEnabled') === 'true';

    const isBot = (typeof botAssistEnabled !== 'undefined' && botAssistEnabled) ||
                  localStorage.getItem('botAssistEnabled') === 'true' ||
                  (typeof window.BotAssistManager !== 'undefined' && window.BotAssistManager.isEnabled);

    const isAuto = (typeof isAutoplay !== 'undefined' && isAutoplay) ||
                   (typeof isNaturalAutoplay !== 'undefined' && isNaturalAutoplay) ||
                   localStorage.getItem('isAutoplay') === 'true' ||
                   localStorage.getItem('isNaturalAutoplay') === 'true' ||
                   (typeof window.AutoplayManager !== 'undefined' && (window.AutoplayManager.isEnabled || window.AutoplayManager.isNaturalEnabled));

    return isRelax || isBot || isAuto;
}
window.isAnyHelperModeActive = isAnyHelperModeActive;

// --- XỬ LÝ ĐỒNG BỘ ĐIỂM SỐ & TRẠNG THÁI PASS LÊN SERVER ---
async function submitScoreToServer(finalScore, isNormalModePassed = false, beatHistory = null, roundEndless = 1) {
    const isHelper = typeof isAnyHelperModeActive === 'function' ? isAnyHelperModeActive() : false;

    // 1. Nếu đang bật chế độ hỗ trợ VÀ KHÔNG PHẢI LÀ PASS BÀI HÁT, ngắt lệnh (không gửi điểm)
    if (isHelper && !isNormalModePassed) {
        return;
    }

    // 2. Kiểm tra Đăng nhập
    const token = localStorage.getItem('auth_token');
    if (!token) {
        return;
    }

    // 3. Lấy ID bài nhạc
    const currentSong = (typeof activePlaylist !== 'undefined' && activePlaylist && activePlaylist[selectedSongIndex]) || (typeof songs !== 'undefined' && songs && songs[selectedSongIndex]);
    const targetBeatmapId = currentSong ? (currentSong.id || (typeof getBeatmapIdFromSong === 'function' ? getBeatmapIdFromSong(currentSong) : null)) : null;
    if (!currentSong || !targetBeatmapId) {
        return;
    }

    // Xử lý dữ liệu nhịp (beat hits) và vòng chơi (round_endless) để xác minh điểm số
    const beatsInput = (Array.isArray(beatHistory) && beatHistory.length > 0) ? beatHistory : (window.currentBeatHits || []);
    const rounds = Math.max(1, parseInt(roundEndless, 10) || 1);
    const countOnes = Array.isArray(beatsInput) ? beatsInput.filter(v => v == 1 || v === '1' || v === true).length : 0;

    // Log thông tin đếm tile và round endless khi bật Dev mode hoặc tài khoản Admin
    const isDevMode = (typeof window.getDevMode === 'function' && window.getDevMode() === true) || localStorage.getItem('dev_mode') === 'true' || localStorage.getItem('is_dev_mode') === 'true';
    let isAdminUser = false;
    try {
        const userObj = JSON.parse(localStorage.getItem('user_info') || '{}');
        if (userObj && (userObj.is_admin === 1 || userObj.is_admin === true || userObj.role === 'admin')) {
            isAdminUser = true;
        }
    } catch (e) {}

    if (isDevMode || isAdminUser) {
        console.log(`[Score Debug] Total Tiles Count: ${countOnes} | Round Endless: ${rounds} | Max Allowed Score: ${countOnes * 21 * rounds} | Final Score: ${finalScore}`);
    }

    // Xác minh điểm ở Client: Điểm không được vượt quá countOnes * 21 * rounds
    if (countOnes > 0) {
        const maxAllowedScore = countOnes * 21 * rounds;
        if (finalScore > maxAllowedScore) {
            console.warn(`[Score Verification] Điểm số gửi lên (${finalScore}) vượt quá giới hạn tối đa cho phép từ mảng beat (${maxAllowedScore}). Hủy đồng bộ điểm số khả nghi.`);
            return;
        }
    }

    let normalScore = 0;
    let rageScore = 0;
    let normalPassed = false;
    let ragePassed = false;

    try {
        const db = typeof getDB === 'function' ? await getDB() : (typeof initDB === 'function' ? await initDB() : null);
        if (db) {
            const tx = db.transaction("highScores", "readonly");
            const store = tx.objectStore("highScores");
            const request = store.get(selectedSongIndex);
            const record = await new Promise((resolve) => {
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => resolve(null);
            });
            if (record) {
                if (record.score) {
                    try { normalScore = parseInt(atob(record.score)) || 0; } catch (e) {}
                }
                if (record.rageScore) {
                    try { rageScore = parseInt(atob(record.rageScore)) || 0; } catch (e) {}
                }
                normalPassed = !!record.isNormalModePassed;
                ragePassed = !!record.isRageModePassed;
            }
        }
    } catch (e) {}

    const isRage = window.HardModeManager && window.HardModeManager.isEnabled;
    const isAsian = window.AsianModeManager && window.AsianModeManager.isEnabled;
    const isHardMode = isRage || isAsian;

    const isBetterNormalScore = !isHardMode && (finalScore > normalScore);
    const isBetterHardScore = isHardMode && (finalScore > rageScore);
    const isNewPassStatus = isNormalModePassed && (isHardMode ? !ragePassed : !normalPassed);

    // Bỏ qua nếu không vượt kỷ lục ở chế độ tương ứng VÀ không mở khóa/pass bài mới (khớp UserScoreController mới)
    if (!isBetterNormalScore && !isBetterHardScore && !isNewPassStatus) {
        return;
    }

    if (isNormalModePassed) {
        if (isRage || isAsian) {
            ragePassed = true;
        } else {
            normalPassed = true;
        }
    }

    // Chỉ cập nhật kỷ lục điểm số (High Score) nếu KHÔNG BẬT chế độ hỗ trợ
    if (!isHelper) {
        if (isRage || isAsian) {
            if (finalScore > rageScore) rageScore = finalScore;
        } else {
            if (finalScore > normalScore) normalScore = finalScore;
        }
    }

    let payload = {};

    if (isRage || isAsian) {
        payload = {
            beatmap_id: targetBeatmapId,
            score: finalScore,
            hard_mode_score: finalScore,
            is_hard_mode: 1,
            hard_mode: 1,
            is_rage_mode: 1,
            rage_mode: 1,
            mode: 'hard',
            is_hard_mode_passed: ragePassed ? 1 : 0,
            is_rage_mode_passed: ragePassed ? 1 : 0,
            is_normal_mode_passed: normalPassed ? 1 : 0
        };
    } else {
        payload = {
            beatmap_id: targetBeatmapId,
            score: finalScore,
            hard_mode_score: rageScore,
            is_hard_mode: 0,
            hard_mode: 0,
            mode: 'normal',
            is_normal_mode_passed: normalPassed ? 1 : 0,
            is_hard_mode_passed: ragePassed ? 1 : 0
        };
    }

    if (Array.isArray(beatsInput) && beatsInput.length > 0) {
        payload.beat = beatsInput;
        payload.beats = beatsInput;
        payload.round_endless = rounds;
        payload.endless_round = rounds;
    }

    // 4. Gọi API gửi điểm số / trạng thái pass bài lên Server
    try {
        await window.ApiService.postScore(payload);
    } catch (error) {
        const errorMsg = error?.response?.data?.message || error?.message || 'Xác minh điểm số thất bại.';
        console.error("[Score] Đồng bộ điểm thất bại:", errorMsg);
    }
}
window.submitScoreToServer = submitScoreToServer;

// --- ADMIN TOOL (UI ACCOUNT TAB) ---
const btnOpenAdminModal = document.getElementById('btn-open-admin-modal');
if (btnOpenAdminModal) {
    btnOpenAdminModal.addEventListener('click', () => {
        if (adminPanelModal) {
            adminPanelModal.style.display = 'flex';
            if (adminAutoplayToggle) {
                adminAutoplayToggle.checked = typeof isAutoplay !== 'undefined' ? isAutoplay : false;
            }
            if (document.getElementById('admin-natural-autoplay-toggle')) {
                document.getElementById('admin-natural-autoplay-toggle').checked = typeof isNaturalAutoplay !== 'undefined' ? isNaturalAutoplay : false;
            }
            if (adminDevModeToggle && typeof window.getDevMode === 'function') {
                adminDevModeToggle.checked = window.getDevMode();
            }
            if (adminSpeedGainInput) {
                adminSpeedGainInput.value = typeof SPEED_GAIN_PER_ROUND !== 'undefined' ? SPEED_GAIN_PER_ROUND : 0.2;
            }
        }
    });
}

function checkAdminVisibility() {
    const adminContainer = document.getElementById('admin-tools-container');
    if (!adminContainer) return;

    // Ẩn hoàn toàn container cũ đi vì tính năng quản lý đã được chuyển gọn gàng vào Tab Manage bên trong account.js
    adminContainer.style.display = 'none';
}

// Kiểm tra định kỳ để ẩn/hiện nút Admin (Hữu ích khi tài khoản Logout / Login)
checkAdminVisibility();
setInterval(checkAdminVisibility, 1000);

// --- CREDITS & INFO MODAL ---
if (secretCreditBtn) {
    secretCreditBtn.addEventListener('click', () => {
        const isVi = typeof activeLang !== 'undefined' && activeLang === 'vi';
        const creditHtml = `
            <div class="space-y-3 text-sm mt-2">
                <div>
                    <span class="font-black text-cyan-400 font-orbitron text-xl leading-none block drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">CYBER BEAT HOPPER</span>
                    <span class="text-[10px] text-gray-400 bg-cyan-950/40 border border-cyan-500/30 px-2 py-0.5 rounded uppercase mt-2 inline-block font-bold">${isVi ? 'Phiên bản 1.0.3 (Nội bộ)' : 'Version 1.0.3 (Internal)'}</span>
                </div>
                <div class="bg-black/60 border border-cyan-500/20 rounded-lg p-4 text-left space-y-3 text-xs font-orbitron mt-4 shadow-inner">
                    <div class="flex justify-between border-b border-cyan-500/10 pb-2">
                        <span class="text-gray-500">${isVi ? 'Phát triển (Dev by):' : 'Developed by:'}</span>
                        <span class="text-cyan-400 font-bold">MeoTN Gaming</span>
                    </div>
                    <div class="flex justify-between border-b border-cyan-500/10 pb-2">
                        <span class="text-gray-500">${isVi ? 'Cung cấp (Powered by):' : 'Powered by:'}</span>
                        <span class="text-pink-400 font-bold drop-shadow-[0_0_5px_rgba(236,72,153,0.5)]">MeoTN Digital</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-500">${isVi ? 'Nền tảng (Engine):' : 'Engine:'}</span>
                        <span class="text-gray-300 font-bold">MeoTN HOP v3.5</span>
                    </div>
                </div>
                <div class="mt-4 text-center">
                    <p class="text-[10px] text-gray-500 leading-relaxed font-bold">${isVi ? 'Dự án game âm nhạc phi thương mại (Bản nội bộ). Cảm ơn bạn đã trải nghiệm!' : 'Non-commercial music game project (Internal Build). Thanks for playing!'}</p>
                    <p class="text-[10px] text-gray-400 mt-2 font-bold">${isVi ? 'Nếu cần thêm thông tin, vui lòng liên hệ:' : 'For inquiries, please contact:'}</p>
                    <a href="mailto:tranquockhanh.leaf@gmail.com" class="text-[11px] text-cyan-400 hover:text-cyan-300 underline font-orbitron font-bold drop-shadow-[0_0_5px_rgba(34,211,238,0.5)] mt-1 block">tranquockhanh.leaf@gmail.com</a>
                </div>
            </div>
        `;
        if (typeof showCyberModal === 'function') {
            showCyberModal({
                title: isVi ? 'TÍN NHIỆM (CREDITS)' : 'CREDITS',
                message: creditHtml,
                type: 'alert'
            });
        }
    });
}

// --- PRELOAD STATIC RESOURCES ---
if (typeof cacheStaticResources === 'function') {
    cacheStaticResources([
        'https://an4sdmu4yskbqrq6.public.blob.vercel-storage.com/FreeGift_collect.ogg',
        'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
        'https://cdnjs.cloudflare.com/ajax/libs/animejs/3.2.1/anime.min.js',
        'https://cdn.tailwindcss.com',
        'https://cdn.jsdelivr.net/npm/disable-devtool@latest/disable-devtool.min.js',
        'https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@500;600;700&family=Montserrat:wght@400;500;600;700;800;900&display=swap',
        'css/style.css',
        'js/app-main.js',
        'js/playlist.js',
        'js/cacheManager.js',
        'js/i18n.js',
        'js/global.js',
        'js/settings.js',
        'js/audio-manager.js',
        'js/game.js',
        'js/autoplay.js',
        'js/music-player.js',
        'js/song-selector.js',
        'js/fake-blocks.js'
    ]);
}

if (closeAdminBtn && adminPanelModal) {
    closeAdminBtn.addEventListener('click', () => {
        adminPanelModal.style.display = 'none';
    });
}

if (adminAutoplayToggle) {
    adminAutoplayToggle.addEventListener('change', (e) => {
        isAutoplay = e.target.checked;
        if (isAutoplay && typeof isNaturalAutoplay !== 'undefined') {
            isNaturalAutoplay = false;
            const natToggle = document.getElementById('admin-natural-autoplay-toggle');
            if (natToggle) natToggle.checked = false;

            const relaxToggle = document.getElementById('toggle-relax-mode');
            if (relaxToggle) relaxToggle.checked = false;
            if (typeof relaxModeEnabled !== 'undefined') relaxModeEnabled = false;
            localStorage.setItem('relaxModeEnabled', false);

            if (typeof autoplayIndicator !== 'undefined' && autoplayIndicator) {
                autoplayIndicator.classList.add('hidden');
            }

            if (typeof invertControlsEnabled !== 'undefined' && invertControlsEnabled) {
                invertControlsEnabled = false;
                localStorage.setItem('invertControlsEnabled', false);
                const toggleInvertControls = document.getElementById('toggle-invert-controls');
                if (toggleInvertControls) toggleInvertControls.checked = false;
            }
        }
        if (typeof updateMutuallyExclusiveExtensions === 'function') updateMutuallyExclusiveExtensions();
    });

    const naturalContainer = document.createElement('div');
    naturalContainer.style.marginTop = '10px';
    naturalContainer.id = 'admin-natural-autoplay-container';
    naturalContainer.innerHTML = `
        <label class="text-sm text-gray-300 font-bold flex items-center gap-2 cursor-pointer">
            <input type="checkbox" id="admin-natural-autoplay-toggle" class="w-4 h-4 rounded border-gray-600 bg-gray-700 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-gray-900">
            Bot (Natural Autoplay)
        </label>
    `;
    if (adminAutoplayToggle.parentElement) {
        adminAutoplayToggle.parentElement.insertAdjacentElement('afterend', naturalContainer);
    }
    const natToggle = document.getElementById('admin-natural-autoplay-toggle');

    if (natToggle) {
        natToggle.addEventListener('change', (e) => {
            isNaturalAutoplay = e.target.checked;

            // Admin tool bot được thiết kế để tàng hình nên sẽ luôn tắt Relax Mode UI
            if (typeof relaxModeEnabled !== 'undefined') {
                relaxModeEnabled = false;
                localStorage.setItem('relaxModeEnabled', false);
            }
            const relaxToggle = document.getElementById('toggle-relax-mode');
            if (relaxToggle) relaxToggle.checked = false;

            if (typeof autoplayIndicator !== 'undefined' && autoplayIndicator) {
                autoplayIndicator.classList.add('hidden');
            }

            if (isNaturalAutoplay && typeof invertControlsEnabled !== 'undefined' && invertControlsEnabled) {
                invertControlsEnabled = false;
                localStorage.setItem('invertControlsEnabled', false);
                const toggleInvertControls = document.getElementById('toggle-invert-controls');
                if (toggleInvertControls) toggleInvertControls.checked = false;
            }

            if (isNaturalAutoplay) {
                isAutoplay = false;
                if (adminAutoplayToggle) adminAutoplayToggle.checked = false;
            }
            if (typeof updateMutuallyExclusiveExtensions === 'function') updateMutuallyExclusiveExtensions();
        });
    }
}

if (adminDevModeToggle) {
    adminDevModeToggle.addEventListener('change', (e) => {
        if (typeof window.setDevMode === 'function') {
            const isEnabled = e.target.checked;
            window.setDevMode(isEnabled, isEnabled ? 7 : 0);
            if (isEnabled) {
                alert("Đã bật Dev Mode. Trạng thái này sẽ được lưu trong 7 ngày trên thiết bị này.");
            } else {
                alert("Đã tắt Dev Mode. Chế độ Anti-DevTools đã được kích hoạt lại.");
            }
        }
    });
}

if (adminClearScores) {
    adminClearScores.addEventListener('click', () => {
        if (confirm("Xác nhận xóa hệ thống IndexedDB (Xóa toàn bộ điểm kỷ lục)?")) {
            if (window.indexedDB) {
                indexedDB.deleteDatabase("MagicHopDB");
                alert("Đã thiết lập lại. Vui lòng F5 (tải lại trang) để áp dụng.");
            }
        }
    });
}

if (adminSpeedGainInput) {
    adminSpeedGainInput.style.cursor = 'ew-resize';

    let _sgDragging = false;
    let _sgStartX = 0;
    let _sgStartVal = 0.2;
    let _sgMoved = false;

    const _sgApply = (val) => {
        val = Math.round(Math.min(4.0, Math.max(0.1, val)) * 100) / 100;
        SPEED_GAIN_PER_ROUND = val;
        adminSpeedGainInput.value = val;
    };

    adminSpeedGainInput.addEventListener('pointerdown', (e) => {
        _sgDragging = true;
        _sgMoved = false;
        _sgStartX = e.clientX;
        _sgStartVal = parseFloat(adminSpeedGainInput.value) || 0.2;
        adminSpeedGainInput.setPointerCapture(e.pointerId);
        adminSpeedGainInput.style.cursor = 'ew-resize';
        e.preventDefault();
    });

    adminSpeedGainInput.addEventListener('pointermove', (e) => {
        if (!_sgDragging) return;
        const delta = e.clientX - _sgStartX;
        if (Math.abs(delta) > 2) _sgMoved = true;
        if (!_sgMoved) return;
        // Mỗi 5px = 0.1 thay đổi
        const change = Math.round(delta / 5) * 0.1;
        _sgApply(_sgStartVal + change);
    });

    adminSpeedGainInput.addEventListener('pointerup', (e) => {
        if (!_sgDragging) return;
        _sgDragging = false;
        adminSpeedGainInput.style.cursor = 'ew-resize';
        if (_sgMoved) {
            // Đã drag → không trigger focus/edit
            adminSpeedGainInput.blur();
        } else {
            // Click thường → cho phép gõ số
            adminSpeedGainInput.style.cursor = 'text';
            adminSpeedGainInput.select();
        }
    });

    adminSpeedGainInput.addEventListener('input', () => {
        let val = parseFloat(adminSpeedGainInput.value);
        if (isNaN(val)) return;
        val = Math.min(4.0, Math.max(0.1, val));
        SPEED_GAIN_PER_ROUND = val;
    });
    adminSpeedGainInput.addEventListener('blur', () => {
        let val = parseFloat(adminSpeedGainInput.value);
        if (isNaN(val)) val = 0.2;
        val = Math.min(4.0, Math.max(0.1, val));
        SPEED_GAIN_PER_ROUND = val;
        adminSpeedGainInput.value = val;
        adminSpeedGainInput.style.cursor = 'ew-resize';
    });
}


if (adminSpeedGainReset) {
    adminSpeedGainReset.addEventListener('click', () => {
        SPEED_GAIN_PER_ROUND = 0.2;
        if (adminSpeedGainInput) adminSpeedGainInput.value = 0.2;
    });
}

function getCurrentGlowHeight() {
    if (typeof currentGraphicsQuality === 'undefined') return 1.5;
    if (currentGraphicsQuality === 'hd') return 0.75;
    if (currentGraphicsQuality === 'fhd') return 1.5;
    if (currentGraphicsQuality === 'qhd') return 1.75;
    if (currentGraphicsQuality === 'uhd') return 2.0;
    return 1.5; // Default / Fallback
}

function isGlowEnabled() {
    if (typeof currentGraphicsQuality === 'undefined') return true;
    return currentGraphicsQuality !== 'simple';
}

// --- ANTI RIGHT-CLICK SECURE SCRIPT (SILENT) ---
document.addEventListener('contextmenu', (event) => {
    let isDevModeActive = false;
    try {
        if (typeof window.getDevMode === 'function') {
            isDevModeActive = (window.getDevMode() === true);
        }
    } catch (e) {
        // Bỏ qua lỗi nếu có
    }

    // Nếu KHÔNG bật Dev Mode, âm thầm chặn menu context
    if (!isDevModeActive) {
        event.preventDefault();
    }
});

// --- AUTO-SCROLL MARQUEE FOR SONG TITLES ---
window.applyMarquee = function(element) {
    if (!element) return;
    
    // Reset properties and classes first
    element.classList.remove('marquee-active');
    const container = element.parentElement;
    if (container) {
        container.classList.remove('overflowing');
    }
    element.style.transform = '';
    element.style.removeProperty('--scroll-distance');
    element.style.removeProperty('--scroll-duration');
    
    // Slight delay to ensure element dimensions are calculated properly by the browser
    setTimeout(() => {
        const textWidth = element.scrollWidth;
        const containerWidth = container ? container.clientWidth : 0;
        
        if (textWidth > containerWidth && containerWidth > 0) {
            if (container) {
                container.classList.add('overflowing');
            }
            const scrollDistance = textWidth - containerWidth;
            element.style.setProperty('--scroll-distance', `-${scrollDistance}px`);
            
            // Moderate speed: 20px per second. Scroll duration must scale with distance.
            const speed = 20; 
            const duration = Math.max(4, scrollDistance / speed);
            element.style.setProperty('--scroll-duration', `${duration}s`);
            
            element.classList.add('marquee-active');
        }
    }, 100);
};

// --- CHẶN PHÓNG TO / THU NHỎ TRÌNH DUYỆT (ANTI-ZOOM) ---
// 1. Chặn phóng to bằng cử chỉ pinch (2 ngón tay) trên di động đã được xử lý bằng CSS (touch-action: none) trên html và body.

// 2. Chặn phóng to bằng cử chỉ gesture (Safari di động)
document.addEventListener('gesturestart', function (event) {
    event.preventDefault();
}, { passive: false });

// 3. Chặn phóng to khi dùng Ctrl + lăn chuột (Desktop)
document.addEventListener('wheel', function (event) {
    if (event.ctrlKey) {
        event.preventDefault();
    }
}, { passive: false });

// 4. Chặn phím tắt phóng to/thu nhỏ (Ctrl/Cmd + '+' hoặc '-' hoặc '0')
document.addEventListener('keydown', function (event) {
    if ((event.ctrlKey || event.metaKey) && 
        (event.key === '=' || event.key === '-' || event.key === '+' || event.key === '0' || event.keyCode === 187 || event.keyCode === 189 || event.keyCode === 48)) {
        event.preventDefault();
    }
});

// ============================================================
// HỆ THỐNG GIAO DIỆN NỀN & MÀU KHUNG/TEXT THEO ĐỘ KHÓ (MAIN MENU THEME)
// ============================================================
function updateMainMenuTheme() {
    const isAsian = window.AsianModeManager && window.AsianModeManager.isEnabled;
    const isHard  = window.HardModeManager && window.HardModeManager.isEnabled;
    const isEasy  = window.EasyModeManager && window.EasyModeManager.isEnabled;

    let theme = {
        name: 'normal',
        primaryColor: '#22d3ee',        // Neon Cyan
        borderColor: 'rgba(6, 182, 212, 0.45)',
        glowColor: 'rgba(6, 182, 212, 0.3)',
        activeTabBg: 'rgba(6, 182, 212, 0.15)'
    };

    if (isAsian) {
        theme = {
            name: 'asian',
            primaryColor: '#f43f5e',     // Red / Crimson
            borderColor: 'rgba(239, 68, 68, 0.65)',
            glowColor: 'rgba(239, 68, 68, 0.45)',
            activeTabBg: 'rgba(239, 68, 68, 0.15)'
        };
    } else if (isHard) {
        theme = {
            name: 'hard',
            primaryColor: '#fbbf24',     // Amber / Flame Orange
            borderColor: 'rgba(245, 158, 11, 0.55)',
            glowColor: 'rgba(245, 158, 11, 0.35)',
            activeTabBg: 'rgba(245, 158, 11, 0.15)'
        };
    } else if (isEasy) {
        theme = {
            name: 'easy',
            primaryColor: '#34d399',     // Emerald Green
            borderColor: 'rgba(16, 185, 129, 0.55)',
            glowColor: 'rgba(16, 185, 129, 0.35)',
            activeTabBg: 'rgba(16, 185, 129, 0.15)'
        };
    }

    // Dynamic Style Tag Injection to apply theme to ALL UI elements seamlessly
    let styleTag = document.getElementById('dynamic-difficulty-theme-style');
    if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = 'dynamic-difficulty-theme-style';
        document.head.appendChild(styleTag);
    }

    styleTag.textContent = `
        :root {
            --theme-color: ${theme.primaryColor} !important;
            --theme-border: ${theme.borderColor} !important;
            --theme-glow: ${theme.glowColor} !important;
            --theme-bg-alpha: ${theme.activeTabBg} !important;
        }

        /* 1. Main Menu Window & Cyber Modal */
        #start-screen-window, 
        #dynamic-cyber-modal #cyber-modal-window {
            border: 1.5px solid ${theme.borderColor} !important;
            box-shadow: 0 0 35px ${theme.glowColor}, inset 0 0 15px ${theme.glowColor} !important;
            transition: border-color 0.5s ease-in-out, box-shadow 0.5s ease-in-out !important;
        }

        /* 2. Panel Titles & Modal Titles */
        #panel-home h2, 
        #panel-personalize h2, 
        #panel-music h2, 
        #panel-account h2, 
        #panel-settings h2,
        #cyber-modal-title {
            color: ${theme.primaryColor} !important;
            text-shadow: 0 0 12px ${theme.glowColor} !important;
            transition: color 0.5s ease-in-out, text-shadow 0.5s ease-in-out !important;
        }

        /* 3. Navigation Header Tabs */
        .main-nav-tabs-container .nav-btn.active {
            color: ${theme.primaryColor} !important;
            border-bottom: 2px solid ${theme.primaryColor} !important;
            text-shadow: 0 0 8px ${theme.glowColor} !important;
        }

        /* 4. Song Selector Cards & Active Highlights */
        .song-option.active {
            border-color: ${theme.primaryColor} !important;
            background-color: #0c081e !important;
            box-shadow: 0 0 15px ${theme.glowColor} !important;
            position: relative !important;
            top: auto !important;
        }
        .song-option.active .text-cyan-400,
        .song-option:hover .text-cyan-400,
        .song-option.active h3,
        .song-option:hover h3 {
            color: ${theme.primaryColor} !important;
        }

        /* 5. Preview & Play Buttons */
        .preview-btn {
            color: ${theme.primaryColor} !important;
            border-color: ${theme.borderColor} !important;
        }
        .preview-btn.playing {
            background-color: ${theme.primaryColor} !important;
            color: #000000 !important;
            box-shadow: 0 0 10px ${theme.glowColor} !important;
        }

        /* 6. Cyber Modal Actions & Main Buttons */
        #cyber-modal-actions button:last-child {
            background-color: ${theme.primaryColor} !important;
            box-shadow: 0 0 15px ${theme.glowColor} !important;
            color: #000000 !important;
        }

        /* 7. Mobile Header & Toggle */
        #nav-menu-wrapper > div {
            color: ${theme.primaryColor} !important;
        }
        #nav-menu-toggle {
            border-color: ${theme.borderColor} !important;
            color: ${theme.primaryColor} !important;
        }

        /* 8. Inputs & Filter Titles */
        #song-search {
            border-color: ${theme.borderColor} !important;
        }
        #song-search:focus {
            border-color: ${theme.primaryColor} !important;
            box-shadow: 0 0 10px ${theme.glowColor} !important;
        }
        [data-i18n="filter_title"] {
            color: ${theme.primaryColor} !important;
        }
    `;

    // 8. Cập nhật nền Background động tương ứng cho từng chế độ
    if (window.EasyModeManager && typeof window.EasyModeManager.updateMenuBackground === 'function') {
        window.EasyModeManager.updateMenuBackground();
    }
    if (window.HardModeManager && typeof window.HardModeManager.updateMenuBackground === 'function') {
        window.HardModeManager.updateMenuBackground();
    }
    if (window.AsianModeManager && typeof window.AsianModeManager.updateMenuBackground === 'function') {
        window.AsianModeManager.updateMenuBackground();
    }
}
window.updateMainMenuTheme = updateMainMenuTheme;

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(updateMainMenuTheme, 100);
});