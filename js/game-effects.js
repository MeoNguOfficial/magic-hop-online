// ============================================================
// game-effects.js — Quản lý và Tối ưu hóa Toàn Diện Hiệu Ứng Three.js
// (Shockwaves, Neon Boundary Pulses, Boundary Flames, Ball Trail)
// ============================================================

window.GameEffectsManager = {
    // --- 1. SÓNG XUNG KÍCH (SHOCKWAVES) ---
    shockwaves: [],
    shockwavePool: [],
    diamondShockwavePool: [],
    shockwaveDataPool: [],
    cachedShockwaveGeo: null,
    cachedDiamondShockwaveGeo: null,
    maxShockwaves: 40,

    // --- 2. XUNG NHỊP BIÊN (BOUNDARY PULSES) ---
    boundaryPulses: [],
    boundaryPulsePool: [],
    boundaryPulseDataPool: [],
    pulseGeometry: null,
    pulseMaterialTemplate: null,

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
        while (this.shockwavePool.length < 30) {
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
            while (this.diamondShockwavePool.length < 30) {
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

        while (this.shockwaveDataPool.length < 60) {
            this.shockwaveDataPool.push({
                mesh: null,
                isDiamondBurst: false,
                targetTile: null,
                scale: 1.0,
                startScale: 1.0,
                opacity: 1.0,
                speed: 4.5,
                maxScale: 2.5
            });
        }
        
        while (this.boundaryPulsePool.length < 40) {
            const pMesh = new THREE.Mesh(this.pulseGeometry, this.pulseMaterialTemplate.clone());
            pMesh.visible = false;
            if (this.scene) this.scene.add(pMesh);
            this.boundaryPulsePool.push(pMesh);
        }
    },

    getShockwaveData: function (mesh, isDiamondBurst, targetTile, scale, startScale, opacity, speed, maxScale) {
        let data = this.shockwaveDataPool.length > 0 ? this.shockwaveDataPool.pop() : {};
        data.mesh = mesh;
        data.isDiamondBurst = isDiamondBurst;
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

        const surfaceY = (typeof window.surfaceY !== 'undefined' ? window.surfaceY : 0.2);

        if (comboCount >= 6 && this.cachedDiamondShockwaveGeo) {
            let waveMesh;
            if (this.diamondShockwavePool.length > 0) {
                waveMesh = this.diamondShockwavePool.pop();
                waveMesh.visible = true;
                waveMesh.material.color.setHex(themeColor);
                waveMesh.material.opacity = 1.0;
            } else {
                const waveMat = new THREE.MeshBasicMaterial({
                    color: themeColor,
                    transparent: true,
                    opacity: 1.0,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false,
                    side: THREE.DoubleSide
                });
                waveMesh = new THREE.Mesh(this.cachedDiamondShockwaveGeo, waveMat);
                this.scene.add(waveMesh);
            }

            waveMesh.position.copy(tile.position);
            waveMesh.position.y = surfaceY + 0.032;
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
            this.spawnComboBurst(tile, waveMesh.material.color, 6);
        } else {
            let waveLine;
            if (this.shockwavePool.length > 0) {
                waveLine = this.shockwavePool.pop();
                waveLine.visible = true;
                waveLine.material.color.setHex(themeColor);
                waveLine.material.opacity = 1.0;
            } else {
                const waveMat = new THREE.MeshBasicMaterial({
                    color: themeColor,
                    transparent: true,
                    opacity: 1.0,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false,
                    side: THREE.DoubleSide
                });
                waveLine = new THREE.Mesh(this.cachedShockwaveGeo, waveMat);
                this.scene.add(waveLine);
            }

            waveLine.position.copy(tile.position);
            waveLine.position.y = surfaceY + 0.032;
            waveLine.rotation.x = -Math.PI / 2;
            waveLine.rotation.z = 0;
            waveLine.scale.set(tileScale, tileScale, 1);

            const baseScale = tileScale;
            this.shockwaves.push(this.getShockwaveData(
                waveLine,
                false,
                tile,
                baseScale,
                baseScale,
                1.0,
                4.5 * customOffsetScale,
                2.4 * customOffsetScale * baseScale
            ));
        }
    },

    updateShockwaves: function (delta, camZ) {
        for (let i = this.shockwaves.length - 1; i >= 0; i--) {
            const sw = this.shockwaves[i];

            const isTileInactive = sw.targetTile && (!sw.targetTile.parent || !sw.targetTile.visible);
            const isBehindCam = sw.mesh.position.z > camZ + 5;

            if (isTileInactive || isBehindCam) {
                sw.mesh.visible = false;
                if (sw.isDiamondBurst) {
                    this.diamondShockwavePool.push(sw.mesh);
                } else {
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

            const currentSpeed = sw.speed * (1.0 - progress * 0.45);
            sw.scale += currentSpeed * delta;
            sw.mesh.scale.set(sw.scale, sw.scale, 1);

            if (sw.targetTile && sw.targetTile.parent) {
                sw.mesh.position.x = sw.targetTile.position.x;
                sw.mesh.position.z = sw.targetTile.position.z;
            }

            const fadeFactor = Math.pow(Math.cos(progress * Math.PI / 2), 2.0);
            sw.mesh.material.opacity = fadeFactor;

            if (progress >= 1.0 || fadeFactor <= 0.001) {
                sw.mesh.visible = false;
                if (sw.isDiamondBurst) {
                    this.diamondShockwavePool.push(sw.mesh);
                } else {
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
    spawnBoundaryPulses: function (cameraZ, furthestZ, activeColor = 0x00ffff) {
        const boundariesOn = typeof showBoundariesEnabled !== 'undefined' && showBoundariesEnabled;
        const advancedOn = boundariesOn && (typeof advancedBoundariesEnabled !== 'undefined' && advancedBoundariesEnabled);
        if (!boundariesOn || !advancedOn) return;

        const pulseSpeed = 160;
        const surfaceY = (typeof window.surfaceY !== 'undefined' ? window.surfaceY : 0.2);
        const yPos = surfaceY - 0.02; // Bằng đúng chiều cao của Boundary Line
        const maxDistance = 140;

        [-6.75, 6.75].forEach(xPos => {
            let pMesh;
            if (this.boundaryPulsePool.length > 0) {
                pMesh = this.boundaryPulsePool.pop();
                pMesh.position.set(xPos, yPos, cameraZ);
                pMesh.material.color.setHex(activeColor);
                pMesh.material.opacity = 0.85;
                pMesh.visible = true;
            } else {
                pMesh = new THREE.Mesh(this.pulseGeometry, this.pulseMaterialTemplate.clone());
                pMesh.position.set(xPos, yPos, cameraZ);
                pMesh.material.color.setHex(activeColor);
                if (this.scene) this.scene.add(pMesh);
            }

            let pData = this.boundaryPulseDataPool.length > 0 ? this.boundaryPulseDataPool.pop() : {};
            pData.mesh = pMesh;
            pData.speed = -pulseSpeed;
            pData.startZ = cameraZ;
            pData.maxDistance = maxDistance;
            pData.opacity = 0.85;

            this.boundaryPulses.push(pData);
        });
    },

    updateBoundaryPulses: function (delta, gameSpeed) {
        for (let i = this.boundaryPulses.length - 1; i >= 0; i--) {
            const pulse = this.boundaryPulses[i];
            pulse.mesh.position.z += pulse.speed * gameSpeed * delta;

            const distanceTraveled = Math.abs(pulse.mesh.position.z - pulse.startZ);
            pulse.opacity = 0.85 * (1.0 - (distanceTraveled / pulse.maxDistance));

            if (pulse.mesh.material) {
                pulse.mesh.material.opacity = Math.max(0, pulse.opacity);
            }

            if (pulse.opacity <= 0 || distanceTraveled >= pulse.maxDistance) {
                pulse.mesh.visible = false;
                this.boundaryPulsePool.push(pulse.mesh);
                this.boundaryPulseDataPool.push(pulse);
                const last = this.boundaryPulses.pop();
                if (i < this.boundaryPulses.length) {
                    this.boundaryPulses[i] = last;
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
        const boundariesOn = typeof showBoundariesEnabled !== 'undefined' && showBoundariesEnabled;
        const advancedOn = boundariesOn && (typeof advancedBoundariesEnabled !== 'undefined' && advancedBoundariesEnabled);

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
            const isWebGPU = (typeof window.isWebGPUCache !== 'undefined' ? window.isWebGPUCache : (typeof graphicsAPI !== 'undefined' && graphicsAPI === 'webgpu'));
            const mat = isWebGPU
                ? new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, depthWrite: false })
                : new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });

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
                    this.ballTrailSegments.push(seg);
                }
            }
        }

        if (this.ballTrailInstancedMesh) {
            for (let i = this.ballTrailSegments.length - 1; i >= 0; i--) {
                const seg = this.ballTrailSegments[i];
                seg.life -= delta * 2.0;
                if (seg.life <= 0) {
                    this.ballTrailPool.push(seg);
                    const last = this.ballTrailSegments.pop();
                    if (i < this.ballTrailSegments.length) {
                        this.ballTrailSegments[i] = last;
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
                this.trailDummyPosition.set(seg.x, seg.y, seg.z);
                this.trailDummyEuler.set(seg.rotX, seg.rotY, seg.rotZ);
                this.trailDummyQuaternion.setFromEuler(this.trailDummyEuler);
                this.trailDummyScale.set(curScale, curScale, curScale);
                this.trailDummyMatrix.compose(this.trailDummyPosition, this.trailDummyQuaternion, this.trailDummyScale);

                this.ballTrailInstancedMesh.setMatrixAt(i, this.trailDummyMatrix);
                if (this.ballTrailInstancedMesh.setColorAt && seg.color) {
                    this.ballTrailInstancedMesh.setColorAt(i, seg.color);
                }
            }
            for (let i = this.ballTrailSegments.length; i < this.MAX_TRAIL_INSTANCES; i++) {
                this.trailDummyMatrix.makeScale(0, 0, 0);
                this.ballTrailInstancedMesh.setMatrixAt(i, this.trailDummyMatrix);
            }
            this.ballTrailInstancedMesh.instanceMatrix.needsUpdate = true;
            if (this.ballTrailInstancedMesh.instanceColor) this.ballTrailInstancedMesh.instanceColor.needsUpdate = true;
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
            if (sw.isDiamondBurst) {
                this.diamondShockwavePool.push(sw.mesh);
            } else {
                this.shockwavePool.push(sw.mesh);
            }
            this.shockwaveDataPool.push(sw);
        }
        this.shockwaves.length = 0;

        for (let i = 0; i < this.boundaryPulses.length; i++) {
            const pulse = this.boundaryPulses[i];
            if (pulse.mesh && this.scene) {
                this.scene.remove(pulse.mesh);
                this.boundaryPulsePool.push(pulse.mesh);
            }
            this.boundaryPulseDataPool.push(pulse);
        }
        this.boundaryPulses.length = 0;

        this.initBallTrail();
    }
};
