// ============================================================
// autoplay.js — Logic điều khiển tự động (Autoplay & Bot)
// ============================================================

window.AutoplayManager = {
    update: function(delta, tiles, currentTileIndex, isFalling, isFailTransition, jumpElapsedTime, flightTime, ball) {
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
        
        // 2. Tính toán vị trí bóng tự động (Smooth Trajectory từ ô hiện tại sang ô tiếp theo)
        if (active && !isFalling && !isFailTransition && tiles) {
            const currentTile = tiles[currentTileIndex];
            const nextTile = tiles[currentTileIndex + 1];

            if (nextTile) {
                // Tính độ lệch tự nhiên cho ô tiếp theo nếu là Naturally / Relax
                if (isNat) {
                    if (nextTile.userData.autoNoise === undefined) {
                        nextTile.userData.autoNoise = (Math.random() - 0.5) * 1.4;
                    }
                }

                const endX = nextTile.position.x + (isNat ? (nextTile.userData.autoNoise || 0) : 0);

                // Điểm bắt đầu (ô hiện tại mà bóng vừa bật lên)
                let startX = endX;
                if (currentTile) {
                    startX = currentTile.position.x + (isNat ? (currentTile.userData.autoNoise || 0) : 0);
                } else if (ball) {
                    startX = ball.position.x;
                }

                // Tiến độ nhịp nhảy từ 0.0 -> 1.0
                let progress = 1.0;
                if (typeof flightTime !== 'undefined' && flightTime > 0 && typeof jumpElapsedTime !== 'undefined') {
                    progress = Math.min(1.0, Math.max(0.0, jumpElapsedTime / flightTime));
                }

                // Di chuyển tuyến tính mượt mà dọc theo quỹ đạo nhảy (trung điểm nhịp sẽ ở đúng trung điểm 2 ô)
                result.targetX = startX + (endX - startX) * progress;
            } else if (currentTile) {
                result.targetX = currentTile.position.x + (isNat ? (currentTile.userData.autoNoise || 0) : 0);
            }
        }
        return result;
    },
    applyPerfectAim: function(diffX, ball, targetTile) {
        if (typeof isAutoplay !== 'undefined' && isAutoplay) {
            if (ball && targetTile) ball.position.x = targetTile.position.x; // Khóa dính tâm hoàn hảo cho Autoplay (Admin)
            return 0; // Luôn luôn trả về 0 độ lệch để tính Perfect
        }
        return diffX;
    },
    getLerpSpeed: function(gameSpeed, sensitivity) {
        const isAuto = typeof isAutoplay !== 'undefined' && isAutoplay;
        const isNat = typeof isNaturalAutoplay !== 'undefined' && isNaturalAutoplay;
        if (isAuto) return 25 * Math.max(1.0, gameSpeed * 0.8);
        if (isNat) return 20 * Math.max(1.0, gameSpeed * 0.8);
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