// ============================================================
//  antialiasing.js — Hệ thống Khử răng cưa Đa tầng & Tối ưu Hiệu suất
//  Hỗ trợ: Auto (Thông minh), Off, FXAA (Nhanh/Live), MSAA, MSAA + FXAA
//  Tương thích 100% WebGL 2 & AdaptivePerformanceManager
// ============================================================

(function () {
    const VALID_MODES = new Set(['auto', 'off', 'fxaa', 'msaa', 'msaa_fxaa']);

    const VERTEX_SHADER = `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = vec4(position.xy, 0.0, 1.0);
        }
    `;

    // Shader Resolve siêu nhẹ cho Live MSAA RenderTarget
    const COPY_FRAGMENT_SHADER = `
        uniform sampler2D tDiffuse;
        varying vec2 vUv;
        void main() {
            gl_FragColor = texture2D(tDiffuse, vUv);
        }
    `;

    // FXAA tối ưu cho nền tối Cyberpunk (early-out vùng tối nền -> chi phí ~0.3ms)
    const FXAA_FRAGMENT_SHADER = `
        uniform sampler2D tDiffuse;
        uniform vec2 uResolution;
        varying vec2 vUv;

        #define FXAA_REDUCE_MIN (1.0 / 128.0)
        #define FXAA_REDUCE_MUL (1.0 / 8.0)
        #define FXAA_SPAN_MAX 8.0

        float calcLuma(vec3 rgb) {
            return dot(rgb, vec3(0.299, 0.587, 0.114));
        }

        void main() {
            vec2 inverseVP = uResolution;
            vec3 rgbM  = texture2D(tDiffuse, vUv).rgb;
            vec3 rgbNW = texture2D(tDiffuse, vUv + vec2(-1.0, -1.0) * inverseVP).rgb;
            vec3 rgbNE = texture2D(tDiffuse, vUv + vec2( 1.0, -1.0) * inverseVP).rgb;
            vec3 rgbSW = texture2D(tDiffuse, vUv + vec2(-1.0,  1.0) * inverseVP).rgb;
            vec3 rgbSE = texture2D(tDiffuse, vUv + vec2( 1.0,  1.0) * inverseVP).rgb;

            float lumaNW = calcLuma(rgbNW);
            float lumaNE = calcLuma(rgbNE);
            float lumaSW = calcLuma(rgbSW);
            float lumaSE = calcLuma(rgbSE);
            float lumaM  = calcLuma(rgbM);

            float lumaMin = min(lumaM, min(min(lumaNW, lumaNE), min(lumaSW, lumaSE)));
            float lumaMax = max(lumaM, max(max(lumaNW, lumaNE), max(lumaSW, lumaSE)));
            float lumaRange = lumaMax - lumaMin;

            // Early bailout: bỏ qua các vùng không có cạnh tương phản (nền vũ trụ tối, vùng phẳng)
            if (lumaRange < max(0.0312, lumaMax * 0.125)) {
                gl_FragColor = vec4(rgbM, 1.0);
                return;
            }

            vec2 dir;
            dir.x = -((lumaNW + lumaNE) - (lumaSW + lumaSE));
            dir.y =  ((lumaNW + lumaSW) - (lumaNE + lumaSE));

            float dirReduce = max(
                (lumaNW + lumaNE + lumaSW + lumaSE) * (0.25 * FXAA_REDUCE_MUL),
                FXAA_REDUCE_MIN
            );
            float rcpDirMin = 1.0 / (min(abs(dir.x), abs(dir.y)) + dirReduce);

            dir = min(vec2(FXAA_SPAN_MAX, FXAA_SPAN_MAX),
                  max(vec2(-FXAA_SPAN_MAX, -FXAA_SPAN_MAX), dir * rcpDirMin)) * inverseVP;

            vec3 rgbA = 0.5 * (
                texture2D(tDiffuse, vUv + dir * (1.0 / 3.0 - 0.5)).rgb +
                texture2D(tDiffuse, vUv + dir * (2.0 / 3.0 - 0.5)).rgb
            );
            vec3 rgbB = rgbA * 0.5 + 0.25 * (
                texture2D(tDiffuse, vUv + dir * -0.5).rgb +
                texture2D(tDiffuse, vUv + dir *  0.5).rgb
            );

            float lumaB = calcLuma(rgbB);
            if ((lumaB < lumaMin) || (lumaB > lumaMax)) {
                gl_FragColor = vec4(rgbA, 1.0);
            } else {
                gl_FragColor = vec4(rgbB, 1.0);
            }
        }
    `;

    const AntiAliasingManager = {
        _requestedMode: 'auto',
        _effectiveMode: 'off',
        _samples: 0,
        _perfTier: 0,
        _isWebGL2: false,
        _hasNativeMsaa: false,

        _fxaaRT: null,
        _msaaRT: null,
        _postScene: null,
        _postCamera: null,
        _postQuad: null,
        _fxaaMat: null,
        _copyMat: null,
        _sizeVec: null,
        _lastWidth: 0,
        _lastHeight: 0,
        _lastSamples: 0,
        _prewarmed: false,

        normalizeMode(mode) {
            if (typeof mode === 'string' && VALID_MODES.has(mode)) return mode;
            if (mode === true || mode === 'true') return 'auto';
            if (mode === false || mode === 'false') return 'off';
            return 'auto';
        },

        shouldUseNativeContextAntialias(modeOverride) {
            const mode = this.normalizeMode(
                modeOverride !== undefined
                    ? modeOverride
                    : this._readSavedMode()
            );
            if (typeof performanceModeEnabled !== 'undefined' && performanceModeEnabled) return false;
            if (typeof currentGraphicsQuality !== 'undefined' && currentGraphicsQuality === 'simple') return false;
            if (mode === 'msaa' || mode === 'msaa_fxaa') return true;
            if (mode === 'auto') {
                const isMobile = (typeof window.IS_MOBILE !== 'undefined')
                    ? window.IS_MOBILE
                    : /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                const gpuInfo = (typeof detectActiveGPU === 'function') ? detectActiveGPU() : null;
                const isDedicated = gpuInfo ? !!gpuInfo.isDedicated : !isMobile;
                const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) ? window.devicePixelRatio : 1;
                return !isMobile && isDedicated && dpr < 1.75;
            }
            return false;
        },

        _readSavedMode() {
            try {
                const rawMode = localStorage.getItem('antialiasingMode');
                if (rawMode && VALID_MODES.has(rawMode)) return rawMode;
                const legacy = localStorage.getItem('antialiasingEnabled');
                if (legacy === 'true') return 'auto';
                if (legacy === 'false') return 'off';
            } catch (e) {}
            return 'auto';
        },

        _detectContextCaps(renderer) {
            if (!renderer || typeof renderer.getContext !== 'function') {
                this._isWebGL2 = false;
                this._hasNativeMsaa = false;
                return;
            }
            try {
                this._isWebGL2 = !!(renderer.capabilities && renderer.capabilities.isWebGL2);
                const gl = renderer.getContext();
                const attrs = gl && typeof gl.getContextAttributes === 'function' ? gl.getContextAttributes() : null;
                this._hasNativeMsaa = !!(attrs && attrs.antialias);
            } catch (e) {
                this._isWebGL2 = false;
                this._hasNativeMsaa = false;
            }
        },

        resolveEffectiveMode(requestedMode, opts = {}) {
            const req = this.normalizeMode(requestedMode);
            const perfMode = opts.performanceMode !== undefined
                ? !!opts.performanceMode
                : (typeof performanceModeEnabled !== 'undefined' && !!performanceModeEnabled);
            const quality = opts.graphicsQuality !== undefined
                ? opts.graphicsQuality
                : (typeof currentGraphicsQuality !== 'undefined' ? currentGraphicsQuality : 'fhd');
            const perfTier = opts.perfTier !== undefined ? opts.perfTier : this._perfTier;

            if (perfMode || quality === 'simple' || perfTier >= 2) {
                return { effectiveMode: 'off', samples: 0 };
            }

            const isMobile = opts.isMobile !== undefined
                ? !!opts.isMobile
                : ((typeof window !== 'undefined' && typeof window.IS_MOBILE !== 'undefined')
                    ? !!window.IS_MOBILE
                    : (typeof navigator !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)));

            const gpuInfo = opts.gpuInfo !== undefined
                ? opts.gpuInfo
                : (typeof detectActiveGPU === 'function' ? detectActiveGPU() : null);
            const isDedicated = gpuInfo ? !!gpuInfo.isDedicated : !isMobile;

            const pixelRatio = opts.pixelRatio !== undefined
                ? opts.pixelRatio
                : (typeof window !== 'undefined' && window.devicePixelRatio ? window.devicePixelRatio : 1);

            const isWebGL2 = opts.isWebGL2 !== undefined ? !!opts.isWebGL2 : this._isWebGL2;
            const hasNativeMsaa = opts.hasNativeMsaa !== undefined ? !!opts.hasNativeMsaa : this._hasNativeMsaa;

            const targetSamples = (perfTier >= 1 || isMobile || !isDedicated || pixelRatio >= 1.75) ? 2 : 4;

            if (req === 'off') {
                return { effectiveMode: 'off', samples: 0 };
            }

            if (req === 'fxaa') {
                return { effectiveMode: 'fxaa', samples: 0 };
            }

            if (req === 'auto') {
                if (!isMobile && isDedicated && pixelRatio < 1.75 && hasNativeMsaa) {
                    return { effectiveMode: 'msaa_native', samples: targetSamples };
                }
                // Trên iGPU, Mobile hoặc màn hình DPI cao (>= 1.75), FXAA nhẹ hơn nhiều lần so với 4x MSAA
                return { effectiveMode: 'fxaa', samples: 0 };
            }

            if (req === 'msaa') {
                if (hasNativeMsaa) {
                    return { effectiveMode: 'msaa_native', samples: targetSamples };
                }
                if (isWebGL2) {
                    return { effectiveMode: 'msaa_rt', samples: targetSamples };
                }
                return { effectiveMode: 'fxaa', samples: 0 };
            }

            if (req === 'msaa_fxaa') {
                if (perfTier >= 1) {
                    // Nếu đang tụt nhẹ FPS (Tier 1), tự hạ xuống FXAA để bảo vệ FPS
                    return { effectiveMode: 'fxaa', samples: 0 };
                }
                if (isWebGL2) {
                    return { effectiveMode: 'msaa_fxaa', samples: targetSamples };
                }
                return { effectiveMode: 'fxaa', samples: 0 };
            }

            return { effectiveMode: 'off', samples: 0 };
        },

        applySettings(renderer, modeOverride) {
            if (renderer) {
                this._detectContextCaps(renderer);
            }
            const nextReq = this.normalizeMode(
                modeOverride !== undefined
                    ? modeOverride
                    : (typeof window.antialiasingMode !== 'undefined' ? window.antialiasingMode : this._readSavedMode())
            );
            this._requestedMode = nextReq;

            const pixelRatio = renderer && typeof renderer.getPixelRatio === 'function'
                ? renderer.getPixelRatio()
                : (typeof window !== 'undefined' && window.devicePixelRatio ? window.devicePixelRatio : 1);

            const resolved = this.resolveEffectiveMode(nextReq, { pixelRatio });
            this._effectiveMode = resolved.effectiveMode;
            this._samples = resolved.samples;

            // Giải phóng RenderTarget không còn sử dụng để tiết kiệm VRAM
            if (this._effectiveMode === 'off' || this._effectiveMode === 'msaa_native') {
                this._disposeRenderTargets();
            } else if (this._effectiveMode === 'fxaa' && this._msaaRT) {
                this._msaaRT.dispose();
                this._msaaRT = null;
                this._lastSamples = 0;
            } else if ((this._effectiveMode === 'msaa_rt' || this._effectiveMode === 'msaa_fxaa') && this._fxaaRT) {
                this._fxaaRT.dispose();
                this._fxaaRT = null;
            }

            if (renderer && typeof patternTextures !== 'undefined') {
                this.applyTextureAnisotropy(renderer, patternTextures);
            }

            return this.getStatusInfo();
        },

        setPerformanceTier(tier, renderer) {
            const clamped = Math.max(0, Math.min(3, tier | 0));
            if (this._perfTier === clamped) return;
            this._perfTier = clamped;
            this.applySettings(renderer || (typeof window !== 'undefined' ? window.renderer : null));
        },

        getRecommendedPixelRatioCap() {
            if (this._effectiveMode !== 'msaa_native' && this._effectiveMode !== 'msaa_rt' && this._effectiveMode !== 'msaa_fxaa') {
                return null;
            }
            if (typeof currentGraphicsQuality !== 'undefined' && currentGraphicsQuality === 'uhd') {
                return null;
            }
            const isMobile = (typeof window.IS_MOBILE !== 'undefined')
                ? window.IS_MOBILE
                : /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            const gpuInfo = (typeof detectActiveGPU === 'function') ? detectActiveGPU() : null;
            const isDedicated = gpuInfo ? !!gpuInfo.isDedicated : !isMobile;
            // Bảo vệ băng thông GPU khi MSAA bật: tránh nhân mẫu 4x lên canvas >2x DPI
            return (isMobile || !isDedicated) ? 1.25 : 2.0;
        },

        applyTextureAnisotropy(renderer, texturesMap) {
            if (!renderer || !texturesMap || typeof texturesMap !== 'object') return;
            let maxAniso = 1;
            try {
                if (renderer.capabilities && typeof renderer.capabilities.getMaxAnisotropy === 'function') {
                    maxAniso = renderer.capabilities.getMaxAnisotropy() || 1;
                }
            } catch (e) {}

            let targetAniso = 1;
            if (this._effectiveMode === 'msaa_fxaa') {
                targetAniso = Math.min(8, maxAniso);
            } else if (this._effectiveMode !== 'off') {
                targetAniso = Math.min(4, maxAniso);
            }

            Object.keys(texturesMap).forEach((key) => {
                const tex = texturesMap[key];
                if (tex && tex.anisotropy !== targetAniso) {
                    tex.anisotropy = targetAniso;
                    tex.needsUpdate = true;
                }
            });
        },

        _ensurePostResources() {
            if (typeof THREE === 'undefined') return false;
            if (!this._sizeVec) {
                this._sizeVec = new THREE.Vector2(1, 1);
            }
            if (!this._postScene) {
                this._postScene = new THREE.Scene();
                this._postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

                this._fxaaMat = new THREE.ShaderMaterial({
                    uniforms: {
                        tDiffuse: { value: null },
                        uResolution: { value: new THREE.Vector2(1 / 1280, 1 / 720) }
                    },
                    vertexShader: VERTEX_SHADER,
                    fragmentShader: FXAA_FRAGMENT_SHADER,
                    depthTest: false,
                    depthWrite: false,
                    toneMapped: false
                });

                this._copyMat = new THREE.ShaderMaterial({
                    uniforms: {
                        tDiffuse: { value: null }
                    },
                    vertexShader: VERTEX_SHADER,
                    fragmentShader: COPY_FRAGMENT_SHADER,
                    depthTest: false,
                    depthWrite: false,
                    toneMapped: false
                });

                const geo = new THREE.PlaneGeometry(2, 2);
                this._postQuad = new THREE.Mesh(geo, this._fxaaMat);
                this._postQuad.frustumCulled = false;
                this._postScene.add(this._postQuad);
            }
            return true;
        },

        _ensureRenderTarget(renderer) {
            if (!this._ensurePostResources()) return null;

            renderer.getDrawingBufferSize(this._sizeVec);
            const w = Math.max(1, Math.floor(this._sizeVec.x));
            const h = Math.max(1, Math.floor(this._sizeVec.y));

            const useMsaaRt = (this._effectiveMode === 'msaa_rt' || this._effectiveMode === 'msaa_fxaa') && this._isWebGL2 && typeof THREE.WebGLMultisampleRenderTarget === 'function';

            if (useMsaaRt) {
                if (!this._msaaRT || this._lastSamples !== this._samples) {
                    if (this._msaaRT) this._msaaRT.dispose();
                    this._msaaRT = new THREE.WebGLMultisampleRenderTarget(w, h, {
                        format: THREE.RGBAFormat,
                        minFilter: THREE.LinearFilter,
                        magFilter: THREE.LinearFilter,
                        depthBuffer: true,
                        stencilBuffer: false
                    });
                    this._msaaRT.texture.generateMipmaps = false;
                    this._msaaRT.samples = this._samples || 2;
                    this._lastWidth = w;
                    this._lastHeight = h;
                    this._lastSamples = this._msaaRT.samples;
                    if (this._fxaaMat && this._fxaaMat.uniforms && this._fxaaMat.uniforms.uResolution) {
                        this._fxaaMat.uniforms.uResolution.value.set(1 / w, 1 / h);
                    }
                } else if (this._lastWidth !== w || this._lastHeight !== h) {
                    this._msaaRT.setSize(w, h);
                    this._lastWidth = w;
                    this._lastHeight = h;
                    if (this._fxaaMat && this._fxaaMat.uniforms && this._fxaaMat.uniforms.uResolution) {
                        this._fxaaMat.uniforms.uResolution.value.set(1 / w, 1 / h);
                    }
                }
                return this._msaaRT;
            }

            if (!this._fxaaRT) {
                this._fxaaRT = new THREE.WebGLRenderTarget(w, h, {
                    format: THREE.RGBAFormat,
                    minFilter: THREE.LinearFilter,
                    magFilter: THREE.LinearFilter,
                    depthBuffer: true,
                    stencilBuffer: false
                });
                this._fxaaRT.texture.generateMipmaps = false;
                this._lastWidth = w;
                this._lastHeight = h;
                if (this._fxaaMat && this._fxaaMat.uniforms && this._fxaaMat.uniforms.uResolution) {
                    this._fxaaMat.uniforms.uResolution.value.set(1 / w, 1 / h);
                }
            } else if (this._lastWidth !== w || this._lastHeight !== h) {
                this._fxaaRT.setSize(w, h);
                this._lastWidth = w;
                this._lastHeight = h;
                if (this._fxaaMat && this._fxaaMat.uniforms && this._fxaaMat.uniforms.uResolution) {
                    this._fxaaMat.uniforms.uResolution.value.set(1 / w, 1 / h);
                }
            }
            return this._fxaaRT;
        },

        prewarm(renderer) {
            if (!renderer || this._prewarmed) return;
            try {
                if (this._ensurePostResources() && typeof renderer.compile === 'function') {
                    this._postQuad.material = this._copyMat;
                    renderer.compile(this._postScene, this._postCamera);
                    this._postQuad.material = this._fxaaMat;
                    renderer.compile(this._postScene, this._postCamera);
                    this._prewarmed = true;
                }
            } catch (e) {}
        },

        render(renderer, scene, camera) {
            if (!renderer || !scene || !camera) return;

            if (this._effectiveMode === 'off' || this._effectiveMode === 'msaa_native') {
                renderer.render(scene, camera);
                return;
            }

            const rt = this._ensureRenderTarget(renderer);
            if (!rt) {
                renderer.render(scene, camera);
                return;
            }

            const useFxaaResolve = (this._effectiveMode === 'fxaa' || this._effectiveMode === 'msaa_fxaa');
            const mat = useFxaaResolve ? this._fxaaMat : this._copyMat;
            this._postQuad.material = mat;
            mat.uniforms.tDiffuse.value = rt.texture;

            const prevTarget = renderer.getRenderTarget();
            try {
                renderer.setRenderTarget(rt);
                renderer.clear();
                renderer.render(scene, camera);

                renderer.setRenderTarget(null);
                renderer.render(this._postScene, this._postCamera);
            } catch (err) {
                // Fallback an toàn về render trực tiếp nếu driver gặp lỗi WebGL2 RenderTarget
                renderer.setRenderTarget(prevTarget || null);
                if (this._effectiveMode !== 'off') {
                    console.warn('[AntiAliasing] RenderTarget fallback to direct render:', err);
                    this._effectiveMode = this._hasNativeMsaa ? 'msaa_native' : 'off';
                    this._disposeRenderTargets();
                }
                renderer.render(scene, camera);
            } finally {
                if (renderer.getRenderTarget() !== null) {
                    renderer.setRenderTarget(null);
                }
            }
        },

        _disposeRenderTargets() {
            if (this._fxaaRT) {
                this._fxaaRT.dispose();
                this._fxaaRT = null;
            }
            if (this._msaaRT) {
                this._msaaRT.dispose();
                this._msaaRT = null;
            }
            this._lastWidth = 0;
            this._lastHeight = 0;
            this._lastSamples = 0;
        },

        dispose() {
            this._disposeRenderTargets();
            if (this._postQuad && this._postQuad.geometry) {
                this._postQuad.geometry.dispose();
            }
            if (this._fxaaMat) this._fxaaMat.dispose();
            if (this._copyMat) this._copyMat.dispose();
            this._postScene = null;
            this._postCamera = null;
            this._postQuad = null;
            this._fxaaMat = null;
            this._copyMat = null;
            this._prewarmed = false;
        },

        getStatusInfo() {
            return {
                requestedMode: this._requestedMode,
                effectiveMode: this._effectiveMode,
                samples: this._samples,
                perfTier: this._perfTier,
                isWebGL2: this._isWebGL2,
                hasNativeMsaa: this._hasNativeMsaa
            };
        }
    };

    if (typeof window !== 'undefined') {
        window.AntiAliasingManager = AntiAliasingManager;
    }
})();
