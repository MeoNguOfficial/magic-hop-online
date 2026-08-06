// ============================================================
// asian-mode.js — Quản lý Chế độ Ăn Vạ (Asian Mode - Ultra Extreme Hard)
// ============================================================

window.AsianModeManager = {
    isEnabled: localStorage.getItem('asianModeEnabled') === 'true',

    setMode: function (enabled) {
        this.isEnabled = enabled;
        localStorage.setItem('asianModeEnabled', enabled);

        // Cập nhật giao diện nếu có thay đổi
        const toggleAsianMode = document.getElementById('toggle-asian-mode');
        if (toggleAsianMode && toggleAsianMode.checked !== enabled) {
            toggleAsianMode.checked = enabled;
        }

        // Tương khắc với các chế độ khác (Nếu bật Asian Mode -> Tắt Easy Mode & Hard Mode)
        if (enabled) {
            if (typeof window.EasyModeManager !== 'undefined' && window.EasyModeManager.isEnabled) {
                window.EasyModeManager.setMode(false);
            }
            if (typeof window.HardModeManager !== 'undefined' && window.HardModeManager.isEnabled) {
                window.HardModeManager.setMode(false);
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

        let asianBg = document.getElementById('start-screen-asian-bg');
        if (!asianBg) {
            asianBg = document.createElement('div');
            asianBg.id = 'start-screen-asian-bg';
            asianBg.style.position = 'absolute';
            asianBg.style.top = '0';
            asianBg.style.left = '0';
            asianBg.style.width = '100%';
            asianBg.style.height = '100%';
            asianBg.style.zIndex = '0';
            asianBg.style.pointerEvents = 'none';
            asianBg.style.background = 'radial-gradient(circle at bottom, rgba(220, 38, 38, 0.5) 0%, rgba(24, 2, 2, 0.96) 80%)';
            asianBg.style.opacity = '0';
            asianBg.style.transition = 'opacity 0.8s ease-in-out';
            startScreen.insertBefore(asianBg, startScreen.firstChild);
        }

        if (this.isEnabled) {
            asianBg.style.opacity = '1';
        } else {
            asianBg.style.opacity = '0';
        }
    },

    getFakeBlockThreshold: function () {
        return this.isEnabled ? 0.08 : 0.25;
    },

    getMovingBlockThreshold: function () {
        return this.isEnabled ? 0.05 : 0.2;
    }
};

// ============================================================
// HỆ THỐNG HIỆU ỨNG LỬA ĐỎ GAME OVER (Asian Mode Red Fire - Particle Glow)
// ============================================================
window.AsianGameOverFireManager = {
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
        this.canvas.id = 'asian-gameover-fire-canvas';
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
        grad.addColorStop(0.3, `rgba(${r}, ${Math.floor(g * 0.2)}, ${Math.floor(b * 0.2)}, 0.55)`);
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
            // Lửa đỏ thuần (Pure Crimson Red Spectrum)
            brightRed: this.createGlowTexture(255, 80, 80), // Lõi hồng-đỏ nóng sáng
            red: this.createGlowTexture(230, 0, 0),         // Thân lửa đỏ thuần (Blood Red)
            darkRed: this.createGlowTexture(150, 0, 0)      // Rìa đỏ sẫm
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
            gameoverTitle.className = "text-3xl sm:text-5xl md:text-6xl font-black text-red-500 neon-glow-red font-orbitron uppercase tracking-widest text-center animate-pulse drop-shadow-[0_0_20px_rgba(255,0,0,0.8)]";
            gameoverTitle.style.textShadow = '0 0 16px #ff0000, 0 0 35px #dc143c, 0 0 60px #800000';
            gameoverTitle.style.color = '#ff1a1a';
        }

        const gameoverWindow = document.getElementById('gameover-screen-window');
        if (gameoverWindow) {
            gameoverWindow.classList.remove('border-pink-500/40', 'border-cyan-500/40', 'border-orange-500/70');
            gameoverWindow.classList.add('border-red-500/70');
            gameoverWindow.style.borderColor = '#ff0000';
            gameoverWindow.style.boxShadow = '0 0 45px rgba(255, 0, 0, 0.7), inset 0 0 25px rgba(204, 0, 0, 0.4)';
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
            gameoverTitle.className = "text-3xl sm:text-5xl md:text-6xl font-black text-pink-500 neon-glow-pink font-orbitron uppercase tracking-widest text-center animate-pulse drop-shadow-[0_0_20px_rgba(236,72,153,0.8)]";
            gameoverTitle.style.textShadow = '';
            gameoverTitle.style.color = '';
        }

        const gameoverWindow = document.getElementById('gameover-screen-window');
        if (gameoverWindow) {
            gameoverWindow.style.boxShadow = '';
            gameoverWindow.style.borderColor = '';
            gameoverWindow.classList.remove('border-red-500/70', 'border-orange-500/70');
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

        const spawnCount = Math.max(3, Math.floor(w / 90));

        // Sinh hạt lửa đỏ
        for (let i = 0; i < spawnCount; i++) {
            const size = Math.random() * 38 + 18;
            const decay = Math.random() * 0.014 + 0.004;
            this.particles.push(this.getParticle(
                'fire',
                Math.random() * w,
                h + 20,
                (Math.random() - 0.5) * 1.8,
                -Math.random() * 5.0 - 2.8,
                size,
                1.0,
                decay
            ));
        }

        // Sinh tàn lửa đỏ bay cao
        if (Math.random() < 0.6) {
            const decay = Math.random() * 0.007 + 0.003;
            this.particles.push(this.getParticle(
                'spark',
                Math.random() * w,
                h + 5,
                (Math.random() - 0.5) * 3.5,
                -Math.random() * 7 - 4,
                Math.random() * 3.5 + 1.2,
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

            p.vx += (Math.random() - 0.5) * 0.3;

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
                    img = this.textures.brightRed;
                } else if (p.life > 0.3) {
                    img = this.textures.red;
                } else {
                    img = this.textures.darkRed;
                }

                ctx.globalAlpha = p.life;
                ctx.drawImage(img, p.x - p.size, p.y - p.size, p.size * 2, p.size * 2);
            } else if (p.type === 'spark') {
                ctx.globalAlpha = p.life;
                ctx.fillStyle = '#ff3333';
                ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
            }
        }

        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1.0;
    }
};

// Khởi tạo sự kiện giao diện khi tải trang
document.addEventListener('DOMContentLoaded', () => {
    const toggleAsianMode = document.getElementById('toggle-asian-mode');
    if (toggleAsianMode) {
        toggleAsianMode.checked = window.AsianModeManager.isEnabled;
        toggleAsianMode.addEventListener('change', (e) => {
            window.AsianModeManager.setMode(e.target.checked);
        });
    }

    if (window.AsianModeManager && typeof window.AsianModeManager.updateMenuBackground === 'function') {
        window.AsianModeManager.updateMenuBackground();
    }
});
