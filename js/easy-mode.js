// ============================================================
// easy-mode.js — Quản lý Chế độ Dễ (Easy Mode)
// ============================================================

window.EasyModeManager = {
    isEnabled: localStorage.getItem('easyModeEnabled') === 'true',

    setMode: function (enabled) {
        this.isEnabled = enabled;
        localStorage.setItem('easyModeEnabled', enabled);

        // Cập nhật giao diện nếu có thay đổi
        const toggleEasyMode = document.getElementById('toggle-easy-mode');
        if (toggleEasyMode && toggleEasyMode.checked !== enabled) {
            toggleEasyMode.checked = enabled;
        }

        // Tương khắc với các chế độ khác (Nếu bật Easy Mode -> Tắt Hard Mode & Asian Mode)
        if (enabled) {
            if (typeof window.HardModeManager !== 'undefined' && window.HardModeManager.isEnabled) {
                window.HardModeManager.setMode(false);
            }
            if (typeof window.AsianModeManager !== 'undefined' && window.AsianModeManager.isEnabled) {
                window.AsianModeManager.setMode(false);
            }
        }

        // Cập nhật nền menu chính & màu sắc chủ đề theo độ khó
        if (typeof window.updateMainMenuTheme === 'function') {
            window.updateMainMenuTheme();
        } else {
            this.updateMenuBackground();
        }
    },

    updateMenuBackground: function () {
        const startScreen = document.getElementById('start-screen');
        if (!startScreen) return;

        let easyBg = document.getElementById('start-screen-easy-bg');
        if (!easyBg) {
            easyBg = document.createElement('div');
            easyBg.id = 'start-screen-easy-bg';
            easyBg.style.position = 'absolute';
            easyBg.style.top = '0';
            easyBg.style.left = '0';
            easyBg.style.width = '100%';
            easyBg.style.height = '100%';
            easyBg.style.zIndex = '0';
            easyBg.style.pointerEvents = 'none';
            easyBg.style.background = 'radial-gradient(circle at bottom, rgba(34, 197, 94, 0.45) 0%, rgba(2, 24, 10, 0.96) 80%)';
            easyBg.style.opacity = '0';
            easyBg.style.transition = 'opacity 0.8s ease-in-out';
            startScreen.insertBefore(easyBg, startScreen.firstChild);
        }

        if (this.isEnabled) {
            easyBg.style.opacity = '1';
        } else {
            easyBg.style.opacity = '0';
        }
    },

    // Hiệu ứng nền xanh lá rực lên khi nhấn / nhảy trong Easy Mode
    triggerPressEffect: function () {
        if (!this.isEnabled) return;
        let pressBg = document.getElementById('easy-press-bg');
        if (!pressBg) {
            pressBg = document.createElement('div');
            pressBg.id = 'easy-press-bg';
            pressBg.style.position = 'fixed';
            pressBg.style.top = '0';
            pressBg.style.left = '0';
            pressBg.style.width = '100%';
            pressBg.style.height = '100%';
            pressBg.style.zIndex = '1';
            pressBg.style.pointerEvents = 'none';
            pressBg.style.background = 'radial-gradient(circle at center, rgba(34, 197, 94, 0.45) 0%, rgba(16, 185, 129, 0.15) 50%, rgba(2, 24, 10, 0.85) 100%)';
            pressBg.style.opacity = '0';
            pressBg.style.transition = 'opacity 0.15s ease-out';
            document.body.appendChild(pressBg);
        }

        pressBg.style.opacity = '0.75';
        if (this._pressTimeout) clearTimeout(this._pressTimeout);
        this._pressTimeout = setTimeout(() => {
            if (pressBg) pressBg.style.opacity = '0.15';
        }, 160);
    },

    clearPressEffect: function () {
        const pressBg = document.getElementById('easy-press-bg');
        if (pressBg) pressBg.style.opacity = '0';
    },

    // Tính toán khoảng cách lệch ngang tối đa (maxDeltaX) của block
    calculateMaxDeltaX: function (timeDiff, normalMaxDeltaX) {
        if (!this.isEnabled) return normalMaxDeltaX;

        if (timeDiff < 0.25) {
            return 0;
        } else if (timeDiff <= 0.8) {
            return normalMaxDeltaX * 0.5;
        }
        return normalMaxDeltaX;
    },

    // Ngưỡng thời gian để block có thể là moving block
    getMovingBlockThreshold: function () {
        return this.isEnabled ? 0.4 : 0.2;
    },

    // Vô hiệu hóa hoàn toàn khối giả (fake blocks) trong Easy Mode
    getFakeBlockThreshold: function () {
        return this.isEnabled ? Infinity : 0.25;
    }
};

// ============================================================
// EasyGameOverCloverManager — Quản lý hiệu ứng cỏ 4 lá rơi màn hình Game Over (Tối ưu 60 FPS)
// ============================================================
window.EasyGameOverCloverManager = {
    canvas: null,
    ctx: null,
    animationFrameId: null,
    clovers: [],
    isActive: false,
    width: 0,
    height: 0,
    cloverTexture: null,

    init: function () {
        if (this.canvas) return;

        this.canvas = document.getElementById('gameover-fire-canvas');
        if (!this.canvas) return;

        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';

        this.ctx = this.canvas.getContext('2d');

        window.addEventListener('resize', () => {
            if (this.isActive) {
                this.resizeCanvas();
            }
        });
    },

    resizeCanvas: function () {
        if (!this.canvas) return;
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
    },

    // Cache kết cấu cỏ 4 lá sang Offscreen Canvas để tối ưu hiệu năng (Tránh shadowBlur & path vẽ lại mỗi khung hình)
    createCloverTexture: function () {
        if (this.cloverTexture) return;

        const size = 64;
        const offCanvas = document.createElement('canvas');
        offCanvas.width = size;
        offCanvas.height = size;
        const ctx = offCanvas.getContext('2d');

        const cx = size / 2;
        const cy = size / 2 - 2;

        ctx.save();
        ctx.translate(cx, cy);

        // Pre-baked Glow (Chỉ vẽ 1 lần duy nhất)
        ctx.shadowColor = 'rgba(74, 222, 128, 0.75)';
        ctx.shadowBlur = 10;

        // Draw 4 Petals
        for (let i = 0; i < 4; i++) {
            ctx.save();
            ctx.rotate((i * Math.PI) / 2);

            ctx.fillStyle = '#22c55e';
            ctx.strokeStyle = '#86efac';
            ctx.lineWidth = 1.2;

            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.bezierCurveTo(-7, -7, -12, -3, -7, 6);
            ctx.bezierCurveTo(-2, 12, 0, 14, 0, 14);
            ctx.bezierCurveTo(0, 14, 2, 12, 7, 6);
            ctx.bezierCurveTo(12, -3, 7, -7, 0, 0);
            ctx.fill();
            ctx.stroke();

            // Leaf vein line in center
            ctx.beginPath();
            ctx.moveTo(0, 2);
            ctx.lineTo(0, 9);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.lineWidth = 0.8;
            ctx.stroke();

            ctx.restore();
        }

        // Stem at bottom
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.moveTo(0, 5);
        ctx.quadraticCurveTo(3, 14, 5, 20);
        ctx.strokeStyle = '#16a34a';
        ctx.lineWidth = 2.8;
        ctx.stroke();

        ctx.restore();

        this.cloverTexture = offCanvas;
    },

    start: function () {
        this.init();
        if (!this.canvas) return;

        this.isActive = true;
        this.resizeCanvas();
        this.createCloverTexture();

        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const count = isMobile ? 16 : Math.min(28, Math.max(18, Math.floor(this.width / 35)));

        this.clovers = [];
        for (let i = 0; i < count; i++) {
            this.clovers.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                vy: Math.random() * 1.5 + 0.7,
                swaySpeed: Math.random() * 0.03 + 0.01,
                swayAmp: Math.random() * 1.4 + 0.6,
                swayOffset: Math.random() * Math.PI * 2,
                size: Math.random() * 18 + 18,
                rotation: Math.random() * Math.PI * 2,
                vRot: (Math.random() - 0.5) * 0.025,
                opacity: Math.random() * 0.45 + 0.55
            });
        }

        const gameoverTitle = document.querySelector('#gameover-screen-window h2');
        if (gameoverTitle) {
            gameoverTitle.className = "text-4xl font-black text-green-400 neon-glow-green font-orbitron uppercase mb-6 animate-pulse";
            gameoverTitle.style.textShadow = '0 0 10px #22c55e, 0 0 20px #4ade80, 0 0 35px #15803d';
            gameoverTitle.style.color = '#4ade80';
        }

        const gameoverWindow = document.getElementById('gameover-screen-window');
        if (gameoverWindow) {
            gameoverWindow.classList.remove('border-pink-500/40', 'border-cyan-500/40', 'border-red-500/70');
            gameoverWindow.classList.add('border-green-500/70');
            gameoverWindow.style.borderColor = '#22c55e';
            gameoverWindow.style.boxShadow = '0 0 30px rgba(34, 197, 94, 0.4), inset 0 0 15px rgba(74, 222, 128, 0.2)';
        }

        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        this.tick();
    },

    stop: function () {
        this.isActive = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        if (this.ctx && this.canvas) {
            this.ctx.clearRect(0, 0, this.width, this.height);
        }

        this.clovers = [];

        const gameoverTitle = document.querySelector('#gameover-screen-window h2');
        if (gameoverTitle) {
            gameoverTitle.className = "text-4xl font-black text-pink-500 neon-glow-pink font-orbitron uppercase mb-6";
            gameoverTitle.style.textShadow = '';
            gameoverTitle.style.color = '';
        }

        const gameoverWindow = document.getElementById('gameover-screen-window');
        if (gameoverWindow) {
            gameoverWindow.style.boxShadow = '';
            gameoverWindow.style.borderColor = '';
            gameoverWindow.classList.remove('border-green-500/70');
            gameoverWindow.classList.add('border-pink-500/40');
        }
    },

    tick: function () {
        if (!this.isActive) return;

        this.updateAndDraw();
        this.animationFrameId = requestAnimationFrame(() => this.tick());
    },

    updateAndDraw: function () {
        const w = this.width;
        const h = this.height;
        const ctx = this.ctx;

        ctx.clearRect(0, 0, w, h);
        if (!this.cloverTexture) this.createCloverTexture();

        const time = Date.now() * 0.002;
        const tex = this.cloverTexture;

        for (let i = 0; i < this.clovers.length; i++) {
            const c = this.clovers[i];
            c.y += c.vy;
            c.x += Math.sin(time + c.swayOffset) * c.swayAmp;
            c.rotation += c.vRot;

            if (c.y > h + 40) {
                c.y = -40;
                c.x = Math.random() * w;
            }

            ctx.save();
            ctx.translate(c.x, c.y);
            ctx.rotate(c.rotation);
            ctx.globalAlpha = c.opacity;
            ctx.drawImage(tex, -c.size / 2, -c.size / 2, c.size, c.size);
            ctx.restore();
        }
    }
};

// Khởi tạo sự kiện giao diện khi tải trang
document.addEventListener('DOMContentLoaded', () => {
    const toggleEasyMode = document.getElementById('toggle-easy-mode');
    if (toggleEasyMode) {
        toggleEasyMode.checked = window.EasyModeManager.isEnabled;
        toggleEasyMode.addEventListener('change', (e) => {
            window.EasyModeManager.setMode(e.target.checked);
        });
    }

    if (window.EasyModeManager && typeof window.EasyModeManager.updateMenuBackground === 'function') {
        window.EasyModeManager.updateMenuBackground();
    }
});
