// ============================================================
// autoplay.js — Logic điều khiển tự động (Autoplay & Bot)
// ============================================================

window.AutoplayManager = {
    _btn: null,
    _progressEl: null,
    _lastDisplay: null,
    _lastDashOffset: null,
    _result: { targetX: null, holdExited: false },

    _initDOM: function () {
        if (!this._btn) this._btn = document.getElementById('autoplay-back-btn');
        if (!this._progressEl) this._progressEl = document.getElementById('hold-progress');
    },

    update: function (delta, tiles, currentTileIndex, isFalling, isFailTransition, jumpElapsedTime, flightTime, ball) {
        this._initDOM();
        this._result.targetX = null;
        this._result.holdExited = false;

        const isAuto = typeof isAutoplay !== 'undefined' && isAutoplay;
        const isNat = typeof isNaturalAutoplay !== 'undefined' && isNaturalAutoplay;
        const active = isAuto || isNat;
        const showExit = active || (typeof autoFullscreenEnabled !== 'undefined' && autoFullscreenEnabled);

        // Cấu hình thời gian giữ: autoplay/relax mode giữ 1s, chơi thường toàn màn hình giữ 3s
        const exitHoldDuration = active ? 1.0 : 3.0;

        // 1. Quản lý UI Giữ để thoát (Tối ưu Dirty Check - Tránh Layout Thrashing)
        if (showExit && !isFailTransition) {
            if (this._lastDisplay !== 'flex') {
                if (this._btn) this._btn.style.display = 'flex';
                this._lastDisplay = 'flex';
            }

            if (typeof isHoldingBtn !== 'undefined' && (isHoldingBtn || (typeof keys !== 'undefined' && keys['Escape']))) {
                if (typeof holdTime !== 'undefined') {
                    holdTime += delta;
                    const progress = Math.min(holdTime / exitHoldDuration, 1.0);
                    const newOffset = Math.round(176 - (progress * 176));
                    if (this._lastDashOffset !== newOffset) {
                        if (this._progressEl) this._progressEl.style.strokeDashoffset = newOffset;
                        this._lastDashOffset = newOffset;
                    }

                    if (holdTime >= exitHoldDuration) {
                        holdTime = 0;
                        this._result.holdExited = true;
                    }
                }
            } else {
                if (typeof holdTime !== 'undefined') holdTime = 0;
                if (this._lastDashOffset !== 176) {
                    if (this._progressEl) this._progressEl.style.strokeDashoffset = 176;
                    this._lastDashOffset = 176;
                }
            }
        } else {
            if (this._lastDisplay !== 'none') {
                if (this._btn) this._btn.style.display = 'none';
                this._lastDisplay = 'none';
            }
            if (typeof holdTime !== 'undefined') holdTime = 0;
            if (this._lastDashOffset !== 176) {
                if (this._progressEl) this._progressEl.style.strokeDashoffset = 176;
                this._lastDashOffset = 176;
            }
        }

        // 2. Tính toán vị trí bóng tự động (Smooth Trajectory từ ô hiện tại sang ô tiếp theo)
        if (active && !isFalling && !isFailTransition && tiles) {
            const currentTile = tiles[currentTileIndex];
            const nextTile = tiles[currentTileIndex + 1];

            if (nextTile) {
                if (isNat && nextTile.userData.autoNoise === undefined) {
                    nextTile.userData.autoNoise = (Math.random() - 0.5) * 1.2;
                }

                const endX = nextTile.position.x + (isNat ? (nextTile.userData.autoNoise || 0) : 0);

                let startX = endX;
                if (currentTile) {
                    startX = currentTile.position.x + (isNat ? (currentTile.userData.autoNoise || 0) : 0);
                } else if (ball) {
                    startX = ball.position.x;
                }

                let progress = 1.0;
                if (typeof flightTime !== 'undefined' && flightTime > 0 && typeof jumpElapsedTime !== 'undefined') {
                    progress = Math.min(1.0, Math.max(0.0, jumpElapsedTime / flightTime));
                }

                // Dùng nội suy Cosine Smooth Step cho chuyển động tự nhiên, không giật
                const smoothProgress = isNat ? (0.5 - 0.5 * Math.cos(progress * Math.PI)) : progress;
                this._result.targetX = startX + (endX - startX) * smoothProgress;
            } else if (currentTile) {
                this._result.targetX = currentTile.position.x + (isNat ? (currentTile.userData.autoNoise || 0) : 0);
            }
        }

        return this._result;
    },

    applyPerfectAim: function (diffX, ball, targetTile) {
        if (typeof isAutoplay !== 'undefined' && isAutoplay) {
            if (ball && targetTile) ball.position.x = targetTile.position.x;
            return 0;
        }
        return diffX;
    },

    getLerpSpeed: function (gameSpeed, sensitivity) {
        const isAuto = typeof isAutoplay !== 'undefined' && isAutoplay;
        const isNat = typeof isNaturalAutoplay !== 'undefined' && isNaturalAutoplay;
        if (isAuto) return 25 * Math.max(1.0, gameSpeed * 0.8);
        if (isNat) return 20 * Math.max(1.0, gameSpeed * 0.8);
        return 15 * sensitivity * Math.max(1.0, gameSpeed * 0.8);
    },

    canSaveRecord: function () {
        const isAuto = typeof isAutoplay !== 'undefined' && isAutoplay;
        const isNat = typeof isNaturalAutoplay !== 'undefined' && isNaturalAutoplay;
        return !isAuto && !isNat;
    },

    shouldBypassInput: function () {
        const isAuto = typeof isAutoplay !== 'undefined' && isAutoplay;
        const isNat = typeof isNaturalAutoplay !== 'undefined' && isNaturalAutoplay;
        return isAuto || isNat;
    }
};