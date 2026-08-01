// ============================================================
// audio-manager.js — Quản lý toàn bộ âm thanh và AudioContext
// ============================================================

// --- AUDIO VARIABLES ---
const ROUND_START_SFX_URL = "https://an4sdmu4yskbqrq6.public.blob.vercel-storage.com/30-success-ring.mp3";
const SCORE_TICK_SFX_URL = "https://an4sdmu4yskbqrq6.public.blob.vercel-storage.com/tick-deepfrozenapps-397275646-2.mp3";
const NEW_BEST_SFX_URL = "https://an4sdmu4yskbqrq6.public.blob.vercel-storage.com/result_star.ogg";
const CLICK_SFX_URL = "https://an4sdmu4yskbqrq6.public.blob.vercel-storage.com/minecraft-wood-break-place.mp3";
const TAB_SWITCH_SFX_URL = "https://an4sdmu4yskbqrq6.public.blob.vercel-storage.com/whoosh-dark.mp3";
const PLAY_SFX_URL = "https://an4sdmu4yskbqrq6.public.blob.vercel-storage.com/s468.ogg";
const PREGAME_BGM_URL = "https://an4sdmu4yskbqrq6.public.blob.vercel-storage.com/start_song.ogg";
const GAME_OVER_ROUND_BGM_URL = "https://an4sdmu4yskbqrq6.public.blob.vercel-storage.com/result_bgm.ogg";
const GAME_OVER_DEFAULT_BGM_URL = "https://an4sdmu4yskbqrq6.public.blob.vercel-storage.com/gameCompleted.ogg";
const STAR_COLLECT_SFX_URL = "https://an4sdmu4yskbqrq6.public.blob.vercel-storage.com/FreeGift_collect.ogg";
const BREAK_BLOCK_SFX_URL = "https://an4sdmu4yskbqrq6.public.blob.vercel-storage.com/fake-block-break.ogg";

let audio, audioCtx, source, filterNode, gainNode;
let analyserNode = null;
let visualizerCtx = null;
let visDataArray = null; // Dùng chung mảng dữ liệu Visualizer để tránh GC
let menuAudio, menuSource, menuFilterNode, menuGainNode;
let roundStartAudio, roundStartSource, roundGainNode;
let scoreTickAudio, scoreTickSource, newBestAudio, newBestSource;
let sfxGainNode, uiGainNode, playSfxGainNode, mfxGameOverGainNode;
let clickAudio, clickSource;
let playAudio, playSource;
let tabSwitchAudio, tabSwitchSource;
let pregameAudio, pregameSource, pregameGainNode;
let gameOverDefaultAudio, gameOverDefaultSource;
let gameOverRoundAudio, gameOverRoundSource;
let starCollectAudio, starCollectSource;
let breakBlockAudios = [], breakBlockGainNode, breakBlockIndex = 0;
let useAudioContextFallback = false;

let previewAudio, previewSource, previewGainNode;
let previewTimeout = null;
let currentPreviewIndex = -1;

// --- AUDIO CORE INITIALIZATION ---
function initAudio() {
    if (audioCtx) return;

    audio = new Audio();
    audio.crossOrigin = "anonymous";
    audio.loop = false;

    menuAudio = new Audio();
    menuAudio.crossOrigin = "anonymous";
    menuAudio.loop = true;

    const setupMenuBGM = () => {
        let bgmUrlToLoad = MENU_BGM_URL;
        if (typeof activePlaylist !== 'undefined' && activePlaylist[selectedSongIndex] && activePlaylist[selectedSongIndex].url) {
            bgmUrlToLoad = activePlaylist[selectedSongIndex].url;
        }

        if (typeof getCachedAudioUrl === 'function') {
            getCachedAudioUrl(bgmUrlToLoad).then(url => {
                menuAudio.src = url;
                menuAudio.load();
                const isIntroVisible = typeof introOverlay !== 'undefined' && introOverlay && introOverlay.style.display !== 'none';
                if (!isIntroVisible && typeof startScreen !== 'undefined' && startScreen.style.display !== 'none' && currentPreviewIndex === -1) {
                    const playPromise = menuAudio.play();
                    if (playPromise !== undefined) {
                        playPromise.catch(e => { setTimeout(() => { menuAudio.play().catch(()=>{}); }, 50); });
                    }
                }
            });
        } else {
            menuAudio.src = bgmUrlToLoad;
            menuAudio.load();
        }
    };
    if (typeof MENU_BGM_URL !== 'undefined' && MENU_BGM_URL !== '') {
        setupMenuBGM();
    }

    previewAudio = new Audio();
    previewAudio.crossOrigin = "anonymous";
    previewAudio.loop = false;

    roundStartAudio = new Audio();
    roundStartAudio.crossOrigin = "anonymous";
    roundStartAudio.loop = false;

    // Lấy từ DOM để đảm bảo thuộc tính crossorigin hoạt động
    scoreTickAudio = document.getElementById('sfx-score-tick');
    if (!scoreTickAudio) scoreTickAudio = new Audio();
    scoreTickAudio.crossOrigin = "anonymous";
    scoreTickAudio.volume = 0.5; // Âm lượng tương đối (bé hơn các SFX khác)

    newBestAudio = document.getElementById('sfx-new-best');
    if (!newBestAudio) newBestAudio = new Audio();
    newBestAudio.crossOrigin = "anonymous";
    newBestAudio.volume = 1.0;

    clickAudio = new Audio();
    clickAudio.crossOrigin = "anonymous";
    clickAudio.loop = false;

    playAudio = new Audio();
    playAudio.crossOrigin = "anonymous";
    playAudio.loop = false;

    tabSwitchAudio = new Audio();
    tabSwitchAudio.crossOrigin = "anonymous";
    tabSwitchAudio.loop = false;

    pregameAudio = new Audio();
    pregameAudio.crossOrigin = "anonymous";
    pregameAudio.loop = false;

    gameOverDefaultAudio = new Audio();
    gameOverDefaultAudio.crossOrigin = "anonymous";
    gameOverDefaultAudio.loop = false;

    gameOverRoundAudio = new Audio();
    gameOverRoundAudio.crossOrigin = "anonymous";
    gameOverRoundAudio.loop = false;

    starCollectAudio = new Audio();
    starCollectAudio.crossOrigin = "anonymous";
    starCollectAudio.loop = false;

    breakBlockAudios = [];
    for (let i = 0; i < 4; i++) {
        const audioObj = new Audio();
        audioObj.crossOrigin = "anonymous";
        audioObj.loop = false;
        breakBlockAudios.push(audioObj);
    }

    if (typeof getCachedAudioUrl === 'function') {
        getCachedAudioUrl(ROUND_START_SFX_URL).then(url => { roundStartAudio.src = url; roundStartAudio.load(); });
        getCachedAudioUrl(SCORE_TICK_SFX_URL).then(url => { scoreTickAudio.src = url; scoreTickAudio.load(); });
        getCachedAudioUrl(NEW_BEST_SFX_URL).then(url => { newBestAudio.src = url; newBestAudio.load(); });
        getCachedAudioUrl(CLICK_SFX_URL).then(url => { clickAudio.src = url; clickAudio.load(); });
        getCachedAudioUrl(PLAY_SFX_URL).then(url => { playAudio.src = url; playAudio.load(); });
        getCachedAudioUrl(TAB_SWITCH_SFX_URL).then(url => { tabSwitchAudio.src = url; tabSwitchAudio.load(); });
        getCachedAudioUrl(PREGAME_BGM_URL).then(url => { pregameAudio.src = url; pregameAudio.load(); });
        getCachedAudioUrl(GAME_OVER_DEFAULT_BGM_URL).then(url => { gameOverDefaultAudio.src = url; gameOverDefaultAudio.load(); });
        getCachedAudioUrl(GAME_OVER_ROUND_BGM_URL).then(url => { gameOverRoundAudio.src = url; gameOverRoundAudio.load(); });
        getCachedAudioUrl(STAR_COLLECT_SFX_URL).then(url => { starCollectAudio.src = url; starCollectAudio.load(); });
        getCachedAudioUrl(BREAK_BLOCK_SFX_URL).then(url => {
            breakBlockAudios.forEach(audioObj => {
                audioObj.src = url;
                audioObj.load();
            });
        });
    } else {
        roundStartAudio.src = ROUND_START_SFX_URL;
        scoreTickAudio.src = SCORE_TICK_SFX_URL;
        newBestAudio.src = NEW_BEST_SFX_URL;
        clickAudio.src = CLICK_SFX_URL;
        playAudio.src = PLAY_SFX_URL;
        tabSwitchAudio.src = TAB_SWITCH_SFX_URL;
        pregameAudio.src = PREGAME_BGM_URL;
        pregameAudio.load();
        gameOverDefaultAudio.src = GAME_OVER_DEFAULT_BGM_URL;
        gameOverDefaultAudio.load();
        gameOverRoundAudio.src = GAME_OVER_ROUND_BGM_URL;
        gameOverRoundAudio.load();
        starCollectAudio.src = STAR_COLLECT_SFX_URL;
        starCollectAudio.load();
        breakBlockAudios.forEach(audioObj => {
            audioObj.src = BREAK_BLOCK_SFX_URL;
            audioObj.load();
        });
    }

    try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();

        source = audioCtx.createMediaElementSource(audio);
        filterNode = audioCtx.createBiquadFilter();
        filterNode.type = 'lowpass';
        filterNode.frequency.value = 22050;
        gainNode = audioCtx.createGain();
        gainNode.gain.value = gameVolume;

        analyserNode = audioCtx.createAnalyser();
        analyserNode.fftSize = 256;
        analyserNode.smoothingTimeConstant = 0.7;

        source.connect(analyserNode);
        analyserNode.connect(filterNode);
        filterNode.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        menuSource = audioCtx.createMediaElementSource(menuAudio);
        menuFilterNode = audioCtx.createBiquadFilter();
        menuFilterNode.type = 'lowpass';
        menuFilterNode.frequency.value = 22050;
        menuGainNode = audioCtx.createGain();
        menuGainNode.gain.value = menuVolume;
        menuSource.connect(menuGainNode);
        menuGainNode.connect(menuFilterNode);
        menuFilterNode.connect(audioCtx.destination);

        previewSource = audioCtx.createMediaElementSource(previewAudio);
        previewGainNode = audioCtx.createGain();
        previewGainNode.gain.value = 0;
        previewSource.connect(previewGainNode);
        previewGainNode.connect(menuFilterNode);

        roundStartSource = audioCtx.createMediaElementSource(roundStartAudio);
        scoreTickSource = audioCtx.createMediaElementSource(scoreTickAudio);
        newBestSource = audioCtx.createMediaElementSource(newBestAudio);

        roundGainNode = audioCtx.createGain();
        roundGainNode.gain.value = roundVolume;

        sfxGainNode = audioCtx.createGain();
        sfxGainNode.gain.value = sfxVolume;

        playSfxGainNode = audioCtx.createGain();
        playSfxGainNode.gain.value = typeof playSfxVolume !== 'undefined' ? playSfxVolume : 0.8;

        pregameSource = audioCtx.createMediaElementSource(pregameAudio);
        pregameGainNode = audioCtx.createGain();
        pregameGainNode.gain.value = typeof pregameVolume !== 'undefined' ? pregameVolume : 0.8;
        pregameSource.connect(pregameGainNode);
        pregameGainNode.connect(audioCtx.destination);

        // Luồng âm thanh SFX Click
        clickSource = audioCtx.createMediaElementSource(clickAudio);
        playSource = audioCtx.createMediaElementSource(playAudio);

        tabSwitchSource = audioCtx.createMediaElementSource(tabSwitchAudio);

        uiGainNode = audioCtx.createGain();
        uiGainNode.gain.value = uiVolume;

        // Luồng Game SFX
        roundStartSource.connect(roundGainNode);
        roundGainNode.connect(audioCtx.destination);

        clickSource.connect(sfxGainNode);
        playSource.connect(playSfxGainNode);
        playSfxGainNode.connect(audioCtx.destination);
        sfxGainNode.connect(audioCtx.destination);

        // Luồng Game Over UI
        scoreTickSource.connect(uiGainNode);
        newBestSource.connect(uiGainNode);
        tabSwitchSource.connect(uiGainNode);
        uiGainNode.connect(audioCtx.destination);

        mfxGameOverGainNode = audioCtx.createGain();
        mfxGameOverGainNode.gain.value = typeof mfxGameOverVolume !== 'undefined' ? mfxGameOverVolume : 0.8;

        gameOverDefaultSource = audioCtx.createMediaElementSource(gameOverDefaultAudio);
        gameOverRoundSource = audioCtx.createMediaElementSource(gameOverRoundAudio);
        starCollectSource = audioCtx.createMediaElementSource(starCollectAudio);
        
        gameOverDefaultSource.connect(mfxGameOverGainNode);
        gameOverRoundSource.connect(mfxGameOverGainNode);
        starCollectSource.connect(sfxGainNode);
        mfxGameOverGainNode.connect(audioCtx.destination);

        breakBlockGainNode = audioCtx.createGain();
        breakBlockGainNode.gain.value = typeof breakBlockVolume !== 'undefined' ? breakBlockVolume : 0.8;
        breakBlockAudios.forEach(audioObj => {
            const breakBlockSource = audioCtx.createMediaElementSource(audioObj);
            breakBlockSource.connect(breakBlockGainNode);
        });
        breakBlockGainNode.connect(audioCtx.destination);

        useAudioContextFallback = false;
    } catch (e) {
        useAudioContextFallback = true;
    }
}

// --- PREVIEW NHẠC ---
async function togglePreview(index) {
    if (typeof updatePreviewUI === 'function') {
        updatePreviewUI(index, 'loading');
    }

    if (typeof ensureSongLoaded === 'function') {
        await ensureSongLoaded(index);
    }

    // --- OFFLINE CHECK ---
    if (!navigator.onLine) {
        const isCached = typeof isAudioCached === 'function' ? await isAudioCached(activePlaylist[index].url) : false;
        if (!isCached) {
            if (typeof showCyberModal === 'function') {
                showCyberModal({
                    title: typeof t === 'function' ? t('offline_title') : "OFFLINE",
                    message: typeof t === 'function' ? t('offline_msg') : "Bạn đang ngoại tuyến! Chỉ có thể phát các bài hát đã được lưu trong bộ nhớ đệm (Cache).",
                    type: 'alert'
                });
            }
            if (typeof updatePreviewUI === 'function') {
                updatePreviewUI(index, 'stopped');
            }
            return; // Hủy nghe trước
        }
    }

    if (typeof window.MusicPlayer !== 'undefined' && window.MusicPlayer.isPlaying) window.MusicPlayer.stop();

    if (!audioCtx) {
        if (typeof initAudio === 'function') initAudio();
    }
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();

    if (currentPreviewIndex === index) {
        stopPreview(false);
        return;
    }

    // Đánh thức (Unlock) thẻ Audio trên thiết bị di động bằng cách chạy một file rỗng đồng bộ ngay khi bấm click
    if (previewAudio) {
        if (!previewAudio.src || previewAudio.src === window.location.href || previewAudio.src.startsWith('data:audio/')) {
            previewAudio.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA"; 
            previewAudio.play().catch(() => {});
        }
    }

    stopPreview(true); // Dừng ngay preview cũ
    currentPreviewIndex = index;
    const targetIndex = index;

    if (typeof selectedSongIndex !== 'undefined') {
        selectedSongIndex = index;
        try {
            localStorage.setItem('selectedSongIndex', index);
            if (typeof activePlaylist !== 'undefined' && activePlaylist[index]) {
                if (activePlaylist[index].id) localStorage.setItem('selectedSongId', activePlaylist[index].id);
                if (activePlaylist[index].url) localStorage.setItem('selectedSongUrl', activePlaylist[index].url);
            }
        } catch (e) { }
        const options = document.querySelectorAll('.song-option');
        options.forEach((opt) => {
            opt.classList.toggle('active', parseInt(opt.dataset.index) === index);
        });
        if (typeof renderBestScoreUI === 'function') {
            renderBestScoreUI(index);
        }
    }
    
    const song = activePlaylist[index];
    if (!previewAudio) return;

    if (!song || !song.url) {
        stopPreview(true);
        return;
    }

    const audioUrl = typeof getCachedAudioUrl === 'function' ? await getCachedAudioUrl(song.url) : song.url;
    if (currentPreviewIndex !== targetIndex) return; // Nếu người dùng đã ấn sang bài khác trong lúc chờ thì hủy

    previewAudio.src = audioUrl;
    previewAudio.load();

    const playPreviewWhenReady = () => {
        if (currentPreviewIndex !== index) return;
        
        // Random điểm bắt đầu nhưng chừa lại ít nhất 16s cuối để đủ thời lượng fade out
        let maxStart = 0;
        if (previewAudio.duration && !isNaN(previewAudio.duration) && isFinite(previewAudio.duration)) {
            maxStart = Math.max(0, previewAudio.duration - 16);
        }
        previewAudio.currentTime = Math.random() * maxStart;

        if (typeof updatePreviewUI === 'function') {
            updatePreviewUI(index, 'playing');
        }
        
        if (audioCtx && menuGainNode && previewGainNode) {
            const now = audioCtx.currentTime;
            menuGainNode.gain.cancelScheduledValues(now);
            menuGainNode.gain.setValueAtTime(menuGainNode.gain.value, now);
            menuGainNode.gain.linearRampToValueAtTime(0, now + 0.5);
            
            previewGainNode.gain.cancelScheduledValues(now);
            previewGainNode.gain.setValueAtTime(0, now);
            const targetVol = typeof isPreviewMuted !== 'undefined' && isPreviewMuted ? 0 : (typeof previewVolume !== 'undefined' ? previewVolume : 0.6);
            previewGainNode.gain.linearRampToValueAtTime(targetVol, now + 0.5);
        } else if (!audioCtx) {
            if (menuAudio) menuAudio.volume = 0;
            previewAudio.volume = typeof isPreviewMuted !== 'undefined' && isPreviewMuted ? 0 : (typeof previewVolume !== 'undefined' ? previewVolume : 0.6);
        }

        previewAudio.play().catch(e => {
            console.log("Preview play failed:", e);
            stopPreview(true);
        });

        previewTimeout = setTimeout(() => {
            stopPreview(false);
        }, 14000); // 14s phát nhạc + 1s fadeout = tròn 15s
    };

    previewAudio.onloadeddata = null;
    previewAudio.oncanplay = null;
    previewAudio.onloadedmetadata = null;
    if (previewAudio.readyState >= 1) { // HAVE_METADATA
        playPreviewWhenReady();
    } else {
        previewAudio.onloadedmetadata = playPreviewWhenReady;
    }
}

function stopPreview(immediate = false) {
    if (previewTimeout) {
        clearTimeout(previewTimeout);
        previewTimeout = null;
    }

    const prevIndex = currentPreviewIndex;
    currentPreviewIndex = -1;

    if (typeof updatePreviewUI === 'function' && prevIndex !== -1) {
        updatePreviewUI(prevIndex, 'stopped');
    }

    if (!previewAudio) return;
    previewAudio.onloadeddata = null;

    if (immediate) {
        if (audioCtx && previewGainNode) {
            const now = audioCtx.currentTime;
            previewGainNode.gain.cancelScheduledValues(now);
            previewGainNode.gain.setValueAtTime(previewGainNode.gain.value, now);
            previewGainNode.gain.linearRampToValueAtTime(0, now + 0.05);
            setTimeout(() => {
                if (currentPreviewIndex === -1 && previewAudio) previewAudio.pause();
            }, 50);
        } else if (!audioCtx) {
            if (previewAudio) previewAudio.volume = 0;
            if (previewAudio) previewAudio.pause();
        }
    } else {
        if (audioCtx && previewGainNode && menuGainNode) {
            const now = audioCtx.currentTime;
            previewGainNode.gain.cancelScheduledValues(now);
            previewGainNode.gain.setValueAtTime(previewGainNode.gain.value, now);
            previewGainNode.gain.linearRampToValueAtTime(0, now + 1.0);

            if (startScreen.style.display !== 'none') {
                menuGainNode.gain.cancelScheduledValues(now);
                menuGainNode.gain.setValueAtTime(menuGainNode.gain.value, now);
                menuGainNode.gain.linearRampToValueAtTime(isMenuMuted ? 0 : menuVolume, now + 1.0);
                if (typeof menuAudio !== 'undefined' && menuAudio) {
                    const playPromise = menuAudio.play();
                    if (playPromise !== undefined) {
                        playPromise.catch(e => { setTimeout(() => { menuAudio.play().catch(()=>{}); }, 50); });
                    }
                }
            }

            setTimeout(() => {
                if (currentPreviewIndex === -1) previewAudio.pause();
            }, 1000);
        } else {
            previewAudio.pause();
            if (!audioCtx && menuAudio && startScreen.style.display !== 'none') {
                menuAudio.volume = isMenuMuted ? 0 : menuVolume;
                const playPromise = menuAudio.play();
                if (playPromise !== undefined) {
                    playPromise.catch(e => { setTimeout(() => { menuAudio.play().catch(()=>{}); }, 50); });
                }
            }
        }
    }
}

// --- SFX (CLICK & INTERACTIONS) ---
/**
 * Phát âm thanh Click (chỉ chạy khi không trong trận đấu)
 */
function playClickSound() {
    if (isPlaying || !clickAudio) return;
    if (useAudioContextFallback) {
        const targetVol = (typeof isSfxMuted !== 'undefined' && isSfxMuted) ? 0 : (typeof sfxVolume !== 'undefined' ? sfxVolume : 0.8);
        clickAudio.volume = targetVol;
    }
    clickAudio.currentTime = 0;
    clickAudio.play().catch(() => { });
}

/**
 * Phát âm thanh chuyển Tab (chỉ chạy khi không trong trận đấu)
 */
function playTabSwitchSound() {
    if (isPlaying || !tabSwitchAudio) return;
    if (useAudioContextFallback) {
        const targetVol = (typeof isUiMuted !== 'undefined' && isUiMuted) ? 0 : (typeof uiVolume !== 'undefined' ? uiVolume : 0.8);
        tabSwitchAudio.volume = targetVol;
    }
    tabSwitchAudio.currentTime = 0;
    tabSwitchAudio.play().catch(() => { });
}

/**
 * Phát âm thanh khi nhấn nút Play / Bắt đầu
 */
function playGameStartSound() {
    if (isPlaying || !playAudio) return;
    if (useAudioContextFallback) {
        const targetVol = (typeof isPlaySfxMuted !== 'undefined' && isPlaySfxMuted) ? 0 : (typeof playSfxVolume !== 'undefined' ? playSfxVolume : 0.8);
        playAudio.volume = targetVol;
    }
    playAudio.currentTime = 0;
    playAudio.play().catch(() => { });
}

/**
 * Phát âm thanh khi vỡ khối giả (Break block)
 */
function playBreakBlockSound() {
    if (!breakBlockAudios || breakBlockAudios.length === 0) return;
    
    if (typeof audioCtx !== 'undefined' && audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    
    const audioObj = breakBlockAudios[breakBlockIndex];
    breakBlockIndex = (breakBlockIndex + 1) % breakBlockAudios.length;

    const targetVol = (typeof isBreakBlockMuted !== 'undefined' && isBreakBlockMuted) ? 0 : (typeof breakBlockVolume !== 'undefined' ? breakBlockVolume : 0.8);

    if (useAudioContextFallback) {
        audioObj.volume = targetVol;
    } else if (typeof breakBlockGainNode !== 'undefined' && breakBlockGainNode && typeof audioCtx !== 'undefined' && audioCtx) {
        breakBlockGainNode.gain.setValueAtTime(targetVol, audioCtx.currentTime);
    }
    
    audioObj.currentTime = 0;
    audioObj.play().catch(() => {});
}

/**
 * Phát nhạc chờ màn hình Tap To Play
 */
function playPregameMusic() {
    if (!pregameAudio) return;
    if (typeof audioCtx !== 'undefined' && audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    pregameAudio.currentTime = 0;
    pregameAudio.play().catch(() => {});
    if (typeof audioCtx !== 'undefined' && audioCtx && pregameGainNode) {
        const now = audioCtx.currentTime;
        pregameGainNode.gain.cancelScheduledValues(now);
        pregameGainNode.gain.setValueAtTime(0, now);
        const targetVol = (typeof isPregameMuted !== 'undefined' && isPregameMuted) ? 0 : (typeof pregameVolume !== 'undefined' ? pregameVolume : 0.8);
        pregameGainNode.gain.linearRampToValueAtTime(targetVol, now + 0.5);
    } else {
        pregameAudio.volume = (typeof isPregameMuted !== 'undefined' && isPregameMuted) ? 0 : (typeof pregameVolume !== 'undefined' ? pregameVolume : 0.8);
    }
}

/**
 * Tắt nhạc chờ màn hình Tap To Play (Fade out)
 */
function stopPregameMusic() {
    if (!pregameAudio || pregameAudio.paused) return;
    if (typeof audioCtx !== 'undefined' && audioCtx && pregameGainNode) {
        const now = audioCtx.currentTime;
        pregameGainNode.gain.cancelScheduledValues(now);
        pregameGainNode.gain.setValueAtTime(pregameGainNode.gain.value, now);
        pregameGainNode.gain.linearRampToValueAtTime(0, now + 1.0);
        setTimeout(() => { pregameAudio.pause(); }, 1050);
    } else {
        let vol = pregameAudio.volume;
        const fadeInterval = setInterval(() => {
            vol -= 0.05;
            if (vol <= 0) {
                vol = 0;
                clearInterval(fadeInterval);
                pregameAudio.pause();
            }
            pregameAudio.volume = Math.max(0, vol);
        }, 50);
    }
}

/**
 * Tắt nhạc Game Over (Fade out)
 */
function stopGameOverMusic() {
    const fadeOutAudio = (audioObj) => {
        if (!audioObj || audioObj.paused) return;
        
        if (audioObj.fadeTimeout) clearTimeout(audioObj.fadeTimeout);
        if (audioObj.fadeInterval) clearInterval(audioObj.fadeInterval);

        if (typeof audioCtx !== 'undefined' && audioCtx && typeof mfxGameOverGainNode !== 'undefined' && mfxGameOverGainNode) {
            const now = audioCtx.currentTime;
            mfxGameOverGainNode.gain.cancelScheduledValues(now);
            mfxGameOverGainNode.gain.setValueAtTime(mfxGameOverGainNode.gain.value, now);
            mfxGameOverGainNode.gain.linearRampToValueAtTime(0, now + 1.0);
            audioObj.fadeTimeout = setTimeout(() => { audioObj.pause(); audioObj.currentTime = 0; }, 1050);
        } else {
            let vol = audioObj.volume;
            audioObj.fadeInterval = setInterval(() => {
                vol -= 0.05;
                if (vol <= 0) {
                    vol = 0;
                    clearInterval(audioObj.fadeInterval);
                    audioObj.pause();
                    audioObj.currentTime = 0;
                }
                audioObj.volume = Math.max(0, vol);
            }, 50);
        }
    };
    
    if (typeof gameOverDefaultAudio !== 'undefined') fadeOutAudio(gameOverDefaultAudio);
    if (typeof gameOverRoundAudio !== 'undefined') fadeOutAudio(gameOverRoundAudio);
}

// --- TỰ ĐỘNG PHÁT NHẠC NỀN KHI NGƯỜI DÙNG TƯƠNG TÁC LẦN ĐẦU ---
let bgmHasStarted = false;
let isAudioUnlocked = false;
document.addEventListener('click', (e) => {
    if (typeof audioCtx !== 'undefined' && audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    
    // Đánh thức toàn bộ thẻ Audio ngay khi chạm
    if (!isAudioUnlocked) {
        if (typeof previewAudio !== 'undefined' && previewAudio && (!previewAudio.src || previewAudio.src === window.location.href || previewAudio.src.startsWith('data:audio/'))) {
            previewAudio.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";
            previewAudio.play().catch(()=>{});
        }
        if (typeof clickAudio !== 'undefined' && clickAudio && (!clickAudio.src || clickAudio.src === window.location.href || clickAudio.src.startsWith('data:audio/'))) {
            clickAudio.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";
            clickAudio.play().catch(() => { });
        }
        if (typeof playAudio !== 'undefined' && playAudio && (!playAudio.src || playAudio.src === window.location.href || playAudio.src.startsWith('data:audio/'))) {
            playAudio.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";
            playAudio.play().catch(() => { });
        }
        if (typeof tabSwitchAudio !== 'undefined' && tabSwitchAudio && (!tabSwitchAudio.src || tabSwitchAudio.src === window.location.href || tabSwitchAudio.src.startsWith('data:audio/'))) {
            tabSwitchAudio.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";
            tabSwitchAudio.play().catch(() => { });
        }
        if (typeof pregameAudio !== 'undefined' && pregameAudio && (!pregameAudio.src || pregameAudio.src === window.location.href || pregameAudio.src.startsWith('data:audio/'))) {
            pregameAudio.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";
            pregameAudio.play().catch(() => { });
        }
        if (typeof gameOverDefaultAudio !== 'undefined' && gameOverDefaultAudio && (!gameOverDefaultAudio.src || gameOverDefaultAudio.src === window.location.href || gameOverDefaultAudio.src.startsWith('data:audio/'))) {
            gameOverDefaultAudio.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";
            gameOverDefaultAudio.play().catch(() => { });
        }
        if (typeof gameOverRoundAudio !== 'undefined' && gameOverRoundAudio && (!gameOverRoundAudio.src || gameOverRoundAudio.src === window.location.href || gameOverRoundAudio.src.startsWith('data:audio/'))) {
            gameOverRoundAudio.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";
            gameOverRoundAudio.play().catch(() => { });
        }
        isAudioUnlocked = true;
    }

    // Phát âm thanh click cho các thành phần giao diện khi không chơi game
    if (!isPlaying) {
        const target = e.target.closest('button, .nav-btn, .tab-btn, .song-option, select, input[type="range"], input[type="checkbox"], input[type="radio"], #tap-to-play-overlay');
        if (target) {
            if (target.classList.contains('nav-btn') || target.classList.contains('tab-btn')) {
                playTabSwitchSound();
            } else if (target.classList.contains('song-option')) {
                playGameStartSound();
            } else if (target.classList.contains('preview-btn')) {
                playClickSound();
            } else {
                playClickSound();
            }
        }
    }

    const isIntroVisible = typeof introOverlay !== 'undefined' && introOverlay && introOverlay.style.display !== 'none';
    if (!isIntroVisible && typeof startScreen !== 'undefined' && startScreen.style.display !== 'none' && typeof menuAudio !== 'undefined' && menuAudio) {
        if (currentPreviewIndex === -1) {
            if (menuAudio.src && menuAudio.src !== window.location.href) {
                menuAudio.play().then(() => {
                    bgmHasStarted = true;
                }).catch(() => { setTimeout(() => { menuAudio.play().catch(()=>{}); }, 50); });
            }
        }
    }
});

// --- XỬ LÝ BACKGROUND MUSIC & UNFOCUS MÀN HÌNH CHÍNH ---
let allowBackgroundMusic = localStorage.getItem('allowBackgroundMusic') === 'true';
let wasMenuAudioPlaying = false;
let wasPreviewAudioPlaying = false;
let wasMpPlaying = false;
let wasGameOverDefaultPlaying = false;
let wasGameOverRoundPlaying = false;

let blurFadeTimeout = null;
let blurFadeInterval = null;

const initBgMusicToggle = () => {
    const bgMusicToggle = document.getElementById('mp-bg-music-toggle');
    if (bgMusicToggle) {
        bgMusicToggle.checked = allowBackgroundMusic;
        bgMusicToggle.addEventListener('change', (e) => {
            allowBackgroundMusic = e.target.checked;
            localStorage.setItem('allowBackgroundMusic', allowBackgroundMusic);
        });
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBgMusicToggle);
} else {
    initBgMusicToggle();
}

window.addEventListener('blur', () => {
    // Nếu đang trong game (gameStarted = true), ta đảm bảo các trạng thái nhạc menu/preview của phiên trước đó bị xóa sạch
    if (typeof gameStarted !== 'undefined' && gameStarted) {
        wasMenuAudioPlaying = false;
        wasPreviewAudioPlaying = false;
    }

    // Chỉ xử lý unfocus khi ở màn hình chính (không phải đang chơi game)
    if (typeof isPlaying !== 'undefined' && !isPlaying) {
        // Nếu BẬT phát nhạc trong nền (allowBackgroundMusic = true) thì bỏ qua toàn bộ logic này
        if (!allowBackgroundMusic) {
            // Xóa các luồng fade-in nếu có
            clearTimeout(blurFadeTimeout);
            clearInterval(blurFadeInterval);

            // Lưu trạng thái và tạm dừng Menu Audio
            if (typeof menuAudio !== 'undefined' && menuAudio) {
                wasMenuAudioPlaying = !menuAudio.paused;
            }
            
            // Lưu trạng thái và tạm dừng Preview Audio
            if (typeof previewAudio !== 'undefined' && previewAudio) {
                wasPreviewAudioPlaying = !previewAudio.paused;
            }
            let wasPregameAudioPlaying = typeof pregameAudio !== 'undefined' && pregameAudio ? !pregameAudio.paused : false;
            wasGameOverDefaultPlaying = typeof gameOverDefaultAudio !== 'undefined' && gameOverDefaultAudio ? !gameOverDefaultAudio.paused : false;
            wasGameOverRoundPlaying = typeof gameOverRoundAudio !== 'undefined' && gameOverRoundAudio ? !gameOverRoundAudio.paused : false;

            // Lưu trạng thái Music Player (nếu nó đang phát, ta giữ nguyên không dừng)
            const isMpPlayingCurrently = typeof window.MusicPlayer !== 'undefined' && window.MusicPlayer.isPlaying;
            wasMpPlaying = false; // Luôn coi như không tạm dừng Music Player để nó tiếp tục phát trong nền

            const fadeDuration = 0.5; // Thời gian fade out 0.5s

            if (typeof audioCtx !== 'undefined' && audioCtx && audioCtx.state === 'running') {
                const now = audioCtx.currentTime;
                
                if (wasMenuAudioPlaying && typeof menuGainNode !== 'undefined') {
                    menuGainNode.gain.cancelScheduledValues(now);
                    menuGainNode.gain.setValueAtTime(menuGainNode.gain.value, now);
                    menuGainNode.gain.linearRampToValueAtTime(0, now + fadeDuration);
                }
                if (wasPreviewAudioPlaying && typeof previewGainNode !== 'undefined') {
                    previewGainNode.gain.cancelScheduledValues(now);
                    previewGainNode.gain.setValueAtTime(previewGainNode.gain.value, now);
                    previewGainNode.gain.linearRampToValueAtTime(0, now + fadeDuration);
                }
                if (wasPregameAudioPlaying && typeof pregameGainNode !== 'undefined') {
                    pregameGainNode.gain.cancelScheduledValues(now);
                    pregameGainNode.gain.setValueAtTime(pregameGainNode.gain.value, now);
                    pregameGainNode.gain.linearRampToValueAtTime(0, now + fadeDuration);
                }
                if (wasMpPlaying && typeof gainNode !== 'undefined') {
                    gainNode.gain.cancelScheduledValues(now);
                    gainNode.gain.setValueAtTime(gainNode.gain.value, now);
                    gainNode.gain.linearRampToValueAtTime(0, now + fadeDuration);
                }
                if (wasGameOverDefaultPlaying || wasGameOverRoundPlaying) {
                    if (typeof mfxGameOverGainNode !== 'undefined') {
                        mfxGameOverGainNode.gain.cancelScheduledValues(now);
                        mfxGameOverGainNode.gain.setValueAtTime(mfxGameOverGainNode.gain.value, now);
                        mfxGameOverGainNode.gain.linearRampToValueAtTime(0, now + fadeDuration);
                    }
                }

                // Tạm dừng hẳn và suspend AudioContext sau khi fade xong
                blurFadeTimeout = setTimeout(() => {
                    if (wasMenuAudioPlaying && menuAudio) menuAudio.pause();
                    if (wasPreviewAudioPlaying && previewAudio) previewAudio.pause();
                    if (wasPregameAudioPlaying && pregameAudio) pregameAudio.pause();
                    if (wasGameOverDefaultPlaying && gameOverDefaultAudio) gameOverDefaultAudio.pause();
                    if (wasGameOverRoundPlaying && gameOverRoundAudio) gameOverRoundAudio.pause();
                    if (wasMpPlaying && typeof window.MusicPlayer.pause === 'function') window.MusicPlayer.pause();
                    
                    // Chỉ suspend AudioContext nếu Music Player không đang phát
                    if (!isMpPlayingCurrently && audioCtx) {
                        audioCtx.suspend();
                    }
                }, fadeDuration * 1000 + 50);

            } else {
                // Fallback Fade Out (Nếu trình duyệt cấu hình không dùng được Web Audio API)
                let currentStep = 0;
                const steps = 20;
                const initialMenuVol = wasMenuAudioPlaying && menuAudio ? menuAudio.volume : 0;
                const initialPreviewVol = wasPreviewAudioPlaying && previewAudio ? previewAudio.volume : 0;
                const initialPregameVol = wasPregameAudioPlaying && pregameAudio ? pregameAudio.volume : 0;
                const initialGameOverDefaultVol = wasGameOverDefaultPlaying && gameOverDefaultAudio ? gameOverDefaultAudio.volume : 0;
                const initialGameOverRoundVol = wasGameOverRoundPlaying && gameOverRoundAudio ? gameOverRoundAudio.volume : 0;
                
                // Hỗ trợ fade out cho Music Player theo Object Audio gốc hoặc Audio của Game
                let mpAudio = (typeof window.MusicPlayer !== 'undefined' && window.MusicPlayer.audio) ? window.MusicPlayer.audio : (typeof audio !== 'undefined' ? audio : null);
                const initialMpVol = wasMpPlaying && mpAudio ? mpAudio.volume : 0;

                blurFadeInterval = setInterval(() => {
                    currentStep++;
                    const ratio = 1 - (currentStep / steps);
                    
                    if (wasMenuAudioPlaying && menuAudio) menuAudio.volume = Math.max(0, initialMenuVol * ratio);
                    if (wasPreviewAudioPlaying && previewAudio) previewAudio.volume = Math.max(0, initialPreviewVol * ratio);
                    if (wasPregameAudioPlaying && pregameAudio) pregameAudio.volume = Math.max(0, initialPregameVol * ratio);
                    if (wasMpPlaying && mpAudio) mpAudio.volume = Math.max(0, initialMpVol * ratio);
                    if (wasGameOverDefaultPlaying && gameOverDefaultAudio) gameOverDefaultAudio.volume = Math.max(0, initialGameOverDefaultVol * ratio);
                    if (wasGameOverRoundPlaying && gameOverRoundAudio) gameOverRoundAudio.volume = Math.max(0, initialGameOverRoundVol * ratio);

                    if (currentStep >= steps) {
                        clearInterval(blurFadeInterval);
                        if (wasMenuAudioPlaying && menuAudio) menuAudio.pause();
                        if (wasPreviewAudioPlaying && previewAudio) previewAudio.pause();
                        if (wasPregameAudioPlaying && pregameAudio) pregameAudio.pause();
                        if (wasGameOverDefaultPlaying && gameOverDefaultAudio) gameOverDefaultAudio.pause();
                        if (wasGameOverRoundPlaying && gameOverRoundAudio) gameOverRoundAudio.pause();
                        if (wasMpPlaying && typeof window.MusicPlayer.pause === 'function') window.MusicPlayer.pause();
                    }
                }, (fadeDuration * 1000) / steps);
            }
        }
    }
});

window.addEventListener('focus', () => {
    if (typeof isPlaying !== 'undefined' && !isPlaying) {
        if (!allowBackgroundMusic) {
            // Hủy bỏ việc đang fade out dở dang nếu người dùng quay lại nhanh
            clearTimeout(blurFadeTimeout);
            clearInterval(blurFadeInterval);

            const fadeDuration = 0.5;

            // Khôi phục AudioContext
            if (typeof audioCtx !== 'undefined' && audioCtx && audioCtx.state === 'suspended') {
                audioCtx.resume();
            }

            if (typeof audioCtx !== 'undefined' && audioCtx) {
                const now = audioCtx.currentTime;

                if (wasGameOverDefaultPlaying || wasGameOverRoundPlaying) {
                    if (typeof mfxGameOverGainNode !== 'undefined') {
                        mfxGameOverGainNode.gain.cancelScheduledValues(now);
                        mfxGameOverGainNode.gain.setValueAtTime(mfxGameOverGainNode.gain.value, now);
                        const targetVol = typeof isMfxGameOverMuted !== 'undefined' && isMfxGameOverMuted ? 0 : (typeof mfxGameOverVolume !== 'undefined' ? mfxGameOverVolume : 0.8);
                        mfxGameOverGainNode.gain.linearRampToValueAtTime(targetVol, now + fadeDuration);
                    }
                }

                // Khôi phục theo thứ tự ưu tiên đang phát trước đó: Music Player > Preview > Menu
                if (wasMpPlaying && typeof window.MusicPlayer !== 'undefined' && typeof window.MusicPlayer.play === 'function') {
                    window.MusicPlayer.play();
                    if (typeof gainNode !== 'undefined') {
                        gainNode.gain.cancelScheduledValues(now);
                        gainNode.gain.setValueAtTime(gainNode.gain.value, now);
                        const targetVol = typeof gameVolume !== 'undefined' ? gameVolume : 1;
                        gainNode.gain.linearRampToValueAtTime(targetVol, now + fadeDuration);
                    }
                } else if (wasPreviewAudioPlaying && typeof previewAudio !== 'undefined' && previewAudio) {
                    previewAudio.play().catch(()=>{});
                    if (typeof previewGainNode !== 'undefined') {
                        previewGainNode.gain.cancelScheduledValues(now);
                        previewGainNode.gain.setValueAtTime(previewGainNode.gain.value, now);
                        const targetVol = typeof isPreviewMuted !== 'undefined' && isPreviewMuted ? 0 : (typeof previewVolume !== 'undefined' ? previewVolume : 0.6);
                        previewGainNode.gain.linearRampToValueAtTime(targetVol, now + fadeDuration);
                    }
                } else if (wasMenuAudioPlaying && typeof menuAudio !== 'undefined' && menuAudio) {
                    const playPromise = menuAudio.play();
                    if (playPromise !== undefined) {
                        playPromise.catch(e => { setTimeout(() => { menuAudio.play().catch(()=>{}); }, 50); });
                    }
                    if (typeof menuGainNode !== 'undefined') {
                        menuGainNode.gain.cancelScheduledValues(now);
                        menuGainNode.gain.setValueAtTime(menuGainNode.gain.value, now);
                        const targetVol = (typeof isMenuMuted !== 'undefined' && isMenuMuted) ? 0 : (typeof menuVolume !== 'undefined' ? menuVolume : 0.5);
                        menuGainNode.gain.linearRampToValueAtTime(targetVol, now + fadeDuration);
                    }
                } else if (wasGameOverDefaultPlaying && typeof gameOverDefaultAudio !== 'undefined' && gameOverDefaultAudio) {
                    gameOverDefaultAudio.play().catch(()=>{});
                } else if (wasGameOverRoundPlaying && typeof gameOverRoundAudio !== 'undefined' && gameOverRoundAudio) {
                    gameOverRoundAudio.play().catch(()=>{});
                }
            } else {
                // Fallback Fade In
                let currentStep = 0;
                const steps = 20;

                if (wasMpPlaying && typeof window.MusicPlayer !== 'undefined' && typeof window.MusicPlayer.play === 'function') {
                    window.MusicPlayer.play();
                    let mpAudio = (typeof window.MusicPlayer !== 'undefined' && window.MusicPlayer.audio) ? window.MusicPlayer.audio : (typeof audio !== 'undefined' ? audio : null);
                    const startVol = mpAudio ? mpAudio.volume : 0;
                    const targetVol = typeof gameVolume !== 'undefined' ? gameVolume : 1;
                    
                    blurFadeInterval = setInterval(() => {
                        currentStep++;
                        const ratio = currentStep / steps;
                        if (mpAudio) mpAudio.volume = Math.min(targetVol, startVol + (targetVol - startVol) * ratio);
                        if (currentStep >= steps) clearInterval(blurFadeInterval);
                    }, (fadeDuration * 1000) / steps);

                } else if (wasPreviewAudioPlaying && typeof previewAudio !== 'undefined' && previewAudio) {
                    previewAudio.play().catch(()=>{});
                    const startVol = previewAudio.volume;
                    const targetVol = typeof isPreviewMuted !== 'undefined' && isPreviewMuted ? 0 : (typeof previewVolume !== 'undefined' ? previewVolume : 0.6);
                    
                    blurFadeInterval = setInterval(() => {
                        currentStep++;
                        const ratio = currentStep / steps;
                        if (previewAudio) previewAudio.volume = Math.min(targetVol, startVol + (targetVol - startVol) * ratio);
                        if (currentStep >= steps) clearInterval(blurFadeInterval);
                    }, (fadeDuration * 1000) / steps);
                } else if (wasMenuAudioPlaying && typeof menuAudio !== 'undefined' && menuAudio) {
                    const playPromise = menuAudio.play();
                    if (playPromise !== undefined) {
                        playPromise.catch(e => { setTimeout(() => { menuAudio.play().catch(()=>{}); }, 50); });
                    }
                    const startVol = menuAudio.volume;
                    const targetVol = (typeof isMenuMuted !== 'undefined' && isMenuMuted) ? 0 : (typeof menuVolume !== 'undefined' ? menuVolume : 0.5);
                    
                    blurFadeInterval = setInterval(() => {
                        currentStep++;
                        const ratio = currentStep / steps;
                        if (menuAudio) menuAudio.volume = Math.min(targetVol, startVol + (targetVol - startVol) * ratio);
                        if (currentStep >= steps) clearInterval(blurFadeInterval);
                    }, (fadeDuration * 1000) / steps);
                } else if (wasGameOverDefaultPlaying && typeof gameOverDefaultAudio !== 'undefined' && gameOverDefaultAudio) {
                    gameOverDefaultAudio.play().catch(()=>{});
                    const startVol = gameOverDefaultAudio.volume;
                    const targetVol = (typeof isMfxGameOverMuted !== 'undefined' && isMfxGameOverMuted) ? 0 : (typeof mfxGameOverVolume !== 'undefined' ? mfxGameOverVolume : 0.8);
                    
                    blurFadeInterval = setInterval(() => {
                        currentStep++;
                        const ratio = currentStep / steps;
                        if (gameOverDefaultAudio) gameOverDefaultAudio.volume = Math.min(targetVol, startVol + (targetVol - startVol) * ratio);
                        if (currentStep >= steps) clearInterval(blurFadeInterval);
                    }, (fadeDuration * 1000) / steps);
                } else if (wasGameOverRoundPlaying && typeof gameOverRoundAudio !== 'undefined' && gameOverRoundAudio) {
                    gameOverRoundAudio.play().catch(()=>{});
                    const startVol = gameOverRoundAudio.volume;
                    const targetVol = (typeof isMfxGameOverMuted !== 'undefined' && isMfxGameOverMuted) ? 0 : (typeof mfxGameOverVolume !== 'undefined' ? mfxGameOverVolume : 0.8);
                    
                    blurFadeInterval = setInterval(() => {
                        currentStep++;
                        const ratio = currentStep / steps;
                        if (gameOverRoundAudio) gameOverRoundAudio.volume = Math.min(targetVol, startVol + (targetVol - startVol) * ratio);
                        if (currentStep >= steps) clearInterval(blurFadeInterval);
                    }, (fadeDuration * 1000) / steps);
                }
            }
        }
    }
});