// ============================================================
// music-player.js — Trình phát nhạc độc lập (Extension)
// ============================================================

window.MusicPlayer = {
    audio: new Audio(),
    currentIndex: 0,
    isPlaying: false,
    loopMode: 0, // 0: Normal/Loop All, 1: Loop One, 2: Shuffle
    isDraggingProgress: false,
    fadeInterval: null,
    
    // Audio Context & Visualizer variables
    audioCtx: null,
    analyser: null,
    source: null,
    visDataArray: null,
    visCanvas: null,
    visCtx: null,
    animationFrameId: null,
    lastVisTime: 0,
    
    init: function() {
        this.audio.crossOrigin = "anonymous";
        
        // Bind UI Elements
        this.uiTitle = document.getElementById('mp-song-title');
        this.uiGenre = document.getElementById('mp-song-genre');
        this.uiTimeCurr = document.getElementById('mp-time-current');
        this.uiTimeTotal = document.getElementById('mp-time-total');
        this.uiProgress = document.getElementById('mp-progress');
        
        this.btnPlay = document.getElementById('mp-btn-play');
        this.btnPrev = document.getElementById('mp-btn-prev');
        this.btnNext = document.getElementById('mp-btn-next');
        this.btnShuffle = document.getElementById('mp-btn-shuffle');
        this.btnLoop = document.getElementById('mp-btn-loop');
        
        this.sliderSpeed = document.getElementById('mp-speed-slider');
        this.valSpeed = document.getElementById('mp-speed-value');
        this.togglePitch = document.getElementById('mp-pitch-toggle');
        if (this.togglePitch) {
            this.togglePitch.checked = typeof preservePitchEnabled !== 'undefined' ? preservePitchEnabled : false;
            this.audio.preservesPitch = this.togglePitch.checked;
            this.audio.mozPreservesPitch = this.togglePitch.checked;
            this.audio.webkitPreservesPitch = this.togglePitch.checked;
        }
        
        this.visCanvas = document.getElementById('mp-visualizer');
        if (this.visCanvas) {
            this.visCtx = this.visCanvas.getContext('2d', { alpha: true });
        }

        this.bindEvents();
        this.initTooltips();
        
        // Mặc định tải bài hát đầu tiên lên UI nhưng không tự phát
        if (typeof playlist !== 'undefined' && playlist.length > 0) {
            this.currentIndex = typeof selectedSongIndex !== 'undefined' ? selectedSongIndex : 0;
            const song = playlist[this.currentIndex];
            this.uiTitle.innerText = song.name || song.title || (typeof t === 'function' ? t('unknown_track') : "Unknown Track");
            if (typeof window.applyMarquee === 'function') {
                window.applyMarquee(this.uiTitle);
            }
            this.uiGenre.innerText = song.artist || (typeof t === 'function' ? t('unknown_artist') : "Unknown Artist");
        }
    },
    
    bindEvents: function() {
        this.btnPlay.addEventListener('click', () => this.togglePlay(true)); // Mặc định bật hiệu ứng fade khi nhấn nút play/pause ngoài giao diện
        this.btnNext.addEventListener('click', () => this.playNext());
        this.btnPrev.addEventListener('click', () => this.playPrev());
        
        this.btnShuffle.addEventListener('click', () => {
            this.loopMode = this.loopMode === 2 ? 0 : 2; // Bật tắt Shuffle
            this.updateModeUI();
        });
        
        this.btnLoop.addEventListener('click', () => {
            this.loopMode = this.loopMode === 1 ? 0 : 1; // Bật tắt Loop 1
            this.updateModeUI();
        });
        
        this.audio.addEventListener('timeupdate', () => {
            if (!this.isDraggingProgress) {
                const progress = (this.audio.currentTime / this.audio.duration) * 100 || 0;
                this.uiProgress.value = progress;
                this.uiTimeCurr.innerText = this.formatTime(this.audio.currentTime);
            }
        });
        
        this.audio.addEventListener('loadedmetadata', () => {
            this.uiTimeTotal.innerText = this.formatTime(this.audio.duration);
        });
        
        this.audio.addEventListener('ended', () => {
            if (this.loopMode === 1) {
                // Lặp 1 bài
                this.audio.currentTime = 0;
                this.audio.play().catch(()=>{});
            } else if (this.loopMode === 2) {
                // Random
                this.playIndex(Math.floor(Math.random() * playlist.length));
            } else {
                // Lặp cả Playlist (sang bài tiếp theo)
                this.playNext();
            }
        });
        
        this.uiProgress.addEventListener('mousedown', () => this.isDraggingProgress = true);
        this.uiProgress.addEventListener('touchstart', () => this.isDraggingProgress = true, { passive: true });
        
        this.uiProgress.addEventListener('input', (e) => {
            if (this.audio.duration) {
                const time = (e.target.value / 100) * this.audio.duration;
                this.uiTimeCurr.innerText = this.formatTime(time);
            }
        });

        this.uiProgress.addEventListener('change', (e) => {
            if (this.audio.duration) {
                const time = (e.target.value / 100) * this.audio.duration;
                this.audio.currentTime = time;
            }
            this.isDraggingProgress = false;
        });
        
        this.sliderSpeed.addEventListener('input', (e) => {
            const speed = parseFloat(e.target.value);
            this.valSpeed.innerText = speed.toFixed(1) + 'x';
            this.audio.playbackRate = speed;
        });
        
        this.togglePitch.addEventListener('change', (e) => {
            const preserve = e.target.checked;
            this.audio.preservesPitch = preserve;
            this.audio.mozPreservesPitch = preserve;
            this.audio.webkitPreservesPitch = preserve;
        });
    },
    
    formatTime: function(secs) {
        if (isNaN(secs)) return "0:00";
        const m = Math.floor(secs / 60);
        const s = Math.floor(secs % 60);
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    },
    
    updateModeUI: function() {
        this.btnShuffle.className = this.loopMode === 2 ? "text-cyan-400 transform scale-110 transition-all" : "text-gray-500 hover:text-white transition-all";
        this.btnLoop.className = this.loopMode === 1 ? "text-pink-400 transform scale-110 transition-all" : "text-gray-500 hover:text-white transition-all";
    },
    
    initAudioContext: function() {
        try {
            if (!this.audioCtx) {
                // Tận dụng AudioContext có sẵn của game để tránh giới hạn số lượng Context trên iOS/Safari
                if (typeof audioCtx !== 'undefined' && audioCtx) {
                    this.audioCtx = audioCtx;
                } else {
                    this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                }
                
                this.analyser = this.audioCtx.createAnalyser();
                this.analyser.fftSize = 128; // Giữ mức thấp (64 bins) để tối ưu CPU
                this.analyser.smoothingTimeConstant = 0.8;
                
                this.source = this.audioCtx.createMediaElementSource(this.audio);
                this.source.connect(this.analyser);
                this.analyser.connect(this.audioCtx.destination);
                
                this.visDataArray = new Uint8Array(this.analyser.frequencyBinCount);
            }
        } catch (e) {
            console.warn("AudioContext init error in Music Player:", e);
        }
    },

    startVisualizer: function() {
        if (!this.visCanvas || !this.visCtx || !this.analyser) return;
        
        const draw = (time) => {
            if (!this.isPlaying) return;
            this.animationFrameId = requestAnimationFrame(draw);
            
            // Giới hạn tốc độ quét xuống ~30fps để tối ưu hiệu suất
            if (time - this.lastVisTime < 33) return;
            this.lastVisTime = time;
            
            this.analyser.getByteFrequencyData(this.visDataArray);
            this.visCtx.clearRect(0, 0, this.visCanvas.width, this.visCanvas.height);
            
            const centerX = this.visCanvas.width / 2;
            const centerY = this.visCanvas.height / 2;
            const radius = 68; // Cách viền đĩa nhạc một đoạn nhỏ
            const barWidth = 3;
            const numBars = 32; // Dùng 32 dải tần số để vẽ
            const angleStep = Math.PI / numBars;
            
            this.visCtx.fillStyle = 'rgba(236, 72, 153, 0.85)'; // Màu hồng đồng bộ
            
            for (let i = 0; i < numBars; i++) {
                const value = this.visDataArray[i];
                let percent = value / 255;
                if (percent < 0.05) percent = 0.05; // Bar tối thiểu
                const barHeight = percent * 24; // Độ cao tối đa
                
                // Vẽ nửa bên phải
                let angle = (i * angleStep) - Math.PI / 2;
                this.visCtx.save();
                this.visCtx.translate(centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius);
                this.visCtx.rotate(angle);
                this.visCtx.fillRect(0, -barWidth / 2, barHeight, barWidth);
                this.visCtx.restore();
                
                // Vẽ nửa bên trái đối xứng
                if (i > 0) {
                    angle = (-i * angleStep) - Math.PI / 2;
                    this.visCtx.save();
                    this.visCtx.translate(centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius);
                    this.visCtx.rotate(angle);
                    this.visCtx.fillRect(0, -barWidth / 2, barHeight, barWidth);
                    this.visCtx.restore();
                }
            }
        };
        
        if (!this.animationFrameId) {
            this.animationFrameId = requestAnimationFrame(draw);
        }
    },
    
    stopVisualizer: function() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        if (this.visCtx && this.visCanvas) {
            this.visCtx.clearRect(0, 0, this.visCanvas.width, this.visCanvas.height);
        }
    },

    playIndex: async function(index, withFade = false) {
        if (!this.audioCtx) this.initAudioContext();
        if (this.audioCtx && this.audioCtx.state === 'suspended') this.audioCtx.resume();

        // Đánh thức Audio trên di động bằng cách chạy một track rỗng
        if (!this.audio.src || this.audio.src === window.location.href || this.audio.src.startsWith('data:audio/')) {
            this.audio.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";
            this.audio.play().catch(()=>{});
        }

        if (typeof ensureSongLoaded === 'function') {
            await ensureSongLoaded(index);
        }

        const song = playlist[index];
        
        if (!song || !song.url) {
            this.stop();
            return;
        }

        // --- OFFLINE CHECK ---
        if (!navigator.onLine) {
            const isCached = typeof isAudioCached === 'function' ? await isAudioCached(song.url) : false;
            if (!isCached) {
                if (typeof showCyberModal === 'function') {
                    showCyberModal({
                        title: typeof t === 'function' ? t('offline_title') : "OFFLINE",
                        message: typeof t === 'function' ? t('offline_msg_skip') : "Không có mạng! Trình phát nhạc sẽ dừng vì bài hát này chưa được tải.",
                        type: 'alert'
                    });
                }
                this.stop();
                return; // Ngừng phát nhạc nếu offline & chưa cache
            }
        }

        if (typeof stopPreview === 'function') stopPreview(true); // Tắt nhạc xem trước (nếu đang bật)
        
        if (typeof audioCtx !== 'undefined' && audioCtx && typeof menuGainNode !== 'undefined' && menuGainNode) {
            const now = audioCtx.currentTime;
            menuGainNode.gain.cancelScheduledValues(now);
            menuGainNode.gain.setValueAtTime(menuGainNode.gain.value, now);
            menuGainNode.gain.linearRampToValueAtTime(0, now + 0.5);
        } else if (typeof menuAudio !== 'undefined' && !menuAudio.paused) {
            menuAudio.pause();
        }

        this.currentIndex = index;
        this.uiTitle.innerText = song.name || song.title || (typeof t === 'function' ? t('unknown_track') : "Unknown Track");
        if (typeof window.applyMarquee === 'function') {
            window.applyMarquee(this.uiTitle);
        }
        this.uiGenre.innerText = song.artist || (typeof t === 'function' ? t('unknown_artist') : "Unknown Artist");
        
        // Tận dụng CacheManager để load cực mượt
        const url = typeof getCachedAudioUrl === 'function' ? await getCachedAudioUrl(song.url) : song.url;
        this.audio.src = url;
        this.audio.playbackRate = parseFloat(this.sliderSpeed.value);
        
        const preserve = this.togglePitch.checked;
        this.audio.preservesPitch = preserve;
        this.audio.mozPreservesPitch = preserve;
        this.audio.webkitPreservesPitch = preserve;
        
        if (withFade) {
            this.fadeIn();
        } else {
            if (this.fadeInterval) clearInterval(this.fadeInterval);
            this.audio.volume = 1.0;
        }

        this.audio.play().catch(e => console.error("Music Player Playback failed:", e));
        this.isPlaying = true;
        this.updatePlayBtnUI();
        this.startVisualizer();
    },
    
    togglePlay: function(withFade = false) {
        if (!this.audioCtx) this.initAudioContext();
        if (this.audioCtx && this.audioCtx.state === 'suspended') this.audioCtx.resume();

        if (!this.audio.src || this.audio.src === window.location.href || this.audio.src.startsWith('data:audio/')) {
            this.audio.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";
            this.audio.play().catch(()=>{});
        }

        if (this.isPlaying) {
            if (withFade) {
                // Cross-fade 2 chiều: Tự động làm lớn dần nhạc nền BGM khi dừng Music Player
                if (typeof audioCtx !== 'undefined' && audioCtx && typeof menuGainNode !== 'undefined' && menuGainNode && (typeof currentPreviewIndex === 'undefined' || currentPreviewIndex === -1)) {
                    const now = audioCtx.currentTime;
                    menuGainNode.gain.cancelScheduledValues(now);
                    menuGainNode.gain.setValueAtTime(menuGainNode.gain.value, now);
                    menuGainNode.gain.linearRampToValueAtTime(typeof menuVolume !== 'undefined' ? (isMenuMuted ? 0 : menuVolume) : 0.5, now + 0.5);
                    if (typeof menuAudio !== 'undefined' && menuAudio) {
                        const playPromise = menuAudio.play();
                        if (playPromise !== undefined) {
                            playPromise.catch(e => { setTimeout(() => { menuAudio.play().catch(()=>{}); }, 50); });
                        }
                    }
                } else if (typeof menuAudio !== 'undefined' && menuAudio && (typeof currentPreviewIndex === 'undefined' || currentPreviewIndex === -1)) {
                    menuAudio.volume = typeof menuVolume !== 'undefined' ? (isMenuMuted ? 0 : menuVolume) : 0.5;
                    const playPromise = menuAudio.play();
                    if (playPromise !== undefined) {
                        playPromise.catch(e => { setTimeout(() => { menuAudio.play().catch(()=>{}); }, 50); });
                    }
                }

                this.fadeOutAndStop();
            } else {
                this.audio.pause();
                this.isPlaying = false;
                this.stopVisualizer();

                if (typeof audioCtx !== 'undefined' && audioCtx && typeof menuGainNode !== 'undefined' && menuGainNode && (typeof currentPreviewIndex === 'undefined' || currentPreviewIndex === -1)) {
                    const now = audioCtx.currentTime;
                    menuGainNode.gain.cancelScheduledValues(now);
                    menuGainNode.gain.setValueAtTime(typeof menuVolume !== 'undefined' ? (isMenuMuted ? 0 : menuVolume) : 0.5, now);
                    if (typeof menuAudio !== 'undefined' && menuAudio) {
                        const playPromise = menuAudio.play();
                        if (playPromise !== undefined) {
                            playPromise.catch(e => { setTimeout(() => { menuAudio.play().catch(()=>{}); }, 50); });
                        }
                    }
                } else if (typeof menuAudio !== 'undefined' && menuAudio && (typeof currentPreviewIndex === 'undefined' || currentPreviewIndex === -1)) {
                    menuAudio.volume = typeof menuVolume !== 'undefined' ? (isMenuMuted ? 0 : menuVolume) : 0.5;
                    const playPromise = menuAudio.play();
                    if (playPromise !== undefined) {
                        playPromise.catch(e => { setTimeout(() => { menuAudio.play().catch(()=>{}); }, 50); });
                    }
                }
            }
        } else {
            if (!this.audio.src || this.audio.src === window.location.href || this.audio.src.startsWith('data:audio/')) {
                this.playIndex(this.currentIndex, withFade);
            } else {
                if (typeof stopPreview === 'function') stopPreview(true);
                
                if (typeof audioCtx !== 'undefined' && audioCtx && typeof menuGainNode !== 'undefined' && menuGainNode) {
                    const now = audioCtx.currentTime;
                    menuGainNode.gain.cancelScheduledValues(now);
                    menuGainNode.gain.setValueAtTime(menuGainNode.gain.value, now);
                    menuGainNode.gain.linearRampToValueAtTime(0, now + 0.5);
                } else if (typeof menuAudio !== 'undefined' && !menuAudio.paused) {
                    menuAudio.pause();
                }
                
                if (withFade) {
                    this.fadeIn();
                } else {
                    if (this.fadeInterval) clearInterval(this.fadeInterval);
                    this.audio.volume = 1.0;
                }

                this.audio.play().catch(e => console.error(e));
                this.isPlaying = true;
                this.startVisualizer();
            }
        }
        this.updatePlayBtnUI();
    },
    
    playNext: function() {
        let next = this.loopMode === 2 ? Math.floor(Math.random() * playlist.length) : this.currentIndex + 1;
        if (next >= playlist.length) next = 0;
        this.playIndex(next);
    },
    
    playPrev: function() {
        let prev = this.loopMode === 2 ? Math.floor(Math.random() * playlist.length) : this.currentIndex - 1;
        if (prev < 0) prev = playlist.length - 1;
        this.playIndex(prev);
    },
    
    updatePlayBtnUI: function() {
        // Thay đổi SVG icon theo trạng thái
        this.btnPlay.innerHTML = this.isPlaying ? `<svg class="w-14 h-14" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" /></svg>` : `<svg class="w-14 h-14" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd"/></svg>`;
    },

    fadeIn: function() {
        this.audio.volume = 0;
        if (this.fadeInterval) clearInterval(this.fadeInterval);
        let vol = 0;
        this.fadeInterval = setInterval(() => {
            vol += 0.05;
            if (vol >= 1.0) {
                vol = 1.0;
                clearInterval(this.fadeInterval);
            }
            this.audio.volume = vol;
        }, 25);
    },
    
    fadeOutAndStop: function(callback) {
        if (this.fadeInterval) clearInterval(this.fadeInterval);
        let vol = this.audio.volume;
        this.fadeInterval = setInterval(() => {
            vol -= 0.05;
            if (vol <= 0) {
                vol = 0;
                clearInterval(this.fadeInterval);
                this.stop();
                if (callback) callback();
            }
            this.audio.volume = vol;
        }, 25);
    },
    
    stop: function() {
        this.audio.pause();
        this.isPlaying = false;
        this.updatePlayBtnUI();
        this.stopVisualizer();
    },

    initTooltips: function() {
        const card = document.querySelector('#panel-music > div.relative');
        if (!card) return;
        
        // Create tooltip element
        this.tooltipEl = document.createElement('div');
        this.tooltipEl.id = 'mp-tooltip';
        this.tooltipEl.className = 'absolute hidden px-3 py-1.5 rounded text-[11px] font-orbitron font-bold pointer-events-none transition-all duration-200 z-50 text-center whitespace-nowrap uppercase tracking-wider';
        
        // Custom cyberpunk theme styles for tooltip
        this.tooltipEl.style.background = 'rgba(6, 18, 30, 0.95)';
        this.tooltipEl.style.border = '1px solid rgba(34, 211, 238, 0.8)'; // Neon Cyan-400
        this.tooltipEl.style.color = '#22d3ee'; // Cyan-400 text
        this.tooltipEl.style.boxShadow = '0 0 10px rgba(34, 211, 238, 0.5)';
        this.tooltipEl.style.opacity = '0';
        this.tooltipEl.style.transform = 'translate(-50%, -100%) scale(0.9)';
        
        // Append CSS style for tooltip arrow/tail
        if (!document.getElementById('mp-tooltip-style')) {
            const style = document.createElement('style');
            style.id = 'mp-tooltip-style';
            style.innerHTML = `
                #mp-tooltip::after {
                    content: '';
                    position: absolute;
                    bottom: -4px;
                    left: 50%;
                    transform: translateX(-50%) rotate(45deg);
                    width: 8px;
                    height: 8px;
                    background: rgba(6, 18, 30, 0.95);
                    border-right: 1px solid rgba(34, 211, 238, 0.8);
                    border-bottom: 1px solid rgba(34, 211, 238, 0.8);
                }
            `;
            document.head.appendChild(style);
        }
        
        card.appendChild(this.tooltipEl);
        
        // Bind event listeners to buttons
        const tooltipsMap = [
            { btn: this.btnShuffle, key: 'mp_tooltip_shuffle' },
            { btn: this.btnPrev, key: 'mp_tooltip_prev' },
            { btn: this.btnPlay, key: 'mp_tooltip_play' },
            { btn: this.btnNext, key: 'mp_tooltip_next' },
            { btn: this.btnLoop, key: 'mp_tooltip_loop' }
        ];
        
        tooltipsMap.forEach(item => {
            this.setupTooltipEvents(item.btn, item.key);
        });
    },
    
    setupTooltipEvents: function(btn, key) {
        if (!btn) return;
        
        let pressTimer = null;
        let touchActive = false;
        let startX = 0;
        let startY = 0;
        
        // Mouse/Hover Events (PC)
        btn.addEventListener('mouseenter', () => {
            if (touchActive) return;
            this.showTooltip(btn, key);
        });
        
        btn.addEventListener('mouseleave', () => {
            if (touchActive) return;
            this.hideTooltip();
        });
        
        // Touch Events (Mobile)
        btn.addEventListener('touchstart', (e) => {
            touchActive = true;
            const touch = e.touches[0];
            startX = touch.clientX;
            startY = touch.clientY;
            
            this.showTooltip(btn, key);
            
            btn.dataset.touchStartTime = Date.now();
            btn.dataset.isLongPress = 'false';
            
            if (pressTimer) clearTimeout(pressTimer);
            pressTimer = setTimeout(() => {
                btn.dataset.isLongPress = 'true';
            }, 400);
        }, { passive: true });
        
        btn.addEventListener('touchmove', (e) => {
            if (!touchActive) return;
            const touch = e.touches[0];
            if (Math.abs(touch.clientX - startX) > 20 || Math.abs(touch.clientY - startY) > 20) {
                if (pressTimer) clearTimeout(pressTimer);
                this.hideTooltip();
                touchActive = false;
            }
        }, { passive: true });
        
        btn.addEventListener('touchend', (e) => {
            if (pressTimer) clearTimeout(pressTimer);
            this.hideTooltip();
            
            const duration = Date.now() - parseInt(btn.dataset.touchStartTime || '0');
            if (duration > 400 || btn.dataset.isLongPress === 'true') {
                e.preventDefault();
            }
            
            setTimeout(() => {
                touchActive = false;
            }, 100);
        });
        
        btn.addEventListener('touchcancel', () => {
            if (pressTimer) clearTimeout(pressTimer);
            this.hideTooltip();
            touchActive = false;
        });
    },
    
    showTooltip: function(btn, key) {
        if (!this.tooltipEl) return;
        
        const card = document.querySelector('#panel-music > div.relative');
        if (!card) return;
        
        const btnRect = btn.getBoundingClientRect();
        const cardRect = card.getBoundingClientRect();
        
        const left = btnRect.left - cardRect.left + (btnRect.width / 2);
        const top = btnRect.top - cardRect.top - 8;
        
        const text = typeof t === 'function' ? t(key) : key;
        this.tooltipEl.innerText = text;
        
        this.tooltipEl.style.left = `${left}px`;
        this.tooltipEl.style.top = `${top}px`;
        
        this.tooltipEl.classList.remove('hidden');
        
        // Force reflow
        void this.tooltipEl.offsetWidth;
        
        this.tooltipEl.style.opacity = '1';
        this.tooltipEl.style.transform = 'translate(-50%, -100%) scale(1)';
    },
    
    hideTooltip: function() {
        if (!this.tooltipEl) return;
        
        this.tooltipEl.style.opacity = '0';
        this.tooltipEl.style.transform = 'translate(-50%, -100%) scale(0.9)';
        
        if (this.tooltipHideTimeout) clearTimeout(this.tooltipHideTimeout);
        this.tooltipHideTimeout = setTimeout(() => {
            if (this.tooltipEl.style.opacity === '0') {
                this.tooltipEl.classList.add('hidden');
            }
        }, 200);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('panel-music')) {
        window.MusicPlayer.init();
    }
});