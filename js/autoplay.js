// ============================================================
// autoplay.js — Logic điều khiển tự động (Autoplay & Bot)
// ============================================================

window.AutoplayManager = {
    update: function(delta, tiles, currentTileIndex, isFalling, isFailTransition) {
        let result = { targetX: null, holdExited: false };
        const isAuto = typeof isAutoplay !== 'undefined' && isAutoplay;
        const isNat = typeof isNaturalAutoplay !== 'undefined' && isNaturalAutoplay;
        const active = isAuto || isNat;
        const showExit = active || (typeof autoFullscreenEnabled !== 'undefined' && autoFullscreenEnabled);
        
        const autoplayBackBtn = document.getElementById('autoplay-back-btn');
        const holdProgressEl = document.getElementById('hold-progress');
        
        // Cấu hình thời gian giữ: autoplay/relax mode giữ 1s, chơi thường toàn màn hình giữ 3s
        const exitHoldDuration = active ? 1.0 : 3.0;
        
        // 1. Quản lý UI Giữ để thoát
        if (showExit && !isFailTransition) {
            if (autoplayBackBtn) autoplayBackBtn.style.display = 'flex';
            if (typeof isHoldingBtn !== 'undefined' && (isHoldingBtn || (typeof keys !== 'undefined' && keys['Escape']))) {
                if (typeof holdTime !== 'undefined') {
                    holdTime += delta;
                    let progress = Math.min(holdTime / exitHoldDuration, 1.0);
                    if (holdProgressEl) holdProgressEl.style.strokeDashoffset = 176 - (progress * 176);

                    if (holdTime >= exitHoldDuration) {
                        holdTime = 0;
                        result.holdExited = true;
                    }
                }
            } else {
                if (typeof holdTime !== 'undefined') holdTime = 0;
                if (holdProgressEl) holdProgressEl.style.strokeDashoffset = 176;
            }
        } else {
            if (autoplayBackBtn) autoplayBackBtn.style.display = 'none';
            if (typeof holdTime !== 'undefined') holdTime = 0;
            if (holdProgressEl) holdProgressEl.style.strokeDashoffset = 176;
        }
        
        // 2. Tính toán vị trí bóng tự động
        if (active && !isFalling && !isFailTransition) {
            const nextTile = tiles[currentTileIndex + 1];
            if (nextTile) {
                if (isNat) {
                    if (nextTile.userData.autoNoise === undefined) {
                        nextTile.userData.autoNoise = (Math.random() - 0.5) * 1.5;
                    }
                    result.targetX = nextTile.position.x + nextTile.userData.autoNoise;
                } else {
                    result.targetX = nextTile.position.x;
                }
            }
        }
        return result;
    },
    applyPerfectAim: function(diffX, ball, targetTile) {
        if (typeof isAutoplay !== 'undefined' && isAutoplay) {
            if (ball && targetTile) ball.position.x = targetTile.position.x; // Khóa dính tâm hoàn hảo
            return 0; // Luôn luôn trả về 0 độ lệch để tính Perfect
        }
        return diffX;
    },
    getLerpSpeed: function(gameSpeed, sensitivity) {
        const isAuto = typeof isAutoplay !== 'undefined' && isAutoplay;
        const isNat = typeof isNaturalAutoplay !== 'undefined' && isNaturalAutoplay;
        if (isAuto) return 25 * Math.max(1.0, gameSpeed * 0.8);
        if (isNat) return 10 * Math.max(1.0, gameSpeed * 0.8);
        return 15 * sensitivity * Math.max(1.0, gameSpeed * 0.8); // Default fallback
    },
    canSaveRecord: function() {
        const isAuto = typeof isAutoplay !== 'undefined' && isAutoplay;
        const isNat = typeof isNaturalAutoplay !== 'undefined' && isNaturalAutoplay;
        return !isAuto && !isNat;
    },
    shouldBypassInput: function() {
        const isAuto = typeof isAutoplay !== 'undefined' && isAutoplay;
        const isNat = typeof isNaturalAutoplay !== 'undefined' && isNaturalAutoplay;
        return isAuto || isNat;
    }
};