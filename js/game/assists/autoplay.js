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

            // Nếu đang trong trạng thái Dash (lướt trên gạch dài), bóng bám sát trục X của dash tile hiện tại
            if (typeof window !== 'undefined' && window.isDashing) {
                const dashTile = (typeof window.dashTargetTile !== 'undefined' && window.dashTargetTile) ? window.dashTargetTile : currentTile;
                if (dashTile) {
                    let targetTileX = dashTile.position.x;
                    if (dashTile.userData && dashTile.userData.isDashTile) {
                        const startZ = dashTile.userData.startZ !== undefined ? dashTile.userData.startZ : dashTile.position.z;
                        const exitZ = dashTile.userData.endZ !== undefined ? dashTile.userData.endZ : (dashTile.position.z - (dashTile.userData.dashLength || 0) / 2);
                        const startX = dashTile.userData.startX !== undefined ? dashTile.userData.startX : dashTile.position.x;
                        const exitX = dashTile.userData.isMoving
                            ? dashTile.position.x
                            : (dashTile.userData.exitX !== undefined ? dashTile.userData.exitX : dashTile.position.x);

                        if (!dashTile.userData.isMoving && ball) {
                            const totalZDist = Math.max(0.001, startZ - exitZ);
                            const tRatio = Math.max(0, Math.min(1, (startZ - ball.position.z) / totalZDist));
                            targetTileX = startX + tRatio * (exitX - startX);
                        } else if (dashTile.userData.isMoving) {
                            targetTileX = dashTile.position.x;
                        }
                    }

                    // Không thêm autoNoise hoặc kéo lệch khỏi đường runway khi đang lướt dash
                    this._result.targetX = targetTileX;
                    return this._result;
                }
            }

            if (nextTile) {
                const isNextDash = nextTile.userData && nextTile.userData.isDashTile;
                if (isNat && nextTile.userData.autoNoise === undefined) {
                    // Với Dash Tile, không áp autoNoise để bóng vào mượt và bám đúng tâm lối vào startX
                    nextTile.userData.autoNoise = isNextDash ? 0 : (Math.random() - 0.5) * 1.2;
                }

                const endTargetX = (isNextDash && nextTile.userData.startX !== undefined)
                    ? (nextTile.userData.isMoving ? nextTile.position.x : nextTile.userData.startX)
                    : nextTile.position.x;
                const endNoise = (isNat && !isNextDash) ? (nextTile.userData.autoNoise || 0) : 0;
                const endX = endTargetX + endNoise;

                let startX = endX;
                if (currentTile) {
                    const isCurrentDash = currentTile.userData && currentTile.userData.isDashTile;
                    const currentTileRefX = isCurrentDash
                        ? (currentTile.userData.isMoving ? currentTile.position.x : (currentTile.userData.exitX !== undefined ? currentTile.userData.exitX : currentTile.position.x))
                        : currentTile.position.x;
                    const currentNoise = (isNat && !isCurrentDash) ? (currentTile.userData.autoNoise || 0) : 0;
                    startX = currentTileRefX + currentNoise;
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
                const isCurrentDash = currentTile.userData && currentTile.userData.isDashTile;
                const currentTileRefX = isCurrentDash
                    ? (currentTile.userData.isMoving ? currentTile.position.x : (currentTile.userData.exitX !== undefined ? currentTile.userData.exitX : currentTile.position.x))
                    : currentTile.position.x;
                const currentNoise = (isNat && !isCurrentDash) ? (currentTile.userData.autoNoise || 0) : 0;
                this._result.targetX = currentTileRefX + currentNoise;
            }
        }

        return this._result;
    },

    applyPerfectAim: function (diffX, ball, targetTile, customTargetX) {
        if (typeof isAutoplay !== 'undefined' && isAutoplay) {
            const tgtX = (customTargetX !== undefined)
                ? customTargetX
                : ((targetTile && targetTile.userData && targetTile.userData.isDashTile && targetTile.userData.startX !== undefined)
                    ? targetTile.userData.startX
                    : (targetTile ? targetTile.position.x : 0));
            if (ball) ball.position.x = tgtX;
            if (typeof ballTargetX !== 'undefined') {
                ballTargetX = tgtX;
            }
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