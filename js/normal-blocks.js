// ============================================================
// normal-blocks.js — Quản lý khởi tạo và sinh khối gạch (Normal Blocks)
// ============================================================

// --- HELPERS HÌNH HỌC ---

// Vẽ đường viền bo góc phẳng để dùng làm Shape cho Extrude và Shockwave
function createRoundedRectShape(width, height, radius) {
    const shape = new THREE.Shape();
    const x = -width / 2;
    const y = -height / 2;
    shape.moveTo(x, y + radius);
    shape.lineTo(x, y + height - radius);
    shape.quadraticCurveTo(x, y + height, x + radius, y + height);
    shape.lineTo(x + width - radius, y + height);
    shape.quadraticCurveTo(x + width, y + height, x + width, y + height - radius);
    shape.lineTo(x + width, y + radius);
    shape.quadraticCurveTo(x + width, y, x + width - radius, y);
    shape.lineTo(x + radius, y);
    shape.quadraticCurveTo(x, y, x, y + radius);
    return shape;
}

// --- SHADERS & VẬT LIỆU CHO BỂ HỒNG NGOẠI / HIỆU ỨNG TỎA SÁNG PHẢN CHIẾU ---
const glowVertexShader = `
    varying vec3 vLocalPosition;
    void main() {
        vLocalPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const glowFragmentShader = `
    uniform vec3 color;
    uniform float opacityMultiplier;
    uniform float glowHeight;
    varying vec3 vLocalPosition;
    void main() {
        // Chiều cao glowHeight được căn giữa ở tọa độ Z từ -glowHeight/2 đến glowHeight/2
        float halfHeight = glowHeight / 2.0;
        float factor = (vLocalPosition.z + halfHeight) / glowHeight;
        factor = clamp(factor, 0.0, 1.0);
        // Hạn chế ánh sáng xuyên bằng cách fade out ở sát rìa trên (tiếp giáp với block)
        float fadeTop = smoothstep(1.0, 0.95, factor);
        // Hiệu ứng mờ dần dạng mũ lũy thừa
        float alpha = pow(factor, 1.8) * 0.5 * opacityMultiplier * fadeTop;
        gl_FragColor = vec4(color, alpha);
    }
`;

let baseGlowMaterial = null;
let capMaterial = null;

// --- HITBOX VISUALIZATION RESOURCES ---
let sharedHitboxGeo = null;
let sharedHitboxEdgesGeo = null;
let sharedHitboxMat = null;
let sharedHitboxLineMat = null;

function initHitboxResources() {
    if (!sharedHitboxGeo) {
        sharedHitboxGeo = new THREE.BoxGeometry(1, 1, 1);
    }
    if (!sharedHitboxEdgesGeo) {
        sharedHitboxEdgesGeo = new THREE.EdgesGeometry(sharedHitboxGeo);
    }
    if (!sharedHitboxMat) {
        sharedHitboxMat = new THREE.MeshBasicMaterial({
            color: 0xff0055,
            transparent: true,
            opacity: 0.15,
            depthWrite: false
        });
    }
    if (!sharedHitboxLineMat) {
        sharedHitboxLineMat = new THREE.LineBasicMaterial({
            color: 0xff0055,
            linewidth: 2,
            transparent: true,
            opacity: 0.8
        });
    }
}

function createHitboxMesh() {
    initHitboxResources();
    const mesh = new THREE.Mesh(sharedHitboxGeo, sharedHitboxMat);
    mesh.name = "hitboxMesh";

    const line = new THREE.LineSegments(sharedHitboxEdgesGeo, sharedHitboxLineMat);
    line.name = "hitboxOutline";
    mesh.add(line);

    return mesh;
}

let sharedGlowTexture = null;
function getSharedGlowTexture() {
    if (!sharedGlowTexture) {
        const size = 128;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        // Create a linear gradient from top (darker/transparent) to bottom (bright)
        const gradient = ctx.createLinearGradient(0, 0, 0, size);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
        gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.05)');
        gradient.addColorStop(0.8, 'rgba(255, 255, 255, 0.3)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0.85)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);

        sharedGlowTexture = new THREE.CanvasTexture(canvas);
        sharedGlowTexture.wrapS = THREE.ClampToEdgeWrapping;
        sharedGlowTexture.wrapT = THREE.ClampToEdgeWrapping;
        cachedTexturesSet.add(sharedGlowTexture);
    }
    return sharedGlowTexture;
}
function createGlowTexture() {
    return getSharedGlowTexture();
}
window.getSharedGlowTexture = getSharedGlowTexture;

function initGlowMaterials() {
    if (!capMaterial) {
        capMaterial = new THREE.MeshBasicMaterial({ visible: false });
    }
    if (!baseGlowMaterial) {
        const isWebGPU = (typeof window.isWebGPUCache !== 'undefined' ? window.isWebGPUCache : (typeof graphicsAPI !== 'undefined' && graphicsAPI === 'webgpu'));
        if (isWebGPU) {
            const texture = getSharedGlowTexture();
            baseGlowMaterial = new THREE.MeshBasicMaterial({
                color: 0x00ffff,
                map: texture,
                transparent: true,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                side: THREE.FrontSide
            });
        } else {
            baseGlowMaterial = new THREE.ShaderMaterial({
                uniforms: {
                    color: { value: new THREE.Color(0x00ffff) },
                    opacityMultiplier: { value: 1.0 },
                    glowHeight: { value: 1.5 }
                },
                vertexShader: glowVertexShader,
                fragmentShader: glowFragmentShader,
                transparent: true,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                side: THREE.FrontSide
            });
        }
    }
}

function createTileGlowMaterial(activeColor) {
    initGlowMaterials();
    const hex = (activeColor !== undefined && activeColor !== null) ? activeColor : 0x00ffff;
    const isWebGPU = (typeof window.isWebGPUCache !== 'undefined' ? window.isWebGPUCache : (typeof graphicsAPI !== 'undefined' && graphicsAPI === 'webgpu'));

    if (isWebGPU) {
        return new THREE.MeshBasicMaterial({
            color: hex,
            map: getSharedGlowTexture(),
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.FrontSide
        });
    }

    return new THREE.ShaderMaterial({
        uniforms: {
            color: { value: new THREE.Color(hex) },
            opacityMultiplier: { value: 1.0 },
            glowHeight: { value: getCurrentGlowHeight() }
        },
        vertexShader: glowVertexShader,
        fragmentShader: glowFragmentShader,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.FrontSide
    });
}

// --- TEXTURE CACHE FOR LABELS ---
const roundTextureCache = new Map();
const percentTextureCache = new Map();
let starTextureCache = null;
const cachedTexturesSet = new Set();

// Tạo nhãn 3D cho Round
function createRoundLabel(round) {
    const fontFamily = (typeof activeLang !== 'undefined' && activeLang === 'vi') ? 'Montserrat' : 'Arial';
    const key = `${round}_${fontFamily}`;
    let texture = roundTextureCache.get(key);
    if (!texture) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 512;
        canvas.height = 128;
        ctx.fillStyle = 'rgba(0,0,0,0)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.font = `bold 50px ${fontFamily}, sans-serif`;
        ctx.fillStyle = '#00ffff';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 15;
        ctx.fillText(`${t('round')} ${round}`, 256, 80);
        texture = new THREE.CanvasTexture(canvas);
        roundTextureCache.set(key, texture);
        cachedTexturesSet.add(texture);
    }
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(10, 2.5, 1);
    sprite.position.y = 0;
    sprite.position.z = 1.5;
    return sprite;
}

// Tạo nhãn 3D cho phần trăm tiến độ Warm-up
function createPercentLabel(percent) {
    const fontFamily = (typeof activeLang !== 'undefined' && activeLang === 'vi') ? 'Montserrat' : 'Arial';
    const key = `${percent}_${fontFamily}`;
    let texture = percentTextureCache.get(key);
    if (!texture) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 512;
        canvas.height = 128;
        ctx.fillStyle = 'rgba(0,0,0,0)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        // Sử dụng màu hồng (Pink) để phân biệt với nhãn Round (Cyan)
        ctx.font = `bold 80px ${fontFamily}, sans-serif`;
        ctx.fillStyle = '#ec4899';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#ec4899';
        ctx.shadowBlur = 15;
        ctx.fillText(`${percent}%`, 256, 80);
        texture = new THREE.CanvasTexture(canvas);
        percentTextureCache.set(key, texture);
        cachedTexturesSet.add(texture);
    }
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(spriteMat);
    // Kích thước nhỏ hơn nhãn Round một chút để tinh tế hơn
    sprite.scale.set(8, 2, 1);
    sprite.position.y = 0;
    sprite.position.z = 1.2;
    return sprite;
}

function createStarLabel() {
    if (!starTextureCache) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 128;
        canvas.height = 128;
        ctx.fillStyle = 'rgba(0,0,0,0)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.font = 'bold 80px Arial, sans-serif';
        ctx.fillStyle = '#facc15'; // Bright yellow
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = '#facc15';
        ctx.shadowBlur = 20;
        ctx.fillText('⭐', 64, 64);

        starTextureCache = new THREE.CanvasTexture(canvas);
        cachedTexturesSet.add(starTextureCache);
    }
    const spriteMat = new THREE.SpriteMaterial({ map: starTextureCache, transparent: true });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(3, 3, 1);
    sprite.position.y = 0;
    sprite.position.z = 1.2;
    return sprite;
}

// --- THỰC HIỆN GIẢI PHÓNG BỘ NHỚ CHO GẠCH BỊ HUỶ (ĐỂ TRÁNH LEAK GPU/RAM) ---
function disposeTile(tile) {
    if (!tile) return;

    // Giải phóng material của Mesh chính
    if (tile.material) {
        if (Array.isArray(tile.material)) {
            tile.material.forEach(mat => {
                if (mat && mat !== capMaterial) mat.dispose();
            });
        } else {
            if (tile.material !== capMaterial) tile.material.dispose();
        }
    }

    // Giải phóng các viền, highlight và hồng tâm
    if (tile.userData) {
        if (tile.userData.borderLine && tile.userData.borderLine.material) {
            tile.userData.borderLine.material.dispose();
        }
        if (tile.userData.innerBorderLine && tile.userData.innerBorderLine.material) {
            tile.userData.innerBorderLine.material.dispose();
        }
        if (tile.userData.edgeMesh && tile.userData.edgeMesh.material) {
            if (Array.isArray(tile.userData.edgeMesh.material)) {
                tile.userData.edgeMesh.material.forEach(m => { if (m && m !== capMaterial) m.dispose(); });
            } else {
                if (tile.userData.edgeMesh.material !== capMaterial) tile.userData.edgeMesh.material.dispose();
            }
        }
        if (tile.userData.centerMesh && tile.userData.centerMesh.material) {
            tile.userData.centerMesh.material.dispose();
        }
        if (tile.userData.glowMesh) {
            const glowMesh = tile.userData.glowMesh;
            if (glowMesh.material) {
                if (Array.isArray(glowMesh.material)) {
                    glowMesh.material.forEach(mat => {
                        if (mat && mat !== capMaterial) mat.dispose();
                    });
                } else {
                    if (glowMesh.material !== capMaterial) glowMesh.material.dispose();
                }
            }
        }
    }

    // Giải phóng sprite nhãn đặc biệt (Round, Percent, Star)
    for (let i = tile.children.length - 1; i >= 0; i--) {
        const child = tile.children[i];
        if (child.type === "Sprite") {
            tile.remove(child);
            if (child.material) {
                if (child.material.map && !cachedTexturesSet.has(child.material.map)) {
                    child.material.map.dispose();
                }
                child.material.dispose();
            }
        }
    }
}

// --- THÊM GẠCH VÀO POOL ---
function pushTileToPool(tile) {
    if (!tile) return;
    
    const cleanFunc = (t) => {
        t.visible = false;

        if (typeof window.MovingBlocksManager !== 'undefined' && typeof window.MovingBlocksManager.removeTile === 'function') {
            window.MovingBlocksManager.removeTile(t);
        }

        if (t.userData) {
            t.userData.isMoving = false;
            t.userData.isExiting = false;
            t.userData.isEntering = false;
            delete t.userData.moveSpeed;
            delete t.userData.moveTime;
            delete t.userData.amplitude;
            delete t.userData.baseX;
            delete t.userData.moveType;
        }
    };
    
    if (typeof window.PoolHelpers !== 'undefined') {
        window.PoolHelpers.release(tilePool, tile, cleanFunc);
    } else {
        cleanFunc(tile);
        tilePool.push(tile);
    }
}

function prewarmTilePool(count = 100) {
    if (typeof window.PoolHelpers !== 'undefined') {
        const createFunc = () => getTileFromPool(true);
        const cleanFunc = (t) => {
            t.visible = false;
        };
        window.PoolHelpers.prewarm(tilePool, count, createFunc, cleanFunc);
    } else {
        while (tilePool.length < count) {
            const tile = getTileFromPool(true);
            tile.visible = false;
            tilePool.push(tile);
        }
    }
    
    if (tilePool.length > 0 && typeof window.FakeBlocksManager !== 'undefined') {
        if (typeof window.FakeBlocksManager.prewarmFakeTilePool === 'function') {
            window.FakeBlocksManager.prewarmFakeTilePool(tilePool[0], 60);
        }
        if (typeof window.FakeBlocksManager.prewarmFragmentPool === 'function') {
            window.FakeBlocksManager.prewarmFragmentPool();
        }
    }
}
window.prewarmTilePool = prewarmTilePool;

// --- OBJECT POOL: LẤY / TẠO MESH CHO GẠCH ---
function getTileFromPool(forceNew = false) {
    let tile;
    const isWebGPU = (typeof window.isWebGPUCache !== 'undefined' ? window.isWebGPUCache : (typeof graphicsAPI !== 'undefined' && graphicsAPI === 'webgpu'));

    if (!forceNew && tilePool.length > 0) {
        tile = tilePool.pop();
        // Xóa các label cũ nếu có
        for (let i = tile.children.length - 1; i >= 0; i--) {
            if (tile.children[i].type === "Sprite") {
                const sprite = tile.children[i];
                tile.remove(sprite);
                if (sprite.material) {
                    if (sprite.material.map && !cachedTexturesSet.has(sprite.material.map)) {
                        sprite.material.map.dispose();
                    }
                    sprite.material.dispose();
                }
            }
        }
        // Xóa các thuộc tính game-state tạm thời của userData để tránh lỗi tái sử dụng (vd: isFinalStarTile)
        const keysToKeep = ['borderLine', 'centerMesh', 'glowMesh', 'bodyMesh', 'edgeMesh', 'innerBorderLine', 'hitboxMesh'];
        for (let key in tile.userData) {
            if (!keysToKeep.includes(key)) {
                delete tile.userData[key];
            }
        }
    } else {
        const detailScale = typeof tileDetailScale !== 'undefined' ? tileDetailScale : 1.0;

        if (!cachedTileGeo) {
            const tileShape = createRoundedRectShape(tileWidth, tileLength, 0.8);
            let baseCurve = 12;
            if (currentGraphicsQuality === 'simple') baseCurve = 2;
            else if (currentGraphicsQuality === 'hd') baseCurve = 6;
            else if (currentGraphicsQuality === 'fhd') baseCurve = 12;
            else if (currentGraphicsQuality === 'qhd') baseCurve = 18;
            else if (currentGraphicsQuality === 'uhd') baseCurve = 24;

            const bevelEnabled = currentBevelEnabled && (detailScale >= 0.3);
            const extrudeSettings = {
                depth: currentTileThickness,
                bevelEnabled: bevelEnabled,
                bevelThickness: currentBevelThickness * Math.min(1.0, detailScale),
                bevelSize: currentBevelSize * Math.min(1.0, detailScale),
                bevelSegments: Math.max(0, Math.round(currentBevelSegments * detailScale)),
                curveSegments: Math.max(1, Math.round(12 * detailScale))
            };
            cachedTileGeo = new THREE.ExtrudeGeometry(tileShape, extrudeSettings);
            cachedTileGeo.center();
        }

        const isWebGPU = (typeof window.isWebGPUCache !== 'undefined' ? window.isWebGPUCache : (typeof graphicsAPI !== 'undefined' && graphicsAPI === 'webgpu'));

        const tileMat = isWebGPU
            ? new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.8, depthWrite: false })
            : (currentGraphicsQuality === 'simple'
                ? new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.6, depthWrite: false })
                : new THREE.MeshPhongMaterial({ transparent: true, opacity: 0.45, shininess: 120, depthWrite: false }));

        tile = new THREE.Mesh(cachedTileGeo, tileMat);
        tile.rotation.x = -Math.PI / 2;

        if (!tile.userData) tile.userData = {};

        const bevelEnabled = currentBevelEnabled && (detailScale >= 0.3);
        const actualBevelThickness = bevelEnabled ? currentBevelThickness * Math.min(1.0, detailScale) : 0;
        const surfaceZ = isWebGPU
            ? (currentTileThickness / 2 + actualBevelThickness)
            : (currentTileThickness / 2);

        // Tạo viền
        if (!cachedBorderGeo) {
            const borderThickness = 0.25;
            const shape = createRoundedRectShape(tileWidth + borderThickness, tileLength + borderThickness, 0.8 + borderThickness / 2);
            const hole = createRoundedRectShape(tileWidth - borderThickness, tileLength - borderThickness, Math.max(0, 0.8 - borderThickness / 2));
            shape.holes.push(hole);
            let baseCurve = currentGraphicsQuality === 'simple' ? 2 : (currentGraphicsQuality === 'hd' ? 6 : (currentGraphicsQuality === 'fhd' ? 12 : (currentGraphicsQuality === 'qhd' ? 18 : 24)));
            cachedBorderGeo = new THREE.ShapeGeometry(shape, Math.max(1, Math.round(baseCurve * detailScale)));
        }
        const borderLine = new THREE.Mesh(cachedBorderGeo, new THREE.MeshBasicMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
        borderLine.name = "borderLine";
        borderLine.position.z = surfaceZ + 0.01;
        tile.add(borderLine);
        tile.userData.borderLine = borderLine;

        if (!cachedCenterGeo) {
            const centerSegments = Math.max(8, Math.round(32 * detailScale));
            cachedCenterGeo = new THREE.CircleGeometry(tileWidth * 0.18, centerSegments);
        }
        const centerMesh = new THREE.Mesh(cachedCenterGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, depthWrite: false, transparent: true }));
        centerMesh.name = "centerMesh";
        centerMesh.position.z = surfaceZ + 0.015;
        tile.add(centerMesh);
        tile.userData.centerMesh = centerMesh;

        // Tạo glow base (skirt phản chiếu)
        initGlowMaterials();
        const glowHeight = getCurrentGlowHeight();
        if (!cachedGlowGeo) {
            const tileShape = createRoundedRectShape(tileWidth, tileLength, 0.8);
            let baseCurve = currentGraphicsQuality === 'simple' ? 2 : (currentGraphicsQuality === 'hd' ? 6 : (currentGraphicsQuality === 'fhd' ? 12 : (currentGraphicsQuality === 'qhd' ? 18 : 24)));
            const glowExtrudeSettings = {
                depth: glowHeight,
                bevelEnabled: false,
                curveSegments: Math.max(1, Math.round(baseCurve * detailScale))
            };
            cachedGlowGeo = new THREE.ExtrudeGeometry(tileShape, glowExtrudeSettings);
            cachedGlowGeo.center();
        }
        const tileGlowMat = createTileGlowMaterial(typeof activeColor !== 'undefined' ? activeColor : 0x00ffff);
        const glowMesh = new THREE.Mesh(cachedGlowGeo, [capMaterial, tileGlowMat]);
        glowMesh.name = "glowMesh";
        const bevelOffset = (typeof currentBevelEnabled !== 'undefined' && currentBevelEnabled) ? currentBevelThickness : 0;
        glowMesh.position.z = -currentTileThickness / 2 - bevelOffset - glowHeight / 2;
        glowMesh.visible = isGlowEnabled();
        tile.add(glowMesh);
        tile.userData.glowMesh = glowMesh;

        // Tạo hitbox cho gạch
        const hitboxMesh = createHitboxMesh();
        hitboxMesh.position.set(0, 0, surfaceZ);
        hitboxMesh.visible = typeof showHitboxEnabled !== 'undefined' && showHitboxEnabled;
        tile.add(hitboxMesh);
        tile.userData.hitboxMesh = hitboxMesh;

        scene.add(tile);
    }

    // Reset trạng thái cơ bản
    tile.visible = true;
    tile.scale.set(1, 1, 1);
    if (tile.userData) {
        // Reset centerMesh
        if (tile.userData.centerMesh) {
            tile.userData.centerMesh.visible = true;
            if (tile.userData.centerMesh.material) tile.userData.centerMesh.material.opacity = 0.0;
            tile.userData.centerMeshFade = false;
        }
        // Reset borderLine opacity
        if (tile.userData.borderLine && tile.userData.borderLine.material) {
            tile.userData.borderLine.material.opacity = 1.0;
        }
        // Reset isDimmed
        tile.userData.isDimmed = false;
    }

    // Reset glow opacity
    const poolGlowMesh = tile.getObjectByName('glowMesh');
    if (poolGlowMesh) {
        const poolGlowMat = Array.isArray(poolGlowMesh.material) ? poolGlowMesh.material[1] : poolGlowMesh.material;
        if (poolGlowMat) {
            if (poolGlowMat.uniforms) {
                poolGlowMat.uniforms.opacityMultiplier.value = 1.0;
            } else {
                poolGlowMat.opacity = 0.85;
            }
        }
    }

    return tile;
}

let lastTileWasDelayed = false;

// --- SINH GẠCH (SPAWN TILE) ---
function spawnTile(isFirst = false) {
    let tileZ, tileX;
    let isRoundStartBlock = false;
    let isTooClose = false;
    let timeDiff = 1.0;
    let nextTimeDiff = 1.0;
    let prevX = 0;

    if (isFirst) {
        tileZ = 0;
        tileX = 0;
        currentBeatIndex = 1;
        transitionStep = 0;
        lastTileWasDelayed = false;
    } else {
        const prevTile = tiles[tiles.length - 1];
        prevX = prevTile ? prevTile.position.x : 0;

        // Kiểm tra nếu đã hết beatmap để chuyển sang Round mới
        if (currentBeatIndex >= beatmapBeats.length) {
            if (window.chosenPlayMode === 'normal') {
                return false; // Không sinh thêm gạch ở chế độ Thường
            }
            currentBeatIndex = 0;
            roundCount++;
            isEndlessMode = true;
            isRoundStartBlock = true;
        }

        if (currentBeatIndex === 0) {
            timeDiff = 2.0;
            currentBeatIndex = 1;
            tileX = prevX;
        } else if (currentBeatIndex === 1) {
            if (beatmapBeats.length > 1) {
                timeDiff = beatmapBeats[1] - beatmapBeats[0];
                if (timeDiff < 0.1) timeDiff = Math.max(0.3, timeDiff);
            } else {
                timeDiff = 1.0;
            }
            currentBeatIndex = 2;
        } else {
            timeDiff = beatmapBeats[currentBeatIndex] - beatmapBeats[currentBeatIndex - 1];
            currentBeatIndex++;
        }

        if (currentBeatIndex < beatmapBeats.length && currentBeatIndex > 0) {
            nextTimeDiff = beatmapBeats[currentBeatIndex] - beatmapBeats[currentBeatIndex - 1];
        }

        tileZ = lastTileZ - (timeDiff * Math.abs(baseBallVelocityZ));
    }

    // Giai đoạn khởi động: 16 block đầu của lượt đầu tiên (dựa trên currentBeatIndex & roundCount)
    const isInitial16Blocks = roundCount === 0 && currentBeatIndex <= 16;
    const isFirst3Blocks = roundCount === 0 && currentBeatIndex <= 3;
    const isInitialWarmup = isInitial16Blocks;

    if (!isFirst) {
        // --- LOGIC TRÁNH IMPOSSIBLE JUMP & 16 BLOCK ĐẦU ---
        if (timeDiff < 0.08) isTooClose = true;
        let maxDeltaX = timeDiff * 18;

        if (isTooClose) {
            maxDeltaX = 0;
        } else if (isFirst3Blocks) {
            // 3 block đầu tiên luôn luôn thẳng hàng (maxDeltaX = 0)
            maxDeltaX = 0;
        } else if (isInitial16Blocks) {
            // 13 block còn lại trong 16 block đầu: nếu nhịp beat gần (<0.3s) thì thẳng hàng, ngược lại lệch tối đa 0.8 block
            const blockUnit = typeof tileWidth !== 'undefined' ? tileWidth : 4.0;
            if (timeDiff < 0.3) {
                maxDeltaX = 0; // Beat gần → ưu tiên thẳng hàng
            } else {
                maxDeltaX = 0.5 * blockUnit;
            }
        } else if (timeDiff < 0.15) {
            maxDeltaX = 0.25;
        } else {
            maxDeltaX = Math.max(1.5, Math.min(6, maxDeltaX));
        }

        if (typeof window.EasyModeManager !== 'undefined' && window.EasyModeManager.isEnabled && !isInitial16Blocks) {
            maxDeltaX = window.EasyModeManager.calculateMaxDeltaX(timeDiff, maxDeltaX);
        }

        if (!isRoundStartBlock) {
            if (maxDeltaX === 0) {
                tileX = prevX;
            } else {
                const isAsianMode = typeof window.AsianModeManager !== 'undefined' && window.AsianModeManager.isEnabled;
                const willSpawnFake = typeof window.FakeBlocksManager !== 'undefined' && window.FakeBlocksManager.willSpawnFakeForNextTile(isFirst, timeDiff, isTooClose, nextTimeDiff);
                const isNoFakeInAsianMode = isAsianMode && !willSpawnFake && !isInitial16Blocks;

                if (isNoFakeInAsianMode) {
                    // Asian Mode (No Fake State): Ngoại trừ vùng thẳng hàng (maxDeltaX === 0),
                    // các khối còn lại luôn luôn cách vị trí cũ ít nhất 1 block (khoảng cách slot >= 4.0)
                    const slots = [-4.5, 0, 4.5];
                    const minBlockDistance = 4.0;
                    const candidates = slots.filter(s => Math.abs(s - prevX) >= minBlockDistance);

                    if (candidates.length > 0) {
                        tileX = candidates[Math.floor(Math.random() * candidates.length)];
                    } else {
                        tileX = (prevX >= 0) ? -4.5 : 4.5;
                    }
                } else {
                    const minX = Math.max(-4.5, prevX - maxDeltaX);
                    const maxX = Math.min(4.5, prevX + maxDeltaX);
                    tileX = typeof window.MathUtils !== 'undefined' ? window.MathUtils.randomRange(minX, maxX) : minX + Math.random() * (maxX - minX);
                }
            }
        }
    }

    lastTileZ = tileZ;
    let activeColor = dynamicColorsEnabled ? (Math.random() > 0.4 ? 0xff00ff : 0x00ffff) : 0x00ffff;

    const tile = getTileFromPool();
    const finalScale = currentTileScale;
    tile.scale.set(finalScale, finalScale, 1);
    tile.position.set(tileX, 0, tileZ);

    if (tile.userData.hitboxMesh) {
        const hitboxMesh = tile.userData.hitboxMesh;
        if (hitboxMesh) {
            const scaleX = tileWidth + (ballRadius * 2.5 / finalScale);
            const scaleY = tileLength + (ballRadius * 1.64 / finalScale);
            hitboxMesh.scale.set(scaleX, scaleY, 0.4);
        }
    }

    tile.material.color.setHex(activeColor);
    if (tile.material.emissive) tile.material.emissive.setHex(activeColor === 0xff00ff ? 0x220022 : 0x001122);
    const isWebGPUSpawn = (typeof window.isWebGPUCache !== 'undefined' ? window.isWebGPUCache : (typeof graphicsAPI !== 'undefined' && graphicsAPI === 'webgpu'));
    tile.material.opacity = isWebGPUSpawn ? 0.8 : (currentGraphicsQuality === 'simple' ? 0.6 : 0.45);
    if (tile.userData.borderLine && tile.userData.borderLine.material) {
        tile.userData.borderLine.material.color.setHex(isWebGPUSpawn ? 0xffffff : activeColor);
    }

    let isEntering = !isFirst && spawnAnimationMode !== 'none';
    if (isEntering && spawnAnimationMode === 'mix') {
        // Khoảng cách block gần (timing block gần < 0.25s) sẽ dùng instant (không slide)
        if (timeDiff < 0.25) {
            isEntering = false;
        }
    }

    // Điều kiện xuất hiện trễ:
    // 1. Khoảng cách time beat hiện tại dài (> 1.0s)
    // 2. Time beat kế tiếp sau nó KHÔNG PHẢI là khoảng dài > 1.0s (nextTimeDiff <= 1.0s) và ngắn hơn nhịp hiện tại (nextTimeDiff < timeDiff)
    // 3. Không bị liên tiếp với block trễ trước đó (!lastTileWasDelayed)
    // 4. Xác suất 90% (Math.random() < 0.9)
    const isNextGapLong = nextTimeDiff > 1.0;
    const isDelayedAppearance = !isFirst && 
                                !lastTileWasDelayed && 
                                (timeDiff > 1.0) && 
                                !isNextGapLong && 
                                (nextTimeDiff < timeDiff) && 
                                (Math.random() < 0.9);

    lastTileWasDelayed = isDelayedAppearance;

    if (isDelayedAppearance) {
        tile.visible = false;
        tile.position.z = tileZ;
        tile.userData.targetZ = tileZ;
    } else if (isEntering) {
        if (spawnAnimationMode === 'slide' || spawnAnimationMode === 'mix') {
            tile.position.z = tileZ - 40;
            tile.userData.targetZ = tileZ;
        }
    } else {
        tile.position.z = tileZ;
        tile.userData.targetZ = tileZ;
    }

    let tileTime = 0;
    if (beatmapBeats && beatmapBeats.length > 0) {
        let idx = Math.max(0, currentBeatIndex - 1);
        if (idx < beatmapBeats.length) {
            tileTime = beatmapBeats[idx];
        } else {
            tileTime = beatmapBeats[beatmapBeats.length - 1];
        }
    }

    const ud = tile.userData;
    ud.themeColor = activeColor;
    ud.time = tileTime;
    ud.centerX = 0;
    ud.isRoundStart = isRoundStartBlock;
    ud.roundValue = roundCount;
    ud.beatIndex = currentBeatIndex;
    ud.isInitial16Blocks = isInitial16Blocks;
    ud.scale = finalScale;
    ud.isEntering = isDelayedAppearance ? false : isEntering;
    ud.isDelayedAppearance = isDelayedAppearance;
    ud.isExiting = false;
    ud.isMoving = false;
    ud.targetZ = tileZ;
    ud.springY = 0;
    ud.springVelocityY = 0;
    ud.baseY = 0;

    // TÍCH HỢP LOGIC KHỐI DI CHUYỂN MỚI
    if (typeof window.MovingBlocksManager !== 'undefined') {
        let threshold = 0.2;
        if (typeof window.EasyModeManager !== 'undefined' && window.EasyModeManager.isEnabled) {
            threshold = window.EasyModeManager.getMovingBlockThreshold();
        } else if (typeof window.HardModeManager !== 'undefined') {
            threshold = window.HardModeManager.getMovingBlockThreshold();
        }
        let canBeMoving = isEndlessMode && !isInitialWarmup && !isTooClose && (timeDiff >= threshold) && (nextTimeDiff >= threshold);
        window.MovingBlocksManager.processTile(tile, canBeMoving, roundCount, timeDiff);
    }

    const glowMesh = tile.getObjectByName("glowMesh");
    if (glowMesh) {
        const glowEnabled = isGlowEnabled();
        glowMesh.visible = glowEnabled;
        if (glowEnabled) {
            const glowHeight = getCurrentGlowHeight();
            const glowMat = Array.isArray(glowMesh.material) ? glowMesh.material[1] : glowMesh.material;
            if (glowMat) {
                if (glowMat.uniforms) {
                    glowMat.uniforms.glowHeight.value = glowHeight;
                    glowMat.uniforms.color.value.setHex(activeColor);
                    glowMat.uniforms.opacityMultiplier.value = 1.0;
                } else {
                    if (glowMat.color) glowMat.color.setHex(activeColor);
                    glowMat.opacity = 0.85;
                }
            }
        }
    }
    tiles.push(tile);

    if (isRoundStartBlock) tile.add(createRoundLabel(roundCount));

    // --- LOGIC HIỆN PHẦN TRĂM TIẾN ĐỘ WARM-UP ---
    if (!isFirst && !activeEndlessMode && roundCount === 0 && beatmapBeats.length > 10) {
        const milestones = [20, 40, 60, 80];
        // currentBeatIndex đã được tăng lên ở đoạn trên, nên ta lấy giá trị thực tế của tile đang spawn
        const currentProgressIdx = currentBeatIndex - 1;

        for (let m of milestones) {
            const targetIdx = Math.floor(beatmapBeats.length * (m / 100));
            if (currentProgressIdx === targetIdx) {
                tile.add(createPercentLabel(m));
                break; // Tìm thấy mốc thì thoát vòng lặp
            }
        }
    }

    // --- LOGIC HIỆN NHÃN NGÔI SAO Ở BLOCK CUỐI (CHỈ NORMAL MODE) ---
    if (window.chosenPlayMode === 'normal' && (currentBeatIndex - 1) === beatmapBeats.length - 1) {
        tile.add(createStarLabel());
        tile.userData.isFinalStarTile = true;
    }

    if (typeof window.FakeBlocksManager !== 'undefined') {
        window.FakeBlocksManager.onTileSpawned(tile, isFirst, timeDiff, isTooClose, nextTimeDiff);
    }
    return true;
}