// ============================================================
// fps-graph.js — Bộ vẽ biểu đồ FPS thời gian thực (Real-time FPS Graph)
// Hiển thị đồ thị đo độ ổn định khung hình, phát hiện drop FPS / stutter.
// Thiết kế Cyberpunk Neon siêu nhẹ, tối ưu hóa zero-allocation.
// ============================================================

(function () {
    const SAMPLES = 60; // 60 mẫu lịch sử
    const fpsBuffer = new Float32Array(SAMPLES);
    for (let i = 0; i < SAMPLES; i++) fpsBuffer[i] = 60.0;

    let canvas = null;
    let ctx = null;
    let fpsValueEl = null;
    let fpsTimeEl = null;
    let hudContainer = null;

    let isVisible = false;
    let isGraphVisible = true;
    let lastDrawTime = 0;
    let bufferIndex = 0;
    let minFps = 60;
    let maxFps = 60;
    let minMaxResetTime = 0;

    // Gradient cache tái sử dụng để triệt tiêu 100% việc tạo mới đối tượng trên Heap
    let cachedCyanGrad = null;
    let cachedAmberGrad = null;
    let cachedRedGrad = null;
    let cachedGradH = 0;

    function getGradient(ctx, h, colorType) {
        if (!cachedCyanGrad || cachedGradH !== h) {
            cachedGradH = h;
            cachedCyanGrad = ctx.createLinearGradient(0, 0, 0, h);
            cachedCyanGrad.addColorStop(0, 'rgba(0, 240, 255, 0.35)');
            cachedCyanGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

            cachedAmberGrad = ctx.createLinearGradient(0, 0, 0, h);
            cachedAmberGrad.addColorStop(0, 'rgba(245, 158, 11, 0.35)');
            cachedAmberGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

            cachedRedGrad = ctx.createLinearGradient(0, 0, 0, h);
            cachedRedGrad.addColorStop(0, 'rgba(239, 68, 68, 0.4)');
            cachedRedGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        }
        if (colorType === 'red') return cachedRedGrad;
        if (colorType === 'amber') return cachedAmberGrad;
        return cachedCyanGrad;
    }

    const FPSGraphManager = {
        init: function () {
            canvas = document.getElementById('fps-graph-canvas');
            if (canvas) {
                ctx = canvas.getContext('2d', { alpha: true });
            }
            fpsValueEl = document.getElementById('fps-value-text');
            fpsTimeEl = document.getElementById('fps-frametime-text');
            hudContainer = document.getElementById('fps-hud');

            if (typeof showFpsEnabled !== 'undefined') {
                this.setVisible(showFpsEnabled);
            }
            if (typeof showFpsGraphEnabled !== 'undefined') {
                this.setGraphVisible(showFpsGraphEnabled);
            }

            // Click vào HUD để bật/tắt nhanh graph
            if (hudContainer && !hudContainer._graphClickListenerAttached) {
                hudContainer._graphClickListenerAttached = true;
                hudContainer.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const newState = this.toggleGraph();
                    if (typeof showFpsGraphEnabled !== 'undefined') {
                        window.showFpsGraphEnabled = newState;
                        localStorage.setItem('showFpsGraphEnabled', newState);
                    }
                    const toggleInput = document.getElementById('toggle-show-fps-graph');
                    if (toggleInput) toggleInput.checked = newState;
                });
            }
        },

        setVisible: function (visible) {
            isVisible = !!visible;
            if (hudContainer) {
                if (isVisible) {
                    hudContainer.classList.remove('hidden');
                    hudContainer.style.display = 'flex';
                } else {
                    hudContainer.classList.add('hidden');
                    hudContainer.style.display = 'none';
                }
            }
        },

        setGraphVisible: function (visible) {
            isGraphVisible = !!visible;
            if (canvas) {
                if (isGraphVisible) {
                    canvas.classList.remove('hidden');
                    canvas.style.display = 'block';
                } else {
                    canvas.classList.add('hidden');
                    canvas.style.display = 'none';
                }
            }
        },

        toggleGraph: function () {
            this.setGraphVisible(!isGraphVisible);
            return isGraphVisible;
        },

        /**
         * Được gọi mỗi khi game.js tính toán lại FPS
         * @param {number} now - performance.now()
         * @param {number} currentFps - FPS đo được
         * @param {number} delta - Frame delta seconds
         */
        reset: function () {
            const now = performance.now();
            minMaxResetTime = now;
            minFps = 60;
            maxFps = 60;
            const seedFps = (typeof window.maxFps === 'number' && window.maxFps > 0 && window.maxFps <= 360) ? window.maxFps : 60;
            for (let i = 0; i < SAMPLES; i++) {
                fpsBuffer[i] = seedFps;
            }
            bufferIndex = 0;
            lastDrawTime = 0;
        },

        record: function (now, currentFps, delta) {
            if (!isVisible) return;

            // Đưa mẫu FPS vào bộ nhớ đệm vòng (circular buffer)
            fpsBuffer[bufferIndex] = currentFps;
            bufferIndex = (bufferIndex + 1) % SAMPLES;

            // Cập nhật Min / Max trong 3 giây gần nhất
            if (now - minMaxResetTime > 3000) {
                minFps = currentFps;
                maxFps = currentFps;
                minMaxResetTime = now;
            } else {
                if (currentFps < minFps) minFps = currentFps;
                if (currentFps > maxFps) maxFps = currentFps;
            }

            // Cập nhật text số liệu
            if (fpsValueEl) {
                fpsValueEl.textContent = `FPS: ${currentFps}`;
                if (currentFps >= 55) {
                    fpsValueEl.style.color = '#00f0ff'; // Neon Cyan
                } else if (currentFps >= 42) {
                    fpsValueEl.style.color = '#f59e0b'; // Amber Warning
                } else {
                    fpsValueEl.style.color = '#ef4444'; // Red Drop
                }
            }

            if (fpsTimeEl) {
                const safeDelta = (typeof delta === 'number' && !isNaN(delta) && delta > 0 && delta <= 0.05) ? delta : (1 / Math.max(1, currentFps));
                const frameMs = Math.round(safeDelta * 10000) / 10;
                fpsTimeEl.textContent = `${frameMs.toFixed(1)}ms`;
            }

            // Chỉ vẽ biểu đồ nếu biểu đồ đang bật
            if (isGraphVisible && ctx && (now - lastDrawTime >= 30)) {
                lastDrawTime = now;
                this.draw(currentFps);
            }
        },

        draw: function (latestFps) {
            if (!ctx || !canvas) return;

            const w = canvas.width;
            const h = canvas.height;

            ctx.clearRect(0, 0, w, h);

            // Nền tối bán trong suốt
            ctx.fillStyle = 'rgba(4, 8, 20, 0.75)';
            ctx.fillRect(0, 0, w, h);

            // Xác định trần FPS hiển thị (Target scale) tối ưu cho màn hình cao tần (120Hz/144Hz/240Hz)
            let maxScale = 75; // Chuẩn 60 FPS
            if (maxFps > 180) maxScale = 260; // 240Hz
            else if (maxFps > 120) maxScale = 160; // 144Hz (có trần thoáng, không bị chạm nóc)
            else if (maxFps > 70) maxScale = 135; // 120Hz

            // Vẽ đường chuẩn 60 FPS (Faint Dashed Line)
            const targetY = h - (60 / maxScale) * (h - 8) - 4;
            ctx.strokeStyle = 'rgba(0, 240, 255, 0.22)';
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(0, targetY);
            ctx.lineTo(w, targetY);
            ctx.stroke();
            ctx.setLineDash([]); // Reset line dash

            // Vẽ đường đồ thị FPS (Zero-ShadowBlur để triệt tiêu tải CPU 4-8ms)
            const step = w / (SAMPLES - 1);
            ctx.beginPath();

            let strokeColor = '#00f0ff';
            let gradType = 'cyan';
            if (latestFps < 42) {
                strokeColor = '#ef4444';
                gradType = 'red';
            } else if (latestFps < 55) {
                strokeColor = '#f59e0b';
                gradType = 'amber';
            }

            let lastX = 0;
            let lastY = h / 2;

            for (let i = 0; i < SAMPLES; i++) {
                const sampleIdx = (bufferIndex + i) % SAMPLES;
                const fps = fpsBuffer[sampleIdx];
                const normalized = Math.min(1.0, Math.max(0.0, fps / maxScale));
                const x = i * step;
                const y = h - normalized * (h - 8) - 4;

                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }

                if (i === SAMPLES - 1) {
                    lastX = x;
                    lastY = y;
                }
            }

            // Đường viền đồ thị
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = 2;
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            ctx.stroke();

            // Tô bóng mờ gradient bên dưới đồ thị sử dụng gradient đã cache
            ctx.lineTo(w, h);
            ctx.lineTo(0, h);
            ctx.closePath();
            ctx.fillStyle = getGradient(ctx, h, gradType);
            ctx.fill();

            // Vẽ điểm phát sáng (Dot) tại vị trí khung hình hiện tại
            ctx.beginPath();
            ctx.arc(lastX, lastY, 2.5, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
        }
    };

    window.FPSGraphManager = FPSGraphManager;

    document.addEventListener('DOMContentLoaded', () => {
        FPSGraphManager.init();
    });
})();
