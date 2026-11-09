// ============================================================
//  global.js — Cấu hình, DOM, Settings UI & Khởi chạy
//  Chứa: DOM refs, biến trạng thái toàn cục, applySettings,
//         changeSong, event listeners UI, bootstrap hệ thống.
//  Phụ thuộc: game.js (phải load sau global.js)
// --- UTILS ---
// --- DOM REFERENCES ---
const container = document.getElementById('canvas-container');
const scoreEl = document.getElementById('score');
const comboEl = document.getElementById('combo-ui');
const comboUiWrapper = document.getElementById('combo-ui-wrapper');
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
const toggleDiscreteGpu = document.getElementById('toggle-discrete-gpu');
const detectedGpuNameEl = document.getElementById('detected-gpu-name');
const dedicatedGpuNoteEl = document.getElementById('dedicated-gpu-note');
const togglePerfMode = document.getElementById('toggle-perf-mode');
const toggleShockwaves = document.getElementById('toggle-shockwaves');
const toggleRelativePC = document.getElementById('toggle-relative-pc');
const togglePointerLock = document.getElementById('toggle-pointer-lock');
const toggleRawInput = document.getElementById('toggle-raw-input');
const toggleAntialiasing = document.getElementById('toggle-antialiasing');
const toggleDynamicColors = document.getElementById('toggle-dynamic-colors');
const toggleVisualizer = document.getElementById('toggle-visualizer');
const bgVisualizerCanvas = document.getElementById('bg-visualizer');
const toggleBgParticles = document.getElementById('toggle-bg-particles');
const toggleTileBounce = document.getElementById('toggle-tile-bounce');
const toggleDynamicBounceSpeed = document.getElementById('toggle-dynamic-bounce-speed');
const toggleBlockShatter = document.getElementById('toggle-block-shatter');
const toggleUiAnimations = document.getElementById('toggle-ui-animations');
const spawnAnimationSelect = document.getElementById('spawn-animation-mode');
const toggleBallGlow = document.getElementById('toggle-ball-glow');
const toggleBallTrail = document.getElementById('toggle-ball-trail');
const toggleShowBoundaries = document.getElementById('toggle-show-boundaries');
const toggleAdvancedBoundaries = document.getElementById('toggle-advanced-boundaries');
const sensitivitySlider = document.getElementById('sensitivity-slider');
const tileDetailSlider = document.getElementById('tile-detail-slider');
const tileDetailValue = document.getElementById('tile-detail-value');
const sensitivityValueSpan = document.getElementById('sensitivity-value');
const blocksAheadSlider = document.getElementById('blocks-ahead-slider');
const blocksAheadValue = document.getElementById('blocks-ahead-value');
const fpsSyncModeSelect = document.getElementById('fps-sync-mode-select');
const maxFpsSliderContainer = document.getElementById('max-fps-slider-container');
const detectedHzBadge = document.getElementById('detected-hz-badge');
const maxFpsSliderBound = document.getElementById('max-fps-slider-bound');
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

// Cờ và hàm kiểm tra trạng thái màn hình Intro toàn cục
window.introCompleted = false;
window.isIntroActive = function () {
    if (window.introCompleted === true) return false;
    const overlay = document.getElementById('intro-overlay') || introOverlay;
    if (!overlay) return false;
    if (overlay.classList.contains('hidden') || overlay.style.display === 'none') {
        return false;
    }
    return true;
};
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
const FULLSCREEN_ENTER_METHODS = ['requestFullscreen', 'webkitRequestFullscreen', 'mozRequestFullScreen', 'msRequestFullscreen'];
const FULLSCREEN_EXIT_METHODS = ['exitFullscreen', 'webkitExitFullscreen', 'mozCancelFullScreen', 'msExitFullscreen'];

window.enteredByAutoFullscreen = false;

function isCurrentlyFullscreen() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement ||
              document.mozFullScreenElement || document.msFullscreenElement);
}
window.isCurrentlyFullscreen = isCurrentlyFullscreen;

function triggerEnterFullscreen() {
    const docElm = document.documentElement;
    const method = FULLSCREEN_ENTER_METHODS.find(m => docElm[m]);
    if (!method) return;

    const result = docElm[method]();
    // Chỉ API chuẩn trả về Promise
    if (result && typeof result.then === 'function') {
        result.then(() => {
            if (navigator.keyboard && typeof navigator.keyboard.lock === 'function') {
                navigator.keyboard.lock(['Escape']).catch(err => console.warn('[Fullscreen] Lock Escape failed:', err));
            }
            updateFullscreenUI();
        }).catch(err => console.warn('[Fullscreen] Lỗi:', err));
    }
}

function triggerExitFullscreen() {
    if (navigator.keyboard && typeof navigator.keyboard.unlock === 'function') {
        navigator.keyboard.unlock();
    }
    const isFullscreen = isCurrentlyFullscreen();
    if (!isFullscreen) return;

    const method = FULLSCREEN_EXIT_METHODS.find(m => document[m]);
    if (!method) return;

    const result = document[method]();
    if (result && typeof result.then === 'function') {
        result.then(() => {
            updateFullscreenUI();
        }).catch(err => console.warn('[Fullscreen] Lỗi:', err));
    } else if (result && typeof result.catch === 'function') {
        result.catch(err => console.warn('[Fullscreen] Lỗi:', err));
    }
}

function toggleFullscreen() {
    if (isCurrentlyFullscreen()) {
        window.enteredByAutoFullscreen = false;
        triggerExitFullscreen();
    } else {
        window.enteredByAutoFullscreen = false;
        triggerEnterFullscreen();
    }
}
window.toggleFullscreen = toggleFullscreen;

function checkIsAndroidAPK() {
    try {
        if (window.isAndroidAPK || (document.documentElement && document.documentElement.classList.contains('android-apk-mode'))) {
            return true;
        }
        if (typeof window.AndroidNativeApp !== 'undefined') {
            return true;
        }
        if (typeof window.Capacitor !== 'undefined') {
            if (typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform()) {
                return true;
            }
            if (typeof window.Capacitor.getPlatform === 'function' && window.Capacitor.getPlatform() === 'android') {
                return true;
            }
        }
        if (window.location.protocol === 'capacitor:') {
            return true;
        }
        if (window.location.origin === 'https://localhost' && /Android/i.test(navigator.userAgent)) {
            return true;
        }
    } catch (e) {}
    return false;
}
window.checkIsAndroidAPK = checkIsAndroidAPK;

function updateFullscreenUI() {
    if (checkIsAndroidAPK()) {
        document.documentElement.classList.add('android-apk-mode');
        document.querySelectorAll('.header-fullscreen-toggle').forEach(btn => {
            btn.style.setProperty('display', 'none', 'important');
        });
        const autoFsOption = document.getElementById('label-auto-fullscreen');
        if (autoFsOption) {
            autoFsOption.style.setProperty('display', 'none', 'important');
        }
        return;
    }

    const isFs = isCurrentlyFullscreen();

    // 1. Cập nhật các nút Fullscreen trên Header (Desktop & Mobile)
    const fsBtns = document.querySelectorAll('.header-fullscreen-toggle');
    fsBtns.forEach(btn => {
        const enterIcon = btn.querySelector('.fullscreen-icon-enter');
        const exitIcon = btn.querySelector('.fullscreen-icon-exit');
        const textSpan = btn.querySelector('.fullscreen-btn-text');

        if (isFs) {
            btn.classList.add('active-fullscreen', 'border-pink-500/50', 'text-pink-400', 'bg-pink-950/30', 'shadow-[0_0_12px_rgba(236,72,153,0.3)]');
            btn.classList.remove('border-cyan-500/40', 'text-cyan-400', 'bg-black/40', 'shadow-[0_0_10px_rgba(6,182,212,0.15)]');
            if (enterIcon) enterIcon.classList.add('hidden');
            if (exitIcon) exitIcon.classList.remove('hidden');
            if (textSpan) textSpan.textContent = typeof t === 'function' ? t('btn_exit_fullscreen') : 'EXIT FS';
            btn.title = typeof t === 'function' ? t('title_exit_fullscreen') : 'Thoát toàn màn hình (ESC / F11)';
        } else {
            btn.classList.remove('active-fullscreen', 'border-pink-500/50', 'text-pink-400', 'bg-pink-950/30', 'shadow-[0_0_12px_rgba(236,72,153,0.3)]');
            btn.classList.add('border-cyan-500/40', 'text-cyan-400', 'bg-black/40', 'shadow-[0_0_10px_rgba(6,182,212,0.15)]');
            if (enterIcon) enterIcon.classList.remove('hidden');
            if (exitIcon) exitIcon.classList.add('hidden');
            if (textSpan) textSpan.textContent = typeof t === 'function' ? t('btn_fullscreen') : 'FULLSCREEN';
            btn.title = typeof t === 'function' ? t('title_fullscreen') : 'Toàn màn hình (F11)';
        }
    });

    // 2. Làm mờ và vô hiệu hóa / bypass tùy chọn "Tự động toàn màn hình" trong Settings khi đang ở toàn màn hình sẵn
    const toggleAutoFs = document.getElementById('toggle-auto-fullscreen');
    const labelAutoFs = document.getElementById('label-auto-fullscreen');
    const bypassBadge = document.getElementById('auto-fullscreen-bypass-badge');

    if (toggleAutoFs) {
        if (isFs) {
            toggleAutoFs.disabled = true;
            if (labelAutoFs) {
                labelAutoFs.classList.add('opacity-40', 'pointer-events-none');
                labelAutoFs.title = typeof t === 'function' ? t('auto_fullscreen_bypassed_tip') : 'Đang ở chế độ toàn màn hình: Tùy chọn này tạm thời được bỏ qua (bypass).';
            }
            if (bypassBadge) bypassBadge.classList.remove('hidden');
        } else {
            toggleAutoFs.disabled = false;
            toggleAutoFs.checked = (typeof autoFullscreenEnabled !== 'undefined' && autoFullscreenEnabled);
            if (labelAutoFs) {
                labelAutoFs.classList.remove('opacity-40', 'pointer-events-none');
                labelAutoFs.removeAttribute('title');
            }
            if (bypassBadge) bypassBadge.classList.add('hidden');
        }
    }
}
window.updateFullscreenUI = updateFullscreenUI;

// Lắng nghe thay đổi toàn màn hình từ hệ thống / trình duyệt
['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'].forEach(evt => {
    document.addEventListener(evt, () => {
        if (!isCurrentlyFullscreen()) {
            window.enteredByAutoFullscreen = false;
        }
        updateFullscreenUI();
    });
});

function initFullscreenButtons() {
    if (checkIsAndroidAPK()) {
        document.documentElement.classList.add('android-apk-mode');
        document.querySelectorAll('.header-fullscreen-toggle').forEach(btn => {
            btn.style.setProperty('display', 'none', 'important');
        });
        const autoFsOption = document.getElementById('label-auto-fullscreen');
        if (autoFsOption) {
            autoFsOption.style.setProperty('display', 'none', 'important');
        }
        return;
    }
    document.querySelectorAll('.header-fullscreen-toggle').forEach(btn => {
        if (!btn._fsBound) {
            btn._fsBound = true;
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleFullscreen();
            });
        }
    });
    updateFullscreenUI();
}
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFullscreenButtons);
} else {
    initFullscreenButtons();
}

// --- MENU AUDIO HELPERS (dùng chung cho nhiều nhánh trong changeSong) ---
function getMenuTargetVolume() {
    if (typeof isMenuMuted !== 'undefined' && isMenuMuted) return 0;
    return typeof menuVolume !== 'undefined' ? menuVolume : 0.5;
}

// Mở lại filter + gain của nhạc menu (ramp 0.1s). Yêu cầu menuFilterNode/menuGainNode tồn tại.
function rampMenuAudioOpen(now) {
    menuFilterNode.frequency.cancelScheduledValues(now);
    menuGainNode.gain.cancelScheduledValues(now);
    menuFilterNode.frequency.setValueAtTime(menuFilterNode.frequency.value, now);
    menuGainNode.gain.setValueAtTime(menuGainNode.gain.value, now);
    menuFilterNode.frequency.linearRampToValueAtTime(22050, now + 0.1);
    menuGainNode.gain.linearRampToValueAtTime(getMenuTargetVolume(), now + 0.1);
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
let selectedBallColor = localStorage.getItem('selectedBallColor') || 'dynamic';
let selectedBallPattern = localStorage.getItem('selectedBallPattern') || 'solid';
let selectedEnvironment = localStorage.getItem('selectedEnvironment') || 'void';

// --- BOUNDARY PULSE CUSTOMIZATION STATE ---
let selectedPulseStyle = localStorage.getItem('selectedPulseStyle') || 'wave';
let activePulseStyle = selectedPulseStyle === 'random' ? 'wave' : selectedPulseStyle;
window.selectedPulseStyle = selectedPulseStyle;
window.activePulseStyle = activePulseStyle;

const PULSE_STYLES_POOL = ['off', 'classic', 'normal', 'wave', 'horizontal'];

function initPulseStyleForBeatmap() {
    if (selectedPulseStyle === 'random') {
        const randomIndex = Math.floor(Math.random() * PULSE_STYLES_POOL.length);
        activePulseStyle = PULSE_STYLES_POOL[randomIndex];
    } else {
        activePulseStyle = selectedPulseStyle;
    }
    window.activePulseStyle = activePulseStyle;
    if (typeof showBoundariesEnabled !== 'undefined') {
        showBoundariesEnabled = (activePulseStyle !== 'off');
    }
    if (typeof advancedBoundariesEnabled !== 'undefined') {
        advancedBoundariesEnabled = (activePulseStyle !== 'off' && activePulseStyle !== 'classic');
    }
    if (typeof updateBoundariesVisibility === 'function') {
        updateBoundariesVisibility();
    }
}
window.initPulseStyleForBeatmap = initPulseStyleForBeatmap;
let bgMesh = null;
let blueprintGrid = null;
let cityInstancedMesh = null;
let riceFieldInstancedMesh = null;
let riceGroundPlane = null;
let bgTexture = null;
let bgMaterial = null;
const targetBgColor = new THREE.Color(0x00ffff);
const currentBgColor = new THREE.Color(0x00ffff);

// --- OBJECT POOLING ---
const tilePool = [];
const shockwavePool = [];
const diamondShockwavePool = [];
const perfectRingPool = [];
let cachedTileGeo = null;
let cachedCenterGeo = null;
let cachedBorderGeo = null;

let cachedTrailGeo = null;
let cachedShockwaveGeo = null;
let cachedDiamondShockwaveGeo = null;
let cachedPerfectRingGeo = null;
let cachedGlowGeo = null;
let currentGlowHeight = 1.0;
const trailPool = [];

// WebGPU tạm dừng phát triển, cố định sử dụng WebGL 2 hiệu năng cao
window.isWebGPUCache = false;

// Tối ưu: Dùng lại đối tượng để tránh Garbage Collector
const tempColor = new THREE.Color();
const tempVec3 = new THREE.Vector3();
let lastDisplayedSpeedText = "";
let lastDisplayedSpeedValue = -1;
let lastDisplayedModeText = "";
let lastDisplayedProgress = -1;
let lastDisplayedRound = -1;
let lastDisplayedScore = -1;
let lastDisplayedPerfectHUD = -1;

// --- PLAYLIST & BEATMAP ---
let selectedSongIndex = parseInt(localStorage.getItem('selectedSongIndex')) || 0;
let activePlaylist = [{ name: 'Loading...', url: '', beats: [0, 1, 2, 3] }];

let beatmapBeats = activePlaylist[0].beats;
let BEATMAP_TOTAL_TIME = 10;
let SPEED_GAIN_PER_ROUND = 0.21;
window.SPEED_GAIN_PER_ROUND = SPEED_GAIN_PER_ROUND;

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
let pointerLockControlEnabled = localStorage.getItem('pointerLockControlEnabled') === 'true';
let pointerLockExitExpected = false;
let currentBeatHits = [];
window.currentBeatHits = currentBeatHits;

if (togglePointerLock) {
    togglePointerLock.checked = pointerLockControlEnabled;
    togglePointerLock.addEventListener('change', () => {
        pointerLockControlEnabled = togglePointerLock.checked;
        localStorage.setItem('pointerLockControlEnabled', pointerLockControlEnabled ? 'true' : 'false');
        if (!pointerLockControlEnabled && typeof releaseGameplayPointerLock === 'function') {
            releaseGameplayPointerLock();
        }
    });
}

// --- THÔNG SỐ VẬT LÝ ---
let baseBallVelocityZ = -18; //Vận tốc lướt của block
let ballVelocityZ = baseBallVelocityZ;

let jumpElapsedTime = 0;
let flightTime = 0;
let jumpStartRawZ = 0;
let jumpStartRawY = 0.95;
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
        if (typeof anime.remove === 'function') {
            anime.remove([gameoverScreen, gameoverScreenWindow]);
        }
        anime({
            targets: gameoverScreen,
            opacity: 0,
            duration: 250,
            easing: 'easeInOutQuad',
            complete: () => {
                gameoverScreen.style.display = 'none';
                if (gameoverScreenWindow) gameoverScreenWindow.style.transform = '';
            }
        });
        if (gameoverScreenWindow) {
            gameoverScreenWindow.style.transform = '';
        }
    } else {
        gameoverScreen.style.opacity = 0;
        gameoverScreen.style.display = 'none';
        if (gameoverScreenWindow) gameoverScreenWindow.style.transform = '';
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
let loadingSkipCheckTimeout = null;
let currentChangeSongRequest = 0;
let tipInterval = null;
let onlineCheckAbortController = null;

// Cập nhật tiến trình tải nhạc & beatmap trên giao diện
function updateMusicLoadingProgress(percent) {
    const progressBar = document.getElementById('music-progress-bar');
    const percentText = document.getElementById('music-load-percent');
    if (progressBar) progressBar.style.width = `${percent}%`;
    if (percentText) percentText.innerText = `${percent}%`;
}

async function changeSong(index, autoStart = false) {
    const requestId = ++currentChangeSongRequest;
    let loadingSkipCheckBtn = document.getElementById('loading-skip-check-btn');
    let loadingCancelBtn = document.getElementById('loading-cancel-btn');
    let isOnlineCheckPending = false;

    // --- HIỆN LOADING NGAY LẬP TỨC KHI NHẤN PLAY ---
    if (autoStart) {
        if (typeof autoFullscreenEnabled !== 'undefined' && autoFullscreenEnabled) {
            if (!isCurrentlyFullscreen()) {
                window.enteredByAutoFullscreen = true;
                triggerEnterFullscreen();
            } else {
                // Bỏ qua (bypass) auto-fullscreen vì đã ở chế độ toàn màn hình sẵn
                window.enteredByAutoFullscreen = false;
            }
        } else {
            window.enteredByAutoFullscreen = false;
        }
        isSongLoadingCancelled = false;
        window.skipOnlineCheckRequested = false;
        if (onlineCheckAbortController) {
            try { onlineCheckAbortController.abort(); } catch (e) {}
        }
        onlineCheckAbortController = new AbortController();
        window.currentOnlineCheckController = onlineCheckAbortController;
        isOnlineCheckPending = true;

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

        // --- QUẢN LÝ NÚT CANCEL VÀ NÚT SKIP ONLINE CHECK (2 NÚT NẰM NGANG CÙNG 1 HÀNG) ---
        let loadingActionsContainer = document.getElementById('loading-actions-container');
        if (!loadingActionsContainer && loadingOverlay) {
            loadingActionsContainer = document.createElement('div');
            loadingActionsContainer.id = 'loading-actions-container';
            loadingActionsContainer.className = "flex flex-row items-center justify-center gap-3 mt-6 w-full flex-wrap";
            loadingOverlay.appendChild(loadingActionsContainer);
        } else if (loadingActionsContainer) {
            loadingActionsContainer.className = "flex flex-row items-center justify-center gap-3 mt-6 w-full flex-wrap";
        }

        loadingSkipCheckBtn = document.getElementById('loading-skip-check-btn');
        if (!loadingSkipCheckBtn && loadingActionsContainer) {
            loadingSkipCheckBtn = document.createElement('button');
            loadingSkipCheckBtn.id = 'loading-skip-check-btn';
            loadingSkipCheckBtn.className = "px-5 py-2 bg-gradient-to-r from-amber-600/90 to-yellow-600/90 hover:from-amber-500 hover:to-yellow-500 active:scale-95 text-white font-bold text-xs md:text-sm rounded uppercase border border-amber-400/80 font-orbitron transition-all shadow-[0_0_15px_rgba(245,158,11,0.5)] cursor-pointer flex items-center justify-center gap-1.5 animate-pulse select-none";
            loadingSkipCheckBtn.style.display = 'none';
            loadingSkipCheckBtn.innerHTML = `
                <svg class="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24"><path d="M7 2v11h3v9l7-12h-4l3-8z"/></svg>
                <span id="loading-skip-check-text">${typeof t === 'function' ? t('btn_skip_online_check') : 'BỎ QUA (DÙNG CACHE)'}</span>
            `;
            loadingActionsContainer.appendChild(loadingSkipCheckBtn);
        }

        if (loadingSkipCheckBtn && !loadingSkipCheckBtn._hasClickListener) {
            loadingSkipCheckBtn._hasClickListener = true;
            loadingSkipCheckBtn.addEventListener('click', async () => {
                console.log('[changeSong] Người dùng bấm Skip online check -> Đang lấy dữ liệu từ cache...');
                window.skipOnlineCheckRequested = true;
                const song = (activePlaylist && activePlaylist[index]) || (typeof playlist !== 'undefined' && playlist[index]);
                if (!song) return;

                // Kiểm tra cache (RAM, getCachedBeatmap, OPFS, IndexedDB)
                let cachedData = (song.beats && song.beats.length > 4) ? song : null;
                if (!cachedData && typeof getCachedBeatmap === 'function') {
                    try { cachedData = await getCachedBeatmap(song); } catch (e) {}
                }
                if (!cachedData && typeof getSongBeatmapKey === 'function' && typeof getCachedJson === 'function') {
                    try {
                        const bmKey = getSongBeatmapKey(song);
                        if (bmKey) cachedData = await getCachedJson(bmKey);
                    } catch (e) {}
                }

                let validBeats = null;
                if (cachedData) {
                    if (Array.isArray(cachedData) && cachedData.length > 4) {
                        validBeats = cachedData;
                    } else if (cachedData.beats && Array.isArray(cachedData.beats) && cachedData.beats.length > 4) {
                        validBeats = cachedData.beats;
                    }
                }

                // Nếu hoàn toàn không có dữ liệu cache cho bài hát này
                if (!validBeats) {
                    const currentLang = typeof activeLang !== 'undefined' ? activeLang : 'vi';
                    const rawNoCache = typeof t === 'function' ? t('msg_no_cache_available') : '';
                    const noCacheMsg = (rawNoCache && rawNoCache !== 'msg_no_cache_available')
                        ? rawNoCache
                        : (currentLang === 'vi' 
                            ? 'Không tìm thấy dữ liệu đã lưu (Cache) cho bài hát này. Vui lòng đợi kết nối máy chủ hoàn tất!' 
                            : 'No cached data found for this song. Please wait for server connection!');
                    if (typeof showCyberModal === 'function') {
                        showCyberModal({
                            title: typeof t === 'function' ? t('offline_title') : 'OFFLINE',
                            message: noCacheMsg,
                            type: 'alert'
                        });
                    }
                    return;
                }

                // Đã tìm thấy bản cache -> Nạp vào bài hát ngay
                song.beats = (typeof normalizeBeats === 'function') ? normalizeBeats(validBeats) : validBeats;
                if (cachedData.bpm && !song.bpm) song.bpm = cachedData.bpm;
                if (cachedData.speed && !song.speed) song.speed = cachedData.speed;
                if (cachedData.no_fake_block !== undefined) song.no_fake_block = cachedData.no_fake_block;
                if (cachedData.url && !song.url) song.url = cachedData.url;
                song.loaded = true;

                loadingSkipCheckBtn.style.display = 'none';
                if (typeof updateConnectionStatusIndicator === 'function') {
                    updateConnectionStatusIndicator('cache');
                }
                if (typeof updateLoadingStatus === 'function') {
                    updateLoadingStatus('msg_entering_map');
                }

                // Hủy request axios đang chờ ngầm
                if (onlineCheckAbortController) {
                    try { onlineCheckAbortController.abort(); } catch (e) {}
                }
                // Giải phóng Promise.race
                if (typeof window.resolveOnlineCheckSkip === 'function') {
                    window.resolveOnlineCheckSkip(false);
                }
            });
        }

        loadingCancelBtn = document.getElementById('loading-cancel-btn');
        if (!loadingCancelBtn && loadingActionsContainer) {
            loadingCancelBtn = document.createElement('button');
            loadingCancelBtn.id = 'loading-cancel-btn';
            loadingCancelBtn.className = "px-5 py-2 bg-red-900/80 hover:bg-red-800 active:scale-95 text-white font-bold text-xs md:text-sm rounded uppercase border border-red-500/50 font-orbitron transition-all shadow-[0_0_10px_rgba(220,38,38,0.3)] select-none cursor-pointer flex items-center justify-center";
            loadingCancelBtn.style.display = 'none';
        }

        // Đảm bảo thứ tự 2 nút nằm ngang cùng 1 hàng: CANCEL trước, BỎ QUA (DÙNG CACHE) sau
        if (loadingActionsContainer) {
            if (loadingCancelBtn) loadingActionsContainer.appendChild(loadingCancelBtn);
            if (loadingSkipCheckBtn) loadingActionsContainer.appendChild(loadingSkipCheckBtn);
        }

        if (loadingCancelBtn && !loadingCancelBtn._hasClickListener) {
            loadingCancelBtn._hasClickListener = true;
            loadingCancelBtn.addEventListener('click', () => {
                isSongLoadingCancelled = true;
                loadingOverlay.style.display = 'none';
                if (typeof autoFullscreenEnabled !== 'undefined' && autoFullscreenEnabled && window.enteredByAutoFullscreen) {
                    triggerExitFullscreen();
                    window.enteredByAutoFullscreen = false;
                }
                if (loadingCancelTimeout) clearTimeout(loadingCancelTimeout);
                if (loadingSkipCheckTimeout) clearTimeout(loadingSkipCheckTimeout);
                if (loadingCancelBtn) loadingCancelBtn.style.display = 'none';
                if (loadingSkipCheckBtn) loadingSkipCheckBtn.style.display = 'none';
                if (onlineCheckAbortController) {
                    try { onlineCheckAbortController.abort(); } catch (e) {}
                }
                if (typeof window.resolveOnlineCheckSkip === 'function') {
                    window.resolveOnlineCheckSkip(false);
                }
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
                        rampMenuAudioOpen(now);
                    } else if (!audioCtx && menuAudio) {
                        menuAudio.volume = getMenuTargetVolume();
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

        // Khởi tạo trạng thái nút Hủy & Nút Skip Online Check (cả 2 nút nằm ngang cùng 1 hàng, hiện sau 3 giây)
        if (loadingCancelBtn) {
            loadingCancelBtn.style.display = 'none';
            loadingCancelBtn.innerText = typeof t === 'function' ? t('btn_cancel') : 'CANCEL';
        }
        if (loadingSkipCheckBtn) {
            loadingSkipCheckBtn.style.display = 'none';
            const skipTextEl = document.getElementById('loading-skip-check-text');
            if (skipTextEl && typeof t === 'function') {
                skipTextEl.innerText = t('btn_skip_online_check');
            }
        }

        if (loadingCancelTimeout) clearTimeout(loadingCancelTimeout);
        loadingCancelTimeout = setTimeout(() => {
            if (loadingOverlay.style.display !== 'none' && !isSongLoadingCancelled && requestId === currentChangeSongRequest) {
                // Hiện cả 2 nút Hủy và Bỏ qua kiểm tra online (dùng cache) cùng lúc trên cùng 1 hàng sau 3 giây chờ
                if (loadingCancelBtn) {
                    loadingCancelBtn.style.display = 'flex';
                }
                if (loadingSkipCheckBtn) {
                    loadingSkipCheckBtn.style.display = 'flex';
                }
            }
        }, 3000); // 2 nút hiện cùng 1 hàng sau 3 giây chờ

        updateMusicLoadingProgress(0);
        
        // Kiểm tra update ngầm trong lúc đang hiện Loading Overlay
        if (typeof window.checkSongUpdateWithBackend === 'function') {
            if (typeof updateLoadingStatus === 'function') {
                // Hiển thị trạng thái đang kiểm tra
                const rawChecking = typeof t === 'function' ? t('msg_checking_map') : 'Checking map data...';
                const currentLang = typeof activeLang !== 'undefined' ? activeLang : 'en';
                const checkingText = rawChecking === 'msg_checking_map' ? (currentLang === 'vi' ? 'Đang kiểm tra dữ liệu...' : 'Checking map data...') : rawChecking;
                const musicStatus = document.getElementById('loading-music-status');
                if (musicStatus) musicStatus.innerText = checkingText;
            }
            
            const checkPromise = window.checkSongUpdateWithBackend(index, { signal: onlineCheckAbortController?.signal });
            const skipPromise = new Promise(resolve => {
                window.resolveOnlineCheckSkip = resolve;
            });

            let changed = false;
            try {
                changed = await Promise.race([checkPromise, skipPromise]);
            } catch (err) {
                console.warn('[changeSong] Lỗi hoặc hủy kiểm tra online:', err);
            } finally {
                isOnlineCheckPending = false;
                if (loadingSkipCheckTimeout) {
                    clearTimeout(loadingSkipCheckTimeout);
                    loadingSkipCheckTimeout = null;
                }
            }
            
            if (changed && typeof updateLoadingStatus === 'function') {
                const rawUpdating = typeof t === 'function' ? t('msg_updating_map') : 'Updating map...';
                const currentLang = typeof activeLang !== 'undefined' ? activeLang : 'en';
                const updatingText = rawUpdating === 'msg_updating_map' ? (currentLang === 'vi' ? 'Đang tải bản đồ mới...' : 'Updating map...') : rawUpdating;
                const musicStatus = document.getElementById('loading-music-status');
                if (musicStatus) musicStatus.innerText = updatingText;
                
                // Nghỉ 500ms để user kịp đọc thông báo update (tạo cảm giác mượt mà)
                await new Promise(r => setTimeout(r, 500));
            }
        }

        if (typeof updateLoadingStatus === 'function') {
            updateLoadingStatus('msg_map_downloading');
        }
    }

    if (typeof ensureSongLoaded === 'function') {
        await ensureSongLoaded(index, true, { signal: onlineCheckAbortController?.signal });
    }

    // Nếu quá trình nạp map bị lỗi (Timeout/Network) hoặc bị hủy
    if (isSongLoadingCancelled || requestId !== currentChangeSongRequest) {
        if (tipInterval) clearInterval(tipInterval);
        if (loadingCancelTimeout) clearTimeout(loadingCancelTimeout);
        if (loadingSkipCheckTimeout) clearTimeout(loadingSkipCheckTimeout);
        const cancelBtn = document.getElementById('loading-cancel-btn');
        if (cancelBtn) cancelBtn.style.display = 'none';
        const skipBtn = document.getElementById('loading-skip-check-btn');
        if (skipBtn) skipBtn.style.display = 'none';
        if (typeof autoFullscreenEnabled !== 'undefined' && autoFullscreenEnabled && window.enteredByAutoFullscreen) {
            triggerExitFullscreen();
            window.enteredByAutoFullscreen = false;
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
                if (typeof autoFullscreenEnabled !== 'undefined' && autoFullscreenEnabled && window.enteredByAutoFullscreen) {
                    triggerExitFullscreen();
                    window.enteredByAutoFullscreen = false;
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
    if (typeof window.updateFeaturedDisc === 'function') window.updateFeaturedDisc(index);
    if (activePlaylist && activePlaylist[index]) {
        const curSong = activePlaylist[index];
        if (curSong.id) localStorage.setItem('selectedSongId', curSong.id);
        if (curSong.url) localStorage.setItem('selectedSongUrl', curSong.url);
        try {
            const rawBmUrl = curSong.beatmapUrl || curSong.lazyUrl;
            const validBmUrl = (typeof rawBmUrl === 'string' && (rawBmUrl.includes('.json') || rawBmUrl.startsWith('beatmap/')) && !rawBmUrl.endsWith('.mp3')) ? rawBmUrl : null;
            const cleanSong = {
                id: curSong.id,
                name: curSong.name || curSong.title,
                title: curSong.title || curSong.name,
                artist: curSong.artist,
                genre: curSong.genre,
                url: curSong.url || curSong.file_url || '',
                beats: curSong.beats,
                beatmapUrl: validBmUrl,
                lazyUrl: validBmUrl,
                speed: curSong.speed,
                bpm: curSong.bpm,
                copyright_status: curSong.copyright_status,
                no_fake_block: curSong.no_fake_block === true
            };
            localStorage.setItem('selectedSongData', JSON.stringify(cleanSong));
        } catch (e) {}
    }

    if (!autoStart && typeof stopPreview === 'function') stopPreview(true);

    const options = document.querySelectorAll('.song-option');
    options.forEach((opt) => {
        const optIdx = parseInt(opt.dataset.index);
        opt.classList.toggle('active', optIdx === index);
        if (typeof updatePreviewUI === 'function') {
            const isPrev = (typeof currentPreviewIndex !== 'undefined' && currentPreviewIndex === optIdx);
            updatePreviewUI(optIdx, isPrev ? 'playing' : 'stopped');
        }
    });

    // Khi trở lại Menu chính, làm mới danh sách để ép bài hát vừa chơi lên trên cùng
    if (typeof playlistRenderStartIndex !== 'undefined') {
        playlistRenderStartIndex = 0;
    }
    if (!autoStart && typeof renderSongList === 'function' && typeof currentFilterTerm !== 'undefined') {
        renderSongList(currentFilterTerm);
        const scrollBox = document.getElementById('song-scroll-container') || document.getElementById('song-selector');
        if (scrollBox) scrollBox.scrollTop = 0;
    }

    let changeSongBeats = activePlaylist[index].beats;
    if (!Array.isArray(changeSongBeats) || changeSongBeats.length === 0) {
        console.warn('[changeSong] Beats không hợp lệ cho bài', index, '- dùng fallback an toàn.');
        changeSongBeats = [0, 1, 2, 3];
        activePlaylist[index].beats = changeSongBeats;
    }
    beatmapBeats = changeSongBeats;
    const lastBeatVal = beatmapBeats[beatmapBeats.length - 1];
    BEATMAP_TOTAL_TIME = (Array.isArray(lastBeatVal) ? (lastBeatVal.length >= 2 ? lastBeatVal[1] : lastBeatVal[0]) : lastBeatVal) || 10;

    // --- ÁP DỤNG SPEED TỪ PLAYLIST (NẾU CÓ) ---
    if (activePlaylist[index].speed != null) {
        baseBallVelocityZ = -Math.abs(activePlaylist[index].speed);
    } else {
        baseBallVelocityZ = -18;
    }

    if (window.DashBlocksManager && typeof window.DashBlocksManager.prewarmSongDashGeometries === 'function') {
        window.DashBlocksManager.prewarmSongDashGeometries(
            beatmapBeats,
            typeof tileWidth !== 'undefined' ? tileWidth : 4.3,
            typeof tileLength !== 'undefined' ? tileLength : 4.3,
            typeof currentGraphicsQuality !== 'undefined' ? currentGraphicsQuality : 'fhd',
            typeof tileDetailScale !== 'undefined' ? tileDetailScale : 1.0,
            baseBallVelocityZ
        );
    }

    if (typeof initPulseStyleForBeatmap === 'function') {
        initPulseStyleForBeatmap();
    }

    if (!menuAudio || !audioCtx) initAudio();

    // Đảm bảo AudioContext hoạt động khi có tương tác (chuyển bài cũng là tương tác)
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }

    if (!autoStart) {
        if (menuFilterNode && menuGainNode && currentPreviewIndex === -1) {
            const now = audioCtx.currentTime;
            rampMenuAudioOpen(now);
        } else if (!audioCtx && menuAudio) {
            menuAudio.volume = getMenuTargetVolume();
        }
        const isIntro = (typeof window.isIntroActive === 'function' && window.isIntroActive()) || !window.introCompleted;
        if (!isIntro && menuAudio && currentPreviewIndex === -1) {
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
            if (loadingSkipCheckTimeout) clearTimeout(loadingSkipCheckTimeout);
            const cancelBtn = document.getElementById('loading-cancel-btn');
            if (cancelBtn) cancelBtn.style.display = 'none';
            const skipBtn = document.getElementById('loading-skip-check-btn');
            if (skipBtn) skipBtn.style.display = 'none';
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
                    if (typeof previewGainNode2 !== 'undefined' && previewGainNode2) {
                        previewGainNode2.gain.cancelScheduledValues(now);
                        previewGainNode2.gain.setValueAtTime(previewGainNode2.gain.value, now);
                        previewGainNode2.gain.linearRampToValueAtTime(0, now + 1.2);
                    }
                } else if (!audioCtx) {
                    if (menuAudio) menuAudio.volume = 0;
                    if (typeof previewAudio !== 'undefined' && previewAudio) previewAudio.volume = 0;
                    if (typeof previewAudio2 !== 'undefined' && previewAudio2) previewAudio2.volume = 0;
                }

                setTimeout(() => {
                    if (isSongLoadingCancelled) return;
                    if (typeof stopPreview === 'function') stopPreview(true);
                    loadingOverlay.style.display = 'none';
                    if (typeof anime !== 'undefined' && (typeof uiAnimationsEnabled === 'undefined' || uiAnimationsEnabled)) {
                        if (typeof anime.remove === 'function') {
                            anime.remove([startScreen, startScreenWindow]);
                        }
                        anime({
                            targets: startScreen,
                            opacity: 0,
                            duration: 250,
                            easing: 'easeInOutQuad',
                            complete: () => {
                                startScreen.style.display = 'none';
                                if (startScreenWindow) startScreenWindow.style.transform = '';
                            }
                        });
                        if (startScreenWindow) {
                            startScreenWindow.style.transform = '';
                        }
                    } else {
                        startScreen.style.opacity = 0;
                        startScreen.style.display = 'none';
                        if (startScreenWindow) startScreenWindow.style.transform = '';
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
async function submitScoreToServer(finalScore, isNormalModePassed = false, beatHistory = null) {
    const isHelper = typeof isAnyHelperModeActive === 'function' ? isAnyHelperModeActive() : false;

    // 1. Nếu đang bật chế độ hỗ trợ (Autoplay / Relax / Bot Assist...), ngắt toàn bộ lệnh (không gửi điểm & không update pass status lên server)
    if (isHelper) {
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

    // Xử lý dữ liệu nhịp (beat hits) để xác minh điểm số (Khớp với UserScoreController.php mới)
    const beatsInput = (Array.isArray(beatHistory) && beatHistory.length > 0) ? beatHistory : (window.currentBeatHits || []);
    const countOnes = Array.isArray(beatsInput) ? beatsInput.filter(v => v == 1 || v === '1' || v === true).length : 0;

    let theoreticalMaxScore = 0;
    if (countOnes < 20) {
        theoreticalMaxScore = Math.floor((countOnes * (countOnes + 3)) / 2);
    } else {
        theoreticalMaxScore = 209 + (countOnes - 19) * 21;
    }
    const maxAllowedScore = theoreticalMaxScore;

    // Log thông tin đếm tile khi bật Dev mode hoặc tài khoản Admin
    const isDevMode = (typeof window.getDevMode === 'function' && window.getDevMode() === true) || localStorage.getItem('dev_mode') === 'true' || localStorage.getItem('is_dev_mode') === 'true';
    let isAdminUser = false;
    try {
        const userObj = JSON.parse(localStorage.getItem('user_info') || '{}');
        if (userObj && (userObj.is_admin === 1 || userObj.is_admin === true || userObj.role === 'admin')) {
            isAdminUser = true;
        }
    } catch (e) {}

    if (isDevMode || isAdminUser) {
        console.log(`[Score Debug] Total Tiles Count: ${countOnes} | Theoretical Max: ${theoreticalMaxScore} | Max Allowed Score: ${maxAllowedScore} | Final Score: ${finalScore}`);
    }

    // Xác minh điểm ở Client: Điểm không được vượt quá maxAllowedScore (theoreticalMaxScore)
    if (countOnes > 0) {
        if (finalScore > maxAllowedScore) {
            console.warn(`[Score Verification] Điểm số gửi lên (${finalScore}) vượt quá giới hạn tối đa cho phép từ mảng beat (${maxAllowedScore}). Hủy đồng bộ điểm số khả nghi.`);
            if (typeof showCyberModal === 'function') {
                showCyberModal({
                    title: typeof t === 'function' ? t('score_cheat_title') : 'CẢNH BÁO GIAN LẬN',
                    message: typeof t === 'function' ? t('msg_score_cheat_warning') : '⚠️ Phát hiện điểm số bất thường, bạn có đang dùng gian lận không?',
                    type: 'alert'
                });
            }
            return;
        }
    }

    let normalScore = 0;
    let rageScore = 0;
    let easyScore = 0;
    let asianScore = 0;
    let normalPassed = false;
    let ragePassed = false;
    let easyPassed = false;
    let asianPassed = false;

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
                if (record.easyScore) {
                    try { easyScore = parseInt(atob(record.easyScore)) || 0; } catch (e) {}
                }
                if (record.asianScore) {
                    try { asianScore = parseInt(atob(record.asianScore)) || 0; } catch (e) {}
                }
                normalPassed = !!record.isNormalModePassed;
                ragePassed = !!record.isRageModePassed;
                easyPassed = !!record.isEasyModePassed;
                asianPassed = !!record.isAsianModePassed;
            }
        }
    } catch (e) {}

    const isEasy = window.EasyModeManager && window.EasyModeManager.isEnabled;
    const isRage = window.HardModeManager && window.HardModeManager.isEnabled;
    const isAsian = window.AsianModeManager && window.AsianModeManager.isEnabled;

    let payload = {
        beatmap_id: targetBeatmapId
    };

    const hasEasyPassed = (isEasy && isNormalModePassed) || easyPassed || !!currentSong?.is_easy_mode_passed;
    const hasNormalPassed = (!isEasy && !isRage && !isAsian && isNormalModePassed) || normalPassed || !!currentSong?.is_normal_mode_passed || !!currentSong?.is_passed;
    const hasHardPassed = (isRage && isNormalModePassed) || ragePassed || !!currentSong?.is_hard_mode_passed;
    const hasAsianPassed = (isAsian && isNormalModePassed) || asianPassed || !!currentSong?.is_asian_mode_passed;

    // Ưu tiên độ khó giống logic cũ: Easy > Asian > Hard > Normal
    const modeConfig = isEasy
        ? { mode: 'easy', scoreKey: 'easy_mode_score', flags: { is_easy_mode: 1 }, passedKey: 'is_easy_mode_passed', passed: hasEasyPassed }
        : isAsian
            ? { mode: 'asian', scoreKey: 'asian_mode_score', flags: { is_asian_mode: 1 }, passedKey: 'is_asian_mode_passed', passed: hasAsianPassed }
            : isRage
                ? { mode: 'hard', scoreKey: 'hard_mode_score', flags: { is_hard_mode: 1, is_rage_mode: 1 }, passedKey: 'is_hard_mode_passed', passed: hasHardPassed }
                : { mode: 'normal', scoreKey: 'score', flags: {}, passedKey: 'is_normal_mode_passed', passed: hasNormalPassed };

    payload[modeConfig.scoreKey] = finalScore;
    Object.assign(payload, modeConfig.flags);
    payload.mode = modeConfig.mode;
    if (modeConfig.passed) payload[modeConfig.passedKey] = 1;

    if (Array.isArray(beatsInput) && beatsInput.length > 0) {
        payload.beat = beatsInput;
        payload.beats = beatsInput;
    }

    // 4. Gọi API gửi điểm số / trạng thái pass bài lên Server
    try {
        await window.ApiService.postScore(payload);
    } catch (error) {
        const status = error?.response?.status;
        const errorMsg = error?.response?.data?.message || error?.message || 'Xác minh điểm số thất bại.';
        console.error("[Score] Đồng bộ điểm thất bại:", errorMsg);

        // Hiển thị thông báo khi bị lỗi 422 hoặc thất bại xác minh điểm số
        if (status === 422 || (typeof errorMsg === 'string' && (errorMsg.includes('verification') || errorMsg.includes('exceeds') || errorMsg.includes('Xác minh')))) {
            if (typeof showCyberModal === 'function') {
                showCyberModal({
                    title: typeof t === 'function' ? t('score_cheat_title') : 'CẢNH BÁO GIAN LẬN',
                    message: typeof t === 'function' ? t('msg_score_cheat_warning') : '⚠️ Phát hiện điểm số bất thường, bạn có đang dùng gian lận không?',
                    type: 'alert'
                });
            }
        }
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
                adminSpeedGainInput.value = typeof SPEED_GAIN_PER_ROUND !== 'undefined' ? SPEED_GAIN_PER_ROUND : 0.21;
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

// --- CREDITS & INFO MODAL ---
if (secretCreditBtn) {
    secretCreditBtn.addEventListener('click', () => {
        const isVi = typeof activeLang !== 'undefined' && activeLang === 'vi';
        const creditHtml = `
            <div class="space-y-3 text-sm mt-2">
                <div>
                    <span class="font-black text-cyan-400 font-orbitron text-xl leading-none block drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">CYBER BEAT HOPPER</span>
                    <span class="text-[10px] text-gray-400 bg-cyan-950/40 border border-cyan-500/30 px-2 py-0.5 rounded uppercase mt-2 inline-block font-bold">${isVi ? 'Phiên bản 1.0.9' : 'Version 1.0.9'}</span>
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
                    <div class="flex justify-between border-b border-cyan-500/10 pb-2">
                        <span class="text-gray-500">${isVi ? 'Nền tảng (Engine):' : 'Engine:'}</span>
                        <span class="text-gray-300 font-bold">MeoTN HOP v3.7</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-500">${isVi ? 'Giấy phép (License):' : 'License:'}</span>
                        <a href="license.html" onclick="event.preventDefault(); window.openInGameViewer('license.html', 'MIT LICENSE');" class="text-cyan-400 hover:text-cyan-300 font-bold underline drop-shadow-[0_0_5px_rgba(34,211,238,0.5)] transition-colors cursor-pointer">MIT License</a>
                    </div>
                </div>
                <div class="mt-4 text-center">
                    <p class="text-[10px] text-gray-500 leading-relaxed font-bold">${isVi ? 'Dự án game âm nhạc mã nguồn mở (MIT). Cảm ơn bạn đã trải nghiệm!' : 'Open-source music game project (MIT). Thanks for playing!'}</p>
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
        'js/libs/three.module.js',
        'js/libs/anime.min.js',
        'css/tailwind.min.css',
        'https://cdn.jsdelivr.net/npm/disable-devtool@latest/disable-devtool.min.js',
        'https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@500;600;700&family=Montserrat:wght@400;500;600;700;800;900&display=swap',
        'css/style.css',
        'js/core/app-main.js',
        'js/audio/playlist.js',
        'js/services/cacheManager.js',
        'js/core/i18n.js',
        'js/core/global.js',
        'js/ui/settings.js',
        'js/audio/audio-manager.js',
        'js/game/blocks/dash-blocks.js',
        'js/game/blocks/normal-blocks.js',
        'js/game/blocks/moving-blocks.js',
        'js/ui/personalize.js',
        'js/engine/game-effects.js',
        'js/engine/game-camera.js',
        'js/audio/visualizer.js',
        'js/engine/game.js',
        'js/game/assists/autoplay.js',
        'js/audio/music-player.js',
        'js/ui/song-selector.js',
        'js/game/blocks/fake-blocks.js'
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
    let _sgStartVal = 0.21;
    let _sgMoved = false;

    const _sgApply = (val) => {
        val = Math.round(Math.min(4.0, Math.max(0.1, val)) * 100) / 100;
        SPEED_GAIN_PER_ROUND = val;
        window.SPEED_GAIN_PER_ROUND = val;
        adminSpeedGainInput.value = val;
    };

    adminSpeedGainInput.addEventListener('pointerdown', (e) => {
        _sgDragging = true;
        _sgMoved = false;
        _sgStartX = e.clientX;
        _sgStartVal = parseFloat(adminSpeedGainInput.value) || 0.21;
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
        window.SPEED_GAIN_PER_ROUND = val;
    });
    adminSpeedGainInput.addEventListener('blur', () => {
        let val = parseFloat(adminSpeedGainInput.value);
        if (isNaN(val)) val = 0.21;
        val = Math.min(4.0, Math.max(0.1, val));
        SPEED_GAIN_PER_ROUND = val;
        window.SPEED_GAIN_PER_ROUND = val;
        adminSpeedGainInput.value = val;
        adminSpeedGainInput.style.cursor = 'ew-resize';
    });
}


if (adminSpeedGainReset) {
    adminSpeedGainReset.addEventListener('click', () => {
        SPEED_GAIN_PER_ROUND = 0.21;
        window.SPEED_GAIN_PER_ROUND = 0.21;
        if (adminSpeedGainInput) adminSpeedGainInput.value = 0.21;
    });
}

const GLOW_HEIGHT_BY_QUALITY = { hd: 0.75, fhd: 1.5, qhd: 1.75, uhd: 2.0 };

function getCurrentGlowHeight() {
    if (typeof currentGraphicsQuality === 'undefined') return 1.5;
    return GLOW_HEIGHT_BY_QUALITY[currentGraphicsQuality] ?? 1.5; // Default / Fallback
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

// --- AUTO-SCROLL MARQUEE FOR SONG TITLES (BATCHED TO PREVENT LAYOUT THRASHING) ---
const _pendingMarqueeElements = new Set();
let _marqueeRafId = null;

function _flushMarquees() {
    _marqueeRafId = null;
    if (_pendingMarqueeElements.size === 0) return;

    // Phase 1: BATCHED READ (Zero layout thrashing - all DOM measurements in 1 pass)
    const measurements = [];
    for (const element of _pendingMarqueeElements) {
        if (!element || !element.isConnected) continue;
        const container = element.parentElement;
        const textWidth = element.scrollWidth;
        const containerWidth = container ? container.clientWidth : 0;
        measurements.push({ element, container, textWidth, containerWidth });
    }
    _pendingMarqueeElements.clear();

    // Phase 2: BATCHED WRITE (All DOM mutations grouped together)
    for (let i = 0; i < measurements.length; i++) {
        const { element, container, textWidth, containerWidth } = measurements[i];
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
    }
}

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
    
    _pendingMarqueeElements.add(element);
    if (!_marqueeRafId) {
        _marqueeRafId = requestAnimationFrame(_flushMarquees);
    }
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
const MAIN_MENU_THEMES = {
    normal: {
        name: 'normal',
        primaryColor: '#22d3ee',        // Neon Cyan
        borderColor: 'rgba(6, 182, 212, 0.45)',
        glowColor: 'rgba(6, 182, 212, 0.3)',
        activeTabBg: 'rgba(6, 182, 212, 0.15)'
    },
    asian: {
        name: 'asian',
        primaryColor: '#f43f5e',        // Red / Crimson
        borderColor: 'rgba(239, 68, 68, 0.65)',
        glowColor: 'rgba(239, 68, 68, 0.45)',
        activeTabBg: 'rgba(239, 68, 68, 0.15)'
    },
    hard: {
        name: 'hard',
        primaryColor: '#fbbf24',        // Amber / Flame Orange
        borderColor: 'rgba(245, 158, 11, 0.55)',
        glowColor: 'rgba(245, 158, 11, 0.35)',
        activeTabBg: 'rgba(245, 158, 11, 0.15)'
    },
    easy: {
        name: 'easy',
        primaryColor: '#34d399',        // Emerald Green
        borderColor: 'rgba(16, 185, 129, 0.55)',
        glowColor: 'rgba(16, 185, 129, 0.35)',
        activeTabBg: 'rgba(16, 185, 129, 0.15)'
    }
};

function updateMainMenuTheme() {
    const isAsian = window.AsianModeManager && window.AsianModeManager.isEnabled;
    const isHard  = window.HardModeManager && window.HardModeManager.isEnabled;
    const isEasy  = window.EasyModeManager && window.EasyModeManager.isEnabled;

    // Ưu tiên: Asian > Hard > Easy > Normal
    const theme = MAIN_MENU_THEMES[isAsian ? 'asian' : isHard ? 'hard' : isEasy ? 'easy' : 'normal'];

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
        #nav-menu-toggle, #mobile-fullscreen-btn {
            border-color: ${theme.borderColor} !important;
            color: ${theme.primaryColor} !important;
        }
        #header-fullscreen-btn:not(.active-fullscreen) {
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

// --- BỘ ĐIỀU HÀNH ĐỘ KHÓ TOÀN CỤC (MUTUALLY EXCLUSIVE DIFFICULTY MANAGER) ---
window.getActiveDifficultyMode = function () {
    if (localStorage.getItem('asianModeEnabled') === 'true') return 'asian';
    if (localStorage.getItem('hardModeEnabled') === 'true') return 'hard';
    if (localStorage.getItem('easyModeEnabled') === 'true') return 'easy';
    return 'normal';
};

window.setDifficultyMode = function (targetMode) {
    const mode = (targetMode === 'easy' || targetMode === 'hard' || targetMode === 'asian') ? targetMode : 'normal';

    const isEasy = (mode === 'easy');
    const isHard = (mode === 'hard');
    const isAsian = (mode === 'asian');

    localStorage.setItem('easyModeEnabled', isEasy ? 'true' : 'false');
    localStorage.setItem('hardModeEnabled', isHard ? 'true' : 'false');
    localStorage.setItem('asianModeEnabled', isAsian ? 'true' : 'false');

    if (window.EasyModeManager) window.EasyModeManager.isEnabled = isEasy;
    if (window.HardModeManager) window.HardModeManager.isEnabled = isHard;
    if (window.AsianModeManager) window.AsianModeManager.isEnabled = isAsian;

    if (typeof window.syncDifficultyToggles === 'function') {
        window.syncDifficultyToggles();
    }

    if (typeof window.updateMainMenuTheme === 'function') {
        window.updateMainMenuTheme();
    }
};

window.syncDifficultyToggles = function () {
    const activeMode = (typeof window.getActiveDifficultyMode === 'function')
        ? window.getActiveDifficultyMode()
        : 'normal';

    const tEasy = document.getElementById('toggle-easy-mode');
    const tNormal = document.getElementById('toggle-normal-mode');
    const tHard = document.getElementById('toggle-hard-mode');
    const tAsian = document.getElementById('toggle-asian-mode');

    if (tEasy) tEasy.checked = (activeMode === 'easy');
    if (tNormal) tNormal.checked = (activeMode === 'normal');
    if (tHard) tHard.checked = (activeMode === 'hard');
    if (tAsian) tAsian.checked = (activeMode === 'asian');

    const cEasy = document.getElementById('easy-mode-container');
    const cNormal = document.getElementById('normal-mode-container');
    const cHard = document.getElementById('hard-mode-container');
    const cAsian = document.getElementById('asian-mode-container');

    const setItemActive = (el, isActive, activeClass) => {
        if (!el) return;
        el.classList.add('difficulty-item');
        el.classList.remove('mode-active-normal', 'mode-active-easy', 'mode-active-hard', 'mode-active-asian');
        if (isActive) {
            el.classList.add(activeClass);
        }
    };

    setItemActive(cNormal, activeMode === 'normal', 'mode-active-normal');
    setItemActive(cEasy, activeMode === 'easy', 'mode-active-easy');
    setItemActive(cHard, activeMode === 'hard', 'mode-active-hard');
    setItemActive(cAsian, activeMode === 'asian', 'mode-active-asian');
};

function initDifficultyUIEvents() {
    const radios = document.querySelectorAll('input[name="difficulty_mode"]');
    radios.forEach(radio => {
        radio.onchange = function (e) {
            if (e.target.checked) {
                window.setDifficultyMode(e.target.value);
            }
        };
    });
    if (typeof window.syncDifficultyToggles === 'function') {
        window.syncDifficultyToggles();
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDifficultyUIEvents);
} else {
    initDifficultyUIEvents();
}

// --- TỐI ƯU HIỆU SUẤT (DEBOUNCE LOCAL STORAGE) ---
window.debouncedLocalStorageSet = (function() {
    let timers = {};
    return function(key, value, delay = 150) {
        clearTimeout(timers[key]);
        timers[key] = setTimeout(() => {
            try {
                localStorage.setItem(key, value);
            } catch (e) {
                console.warn('[Storage] Lỗi khi lưu settings:', e);
            }
        }, delay);
    };
})();


// ============================================================
// IN-GAME PAGE VIEWER (Xem License, Terms, v.v. trực tiếp không làm reload game)
// ============================================================
window.openInGameViewer = function(url, title) {
    const modal = document.getElementById('page-viewer-modal');
    const iframe = document.getElementById('page-viewer-iframe');
    const titleEl = document.getElementById('page-viewer-title');
    const extBtn = document.getElementById('page-viewer-open-external');
    if (!modal || !iframe) {
        window.open(url, '_blank');
        return;
    }

    if (titleEl) {
        titleEl.textContent = title || 'Cyber Beat Hopper';
    }
    if (extBtn) {
        extBtn.onclick = (e) => {
            e.stopPropagation();
            window.open(url, '_blank');
        };
    }
    iframe.src = url;
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
};

window.closeInGameViewer = function() {
    const modal = document.getElementById('page-viewer-modal');
    const iframe = document.getElementById('page-viewer-iframe');
    if (!modal) return;

    modal.classList.add('hidden');
    modal.style.display = 'none';
    if (iframe) {
        iframe.src = 'about:blank';
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const closeBtn = document.getElementById('page-viewer-close-btn');
    if (closeBtn) {
        closeBtn.onclick = window.closeInGameViewer;
    }
});

window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const modal = document.getElementById('page-viewer-modal');
        if (modal && modal.style.display !== 'none' && !modal.classList.contains('hidden')) {
            window.closeInGameViewer();
        }
    }
});

// Chặn các link mở license.html và terms.html trên toàn bộ ứng dụng để nạp qua In-Game Viewer
document.addEventListener('click', (e) => {
    const link = e.target.closest && e.target.closest('a');
    if (!link) return;
    const href = link.getAttribute('href');
    if (!href) return;

    if (href.endsWith('license.html') || href.includes('license.html')) {
        e.preventDefault();
        e.stopPropagation();
        window.openInGameViewer('license.html', 'MIT LICENSE - CYBER BEAT HOPPER');
        return;
    }
    if (href.endsWith('terms.html') || href.includes('terms.html')) {
        e.preventDefault();
        e.stopPropagation();
        window.openInGameViewer('terms.html', 'TERMS OF SERVICE / ĐIỀU KHOẢN DỊCH VỤ');
        return;
    }
}, true);


// ============================================================
// IN-GAME VIEWER (Mở Beat Editor & Admin Panel qua In-Game Viewer)
// + Sử dụng chung 100% localStorage (Token Admin có sẵn, không Access Denied)
// + Không lộ token ra ngoài URL
// + Không cần tải lại (reload) toàn bộ game khi đóng mở
// ============================================================
window.openExternalWebApp = function(pathOrUrl) {
    if (pathOrUrl.includes('admin.html')) {
        window.openInGameViewer('admin.html', 'ADMIN DASHBOARD - BẢNG QUẢN TRỊ');
    } else if (pathOrUrl.includes('beat_editor.html')) {
        window.openInGameViewer('beat_editor.html', 'BEAT EDITOR PRO - BIÊN TẬP NHỊP');
    } else {
        window.openInGameViewer(pathOrUrl, 'CYBER BEAT HOPPER');
    }
};

// Đảm bảo click vào link admin.html và beat_editor.html luôn mở qua In-Game Viewer
document.addEventListener('click', (e) => {
    const link = e.target.closest && e.target.closest('a');
    if (!link) return;
    const href = link.getAttribute('href');
    if (!href) return;

    if (href.endsWith('admin.html') || href.includes('admin.html')) {
        e.preventDefault();
        e.stopPropagation();
        window.openInGameViewer('admin.html', 'ADMIN DASHBOARD - BẢNG QUẢN TRỊ');
        return;
    }
    if (href.endsWith('beat_editor.html') || href.includes('beat_editor.html')) {
        e.preventDefault();
        e.stopPropagation();
        window.openInGameViewer('beat_editor.html', 'BEAT EDITOR PRO - BIÊN TẬP NHỊP');
        return;
    }
}, true);


// ============================================================
// CYBER TOAST NOTIFICATION & GAMEPLAY PROTECTION
// ============================================================
window.showGameToast = function (msg, duration, type) {
    if (duration === undefined) duration = 3200;
    if (type === undefined) type = 'warning';

    let container = document.getElementById('game-toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'game-toast-container';
        container.style.cssText = 'position:fixed;top:28px;left:50%;transform:translateX(-50%);z-index:9999999;display:flex;flex-direction:column;align-items:center;gap:10px;pointer-events:none;max-width:92vw;width:max-content;';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    const isError = type === 'error';
    const isSuccess = type === 'success';
    const borderColor = isError ? 'rgba(239, 68, 68, 0.85)' : (isSuccess ? 'rgba(34, 197, 94, 0.85)' : 'rgba(245, 158, 11, 0.85)');
    const glowColor = isError ? 'rgba(239, 68, 68, 0.45)' : (isSuccess ? 'rgba(34, 197, 94, 0.45)' : 'rgba(245, 158, 11, 0.45)');
    const iconColor = isError ? '#ef4444' : (isSuccess ? '#22c55e' : '#f59e0b');

    const iconSvg = isSuccess
        ? '<svg style="width:20px;height:20px;flex-shrink:0;color:' + iconColor + ';" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>'
        : '<svg style="width:20px;height:20px;flex-shrink:0;color:' + iconColor + ';" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>';

    toast.style.cssText = 'display:flex;align-items:center;gap:12px;padding:11px 20px;background:rgba(8,13,24,0.94);border:1.5px solid ' + borderColor + ';border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,0.75),0 0 20px ' + glowColor + ';color:#f8fafc;font-family:Rajdhani,Orbitron,Segoe UI,sans-serif;font-size:14px;font-weight:700;letter-spacing:0.5px;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);transform:translateY(-24px) scale(0.95);opacity:0;transition:transform 0.28s cubic-bezier(0.16,1,0.3,1),opacity 0.28s ease;pointer-events:auto;';
    toast.innerHTML = iconSvg + '<span>' + msg + '</span>';

    container.appendChild(toast);

    requestAnimationFrame(() => {
        toast.style.transform = 'translateY(0) scale(1)';
        toast.style.opacity = '1';
    });

    setTimeout(() => {
        toast.style.transform = 'translateY(-16px) scale(0.95)';
        toast.style.opacity = '0';
        setTimeout(() => {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 320);
    }, duration);
};
window.showToast = window.showGameToast;

// Kiểm tra xem người chơi có đang trong ván game tích cực (cần bảo vệ chống quay lại ngoài ý muốn)
window.isGamePlayActive = function () {
    // 1. Nếu màn hình Menu bắt đầu (start-screen) đang hiển thị -> KHÔNG phải đang chơi
    const startScreenEl = document.getElementById('start-screen') || (typeof startScreen !== 'undefined' ? startScreen : null);
    if (startScreenEl && startScreenEl.style.display !== 'none' && startScreenEl.style.display !== '' && parseFloat(startScreenEl.style.opacity || '1') > 0.1) {
        return false;
    }

    // 2. Nếu màn hình Game Over đang hiển thị -> KHÔNG chặn
    const goScreenEl = document.getElementById('gameover-screen') || (typeof gameoverScreen !== 'undefined' ? gameoverScreen : null);
    if (goScreenEl && goScreenEl.style.display === 'flex' && parseFloat(goScreenEl.style.opacity || '1') > 0.1) {
        return false;
    }

    // 3. Kiểm tra cờ trạng thái game
    const playing = (typeof window.isPlaying !== 'undefined' ? window.isPlaying : (typeof isPlaying !== 'undefined' ? isPlaying : false));
    const started = (typeof window.gameStarted !== 'undefined' ? window.gameStarted : (typeof gameStarted !== 'undefined' ? gameStarted : false));
    const failing = (typeof window.isFailTransition !== 'undefined' ? window.isFailTransition : (typeof isFailTransition !== 'undefined' ? isFailTransition : false));
    const victory = (typeof window.isVictoryTransition !== 'undefined' ? window.isVictoryTransition : (typeof isVictoryTransition !== 'undefined' ? isVictoryTransition : false));

    return !!((playing || started) && !failing && !victory);
};

// Xử lý khi chặn hành vi quay lại (Alt+<-, Hardware Back, Popstate, Backspace)
window.handleBlockedBackNavigation = function () {
    // Tự động tạm dừng game nếu đang chạy để người chơi không bị rớt bóng / hỏng ván
    const playing = (typeof window.isPlaying !== 'undefined' ? window.isPlaying : (typeof isPlaying !== 'undefined' ? isPlaying : false));
    if (playing) {
        if (typeof pauseGame === 'function') {
            pauseGame();
        } else if (typeof window.pauseGame === 'function') {
            window.pauseGame();
        }
    }

    // Lấy thông báo theo ngôn ngữ hiện tại
    const msg = (typeof t === 'function' ? t('msg_back_blocked') : null) || 'Đã chặn quay lại để bảo vệ ván đấu của bạn!';
    if (typeof window.showGameToast === 'function') {
        window.showGameToast(msg, 3200, 'warning');
    }
    console.log('%c[NavigationGuard] ' + msg, 'color: #f59e0b; font-weight: bold;');
};


// Đóng bất kỳ modal/popup nào đang mở (Ưu tiên nút Back đóng hộp thoại trước khi thoát app)
window.closeAnyOpenModal = function () {
    // 0. Nếu đang ở các tab con (Settings, Music, Personalize, Account) -> Trở về Tab Home
    const panelHome = document.getElementById('panel-home');
    const navHomeBtn = document.getElementById('nav-home');
    if (panelHome && panelHome.classList.contains('hidden') && navHomeBtn) {
        navHomeBtn.click();
        return true;
    }

    // 1. In-game page viewer modal
    const pageViewer = document.getElementById('page-viewer-modal');
    if (pageViewer && pageViewer.style.display !== 'none' && !pageViewer.classList.contains('hidden')) {
        if (typeof window.closeInGameViewer === 'function') {
            window.closeInGameViewer();
        } else {
            pageViewer.classList.add('hidden');
            pageViewer.style.display = 'none';
        }
        return true;
    }

    // 2. Download App modal
    const downloadModal = document.getElementById('download-app-modal');
    if (downloadModal && downloadModal.style.display !== 'none' && !downloadModal.classList.contains('hidden')) {
        const closeBtn = document.getElementById('close-download-app-modal');
        if (closeBtn) {
            closeBtn.click();
        } else {
            downloadModal.classList.add('hidden');
            downloadModal.style.display = 'none';
        }
        return true;
    }

    // 3. Cyber modal
    const cyberModal = document.getElementById('cyber-modal');
    if (cyberModal && cyberModal.style.display !== 'none' && !cyberModal.classList.contains('hidden')) {
        cyberModal.classList.add('hidden');
        cyberModal.style.display = 'none';
        return true;
    }

    // 4. Các modal thông dụng khác
    const openModals = document.querySelectorAll('#settings-modal:not(.hidden), #song-selector-modal:not(.hidden), #account-modal:not(.hidden), #tos-modal:not(.hidden), #admin-panel-modal:not(.hidden)');
    for (let i = 0; i < openModals.length; i++) {
        const modal = openModals[i];
        if (modal.style.display !== 'none') {
            modal.classList.add('hidden');
            modal.style.display = 'none';
            return true;
        }
    }

    return false;
};

// Xử lý nút Back khi không ở trạng thái chơi game (Yêu cầu nhấn 2 lần để thoát)
let lastBackPressTimestamp = 0;
const DOUBLE_BACK_DELAY = 2200; // Khoảng thời gian cho phép nhấn lần 2 (2.2 giây)

window.handleMenuBackPress = function () {
    // 1. Nếu có modal/hộp thoại/tab con đang mở -> Đóng/trở về Home trước
    if (typeof window.closeAnyOpenModal === 'function' && window.closeAnyOpenModal()) {
        return false;
    }

    // 2. Nếu đang ở màn hình Game Over -> Trở về Menu chính
    const goScreenEl = document.getElementById('gameover-screen') || (typeof gameoverScreen !== 'undefined' ? gameoverScreen : null);
    if (goScreenEl && goScreenEl.style.display === 'flex' && parseFloat(goScreenEl.style.opacity || '1') > 0.1) {
        if (typeof returnToMenu === 'function') {
            returnToMenu();
            return false;
        }
    }

    // 3. Nhấn 2 lần để thoát game
    const now = Date.now();
    if (now - lastBackPressTimestamp < DOUBLE_BACK_DELAY) {
        // Lần thứ 2: Thực hiện thoát
        lastBackPressTimestamp = 0;

        // 3.1. Android Native App Bridge (APK)
        if (window.AndroidNativeApp && typeof window.AndroidNativeApp.exitApp === 'function') {
            window.AndroidNativeApp.exitApp();
            return true;
        }

        // 3.2. Capacitor App Plugin fallback
        if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App && typeof window.Capacitor.Plugins.App.exitApp === 'function') {
            window.Capacitor.Plugins.App.exitApp();
            return true;
        }

        // 3.3. Desktop PC App
        if (window.DesktopAppManager && typeof window.DesktopAppManager.exitApp === 'function' && window.isDesktopApp) {
            window.DesktopAppManager.exitApp();
            return true;
        }

        // 3.4. Mobile Browser / PWA fallback
        try {
            window.close();
        } catch (e) {}

        setTimeout(() => {
            try {
                window.history.go(-2);
            } catch (e) {
                window.history.back();
            }
        }, 80);

        return true;
    } else {
        // Lần thứ 1: Cảnh báo "Nhấn lại lần nữa để thoát"
        lastBackPressTimestamp = now;
        const exitMsg = (typeof t === 'function' ? t('msg_press_back_again_to_exit') : null) || 'Nhấn lại lần nữa để thoát';
        if (typeof window.showGameToast === 'function') {
            window.showGameToast(exitMsg, 2200, 'warning');
        }
        return false;
    }
};

// Xử lý sự kiện nút Back từ Android Native (Cả phím cứng & cử chỉ vuốt cạnh)
window.onAndroidNativeBackPressed = function () {
    const isPlay = (typeof window.isGamePlayActive === 'function')
        ? window.isGamePlayActive()
        : ((typeof isPlaying !== 'undefined' && isPlaying) || (typeof gameStarted !== 'undefined' && gameStarted));

    if (isPlay) {
        if (typeof window.handleBlockedBackNavigation === 'function') {
            window.handleBlockedBackNavigation();
        } else if (typeof pauseGame === 'function') {
            pauseGame();
        }
        return;
    }

    if (typeof window.handleMenuBackPress === 'function') {
        window.handleMenuBackPress();
    }
};

// ============================================================
// XỬ LÝ SỰ KIỆN MẤT FOCUS (UNFOCUS / BLUR) VÀ QUAY LẠI (FOCUS)
// Đảm bảo hoạt động hoàn hảo trên Android APK, Mobile Web & PC
// ============================================================
window.onAndroidNativeBlur = function () {
    console.log('[NativeBridge] onAndroidNativeBlur (Mất focus / chuyển app / tắt màn hình)');

    // 1. Giải phóng WakeLock màn hình
    if (typeof releaseScreenWakeLock === 'function') {
        releaseScreenWakeLock();
    } else if (typeof window.releaseScreenWakeLock === 'function') {
        window.releaseScreenWakeLock();
    }

    // Nếu đang trong màn hình Intro, không xử lý gì thêm (không fade out nhạc vì nhạc chưa hề chạy)
    if (typeof window.isIntroActive === 'function' ? window.isIntroActive() : !window.introCompleted) {
        return;
    }

    // 2. Nếu đang trong trận đấu -> Tự động Pause ngay lập tức để bảo vệ ván đấu của người chơi
    const isPlay = (typeof window.isGamePlayActive === 'function')
        ? window.isGamePlayActive()
        : ((typeof isPlaying !== 'undefined' && isPlaying) || (typeof gameStarted !== 'undefined' && gameStarted));

    if (isPlay) {
        if (typeof pauseGame === 'function') {
            pauseGame();
        } else if (typeof window.pauseGame === 'function') {
            window.pauseGame();
        }
    }

    // 3. Reset các cờ chạm / chuột để không bị kẹt input vuốt
    if (typeof isMouseDown !== 'undefined') isMouseDown = false;
    if (typeof isTouchActive !== 'undefined') isTouchActive = false;

    // 4. Phát sự kiện blur chuẩn của window để audio-manager tự động thực hiện fade out mượt mà (không dừng đột ngột)
    try {
        window.dispatchEvent(new Event('blur'));
    } catch (e) {}
};

window.onAndroidNativeFocus = function () {
    console.log('[NativeBridge] onAndroidNativeFocus (Ứng dụng lấy lại focus / quay lại màn hình)');

    // Nếu đang trong màn hình Intro, tuyệt đối không kích hoạt hay phục hồi nhạc
    if (typeof window.isIntroActive === 'function' ? window.isIntroActive() : !window.introCompleted) {
        return;
    }

    // 1. Phục hồi AudioContext nếu đang bị suspend
    try {
        if (typeof audioCtx !== 'undefined' && audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume().catch(() => {});
        }
    } catch (e) {}

    // 2. Phát sự kiện focus chuẩn của window để audio-manager tự động phục hồi và fade in mượt mà
    try {
        window.dispatchEvent(new Event('focus'));
    } catch (e) {}
};

