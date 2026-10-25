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
window.createRoundedRectShape = createRoundedRectShape;

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

function createTileGlowMaterial(activeColor) {
    initGlowMaterials();
    const hex = (activeColor !== undefined && activeColor !== null) ? activeColor : 0x00ffff;

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
window.createTileGlowMaterial = createTileGlowMaterial;

// --- TEXTURE CACHE FOR LABELS ---
const cachedTexturesSet = new Set();
const roundSpriteCache = new Map();
const percentSpriteCache = new Map();
let starSpriteCache = null;

// Tạo nhãn 3D cho Round
function createRoundLabel(round) {
    const fontFamily = (typeof activeLang !== 'undefined' && activeLang === 'vi') ? 'Montserrat' : 'Arial';
    const key = `${round}_${fontFamily}`;

    if (roundSpriteCache.has(key)) return roundSpriteCache.get(key).clone();

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

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(10, 2.5, 1);
    sprite.position.y = 0;
    sprite.position.z = 1.5;

    roundSpriteCache.set(key, sprite);
    return sprite.clone();
}

// Tạo nhãn 3D cho phần trăm tiến độ Warm-up
function createPercentLabel(percent) {
    const fontFamily = (typeof activeLang !== 'undefined' && activeLang === 'vi') ? 'Montserrat' : 'Arial';
    const key = `${percent}_${fontFamily}`;

    if (percentSpriteCache.has(key)) return percentSpriteCache.get(key).clone();

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 512;
    canvas.height = 128;
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = `bold 80px ${fontFamily}, sans-serif`;
    ctx.fillStyle = '#ec4899';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#ec4899';
    ctx.shadowBlur = 15;
    ctx.fillText(`${percent}%`, 256, 80);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(8, 2, 1);
    sprite.position.y = 0;
    sprite.position.z = 1.2;

    percentSpriteCache.set(key, sprite);
    return sprite.clone();
}

function createStarLabel() {
    if (starSpriteCache) return starSpriteCache.clone();

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 128;
    canvas.height = 128;
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = 'bold 80px Arial, sans-serif';
    ctx.fillStyle = '#facc15';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#facc15';
    ctx.shadowBlur = 20;
    ctx.fillText('⭐', 64, 64);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(3, 3, 1);
    sprite.position.y = 0;
    sprite.position.z = 1.2;

    starSpriteCache = sprite;
    return sprite.clone();
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

        if (window.DashBlocksManager) {
            window.DashBlocksManager.resetTile(t, currentTileThickness / 2, tileLength);
        }

        if (t.userData) {
            t.userData.isMoving = false;
            t.userData.isExiting = false;
            t.userData.isEntering = false;
            t.userData.moveSpeed = 0;
            t.userData.moveTime = 0;
            t.userData.amplitude = 0;
            t.userData.baseX = 0;
            t.userData.moveType = null;
            t.userData.nudgeTimer = 0;
            t.userData.b = 0;
            t.userData.bounceY = 0;
            t.userData.springY = 0;
            t.userData.springVelocityY = 0;
            t.position.y = 0;
            t.userData.isDimmed = false;
            t.userData.isDashTile = false;
            t.userData.dashLength = 0;
            t.userData.dashStartTime = 0;
            t.userData.dashEndTime = 0;
            t.userData.startZ = 0;
            t.userData.endZ = 0;
        }
        t.scale.set(1, 1, 1);
        t.rotation.set(-Math.PI / 2, 0, 0);
        if (t.userData && t.userData.themeColor === 0xff00ff) {
            t.material = window.globalTileMatMagenta;
        } else {
            t.material = window.globalTileMatCyan;
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

    if (!forceNew && tilePool.length > 0) {
        tile = tilePool.pop();
        // Xóa các label cũ nếu có
        for (let i = tile.children.length - 1; i >= 0; i--) {
            if (tile.children[i].type === "Sprite") {
                const sprite = tile.children[i];
                tile.remove(sprite);
                // Không dispose() sprite vì chúng đã được cache và tái sử dụng
            }
        }
        // Xóa các thuộc tính game-state tạm thời của userData để tránh lỗi tái sử dụng (vd: isFinalStarTile) (Zero-Allocation)
        const u = tile.userData;
        u.isFinalStarTile = false;
        u.isRoundStart = false;
        u.isDelayedAppearance = false;
        u.isEntering = false;
        u.isExiting = false;
        u.isMoving = false;
        u.springY = 0;
        u.springVelocityY = 0;
        u.b = 0;
        u.bounceY = 0;
        u.bounceIntensity = 1.0;
        u.baseY = 0;
        u.originShifted = false;
        u.centerMeshFade = false;
        u.isDimmed = false;
        u.scale = 1.0;
        if (window.DashBlocksManager) {
            window.DashBlocksManager.resetTile(tile, currentTileThickness / 2, tileLength);
        } else {
            tile.scale.set(1, 1, 1);
            tile.rotation.set(-Math.PI / 2, 0, 0);
            u.isDashTile = false;
            u.dashLength = 0;
            u.dashStartTime = 0;
            u.dashEndTime = 0;
            u.startZ = 0;
            u.endZ = 0;
        }
    } else {
        const detailScale = typeof tileDetailScale !== 'undefined' ? tileDetailScale : 1.0;

        if (!cachedTileGeo) {
            const tileShape = createRoundedRectShape(tileWidth, tileLength, 0.8);
            let baseCurve = 12;
            if (currentGraphicsQuality === 'simple') baseCurve = 1;
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

        if (!window.globalTileMatCyan) {
            window.globalTileMatCyan = (currentGraphicsQuality === 'simple'
                ? new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.6, depthWrite: false, color: 0x00ffff })
                : new THREE.MeshPhongMaterial({ transparent: true, opacity: 0.45, shininess: 120, depthWrite: false, color: 0x00ffff, emissive: 0x001122 }));
        }
        if (!window.globalTileMatMagenta) {
            window.globalTileMatMagenta = window.globalTileMatCyan.clone();
            window.globalTileMatMagenta.color.setHex(0xff00ff);
            if (window.globalTileMatMagenta.emissive) window.globalTileMatMagenta.emissive.setHex(0x220022);
        }
        if (window.DashBlocksManager) {
            window.DashBlocksManager.initMaterials(currentGraphicsQuality);
            if (typeof window.DashBlocksManager.prewarmGeometries === 'function') {
                window.DashBlocksManager.prewarmGeometries(tileWidth, tileLength, currentGraphicsQuality, detailScale);
            }
        }
        if (!window.globalTileDimmedMatCyan) {
            window.globalTileDimmedMatCyan = window.globalTileMatCyan.clone();
            window.globalTileDimmedMatCyan.opacity = 0.08;
        }
        if (!window.globalTileDimmedMatMagenta) {
            window.globalTileDimmedMatMagenta = window.globalTileMatMagenta.clone();
            window.globalTileDimmedMatMagenta.opacity = 0.08;
        }

        tile = new THREE.Mesh(cachedTileGeo, window.globalTileMatCyan);
        tile.rotation.x = -Math.PI / 2;

        if (!tile.userData) tile.userData = {};

        const surfaceZ = currentTileThickness / 2;

        // Tạo viền
        if (!cachedBorderGeo) {
            const borderThickness = 0.25;
            const shape = createRoundedRectShape(tileWidth + borderThickness, tileLength + borderThickness, 0.8 + borderThickness / 2);
            const hole = createRoundedRectShape(tileWidth - borderThickness, tileLength - borderThickness, Math.max(0, 0.8 - borderThickness / 2));
            shape.holes.push(hole);
            let baseCurve = currentGraphicsQuality === 'simple' ? 1 : (currentGraphicsQuality === 'hd' ? 6 : (currentGraphicsQuality === 'fhd' ? 12 : (currentGraphicsQuality === 'qhd' ? 18 : 24)));
            cachedBorderGeo = new THREE.ShapeGeometry(shape, Math.max(1, Math.round(baseCurve * detailScale)));
        }
        if (!window.globalBorderMatCyan) {
            window.globalBorderMatCyan = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
        }
        if (!window.globalBorderMatMagenta) {
            window.globalBorderMatMagenta = new THREE.MeshBasicMaterial({ color: 0xff00ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
        }
        const borderLine = new THREE.Mesh(cachedBorderGeo, window.globalBorderMatCyan);
        borderLine.name = "borderLine";
        borderLine.position.z = surfaceZ + 0.01;
        borderLine.matrixAutoUpdate = false;
        borderLine.updateMatrix();
        tile.add(borderLine);
        tile.userData.borderLine = borderLine;

        if (!cachedCenterGeo) {
            const centerSegments = Math.max(8, Math.round(32 * detailScale));
            cachedCenterGeo = new THREE.CircleGeometry(tileWidth * 0.18, centerSegments);
        }
        if (!window.globalCenterMat) {
            window.globalCenterMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, depthWrite: false, transparent: true });
        }
        // centerMesh needs its own cloned material because its opacity is tweened independently on hit
        const centerMesh = new THREE.Mesh(cachedCenterGeo, window.globalCenterMat.clone());
        centerMesh.name = "centerMesh";
        centerMesh.position.z = surfaceZ + 0.015;
        centerMesh.matrixAutoUpdate = false;
        centerMesh.updateMatrix();
        tile.add(centerMesh);
        tile.userData.centerMesh = centerMesh;

        // Tạo glow base (skirt phản chiếu)
        initGlowMaterials();
        const glowHeight = getCurrentGlowHeight();
        if (!cachedGlowGeo) {
            const tileShape = createRoundedRectShape(tileWidth, tileLength, 0.8);
            let baseCurve = currentGraphicsQuality === 'simple' ? 1 : (currentGraphicsQuality === 'hd' ? 6 : (currentGraphicsQuality === 'fhd' ? 12 : (currentGraphicsQuality === 'qhd' ? 18 : 24)));
            const glowExtrudeSettings = {
                depth: glowHeight,
                bevelEnabled: false,
                curveSegments: Math.max(1, Math.round(baseCurve * detailScale))
            };
            cachedGlowGeo = new THREE.ExtrudeGeometry(tileShape, glowExtrudeSettings);
            cachedGlowGeo.center();
        }
        if (!window.globalTileGlowMatCyan) {
            window.globalTileGlowMatCyan = createTileGlowMaterial(0x00ffff);
        }
        if (!window.globalTileGlowMatMagenta) {
            window.globalTileGlowMatMagenta = createTileGlowMaterial(0xff00ff);
        }
        if (!window.globalTileGlowMatDash) {
            window.globalTileGlowMatDash = createTileGlowMaterial(0xffaa00);
        }
        const glowMesh = new THREE.Mesh(cachedGlowGeo, [capMaterial, window.globalTileGlowMatCyan]);
        glowMesh.name = "glowMesh";
        const bevelOffset = (typeof currentBevelEnabled !== 'undefined' && currentBevelEnabled) ? currentBevelThickness : 0;
        glowMesh.position.z = -currentTileThickness / 2 - bevelOffset - glowHeight / 2;
        glowMesh.visible = isGlowEnabled();
        glowMesh.matrixAutoUpdate = false;
        glowMesh.updateMatrix();
        tile.add(glowMesh);
        tile.userData.glowMesh = glowMesh;

        // Tạo hitbox cho gạch (Tối ưu GPU: Chỉ khởi tạo khi Debug Hitbox được kích hoạt để loại bỏ 2 sub-mesh rỗng)
        if (typeof showHitboxEnabled !== 'undefined' && showHitboxEnabled) {
            const hitboxMesh = createHitboxMesh();
            hitboxMesh.position.set(0, 0, surfaceZ);
            hitboxMesh.visible = true;
            tile.add(hitboxMesh);
            tile.userData.hitboxMesh = hitboxMesh;
        } else {
            tile.userData.hitboxMesh = null;
        }

        scene.add(tile);
    }

    // Reset trạng thái cơ bản
    tile.visible = true;
    tile.scale.set(1, 1, 1);
    tile.rotation.set(-Math.PI / 2, 0, 0);
    const surfaceZ = currentTileThickness / 2;
    if (tile.userData) {
        if (window.DashBlocksManager && tile.userData.isDashTile) {
            window.DashBlocksManager.resetTile(tile, surfaceZ, typeof tileLength !== 'undefined' ? tileLength : 4.0);
        }
        // Reset centerMesh
        if (tile.userData.centerMesh) {
            tile.userData.centerMesh.visible = true;
            tile.userData.centerMesh.position.set(0, 0, surfaceZ + 0.015);
            tile.userData.centerMesh.scale.set(1, 1, 1);
            tile.userData.centerMesh.updateMatrix();
            if (tile.userData.centerMesh.material) tile.userData.centerMesh.material.opacity = 0.0;
            tile.userData.centerMeshFade = false;
        }
        // Reset borderLine opacity
        if (tile.userData.borderLine && tile.userData.borderLine.material) {
            tile.userData.borderLine.material.opacity = 1.0;
        }
        // Reset isDimmed and material
        tile.userData.isDimmed = false;
        tile.material = (tile.userData.themeColor === 0xff00ff) ? window.globalTileMatMagenta : window.globalTileMatCyan;
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

// Trạng thái điều hướng cho chuỗi beat dồn dập (Lệch cố định & So-le) trong Hard Mode & Asian Mode
let rapidBurstState = {
    lastDir: 0,
    lastBeatIndex: -1
};

function getBeatStartTime(item) {
    return Array.isArray(item) ? item[0] : (item || 0);
}
function getBeatEndTime(item) {
    return Array.isArray(item) ? item[1] : (item || 0);
}
function isDashBeat(item) {
    return Array.isArray(item) && item.length >= 2;
}

// --- SINH GẠCH (SPAWN TILE) ---
function spawnTile(isFirst = false) {
    let tileZ, tileX, startZ = 0;
    let isRoundStartBlock = false;
    let isTooClose = false;
    let timeDiff = 1.0;
    let nextTimeDiff = 1.0;
    let prevX = 0;
    let isDash = false;
    let dashInfo = null;

    if (isFirst) {
        tileX = 0;
        currentBeatIndex = 1;
        transitionStep = 0;
        lastTileWasDelayed = false;
        rapidBurstState.lastDir = 0;
        rapidBurstState.lastBeatIndex = -1;

        const firstItem = (beatmapBeats && beatmapBeats.length > 0) ? beatmapBeats[0] : 0;
        if (window.DashBlocksManager && window.DashBlocksManager.isDashBeat(firstItem)) {
            isDash = true;
            dashInfo = window.DashBlocksManager.getDashTimes(firstItem);
            currStartTime = dashInfo.startTime;
            currEndTime = dashInfo.endTime;
            const zCalc = window.DashBlocksManager.calculateDashZ(0, dashInfo.duration, baseBallVelocityZ, 0, 0);
            dashInfo.dashLength = zCalc.dashLength;
            dashInfo.startZ = zCalc.startZ;
            dashInfo.exitZ = zCalc.exitZ;
            dashInfo.startX = 0;
            dashInfo.exitX = 0;
            dashInfo.deltaX = 0;
            dashInfo.angleZ = 0;
            tileZ = zCalc.tileZ;
            lastTileZ = zCalc.nextTileReferenceZ;
        } else {
            currStartTime = getBeatStartTime(firstItem);
            currEndTime = currStartTime;
            tileZ = 0;
            lastTileZ = 0;
        }
    } else {
        const prevTile = tiles[tiles.length - 1];
        prevX = prevTile ? (prevTile.userData && prevTile.userData.exitX !== undefined ? prevTile.userData.exitX : prevTile.position.x) : 0;

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

        const prevItem = beatmapBeats[Math.max(0, currentBeatIndex - 1)];
        const prevEndTime = getBeatEndTime(prevItem);

        let currentItem = 0;
        if (currentBeatIndex === 0) {
            timeDiff = 2.0;
            currentBeatIndex = 1;
            tileX = prevX;
            currentItem = beatmapBeats[0];
        } else if (currentBeatIndex === 1) {
            currentItem = beatmapBeats[1];
            timeDiff = getBeatStartTime(currentItem) - prevEndTime;
            if (timeDiff < 0.1) timeDiff = Math.max(0.3, timeDiff);
            currentBeatIndex = 2;
        } else {
            currentItem = beatmapBeats[currentBeatIndex];
            timeDiff = getBeatStartTime(currentItem) - prevEndTime;
            currentBeatIndex++;
        }

        if (window.DashBlocksManager && window.DashBlocksManager.isDashBeat(currentItem)) {
            isDash = true;
            dashInfo = window.DashBlocksManager.getDashTimes(currentItem);
            currStartTime = dashInfo.startTime;
            currEndTime = dashInfo.endTime;
        } else {
            currStartTime = getBeatStartTime(currentItem);
            currEndTime = getBeatEndTime(currentItem);
        }

        if (currentBeatIndex < beatmapBeats.length && currentBeatIndex > 0) {
            const nextItem = beatmapBeats[currentBeatIndex];
            nextTimeDiff = getBeatStartTime(nextItem) - currEndTime;
        }

        startZ = lastTileZ - (timeDiff * Math.abs(baseBallVelocityZ));
        tileZ = startZ;
        lastTileZ = tileZ;
    }

    // Giai đoạn khởi động: 16 block đầu của lượt đầu tiên (dựa trên currentBeatIndex & roundCount)
    const isInitial16Blocks = roundCount === 0 && currentBeatIndex <= 16;
    const isFirst3Blocks = roundCount === 0 && currentBeatIndex <= 3;
    const isInitialWarmup = isInitial16Blocks;

    if (!isFirst) {
        // --- LOGIC TRÁNH IMPOSSIBLE JUMP & 16 BLOCK ĐẦU ---
        if (timeDiff < 0.08) isTooClose = true;
        let maxDeltaX = timeDiff * 18;

        const isHardMode = typeof window.HardModeManager !== 'undefined' && window.HardModeManager.isEnabled;
        const isAsianMode = typeof window.AsianModeManager !== 'undefined' && window.AsianModeManager.isEnabled;
        let fixedDeltaX = null;
        // FIX: "block" = bề rộng 1 tile (tileWidth), không phải 1.0 đơn vị thế giới.
        // Trước đây 1/4, 1/2, 1 block bị gán 0.25 / 0.5 / 1.0 đơn vị (chỉ ~6%, 12%, 23% bề rộng tile)
        // nên gần như không thấy lệch -> Hard/Asian không "ăn".
        const blockW = (typeof tileWidth !== 'undefined') ? tileWidth : 4.3;

        // Độ khó (ưu tiên giống game.js: Easy > Asian > Hard > Normal). Relax xử lý như Easy.
        const isEasyDiff = (typeof window.EasyModeManager !== 'undefined' && window.EasyModeManager.isEnabled) || (window.chosenPlayMode === 'relax');
        const isNormalDiff = !isEasyDiff && !isHardMode && !isAsianMode;

        let forceStraight = false;

        if (!isInitial16Blocks && isEasyDiff) {
            // Bảng Easy (block = tileWidth), so với vị trí block trước
            //  < 0.15 thẳng | 0.15-<0.25 1/8 | 0.25-<0.5 1/4 | 0.5-<1.0 1/2 | >= 1.0 logic bình thường
            if (timeDiff < 0.15) {
                forceStraight = true;
            } else if (timeDiff < 0.25) {
                fixedDeltaX = 0.125 * blockW;
            } else if (timeDiff < 0.5) {
                fixedDeltaX = 0.25 * blockW;
            } else if (timeDiff < 1.0) {
                fixedDeltaX = 0.5 * blockW;
            }
        }

        if (!isInitial16Blocks && !isEasyDiff) {
            // Bảng lệch cố định (đơn vị: block = tileWidth), so với vị trí block trước
            //  timeDiff        Normal   Hard    Asian
            //  < 0.08          thẳng    1/4     1/2
            //  0.08 - <0.15    1/4      1/2     1
            //  0.15 - <0.25    1/2      1       1
            //  0.25 - <0.30    1        thường  giữ logic Asian slot
            //  >= 0.30         thường   thường  thường
            if (timeDiff < 0.08) {
                if (isAsianMode) fixedDeltaX = 0.5 * blockW;
                else if (isHardMode) fixedDeltaX = 0.25 * blockW;
                // Normal: thẳng hàng -> xử lý bên dưới qua isTooClose (maxDeltaX = 0)
            } else if (timeDiff < 0.15) {
                if (isAsianMode) fixedDeltaX = 1.0 * blockW;
                else if (isHardMode) fixedDeltaX = 0.5 * blockW;
                else if (isNormalDiff) fixedDeltaX = 0.25 * blockW;
            } else if (timeDiff < 0.25) {
                if (isAsianMode || isHardMode) fixedDeltaX = 1.0 * blockW;
                else if (isNormalDiff) fixedDeltaX = 0.5 * blockW;
            } else if (timeDiff < 0.30) {
                if (isNormalDiff) fixedDeltaX = 1.0 * blockW;
                // Hard: logic bình thường; Asian: giữ logic Asian slot (xử lý ở nhánh random bên dưới)
            }
        }

        if (fixedDeltaX !== null) {
            // Bỏ qua gán maxDeltaX vì dùng độ lệch cố định
        } else if (isTooClose || forceStraight) {
            maxDeltaX = 0;
        } else if (isFirst3Blocks) {
            // 3 block đầu tiên luôn luôn thẳng hàng (maxDeltaX = 0)
            maxDeltaX = 0;
        } else if (isInitial16Blocks) {
            // 13 block còn lại trong 16 block đầu: nếu nhịp beat gần (<0.3s) thì thẳng hàng, ngược lại lệch tối đa 0.8 block
            if (timeDiff < 0.3) {
                maxDeltaX = 0; // Beat gần → ưu tiên thẳng hàng
            } else {
                maxDeltaX = 0.8 * (typeof tileWidth !== 'undefined' ? tileWidth : 4.0);
            }
        } else if (timeDiff < 0.15) {
            maxDeltaX = 0.25;
        } else {
            maxDeltaX = Math.max(1.5, Math.min(6, maxDeltaX));
        }

        if (typeof window.EasyModeManager !== 'undefined' && window.EasyModeManager.isEnabled && !isInitial16Blocks && fixedDeltaX === null && !forceStraight) {
            maxDeltaX = window.EasyModeManager.calculateMaxDeltaX(timeDiff, maxDeltaX);
        }

        if (!isRoundStartBlock) {
            if (fixedDeltaX !== null) {
                // Biên làn là ±4.5 (khớp clamp bên dưới); với offset 1 block (4.3) biên 4.2 cũ sẽ loại gần hết vị trí
                const canPlus = (prevX + fixedDeltaX <= 4.5 + 1e-6);
                const canMinus = (prevX - fixedDeltaX >= -4.5 - 1e-6);

                let dir = 0;
                if (canPlus && !canMinus) {
                    dir = 1; // Ở sát biên trái -> bắt buộc sang phải
                } else if (!canPlus && canMinus) {
                    dir = -1; // Ở sát biên phải -> bắt buộc sang trái
                } else if (canPlus && canMinus) {
                    // Ở giữa (có thể đi cả 2 bên):
                    // Ưu tiên so-le (75% đảo hướng so với nhịp trước) và 25% tiếp tục hướng để di chuyển mượt mà qua các làn
                    if (rapidBurstState.lastDir === 1) {
                        dir = (Math.random() < 0.75) ? -1 : 1;
                    } else if (rapidBurstState.lastDir === -1) {
                        dir = (Math.random() < 0.75) ? 1 : -1;
                    } else {
                        dir = (prevX > 0.5) ? -1 : ((prevX < -0.5) ? 1 : (Math.random() < 0.5 ? 1 : -1));
                    }
                } else {
                    dir = (prevX >= 0) ? -1 : 1;
                }

                rapidBurstState.lastDir = dir;
                rapidBurstState.lastBeatIndex = currentBeatIndex;

                // LỆCH CỐ ĐỊNH: đúng bằng fixedDeltaX so với vị trí block trước (prevX)
                tileX = prevX + dir * fixedDeltaX;
                tileX = Math.max(-4.5, Math.min(4.5, tileX));
            } else {
                rapidBurstState.lastDir = 0;
                if (maxDeltaX === 0) {
                    tileX = prevX;
                } else {
                    const isAsianMode = typeof window.AsianModeManager !== 'undefined' && window.AsianModeManager.isEnabled;
                    const willSpawnFake = typeof window.FakeBlocksManager !== 'undefined' && window.FakeBlocksManager.willSpawnFakeForNextTile(isFirst, timeDiff, isTooClose, nextTimeDiff);
                    // Asian Mode: Chỉ khoảng 0.25s - <0.30s mới giữ nguyên logic Asian slot cũ (slot >= 4.0: [-4.5, 0, 4.5])
                    // Còn >= 0.30s dùng logic khoảng cách bình thường như Hard Mode!
                    const isNoFakeInAsianMode = isAsianMode && !willSpawnFake && !isInitial16Blocks && (timeDiff >= 0.25 && timeDiff < 0.30);

                    if (isNoFakeInAsianMode) {
                        // Asian Mode (No Fake State): Ngoại trừ vùng thẳng hàng (maxDeltaX === 0),
                        // các khối còn lại luôn luôn cách vị trí cũ ít nhất 1 block (khoảng cách slot >= 4.0)
                        const slots = [-4.5, 0, 4.5];
                        const minBlockDistance = 4.0;
                        const candidates = [];
                        for (let i = 0; i < 3; i++) {
                            if (Math.abs(slots[i] - prevX) >= minBlockDistance) {
                                candidates.push(slots[i]);
                            }
                        }

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
    }

    if (isDash && window.DashBlocksManager && !isFirst) {
        let deltaX = 0;
        const isEasy = (typeof window.EasyModeManager !== 'undefined' && window.EasyModeManager.isEnabled) || (window.chosenPlayMode === 'relax');
        const isHard = (typeof window.HardModeManager !== 'undefined' && window.HardModeManager.isEnabled);
        const isAsian = (typeof window.AsianModeManager !== 'undefined' && window.AsianModeManager.isEnabled);
        const isNormal = (window.chosenPlayMode === 'normal' || window.chosenPlayMode === 'endless') && !isEasy;

        if (!isEasy && (isNormal || isHard || isAsian)) {
            const diagonalChance = isAsian ? 0.75 : (isHard ? 0.65 : 0.50);
            if (Math.random() < diagonalChance) {
                const maxSlant = isAsian ? 3.5 : (isHard ? 3.0 : 2.5);
                const minSlant = 1.5;
                let preferredDir = 0;
                if (tileX > 1.2) preferredDir = -1;
                else if (tileX < -1.2) preferredDir = 1;
                else preferredDir = Math.random() < 0.5 ? 1 : -1;

                const slantDist = minSlant + Math.random() * (maxSlant - minSlant);
                let candidateExitX = tileX + preferredDir * slantDist;
                candidateExitX = Math.max(-3.8, Math.min(3.8, candidateExitX));
                deltaX = candidateExitX - tileX;

                // Giới hạn góc chéo tối đa 45° so với trục Z: |deltaX| <= baseLength * tan(45°).
                // baseLength = duration * |v| (hình chiếu Z) nên timebeat không đổi, chỉ dash ngắn bị chéo nhẹ hơn.
                const MAX_DASH_ANGLE_DEG = 45;
                const dashBaseLen = dashInfo.duration * Math.abs(baseBallVelocityZ);
                const maxDeltaByAngle = dashBaseLen * Math.tan(MAX_DASH_ANGLE_DEG * Math.PI / 180);
                if (Math.abs(deltaX) > maxDeltaByAngle) {
                    deltaX = Math.sign(deltaX) * maxDeltaByAngle;
                }

                if (Math.abs(deltaX) < 1.0) deltaX = 0;
            }
        }

        const zCalc = window.DashBlocksManager.calculateDashZ(startZ, dashInfo.duration, baseBallVelocityZ, tileX, deltaX);
        dashInfo.dashLength = zCalc.dashLength;
        dashInfo.startZ = zCalc.startZ;
        dashInfo.exitZ = zCalc.exitZ;
        dashInfo.startX = zCalc.startX;
        dashInfo.exitX = zCalc.exitX;
        dashInfo.deltaX = zCalc.deltaX;
        dashInfo.angleZ = zCalc.angleZ;
        tileX = zCalc.tileX;
        tileZ = zCalc.tileZ;
        lastTileZ = zCalc.nextTileReferenceZ;

        // FIX: dash xiên đã dịch chuyển X từ entry -> exit, nhớ hướng này để chuỗi so-le phía sau
        // không bị reset/lệch pha (trước đây lastDir chỉ nhớ hướng vào dash).
        if (Math.abs(zCalc.deltaX || 0) > 0.01) {
            rapidBurstState.lastDir = zCalc.deltaX > 0 ? 1 : -1;
        }
    }

    let activeColor = isDash
        ? (dynamicColorsEnabled && typeof currentFrameHex !== 'undefined' ? currentFrameHex : 0xffaa00)
        : (dynamicColorsEnabled ? (Math.random() > 0.4 ? 0xff00ff : 0x00ffff) : 0x00ffff);

    const tile = getTileFromPool();
    const finalScale = currentTileScale;
    const surfaceZ = currentTileThickness / 2;

    if (isDash && window.DashBlocksManager) {
        const detailScale = typeof tileDetailScale !== 'undefined' ? tileDetailScale : 1.0;
        window.DashBlocksManager.setupDashTile(tile, dashInfo, finalScale, surfaceZ, tileWidth, tileLength, ballRadius, currentGraphicsQuality, detailScale);
    } else {
        tile.scale.set(finalScale, finalScale, 1);

        if (tile.userData.hitboxMesh) {
            const hitboxMesh = tile.userData.hitboxMesh;
            if (hitboxMesh) {
                const scaleX = tileWidth + (ballRadius * 2.5 / finalScale);
                const scaleY = tileLength + (ballRadius * 1.64 / finalScale);
                hitboxMesh.scale.set(scaleX, scaleY, 0.4);
            }
        }

        tile.userData.themeColor = activeColor;
        tile.material = (activeColor === 0xff00ff) ? window.globalTileMatMagenta : window.globalTileMatCyan;

        if (tile.userData.borderLine) {
            tile.userData.borderLine.material = (activeColor === 0xff00ff) ? window.globalBorderMatMagenta : window.globalBorderMatCyan;
        }

        const poolGlowMesh = (tile.userData && tile.userData.glowMesh) ? tile.userData.glowMesh : (tile.userData.glowMesh = tile.getObjectByName('glowMesh'));
        if (poolGlowMesh && Array.isArray(poolGlowMesh.material)) {
            poolGlowMesh.material[1] = (activeColor === 0xff00ff) ? window.globalTileGlowMatMagenta : window.globalTileGlowMatCyan;
        }
    }
    tile.position.set(tileX, 0, tileZ);

    let isEntering = !isFirst && !isDash && spawnAnimationMode !== 'none';
    if (isEntering && spawnAnimationMode === 'mix') {
        // Khoảng cách block gần (timing block gần < 0.25s) sẽ dùng instant (không slide)
        if (timeDiff < 0.25) {
            isEntering = false;
        }
    }

    // Điều kiện xuất hiện trễ (Dash Tiles luôn hiển thị trước, không xuất hiện trễ)
    const isNextGapLong = nextTimeDiff > 1.0;
    const isDelayedAppearance = !isFirst &&
        !isDash &&
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
    ud.b = 0;
    ud.bounceY = 0;
    ud.bounceIntensity = 1.0;
    ud.baseY = 0;
    ud.isDashTile = isDash;
    ud.dashLength = isDash ? dashInfo.dashLength : 0;
    ud.dashStartTime = isDash ? dashInfo.startTime : currStartTime;
    ud.dashEndTime = isDash ? dashInfo.endTime : currEndTime;
    ud.startZ = isDash ? dashInfo.startZ : tileZ;
    ud.endZ = isDash ? dashInfo.exitZ : tileZ;
    // FIX: luôn ghi đè startX/exitX cho mọi tile. Trước đây chỉ tile dash mới có exitX,
    // tile thường lấy từ pool vẫn giữ exitX cũ của dash -> prevX của beat kế tiếp sai,
    // làm vỡ "lệch cố định" theo bảng Hard/Asian.
    ud.autoNoise = undefined; // tile lấy từ pool không giữ noise của Natural Autoplay lần trước
    if (isDash && dashInfo) {
        ud.startX = (dashInfo.startX !== undefined) ? dashInfo.startX : tileX;
        ud.exitX = (dashInfo.exitX !== undefined) ? dashInfo.exitX : tileX;
    } else {
        ud.startX = tileX;
        ud.exitX = tileX;
    }

    // TÍCH HỢP LOGIC KHỐI DI CHUYỂN MỚI
    if (typeof window.MovingBlocksManager !== 'undefined') {
        let threshold = 0.2;
        if (typeof window.EasyModeManager !== 'undefined' && window.EasyModeManager.isEnabled) {
            threshold = window.EasyModeManager.getMovingBlockThreshold();
        } else if (typeof window.AsianModeManager !== 'undefined' && window.AsianModeManager.isEnabled) {
            threshold = window.AsianModeManager.getMovingBlockThreshold();
        } else if (typeof window.HardModeManager !== 'undefined' && window.HardModeManager.isEnabled) {
            threshold = window.HardModeManager.getMovingBlockThreshold();
        }
        let canBeMoving = isEndlessMode && !isInitialWarmup && !isTooClose && (timeDiff >= threshold) && (nextTimeDiff >= threshold);
        if (isDash && dashInfo && Math.abs(dashInfo.deltaX || 0) > 0.01) {
            canBeMoving = false;
        }
        window.MovingBlocksManager.processTile(tile, canBeMoving, roundCount, timeDiff);
        if (isDash && window.DashBlocksManager) {
            window.DashBlocksManager.enforceOrientation(tile);
        }
    }

    const glowMesh = (tile.userData && tile.userData.glowMesh) ? tile.userData.glowMesh : tile.getObjectByName("glowMesh");
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
    if (window.DEBUG_SPAWN && !isFirst) {
        console.log('[spawn]', 'beat#' + (currentBeatIndex - 1),
            'timeDiff=' + timeDiff.toFixed(3),
            'dash=' + isDash,
            'prevX=' + prevX.toFixed(2),
            'entryX=' + (ud.startX).toFixed(2),
            'entryOffset=' + Math.abs(ud.startX - prevX).toFixed(2),
            'exitX=' + (ud.exitX).toFixed(2));
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