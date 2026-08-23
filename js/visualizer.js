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
            this.ctx = this.canvas.getContext('2d', { alpha: true, desynchronized: true });
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
        const visThrottle = (this.isMobile || currentGraphicsQuality === 'simple') ? 0.033 : 0.016;

        if (nowTime - this.lastVisTime < visThrottle) return;
        this.lastVisTime = nowTime;

        const bufferLength = this.analyser.frequencyBinCount;
        if (!this.visDataArray || this.visDataArray.length !== bufferLength) {
            this.visDataArray = new Uint8Array(bufferLength);
        }
        this.analyser.getByteFrequencyData(this.visDataArray);

        const width = this.canvas.width;
        const height = this.canvas.height;
        this.ctx.clearRect(0, 0, width, height);

        const centerY = height * 0.25;
        const numBars = Math.floor(width / 24);
        const barSpacing = width / numBars;
        const barWidth = Math.max(6, barSpacing - 8);

        const maxBlocks = 12;
        const blockHeight = Math.max(4, (height * 0.15) / maxBlocks);
        const blockGap = 3;

        this.cachedBarData.length = numBars;
        for (let i = 0; i < numBars; i++) {
            let centerDist = Math.abs(i - numBars / 2);
            let dataIdx = Math.floor((centerDist / (numBars / 2)) * (bufferLength * 0.6));
            let v = this.visDataArray[dataIdx] / 255.0;
            if (v > 0.1) v = v * (0.8 + Math.random() * 0.2);
            this.cachedBarData[i] = Math.ceil(v * maxBlocks);
        }

        this.ctx.fillStyle = 'rgba(34, 211, 238, 0.85)';
        this.ctx.beginPath();
        for (let i = 0; i < numBars; i++) {
            const activeBlocks = this.cachedBarData[i];
            if (activeBlocks === 0) continue;
            const x = i * barSpacing + (barSpacing - barWidth) / 2;
            for (let b = 0; b < activeBlocks; b++) {
                const y = centerY - (b + 1) * (blockHeight + blockGap) + blockGap;
                this.ctx.rect(x, y, barWidth, blockHeight);
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
