// ============================================================
// visualizer.js — Quản lý và Tối ưu Canvas Audio Spectrum Visualizer
// ============================================================

window.VisualizerManager = {
    canvas: null,
    ctx: null,
    analyser: null,
    visDataArray: null,
    cachedBarData: [],
    lastVisTime: 0,
    visualizerWasCleared: false,

    init: function (canvasElement, analyserNode) {
        this.canvas = canvasElement || document.getElementById('bg-visualizer');
        if (this.canvas) {
            this.ctx = this.canvas.getContext('2d', { alpha: true });
        }
        this.analyser = analyserNode;
        this.cachedBarData = [];
        this.lastVisTime = 0;
        this.visualizerWasCleared = false;
    },

    setAnalyser: function (analyserNode) {
        this.analyser = analyserNode;
    },

    update: function (nowTime, isPlaying, isFailTransition, isHoldExitTransition, currentGraphicsQuality) {
        const isEnabled = typeof visualizerEnabled !== 'undefined' ? visualizerEnabled : true;
        if (!isEnabled || !this.ctx || !this.canvas || !this.analyser || !isPlaying || isFailTransition || isHoldExitTransition) {
            if (!this.visualizerWasCleared && this.ctx && this.canvas) {
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                this.visualizerWasCleared = true;
            }
            return;
        }

        this.visualizerWasCleared = false;
        if (this.isMobile === undefined) {
             this.isMobile = (typeof window.IS_MOBILE !== 'undefined') ? window.IS_MOBILE : /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        }
        let visThrottle = 0.016;
        if (currentGraphicsQuality === 'simple') {
            visThrottle = 0.066;
        } else if (this.isMobile && currentGraphicsQuality === 'low') {
            visThrottle = 0.033;
        } else {
            // Đồng bộ mượt với tốc độ FFT audio (~60-90Hz tối đa) tránh vẽ thừa ở màn 144-360Hz
            const rawEffectiveHz = (typeof window.getEffectiveTargetFps === 'function')
                ? window.getEffectiveTargetFps()
                : (typeof window.screenRefreshRate === 'number' ? window.screenRefreshRate : 60);
            const cappedHz = Math.min(90, Math.max(30, rawEffectiveHz));
            visThrottle = cappedHz > 60 ? (1 / (cappedHz * 1.05)) : 0.016;
        }

        if (nowTime - this.lastVisTime < visThrottle) return;
        this.lastVisTime = nowTime;

        const bufferLength = this.analyser.frequencyBinCount;
        if (!this.visDataArray || this.visDataArray.length !== bufferLength) {
            this.visDataArray = new Uint8Array(bufferLength);
        }
        this.analyser.getByteFrequencyData(this.visDataArray);

        const width = this.canvas.width;
        const height = this.canvas.height;
        this.ctx.clearRect(0, 0, width, Math.ceil(height * 0.35));

        if (this._cachedW !== width || this._cachedH !== height || this._cachedBufferLen !== bufferLength) {
            this._cachedW = width;
            this._cachedH = height;
            this._cachedBufferLen = bufferLength;
            this._centerY = height * 0.25;
            this._numBars = Math.max(1, Math.floor(width / 24));
            this._barSpacing = width / this._numBars;
            this._barWidth = Math.max(6, this._barSpacing - 8);
            this._maxBlocks = 12;
            this._blockHeight = Math.max(4, (height * 0.15) / this._maxBlocks);
            this._blockGap = 3;
            this._halfNumBars = this._numBars / 2;
            this._barX = new Float32Array(this._numBars);
            this._barBinIdx = new Uint16Array(this._numBars);
            for (let i = 0; i < this._numBars; i++) {
                this._barX[i] = i * this._barSpacing + (this._barSpacing - this._barWidth) / 2;
                const centerDist = Math.abs(i - this._halfNumBars);
                this._barBinIdx[i] = Math.floor((centerDist / this._halfNumBars) * (bufferLength * 0.6));
            }
        }

        const numBars = this._numBars;
        const centerY = this._centerY;
        const blockHeight = this._blockHeight;
        const blockGap = this._blockGap;
        const barWidth = this._barWidth;
        const maxBlocks = this._maxBlocks;
        const barX = this._barX;
        const barBinIdx = this._barBinIdx;
        const inv255 = 1.0 / 255.0;

        this.cachedBarData.length = numBars;
        for (let i = 0; i < numBars; i++) {
            let v = this.visDataArray[barBinIdx[i]] * inv255;
            if (v > 0.1) v = v * (0.8 + Math.random() * 0.2);
            this.cachedBarData[i] = Math.ceil(v * maxBlocks);
        }

        this.ctx.fillStyle = 'rgba(34, 211, 238, 0.85)';
        this.ctx.beginPath();
        for (let i = 0; i < numBars; i++) {
            const activeBlocks = this.cachedBarData[i];
            if (activeBlocks === 0) continue;
            const x = barX[i];
            for (let b = 0; b < activeBlocks; b++) {
                const y = (centerY - (b + 1) * (blockHeight + blockGap) + blockGap) | 0;
                this.ctx.rect(x | 0, y, barWidth | 0, blockHeight | 0);
            }
        }
        this.ctx.fill();
    },

    clear: function () {
        if (this.ctx && this.canvas) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.visualizerWasCleared = true;
        }
    }
};
