const fs = require('fs');
const path = require('path');

// 1. UPDATE js/engine/game.js
const gamePath = path.join(__dirname, '..', 'js', 'engine', 'game.js');
let gameCode = fs.readFileSync(gamePath, 'utf8');
const isGameCRLF = gameCode.includes('\r\n');
let code = gameCode.replace(/\r\n/g, '\n');

// 1.1 Remove desynchronized: true from glOptions & renderer
const targetGl = `    const glOptions = {
        antialias: isAntialias,
        powerPreference: activePowerPref,
        alpha: false,
        stencil: false,
        depth: true,
        desynchronized: true, // Cho phép trình duyệt & DWM bỏ qua hàng đợi compositing, giảm tối đa độ trễ và giật khung hình khi quay màn hình (OBS, Game Bar, ShadowPlay)
        preserveDrawingBuffer: false, // Không giữ lại buffer giữa các frame, tiết kiệm tối đa băng thông VRAM cho bộ mã hóa video encoder
        failIfMajorPerformanceCaveat: false
    };
    const context = canvas.getContext('webgl2', glOptions);

    renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        context: context,
        antialias: isAntialias,
        powerPreference: activePowerPref,
        alpha: false,
        stencil: false,
        depth: true,
        desynchronized: true,
        preserveDrawingBuffer: false
    });`;

const repGl = `    const glOptions = {
        antialias: isAntialias,
        powerPreference: activePowerPref,
        alpha: false,
        stencil: false,
        depth: true,
        preserveDrawingBuffer: false,
        failIfMajorPerformanceCaveat: false
    };
    const context = canvas.getContext('webgl2', glOptions);

    renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        context: context,
        antialias: isAntialias,
        powerPreference: activePowerPref,
        alpha: false,
        stencil: false,
        depth: true,
        preserveDrawingBuffer: false
    });`;

if (code.includes(targetGl)) {
    code = code.replace(targetGl, repGl);
    console.log('1.1 Removed desynchronized from WebGL context in game.js');
} else {
    console.error('Target 1.1 (WebGL options) not found');
}

// 1.2 Remove desynchronized from bgVisualizerCanvas
const targetVisCtx = `visualizerCtx = bgVisualizerCanvas.getContext('2d', { alpha: true, desynchronized: true });`;
const repVisCtx = `visualizerCtx = bgVisualizerCanvas.getContext('2d', { alpha: true });`;
if (code.includes(targetVisCtx)) {
    code = code.replace(targetVisCtx, repVisCtx);
    console.log('1.2 Removed desynchronized from bgVisualizerCanvas in game.js');
} else {
    console.error('Target 1.2 (visualizerCtx) not found');
}

// 1.3 Replace smoothedDelta with getClampedDelta
const targetSmoothed = `// Frame Pacing & Delta Smoothing Filter (Triệt tiêu vi giật micro-stutter khi dùng OBS, Game Bar hoặc ShadowPlay)
let smoothedDelta = 0.016667;
function getSmoothedDelta(rawDelta) {
    // 1. Kẹp delta trong ngưỡng an toàn:
    // Chặn spike giật do encoder context switch hoặc OS process hitch (tối đa 50ms = 20 FPS worst-case)
    const clampedRaw = Math.max(0.001, Math.min(rawDelta, 0.05));

    // 2. Bộ lọc Exponential Moving Average (EMA) thích ứng:
    // Nếu chênh lệch lớn (VD vừa unpause, bắt đầu bài hát, hoặc giật lớn > 25ms), bám sát nhanh (alpha = 0.7)
    // Nếu dao động nhỏ quanh 60/120/144/240Hz thông thường, làm mượt chặt chẽ (alpha = 0.22)
    // giúp đồ thị frame pacing phẳng lỳ, video record không bị rung lắc bóng
    const diff = Math.abs(clampedRaw - smoothedDelta);
    const alpha = diff > 0.025 ? 0.7 : 0.22;
    smoothedDelta = smoothedDelta * (1.0 - alpha) + clampedRaw * alpha;
    return smoothedDelta;
}

function resetSmoothedDelta(seed = 0.016667) {
    smoothedDelta = seed;
    if (typeof clock !== 'undefined' && clock) {
        clock.getDelta(); // Xả sạch thời gian cũ tích lũy trong Three.js clock
    }
}
window.resetSmoothedDelta = resetSmoothedDelta;`;

const repSmoothed = `// Bộ chuẩn hóa delta an toàn: Kẹp trong [0.001s, 0.05s] (tương đương 20 FPS - 1000 FPS)
// Giữ nguyên 100% thời gian khung hình thực tế của màn hình (60Hz, 120Hz, 144Hz, 240Hz),
// triệt tiêu hoàn toàn độ trễ pha và hiện tượng rung giật tiến lùi ("lag giả trân").
function getClampedDelta(rawDelta) {
    return Math.max(0.001, Math.min(rawDelta, 0.05));
}

function resetSmoothedDelta() {
    if (typeof clock !== 'undefined' && clock) {
        clock.getDelta(); // Xả sạch thời gian cũ tích lũy trong Three.js clock
    }
}
window.resetSmoothedDelta = resetSmoothedDelta;`;

if (code.includes(targetSmoothed)) {
    code = code.replace(targetSmoothed, repSmoothed);
    console.log('1.3 Replaced getSmoothedDelta with getClampedDelta');
} else {
    console.error('Target 1.3 (smoothedDelta) not found');
}

// 1.4 Update delta = getClampedDelta(rawDelta)
const targetAnimateDelta = `    let rawDelta = clock.getDelta();
    let delta = getSmoothedDelta(rawDelta);`;

const repAnimateDelta = `    let rawDelta = clock.getDelta();
    let delta = getClampedDelta(rawDelta);`;

if (code.includes(targetAnimateDelta)) {
    code = code.replace(targetAnimateDelta, repAnimateDelta);
    console.log('1.4 Updated delta call in animate()');
} else {
    console.error('Target 1.4 (animate delta) not found');
}

// 1.5 Update frameDuration margin in limiter from 1.5 to 0.5
const targetLimiter = `        if (elapsed < frameDuration - 1.5) {
            return;
        }`;

const repLimiter = `        if (elapsed < frameDuration - 0.5) {
            return;
        }`;

if (code.includes(targetLimiter)) {
    code = code.replace(targetLimiter, repLimiter);
    console.log('1.5 Updated limiter tolerance to 0.5ms');
} else {
    console.error('Target 1.5 (limiter tolerance) not found');
}

// 1.6 Fix Audio Sync Correction to be gentle and not twitch delta
const targetAudioSync = `    // --- THUẬT TOÁN ĐỒNG BỘ NHẠC (AUDIO SYNC CORRECTION) ---
    // Liên tục kiểm tra tiến độ bài hát và bù trừ khung hình delta để ép game khớp chuẩn xác từng nhịp beat
    if (isPlaying && !isFalling && !isFailTransition && audio && !audio.paused) {
        let drift = currentAudioTime - accumulatedSongTime;

        // Tốc độ thực tế của nhạc chỉ đạt tối đa 2.6x, ta đồng bộ thời gian theo tốc độ này
        // để không vô tình làm giảm biến delta khi gameSpeed > 2.6
        let currentAudioSpeed = Math.min(3.0, gameSpeed);

        if (Math.abs(drift) > 0.03 && Math.abs(drift) < 1.0) {
            let correction = (drift * 0.1) / currentAudioSpeed;
            delta += correction;
            delta = Math.max(0.001, Math.min(delta, 0.05));
        } else if (Math.abs(drift) >= 1.0) {
            accumulatedSongTime = currentAudioTime;
        }
        accumulatedSongTime += delta * currentAudioSpeed;
    }

    if (delta > 0.05) delta = 0.05;`;

const repAudioSync = `    // --- THUẬT TOÁN ĐỒNG BỘ NHẠC (AUDIO SYNC CORRECTION ÊM DỊU) ---
    // HTML5 Audio currentTime chỉ cập nhật ngắt quãng mỗi 20-30ms từ driver âm thanh.
    // Trên màn hình 120Hz/144Hz/240Hz, chỉ can thiệp khi lệch thực sự (> 0.06s = 60ms)
    // và áp dụng hệ số bù trừ êm dịu (2% thay vì 10%), triệt tiêu hoàn toàn hiện tượng
    // bóng rung giật tiến lùi ("lag giả trân") do vận tốc bị giật cục.
    if (isPlaying && !isFalling && !isFailTransition && audio && !audio.paused) {
        let drift = currentAudioTime - accumulatedSongTime;
        let currentAudioSpeed = Math.min(3.0, gameSpeed);

        if (Math.abs(drift) > 0.06 && Math.abs(drift) < 1.0) {
            let gentleCorrection = (drift * 0.02) / currentAudioSpeed;
            delta += gentleCorrection;
            delta = Math.max(0.001, Math.min(delta, 0.05));
        } else if (Math.abs(drift) >= 1.0) {
            accumulatedSongTime = currentAudioTime;
        }
        accumulatedSongTime += delta * currentAudioSpeed;
    }

    if (delta > 0.05) delta = 0.05;`;

if (code.includes(targetAudioSync)) {
    code = code.replace(targetAudioSync, repAudioSync);
    console.log('1.6 Fixed audio sync gentle correction in game.js');
} else {
    console.error('Target 1.6 (audio sync) not found');
}

fs.writeFileSync(gamePath, isGameCRLF ? code.replace(/\n/g, '\r\n') : code, 'utf8');

// 2. UPDATE js/audio/visualizer.js (remove desynchronized: true)
const visPath = path.join(__dirname, '..', 'js', 'audio', 'visualizer.js');
let visCode = fs.readFileSync(visPath, 'utf8');
const isVisCRLF = visCode.includes('\r\n');
let vCode = visCode.replace(/\r\n/g, '\n');

const targetVisInit = `this.ctx = this.canvas.getContext('2d', { alpha: true, desynchronized: true });`;
const repVisInit = `this.ctx = this.canvas.getContext('2d', { alpha: true });`;
if (vCode.includes(targetVisInit)) {
    vCode = vCode.replace(targetVisInit, repVisInit);
    console.log('2. Removed desynchronized from visualizer.js');
} else {
    console.log('Visualizer target not found or already clean');
}
fs.writeFileSync(visPath, isVisCRLF ? vCode.replace(/\n/g, '\r\n') : vCode, 'utf8');

// 3. UPDATE js/engine/adaptive-performance.js (remove mid-game setPixelRatio stalls & fix 144Hz targetFps)
const apPath = path.join(__dirname, '..', 'js', 'engine', 'adaptive-performance.js');
let apCode = fs.readFileSync(apPath, 'utf8');
const isApCRLF = apCode.includes('\r\n');
let aCode = apCode.replace(/\r\n/g, '\n');

// 3.1 Remove mid-game setPixelRatio call when gameSpeed >= 1.35
const targetSpeedCap = `            // Bảo vệ băng thông Fillrate khi tốc độ game cao (gameSpeed >= 1.35)
            // Trên màn hình DPI cao (Windows scaling 125%/150% hoặc Retina), pixelRatio > 1.0
            // làm GPU phải render lượng pixel gấp 1.5x - 2.25x gây drop FPS sâu khi tốc độ tăng cao.
            if (gameSpeed >= 1.35 && typeof renderer !== 'undefined' && renderer) {
                if (renderer.getPixelRatio() > 1.0) {
                    this.saveOriginalState();
                    renderer.setPixelRatio(1.0);
                    this._cappedForSpeed = true;
                }
            } else if (this._cappedForSpeed && gameSpeed < 1.15 && this.currentLevel === 0) {
                this._cappedForSpeed = false;
                if (typeof updatePixelRatio === 'function') {
                    updatePixelRatio();
                }
            }`;

const repSpeedCap = `            // Lưu ý: Tuyệt đối KHÔNG gọi renderer.setPixelRatio(...) giữa chừng ván chơi
            // vì việc thay đổi kích thước canvas buffer sẽ khóa cứng WebGL pipeline 20-50ms gây giật cục.`;

if (aCode.includes(targetSpeedCap)) {
    aCode = aCode.replace(targetSpeedCap, repSpeedCap);
    console.log('3.1 Removed mid-game setPixelRatio in adaptive-performance.js');
} else {
    console.error('Target 3.1 (speedCap) not found');
}

// 3.2 Remove renderer.setPixelRatio from applyLevel (only adjust effect limits)
const targetApplyLevel = `        applyLevel: function (level) {
            this.saveOriginalState();

            switch (level) {
                case 1:
                    // Cấp độ 1: Giảm tải nhẹ
                    // Giới hạn pixelRatio về tối đa 1.0 (loại bỏ gánh nặng Retina / Windows Display Scaling 125%-175%)
                    if (typeof renderer !== 'undefined' && renderer) {
                        const curRatio = renderer.getPixelRatio();
                        if (curRatio > 1.0) {
                            renderer.setPixelRatio(1.0);
                        }
                    }
                    if (typeof GameEffectsManager !== 'undefined') {
                        GameEffectsManager.maxShockwaves = 20;
                    }
                    console.log("%c[AdaptivePerf] Kích hoạt Cấp 1: Capped PixelRatio 1.0, giảm tải Shockwaves", "color: #eab308;");
                    break;

                case 2:
                    // Cấp độ 2: Giảm tải trung bình
                    // Giảm pixelRatio xuống 0.85 (tăng mạnh tốc độ render trên GPU tích hợp Intel HD/UHD)
                    if (typeof renderer !== 'undefined' && renderer) {
                        renderer.setPixelRatio(0.85);
                    }
                    // Tạm ẩn StarField nếu đang bật để giải phóng băng thông GPU
                    if (typeof starField !== 'undefined' && starField) {
                        starField.visible = false;
                    }
                    if (typeof GameEffectsManager !== 'undefined') {
                        GameEffectsManager.maxShockwaves = 10;
                    }
                    // Rút ngắn tầm nhìn phía trước để giảm số lượng khối render
                    if (typeof blocksAheadLimit !== 'undefined') {
                        blocksAheadLimit = Math.max(4, Math.min(blocksAheadLimit, 5));
                    }
                    document.body.classList.add('adaptive-perf-boost');
                    console.log("%c[AdaptivePerf] Kích hoạt Cấp 2: PixelRatio 0.85, ẩn bụi sao, rút ngắn tầm nhìn", "color: #f97316; font-weight: bold;");
                    break;

                case 3:
                    // Cấp độ 3: Tối đa hóa hiệu năng (Ultra-Eco Mode)
                    if (typeof renderer !== 'undefined' && renderer) {
                        renderer.setPixelRatio(0.75);
                    }
                    if (typeof starField !== 'undefined' && starField) {
                        starField.visible = false;
                    }
                    if (typeof GameEffectsManager !== 'undefined') {
                        GameEffectsManager.maxShockwaves = 6;
                    }
                    if (typeof blocksAheadLimit !== 'undefined') {
                        blocksAheadLimit = 4;
                    }
                    document.body.classList.add('adaptive-perf-boost');
                    console.log("%c[AdaptivePerf] Kích hoạt Cấp 3: PixelRatio 0.75, tối giản đồ họa toàn diện", "color: #ef4444; font-weight: bold;");
                    break;
            }
        },`;

const repApplyLevel = `        applyLevel: function (level) {
            this.saveOriginalState();

            switch (level) {
                case 1:
                    // Cấp độ 1: Giảm tải nhẹ hiệu ứng
                    if (typeof GameEffectsManager !== 'undefined') {
                        GameEffectsManager.maxShockwaves = 20;
                    }
                    console.log("%c[AdaptivePerf] Kích hoạt Cấp 1: Giảm tải Shockwaves", "color: #eab308;");
                    break;

                case 2:
                    // Cấp độ 2: Giảm tải trung bình (ẩn bụi sao, rút ngắn tầm nhìn gạch)
                    if (typeof starField !== 'undefined' && starField) {
                        starField.visible = false;
                    }
                    if (typeof GameEffectsManager !== 'undefined') {
                        GameEffectsManager.maxShockwaves = 10;
                    }
                    if (typeof blocksAheadLimit !== 'undefined') {
                        blocksAheadLimit = Math.max(4, Math.min(blocksAheadLimit, 5));
                    }
                    document.body.classList.add('adaptive-perf-boost');
                    console.log("%c[AdaptivePerf] Kích hoạt Cấp 2: Ẩn bụi sao, rút ngắn tầm nhìn", "color: #f97316; font-weight: bold;");
                    break;

                case 3:
                    // Cấp độ 3: Tối đa hóa hiệu năng (tối giản hạt và shockwaves tối đa)
                    if (typeof starField !== 'undefined' && starField) {
                        starField.visible = false;
                    }
                    if (typeof GameEffectsManager !== 'undefined') {
                        GameEffectsManager.maxShockwaves = 6;
                    }
                    if (typeof blocksAheadLimit !== 'undefined') {
                        blocksAheadLimit = 4;
                    }
                    document.body.classList.add('adaptive-perf-boost');
                    console.log("%c[AdaptivePerf] Kích hoạt Cấp 3: Tối giản đồ họa toàn diện", "color: #ef4444; font-weight: bold;");
                    break;
            }
        },`;

if (aCode.includes(targetApplyLevel)) {
    aCode = aCode.replace(targetApplyLevel, repApplyLevel);
    console.log('3.2 Removed pixelRatio modifications from applyLevel in adaptive-performance.js');
} else {
    console.error('Target 3.2 (applyLevel) not found');
}

// 3.3 Fix evaluatePerformance targetFps on high refresh rate displays and eco mode
const targetEval = `            let targetFps = 60;
            if (typeof window.maxFps !== 'undefined' && window.maxFps > 0 && window.maxFps <= 360 && window.maxFps !== 362) {
                targetFps = window.maxFps;
            } else if (this.maxDetectedFps > 180) {
                targetFps = 240;
            } else if (this.maxDetectedFps > 130) {
                targetFps = 144;
            } else if (this.maxDetectedFps > 95) {
                targetFps = 120;
            }`;

const repEval = `            let targetFps = 60;
            if (typeof window.maxFps !== 'undefined' && window.maxFps > 0 && window.maxFps <= 360) {
                targetFps = window.maxFps;
            } else if (typeof window.maxFps !== 'undefined' && window.maxFps === 362) {
                targetFps = 60;
            } else if (this.maxDetectedFps > 180) {
                targetFps = 240;
            } else if (this.maxDetectedFps > 130) {
                targetFps = 144;
            } else if (this.maxDetectedFps > 95) {
                targetFps = 120;
            }`;

if (aCode.includes(targetEval)) {
    aCode = aCode.replace(targetEval, repEval);
    console.log('3.3 Fixed targetFps in adaptive-performance.js');
} else {
    console.error('Target 3.3 (evaluatePerformance) not found');
}

fs.writeFileSync(apPath, isApCRLF ? aCode.replace(/\n/g, '\r\n') : aCode, 'utf8');

// 4. UPDATE js/ui/settings.js default maxFps to 361 (Vs thiết bị / V-Sync)
const setPath = path.join(__dirname, '..', 'js', 'ui', 'settings.js');
let setCode = fs.readFileSync(setPath, 'utf8');
const isSetCRLF = setCode.includes('\r\n');
let sCode = setCode.replace(/\r\n/g, '\n');

const targetSetFps = `let maxFps = localStorage.getItem('maxFps') !== null ? parseInt(localStorage.getItem('maxFps')) : 0;`;
const repSetFps = `// Mặc định chọn 361 (Vs thiết bị / V-Sync) để khóa 1:1 với tần số quét thực tế của màn hình (60Hz, 120Hz, 144Hz, 240Hz), triệt tiêu hoàn toàn judder giật hình
let maxFps = localStorage.getItem('maxFps') !== null ? parseInt(localStorage.getItem('maxFps')) : 361;`;

if (sCode.includes(targetSetFps)) {
    sCode = sCode.replace(targetSetFps, repSetFps);
    console.log('4. Updated default maxFps to 361 (Vs thiết bị / V-Sync) in settings.js');
} else {
    console.log('Settings maxFps already updated or not found');
}

fs.writeFileSync(setPath, isSetCRLF ? sCode.replace(/\n/g, '\r\n') : sCode, 'utf8');

console.log('ALL FIXES COMPLETED!');

