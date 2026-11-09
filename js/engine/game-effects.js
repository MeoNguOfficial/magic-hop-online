// ============================================================
// game-effects.js — Quản lý và Tối ưu hóa Toàn Diện Hiệu Ứng Three.js
// (Shockwaves, Neon Boundary Pulses, Boundary Flames, Ball Trail)
// ============================================================

// Precomputed Cosine-Squared Fade Table (101 elements) để triệt tiêu tính toán Math.cos() trong updateShockwaves
const SHOCKWAVE_FADE_LUT = new Float32Array(101);
for (let _i = 0; _i <= 100; _i++) {
    const _c = Math.cos((_i / 100) * 1.5707963267948966);
    SHOCKWAVE_FADE_LUT[_i] = _c * _c;
}

window.GameEffectsManager = {
    // --- 1. SÓNG XUNG KÍCH (SHOCKWAVES) ---
    shockwaves: [],
    shockwavePool: [],
    diamondShockwavePool: [],
    vortexRingPool: [],
    shockwaveDataPool: [],
    cachedShockwaveGeo: null,
    cachedDiamondShockwaveGeo: null,
    cachedVortexRingGeo: null,
    maxShockwaves: 40,

    // --- 2. XUNG NHỊP BIÊN (BOUNDARY PULSES) ---
    boundaryPulses: [],
    boundaryPulsePool: [],
    boundaryPulseDataPool: [],
    pulseGeometry: null,
    pulseMaterialTemplate: null,
    boundaryFlashOpacity: 0.22,

    // --- 3. BỤI LỬA ĐỘ KHÓ (BOUNDARY FLAMES / DUST) ---
    boundaryDustMesh: null,
    boundaryDustData: [],
    MAX_BOUNDARY_DUST: (typeof currentGraphicsQuality !== 'undefined' && currentGraphicsQuality === 'simple') ? 0 : 120,

    // --- 4. ĐUÔI BÓNG (BALL TRAIL INSTANCED MESH) ---
    ballTrailInstancedMesh: null,
    ballTrailSegments: [],
    ballTrailPool: [],
    MAX_TRAIL_INSTANCES: (typeof currentGraphicsQuality !== 'undefined' && currentGraphicsQuality === 'simple') ? 15 : 60,
    lastTrailSpawnTime: 0,
    trailDummyPosition: null,
    trailDummyEuler: null,
    trailDummyQuaternion: null,
    trailDummyScale: null,
    trailDummyMatrix: null,
    tempColor: null,

    init: function (scene) {
        if (!scene) return;
        this.scene = scene;
        this.tempColor = new THREE.Color();
        this.trailDummyPosition = new THREE.Vector3();
        this.trailDummyEuler = new THREE.Euler();
        this.trailDummyQuaternion = new THREE.Quaternion();
        this.trailDummyScale = new THREE.Vector3();
        this.trailDummyMatrix = new THREE.Matrix4();

        this.initGeometries();
        this.initBoundaryFlames();
        this.initBallTrail();
        this.prewarmShockwaves();
    },

    initGeometries: function () {
        // Shockwave Ring Geometry (Khôi phục hình dạng bo tròn chữ nhật nguyên bản theo gạch)
        if (!this.cachedShockwaveGeo) {
            const tWidth = (typeof tileWidth !== 'undefined') ? tileWidth : 4.0;
            const tLength = (typeof tileLength !== 'undefined') ? tileLength : 4.0;
            const borderThickness = 0.18;
            const waveShape = createRoundedRectShape(tWidth + borderThickness, tLength + borderThickness, 0.9);
            const waveHole = createRoundedRectShape(tWidth - borderThickness, tLength - borderThickness, Math.max(0, 0.9 - borderThickness));
            waveShape.holes.push(waveHole);

            const detailScale = typeof tileDetailScale !== 'undefined' ? tileDetailScale : 1.0;
            let baseCurve = 12;
            if (typeof currentGraphicsQuality !== 'undefined') {
                if (currentGraphicsQuality === 'simple') baseCurve = 1;
                else if (currentGraphicsQuality === 'hd') baseCurve = 6;
                else if (currentGraphicsQuality === 'fhd') baseCurve = 12;
                else if (currentGraphicsQuality === 'qhd') baseCurve = 18;
                else if (currentGraphicsQuality === 'uhd') baseCurve = 24;
            }

            const curveSegments = Math.max(1, Math.round(baseCurve * detailScale));
            this.cachedShockwaveGeo = new THREE.ShapeGeometry(waveShape, curveSegments);
        }

        // Diamond Burst Geometry
        if (!this.cachedDiamondShockwaveGeo && (typeof currentGraphicsQuality === 'undefined' || currentGraphicsQuality !== 'simple')) {
            this.cachedDiamondShockwaveGeo = this.createDiamondShockwaveGeometry();
        }

        // Vortex Expanding Center Ring Geometry (Sóng tròn lan tỏa từ tâm cho gạch [x])
        if (!this.cachedVortexRingGeo) {
            const tWidth = (typeof tileWidth !== 'undefined') ? tileWidth : 4.0;
            const innerR = tWidth * 0.16;
            const outerR = tWidth * 0.24;
            const detailScale = typeof tileDetailScale !== 'undefined' ? tileDetailScale : 1.0;
            const segs = Math.max(16, Math.round(36 * detailScale));
            this.cachedVortexRingGeo = new THREE.RingGeometry(innerR, outerR, segs);
        }

        // Boundary Pulse Geometry
        if (!this.pulseGeometry) {
            this.pulseGeometry = new THREE.BoxGeometry(0.20, 0.05, 12);
        }
        if (!this.pulseMaterialTemplate) {
            this.pulseMaterialTemplate = new THREE.MeshBasicMaterial({
                color: 0x00ffff,
                transparent: true,
                opacity: 0.85,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });
        }
    },

    createDiamondShockwaveGeometry: function () {
        const positions = [];
        const uvs = [];
        const indices = [];

        const addDiamond = (cx, cy, angle, length, width) => {
            const baseIndex = positions.length / 3;
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            const perpCos = -sin;
            const perpSin = cos;

            const halfL = length * 0.5;
            const halfW = width * 0.5;

            // 0: Điểm nhọn bên trong (hướng về tâm)
            const p0x = cx - cos * halfL;
            const p0y = cy - sin * halfL;
            // 1: Góc bên phải
            const p1x = cx + perpCos * halfW;
            const p1y = cy + perpSin * halfW;
            // 2: Điểm nhọn bên ngoài (hướng ra ngoài)
            const p2x = cx + cos * halfL;
            const p2y = cy + sin * halfL;
            // 3: Góc bên trái
            const p3x = cx - perpCos * halfW;
            const p3y = cy - perpSin * halfW;

            positions.push(
                p0x, p0y, 0,
                p1x, p1y, 0,
                p2x, p2y, 0,
                p3x, p3y, 0
            );

            uvs.push(
                0.5, 0.0,
                1.0, 0.5,
                0.5, 1.0,
                0.0, 0.5
            );

            indices.push(
                baseIndex, baseIndex + 1, baseIndex + 2,
                baseIndex, baseIndex + 2, baseIndex + 3
            );
        };

        const count = 24;
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;

            // Vành 1: Tia kim cương chính (Outer large diamonds)
            const r1 = 1.62;
            const isMajor = (i % 3 === 0);
            const l1 = isMajor ? 0.70 : 0.55;
            const w1 = isMajor ? 0.18 : 0.14;
            addDiamond(Math.cos(angle) * r1, Math.sin(angle) * r1, angle, l1, w1);

            // Vành 2: Tia kim cương so le giữa (Mid staggered diamonds)
            const angleMid = angle + (Math.PI / count);
            const r2 = 1.24;
            addDiamond(Math.cos(angleMid) * r2, Math.sin(angleMid) * r2, angleMid, 0.42, 0.12);

            // Vành 3: Hạt lấp lánh bên trong (Inner spark diamonds)
            const angleIn = angle + (Math.PI / (count * 2));
            const r3 = 0.92;
            addDiamond(Math.cos(angleIn) * r3, Math.sin(angleIn) * r3, angleIn, 0.25, 0.08);
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geo.setIndex(indices);
        geo.computeVertexNormals();
        return geo;
    },

    prewarmShockwaves: function () {
        while (this.shockwavePool.length < 50) {
            const waveMat = new THREE.MeshBasicMaterial({
                color: 0x00ffff,
                transparent: true,
                opacity: 1.0,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                side: THREE.DoubleSide
            });
            const wave = new THREE.Mesh(this.cachedShockwaveGeo, waveMat);
            wave.visible = false;
            if (this.scene) this.scene.add(wave);
            this.shockwavePool.push(wave);
        }

        if (this.cachedDiamondShockwaveGeo) {
            while (this.diamondShockwavePool.length < 50) {
                const waveMat = new THREE.MeshBasicMaterial({
                    color: 0x00ffff,
                    transparent: true,
                    opacity: 1.0,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false,
                    side: THREE.DoubleSide
                });
                const wave = new THREE.Mesh(this.cachedDiamondShockwaveGeo, waveMat);
                wave.visible = false;
                if (this.scene) this.scene.add(wave);
                this.diamondShockwavePool.push(wave);
            }
        }

        if (this.cachedVortexRingGeo) {
            while (this.vortexRingPool.length < 45) {
                const ringMat = new THREE.MeshBasicMaterial({
                    color: 0xffd700,
                    transparent: true,
                    opacity: 1.0,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false,
                    side: THREE.DoubleSide
                });
                const ring = new THREE.Mesh(this.cachedVortexRingGeo, ringMat);
                ring.visible = false;
                if (this.scene) this.scene.add(ring);
                this.vortexRingPool.push(ring);
            }
        }

        while (this.shockwaveDataPool.length < 90) {
            this.shockwaveDataPool.push({
                mesh: null,
                isDiamondBurst: false,
                isVortexRing: false,
                targetTile: null,
                scale: 1.0,
                startScale: 1.0,
                opacity: 1.0,
                speed: 4.5,
                maxScale: 2.5
            });
        }
        
        while (this.boundaryPulsePool.length < 60) {
            const pMesh = new THREE.Mesh(this.pulseGeometry, this.pulseMaterialTemplate.clone());
            pMesh.visible = false;
            if (this.scene) this.scene.add(pMesh);
            this.boundaryPulsePool.push(pMesh);
        }
    },

    getShockwaveData: function (mesh, isDiamondBurst, targetTile, scale, startScale, opacity, speed, maxScale, isVortexRing = false) {
        let data = this.shockwaveDataPool.length > 0 ? this.shockwaveDataPool.pop() : {};
        data.mesh = mesh;
        data.isDiamondBurst = isDiamondBurst;
        data.isVortexRing = isVortexRing;
        data.targetTile = targetTile;
        data.scale = scale;
        data.startScale = startScale;
        data.opacity = opacity;
        data.speed = speed;
        data.maxScale = maxScale;
        return data;
    },

    triggerShockwave: function (tile, themeColor, customOffsetScale = 1.0, tileScale = 1.0, comboCount = 0) {
        if (typeof shockwavesEnabled !== 'undefined' && !shockwavesEnabled) return;
        if (!tile || !this.scene) return;

        // Giới hạn số lượng sóng xung kích đồng thời tối đa (tối ưu hóa fillrate khi nhịp dồn dập ở tốc độ cao)
        const maxActiveWaves = Math.min(this.maxShockwaves || 8, 8);
        while (this.shockwaves.length >= maxActiveWaves) {
            const oldest = this.shockwaves.shift();
            oldest.mesh.visible = false;
            if (oldest.isVortexRing) {
                this.vortexRingPool.push(oldest.mesh);
            } else if (oldest.isDiamondBurst) {
                this.diamondShockwavePool.push(oldest.mesh);
            } else {
                if (oldest.mesh.geometry !== this.cachedShockwaveGeo) {
                    oldest.mesh.geometry = this.cachedShockwaveGeo;
                }
                this.shockwavePool.push(oldest.mesh);
            }
            this.shockwaveDataPool.push(oldest);
        }

        const surfaceY = (typeof window.surfaceY !== 'undefined' ? window.surfaceY : 0.2);

        const isDashTile = tile && tile.userData && tile.userData.isDashTile;
        const isVortexTile = tile && tile.userData && Boolean(tile.userData.isVortexTile);
        const effectiveCombo = (isDashTile || isVortexTile) ? 0 : comboCount;

        // --- LỚP 1 (GẠCH LỐC XOÁY / MỞ MÀN ROUND): SÓNG TRÒN LAN TỎA RỰC RỠ TỪ TÂM (CENTER RIPPLE) ---
        if (isVortexTile && this.cachedVortexRingGeo) {
            let ringMesh;
            if (this.vortexRingPool.length > 0) {
                ringMesh = this.vortexRingPool.pop();
            } else if (this.shockwaves.length > 0) {
                for (let k = 0; k < this.shockwaves.length; k++) {
                    if (this.shockwaves[k].isVortexRing) {
                        const oldestRing = this.shockwaves[k];
                        const last = this.shockwaves.pop();
                        if (k < this.shockwaves.length) {
                            this.shockwaves[k] = last;
                        }
                        ringMesh = oldestRing.mesh;
                        this.shockwaveDataPool.push(oldestRing);
                        break;
                    }
                }
            }
            if (ringMesh) {
                const isDynamic = typeof dynamicColorsEnabled !== 'undefined' && dynamicColorsEnabled && themeColor;
                const ringColor = isDynamic ? themeColor : 0xffd700;
                ringMesh.visible = true;
                ringMesh.material.color.setHex(ringColor);
                ringMesh.material.opacity = 1.0;
                ringMesh.position.copy(tile.position);
                ringMesh.position.y = tile.position.y + surfaceY + 0.035;
                ringMesh.rotation.x = -Math.PI / 2;
                ringMesh.rotation.z = 0;
                ringMesh.scale.set(tileScale, tileScale, 1);

                const baseScale = tileScale;
                this.shockwaves.push(this.getShockwaveData(
                    ringMesh,
                    false,
                    tile,
                    baseScale,
                    baseScale,
                    1.0,
                    6.2 * customOffsetScale,
                    3.8 * customOffsetScale * baseScale,
                    true
                ));
            }
        }

        if (effectiveCombo >= 6 && this.cachedDiamondShockwaveGeo) {
            let waveMesh;
            if (this.diamondShockwavePool.length > 0) {
                waveMesh = this.diamondShockwavePool.pop();
                waveMesh.visible = true;
                waveMesh.material.color.setHex(themeColor);
                waveMesh.material.opacity = 1.0;
            } else if (this.shockwaves.length > 0) {
                // Tái sử dụng sóng xung kích kim cương cũ nhất nếu pool cạn (Tránh scene.add đột ngột)
                const oldest = this.shockwaves.shift();
                waveMesh = oldest.mesh;
                waveMesh.visible = true;
                waveMesh.material.color.setHex(themeColor);
                waveMesh.material.opacity = 1.0;
                this.shockwaveDataPool.push(oldest);
            } else {
                return;
            }

            waveMesh.position.copy(tile.position);
            waveMesh.position.y = tile.position.y + surfaceY + 0.032;
            waveMesh.rotation.x = -Math.PI / 2;
            waveMesh.rotation.z = 0;
            waveMesh.scale.set(tileScale, tileScale, 1);

            const baseScale = tileScale;
            this.shockwaves.push(this.getShockwaveData(
                waveMesh,
                true,
                tile,
                baseScale,
                baseScale,
                1.0,
                4.8 * customOffsetScale,
                2.6 * customOffsetScale * baseScale
            ));

            // Kích hoạt bụi hạt kim cương bung vút lên trời (3D Combo Dust Burst)
            this.spawnComboBurst(tile, waveMesh.material.color, 4);
        } else {
            let waveLine;
            const isDynamic = typeof dynamicColorsEnabled !== 'undefined' && dynamicColorsEnabled && themeColor;
            const waveColor = isVortexTile ? (isDynamic ? themeColor : 0xffaa00) : themeColor;
            if (this.shockwavePool.length > 0) {
                waveLine = this.shockwavePool.pop();
                waveLine.visible = true;
                waveLine.material.color.setHex(waveColor);
                waveLine.material.opacity = 1.0;
            } else if (this.shockwaves.length > 0) {
                // Tái sử dụng sóng xung kích cũ nhất
                const oldest = this.shockwaves.shift();
                waveLine = oldest.mesh;
                waveLine.visible = true;
                waveLine.material.color.setHex(waveColor);
                waveLine.material.opacity = 1.0;
                this.shockwaveDataPool.push(oldest);
            } else {
                return;
            }

            // Gán Geometry theo đúng hình dáng thực của dải gạch Dash
            if (isDashTile && window.DashBlocksManager && typeof window.DashBlocksManager.getShockwaveGeometry === 'function') {
                const dashGeo = window.DashBlocksManager.getShockwaveGeometry(
                    tile.userData.dashLength || 4.0,
                    (typeof tileWidth !== 'undefined' ? tileWidth : 4.0),
                    (typeof currentGraphicsQuality !== 'undefined' ? currentGraphicsQuality : 'fhd'),
                    (typeof tileDetailScale !== 'undefined' ? tileDetailScale : 1.0)
                );
                if (dashGeo) {
                    waveLine.geometry = dashGeo;
                }
            } else if (waveLine.geometry !== this.cachedShockwaveGeo) {
                waveLine.geometry = this.cachedShockwaveGeo;
            }

            waveLine.position.copy(tile.position);
            waveLine.position.y = tile.position.y + surfaceY + 0.032;
            waveLine.rotation.x = -Math.PI / 2;
            waveLine.rotation.z = (isDashTile && tile.userData && tile.userData.angleZ) ? tile.userData.angleZ : 0;
            waveLine.scale.set(tileScale, tileScale, 1);

            const baseScale = tileScale;
            const vortexScaleMultiplier = isVortexTile ? 1.35 : 1.0;
            const shockwaveSpeed = isDashTile ? 3.6 * customOffsetScale : 4.5 * customOffsetScale;
            const maxShockwaveScale = isDashTile ? (1.55 * customOffsetScale * baseScale) : (2.4 * customOffsetScale * baseScale * vortexScaleMultiplier);

            this.shockwaves.push(this.getShockwaveData(
                waveLine,
                false,
                tile,
                baseScale,
                baseScale,
                1.0,
                shockwaveSpeed,
                maxShockwaveScale
            ));
        }
    },

    updateShockwaves: function (delta, camZ) {
        const surfaceY = (typeof window.surfaceY !== 'undefined' ? window.surfaceY : 0.2);
        const speedScale = Math.max(1.0, Math.min(2.5, (typeof gameSpeed !== 'undefined' ? gameSpeed : 1.0) * 0.85));
        for (let i = this.shockwaves.length - 1; i >= 0; i--) {
            const sw = this.shockwaves[i];

            const isTileInactive = sw.targetTile && (!sw.targetTile.parent || sw.targetTile.userData.isExiting);
            const isBehindCam = sw.mesh.position.z > camZ + 5;

            if (isTileInactive || isBehindCam) {
                sw.mesh.visible = false;
                if (sw.isVortexRing) {
                    this.vortexRingPool.push(sw.mesh);
                } else if (sw.isDiamondBurst) {
                    this.diamondShockwavePool.push(sw.mesh);
                } else {
                    if (sw.mesh.geometry !== this.cachedShockwaveGeo) {
                        sw.mesh.geometry = this.cachedShockwaveGeo;
                    }
                    sw.mesh.rotation.z = 0;
                    this.shockwavePool.push(sw.mesh);
                }
                this.shockwaveDataPool.push(sw);
                const last = this.shockwaves.pop();
                if (i < this.shockwaves.length) {
                    this.shockwaves[i] = last;
                }
                continue;
            }

            const startScale = sw.startScale || 1.0;
            const progress = Math.min(1.0, (sw.scale - startScale) / (sw.maxScale - startScale + 0.001));

            const currentSpeed = sw.speed * speedScale * (1.0 - progress * 0.45);
            sw.scale += currentSpeed * delta;
            sw.mesh.scale.set(sw.scale, sw.scale, 1);

            if (sw.targetTile && sw.targetTile.parent) {
                const tt = sw.targetTile;
                const ttY = tt.position.y + surfaceY + (sw.isVortexRing ? 0.035 : 0.032);
                const mPos = sw.mesh.position;
                if (mPos.x !== tt.position.x || mPos.y !== ttY || mPos.z !== tt.position.z) {
                    mPos.set(tt.position.x, ttY, tt.position.z);
                }
            }

            const lutIdx = (progress * 100) | 0;
            const fadeFactor = SHOCKWAVE_FADE_LUT[lutIdx > 100 ? 100 : (lutIdx < 0 ? 0 : lutIdx)];
            sw.mesh.material.opacity = fadeFactor;

            if (progress >= 1.0 || fadeFactor <= 0.001) {
                sw.mesh.visible = false;
                if (sw.isVortexRing) {
                    this.vortexRingPool.push(sw.mesh);
                } else if (sw.isDiamondBurst) {
                    this.diamondShockwavePool.push(sw.mesh);
                } else {
                    if (sw.mesh.geometry !== this.cachedShockwaveGeo) {
                        sw.mesh.geometry = this.cachedShockwaveGeo;
                    }
                    sw.mesh.rotation.z = 0;
                    this.shockwavePool.push(sw.mesh);
                }
                this.shockwaveDataPool.push(sw);
                const last = this.shockwaves.pop();
                if (i < this.shockwaves.length) {
                    this.shockwaves[i] = last;
                }
            }
        }
    },

    // --- XUNG NHỊP BIÊN (BOUNDARY PULSES) ---
    spawnBoundaryPulses: function (impactZ, furthestZ, activeColor = 0x00ffff, isVortex = false) {
        // Chỉ chạy khi bóng chạm vào vortex block
        if (!isVortex) return;
        const style = (typeof activePulseStyle !== 'undefined') ? activePulseStyle : 'wave';
        if (style === 'off' || style === 'classic') return;

        // 2. Pulse thường (normal): Boundary nháy sáng cả viền rồi mờ dần theo nhịp beat
        if (style === 'normal') {
            this.boundaryFlashOpacity = 1.0;
            if (typeof leftBoundaryLine !== 'undefined' && leftBoundaryLine && leftBoundaryLine.material) {
                leftBoundaryLine.material.opacity = this.boundaryFlashOpacity;
                leftBoundaryLine.material.color.setHex(activeColor);
            }
            if (typeof rightBoundaryLine !== 'undefined' && rightBoundaryLine && rightBoundaryLine.material) {
                rightBoundaryLine.material.opacity = this.boundaryFlashOpacity;
                rightBoundaryLine.material.color.setHex(activeColor);
            }
            return;
        }

        const isHorizontal = (style === 'horizontal');
        const pulseSpeedZ = isHorizontal ? 0 : 200;
        const speedX = 15.0;
        const maxDistance = isHorizontal ? 4.5 : 160;
        const initialOpacity = 1.0;

        const surfaceY = (typeof window.surfaceY !== 'undefined' ? window.surfaceY : 0.2);
        const yPos = surfaceY + 0.02; // Nhô nhẹ lên mặt đường để không bị z-fighting

        // Vị trí Z:
        // - horizontal: FULL BOUNDARY (288 units), tâm đặt tại (impactZ - 110) để bao trùm toàn bộ đường chạy từ gần tới xa
        // - wave: dải sóng nguyên bản (12 units) xuất phát từ điểm rơi (impactZ + 3.0) phóng về phía trước
        const startZ = isHorizontal ? (impactZ - 110.0) : (impactZ + 3.0);

        // Với Horizontal Pulse (ngang full boundary), kích sáng đường viền track nền đồng bộ màu vortex
        if (isHorizontal) {
            this.boundaryFlashOpacity = 0.75;
            if (typeof leftBoundaryLine !== 'undefined' && leftBoundaryLine && leftBoundaryLine.material) {
                leftBoundaryLine.material.opacity = this.boundaryFlashOpacity;
                leftBoundaryLine.material.color.setHex(activeColor);
            }
            if (typeof rightBoundaryLine !== 'undefined' && rightBoundaryLine && rightBoundaryLine.material) {
                rightBoundaryLine.material.opacity = this.boundaryFlashOpacity;
                rightBoundaryLine.material.color.setHex(activeColor);
            }
        }

        for (let side = 0; side < 2; side++) {
            const xPos = side === 0 ? -6.75 : 6.75;
            let pMesh;
            if (this.boundaryPulsePool.length > 0) {
                pMesh = this.boundaryPulsePool.pop();
            } else if (this.boundaryPulses.length > 0) {
                // Tái sử dụng xung cũ nhất nếu pool cạn (Tránh scene.add đột ngột)
                const oldest = this.boundaryPulses.shift();
                pMesh = oldest.mesh;
                this.boundaryPulseDataPool.push(oldest);
            } else {
                continue;
            }

            pMesh.position.set(xPos, yPos, startZ);
            if (isHorizontal) {
                // Horizontal Pulse: FULL BOUNDARY (scale.z = 24.0 ~ 288 units) bung mở rộng sang hai bên
                pMesh.scale.set(2.0, 2.5, 24.0);
            } else {
                // Wave Pulse: Dải sóng nguyên bản ngắn gọn (scale.z = 1.0 ~ 12 units) lướt dọc về trước
                pMesh.scale.set(1.2, 1.5, 1.0);
            }
            pMesh.material.color.setHex(activeColor);
            pMesh.material.opacity = initialOpacity;
            pMesh.visible = true;

            let pData = this.boundaryPulseDataPool.length > 0 ? this.boundaryPulseDataPool.pop() : {};
            pData.mesh = pMesh;
            pData.isHorizontal = isHorizontal;
            pData.side = side;
            pData.startX = xPos;
            pData.startZ = startZ;
            pData.speedX = side === 0 ? -speedX : speedX;
            pData.speedZ = -pulseSpeedZ;
            pData.maxDistance = maxDistance;
            pData.initialOpacity = initialOpacity;
            pData.opacity = initialOpacity;

            this.boundaryPulses.push(pData);
        }
    },

    updateBoundaryPulses: function (delta, gameSpeed) {
        // Cập nhật fade-out mượt mà cho Pulse thường (normal)
        if (this.boundaryFlashOpacity > 0.22) {
            this.boundaryFlashOpacity = Math.max(0.22, this.boundaryFlashOpacity - delta * 2.2);
            if (typeof leftBoundaryLine !== 'undefined' && leftBoundaryLine && leftBoundaryLine.material) {
                leftBoundaryLine.material.opacity = this.boundaryFlashOpacity;
            }
            if (typeof rightBoundaryLine !== 'undefined' && rightBoundaryLine && rightBoundaryLine.material) {
                rightBoundaryLine.material.opacity = this.boundaryFlashOpacity;
            }
        }

        for (let i = this.boundaryPulses.length - 1; i >= 0; i--) {
            const pulse = this.boundaryPulses[i];

            if (pulse.isHorizontal) {
                // 4. Pulse ngang (horizontal): Dải sáng chạy lan ra ngoài biên mở rộng sang hai bên (<-|   |->)
                pulse.mesh.position.x += pulse.speedX * delta;
                const distanceTraveled = Math.abs(pulse.mesh.position.x - pulse.startX);
                const progress = Math.min(1.0, distanceTraveled / pulse.maxDistance);
                pulse.opacity = pulse.initialOpacity * (1.0 - progress);

                // Dải sáng mở rộng bề ngang rõ rệt khi bùng ra ngoài, duy trì full boundary ở trục Z
                pulse.mesh.scale.x = (2.0 + progress * 2.5);
                pulse.mesh.scale.z = 24.0;

                if (pulse.mesh.material) {
                    pulse.mesh.material.opacity = Math.max(0, pulse.opacity);
                }

                if (pulse.opacity <= 0 || distanceTraveled >= pulse.maxDistance) {
                    pulse.mesh.visible = false;
                    pulse.mesh.scale.set(1, 1, 1);
                    this.boundaryPulsePool.push(pulse.mesh);
                    this.boundaryPulseDataPool.push(pulse);
                    const last = this.boundaryPulses.pop();
                    if (i < this.boundaryPulses.length) {
                        this.boundaryPulses[i] = last;
                    }
                }
            } else {
                // 3. Pulse dòng (wave): Hiệu ứng dòng sóng lan tỏa dọc theo đường chạy
                pulse.mesh.position.z += pulse.speedZ * gameSpeed * delta;
                const distanceTraveled = Math.abs(pulse.mesh.position.z - pulse.startZ);
                const progress = Math.min(1.0, distanceTraveled / pulse.maxDistance);
                pulse.opacity = pulse.initialOpacity * (1.0 - progress);

                if (pulse.mesh.material) {
                    pulse.mesh.material.opacity = Math.max(0, pulse.opacity);
                }

                if (pulse.opacity <= 0 || distanceTraveled >= pulse.maxDistance) {
                    pulse.mesh.visible = false;
                    pulse.mesh.scale.set(1, 1, 1);
                    this.boundaryPulsePool.push(pulse.mesh);
                    this.boundaryPulseDataPool.push(pulse);
                    const last = this.boundaryPulses.pop();
                    if (i < this.boundaryPulses.length) {
                        this.boundaryPulses[i] = last;
                    }
                }
            }
        }
    },

    // --- BỤI LỬA ĐỘ KHÓ (BOUNDARY FLAMES) ---
    initBoundaryFlames: function () {
        if (this.boundaryDustMesh) return;

        const isMobile = (typeof window.IS_MOBILE !== 'undefined') ? window.IS_MOBILE : /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        this.MAX_BOUNDARY_DUST = isMobile ? 30 : 60;
        this.boundaryDustData = [];

        const geo = new THREE.PlaneGeometry(0.35, 0.35);
        const mat = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.85,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide
        });

        this.boundaryDustMesh = new THREE.InstancedMesh(geo, mat, this.MAX_BOUNDARY_DUST);
        this.boundaryDustMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.boundaryDustMesh.frustumCulled = false;
        this.boundaryDustMesh.visible = false;
        if (this.scene) this.scene.add(this.boundaryDustMesh);

        for (let i = 0; i < this.MAX_BOUNDARY_DUST; i++) {
            this.boundaryDustData.push({
                side: Math.random() < 0.5 ? -1 : 1,
                relZ: -Math.random() * 140.0,
                offsetX: (Math.random() - 0.5) * 0.4,
                phase: Math.random(),
                speed: 0.25 + Math.random() * 0.45,
                maxHeight: 1.0 + Math.random() * 1.5,
                baseScale: 0.4 + Math.random() * 0.6,
                swaySpeed: 1.5 + Math.random() * 2.0,
                swayOffset: Math.random() * Math.PI * 2,
                swayAmp: 0.08 + Math.random() * 0.12,
                twinkleSpeed: 3.0 + Math.random() * 4.0
            });
        }
    },

    updateBoundaryFlames: function (delta, time, camera) {
        const style = (typeof activePulseStyle !== 'undefined') ? activePulseStyle : 'wave';
        const boundariesOn = style !== 'off';
        const advancedOn = boundariesOn && (style !== 'classic');

        if (!boundariesOn || !advancedOn || !this.boundaryDustMesh || !camera) {
            if (this.boundaryDustMesh && this.boundaryDustMesh.visible) this.boundaryDustMesh.visible = false;
            return;
        }

        if (!this.boundaryDustMesh.visible) this.boundaryDustMesh.visible = true;

        if (typeof window.getDifficultyBoundaryColor === 'function') {
            this.boundaryDustMesh.material.color.copy(window.getDifficultyBoundaryColor(time));
        }

        const camZ = camera.position.z;
        const surface = (typeof window.surfaceY !== 'undefined' ? window.surfaceY : 0.2) - 0.02;
        const rangeZ = 140.0;
        const mArray = this.boundaryDustMesh.instanceMatrix.array;

        for (let i = 0; i < this.MAX_BOUNDARY_DUST; i++) {
            const d = this.boundaryDustData[i];
            d.phase = (d.phase + delta * d.speed) % 1.0;

            let worldZ = camZ + d.relZ;
            const diffZ = worldZ - camZ;
            const wrappedRelZ = (((diffZ - 6.0) % rangeZ) + rangeZ) % rangeZ - rangeZ + 6.0;
            worldZ = camZ + wrappedRelZ;

            const baseX = d.side === -1 ? -6.75 : 6.75;
            const posX = baseX + d.offsetX;
            const posY = surface + (d.phase * d.maxHeight);

            const lifeFade = Math.sin(d.phase * Math.PI);
            const currentScale = d.baseScale * lifeFade;

            const offset = i << 4;
            mArray[offset + 0] = currentScale;
            mArray[offset + 1] = 0;
            mArray[offset + 2] = 0;
            mArray[offset + 3] = 0;

            mArray[offset + 4] = 0;
            mArray[offset + 5] = currentScale;
            mArray[offset + 6] = 0;
            mArray[offset + 7] = 0;

            mArray[offset + 8] = 0;
            mArray[offset + 9] = 0;
            mArray[offset + 10] = currentScale;
            mArray[offset + 11] = 0;

            mArray[offset + 12] = posX;
            mArray[offset + 13] = posY;
            mArray[offset + 14] = worldZ;
            mArray[offset + 15] = 1;
        }

        this.boundaryDustMesh.instanceMatrix.needsUpdate = true;
    },

    // --- ĐUÔI BÓNG (BALL TRAIL) ---
    prewarmBallTrailPool: function () {
        while (this.ballTrailPool.length < this.MAX_TRAIL_INSTANCES) {
            this.ballTrailPool.push({
                x: 0,
                y: 0,
                z: 0,
                vx: 0,
                vy: 0,
                vz: 0,
                rotX: 0,
                rotY: 0,
                rotZ: 0,
                life: 1.0,
                rotSpeed: 0,
                color: new THREE.Color(0x00ffff)
            });
        }
    },

    initBallTrail: function () {
        while (this.ballTrailSegments.length > 0) {
            this.ballTrailPool.push(this.ballTrailSegments.pop());
        }
        this.prewarmBallTrailPool();

        if (!this.ballTrailInstancedMesh && this.scene) {
            const bRad = (typeof window.ballRadius !== 'undefined' ? window.ballRadius : 0.45);
            const geo = new THREE.TetrahedronGeometry(bRad * 0.6);
            const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });

            this.ballTrailInstancedMesh = new THREE.InstancedMesh(geo, mat, this.MAX_TRAIL_INSTANCES);
            this.ballTrailInstancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
            this.ballTrailInstancedMesh.frustumCulled = false;
            this.scene.add(this.ballTrailInstancedMesh);
        }

        if (this.ballTrailInstancedMesh) {
            this.tempColor.setHex(0xffffff);
            for (let i = 0; i < this.MAX_TRAIL_INSTANCES; i++) {
                this.trailDummyMatrix.makeScale(0, 0, 0);
                this.ballTrailInstancedMesh.setMatrixAt(i, this.trailDummyMatrix);
                this.ballTrailInstancedMesh.setColorAt(i, this.tempColor);
            }
            this.ballTrailInstancedMesh.instanceMatrix.needsUpdate = true;
            if (this.ballTrailInstancedMesh.instanceColor) this.ballTrailInstancedMesh.instanceColor.needsUpdate = true;
        }
    },

    spawnComboBurst: function (tile, ballColor, count = 6) {
        if (!tile || !this.ballTrailInstancedMesh) return;
        const surfY = (typeof window.surfaceY !== 'undefined' ? window.surfaceY : 0.2) + 0.15;
        
        for (let i = 0; i < count; i++) {
            if (this.ballTrailSegments.length >= this.MAX_TRAIL_INSTANCES) break;
            const seg = this.ballTrailPool.length > 0 ? this.ballTrailPool.pop() : { color: new THREE.Color() };
            
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * 0.6;
            seg.x = tile.position.x + Math.cos(angle) * radius;
            seg.y = surfY;
            seg.z = tile.position.z + Math.sin(angle) * radius;
            
            seg.vx = (Math.random() - 0.5) * 2.2;
            seg.vy = 2.2 + Math.random() * 3.2; // Bay vút lên trời
            seg.vz = (Math.random() - 0.5) * 2.2;
            
            seg.rotX = Math.random() * Math.PI;
            seg.rotY = Math.random() * Math.PI;
            seg.rotZ = Math.random() * Math.PI;
            seg.rotSpeed = (Math.random() - 0.5) * 14;
            seg.life = 1.0;
            
            if (ballColor) {
                seg.color.copy(ballColor);
            } else {
                seg.color.setHex(0xffaa00);
            }
            seg._needsColorSync = true;
            this.ballTrailSegments.push(seg);
        }
    },

    updateBallTrail: function (delta, nowTime, isPlaying, isFalling, ball) {
        if (typeof ballTrailEnabled !== 'undefined' && ballTrailEnabled && isPlaying && !isFalling && ball && this.ballTrailInstancedMesh) {
            if (nowTime - this.lastTrailSpawnTime > 0.02) {
                this.lastTrailSpawnTime = nowTime;
                if (this.ballTrailSegments.length < this.MAX_TRAIL_INSTANCES) {
                    const seg = this.ballTrailPool.length > 0 ? this.ballTrailPool.pop() : { color: new THREE.Color() };
                    seg.x = ball.position.x + (Math.random() - 0.5) * 0.35;
                    seg.y = ball.position.y + (Math.random() - 0.5) * 0.35;
                    seg.z = ball.position.z + (Math.random() - 0.5) * 0.35;
                    seg.vx = 0;
                    seg.vy = 0;
                    seg.vz = 0;
                    seg.rotX = Math.random() * Math.PI;
                    seg.rotY = Math.random() * Math.PI;
                    seg.rotZ = Math.random() * Math.PI;
                    seg.life = 1.0;
                    seg.rotSpeed = (Math.random() - 0.5) * 10;
                    if (ball && ball.material && ball.material.color) {
                        seg.color.copy(ball.material.color);
                    } else {
                        seg.color.setHex(0x00ffff);
                    }
                    seg._needsColorSync = true;
                    this.ballTrailSegments.push(seg);
                }
            }
        }

        if (this.ballTrailInstancedMesh) {
            const mArray = this.ballTrailInstancedMesh.instanceMatrix.array;
            let colorsNeedUpdate = false;
            const trailFadeRate = 1.8 + Math.min(1.5, (typeof gameSpeed !== 'undefined' ? gameSpeed : 1.0) * 0.6);

            for (let i = this.ballTrailSegments.length - 1; i >= 0; i--) {
                const seg = this.ballTrailSegments[i];
                seg.life -= delta * trailFadeRate;
                if (seg.life <= 0) {
                    this.ballTrailPool.push(seg);
                    const last = this.ballTrailSegments.pop();
                    if (i < this.ballTrailSegments.length) {
                        this.ballTrailSegments[i] = last;
                        colorsNeedUpdate = true;
                    }
                    continue;
                }
                
                // Cập nhật tọa độ nếu là hạt bung (có vận tốc)
                if (seg.vy !== 0 || seg.vx !== 0 || seg.vz !== 0) {
                    seg.x += seg.vx * delta;
                    seg.y += seg.vy * delta;
                    seg.z += seg.vz * delta;
                    seg.vy -= 9.8 * delta; // Trọng lực rơi xuống tự nhiên
                }
                
                seg.rotX += seg.rotSpeed * delta;
                seg.rotY += seg.rotSpeed * delta;

                const curScale = Math.max(0.001, seg.life);
                const offset = i << 4;

                const cY = Math.cos(seg.rotY) * curScale;
                const sY = Math.sin(seg.rotY) * curScale;
                const cX = Math.cos(seg.rotX);
                const sX = Math.sin(seg.rotX);

                mArray[offset + 0] = cY;
                mArray[offset + 1] = 0;
                mArray[offset + 2] = -sY;
                mArray[offset + 3] = 0;

                mArray[offset + 4] = sX * sY;
                mArray[offset + 5] = cX * curScale;
                mArray[offset + 6] = sX * cY;
                mArray[offset + 7] = 0;

                mArray[offset + 8] = cX * sY;
                mArray[offset + 9] = -sX * curScale;
                mArray[offset + 10] = cX * cY;
                mArray[offset + 11] = 0;

                mArray[offset + 12] = seg.x;
                mArray[offset + 13] = seg.y;
                mArray[offset + 14] = seg.z;
                mArray[offset + 15] = 1;

                if (this.ballTrailInstancedMesh.setColorAt && seg.color && seg._needsColorSync) {
                    this.ballTrailInstancedMesh.setColorAt(i, seg.color);
                    seg._needsColorSync = false;
                    colorsNeedUpdate = true;
                }
            }
            const activeCount = this.ballTrailSegments.length;
            const lastActive = this._lastActiveTrailCount || this.MAX_TRAIL_INSTANCES;
            if (activeCount < lastActive) {
                for (let i = activeCount; i < lastActive; i++) {
                    const offset = i << 4;
                    mArray[offset + 0] = 0;
                    mArray[offset + 5] = 0;
                    mArray[offset + 10] = 0;
                }
            }
            this._lastActiveTrailCount = activeCount;
            this.ballTrailInstancedMesh.instanceMatrix.needsUpdate = true;
            if (colorsNeedUpdate && this.ballTrailInstancedMesh.instanceColor) {
                this.ballTrailInstancedMesh.instanceColor.needsUpdate = true;
            }
        }
    },

    shiftZ: function (offsetZ) {
        if (!offsetZ) return;
        
        // 1. Shockwaves
        for (let i = 0; i < this.shockwaves.length; i++) {
            if (this.shockwaves[i] && this.shockwaves[i].mesh) {
                this.shockwaves[i].mesh.position.z += offsetZ;
            }
        }
        
        // 2. Boundary Pulses
        for (let i = 0; i < this.boundaryPulses.length; i++) {
            if (this.boundaryPulses[i]) {
                if (this.boundaryPulses[i].mesh) this.boundaryPulses[i].mesh.position.z += offsetZ;
                if (this.boundaryPulses[i].startZ !== undefined) this.boundaryPulses[i].startZ += offsetZ;
            }
        }
        
        // 3. Ball Trail (Instanced Mesh)
        for (let i = 0; i < this.ballTrailSegments.length; i++) {
            if (this.ballTrailSegments[i] && this.ballTrailSegments[i].z !== undefined) {
                this.ballTrailSegments[i].z += offsetZ;
            }
        }
    },

    reset: function () {
        for (let i = 0; i < this.shockwaves.length; i++) {
            const sw = this.shockwaves[i];
            sw.mesh.visible = false;
            if (sw.isVortexRing) {
                this.vortexRingPool.push(sw.mesh);
            } else if (sw.isDiamondBurst) {
                this.diamondShockwavePool.push(sw.mesh);
            } else {
                this.shockwavePool.push(sw.mesh);
            }
            this.shockwaveDataPool.push(sw);
        }
        this.shockwaves.length = 0;

        for (let i = 0; i < this.boundaryPulses.length; i++) {
            const pulse = this.boundaryPulses[i];
            if (pulse.mesh) {
                pulse.mesh.visible = false;
                this.boundaryPulsePool.push(pulse.mesh);
            }
            this.boundaryPulseDataPool.push(pulse);
        }
        this.boundaryPulses.length = 0;

        this.initBallTrail();
    }
};
