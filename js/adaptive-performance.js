// ============================================================
// adaptive-performance.js — Bộ Điều Phối Hiệu Năng Thích Ứng Tự Động
// Giám sát FPS thời gian thực trong lúc chơi game, tự động điều tiết
// tải GPU/CPU (Pixel Ratio, Particle Fields, Shockwave limits, View distance)
// khi máy yếu có dấu hiệu tụt khung hình, đảm bảo game duy trì ổn định 60 FPS.
// ============================================================

(function () {
    const AdaptivePerformanceManager = {
        enabled: true,
        currentLevel: 0, // 0: Normal, 1: Minor throttle, 2: Moderate throttle, 3: Ultra-eco
        
        // Đo đạc FPS
        lastTime: 0,
        frameCount: 0,
        rollingFps: 60,
        fpsHistory: [],
        maxHistory: 5,
        
        // Bộ đếm thời gian sụt/tăng FPS
        lowFpsDuration: 0,
        highFpsDuration: 0,
        
        // Lưu trữ giá trị cấu hình gốc để khôi phục
        savedSettings: {
            pixelRatio: null,
            maxShockwaves: 40,
            blocksAheadLimit: null,
            starFieldVisible: true,
            isApplied: false
        },

        init: function () {
            this.reset();
        },

        reset: function () {
            this.currentLevel = 0;
            this.lowFpsDuration = 0;
            this.highFpsDuration = 0;
            this.fpsHistory = [];
            this.frameCount = 0;
            this.lastTime = performance.now();
            this.restore();
        },

        /**
         * Được gọi mỗi frame từ hàm animate() trong game.js
         * @param {number} now - performance.now()
         * @param {boolean} isPlaying - game đang trong trạng thái chơi
         */
        tick: function (now, isPlaying) {
            if (!this.enabled || !isPlaying) {
                this.frameCount = 0;
                this.lastTime = now;
                return;
            }

            this.frameCount++;
            const elapsed = now - this.lastTime;

            // Đo FPS mỗi 600ms để có mẫu đo ổn định, tránh spike tức thời
            if (elapsed >= 600) {
                const currentFps = (this.frameCount * 1000) / elapsed;
                this.frameCount = 0;
                this.lastTime = now;

                this.fpsHistory.push(currentFps);
                if (this.fpsHistory.length > this.maxHistory) {
                    this.fpsHistory.shift();
                }

                // Tính FPS trung bình trượt
                let sum = 0;
                for (let i = 0; i < this.fpsHistory.length; i++) {
                    sum += this.fpsHistory[i];
                }
                this.rollingFps = sum / this.fpsHistory.length;

                this.evaluatePerformance(this.rollingFps, elapsed / 1000);
            }
        },

        evaluatePerformance: function (avgFps, intervalSec) {
            // Nếu FPS tụt dưới 48 (bắt đầu có hiện tượng giật/drop khung hình trên màn hình 60Hz+)
            if (avgFps < 48) {
                this.lowFpsDuration += intervalSec;
                this.highFpsDuration = 0;

                // Nếu FPS thấp liên tục trong 1.2 giây
                if (this.lowFpsDuration >= 1.2) {
                    this.lowFpsDuration = 0;
                    this.escalateThrottling();
                }
            } 
            // Nếu FPS ổn định trên 57 FPS
            else if (avgFps >= 57) {
                this.highFpsDuration += intervalSec;
                this.lowFpsDuration = 0;

                // Nếu FPS cao ổn định trong 4 giây liên tiếp và đang bị throttle
                if (this.highFpsDuration >= 4.0 && this.currentLevel > 0) {
                    this.highFpsDuration = 0;
                    this.deescalateThrottling();
                }
            } else {
                // FPS ở ngưỡng an toàn (48 - 57), giảm dần bộ đếm
                this.lowFpsDuration = Math.max(0, this.lowFpsDuration - intervalSec * 0.5);
                this.highFpsDuration = Math.max(0, this.highFpsDuration - intervalSec * 0.5);
            }
        },

        escalateThrottling: function () {
            if (this.currentLevel >= 3) return; // Đã ở mức tối đa

            this.currentLevel++;
            this.applyLevel(this.currentLevel);
        },

        deescalateThrottling: function () {
            if (this.currentLevel <= 0) return;

            this.currentLevel--;
            if (this.currentLevel === 0) {
                this.restore();
            } else {
                this.applyLevel(this.currentLevel);
            }
        },

        saveOriginalState: function () {
            if (this.savedSettings.isApplied) return;

            if (typeof renderer !== 'undefined' && renderer) {
                this.savedSettings.pixelRatio = renderer.getPixelRatio();
            }
            if (typeof GameEffectsManager !== 'undefined') {
                this.savedSettings.maxShockwaves = GameEffectsManager.maxShockwaves || 40;
            }
            if (typeof blocksAheadLimit !== 'undefined') {
                this.savedSettings.blocksAheadLimit = blocksAheadLimit;
            }
            if (typeof starField !== 'undefined' && starField) {
                this.savedSettings.starFieldVisible = starField.visible;
            }
            this.savedSettings.isApplied = true;
        },

        applyLevel: function (level) {
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
        },

        restore: function () {
            if (!this.savedSettings.isApplied) return;

            if (typeof renderer !== 'undefined' && renderer && typeof updatePixelRatio === 'function') {
                updatePixelRatio(); // Khôi phục lại pixelRatio chuẩn theo Graphics Settings
            }

            if (typeof GameEffectsManager !== 'undefined') {
                GameEffectsManager.maxShockwaves = this.savedSettings.maxShockwaves || 40;
            }

            if (typeof blocksAheadLimit !== 'undefined' && this.savedSettings.blocksAheadLimit !== null) {
                blocksAheadLimit = this.savedSettings.blocksAheadLimit;
            }

            if (typeof starField !== 'undefined' && starField) {
                const bgEnabled = typeof bgParticlesEnabled !== 'undefined' ? bgParticlesEnabled : true;
                const isPerfMode = typeof performanceModeEnabled !== 'undefined' ? performanceModeEnabled : false;
                starField.visible = bgEnabled && !isPerfMode && (typeof currentGraphicsQuality !== 'undefined' && currentGraphicsQuality !== 'simple');
            }

            document.body.classList.remove('adaptive-perf-boost');
            this.savedSettings.isApplied = false;
            this.currentLevel = 0;
            console.log("%c[AdaptivePerf] Khôi phục toàn bộ thiết lập đồ họa ban đầu", "color: #10b981; font-weight: bold;");
        }
    };

    window.AdaptivePerformanceManager = AdaptivePerformanceManager;
})();
