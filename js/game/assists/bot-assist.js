// ============================================================
// bot-assist.js — Logic Hỗ trợ vào tâm (Bot Assist)
// ============================================================

window.BotAssistManager = {
    applyAssist: function (diffX, ball, targetTile, tileScale, customTargetX) {
        const isAuto = typeof isAutoplay !== 'undefined' && isAutoplay;
        const isNat = typeof isNaturalAutoplay !== 'undefined' && isNaturalAutoplay;

        // Không hoạt động nếu Autoplay hoặc Relax Mode đang bật
        if (isAuto || isNat) return diffX;

        const targetX = (customTargetX !== undefined)
            ? customTargetX
            : ((targetTile && targetTile.userData && targetTile.userData.isDashTile && targetTile.userData.startX !== undefined)
                ? targetTile.userData.startX
                : (targetTile ? targetTile.position.x : 0));

        const activeScale = (targetTile && targetTile.userData && targetTile.userData.scale) || tileScale || 1.0;
        const tWidth = typeof tileWidth !== 'undefined' ? tileWidth : 4.5;
        const halfWidth = (tWidth * activeScale) / 2;

        // Nếu bóng cách tâm không quá 50% (của nửa độ rộng khối)
        const threshold = halfWidth * 0.5;

        if (diffX <= threshold) {
            // Hút bóng vào đúng tâm
            ball.position.x = targetX;

            // Fix: Đồng bộ ballTargetX để bóng không bị giật ngược lại khi người chơi nhấn giữ (không di chuyển)
            if (typeof ballTargetX !== 'undefined') {
                ballTargetX = targetX;
            }
            return 0; // Trả về 0 để hệ thống nhận diện là PERFECT
        }

        return diffX;
    },

    canSaveRecord: function () {
        // Không lưu điểm nếu Bot Assist đang được kích hoạt
        return !(typeof botAssistEnabled !== 'undefined' && botAssistEnabled);
    }
};