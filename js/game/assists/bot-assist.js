// ============================================================
// bot-assist.js — Logic Hỗ trợ vào tâm (Bot Assist)
// ============================================================

window.BotAssistManager = {
    _getTargetX: function (targetTile, customTargetX) {
        if (customTargetX !== undefined) return customTargetX;
        if (!targetTile) return 0;
        const ud = targetTile.userData;
        return (ud && ud.isDashTile && ud.startX !== undefined) ? ud.startX : targetTile.position.x;
    },

    applyAssist: function (diffX, ball, targetTile, tileScale, customTargetX) {
        // Không hoạt động nếu Autoplay hoặc Relax Mode đang bật
        const isAuto = typeof isAutoplay !== 'undefined' && isAutoplay;
        const isNat = typeof isNaturalAutoplay !== 'undefined' && isNaturalAutoplay;
        if (isAuto || isNat) return diffX;

        const activeScale = (targetTile && targetTile.userData && targetTile.userData.scale) || tileScale || 1.0;
        const tWidth = typeof tileWidth !== 'undefined' ? tileWidth : 4.5;

        // Chỉ hỗ trợ khi bóng cách tâm không quá 50% (của nửa độ rộng khối)
        const threshold = (tWidth * activeScale) / 2 * 0.5;
        if (diffX > threshold) return diffX;

        // Hút bóng vào đúng tâm
        const targetX = this._getTargetX(targetTile, customTargetX);
        ball.position.x = targetX;

        // Đồng bộ ballTargetX để bóng không bị giật ngược lại khi người chơi nhấn giữ (không di chuyển)
        if (typeof ballTargetX !== 'undefined') ballTargetX = targetX;

        return 0; // Trả về 0 để hệ thống nhận diện là PERFECT
    },

    canSaveRecord: function () {
        // Không lưu điểm nếu Bot Assist đang được kích hoạt
        return !(typeof botAssistEnabled !== 'undefined' && botAssistEnabled);
    }
};