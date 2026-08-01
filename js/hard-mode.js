// ============================================================
// hard-mode.js — Quản lý chế độ siêu siêu ức chế (Rage / Hard Mode)
// ============================================================

window.HardModeManager = {
    isEnabled: localStorage.getItem('hardModeEnabled') === 'true',

    setMode: function (enabled) {
        this.isEnabled = enabled;
        localStorage.setItem('hardModeEnabled', enabled);

        // Cập nhật giao diện nếu có thay đổi
        const toggleHardMode = document.getElementById('toggle-hard-mode');
        if (toggleHardMode && toggleHardMode.checked !== enabled) {
            toggleHardMode.checked = enabled;
        }

        // Tương khắc với các chế độ khác (Nếu bật Hard Mode -> Tắt Easy Mode & Asian Mode)
        if (enabled) {
            if (typeof window.EasyModeManager !== 'undefined' && window.EasyModeManager.isEnabled) {
                window.EasyModeManager.setMode(false);
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

        let rageBg = document.getElementById('start-screen-rage-bg');
        if (!rageBg) {
            // Tạo div nền Rage Mode nếu chưa tồn tại
            rageBg = document.createElement('div');
            rageBg.id = 'start-screen-rage-bg';
            rageBg.style.position = 'absolute';
            rageBg.style.top = '0';
            rageBg.style.left = '0';
            rageBg.style.width = '100%';
            rageBg.style.height = '100%';
            rageBg.style.zIndex = '0'; // Nằm dưới các phần tử UI khác
            rageBg.style.pointerEvents = 'none';
            rageBg.style.background = 'radial-gradient(circle at bottom, rgba(160, 25, 0, 0.45) 0%, rgba(12, 4, 20, 0.96) 80%)';
            rageBg.style.opacity = '0';
            // Cài đặt transition smooth
            rageBg.style.transition = 'opacity 0.8s ease-in-out';
            
            // Chèn vào đầu start-screen (nằm dưới start-screen-window)
            startScreen.insertBefore(rageBg, startScreen.firstChild);
        }

        // Thay đổi opacity mượt mà
        if (this.isEnabled) {
            rageBg.style.opacity = '1';
        } else {
            rageBg.style.opacity = '0';
        }
    },

    getFakeBlockThreshold: function () {
        return this.isEnabled ? 0.105 : 0.25;
    },

    getMovingBlockThreshold: function () {
        return this.isEnabled ? 0.08 : 0.2;
    }
};

// Khởi tạo sự kiện giao diện khi tải trang
document.addEventListener('DOMContentLoaded', () => {
    const toggleHardMode = document.getElementById('toggle-hard-mode');
    if (toggleHardMode) {
        toggleHardMode.checked = window.HardModeManager.isEnabled;
        toggleHardMode.addEventListener('change', (e) => {
            window.HardModeManager.setMode(e.target.checked);
        });
    }

    // Áp dụng nền menu ban đầu
    if (window.HardModeManager && typeof window.HardModeManager.updateMenuBackground === 'function') {
        window.HardModeManager.updateMenuBackground();
    }
});

// ============================================================
// RageGameOverFireManager — Quản lý hiệu ứng Lửa Cam Game Over (Phiên bản Particle Glow)
// ============================================================
window.RageGameOverFireManager = {
    canvas: null,
    ctx: null,
    isActive: false,
    animationFrameId: null,
    particles: [],
    particlePool: [],
    textures: null,
    width: 0,
    height: 0,

    init: function () {
        if (this.canvas) return;

        this.canvas = document.createElement('canvas');
        this.canvas.id = 'rage-gameover-fire-canvas';
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.pointerEvents = 'none';
        this.canvas.style.zIndex = '1';

        const gameoverScreen = document.getElementById('gameover-screen');
        if (gameoverScreen) {
            gameoverScreen.insertBefore(this.canvas, gameoverScreen.firstChild);
        }

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

    createGlowTexture: function (r, g, b) {
        const size = 64;
        const offscreenCanvas = document.createElement('canvas');
        offscreenCanvas.width = size;
        offscreenCanvas.height = size;
        const ctx = offscreenCanvas.getContext('2d');

        const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
        grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 1.0)`);
        grad.addColorStop(0.3, `rgba(${r}, ${Math.floor(g * 0.7)}, ${b}, 0.5)`);
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
        ctx.fill();

        return offscreenCanvas;
    },

    createTextures: function () {
        if (this.textures) return;
        this.textures = {
            // Lửa cam thuần (Pure Orange Spectrum)
            yellow: this.createGlowTexture(255, 190, 40),  // Lõi vàng-cam nóng sáng
            orange: this.createGlowTexture(255, 100, 0),   // Thân lửa cam neon
            red: this.createGlowTexture(210, 40, 0)        // Rìa cam thẫm
        };
    },

    getParticle: function (type, x, y, vx, vy, size, life, decay) {
        if (this.particlePool.length > 0) {
            const p = this.particlePool.pop();
            p.type = type;
            p.x = x;
            p.y = y;
            p.vx = vx;
            p.vy = vy;
            p.size = size;
            p.life = life;
            p.decay = decay;
            return p;
        }
        return { type, x, y, vx, vy, size, life, decay };
    },

    releaseParticle: function (p) {
        this.particlePool.push(p);
    },

    start: function () {
        this.init();
        if (!this.canvas) return;

        this.isActive = true;
        this.resizeCanvas();
        this.createTextures();

        while (this.particles.length > 0) {
            this.releaseParticle(this.particles.pop());
        }

        const gameoverTitle = document.querySelector('#gameover-screen-window h2');
        if (gameoverTitle) {
            gameoverTitle.className = "text-4xl font-black text-orange-500 neon-glow-orange font-orbitron uppercase mb-6 animate-pulse";
            gameoverTitle.style.textShadow = '0 0 12px #ff7700, 0 0 25px #ff4500, 0 0 45px #cc3300';
            gameoverTitle.style.color = '#ff7700';
        }

        const gameoverWindow = document.getElementById('gameover-screen-window');
        if (gameoverWindow) {
            gameoverWindow.classList.remove('border-pink-500/40', 'border-cyan-500/40', 'border-red-500/70');
            gameoverWindow.classList.add('border-orange-500/70');
            gameoverWindow.style.borderColor = '#ff5500';
            gameoverWindow.style.boxShadow = '0 0 35px rgba(255, 85, 0, 0.5), inset 0 0 20px rgba(255, 119, 0, 0.25)';
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

        while (this.particles.length > 0) {
            this.releaseParticle(this.particles.pop());
        }

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
            gameoverWindow.classList.remove('border-orange-500/70', 'border-red-500/70');
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

        const spawnCount = Math.max(2, Math.floor(w / 120));

        // Sinh hạt lửa cam
        for (let i = 0; i < spawnCount; i++) {
            const size = Math.random() * 32 + 16;
            const decay = Math.random() * 0.015 + 0.005;
            this.particles.push(this.getParticle(
                'fire',
                Math.random() * w,
                h + 20,
                (Math.random() - 0.5) * 1.5,
                -Math.random() * 4.5 - 2.5,
                size,
                1.0,
                decay
            ));
        }

        // Sinh tia lửa cam bay cao
        if (Math.random() < 0.45) {
            const decay = Math.random() * 0.008 + 0.004;
            this.particles.push(this.getParticle(
                'spark',
                Math.random() * w,
                h + 5,
                (Math.random() - 0.5) * 3,
                -Math.random() * 6 - 4,
                Math.random() * 3 + 1,
                1.0,
                decay
            ));
        }

        ctx.globalCompositeOperation = 'screen';

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= p.decay;

            p.vx += (Math.random() - 0.5) * 0.25;

            if (p.life <= 0) {
                this.releaseParticle(p);
                this.particles.splice(i, 1);
                continue;
            }

            if (p.type === 'fire') {
                p.size -= p.decay * 18;
                if (p.size <= 0) {
                    this.releaseParticle(p);
                    this.particles.splice(i, 1);
                    continue;
                }

                let img;
                if (p.life > 0.65) {
                    img = this.textures.yellow;
                } else if (p.life > 0.3) {
                    img = this.textures.orange;
                } else {
                    img = this.textures.red;
                }

                ctx.globalAlpha = p.life;
                ctx.drawImage(img, p.x - p.size, p.y - p.size, p.size * 2, p.size * 2);
            } else if (p.type === 'spark') {
                ctx.globalAlpha = p.life;
                ctx.fillStyle = '#ffa600';
                ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
            }
        }

        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1.0;
    }
};

