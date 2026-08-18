// ============================================================
//  settings.js — Quản lý cấu hình & Tùy chỉnh người dùng
// ============================================================

// --- DANH SÁCH TẤT CẢ CÁC KEY SETTING VÀ HỆ THỐNG HỢP LỆ TRONG LOCAL STORAGE ---
const VALID_LOCAL_STORAGE_KEYS = new Set([
    // Core Graphics & Gameplay Settings
    'performanceModeEnabled',
    'graphicsQuality',
    'graphicsAPI',
    'isRelativePC',
    'rawInputEnabled',
    'bgParticlesEnabled',
    'antialiasingEnabled',
    'shockwavesEnabled',
    'dynamicColorsEnabled',
    'visualizerEnabled',
    'tileBounceEnabled',
    'blockShatterEnabled',
    'ballGlowEnabled',
    'ballTrailEnabled',
    'showBoundariesEnabled',
    'advancedBoundariesEnabled',
    'showHitboxEnabled',
    'showFpsEnabled',
    'uiAnimationsEnabled',
    'spawnAnimationMode',
    'sensitivity',
    'fakeBlocksEnabled',
    'preservePitchEnabled',
    'limitBeatmapAudioCount',
    'swAutoUpdateEnabled',
    'autoFullscreenEnabled',
    'botAssistEnabled',
    'relaxModeEnabled',
    'invertControlsEnabled',
    'hiddenBlockEnabled',
    'settingsFontSize',
    'tileDetailScale',
    'maxFps',
    'blocksAheadLimit',
    'blocksBehindLimit',
    'hardModeEnabled',
    'easyModeEnabled',
    'asianModeEnabled',

    // Audio & Mute Settings
    'menuVolume',
    'previewVolume',
    'gameVolume',
    'sfxVolume',
    'playSfxVolume',
    'pregameVolume',
    'roundVolume',
    'mfxGameOverVolume',
    'uiVolume',
    'breakBlockVolume',
    'isMenuMuted',
    'isPreviewMuted',
    'isPlaySfxMuted',
    'isGameMuted',
    'isPregameMuted',
    'isSfxMuted',
    'isRoundMuted',
    'isMfxGameOverMuted',
    'isUiMuted',
    'isBreakBlockMuted',
    'allowBackgroundMusic',

    // App State, Auth & Customization
    'selectedLanguage',
    'tos_accepted',
    'auth_token',
    'auth_token_exp',
    'auth_user',
    'saved_accounts',
    'active_support_room_id',
    'selectedBackground',
    'selectedSongId',
    'selectedSongIndex',
    'selectedSongUrl',
    'selectedSongData',
    'adminSidebarCollapsed',
    'MeoTNDevModeExp',
    'music_cache_metadata',
    'perfModeBackup'
]);

/**
 * Kiểm tra 1 key có phải key hợp lệ (tĩnh hoặc động theo pattern) hay không
 */
function isKeyValidInLocalStorage(key) {
    if (!key) return false;
    if (VALID_LOCAL_STORAGE_KEYS.has(key)) return true;
    // Kiểm tra các key động theo tiền tố hợp lệ
    if (key.startsWith('map_etag_')) return true;
    if (key.startsWith('highScore_') || key.startsWith('starScore_') || key.startsWith('stars_')) return true;
    if (key.startsWith('custom_beatmap_') || key.startsWith('beatmap_')) return true;
    return false;
}

/**
 * Kiểm tra và dọn dẹp các key setting thừa/cũ không dùng trong Local Storage
 * @param {boolean} isSilent - Nếu true, chạy ngầm không hiển thị thông báo UI
 */
function checkAndCleanLocalStorageIntegrity(isSilent = false) {
    const deletedKeys = [];
    const migratedKeys = [];

    // 1. Chuyển đổi (migration) các key cũ từng đổi tên nếu người dùng còn lưu
    if (localStorage.getItem('tileAnimationsEnabled') !== null) {
        if (localStorage.getItem('tileBounceEnabled') === null) {
            localStorage.setItem('tileBounceEnabled', localStorage.getItem('tileAnimationsEnabled'));
            migratedKeys.push('tileAnimationsEnabled ➔ tileBounceEnabled');
        }
        localStorage.removeItem('tileAnimationsEnabled');
        deletedKeys.push('tileAnimationsEnabled');
    }
    if (localStorage.getItem('ballAuraEnabled') !== null) {
        if (localStorage.getItem('ballGlowEnabled') === null) {
            localStorage.setItem('ballGlowEnabled', localStorage.getItem('ballAuraEnabled'));
            migratedKeys.push('ballAuraEnabled ➔ ballGlowEnabled');
        }
        localStorage.removeItem('ballAuraEnabled');
        deletedKeys.push('ballAuraEnabled');
    }

    // 2. Duyệt tìm các key không nằm trong file mã nguồn gốc
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && !isKeyValidInLocalStorage(key)) {
            keysToRemove.push(key);
        }
    }

    // 3. Xóa bỏ các key không hợp lệ
    keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        deletedKeys.push(key);
    });

    if (deletedKeys.length > 0) {
        console.log(`[StorageIntegrity] Đã dọn dẹp ${deletedKeys.length} key thừa trong Local Storage:`, deletedKeys);
    }

    // 4. Hiển thị thông báo nếu không phải chạy ngầm
    if (!isSilent && typeof showCyberModal === 'function') {
        const t = (key) => typeof window.t === 'function' ? window.t(key) : key;
        if (deletedKeys.length > 0) {
            const listHtml = deletedKeys.map(k => `<li class="font-mono text-emerald-300 text-left list-disc list-inside">${k}</li>`).join('');
            showCyberModal({
                title: typeof t === 'function' ? t('btn_check_storage_integrity') : "KIỂM TRA TÍNH TOÀN VẸN LOCAL STORAGE",
                message: `
                    <div class="space-y-2">
                        <p class="text-emerald-400 font-bold">${(typeof t === 'function' ? t('msg_storage_integrity_clean') : "Đã dọn dẹp {count} key cài đặt thừa/lỗi trong Local Storage!").replace('{count}', deletedKeys.length)}</p>
                        <p class="text-xs text-gray-400">${typeof t === 'function' ? t('msg_storage_integrity_detail') : "Danh sách key đã dọn dẹp:"}</p>
                        <ul class="bg-black/40 p-2.5 rounded max-h-36 overflow-y-auto text-xs space-y-1 border border-emerald-500/20">
                            ${listHtml}
                        </ul>
                    </div>
                `,
                type: 'alert'
            });
        } else {
            showCyberModal({
                title: typeof t === 'function' ? t('btn_check_storage_integrity') : "KIỂM TRA TÍNH TOÀN VẸN LOCAL STORAGE",
                message: typeof t === 'function' ? t('msg_storage_integrity_ok') : "Local Storage hoàn toàn hợp lệ! Không có cài đặt dư thừa.",
                type: 'alert'
            });
        }
    }

    return deletedKeys;
}
window.checkAndCleanLocalStorageIntegrity = checkAndCleanLocalStorageIntegrity;

// Chạy tự động dọn dẹp key cũ không hợp lệ khi khởi động
checkAndCleanLocalStorageIntegrity(true);

// --- BIẾN TRẠNG THÁI CÀI ĐẶT ---
let performanceModeEnabled = JSON.parse(localStorage.getItem('performanceModeEnabled')) === true;
let currentGraphicsQuality = localStorage.getItem('graphicsQuality') || 'fhd';
let rawAPI = localStorage.getItem('graphicsAPI') || 'webgl';
let graphicsAPI = (rawAPI === 'd2ViZ3B1' || rawAPI === 'webgpu') ? 'webgpu' : 'webgl';
window.isWebGPUCache = (graphicsAPI === 'webgpu');
let isRelativePC = JSON.parse(localStorage.getItem('isRelativePC')) === true;
let rawInputEnabled = JSON.parse(localStorage.getItem('rawInputEnabled')) === true;
let bgParticlesEnabled = JSON.parse(localStorage.getItem('bgParticlesEnabled')) !== false;
let antialiasingEnabled = JSON.parse(localStorage.getItem('antialiasingEnabled')) === true;
let shockwavesEnabled = JSON.parse(localStorage.getItem('shockwavesEnabled')) !== false;
let dynamicColorsEnabled = JSON.parse(localStorage.getItem('dynamicColorsEnabled')) !== false;
let visualizerEnabled = JSON.parse(localStorage.getItem('visualizerEnabled')) === true;
let tileBounceEnabled = JSON.parse(localStorage.getItem('tileBounceEnabled') !== null ? localStorage.getItem('tileBounceEnabled') : localStorage.getItem('tileAnimationsEnabled')) !== false;
let blockShatterEnabled = JSON.parse(localStorage.getItem('blockShatterEnabled')) !== false;
let ballGlowEnabled = JSON.parse(localStorage.getItem('ballGlowEnabled') !== null ? localStorage.getItem('ballGlowEnabled') : (localStorage.getItem('ballAuraEnabled') !== null ? localStorage.getItem('ballAuraEnabled') : 'true')) !== false;
let ballTrailEnabled = JSON.parse(localStorage.getItem('ballTrailEnabled')) !== false;
let showBoundariesEnabled = JSON.parse(localStorage.getItem('showBoundariesEnabled')) !== false;
let advancedBoundariesEnabled = JSON.parse(localStorage.getItem('advancedBoundariesEnabled')) !== false;
let showHitboxEnabled = JSON.parse(localStorage.getItem('showHitboxEnabled')) === true;
let showFpsEnabled = JSON.parse(localStorage.getItem('showFpsEnabled')) === true;
let uiAnimationsEnabled = JSON.parse(localStorage.getItem('uiAnimationsEnabled')) !== false;
let spawnAnimationMode = localStorage.getItem('spawnAnimationMode') || 'slide';
if (spawnAnimationMode === 'fall') {
    spawnAnimationMode = 'slide';
    localStorage.setItem('spawnAnimationMode', 'slide');
}
let sensitivity = parseFloat(localStorage.getItem('sensitivity')) || 1.0;
let fakeBlocksEnabled = JSON.parse(localStorage.getItem('fakeBlocksEnabled')) !== false;
let preservePitchEnabled = JSON.parse(localStorage.getItem('preservePitchEnabled')) === true;
let limitBeatmapAudioCount = localStorage.getItem('limitBeatmapAudioCount') !== null ? parseInt(localStorage.getItem('limitBeatmapAudioCount')) : 30;
let swAutoUpdateEnabled = JSON.parse(localStorage.getItem('swAutoUpdateEnabled')) !== false;
let autoFullscreenEnabled = JSON.parse(localStorage.getItem('autoFullscreenEnabled')) === true;
let botAssistEnabled = JSON.parse(localStorage.getItem('botAssistEnabled')) === true;
let relaxModeEnabled = JSON.parse(localStorage.getItem('relaxModeEnabled')) === true;
let invertControlsEnabled = JSON.parse(localStorage.getItem('invertControlsEnabled')) === true;
let hiddenBlockEnabled = JSON.parse(localStorage.getItem('hiddenBlockEnabled')) === true;
let settingsFontSize = localStorage.getItem('settingsFontSize') || 'medium';
let tileDetailScale = localStorage.getItem('tileDetailScale') !== null ? parseFloat(localStorage.getItem('tileDetailScale')) : 1.0;
let maxFps = localStorage.getItem('maxFps') !== null ? parseInt(localStorage.getItem('maxFps')) : 0;

// Ghi đè cấu hình nếu Chế độ hiệu suất đang bật
if (performanceModeEnabled) {
    currentGraphicsQuality = 'simple';
    bgParticlesEnabled = false;
    antialiasingEnabled = false;
    shockwavesEnabled = false;
    visualizerEnabled = false;
    tileBounceEnabled = false;
    blockShatterEnabled = false;
    ballGlowEnabled = false;
    ballTrailEnabled = false;
    advancedBoundariesEnabled = false;
    tileDetailScale = 0.2;
}

let blocksAheadLimit = localStorage.getItem('blocksAheadLimit') !== null ? parseInt(localStorage.getItem('blocksAheadLimit')) : (currentGraphicsQuality === 'simple' ? 5 : 8);
blocksAheadLimit = Math.min(10, Math.max(4, blocksAheadLimit)); // Giới hạn max là 10, min là 4
let blocksBehindLimit = localStorage.getItem('blocksBehindLimit') !== null ? parseInt(localStorage.getItem('blocksBehindLimit')) : 2;
blocksBehindLimit = Math.min(3, Math.max(0, blocksBehindLimit)); // Giới hạn max là 3, min là 0

function updateObjectPoolingLimits() {
    maxTilePoolSize = Math.max(5, blocksAheadLimit + blocksBehindLimit + 5);
    if (window.FakeBlocksManager) {
        window.FakeBlocksManager.maxPoolSize = maxTilePoolSize * 2;
    }
}
updateObjectPoolingLimits();

let menuVolume = localStorage.getItem('menuVolume') !== null ? parseFloat(localStorage.getItem('menuVolume')) : 0.5;

/**
 * Chạy hiệu ứng Cinematic Outro (kéo camera, hiện logo, làm tối màn hình) trước khi reload
 */
function playEndSceneAndReload(reloadCallback) {
    // Chặn tương tác người dùng tránh việc click lặp trong lúc animation chạy
    const blockInteraction = document.createElement('div');
    blockInteraction.className = "fixed inset-0 z-[10000]";
    document.body.appendChild(blockInteraction);

    if (typeof uiAnimationsEnabled !== 'undefined' && uiAnimationsEnabled && typeof anime !== 'undefined') {
        // 1. Áp dụng hiệu ứng Lowpass cho nhạc nền
        if (typeof audioCtx !== 'undefined' && audioCtx && typeof menuFilterNode !== 'undefined' && menuFilterNode) {
            const now = audioCtx.currentTime;
            menuFilterNode.frequency.cancelScheduledValues(now);
            menuFilterNode.frequency.setValueAtTime(menuFilterNode.frequency.value, now);
            menuFilterNode.frequency.exponentialRampToValueAtTime(300, now + 1.5);
        }

        // 2. Ẩn Màn hình chính (Start Screen) & Kéo Camera 3D ra xa
        const startScreen = document.getElementById('start-screen');
        if (startScreen) {
            anime({
                targets: startScreen,
                opacity: 0,
                duration: 800,
                easing: 'easeInOutQuad',
                complete: () => startScreen.style.display = 'none'
            });
        }

        if (typeof camera !== 'undefined' && camera) {
            anime({
                targets: camera.position,
                y: camera.position.y + 15,
                z: camera.position.z + 25,
                duration: 3000,
                easing: 'easeInCubic'
            });
        }

        // 3. Hiện Logo và Credit lơ lửng trên nền 3D
        const introOverlay = document.getElementById('intro-overlay');
        if (introOverlay) {
            const startGameBtn = document.getElementById('start-game-btn');
            const introLoadingContainer = document.getElementById('intro-loading-container');
            if (startGameBtn) startGameBtn.style.display = 'none';
            if (introLoadingContainer) introLoadingContainer.style.display = 'none';

            introOverlay.style.display = 'flex';
            introOverlay.style.opacity = 0;
            introOverlay.style.backgroundColor = 'transparent';

            setTimeout(() => {
                anime({
                    targets: introOverlay,
                    opacity: 1,
                    duration: 1500,
                    easing: 'easeInOutQuad',
                    complete: () => {
                        // 4. Fade-out âm thanh
                        if (typeof audioCtx !== 'undefined' && audioCtx && typeof menuGainNode !== 'undefined' && menuGainNode) {
                            const now = audioCtx.currentTime;
                            menuGainNode.gain.cancelScheduledValues(now);
                            menuGainNode.gain.setValueAtTime(menuGainNode.gain.value, now);
                            menuGainNode.gain.linearRampToValueAtTime(0, now + 2.0);
                        } else if (typeof menuAudio !== 'undefined' && menuAudio) {
                            anime({ targets: menuAudio, volume: 0, duration: 2000, easing: 'linear' });
                        }

                        // 5. Màn hình đen dần và kết thúc
                        const blackScreen = document.createElement('div');
                        blackScreen.className = "absolute inset-0 bg-black z-[9999]";
                        blackScreen.style.opacity = 0;
                        document.body.appendChild(blackScreen);

                        anime({
                            targets: blackScreen, opacity: 1, delay: 1000, duration: 2000, easing: 'easeInOutQuad',
                            complete: () => reloadCallback()
                        });
                    }
                });
            }, 1000);
        } else {
            setTimeout(() => reloadCallback(), 2000);
        }
    } else {
        reloadCallback();
    }
}

let gameVolume = localStorage.getItem('gameVolume') !== null ? parseFloat(localStorage.getItem('gameVolume')) : 0.8;
let playSfxVolume = localStorage.getItem('playSfxVolume') !== null ? parseFloat(localStorage.getItem('playSfxVolume')) : 0.8;
let pregameVolume = localStorage.getItem('pregameVolume') !== null ? parseFloat(localStorage.getItem('pregameVolume')) : 0.8;
let sfxVolume = localStorage.getItem('sfxVolume') !== null ? parseFloat(localStorage.getItem('sfxVolume')) : 0.8;
let roundVolume = localStorage.getItem('roundVolume') !== null ? parseFloat(localStorage.getItem('roundVolume')) : 0.2;
let mfxGameOverVolume = localStorage.getItem('mfxGameOverVolume') !== null ? parseFloat(localStorage.getItem('mfxGameOverVolume')) : 0.8;
let uiVolume = localStorage.getItem('uiVolume') !== null ? parseFloat(localStorage.getItem('uiVolume')) : 0.8;
let breakBlockVolume = localStorage.getItem('breakBlockVolume') !== null ? parseFloat(localStorage.getItem('breakBlockVolume')) : 0.8;

let isMenuMuted = localStorage.getItem('isMenuMuted') === 'true';
let isPreviewMuted = localStorage.getItem('isPreviewMuted') === 'true';
let isPlaySfxMuted = localStorage.getItem('isPlaySfxMuted') === 'true';
let isGameMuted = localStorage.getItem('isGameMuted') === 'true';
let isPregameMuted = localStorage.getItem('isPregameMuted') === 'true';
let isSfxMuted = localStorage.getItem('isSfxMuted') === 'true';
let isRoundMuted = localStorage.getItem('isRoundMuted') === 'true';
let isMfxGameOverMuted = localStorage.getItem('isMfxGameOverMuted') === 'true';
let isUiMuted = localStorage.getItem('isUiMuted') === 'true';
let isBreakBlockMuted = localStorage.getItem('isBreakBlockMuted') === 'true';

// Biến nội bộ hỗ trợ tính toán vật lý gạch
let currentTileThickness = 0.1;
let currentBevelEnabled = true;
let currentBevelThickness = 0.05;
let currentBevelSize = 0.05;
let currentBevelSegments = 2;
let surfaceY = 0.2; // Sẽ được cập nhật trong applySettings
let minFloor = 0.95; // Sẽ được cập nhật trong applySettings

// --- LOGIC TẢI FAKE BLOCKS (EXPERIMENTAL) ---
async function loadFakeBlocksLogic() {
    if (document.getElementById('fake-blocks-script')) return;

    if (!navigator.onLine) {
        const isCached = typeof isResourceCached === 'function' ? await isResourceCached('js/fake-blocks.js') : false;
        if (!isCached) {
            if (typeof showCyberModal === 'function') {
                showCyberModal({
                    title: typeof t === 'function' ? t('offline_title') : "OFFLINE",
                    message: typeof t === 'function' ? t('offline_msg_ext') : "Bạn đang ngoại tuyến! Không thể tải tiện ích mở rộng này.",
                    type: 'alert'
                });
            }
            const toggle = document.getElementById('toggle-fake-blocks');
            if (toggle) toggle.checked = false;
            fakeBlocksEnabled = false;
            localStorage.setItem('fakeBlocksEnabled', false);
            return;
        }
    }

    const script = document.createElement('script');
    script.id = 'fake-blocks-script';
    script.src = 'js/fake-blocks.js';
    document.body.appendChild(script);
}

function updateMutuallyExclusiveExtensions() {
    const relaxModeContainer = document.getElementById('relax-mode-container');
    const botAssistContainer = document.getElementById('bot-assist-container');
    const adminAutoplayContainer = document.getElementById('admin-autoplay-container');
    const adminNaturalContainer = document.getElementById('admin-natural-autoplay-container');
    const invertControlsContainer = document.getElementById('invert-controls-container');

    const isAuto = typeof isAutoplay !== 'undefined' && isAutoplay;

    if (relaxModeEnabled || isAuto) {
        if (botAssistContainer) {
            botAssistContainer.style.opacity = '0.4';
            botAssistContainer.style.pointerEvents = 'none';
        }
        if (invertControlsContainer) {
            invertControlsContainer.style.opacity = '0.4';
            invertControlsContainer.style.pointerEvents = 'none';
        }
    } else {
        if (botAssistContainer) {
            botAssistContainer.style.opacity = '1';
            botAssistContainer.style.pointerEvents = 'auto';
        }
        if (invertControlsContainer) {
            invertControlsContainer.style.opacity = '1';
            invertControlsContainer.style.pointerEvents = 'auto';
        }
    }

    if (botAssistEnabled) {
        if (relaxModeContainer) {
            relaxModeContainer.style.opacity = '0.4';
            relaxModeContainer.style.pointerEvents = 'none';
        }
        if (adminAutoplayContainer) {
            adminAutoplayContainer.style.opacity = '0.4';
            adminAutoplayContainer.style.pointerEvents = 'none';
        }
        if (adminNaturalContainer) {
            adminNaturalContainer.style.opacity = '0.4';
            adminNaturalContainer.style.pointerEvents = 'none';
        }
    } else {
        if (relaxModeContainer) {
            relaxModeContainer.style.opacity = '1';
            relaxModeContainer.style.pointerEvents = 'auto';
        }
        if (adminAutoplayContainer) {
            adminAutoplayContainer.style.opacity = '1';
            adminAutoplayContainer.style.pointerEvents = 'auto';
        }
        if (adminNaturalContainer) {
            adminNaturalContainer.style.opacity = '1';
            adminNaturalContainer.style.pointerEvents = 'auto';
        }
    }
}

function unloadFakeBlocksLogic() {
    const script = document.getElementById('fake-blocks-script');
    if (script) script.remove();
    if (typeof window.FakeBlocksManager !== 'undefined') {
        if (typeof window.FakeBlocksManager.destroy === 'function') {
            window.FakeBlocksManager.destroy();
        } else {
            window.FakeBlocksManager.reset();
        }
        window.FakeBlocksManager = undefined;
    }
}

if (fakeBlocksEnabled) loadFakeBlocksLogic();

// --- ÁP DỤNG CÀI ĐẶT ---
function applySettings() {
    if (typeof togglePerfMode !== 'undefined' && togglePerfMode) {
        const prevPerfMode = performanceModeEnabled;
        performanceModeEnabled = togglePerfMode.checked;
        localStorage.setItem('performanceModeEnabled', performanceModeEnabled);

        if (performanceModeEnabled !== prevPerfMode) {
            if (performanceModeEnabled) {
                // Back up current settings before overriding them
                const backup = {
                    graphicsQuality: localStorage.getItem('graphicsQuality') || 'fhd',
                    bgParticlesEnabled: localStorage.getItem('bgParticlesEnabled') !== 'false',
                    antialiasingEnabled: localStorage.getItem('antialiasingEnabled') === 'true',
                    shockwavesEnabled: localStorage.getItem('shockwavesEnabled') !== 'false',
                    visualizerEnabled: localStorage.getItem('visualizerEnabled') === 'true',
                    tileBounceEnabled: localStorage.getItem('tileBounceEnabled') !== 'false',
                    blockShatterEnabled: localStorage.getItem('blockShatterEnabled') !== 'false',
                    ballGlowEnabled: localStorage.getItem('ballGlowEnabled') !== 'false',
                    ballTrailEnabled: localStorage.getItem('ballTrailEnabled') !== 'false',
                    advancedBoundariesEnabled: localStorage.getItem('advancedBoundariesEnabled') !== 'false',
                    tileDetailScale: localStorage.getItem('tileDetailScale') !== null ? parseFloat(localStorage.getItem('tileDetailScale')) : 1.0
                };
                localStorage.setItem('perfModeBackup', JSON.stringify(backup));
            } else {
                // Restore settings from backup
                const backupStr = localStorage.getItem('perfModeBackup');
                if (backupStr) {
                    try {
                        const backup = JSON.parse(backupStr);
                        if (backup.graphicsQuality !== undefined) {
                            localStorage.setItem('graphicsQuality', backup.graphicsQuality);
                            const radio = document.querySelector(`input[name="graphics-quality"][value="${backup.graphicsQuality}"]`);
                            if (radio) radio.checked = true;
                        }
                        if (backup.bgParticlesEnabled !== undefined) {
                            const val = backup.bgParticlesEnabled === true || backup.bgParticlesEnabled === 'true';
                            localStorage.setItem('bgParticlesEnabled', val);
                            if (toggleBgParticles) toggleBgParticles.checked = val;
                        }
                        if (backup.antialiasingEnabled !== undefined) {
                            const val = backup.antialiasingEnabled === true || backup.antialiasingEnabled === 'true';
                            localStorage.setItem('antialiasingEnabled', val);
                            if (toggleAntialiasing) toggleAntialiasing.checked = val;
                        }
                        if (backup.shockwavesEnabled !== undefined) {
                            const val = backup.shockwavesEnabled === true || backup.shockwavesEnabled === 'true';
                            localStorage.setItem('shockwavesEnabled', val);
                            if (toggleShockwaves) toggleShockwaves.checked = val;
                        }
                        if (backup.visualizerEnabled !== undefined) {
                            const val = backup.visualizerEnabled === true || backup.visualizerEnabled === 'true';
                            localStorage.setItem('visualizerEnabled', val);
                            if (toggleVisualizer) toggleVisualizer.checked = val;
                        }
                        if (backup.tileBounceEnabled !== undefined || backup.tileAnimationsEnabled !== undefined) {
                            const val = (backup.tileBounceEnabled !== undefined) ?
                                (backup.tileBounceEnabled === true || backup.tileBounceEnabled === 'true') :
                                (backup.tileAnimationsEnabled === true || backup.tileAnimationsEnabled === 'true');
                            localStorage.setItem('tileBounceEnabled', val);
                            if (toggleTileBounce) toggleTileBounce.checked = val;
                        }
                        if (backup.blockShatterEnabled !== undefined) {
                            const val = backup.blockShatterEnabled === true || backup.blockShatterEnabled === 'true';
                            localStorage.setItem('blockShatterEnabled', val);
                            if (typeof toggleBlockShatter !== 'undefined' && toggleBlockShatter) toggleBlockShatter.checked = val;
                        }
                        const backupBallGlow = backup.ballGlowEnabled !== undefined ? backup.ballGlowEnabled : backup.ballAuraEnabled;
                        if (backupBallGlow !== undefined) {
                            const val = backupBallGlow === true || backupBallGlow === 'true';
                            localStorage.setItem('ballGlowEnabled', val);
                            if (toggleBallGlow) toggleBallGlow.checked = val;
                        }
                        if (backup.ballTrailEnabled !== undefined) {
                            const val = backup.ballTrailEnabled === true || backup.ballTrailEnabled === 'true';
                            localStorage.setItem('ballTrailEnabled', val);
                            if (toggleBallTrail) toggleBallTrail.checked = val;
                        }
                        if (backup.advancedBoundariesEnabled !== undefined) {
                            const val = backup.advancedBoundariesEnabled === true || backup.advancedBoundariesEnabled === 'true';
                            localStorage.setItem('advancedBoundariesEnabled', val);
                            if (typeof toggleAdvancedBoundaries !== 'undefined' && toggleAdvancedBoundaries) toggleAdvancedBoundaries.checked = val;
                        }
                        if (backup.tileDetailScale !== undefined) {
                            const val = parseFloat(backup.tileDetailScale);
                            localStorage.setItem('tileDetailScale', val);
                            if (tileDetailSlider) {
                                tileDetailSlider.value = val;
                                if (tileDetailValue) tileDetailValue.innerText = `${Math.round(val * 100)}%`;
                            }
                        }
                    } catch (e) {
                        console.error('Error parsing performance mode backup:', e);
                    }
                }
            }
        }
    }

    if (performanceModeEnabled) {
        currentGraphicsQuality = 'simple';
        bgParticlesEnabled = false;
        antialiasingEnabled = false;
        shockwavesEnabled = false;
        visualizerEnabled = false;
        tileBounceEnabled = false;
        ballGlowEnabled = false;
        ballTrailEnabled = false;
        advancedBoundariesEnabled = false;
        tileDetailScale = 0.2;

        // Force UI elements to show the disabled/low states
        const simpleRadio = document.querySelector('input[name="graphics-quality"][value="simple"]');
        if (simpleRadio) simpleRadio.checked = true;
        if (toggleBgParticles) toggleBgParticles.checked = false;
        if (toggleAntialiasing) toggleAntialiasing.checked = false;
        if (toggleShockwaves) toggleShockwaves.checked = false;
        if (toggleVisualizer) toggleVisualizer.checked = false;
        const canvasEl = document.getElementById('bg-visualizer');
        if (canvasEl) canvasEl.style.display = 'none';
        if (toggleTileBounce) toggleTileBounce.checked = false;
        if (typeof toggleBlockShatter !== 'undefined' && toggleBlockShatter) toggleBlockShatter.checked = false;
        if (typeof toggleBallGlow !== 'undefined' && toggleBallGlow) toggleBallGlow.checked = false;
        if (typeof toggleBallTrail !== 'undefined' && toggleBallTrail) toggleBallTrail.checked = false;
        if (typeof toggleAdvancedBoundaries !== 'undefined' && toggleAdvancedBoundaries) toggleAdvancedBoundaries.checked = false;
        if (typeof tileDetailSlider !== 'undefined' && tileDetailSlider) {
            tileDetailSlider.value = 0.2;
            if (typeof tileDetailValue !== 'undefined' && tileDetailValue) {
                tileDetailValue.innerText = '20%';
            }
        }

        // Disable elements in UI
        document.querySelectorAll('input[name="graphics-quality"]').forEach(el => el.disabled = true);
        if (toggleBgParticles) toggleBgParticles.disabled = true;
        if (toggleAntialiasing) toggleAntialiasing.disabled = true;
        if (toggleShockwaves) toggleShockwaves.disabled = true;
        if (toggleVisualizer) toggleVisualizer.disabled = true;
        if (toggleTileBounce) toggleTileBounce.disabled = true;
        if (typeof toggleBlockShatter !== 'undefined' && toggleBlockShatter) toggleBlockShatter.disabled = true;
        if (typeof toggleBallGlow !== 'undefined' && toggleBallGlow) toggleBallGlow.disabled = true;
        if (typeof toggleBallTrail !== 'undefined' && toggleBallTrail) toggleBallTrail.disabled = true;
        if (typeof toggleAdvancedBoundaries !== 'undefined' && toggleAdvancedBoundaries) toggleAdvancedBoundaries.disabled = true;
        if (typeof tileDetailSlider !== 'undefined' && tileDetailSlider) tileDetailSlider.disabled = true;

        // Apply visual styling (dim look) to labels except the Performance Mode label and Boundaries label
        const graphicsTab = document.getElementById('tab-graphics');
        if (graphicsTab && typeof togglePerfMode !== 'undefined' && togglePerfMode) {
            graphicsTab.querySelectorAll('label, div.space-y-2, div.space-y-3, div.space-y-4').forEach(el => {
                if (el === togglePerfMode || el.contains(togglePerfMode)) {
                    return;
                }
                if (typeof toggleShowBoundaries !== 'undefined' && toggleShowBoundaries && (el === toggleShowBoundaries || el.contains(toggleShowBoundaries))) {
                    return;
                }
                el.classList.add('opacity-40', 'pointer-events-none');
            });
        }
    } else {
        // Enable elements in UI
        document.querySelectorAll('input[name="graphics-quality"]').forEach(el => el.disabled = false);
        if (toggleBgParticles) toggleBgParticles.disabled = false;
        if (toggleAntialiasing) toggleAntialiasing.disabled = false;
        if (toggleShockwaves) toggleShockwaves.disabled = false;
        if (toggleVisualizer) toggleVisualizer.disabled = false;
        if (toggleTileBounce) toggleTileBounce.disabled = false;
        if (typeof toggleBlockShatter !== 'undefined' && toggleBlockShatter) toggleBlockShatter.disabled = false;
        if (typeof toggleBallGlow !== 'undefined' && toggleBallGlow) toggleBallGlow.disabled = false;
        if (typeof toggleBallTrail !== 'undefined' && toggleBallTrail) toggleBallTrail.disabled = false;
        if (typeof toggleAdvancedBoundaries !== 'undefined' && toggleAdvancedBoundaries) toggleAdvancedBoundaries.disabled = !showBoundariesEnabled;
        if (typeof tileDetailSlider !== 'undefined' && tileDetailSlider) tileDetailSlider.disabled = false;

        // Remove visual styling (opacity/disabled look)
        const graphicsTab = document.getElementById('tab-graphics');
        if (graphicsTab) {
            graphicsTab.querySelectorAll('label, div.space-y-2, div.space-y-3, div.space-y-4').forEach(label => {
                label.classList.remove('opacity-40', 'pointer-events-none');
            });
        }

        // Restore normal values from UI input elements if Performance Mode is NOT active
        const selectedQualityNode = document.querySelector('input[name="graphics-quality"]:checked');
        if (selectedQualityNode) {
            currentGraphicsQuality = selectedQualityNode.value;
            localStorage.setItem('graphicsQuality', currentGraphicsQuality);
        }

        const selectedApiNode = document.querySelector('input[name="graphics-api"]:checked');
        if (selectedApiNode) {
            const oldApi = graphicsAPI;
            graphicsAPI = selectedApiNode.value;
            localStorage.setItem('graphicsAPI', graphicsAPI);
            if (oldApi !== graphicsAPI) {
                if (graphicsAPI === 'webgpu' && !navigator.gpu) {
                    let msgKey = "webgpu_unsupported_msg";
                    let msg = "Trình duyệt hoặc thiết bị của bạn không hỗ trợ WebGPU. Trò chơi sẽ tự động chuyển sang WebGL 2 làm phương án dự phòng.";
                    if (!isSecure && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
                        msgKey = "webgpu_insecure_msg";
                        msg = "WebGPU chỉ được phép hoạt động trên kết nối bảo mật (HTTPS) hoặc localhost. Bạn đang chạy dưới HTTP không bảo mật, do đó WebGPU bị chặn và game sẽ tự động đưa về WebGL 2 làm phương án dự phòng.";
                    } else {
                        msgKey = "webgpu_disabled_msg";
                        msg = "Trình duyệt hoặc card đồ họa của bạn chưa được bật WebGPU (hoặc tính năng Tăng tốc phần cứng - Hardware Acceleration đang tắt). Game sẽ tự động chuyển sang WebGL 2 làm phương án dự phòng.";
                    }
                    if (typeof showCyberModal === 'function') {
                        showCyberModal({
                            title: typeof t === 'function' ? t('webgpu_warning_title') : "CẢNH BÁO WEB-GPU",
                            message: (typeof t === 'function' ? t(msgKey) : msg) + " " + (typeof t === 'function' ? t('msg_confirm_reload') : "Bạn vẫn muốn tiếp tục tải lại trang?"),
                            type: 'confirm',
                            confirmText: typeof t === 'function' ? t('btn_confirm') : "TIẾP TỤC",
                            cancelText: typeof t === 'function' ? t('btn_cancel') : "HỦY",
                            onConfirm: () => {
                                if (typeof playEndSceneAndReload === 'function') {
                                    playEndSceneAndReload(() => location.reload());
                                } else {
                                    location.reload();
                                }
                            },
                            onCancel: () => {
                                const prevRadio = document.querySelector(`input[name="graphics-api"][value="${oldApi}"]`);
                                if (prevRadio) {
                                    prevRadio.checked = true;
                                    graphicsAPI = oldApi;
                                    localStorage.setItem('graphicsAPI', oldApi);
                                    applySettings();
                                }
                            }
                        });
                        return;
                    }
                }

                if (typeof showCyberModal === 'function') {
                    showCyberModal({
                        title: typeof t === 'function' ? t('graphics_api_change_title') : "THAY ĐỔI API ĐỒ HỌA",
                        message: typeof t === 'function' ? t('graphics_api_change_desc') : "Thay đổi API đồ họa đòi hỏi tải lại trang để áp dụng. Tải lại ngay?",
                        type: 'confirm',
                        confirmText: typeof t === 'function' ? t('btn_confirm') : "TIẾP TỤC",
                        cancelText: typeof t === 'function' ? t('btn_cancel') : "HỦY",
                        onConfirm: () => {
                            if (typeof playEndSceneAndReload === 'function') {
                                playEndSceneAndReload(() => location.reload());
                            } else {
                                location.reload();
                            }
                        },
                        onCancel: () => {
                            const prevRadio = document.querySelector(`input[name="graphics-api"][value="${oldApi}"]`);
                            if (prevRadio) {
                                prevRadio.checked = true;
                                graphicsAPI = oldApi;
                                localStorage.setItem('graphicsAPI', oldApi);
                                applySettings();
                            }
                        }
                    });
                } else {
                    if (typeof playEndSceneAndReload === 'function') {
                        playEndSceneAndReload(() => location.reload());
                    } else {
                        location.reload();
                    }
                }
            }
        }

    }

    // Gọi các hàm khởi tạo lại từ game.js nếu đã tồn tại
    if (typeof updatePixelRatio === 'function') updatePixelRatio();
    if (typeof initParticles === 'function') initParticles();
    if (typeof createBall === 'function') createBall();

    const oldTileThickness = currentTileThickness;
    const oldBevelEnabled = currentBevelEnabled;
    const oldLimit = limitBeatmapAudioCount;
    const oldTileDetailScale = tileDetailScale;

    const oldGlowHeight = currentGlowHeight;
    if (currentGraphicsQuality === 'simple') {
        currentTileThickness = 0.05;
        currentBevelEnabled = false;
        currentBevelThickness = 0;
        currentBevelSize = 0;
        currentBevelSegments = 0;
        currentGlowHeight = 0;
    } else if (currentGraphicsQuality === 'hd') {
        currentTileThickness = 0.15;
        currentBevelEnabled = true;
        currentBevelThickness = 0.03;
        currentBevelSize = 0.03;
        currentBevelSegments = 1;
        currentGlowHeight = 0.75;
    } else if (currentGraphicsQuality === 'fhd') {
        currentTileThickness = 0.2;
        currentBevelEnabled = true;
        currentBevelThickness = 0.05;
        currentBevelSize = 0.05;
        currentBevelSegments = 2;
        currentGlowHeight = 1.5;
    } else if (currentGraphicsQuality === 'qhd') {
        currentTileThickness = 0.25;
        currentBevelEnabled = true;
        currentBevelThickness = 0.07;
        currentBevelSize = 0.07;
        currentBevelSegments = 3;
        currentGlowHeight = 1.75;
    } else if (currentGraphicsQuality === 'uhd') {
        currentTileThickness = 0.3;
        currentBevelEnabled = true;
        currentBevelThickness = 0.1;
        currentBevelSize = 0.1;
        currentBevelSegments = 4;
        currentGlowHeight = 2.0;
    }

    if (typeof tileDetailSlider !== 'undefined' && tileDetailSlider && !performanceModeEnabled) {
        tileDetailScale = parseFloat(tileDetailSlider.value);
        localStorage.setItem('tileDetailScale', tileDetailScale);
        if (typeof tileDetailValue !== 'undefined' && tileDetailValue) {
            tileDetailValue.innerText = `${Math.round(tileDetailScale * 100)}%`;
        }
    }

    if (oldTileThickness !== currentTileThickness || oldBevelEnabled !== currentBevelEnabled || oldTileDetailScale !== tileDetailScale || oldGlowHeight !== currentGlowHeight) {
        if (cachedTileGeo) cachedTileGeo.dispose();
        cachedTileGeo = null;
        if (cachedCenterGeo) cachedCenterGeo.dispose();
        cachedCenterGeo = null;
        if (typeof cachedBorderGeo !== 'undefined' && cachedBorderGeo) cachedBorderGeo.dispose();
        if (typeof cachedBorderGeo !== 'undefined') cachedBorderGeo = null;
        if (typeof cachedGlowGeo !== 'undefined' && cachedGlowGeo) {
            cachedGlowGeo.dispose();
            cachedGlowGeo = null;
        }
        if (typeof cachedShockwaveGeo !== 'undefined' && cachedShockwaveGeo) {
            cachedShockwaveGeo.dispose();
            cachedShockwaveGeo = null;
        }
        if (typeof cachedDiamondShockwaveGeo !== 'undefined' && cachedDiamondShockwaveGeo) {
            cachedDiamondShockwaveGeo.dispose();
            cachedDiamondShockwaveGeo = null;
        }
        if (typeof shockwavePool !== 'undefined') {
            shockwavePool.forEach(mesh => {
                if (mesh.geometry) mesh.geometry.dispose();
                if (mesh.material) mesh.material.dispose();
            });
            shockwavePool.length = 0;
        }
        if (typeof diamondShockwavePool !== 'undefined') {
            diamondShockwavePool.forEach(mesh => {
                if (mesh.geometry) mesh.geometry.dispose();
                if (mesh.material) mesh.material.dispose();
            });
            diamondShockwavePool.length = 0;
        }

        const initialDetailScale = typeof tileDetailScale !== 'undefined' ? parseFloat(tileDetailScale) : 1.0;
        const initialBevelEnabled = currentBevelEnabled && (initialDetailScale >= 0.3);
        const initialBevelThickness = initialBevelEnabled ? currentBevelThickness * Math.min(1.0, initialDetailScale) : 0;

        const rawApiValY = localStorage.getItem('graphicsAPI') || 'webgl';
        const isWebGPUModeY = (rawApiValY === 'd2ViZ3B1' || rawApiValY === 'webgpu');

        surfaceY = isWebGPUModeY ? (currentTileThickness / 2 + initialBevelThickness) : (currentTileThickness / 2);
        minFloor = surfaceY + ballRadius;

        // Re-calculate geometry nếu game.js đã load helper
        if (typeof createRoundedRectShape === 'function') {
            const tileShape = createRoundedRectShape(tileWidth, tileLength, 0.8);

            let baseCurve = 12;
            if (currentGraphicsQuality === 'simple') baseCurve = 2;
            else if (currentGraphicsQuality === 'hd') baseCurve = 6;
            else if (currentGraphicsQuality === 'fhd') baseCurve = 12;
            else if (currentGraphicsQuality === 'qhd') baseCurve = 18;
            else if (currentGraphicsQuality === 'uhd') baseCurve = 24;

            const detailScale = typeof tileDetailScale !== 'undefined' ? tileDetailScale : 1.0;
            const bevelEnabled = currentBevelEnabled && (detailScale >= 0.3);

            const extrudeSettings = {
                depth: currentTileThickness,
                bevelEnabled: bevelEnabled,
                bevelThickness: currentBevelThickness * Math.min(1.0, detailScale),
                bevelSize: currentBevelSize * Math.min(1.0, detailScale),
                bevelSegments: Math.max(0, Math.round(currentBevelSegments * detailScale)),
                curveSegments: Math.max(1, Math.round(baseCurve * detailScale))
            };
            cachedTileGeo = new THREE.ExtrudeGeometry(tileShape, extrudeSettings);
            cachedTileGeo.center();

            if (typeof cachedBorderGeo !== 'undefined') {
                const borderThickness = 0.25;
                const borderShape = createRoundedRectShape(tileWidth + borderThickness, tileLength + borderThickness, 0.8 + borderThickness / 2);
                const borderHole = createRoundedRectShape(tileWidth - borderThickness, tileLength - borderThickness, Math.max(0, 0.8 - borderThickness / 2));
                borderShape.holes.push(borderHole);

                cachedBorderGeo = new THREE.ShapeGeometry(borderShape, Math.max(1, Math.round(baseCurve * detailScale)));
            }

            const centerSegments = Math.max(8, Math.round(32 * detailScale));
            cachedCenterGeo = new THREE.CircleGeometry(tileWidth * 0.18, centerSegments);

            // Re-calculate glow geometry if needed
            if (isGlowEnabled()) {
                if (typeof cachedGlowGeo !== 'undefined' && cachedGlowGeo) {
                    cachedGlowGeo.dispose();
                    cachedGlowGeo = null;
                }
                const glowHeight = getCurrentGlowHeight();
                const tileShape = createRoundedRectShape(tileWidth, tileLength, 0.8);
                let baseCurve = currentGraphicsQuality === 'simple' ? 2 : (currentGraphicsQuality === 'hd' ? 6 : (currentGraphicsQuality === 'fhd' ? 12 : (currentGraphicsQuality === 'qhd' ? 18 : 24)));
                const glowExtrudeSettings = {
                    depth: glowHeight,
                    bevelEnabled: false,
                    curveSegments: Math.max(1, Math.round(baseCurve * detailScale))
                };
                cachedGlowGeo = new THREE.ExtrudeGeometry(tileShape, glowExtrudeSettings);
                cachedGlowGeo.center();
            }

            const rawApiVal = localStorage.getItem('graphicsAPI') || 'webgl';
            const isWebGPUMode = (rawApiVal === 'd2ViZ3B1' || rawApiVal === 'webgpu');

            const updateMesh = (t) => {
                t.geometry = cachedTileGeo;
                const detailScale = typeof tileDetailScale !== 'undefined' ? tileDetailScale : 1.0;
                const bevelEnabled = currentBevelEnabled && (detailScale >= 0.3);
                const actualBevelThickness = bevelEnabled ? currentBevelThickness * Math.min(1.0, detailScale) : 0;
                const surfaceZ = isWebGPUMode
                    ? (currentTileThickness / 2 + actualBevelThickness)
                    : (currentTileThickness / 2);

                const border = t.getObjectByName("borderLine") || (t.userData && t.userData.borderLine);
                if (border) {
                    if (typeof cachedBorderGeo !== 'undefined' && cachedBorderGeo) border.geometry = cachedBorderGeo;
                    border.position.z = surfaceZ + 0.01;
                }
                const center = t.getObjectByName("centerMesh") || (t.userData && t.userData.centerMesh);
                if (center) {
                    center.geometry = cachedCenterGeo;
                    center.position.z = surfaceZ + 0.015;
                }

                // Cập nhật dải sáng (Glow Mesh) — chung cho cả hai loại
                let glow = t.getObjectByName("glowMesh") || (t.userData && t.userData.glowMesh);
                const glowEnabled = isGlowEnabled();
                if (glowEnabled) {
                    const glowHeight = getCurrentGlowHeight();
                    if (!glow) {
                        initGlowMaterials();
                        const isFake = (t.userData && t.userData.isFake === true);
                        const tileGlowMat = createTileGlowMaterial(t.userData.themeColor || 0x00ffff);
                        if (tileGlowMat.uniforms) {
                            tileGlowMat.uniforms.opacityMultiplier.value = isFake ? 0.3 : 1.0;
                            tileGlowMat.uniforms.glowHeight.value = glowHeight;
                        } else {
                            tileGlowMat.opacity = isFake ? 0.08 : 0.85;
                        }
                        glow = new THREE.Mesh(cachedGlowGeo, [capMaterial, tileGlowMat]);
                        glow.name = "glowMesh";
                        t.add(glow);
                        t.userData.glowMesh = glow;
                    } else {
                        glow.visible = true;
                        glow.geometry = cachedGlowGeo;
                        const isFake = (t.userData && t.userData.isFake === true);
                        const glowMat = Array.isArray(glow.material) ? glow.material[1] : glow.material;
                        if (glowMat) {
                            if (glowMat.uniforms) {
                                glowMat.uniforms.opacityMultiplier.value = isFake ? 0.3 : 1.0;
                                glowMat.uniforms.glowHeight.value = glowHeight;
                            } else {
                                glowMat.opacity = isFake ? 0.08 : 0.85;
                            }
                        }
                    }
                    const bevelOffset = ((typeof currentBevelEnabled !== 'undefined' && currentBevelEnabled) ? currentBevelThickness : 0);
                    glow.position.z = -currentTileThickness / 2 - bevelOffset - glowHeight / 2;
                } else {
                    if (glow) {
                        glow.visible = false;
                    }
                }

                if (!isPlaying && typeof ball !== 'undefined' && ball) ball.position.y = minFloor;
            };

            tiles.forEach(updateMesh);
            tilePool.forEach(updateMesh);

            if (typeof window.FakeBlocksManager !== 'undefined') {
                if (window.FakeBlocksManager.fakeTiles) window.FakeBlocksManager.fakeTiles.forEach(updateMesh);
                if (window.FakeBlocksManager.fakeTilePool) window.FakeBlocksManager.fakeTilePool.forEach(updateMesh);
            }
        }
    }

    // Toggle effects
    if (toggleShockwaves && !performanceModeEnabled) {
        shockwavesEnabled = toggleShockwaves.checked;
        localStorage.setItem('shockwavesEnabled', shockwavesEnabled);
    }
    if (toggleAntialiasing && !performanceModeEnabled) {
        antialiasingEnabled = toggleAntialiasing.checked;
        localStorage.setItem('antialiasingEnabled', antialiasingEnabled);
    }
    if (toggleDynamicColors) {
        dynamicColorsEnabled = toggleDynamicColors.checked;
        localStorage.setItem('dynamicColorsEnabled', dynamicColorsEnabled);
    }
    if (toggleVisualizer && !performanceModeEnabled) {
        visualizerEnabled = toggleVisualizer.checked;
        localStorage.setItem('visualizerEnabled', visualizerEnabled);
        const canvasEl = document.getElementById('bg-visualizer');
        if (canvasEl) {
            canvasEl.style.display = visualizerEnabled ? 'block' : 'none';
        }
    }
    if (toggleTileBounce && !performanceModeEnabled) {
        tileBounceEnabled = toggleTileBounce.checked;
        localStorage.setItem('tileBounceEnabled', tileBounceEnabled);
    }
    if (typeof toggleBlockShatter !== 'undefined' && toggleBlockShatter && !performanceModeEnabled) {
        blockShatterEnabled = toggleBlockShatter.checked;
        localStorage.setItem('blockShatterEnabled', blockShatterEnabled);
    }
    if (typeof toggleUiAnimations !== 'undefined' && toggleUiAnimations) {
        uiAnimationsEnabled = toggleUiAnimations.checked;
        localStorage.setItem('uiAnimationsEnabled', uiAnimationsEnabled);
    }
    if (uiAnimationsEnabled) {
        document.body.classList.remove('disable-animations');
    } else {
        document.body.classList.add('disable-animations');
    }
    if (typeof toggleBallGlow !== 'undefined' && toggleBallGlow && !performanceModeEnabled) {
        ballGlowEnabled = toggleBallGlow.checked;
        localStorage.setItem('ballGlowEnabled', ballGlowEnabled);
    }
    if (typeof toggleBallTrail !== 'undefined' && toggleBallTrail && !performanceModeEnabled) {
        ballTrailEnabled = toggleBallTrail.checked;
        localStorage.setItem('ballTrailEnabled', ballTrailEnabled);
    }
    if (typeof toggleShowBoundaries !== 'undefined' && toggleShowBoundaries) {
        showBoundariesEnabled = toggleShowBoundaries.checked;
        localStorage.setItem('showBoundariesEnabled', showBoundariesEnabled);

        // Khi tắt Track Boundary -> Tự động vô hiệu hóa và làm mờ Boundary nâng cao
        const labelAdv = document.getElementById('label-advanced-boundaries');
        if (typeof toggleAdvancedBoundaries !== 'undefined' && toggleAdvancedBoundaries) {
            if (!showBoundariesEnabled) {
                toggleAdvancedBoundaries.disabled = true;
                if (labelAdv) labelAdv.classList.add('opacity-40', 'pointer-events-none');
            } else if (!performanceModeEnabled) {
                toggleAdvancedBoundaries.disabled = false;
                if (labelAdv) labelAdv.classList.remove('opacity-40', 'pointer-events-none');
            }
        }
    }
    if (typeof toggleAdvancedBoundaries !== 'undefined' && toggleAdvancedBoundaries && !performanceModeEnabled) {
        advancedBoundariesEnabled = toggleAdvancedBoundaries.checked;
        localStorage.setItem('advancedBoundariesEnabled', advancedBoundariesEnabled);
    }
    if (typeof updateBoundariesVisibility === 'function') updateBoundariesVisibility();
    if (spawnAnimationSelect) {
        const oldMode = spawnAnimationMode;
        spawnAnimationMode = spawnAnimationSelect.value;
        localStorage.setItem('spawnAnimationMode', spawnAnimationMode);
        if (spawnAnimationMode === 'none' && oldMode !== 'none') {
            if (typeof tiles !== 'undefined' && Array.isArray(tiles)) {
                tiles.forEach(tile => {
                    if (tile && tile.userData && tile.userData.isEntering) {
                        if (tile.userData.targetZ !== undefined) {
                            tile.position.z = tile.userData.targetZ;
                        }
                        tile.userData.isEntering = false;
                    }
                });
            }
            if (typeof window.FakeBlocksManager !== 'undefined' && window.FakeBlocksManager && window.FakeBlocksManager.fakeTiles) {
                window.FakeBlocksManager.fakeTiles.forEach(ft => {
                    if (ft && ft.userData && ft.userData.isEntering) {
                        if (ft.userData.targetZ !== undefined) {
                            ft.position.z = ft.userData.targetZ;
                        }
                        ft.userData.isEntering = false;
                    }
                });
            }
        }
    }
    if (typeof limitBeatmapAudioSelect !== 'undefined' && limitBeatmapAudioSelect) {
        limitBeatmapAudioCount = parseInt(limitBeatmapAudioSelect.value);
        localStorage.setItem('limitBeatmapAudioCount', limitBeatmapAudioCount);
        if (limitBeatmapAudioCount !== oldLimit) {
            if (typeof evictCacheIfNeeded === 'function') {
                evictCacheIfNeeded();
            }
        }
    }
    if (toggleBgParticles && !performanceModeEnabled) {
        bgParticlesEnabled = toggleBgParticles.checked;
        localStorage.setItem('bgParticlesEnabled', bgParticlesEnabled);
        if (starField) starField.visible = bgParticlesEnabled;
    }

    // Sliders
    if (sensitivitySlider) {
        sensitivity = parseFloat(sensitivitySlider.value);
        localStorage.setItem('sensitivity', sensitivity);
        if (sensitivityValueSpan) sensitivityValueSpan.innerText = `${sensitivity.toFixed(1)}x`;
    }
    if (blocksAheadSlider) {
        blocksAheadLimit = parseInt(blocksAheadSlider.value);
        localStorage.setItem('blocksAheadLimit', blocksAheadLimit);
        if (blocksAheadValue) blocksAheadValue.innerText = blocksAheadLimit;
    }
    if (blocksBehindSlider) {
        blocksBehindLimit = parseInt(blocksBehindSlider.value);
        localStorage.setItem('blocksBehindLimit', blocksBehindLimit);
        if (blocksBehindValue) blocksBehindValue.innerText = blocksBehindLimit;
    }
    if (maxFpsSlider) {
        maxFps = parseInt(maxFpsSlider.value);
        localStorage.setItem('maxFps', maxFps);
        if (maxFpsValue) {
            if (maxFps === 0) {
                maxFpsValue.innerText = typeof t === 'function' ? t('max_fps_unlimited') : 'Không giới hạn';
            } else if (maxFps === 361) {
                maxFpsValue.innerText = typeof t === 'function' ? t('max_fps_vsync') : 'Vs thiết bị';
            } else if (maxFps === 362) {
                maxFpsValue.innerText = typeof t === 'function' ? t('max_fps_eco') : 'Eco (60 FPS)';
            } else {
                maxFpsValue.innerText = `${maxFps} FPS`;
            }
        }
    }
    updateObjectPoolingLimits();
    if (toggleRelativePC) {
        isRelativePC = toggleRelativePC.checked;
        localStorage.setItem('isRelativePC', isRelativePC);
    }
    if (typeof toggleRawInput !== 'undefined' && toggleRawInput) {
        rawInputEnabled = toggleRawInput.checked;
        localStorage.setItem('rawInputEnabled', rawInputEnabled);
    }

    // Audio volumes
    if (menuVolumeSlider) {
        menuVolume = parseFloat(menuVolumeSlider.value);
        localStorage.setItem('menuVolume', menuVolume);
        if (menuVolumeValue) menuVolumeValue.innerText = Math.round(menuVolume * 100) + '%';
        const targetVol = isMenuMuted ? 0 : menuVolume;
        if (menuGainNode && audioCtx) {
            if (typeof currentPreviewIndex === 'undefined' || currentPreviewIndex === -1) {
                menuGainNode.gain.setTargetAtTime(targetVol, audioCtx.currentTime, 0.05);
            }
        }
    }
    if (typeof previewVolumeSlider !== 'undefined' && previewVolumeSlider) {
        previewVolume = parseFloat(previewVolumeSlider.value);
        localStorage.setItem('previewVolume', previewVolume);
        if (typeof previewVolumeValue !== 'undefined' && previewVolumeValue) previewVolumeValue.innerText = Math.round(previewVolume * 100) + '%';
        const targetVol = isPreviewMuted ? 0 : previewVolume;
        if (typeof previewGainNode !== 'undefined' && previewGainNode && typeof audioCtx !== 'undefined' && audioCtx) {
            if (typeof currentPreviewIndex !== 'undefined' && currentPreviewIndex !== -1) {
                previewGainNode.gain.setTargetAtTime(targetVol, audioCtx.currentTime, 0.05);
            }
        }
    }
    if (gameVolumeSlider) {
        gameVolume = parseFloat(gameVolumeSlider.value);
        localStorage.setItem('gameVolume', gameVolume);
        if (gameVolumeValue) gameVolumeValue.innerText = Math.round(gameVolume * 100) + '%';
        const targetVol = isGameMuted ? 0 : gameVolume;
        if (gainNode && audioCtx) gainNode.gain.setTargetAtTime(targetVol, audioCtx.currentTime, 0.05);

        // Update low volume warning dynamically if overlay is visible
        const lowVolWarn = document.getElementById('low-volume-warning');
        if (lowVolWarn) {
            const isMuted = typeof isGameMuted !== 'undefined' && isGameMuted;
            const tapToPlayOverlay = document.getElementById('tap-to-play-overlay');
            const isOverlayVisible = tapToPlayOverlay && tapToPlayOverlay.style.display === 'flex';
            if (isOverlayVisible && (isMuted || gameVolume < 0.2)) {
                lowVolWarn.classList.remove('hidden');
                lowVolWarn.onclick = (e) => {
                    e.stopPropagation();
                    if (typeof window.restoreGameVolume === 'function') {
                        window.restoreGameVolume();
                    }
                };
            } else {
                lowVolWarn.classList.add('hidden');
            }
        }
    }
    if (sfxVolumeSlider) {
        sfxVolume = parseFloat(sfxVolumeSlider.value);
        localStorage.setItem('sfxVolume', sfxVolume);
        if (sfxVolumeValue) sfxVolumeValue.innerText = Math.round(sfxVolume * 100) + '%';
        const targetVol = isSfxMuted ? 0 : sfxVolume;
        if (sfxGainNode && audioCtx) {
            sfxGainNode.gain.setTargetAtTime(targetVol, audioCtx.currentTime, 0.05);
        } else if (typeof clickAudio !== 'undefined' && clickAudio) {
            clickAudio.volume = targetVol;
        }
    }
    if (typeof playSfxVolumeSlider !== 'undefined' && playSfxVolumeSlider) {
        playSfxVolume = parseFloat(playSfxVolumeSlider.value);
        localStorage.setItem('playSfxVolume', playSfxVolume);
        if (typeof playSfxVolumeValue !== 'undefined' && playSfxVolumeValue) playSfxVolumeValue.innerText = Math.round(playSfxVolume * 100) + '%';
        const targetVol = isPlaySfxMuted ? 0 : playSfxVolume;
        if (typeof playSfxGainNode !== 'undefined' && playSfxGainNode && typeof audioCtx !== 'undefined' && audioCtx) {
            playSfxGainNode.gain.setTargetAtTime(targetVol, audioCtx.currentTime, 0.05);
        } else if (typeof playAudio !== 'undefined' && playAudio) {
            playAudio.volume = targetVol;
        }
    }
    if (typeof pregameVolumeSlider !== 'undefined' && pregameVolumeSlider) {
        pregameVolume = parseFloat(pregameVolumeSlider.value);
        localStorage.setItem('pregameVolume', pregameVolume);
        if (typeof pregameVolumeValue !== 'undefined' && pregameVolumeValue) pregameVolumeValue.innerText = Math.round(pregameVolume * 100) + '%';
        const targetVol = isPregameMuted ? 0 : pregameVolume;
        if (typeof pregameGainNode !== 'undefined' && pregameGainNode && typeof audioCtx !== 'undefined' && audioCtx) {
            pregameGainNode.gain.setTargetAtTime(targetVol, audioCtx.currentTime, 0.05);
        } else if (typeof pregameAudio !== 'undefined' && pregameAudio) {
            pregameAudio.volume = targetVol;
        }
    }
    if (roundVolumeSlider) {
        roundVolume = parseFloat(roundVolumeSlider.value);
        localStorage.setItem('roundVolume', roundVolume);
        if (roundVolumeValue) roundVolumeValue.innerText = Math.round(roundVolume * 100) + '%';
        const targetVol = isRoundMuted ? 0 : roundVolume;
        if (roundGainNode && audioCtx) roundGainNode.gain.setTargetAtTime(targetVol, audioCtx.currentTime, 0.05);
    }
    if (typeof mfxGameOverVolumeSlider !== 'undefined' && mfxGameOverVolumeSlider) {
        mfxGameOverVolume = parseFloat(mfxGameOverVolumeSlider.value);
        localStorage.setItem('mfxGameOverVolume', mfxGameOverVolume);
        if (typeof mfxGameOverVolumeValue !== 'undefined' && mfxGameOverVolumeValue) mfxGameOverVolumeValue.innerText = Math.round(mfxGameOverVolume * 100) + '%';
        const targetVol = isMfxGameOverMuted ? 0 : mfxGameOverVolume;
        if (typeof mfxGameOverGainNode !== 'undefined' && mfxGameOverGainNode && typeof audioCtx !== 'undefined' && audioCtx) {
            mfxGameOverGainNode.gain.setTargetAtTime(targetVol, audioCtx.currentTime, 0.05);
        }
    }
    if (uiVolumeSlider) {
        uiVolume = parseFloat(uiVolumeSlider.value);
        localStorage.setItem('uiVolume', uiVolume);
        if (uiVolumeValue) uiVolumeValue.innerText = Math.round(uiVolume * 100) + '%';
        const targetVol = isUiMuted ? 0 : uiVolume;
        if (uiGainNode && audioCtx) uiGainNode.gain.setTargetAtTime(targetVol, audioCtx.currentTime, 0.05);
    }
    if (typeof breakBlockVolumeSlider !== 'undefined' && breakBlockVolumeSlider) {
        breakBlockVolume = parseFloat(breakBlockVolumeSlider.value);
        localStorage.setItem('breakBlockVolume', breakBlockVolume);
        if (typeof breakBlockVolumeValue !== 'undefined' && breakBlockVolumeValue) {
            breakBlockVolumeValue.innerText = Math.round(breakBlockVolume * 100) + '%';
        }
        const targetVol = isBreakBlockMuted ? 0 : breakBlockVolume;
        if (typeof breakBlockGainNode !== 'undefined' && breakBlockGainNode && typeof audioCtx !== 'undefined' && audioCtx) {
            breakBlockGainNode.gain.setTargetAtTime(targetVol, audioCtx.currentTime, 0.05);
        } else if (typeof breakBlockAudios !== 'undefined' && breakBlockAudios) {
            breakBlockAudios.forEach(audioObj => {
                audioObj.volume = targetVol;
            });
        }
    }

    if (typeof togglePreservePitch !== 'undefined' && togglePreservePitch) {
        preservePitchEnabled = togglePreservePitch.checked;
        localStorage.setItem('preservePitchEnabled', preservePitchEnabled);
        if (typeof audio !== 'undefined' && audio) {
            audio.preservesPitch = preservePitchEnabled;
            audio.mozPreservesPitch = preservePitchEnabled;
            audio.webkitPreservesPitch = preservePitchEnabled;
        }
    }

    // UI Radio Styling
    const radioQualityLabels = graphicsQualityOptions.querySelectorAll('label');
    radioQualityLabels.forEach(label => {
        const input = label.querySelector('input');
        const span = label.querySelector('span');
        if (input.checked) {
            label.classList.add('border-cyan-400', 'shadow-[0_0_10px_rgba(6,182,212,0.1)]');
            label.classList.remove('border-cyan-500/20');
            span.classList.add('text-cyan-400');
            span.classList.remove('text-gray-300');
        } else {
            label.classList.remove('border-cyan-400', 'shadow-[0_0_10px_rgba(6,182,212,0.1)]');
            label.classList.add('border-cyan-500/20');
            span.classList.remove('text-cyan-400');
            span.classList.add('text-gray-300');
        }
    });

    if (typeof graphicsApiOptions !== 'undefined' && graphicsApiOptions) {
        const radioApiLabels = graphicsApiOptions.querySelectorAll('label');
        radioApiLabels.forEach(label => {
            const input = label.querySelector('input');
            const span = label.querySelector('span');
            if (input.checked) {
                label.classList.add('border-cyan-400', 'shadow-[0_0_10px_rgba(6,182,212,0.1)]');
                label.classList.remove('border-cyan-500/20');
                span.classList.add('text-cyan-400');
                span.classList.remove('text-gray-300');
            } else {
                label.classList.remove('border-cyan-400', 'shadow-[0_0_10px_rgba(6,182,212,0.1)]');
                label.classList.add('border-cyan-500/20');
                span.classList.remove('text-cyan-400');
                span.classList.add('text-gray-300');
            }
        });
    }


    // Kích cỡ chữ hiển thị
    const panelSettings = document.getElementById('panel-settings');
    if (panelSettings) {
        panelSettings.classList.remove('theme-font-small', 'theme-font-medium', 'theme-font-large', 'theme-font-xlarge');
        panelSettings.classList.add('theme-font-' + settingsFontSize);
    }
    const panelHome = document.getElementById('panel-home');
    if (panelHome) {
        panelHome.classList.remove('theme-font-small', 'theme-font-medium', 'theme-font-large', 'theme-font-xlarge');
        panelHome.classList.add('theme-font-' + settingsFontSize);
    }

    if (typeof window.adjustTabsKerning === 'function') {
        window.adjustTabsKerning();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    function updateMuteButtonUI(btn, isMuted) {
        if (!btn) return;
        const iconUnmuted = btn.querySelector('.icon-unmuted');
        const iconMuted = btn.querySelector('.icon-muted');
        if (isMuted) {
            if (iconUnmuted) iconUnmuted.classList.add('hidden');
            if (iconMuted) iconMuted.classList.remove('hidden');
        } else {
            if (iconUnmuted) iconUnmuted.classList.remove('hidden');
            if (iconMuted) iconMuted.classList.add('hidden');
        }
    }

    window.restoreGameVolume = function () {
        gameVolume = 0.8;
        isGameMuted = false;
        localStorage.setItem('gameVolume', gameVolume);
        localStorage.setItem('isGameMuted', false);

        const gameVolumeSlider = document.getElementById('game-volume-slider');
        const gameVolumeValue = document.getElementById('game-volume-value');
        if (gameVolumeSlider) {
            gameVolumeSlider.value = 0.8;
            if (gameVolumeValue) gameVolumeValue.innerText = '80%';
        }

        const qsVol = document.getElementById('qs-game-vol');
        const qsVolVal = document.getElementById('qs-game-vol-val');
        if (qsVol) {
            qsVol.value = 0.8;
            if (qsVolVal) qsVolVal.innerText = '80%';
        }

        const btnMuteGame = document.getElementById('btn-mute-game');
        if (btnMuteGame) {
            updateMuteButtonUI(btnMuteGame, false);
        }

        if (typeof applySettings === 'function') applySettings();

        const lowVolWarn = document.getElementById('low-volume-warning');
        if (lowVolWarn) lowVolWarn.classList.add('hidden');
    };

    const toggleFakeBlocks = document.getElementById('toggle-fake-blocks');
    if (toggleFakeBlocks) {
        toggleFakeBlocks.checked = fakeBlocksEnabled;
        toggleFakeBlocks.addEventListener('change', (e) => {
            fakeBlocksEnabled = e.target.checked;
            localStorage.setItem('fakeBlocksEnabled', fakeBlocksEnabled);

            if (fakeBlocksEnabled) {
                loadFakeBlocksLogic();
            } else {
                unloadFakeBlocksLogic();
            }
        });
    }

    const toggleRelaxMode = document.getElementById('toggle-relax-mode');
    if (toggleRelaxMode) {
        toggleRelaxMode.checked = relaxModeEnabled;
        if (typeof autoplayIndicator !== 'undefined' && autoplayIndicator) {
            if (relaxModeEnabled) autoplayIndicator.classList.remove('hidden');
            else autoplayIndicator.classList.add('hidden');
        }
        toggleRelaxMode.addEventListener('change', (e) => {
            relaxModeEnabled = e.target.checked;
            localStorage.setItem('relaxModeEnabled', relaxModeEnabled);
            if (typeof isNaturalAutoplay !== 'undefined') {
                isNaturalAutoplay = relaxModeEnabled;
            }
            if (typeof autoplayIndicator !== 'undefined' && autoplayIndicator) {
                if (relaxModeEnabled) autoplayIndicator.classList.remove('hidden');
                else autoplayIndicator.classList.add('hidden');
            }
            if (relaxModeEnabled && typeof isAutoplay !== 'undefined' && isAutoplay) {
                isAutoplay = false;
                const adminAutoplayToggle = document.getElementById('admin-autoplay-toggle');
                if (adminAutoplayToggle) adminAutoplayToggle.checked = false;
            }
            const natToggle = document.getElementById('admin-natural-autoplay-toggle');
            if (natToggle) natToggle.checked = relaxModeEnabled;

            if (relaxModeEnabled && typeof invertControlsEnabled !== 'undefined' && invertControlsEnabled) {
                invertControlsEnabled = false;
                localStorage.setItem('invertControlsEnabled', false);
                const toggleInvertControls = document.getElementById('toggle-invert-controls');
                if (toggleInvertControls) toggleInvertControls.checked = false;
            }

            updateMutuallyExclusiveExtensions();
        });
    }

    const toggleBotAssist = document.getElementById('toggle-bot-assist');
    if (toggleBotAssist) {
        toggleBotAssist.checked = botAssistEnabled;
        toggleBotAssist.addEventListener('change', (e) => {
            botAssistEnabled = e.target.checked;
            localStorage.setItem('botAssistEnabled', botAssistEnabled);
            updateMutuallyExclusiveExtensions();
        });
    }

    const toggleInvertControls = document.getElementById('toggle-invert-controls');
    if (toggleInvertControls) {
        toggleInvertControls.checked = invertControlsEnabled;
        toggleInvertControls.addEventListener('change', (e) => {
            invertControlsEnabled = e.target.checked;
            localStorage.setItem('invertControlsEnabled', invertControlsEnabled);
            updateMutuallyExclusiveExtensions();
        });
    }

    updateMutuallyExclusiveExtensions();

    if (typeof togglePreservePitch !== 'undefined' && togglePreservePitch) {
        togglePreservePitch.addEventListener('change', applySettings);
    }

    const toggleSwAutoUpdate = document.getElementById('toggle-sw-auto-update');
    if (toggleSwAutoUpdate) {
        toggleSwAutoUpdate.checked = swAutoUpdateEnabled;
        toggleSwAutoUpdate.addEventListener('change', (e) => {
            swAutoUpdateEnabled = e.target.checked;
            localStorage.setItem('swAutoUpdateEnabled', swAutoUpdateEnabled);
        });
    }

    const toggleAutoFullscreen = document.getElementById('toggle-auto-fullscreen');
    if (toggleAutoFullscreen) {
        toggleAutoFullscreen.checked = autoFullscreenEnabled;
        toggleAutoFullscreen.addEventListener('change', (e) => {
            autoFullscreenEnabled = e.target.checked;
            localStorage.setItem('autoFullscreenEnabled', autoFullscreenEnabled);
        });
    }

    const toggleShowFps = document.getElementById('toggle-show-fps');
    const fpsHud = document.getElementById('fps-hud');
    if (fpsHud) {
        if (showFpsEnabled) {
            fpsHud.classList.remove('hidden');
        } else {
            fpsHud.classList.add('hidden');
        }
    }
    if (toggleShowFps) {
        toggleShowFps.checked = showFpsEnabled;
        toggleShowFps.addEventListener('change', (e) => {
            showFpsEnabled = e.target.checked;
            localStorage.setItem('showFpsEnabled', showFpsEnabled);
            if (fpsHud) {
                if (showFpsEnabled) {
                    fpsHud.classList.remove('hidden');
                } else {
                    fpsHud.classList.add('hidden');
                }
            }
        });
    }

    // Event Listeners cho Settings UI
    if (typeof togglePerfMode !== 'undefined' && togglePerfMode) togglePerfMode.addEventListener('change', applySettings);

    const fontSizeSelect = document.getElementById('settings-font-size-select');
    if (fontSizeSelect) {
        fontSizeSelect.value = settingsFontSize;
        fontSizeSelect.addEventListener('change', (e) => {
            settingsFontSize = e.target.value;
            localStorage.setItem('settingsFontSize', settingsFontSize);
            applySettings();
        });
    }
    if (graphicsQualityOptions) {
        graphicsQualityOptions.addEventListener('change', (e) => {
            const targetVal = e.target.value;
            if ((targetVal === 'qhd' || targetVal === 'uhd') && targetVal !== currentGraphicsQuality) {
                if (typeof showCyberModal === 'function') {
                    showCyberModal({
                        title: typeof t === 'function' ? t('perf_warning_title') : "CẢNH BÁO HIỆU NĂNG",
                        message: typeof t === 'function' ? t('perf_warning_desc') : 'Lựa chọn chất lượng đồ họa cực cao <strong class="text-cyan-400 font-bold">(QHD/UHD)</strong> yêu cầu cấu hình thiết bị <strong class="text-yellow-400 font-bold">rất mạnh</strong>.<br>Thiết bị của bạn có thể bị <strong class="text-pink-400 font-bold">sụt giảm hiệu năng</strong> (giật lag, sụt khung hình) hoặc <strong class="text-pink-400 font-bold">nóng lên nhanh chóng</strong>.<br><br><span class="text-cyan-300 font-bold">Bạn có chắc chắn muốn tiếp tục?</span>',
                        type: 'confirm',
                        confirmText: typeof t === 'function' ? t('btn_confirm') : "TIẾP TỤC",
                        cancelText: typeof t === 'function' ? t('btn_cancel') : "HỦY",
                        onConfirm: () => {
                            applySettings();
                        },
                        onCancel: () => {
                            const prevRadio = document.querySelector(`input[name="graphics-quality"][value="${currentGraphicsQuality}"]`);
                            if (prevRadio) {
                                prevRadio.checked = true;
                                applySettings();
                            }
                        }
                    });
                } else {
                    applySettings();
                }
            } else {
                applySettings();
            }
        });
    }
    if (typeof graphicsApiOptions !== 'undefined' && graphicsApiOptions) {
        graphicsApiOptions.addEventListener('change', applySettings);
    }
    if (toggleShockwaves) toggleShockwaves.addEventListener('change', applySettings);
    if (toggleRelativePC) toggleRelativePC.addEventListener('change', applySettings);
    if (typeof toggleRawInput !== 'undefined' && toggleRawInput) toggleRawInput.addEventListener('change', applySettings);
    if (toggleAntialiasing) toggleAntialiasing.addEventListener('change', applySettings);
    if (toggleDynamicColors) toggleDynamicColors.addEventListener('change', applySettings);
    if (toggleVisualizer) toggleVisualizer.addEventListener('change', applySettings);
    if (toggleTileBounce) toggleTileBounce.addEventListener('change', applySettings);
    if (typeof toggleBlockShatter !== 'undefined' && toggleBlockShatter) toggleBlockShatter.addEventListener('change', applySettings);
    if (typeof toggleUiAnimations !== 'undefined' && toggleUiAnimations) toggleUiAnimations.addEventListener('change', applySettings);
    if (spawnAnimationSelect) spawnAnimationSelect.addEventListener('change', applySettings);
    if (typeof limitBeatmapAudioSelect !== 'undefined' && limitBeatmapAudioSelect) limitBeatmapAudioSelect.addEventListener('change', applySettings);
    if (typeof toggleBallTrail !== 'undefined' && toggleBallTrail) toggleBallTrail.addEventListener('change', applySettings);
    if (typeof toggleShowBoundaries !== 'undefined' && toggleShowBoundaries) toggleShowBoundaries.addEventListener('change', applySettings);
    if (typeof toggleAdvancedBoundaries !== 'undefined' && toggleAdvancedBoundaries) toggleAdvancedBoundaries.addEventListener('change', applySettings);
    if (typeof toggleBallGlow !== 'undefined' && toggleBallGlow) toggleBallGlow.addEventListener('change', applySettings);
    if (toggleBgParticles) toggleBgParticles.addEventListener('change', applySettings);
    if (sensitivitySlider) sensitivitySlider.addEventListener('input', applySettings);
    if (typeof tileDetailSlider !== 'undefined' && tileDetailSlider) tileDetailSlider.addEventListener('input', applySettings);
    if (blocksAheadSlider) blocksAheadSlider.addEventListener('input', applySettings);
    if (blocksBehindSlider) blocksBehindSlider.addEventListener('input', applySettings);
    if (maxFpsSlider) {
        maxFpsSlider.addEventListener('input', applySettings);
        maxFpsSlider.addEventListener('change', (e) => {
            const val = parseInt(e.target.value);
            if (val >= 1 && val < 30) {
                if (typeof showCyberModal === 'function') {
                    showCyberModal({
                        title: typeof t === 'function' ? t('low_fps_warning_title') : "CẢNH BÁO FPS THẤP",
                        message: typeof t === 'function' ? t('low_fps_warning_desc') : "Chơi dưới 30 FPS có thể gây giật lag và cảm giác khó chịu. Bạn vẫn muốn tiếp tục?",
                        type: 'confirm',
                        confirmText: typeof t === 'function' ? t('btn_confirm') : "TIẾP TỤC",
                        cancelText: typeof t === 'function' ? t('btn_cancel') : "HỦY",
                        onConfirm: () => {
                            // Keep the selected value
                        },
                        onCancel: () => {
                            // Revert to 0 (Unlimited)
                            maxFpsSlider.value = 0;
                            maxFpsSlider.dispatchEvent(new Event('input'));
                            applySettings();
                        }
                    });
                }
            }
        });
    }
    if (menuVolumeSlider) menuVolumeSlider.addEventListener('input', applySettings);
    if (typeof playSfxVolumeSlider !== 'undefined' && playSfxVolumeSlider) playSfxVolumeSlider.addEventListener('input', applySettings);
    if (typeof pregameVolumeSlider !== 'undefined' && pregameVolumeSlider) pregameVolumeSlider.addEventListener('input', applySettings);
    if (typeof previewVolumeSlider !== 'undefined' && previewVolumeSlider) previewVolumeSlider.addEventListener('input', applySettings);
    if (sfxVolumeSlider) sfxVolumeSlider.addEventListener('input', applySettings);
    if (roundVolumeSlider) roundVolumeSlider.addEventListener('input', applySettings);
    if (typeof mfxGameOverVolumeSlider !== 'undefined' && mfxGameOverVolumeSlider) mfxGameOverVolumeSlider.addEventListener('input', applySettings);
    if (uiVolumeSlider) uiVolumeSlider.addEventListener('input', applySettings);
    if (typeof breakBlockVolumeSlider !== 'undefined' && breakBlockVolumeSlider) breakBlockVolumeSlider.addEventListener('input', applySettings);
    if (gameVolumeSlider) gameVolumeSlider.addEventListener('input', applySettings);

    const btnMuteMenu = document.getElementById('btn-mute-menu');
    if (btnMuteMenu) {
        updateMuteButtonUI(btnMuteMenu, isMenuMuted);
        btnMuteMenu.addEventListener('click', () => {
            isMenuMuted = !isMenuMuted;
            localStorage.setItem('isMenuMuted', isMenuMuted);
            updateMuteButtonUI(btnMuteMenu, isMenuMuted);
            applySettings();
            updateMuteAllUI();
        });
    }

    const btnMutePreview = document.getElementById('btn-mute-preview');
    if (btnMutePreview) {
        updateMuteButtonUI(btnMutePreview, isPreviewMuted);
        btnMutePreview.addEventListener('click', () => {
            isPreviewMuted = !isPreviewMuted;
            localStorage.setItem('isPreviewMuted', isPreviewMuted);
            updateMuteButtonUI(btnMutePreview, isPreviewMuted);
            applySettings();
            updateMuteAllUI();
        });
    }

    const btnMutePlaySfx = document.getElementById('btn-mute-play-sfx');
    if (btnMutePlaySfx) {
        updateMuteButtonUI(btnMutePlaySfx, isPlaySfxMuted);
        btnMutePlaySfx.addEventListener('click', () => {
            isPlaySfxMuted = !isPlaySfxMuted;
            localStorage.setItem('isPlaySfxMuted', isPlaySfxMuted);
            updateMuteButtonUI(btnMutePlaySfx, isPlaySfxMuted);
            applySettings();
            updateMuteAllUI();
        });
    }

    const btnMutePregame = document.getElementById('btn-mute-pregame');
    if (btnMutePregame) {
        updateMuteButtonUI(btnMutePregame, isPregameMuted);
        btnMutePregame.addEventListener('click', () => {
            isPregameMuted = !isPregameMuted;
            localStorage.setItem('isPregameMuted', isPregameMuted);
            updateMuteButtonUI(btnMutePregame, isPregameMuted);
            applySettings();
            updateMuteAllUI();
        });
    }

    const btnMuteGame = document.getElementById('btn-mute-game');
    if (btnMuteGame) {
        updateMuteButtonUI(btnMuteGame, isGameMuted);
        btnMuteGame.addEventListener('click', () => {
            isGameMuted = !isGameMuted;
            localStorage.setItem('isGameMuted', isGameMuted);
            updateMuteButtonUI(btnMuteGame, isGameMuted);
            applySettings();
            updateMuteAllUI();
        });
    }

    const btnMuteRound = document.getElementById('btn-mute-round');
    if (btnMuteRound) {
        updateMuteButtonUI(btnMuteRound, isRoundMuted);
        btnMuteRound.addEventListener('click', () => {
            isRoundMuted = !isRoundMuted;
            localStorage.setItem('isRoundMuted', isRoundMuted);
            updateMuteButtonUI(btnMuteRound, isRoundMuted);
            applySettings();
            updateMuteAllUI();
        });
    }

    const btnMuteSfx = document.getElementById('btn-mute-sfx');
    if (btnMuteSfx) {
        updateMuteButtonUI(btnMuteSfx, isSfxMuted);
        btnMuteSfx.addEventListener('click', () => {
            isSfxMuted = !isSfxMuted;
            localStorage.setItem('isSfxMuted', isSfxMuted);
            updateMuteButtonUI(btnMuteSfx, isSfxMuted);
            applySettings();
            updateMuteAllUI();
        });
    }

    const btnMuteMfxGameOver = document.getElementById('btn-mute-mfx-game-over');
    if (btnMuteMfxGameOver) {
        updateMuteButtonUI(btnMuteMfxGameOver, isMfxGameOverMuted);
        btnMuteMfxGameOver.addEventListener('click', () => {
            isMfxGameOverMuted = !isMfxGameOverMuted;
            localStorage.setItem('isMfxGameOverMuted', isMfxGameOverMuted);
            updateMuteButtonUI(btnMuteMfxGameOver, isMfxGameOverMuted);
            applySettings();
            updateMuteAllUI();
        });
    }

    const btnMuteUi = document.getElementById('btn-mute-ui');
    if (btnMuteUi) {
        updateMuteButtonUI(btnMuteUi, isUiMuted);
        btnMuteUi.addEventListener('click', () => {
            isUiMuted = !isUiMuted;
            localStorage.setItem('isUiMuted', isUiMuted);
            updateMuteButtonUI(btnMuteUi, isUiMuted);
            applySettings();
            updateMuteAllUI();
        });
    }

    const btnMuteBreakBlock = document.getElementById('btn-mute-break-block');
    if (btnMuteBreakBlock) {
        updateMuteButtonUI(btnMuteBreakBlock, isBreakBlockMuted);
        btnMuteBreakBlock.addEventListener('click', () => {
            isBreakBlockMuted = !isBreakBlockMuted;
            localStorage.setItem('isBreakBlockMuted', isBreakBlockMuted);
            updateMuteButtonUI(btnMuteBreakBlock, isBreakBlockMuted);
            applySettings();
            updateMuteAllUI();
        });
    }

    const btnMuteAll = document.getElementById('btn-mute-all');
    function updateMuteAllUI() {
        if (!btnMuteAll) return;
        const allMuted = isMenuMuted && isPreviewMuted && isGameMuted && isRoundMuted && isSfxMuted && isUiMuted && isPlaySfxMuted && isPregameMuted && isMfxGameOverMuted && isBreakBlockMuted;
        if (allMuted) {
            btnMuteAll.classList.replace('text-red-400', 'text-gray-400');
            btnMuteAll.classList.replace('border-red-500/50', 'border-gray-500/50');
            btnMuteAll.innerHTML = `<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072M17.657 6.343a8 8 0 010 11.314M11 5L6 9H2v6h4l5 4V5z"/></svg><span data-i18n="unmute_all">${typeof t === 'function' ? t('unmute_all') : 'UNMUTE ALL'}</span>`;
        } else {
            btnMuteAll.classList.replace('text-gray-400', 'text-red-400');
            btnMuteAll.classList.replace('border-gray-500/50', 'border-red-500/50');
            btnMuteAll.innerHTML = `<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"/></svg><span data-i18n="mute_all">${typeof t === 'function' ? t('mute_all') : 'MUTE ALL'}</span>`;
        }
    }

    if (btnMuteAll) {
        btnMuteAll.addEventListener('click', () => {
            const allMuted = isMenuMuted && isPreviewMuted && isGameMuted && isRoundMuted && isSfxMuted && isUiMuted && isPlaySfxMuted && isPregameMuted && isMfxGameOverMuted && isBreakBlockMuted;
            const newState = !allMuted;

            isMenuMuted = newState;
            isPreviewMuted = newState;
            isPlaySfxMuted = newState;
            isPregameMuted = newState;
            isGameMuted = newState;
            isRoundMuted = newState;
            isSfxMuted = newState;
            isMfxGameOverMuted = newState;
            isUiMuted = newState;
            isBreakBlockMuted = newState;

            localStorage.setItem('isMenuMuted', isMenuMuted);
            localStorage.setItem('isPreviewMuted', isPreviewMuted);
            localStorage.setItem('isPlaySfxMuted', isPlaySfxMuted);
            localStorage.setItem('isPregameMuted', isPregameMuted);
            localStorage.setItem('isGameMuted', isGameMuted);
            localStorage.setItem('isRoundMuted', isRoundMuted);
            localStorage.setItem('isSfxMuted', isSfxMuted);
            localStorage.setItem('isMfxGameOverMuted', isMfxGameOverMuted);
            localStorage.setItem('isUiMuted', isUiMuted);
            localStorage.setItem('isBreakBlockMuted', isBreakBlockMuted);

            updateMuteButtonUI(document.getElementById('btn-mute-menu'), isMenuMuted);
            updateMuteButtonUI(document.getElementById('btn-mute-preview'), isPreviewMuted);
            updateMuteButtonUI(document.getElementById('btn-mute-play-sfx'), isPlaySfxMuted);
            updateMuteButtonUI(document.getElementById('btn-mute-pregame'), isPregameMuted);
            updateMuteButtonUI(document.getElementById('btn-mute-game'), isGameMuted);
            updateMuteButtonUI(document.getElementById('btn-mute-round'), isRoundMuted);
            updateMuteButtonUI(document.getElementById('btn-mute-sfx'), isSfxMuted);
            updateMuteButtonUI(document.getElementById('btn-mute-mfx-game-over'), isMfxGameOverMuted);
            updateMuteButtonUI(document.getElementById('btn-mute-ui'), isUiMuted);
            updateMuteButtonUI(document.getElementById('btn-mute-break-block'), isBreakBlockMuted);

            updateMuteAllUI();
            applySettings();
        });
        updateMuteAllUI();
    }

    if (typeof updateDataBtn !== 'undefined' && updateDataBtn) {
        updateDataBtn.addEventListener('click', () => {
            if (typeof showCyberModal === 'function') {
                showCyberModal({
                    message: t('msg_update'),
                    type: 'confirm',
                    onConfirm: () => {
                        playEndSceneAndReload(() => {
                            window.location.href = window.location.href.split('?')[0] + '?t=' + new Date().getTime();
                        });
                    }
                });
            }
        });
    }

    // Các sự kiện cho nút Storage được quản lý tập trung bởi StorageManager (storage-manager.js)

    if (refreshDataBtn) {
        refreshDataBtn.addEventListener('click', () => {
            if (typeof showCyberModal === 'function') {
                showCyberModal({
                    message: t('msg_reset'),
                    type: 'confirm',
                    onConfirm: async () => {
                        localStorage.clear();
                        if (window.indexedDB) {
                            indexedDB.deleteDatabase("MagicHopDB");
                        }
                        if (typeof clearAllCache === 'function') {
                            await clearAllCache();
                        }
                        if ('serviceWorker' in navigator) {
                            try {
                                const registrations = await navigator.serviceWorker.getRegistrations();
                                for (let registration of registrations) {
                                    await registration.unregister();
                                }
                            } catch (e) { }
                        }

                        playEndSceneAndReload(() => {
                            location.reload();
                        });
                    }
                });
            }
        });
    }

    // Gắn sự kiện cho nút cài đặt App trong Setting
    const installAppBtn = document.getElementById('install-app-btn');
    if (installAppBtn) {
        installAppBtn.addEventListener('click', () => {
            if (typeof showPWAInstallGuide === 'function') showPWAInstallGuide();
        });
    }

    const checkAppUpdateBtn = document.getElementById('check-app-update-btn');
    if (checkAppUpdateBtn) {
        checkAppUpdateBtn.addEventListener('click', () => {
            if (typeof manualCheckForUpdate === 'function') manualCheckForUpdate();
        });
    }

    // Gắn sự kiện cho nút Xóa Kỷ Lục Cục Bộ
    const resetLocalHighscoresBtn = document.getElementById('reset-local-highscores-btn');
    if (resetLocalHighscoresBtn) {
        resetLocalHighscoresBtn.addEventListener('click', () => {
            if (typeof showCyberModal === 'function') {
                showCyberModal({
                    message: typeof t === 'function' ? t('msg_reset_local_highscores_confirm') : '⚠️ Xóa toàn bộ kỷ lục Best Score lưu cục bộ?\n\nHành động này sẽ xóa điểm cao của tất cả bài hát khỏi thiết bị này. Điểm trên server (nếu đã đăng nhập) sẽ KHÔNG bị ảnh hưởng.',
                    type: 'confirm',
                    onConfirm: async () => {
                        try {
                            // 1. Xóa store highScores trong IndexedDB
                            await new Promise((resolve, reject) => {
                                const request = indexedDB.open('MagicHopDB', 2);
                                request.onsuccess = (e) => {
                                    const db = e.target.result;
                                    if (db.objectStoreNames.contains('highScores')) {
                                        const tx = db.transaction('highScores', 'readwrite');
                                        const store = tx.objectStore('highScores');
                                        store.clear();
                                        tx.oncomplete = () => { db.close(); resolve(); };
                                        tx.onerror = () => { db.close(); reject(tx.error); };
                                    } else {
                                        db.close(); resolve();
                                    }
                                };
                                request.onerror = () => reject(request.error);
                            });

                            // 2. Xóa các key bestScore_* trong localStorage (nếu có)
                            const keysToRemove = [];
                            for (let i = 0; i < localStorage.length; i++) {
                                const key = localStorage.key(i);
                                if (key && (key.startsWith('bestScore') || key.startsWith('highScore') || key.startsWith('best_score'))) {
                                    keysToRemove.push(key);
                                }
                            }
                            keysToRemove.forEach(k => localStorage.removeItem(k));

                            // 3. Reset UI bestScoreLabel nếu đang hiển thị
                            const bestScoreLabelEl = document.getElementById('best-score-label');
                            if (bestScoreLabelEl) bestScoreLabelEl.innerText = '0';

                            if (typeof showCyberModal === 'function') {
                                const successMsg = typeof t === 'function' ? t('msg_reset_local_highscores_success') : '✅ Đã xóa toàn bộ kỷ lục cục bộ thành công!';
                                showCyberModal({ message: `${successMsg}\n(Đã xóa ${keysToRemove.length + 1} mục dữ liệu)`, type: 'info' });
                            }
                        } catch (err) {
                            console.error('[Settings] Lỗi xóa kỷ lục:', err);
                            if (typeof showCyberModal === 'function') {
                                showCyberModal({ message: `❌ Không thể xóa kỷ lục: ${err.message}`, type: 'info' });
                            }
                        }
                    }
                });
            }
        });
    }
});

async function renderStorageList() {
    const listContainer = document.getElementById('storage-songs-list');
    if (!listContainer) return;

    listContainer.innerHTML = `<div class="text-[10px] text-gray-500 italic py-2 text-center" data-i18n="msg_loading_cached_list">${typeof t === 'function' ? t('msg_loading_cached_list') : 'Đang kiểm tra bộ nhớ...'}</div>`;

    try {
        // 1. Thu thập tất cả các danh mục bài hát từ RAM playlist, playlistSource, và IndexedDB/OPFS public_playlist
        const candidates = [];
        if (typeof playlist !== 'undefined' && Array.isArray(playlist)) {
            candidates.push(...playlist);
        }
        if (typeof playlistSource !== 'undefined' && Array.isArray(playlistSource)) {
            candidates.push(...playlistSource);
        }
        if (typeof getCachedPlaylistFromDB === 'function') {
            try {
                const cachedMaps = await getCachedPlaylistFromDB();
                if (Array.isArray(cachedMaps)) {
                    candidates.push(...cachedMaps);
                }
            } catch (e) { }
        }

        // Lọc trùng lặp danh mục theo URL hoặc LazyURL
        const catalog = [];
        const seenUrls = new Set();

        candidates.forEach(raw => {
            if (!raw) return;
            const songUrl = raw.url || raw.file_url || raw.audioUrl || '';
            const jsonUrl = raw.lazyUrl || raw.beatmapUrl || raw.file_url || '';
            const key = songUrl || jsonUrl;
            if (key && !seenUrls.has(key)) {
                seenUrls.add(key);
                catalog.push({
                    id: raw.id,
                    name: raw.name || raw.title || 'Chưa rõ tên',
                    artist: raw.artist || 'Chưa rõ nghệ sĩ',
                    url: songUrl,
                    lazyUrl: jsonUrl
                });
            }
        });

        const cachedItems = [];
        const matchedOpfsFiles = new Set();
        const matchedIdbKeys = new Set();

        // 2. Kiểm tra trạng thái cache thực tế cho tất cả bài hát trong danh mục
        for (const song of catalog) {
            const audioPromise = song.url && typeof isAudioCached === 'function' ? isAudioCached(song.url) : Promise.resolve(false);
            const jsonPromise = song.lazyUrl && typeof isJsonCached === 'function' ? isJsonCached(song.lazyUrl) : Promise.resolve(false);

            const [hasAudio, hasJson] = await Promise.all([audioPromise, jsonPromise]);

            if (hasAudio || hasJson) {
                cachedItems.push({
                    song,
                    hasAudio,
                    hasJson
                });
                if (song.url) {
                    if (typeof urlToFilename === 'function') {
                        matchedOpfsFiles.add(urlToFilename(song.url));
                    }
                    matchedIdbKeys.add(song.url);
                }
            }
        }

        // 3. Quét trực tiếp thư mục OPFS audio để tìm các file nhạc chưa được map trong catalog
        if (typeof navigator !== 'undefined' && navigator.storage && typeof navigator.storage.getDirectory === 'function') {
            try {
                const root = await navigator.storage.getDirectory();
                try {
                    const audioDirHandle = await root.getDirectoryHandle('audio', { create: false });
                    for await (const entry of audioDirHandle.values()) {
                        if (entry.kind === 'file' && !matchedOpfsFiles.has(entry.name)) {
                            let cleanName = decodeURIComponent(entry.name).replace(/[*"\/\\<>:|?]/g, ' ');
                            if (cleanName.includes('.')) cleanName = cleanName.substring(0, cleanName.lastIndexOf('.'));
                            if (cleanName.length > 45) cleanName = cleanName.substring(0, 45) + '...';

                            cachedItems.push({
                                song: {
                                    name: cleanName || 'File nhạc OPFS',
                                    artist: 'Bộ nhớ OPFS',
                                    url: entry.name,
                                    lazyUrl: null,
                                    isRawFileName: true
                                },
                                hasAudio: true,
                                hasJson: false
                            });
                        }
                    }
                } catch (e) { }
            } catch (e) { }
        }

        // 4. Quét trực tiếp IndexedDB audio_cache store để tìm các key nhạc chưa được map
        if (typeof getDB === 'function') {
            try {
                const db = await getDB();
                if (db && db.objectStoreNames.contains('audio_cache')) {
                    const tx = db.transaction('audio_cache', 'readonly');
                    const store = tx.objectStore('audio_cache');
                    const keys = await new Promise((resolve) => {
                        const req = store.getAllKeys();
                        req.onsuccess = () => resolve(req.result || []);
                        req.onerror = () => resolve([]);
                    });

                    keys.forEach(urlKey => {
                        if (typeof urlKey === 'string' && !matchedIdbKeys.has(urlKey)) {
                            let cleanName = urlKey.split('/').pop() || urlKey;
                            if (cleanName.includes('?')) cleanName = cleanName.split('?')[0];
                            cleanName = decodeURIComponent(cleanName);

                            cachedItems.push({
                                song: {
                                    name: cleanName,
                                    artist: 'Bộ nhớ IndexedDB',
                                    url: urlKey,
                                    lazyUrl: null
                                },
                                hasAudio: true,
                                hasJson: false
                            });
                        }
                    });
                }
            } catch (e) { }
        }

        // Cập nhật tiêu đề hiển thị tổng số bài hát đã tải
        const titleSpan = document.querySelector('[data-i18n="cached_songs_list_title"]');
        if (titleSpan) {
            const baseTitle = typeof t === 'function' ? t('cached_songs_list_title') : 'Danh sách bài hát đã tải';
            titleSpan.textContent = `${baseTitle} (${cachedItems.length})`;
        }

        if (cachedItems.length === 0) {
            listContainer.innerHTML = `<div class="text-[10px] text-gray-500 italic py-2 text-center" data-i18n="msg_no_cached_songs">${typeof t === 'function' ? t('msg_no_cached_songs') : 'Không có bài hát nào được lưu ngoại tuyến.'}</div>`;
            return;
        }

        listContainer.innerHTML = '';

        cachedItems.forEach(item => {
            const { song, hasAudio, hasJson } = item;
            const itemDiv = document.createElement('div');
            itemDiv.className = "flex items-center justify-between p-2 rounded bg-cyan-950/10 border border-cyan-500/10 hover:border-cyan-500/30 transition-all";

            let details = [];
            if (hasAudio) details.push("Nhạc");
            if (hasJson) details.push("Beatmap");
            const detailsText = details.join(" + ");

            itemDiv.innerHTML = `
                <div class="flex flex-col min-w-0 flex-1 pr-2">
                    <span class="text-[10px] font-bold text-gray-200 truncate font-orbitron">${song.name}</span>
                    <span class="text-[8px] text-gray-400 truncate">${song.artist || 'Chưa rõ nghệ sĩ'} (${detailsText})</span>
                </div>
                <button class="shrink-0 p-1.5 rounded bg-red-950/20 border border-red-500/20 hover:bg-red-900/30 hover:border-red-400 text-red-400 transition-all cursor-pointer delete-cached-song-btn">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                </button>
            `;

            // Gắn sự kiện xóa cache cho bài hát
            const deleteBtn = itemDiv.querySelector('.delete-cached-song-btn');
            deleteBtn.addEventListener('click', async () => {
                if (typeof showCyberModal === 'function') {
                    showCyberModal({
                        title: typeof t === 'function' ? t('btn_delete_cache') : "XÓA BỘ NHỚ ĐỆM",
                        message: (typeof t === 'function' ? t('msg_confirm_delete_song_cache') : 'Bạn có chắc chắn muốn xóa bộ nhớ đệm của bài hát "{name}" không?').replace('{name}', song.name),
                        type: 'confirm',
                        onConfirm: async () => {
                            if (song.isRawFileName) {
                                try {
                                    const root = await navigator.storage.getDirectory();
                                    const dir = await root.getDirectoryHandle('audio', { create: false });
                                    await dir.removeEntry(song.url);
                                } catch (e) { }
                            } else if (typeof deleteSongCache === 'function') {
                                await deleteSongCache(song.url, song.lazyUrl);
                            }

                            // Re-render storage list & update storage statistics bar
                            renderStorageList();
                            if (window.StorageManager && typeof window.StorageManager.updateStorageUI === 'function') {
                                window.StorageManager.updateStorageUI();
                            }
                            if (typeof renderSongList === 'function') {
                                renderSongList();
                            }
                        }
                    });
                }
            });

            listContainer.appendChild(itemDiv);
        });
    } catch (err) {
        console.error('[StorageManager] Lỗi renderStorageList:', err);
        listContainer.innerHTML = `<div class="text-[10px] text-red-400 italic py-2 text-center">Lỗi tải danh sách nhạc đã lưu.</div>`;
    }
}
window.renderStorageList = renderStorageList;
window.renderStorageSongsList = renderStorageList;

// Listen to storage event to reactively update showHitboxEnabled when toggled in admin panel
window.addEventListener('storage', (e) => {
    if (e.key === 'showHitboxEnabled') {
        showHitboxEnabled = JSON.parse(e.newValue) === true;
        if (typeof tiles !== 'undefined' && Array.isArray(tiles)) {
            tiles.forEach(tile => {
                if (tile.userData && tile.userData.hitboxMesh) {
                    tile.userData.hitboxMesh.visible = showHitboxEnabled;
                }
            });
        }
    }
});

// ============================================================
//  SETTINGS SEARCH — Tìm kiếm cài đặt đa ngôn ngữ
// ============================================================

(function initSettingsSearch() {
    // Đợi DOM sẵn sàng trước khi index
    function setup() {
        const searchInput = document.getElementById('settings-search-input');
        const searchClear = document.getElementById('settings-search-clear');
        const resultsPanel = document.getElementById('settings-search-results');
        const tabContents = document.getElementById('settings-tab-contents');
        const tabsContainer = document.querySelector('.settings-tabs-container');
        if (!searchInput || !resultsPanel || !tabContents) return;

        // ---- Hàm lấy tất cả text có thể search từ một element ----
        function getSearchableText(el) {
            const texts = [];
            // Lấy text thuần từ innerText
            texts.push(el.innerText || el.textContent || '');
            // Lấy thêm từ tất cả i18n keys trong el (để hỗ trợ đa ngôn ngữ)
            el.querySelectorAll('[data-i18n]').forEach(node => {
                const key = node.getAttribute('data-i18n');
                // Thêm giá trị của key trong TẤT CẢ ngôn ngữ đã load
                if (typeof dict !== 'undefined') {
                    Object.values(dict).forEach(langDict => {
                        if (langDict && langDict[key]) texts.push(langDict[key]);
                    });
                }
                // Thêm key bản thân (để search theo tên kỹ thuật)
                texts.push(key.replace(/_/g, ' '));
            });
            return texts.join(' ').toLowerCase();
        }

        // ---- Index tất cả setting item wrappers (trừ tab-account) ----
        // Mỗi wrapper là một direct child div của tab-pane (không phải tab-account)
        let indexedItems = [];

        function buildIndex() {
            indexedItems = [];
            const tabPanes = tabContents.querySelectorAll('.tab-pane:not(#tab-account)');
            tabPanes.forEach(pane => {
                // Tìm tab button tương ứng
                const tabId = pane.id;
                const tabBtn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
                const tabName = tabBtn ? (tabBtn.innerText || tabBtn.textContent || tabId) : tabId;

                // Mỗi direct div child là một setting group
                const groups = pane.children;
                Array.from(groups).forEach(group => {
                    if (group.tagName !== 'DIV' && group.tagName !== 'LABEL') return;
                    const searchText = getSearchableText(group);
                    indexedItems.push({ el: group, tabName, tabId, searchText });
                });
            });
        }

        // ---- Highlight query trong text ----
        function highlight(text, query) {
            if (!query) return text;
            const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            return text.replace(new RegExp(`(${escaped})`, 'gi'),
                '<mark class="bg-cyan-400/30 text-cyan-200 rounded px-0.5">$1</mark>');
        }

        // ---- Render kết quả tìm kiếm ----
        function renderResults(query) {
            resultsPanel.innerHTML = '';
            const q = query.trim().toLowerCase();

            if (!q) {
                // Ẩn kết quả, hiện tab contents + tab bar
                resultsPanel.classList.add('hidden');
                tabContents.classList.remove('hidden');
                if (tabsContainer) tabsContainer.classList.remove('hidden');
                searchClear.classList.add('hidden');
                return;
            }

            // Hiện kết quả, ẩn tab contents + tab bar
            resultsPanel.classList.remove('hidden');
            tabContents.classList.add('hidden');
            if (tabsContainer) tabsContainer.classList.add('hidden');
            searchClear.classList.remove('hidden');

            // Đảm bảo index đã được build
            if (indexedItems.length === 0) buildIndex();

            const matches = indexedItems.filter(item => item.searchText.includes(q));

            if (matches.length === 0) {
                const emptyEl = document.createElement('div');
                emptyEl.className = 'py-8 text-center text-xs text-gray-600 font-orbitron';
                emptyEl.setAttribute('data-i18n', 'settings_search_no_results');
                emptyEl.textContent = typeof t === 'function'
                    ? t('settings_search_no_results')
                    : 'Không tìm thấy cài đặt nào.';
                resultsPanel.appendChild(emptyEl);
                return;
            }

            // Group theo tab
            const grouped = {};
            matches.forEach(item => {
                if (!grouped[item.tabId]) {
                    grouped[item.tabId] = { tabName: item.tabName, items: [] };
                }
                grouped[item.tabId].items.push(item);
            });

            Object.values(grouped).forEach(group => {
                // Tab label
                const tabLabel = document.createElement('div');
                tabLabel.className = 'text-[9px] font-bold font-orbitron text-cyan-500/60 uppercase tracking-widest px-1 pt-2 pb-1';
                tabLabel.textContent = group.tabName.toUpperCase();
                resultsPanel.appendChild(tabLabel);

                group.items.forEach(item => {
                    // Clone element
                    const clone = item.el.cloneNode(true);
                    // Bao trong wrapper với border
                    const wrapper = document.createElement('div');
                    wrapper.className = 'border border-cyan-500/10 rounded-lg bg-black/20 px-3 py-2 hover:border-cyan-500/30 transition-colors';
                    wrapper.appendChild(clone);

                    // Đồng bộ giá trị/trạng thái và nhãn hiển thị của clone từ bản gốc
                    function syncCloneFromOriginal() {
                        const cloneInputs = Array.from(clone.querySelectorAll('input, select'));
                        const originalInputs = Array.from(item.el.querySelectorAll('input, select'));
                        cloneInputs.forEach((ci, idx) => {
                            const oi = originalInputs[idx];
                            if (!oi) return;
                            if (ci.type === 'checkbox' || ci.type === 'radio') {
                                ci.checked = oi.checked;
                            } else {
                                ci.value = oi.value;
                            }
                        });

                        const cloneNodes = Array.from(clone.querySelectorAll('*'));
                        const originalNodes = Array.from(item.el.querySelectorAll('*'));
                        cloneNodes.forEach((cn, idx) => {
                            const on = originalNodes[idx];
                            if (!on) return;
                            if (cn.childElementCount === 0 && cn.textContent !== on.textContent) {
                                if (cn.tagName !== 'INPUT' && cn.tagName !== 'SELECT' && cn.tagName !== 'BUTTON') {
                                    cn.textContent = on.textContent;
                                }
                            }
                        });
                    }

                    // Khởi tạo trạng thái ban đầu của clone
                    syncCloneFromOriginal();

                    // Chuyển tiếp các sự kiện từ clone sang bản gốc
                    const cloneInteractives = Array.from(clone.querySelectorAll('button, input, select'));
                    const originalInteractives = Array.from(item.el.querySelectorAll('button, input, select'));

                    cloneInteractives.forEach((cloneEl, idx) => {
                        const originalEl = originalInteractives[idx];
                        if (!originalEl) return;

                        if (cloneEl.tagName === 'BUTTON') {
                            cloneEl.addEventListener('click', (e) => {
                                e.stopPropagation();
                                originalEl.click();
                            });
                        } else if (cloneEl.tagName === 'INPUT') {
                            if (cloneEl.type === 'checkbox' || cloneEl.type === 'radio') {
                                cloneEl.addEventListener('change', (e) => {
                                    e.stopPropagation();
                                    originalEl.checked = cloneEl.checked;
                                    originalEl.click();
                                    setTimeout(syncCloneFromOriginal, 50);
                                });
                            } else if (cloneEl.type === 'range') {
                                const handleRangeInput = (e) => {
                                    e.stopPropagation();
                                    originalEl.value = cloneEl.value;
                                    originalEl.dispatchEvent(new Event('input', { bubbles: true }));
                                    setTimeout(syncCloneFromOriginal, 10);
                                };
                                cloneEl.addEventListener('input', handleRangeInput);
                                cloneEl.addEventListener('change', handleRangeInput);
                            }
                        } else if (cloneEl.tagName === 'SELECT') {
                            cloneEl.addEventListener('change', (e) => {
                                e.stopPropagation();
                                originalEl.value = cloneEl.value;
                                originalEl.dispatchEvent(new Event('change', { bubbles: true }));
                                setTimeout(syncCloneFromOriginal, 50);
                            });
                        }
                    });

                    // Highlight text trong các span/p có data-i18n
                    clone.querySelectorAll('[data-i18n]').forEach(node => {
                        if (node.childElementCount === 0) {
                            node.innerHTML = highlight(node.textContent, query.trim());
                        }
                    });

                    // Click vào kết quả → navigate tới tab đó
                    wrapper.style.cursor = 'pointer';
                    wrapper.addEventListener('click', (e) => {
                        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'BUTTON' || e.target.closest('button, input, select')) return;
                        // Xóa search và chuyển sang tab
                        searchInput.value = '';
                        renderResults('');
                        const targetTab = document.querySelector(`.tab-btn[data-tab="${item.tabId}"]`);
                        if (targetTab) targetTab.click();
                        // Scroll đến setting gốc
                        setTimeout(() => {
                            item.el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            item.el.style.transition = 'box-shadow 0.3s';
                            item.el.style.boxShadow = '0 0 0 2px rgba(6,182,212,0.5)';
                            setTimeout(() => { item.el.style.boxShadow = ''; }, 1500);
                        }, 150);
                    });

                    resultsPanel.appendChild(wrapper);
                });
            });
        }

        // ---- Sự kiện ----
        let debounceTimer;
        searchInput.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => renderResults(searchInput.value), 180);
        });

        searchClear.addEventListener('click', () => {
            searchInput.value = '';
            renderResults('');
            searchInput.focus();
        });

        // Escape để xóa search
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                searchInput.value = '';
                renderResults('');
            }
        });

        // Rebuild index khi đổi ngôn ngữ (applyTranslations được gọi lại)
        const origApply = window.applyTranslations;
        if (typeof origApply === 'function') {
            window.applyTranslations = function () {
                origApply.apply(this, arguments);
                // Cập nhật placeholder
                if (searchInput) {
                    searchInput.placeholder = typeof t === 'function'
                        ? t('settings_search_placeholder')
                        : 'Search settings...';
                }
                // Rebuild index để text mới nhất được index
                buildIndex();
                // Nếu đang search, re-render với query hiện tại
                if (searchInput.value.trim()) {
                    renderResults(searchInput.value);
                }
            };
        }

        // Build index lần đầu sau khi translations đã sẵn sàng
        if (typeof translationsPromise !== 'undefined') {
            translationsPromise.then(() => buildIndex()).catch(() => buildIndex());
        } else {
            buildIndex();
        }
    }

    // Chạy sau khi DOM đã load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setup();
            if (typeof window.adjustTabsKerning === 'function') window.adjustTabsKerning();
        });
    } else {
        setup();
        if (typeof window.adjustTabsKerning === 'function') window.adjustTabsKerning();
    }
})();

// ============================================================
//  AUTO-KERNING FOR TABS (Dynamic adjustment to prevent overflow)
// ============================================================
window.adjustTabsKerning = function () {
    function adjustContainer(containerSelector, itemSelector, options) {
        const container = document.querySelector(containerSelector);
        if (!container) return;

        const items = container.querySelectorAll(itemSelector);
        if (!items.length) return;

        // Save original transitions and disable them to prevent expansion/flickering animation
        const originalTransitions = [];
        items.forEach((item, index) => {
            originalTransitions[index] = item.style.transition;
            item.style.transition = 'none';
        });
        const containerOriginalTransition = container.style.transition;
        container.style.transition = 'none';

        // Reset styles first to get clean default measurements
        items.forEach(item => {
            const span = item.querySelector('span');
            if (span) {
                span.style.transform = '';
                span.style.width = '';
                span.style.display = 'inline-block';
                span.style.transformOrigin = 'center';
            }
            if (options.originalPadding !== undefined) {
                item.style.paddingLeft = '';
                item.style.paddingRight = '';
            }
            if (options.forceWhitespaceNowrap) {
                item.style.whiteSpace = 'nowrap';
            }
        });
        if (options.originalGap !== undefined) {
            container.style.gap = '';
        }

        // If the container is currently hidden (not visible), we cannot measure widths
        if (container.clientWidth === 0) {
            // Restore transitions before returning
            items.forEach((item, index) => {
                item.style.transition = originalTransitions[index];
            });
            container.style.transition = containerOriginalTransition;
            return;
        }

        // Check if there is overflow
        if (container.scrollWidth > container.clientWidth) {
            // Step 1: Reduce scaleX on tab buttons
            let currentScale = 1.0;
            const scaleStep = 0.02;
            const minScale = options.minScaleX !== undefined ? options.minScaleX : 0.75;

            // Get all spans and their original widths
            const spanData = [];
            items.forEach(item => {
                const span = item.querySelector('span');
                if (span) {
                    spanData.push({
                        span: span,
                        originalWidth: span.scrollWidth
                    });
                }
            });

            while (container.scrollWidth > container.clientWidth && currentScale > minScale) {
                currentScale -= scaleStep;
                spanData.forEach(data => {
                    data.span.style.transform = `scaleX(${currentScale})`;
                    data.span.style.width = `${data.originalWidth * currentScale}px`;
                });
            }

            // Step 2: Reduce horizontal padding if still overflowing
            if (container.scrollWidth > container.clientWidth && options.originalPadding !== undefined) {
                let padding = options.originalPadding;
                const minPadding = options.minPadding;
                while (container.scrollWidth > container.clientWidth && padding > minPadding) {
                    padding -= 1;
                    items.forEach(item => {
                        item.style.paddingLeft = `${padding}px`;
                        item.style.paddingRight = `${padding}px`;
                    });
                }
            }

            // Step 3: Reduce layout gap if still overflowing
            if (container.scrollWidth > container.clientWidth && options.originalGap !== undefined) {
                let gap = options.originalGap;
                const minGap = options.minGap;
                while (container.scrollWidth > container.clientWidth && gap > minGap) {
                    gap -= 1;
                    container.style.gap = `${gap}px`;
                }
            }
        }

        // Force browser layout/reflow to apply the styling immediately without transitions
        container.offsetHeight;

        // Restore transitions asynchronously
        setTimeout(() => {
            items.forEach((item, index) => {
                item.style.transition = originalTransitions[index];
            });
            container.style.transition = containerOriginalTransition;
        }, 100);
    }

    // 1. Main navigation tab container
    adjustContainer('.main-nav-tabs-container', '.nav-btn', {
        minScaleX: 0.75,
        originalPadding: 16,
        minPadding: 4,
        originalGap: 0,
        minGap: 0,
        forceWhitespaceNowrap: true
    });

    // 3. Language selection options
    const langContainer = document.getElementById('language-options');
    if (langContainer) {
        const labels = langContainer.querySelectorAll('label');

        // Save original transitions and disable them
        const originalTransitions = [];
        labels.forEach((label, index) => {
            const span = label.querySelector('.lang-text') || label.querySelector('span');
            originalTransitions[index] = {
                label: label.style.transition,
                span: span ? span.style.transition : ''
            };
            label.style.transition = 'none';
            if (span) span.style.transition = 'none';
        });

        labels.forEach(label => {
            const span = label.querySelector('.lang-text') || label.querySelector('span');
            if (!span) return;

            // Reset styles first
            span.style.transform = '';
            span.style.width = '';
            span.style.display = 'inline-block';
            span.style.transformOrigin = 'center';
            span.style.whiteSpace = 'nowrap';
            label.style.paddingLeft = '';
            label.style.paddingRight = '';

            const labelWidth = label.clientWidth;
            if (labelWidth === 0) return;

            // Compute available width: clientWidth minus horizontal padding (p-2.5 = 10px on each side = 20px)
            const style = window.getComputedStyle(label);
            const paddingLeft = parseFloat(style.paddingLeft) || 10;
            const paddingRight = parseFloat(style.paddingRight) || 10;
            const availableWidth = labelWidth - paddingLeft - paddingRight;

            const originalWidth = span.scrollWidth;

            if (originalWidth > availableWidth) {
                // Step 1: Reduce scaleX down to minScale (e.g. 0.75)
                const minScale = 0.75;
                const targetScale = availableWidth / originalWidth;
                const currentScale = Math.max(minScale, targetScale);

                span.style.transform = `scaleX(${currentScale})`;
                span.style.width = `${originalWidth * currentScale}px`;

                // Step 2: If still overflowing, reduce horizontal padding of the label slightly
                const finalWidth = originalWidth * currentScale;
                if (finalWidth > availableWidth) {
                    let pad = Math.min(paddingLeft, paddingRight);
                    const minPad = 4; // minimum padding of 4px
                    while (finalWidth > (label.clientWidth - pad * 2) && pad > minPad) {
                        pad -= 1;
                        label.style.paddingLeft = `${pad}px`;
                        label.style.paddingRight = `${pad}px`;
                    }
                }
            }
        });

        // Restore transitions asynchronously
        setTimeout(() => {
            labels.forEach((label, index) => {
                label.style.transition = originalTransitions[index].label;
                const span = label.querySelector('span');
                if (span) span.style.transition = originalTransitions[index].span;
            });
        }, 100);
    }
};

