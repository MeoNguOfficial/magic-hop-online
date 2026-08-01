// ============================================================
//  game.js — Game Engine Logic
//  Chứa: Three.js init, vật lý bóng, gạch, hiệu ứng, audio,
//         vòng lặp animate, game over/reset, pause/resume.
//  Phụ thuộc: global.js (DOM refs, config vars, playlist)
// ============================================================

// --- INDEXED DB LOGIC ---
const STORE_NAME = "highScores";

function initDB() {
    if (typeof getDB === 'function') {
        return getDB(); // Sử dụng chung connection từ cacheManager.js để tránh xung đột
    }
    return new Promise((resolve) => {
        const request = indexedDB.open("MagicHopDB", 2);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: "songIndex" });
            }
        };
        request.onsuccess = (e) => resolve(e.target.result);
    });
}

async function getLocalBestScore(songIndex) {
    const db = await initDB();
    return new Promise((resolve) => {
        const transaction = db.transaction(STORE_NAME, "readonly");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(songIndex);
        request.onsuccess = () => {
            if (request.result) {
                const isHard = window.HardModeManager && window.HardModeManager.isEnabled;
                const isAsian = window.AsianModeManager && window.AsianModeManager.isEnabled;

                // Nếu đang bật Hard Mode hoặc Asian Mode, lấy rageScore.
                if (isHard || isAsian) {
                    const val = request.result.rageScore;
                    if (val !== undefined && val !== null) {
                        if (typeof val === 'number') return resolve(val);
                        try {
                            const decoded = parseInt(atob(val));
                            return resolve(isNaN(decoded) ? parseInt(val) || 0 : decoded);
                        } catch (e) {
                            return resolve(parseInt(val) || 0);
                        }
                    }
                    return resolve(0);
                }

                // Default Mode & Easy Mode (dùng chung điểm của Default mode)
                if (request.result.score !== undefined) {
                    const val = request.result.score;
                    if (typeof val === 'number') {
                        resolve(val); // Hỗ trợ tương thích ngược với dữ liệu số cũ
                    } else {
                        try {
                            const decoded = parseInt(atob(val));
                            resolve(isNaN(decoded) ? parseInt(val) || 0 : decoded);
                        } catch (e) {
                            resolve(parseInt(val) || 0);
                        }
                    }
                } else {
                    resolve(0);
                }
            } else {
                resolve(0);
            }
        };
        request.onerror = () => resolve(0);
    });
}

async function getBestScore(songIndex) {
    const isHard = window.HardModeManager && window.HardModeManager.isEnabled;
    const isAsian = window.AsianModeManager && window.AsianModeManager.isEnabled;
    const isRageOrAsian = isHard || isAsian;

    let backendScore = null;

    // 1. Ưu tiên lấy điểm cao từ Backend Server nếu đã đăng nhập
    try {
        const token = localStorage.getItem('auth_token');
        if (token && window.ApiService && typeof window.ApiService.getScores === 'function') {
            const songList = (typeof activePlaylist !== 'undefined' && activePlaylist) || (typeof playlist !== 'undefined' && playlist) || (typeof songs !== 'undefined' && songs) || [];
            const targetSong = songList[songIndex];

            if (targetSong && (targetSong.id || targetSong.beatmap_id)) {
                const beatmapId = targetSong.id || targetSong.beatmap_id;
                const res = await window.ApiService.getScores({ beatmap_id: beatmapId, limit: 100 }).catch(() => null);
                const scoresData = res?.data?.data || res?.data || [];

                if (Array.isArray(scoresData) && scoresData.length > 0) {
                    let maxBackendScore = 0;
                    let foundBackend = false;

                    scoresData.forEach(item => {
                        const itemIsHard = item.is_hard_mode || item.hard_mode || item.is_rage_mode || item.rage_mode || item.mode === 'hard' || item.mode === 'rage';
                        const normalVal = (item.score !== undefined && item.score !== null) ? (parseInt(item.score, 10) || 0) : 0;
                        const hardVal = (item.hard_mode_score !== undefined && item.hard_mode_score !== null)
                            ? (parseInt(item.hard_mode_score, 10) || 0)
                            : ((item.rage_score !== undefined && item.rage_score !== null)
                                ? (parseInt(item.rage_score, 10) || 0)
                                : (itemIsHard ? normalVal : 0));

                        if (isRageOrAsian) {
                            const targetVal = hardVal > 0 ? hardVal : (itemIsHard ? normalVal : 0);
                            if (targetVal > 0) {
                                maxBackendScore = Math.max(maxBackendScore, targetVal);
                                foundBackend = true;
                            }
                        } else {
                            if (normalVal > 0 && !itemIsHard) {
                                maxBackendScore = Math.max(maxBackendScore, normalVal);
                                foundBackend = true;
                            } else if (normalVal > 0 && !item.hard_mode_score && !item.rage_score) {
                                maxBackendScore = Math.max(maxBackendScore, normalVal);
                                foundBackend = true;
                            }
                        }
                    });

                    if (foundBackend) {
                        backendScore = maxBackendScore;
                    }
                }
            }
        }
    } catch (err) {
        console.warn('[Score] Không thể kết nối Backend Server để lấy kỷ lục:', err);
    }

    // 2. Lấy kỷ lục dự phòng từ Local Storage (IndexedDB)
    const localScore = await getLocalBestScore(songIndex);

    // 3. Ưu tiên tuyệt đối điểm Backend nếu kết nối thành công
    if (backendScore !== null) {
        saveBestScore(songIndex, backendScore).catch(() => {});
        cachedBestScores[songIndex] = backendScore;
        return backendScore;
    }

    cachedBestScores[songIndex] = localScore;
    return localScore;
}

const cachedBestScores = {};
window.cachedBestScores = cachedBestScores;
window.getBestScore = getBestScore;

function renderBestScoreUI(songIndex) {
    if (!bestScoreLabel) return;

    const getLabelText = () => (typeof t === 'function' ? t('best_score') : 'Best:');
    let isBackendLoaded = false;
    let currentShownScore = -1;

    const setScoreText = (scoreVal) => {
        currentShownScore = scoreVal;
        bestScoreLabel.innerHTML = `${getLabelText()} ${scoreVal}`;
    };

    const setLoadingState = () => {
        bestScoreLabel.innerHTML = `<span class="inline-flex items-center justify-center gap-1.5 text-gray-400 font-bold"><svg class="w-3 h-3 animate-spin text-cyan-400" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> <span>${getLabelText()}</span> <span class="animate-pulse text-cyan-300">...</span></span>`;
    };

    const cachedScore = cachedBestScores[songIndex];
    if (cachedScore !== undefined && cachedScore !== null) {
        setScoreText(cachedScore);
    } else {
        setLoadingState();

        // Hiển thị tạm thời từ Local DB trong lúc đợi Backend
        getLocalBestScore(songIndex).then(locBest => {
            if (!isBackendLoaded && currentShownScore < 0) {
                setScoreText(locBest);
            }
        }).catch(() => {});
    }

    // Ưu tiên tuyệt đối điểm từ Backend Server
    getBestScore(songIndex).then(backendBest => {
        isBackendLoaded = true;
        if (backendBest !== null && backendBest !== undefined) {
            cachedBestScores[songIndex] = backendBest;
            setScoreText(backendBest);
        }
    }).catch(() => {
        if (currentShownScore < 0) {
            getLocalBestScore(songIndex).then(locBest => {
                setScoreText(locBest);
            }).catch(() => {
                setScoreText(0);
            });
        }
    });
}
window.renderBestScoreUI = renderBestScoreUI;

window.chosenPlayMode = 'normal';

async function saveBestScore(songIndex, score, isNormalModePassed = false) {
    // Kiểm tra chế độ hỗ trợ
    const isHelper = typeof isAnyHelperModeActive === 'function' ? isAnyHelperModeActive() : (
        ((typeof relaxModeEnabled !== 'undefined' && relaxModeEnabled) || localStorage.getItem('relaxModeEnabled') === 'true') ||
        ((typeof botAssistEnabled !== 'undefined' && botAssistEnabled) || localStorage.getItem('botAssistEnabled') === 'true') ||
        ((typeof isAutoplay !== 'undefined' && isAutoplay) || (typeof isNaturalAutoplay !== 'undefined' && isNaturalAutoplay))
    );

    // Nếu đang bật chế độ hỗ trợ VÀ KHÔNG PHẢI LÀ PASS BÀI -> Ngắt lệnh không lưu gì cả
    if (isHelper && !isNormalModePassed) {
        return false;
    }

    const db = await initDB();
    
    // Đọc kỷ lục cũ để giữ trạng thái đã có
    let oldRecord = null;
    try {
        const transaction = db.transaction(STORE_NAME, "readonly");
        const store = transaction.objectStore(STORE_NAME);
        const req = store.get(songIndex);
        oldRecord = await new Promise((resolve) => {
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => resolve(null);
        });
    } catch (e) {}

    const isEasy = window.EasyModeManager && window.EasyModeManager.isEnabled;
    const isRage = window.HardModeManager && window.HardModeManager.isEnabled;
    const isAsian = window.AsianModeManager && window.AsianModeManager.isEnabled;
    
    let updatedRecord = {
        songIndex,
        score: oldRecord && oldRecord.score !== undefined ? oldRecord.score : btoa("0"),
        rageScore: oldRecord && oldRecord.rageScore !== undefined ? oldRecord.rageScore : btoa("0"),
        isNormalModePassed: oldRecord && oldRecord.isNormalModePassed ? true : false,
        isRageModePassed: oldRecord && oldRecord.isRageModePassed ? true : false
    };

    if (isNormalModePassed) {
        if (isRage || isAsian) {
            updatedRecord.isRageModePassed = true;
        } else {
            updatedRecord.isNormalModePassed = true;
        }
    }

    // Chỉ cập nhật kỷ lục điểm số cao nhất (High Score) nếu KHÔNG BẬT chế độ hỗ trợ
    if (!isHelper) {
        if (isRage || isAsian) {
            let currentRage = 0;
            if (oldRecord && oldRecord.rageScore) {
                try { currentRage = parseInt(atob(oldRecord.rageScore)) || 0; } catch (e) {}
            }
            if (score > currentRage) {
                updatedRecord.rageScore = btoa(score.toString());
            }
        } else {
            let currentNormal = 0;
            if (oldRecord && oldRecord.score) {
                try { currentNormal = parseInt(atob(oldRecord.score)) || 0; } catch (e) {}
            }
            if (score > currentNormal) {
                updatedRecord.score = btoa(score.toString());
            }
        }
    }

    try {
        const transaction = db.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        store.put(updatedRecord);
        return true;
    } catch (e) {
        return false;
    }
}

// --- LÀM MỜ TILE SAU KHI BÓNG ĐÃ CHẠM ---
function dimLandedTile(tile) {
    if (!tile || !tile.userData || tile.userData.isDimmed) return;

    const rawApi = localStorage.getItem('graphicsAPI') || 'webgl';
    const isWebGPU = (rawApi === 'd2ViZ3B1' || rawApi === 'webgpu');

    // Chỉ áp dụng dim cho WebGPU API, WebGL giữ nguyên không thay đổi
    if (!isWebGPU) return;

    tile.userData.isDimmed = true;

    // Chỉ làm mờ phần nền body bên trong
    if (tile.material) {
        tile.material.opacity = 0.08;
    }

    // Làm mờ cả glowMesh dưới chân block
    const glowMesh = tile.getObjectByName('glowMesh');
    if (glowMesh) {
        const glowMat = Array.isArray(glowMesh.material) ? glowMesh.material[1] : glowMesh.material;
        if (glowMat) {
            if (glowMat.uniforms) {
                glowMat.uniforms.opacityMultiplier.value = 0.15;
            } else {
                glowMat.opacity = 0.08;
            }
        }
    }
}

// --- HIỆU ỨNG SÓNG XUNG KÍCH ---

function triggerShockwave(tile, themeColor, customOffsetScale = 1.0, tileScale = 1.0) {
    if (!shockwavesEnabled || !tile) return;

    const spawnRing = (scaleMultiplier) => {
        let waveLine;
        if (shockwavePool.length > 0) {
            waveLine = shockwavePool.pop();
            waveLine.visible = true;
            waveLine.material.color.setHex(themeColor);
            waveLine.material.opacity = 1.0;
        } else {
            if (!cachedShockwaveGeo) {
                // Tạo hình vành khăn dẹt có độ dày 0.18 cho sóng dày dặn
                const borderThickness = 0.18;
                const waveShape = createRoundedRectShape(tileWidth + borderThickness, tileLength + borderThickness, 0.9);
                const waveHole = createRoundedRectShape(tileWidth - borderThickness, tileLength - borderThickness, Math.max(0, 0.9 - borderThickness));
                waveShape.holes.push(waveHole);

                const detailScale = typeof tileDetailScale !== 'undefined' ? tileDetailScale : 1.0;
                let baseCurve = 12;
                if (currentGraphicsQuality === 'simple') baseCurve = 2;
                else if (currentGraphicsQuality === 'hd') baseCurve = 6;
                else if (currentGraphicsQuality === 'fhd') baseCurve = 12;
                else if (currentGraphicsQuality === 'qhd') baseCurve = 18;
                else if (currentGraphicsQuality === 'uhd') baseCurve = 24;
                
                const curveSegments = Math.max(1, Math.round(baseCurve * detailScale));
                cachedShockwaveGeo = new THREE.ShapeGeometry(waveShape, curveSegments);
            }

            const waveMat = new THREE.MeshBasicMaterial({
                color: themeColor,
                transparent: true,
                opacity: 1.0,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                side: THREE.DoubleSide
            });
            waveLine = new THREE.Mesh(cachedShockwaveGeo, waveMat);
            scene.add(waveLine);
        }

        waveLine.position.copy(tile.position);
        waveLine.position.y = surfaceY + 0.03;
        waveLine.rotation.x = -Math.PI / 2;
        waveLine.scale.set(tileScale * scaleMultiplier, tileScale * scaleMultiplier, 1);
        
        const baseScale = tileScale * scaleMultiplier;
        shockwaves.push({
            mesh: waveLine,
            targetTile: tile, // Lưu tham chiếu để dịch chuyển theo tile
            scale: baseScale,
            startScale: baseScale,
            opacity: 1.0,
            speed: 4.5 * customOffsetScale,
            maxScale: 2.5 * customOffsetScale * baseScale
        });
    };

    // Primary shockwave
    spawnRing(1.0);

    // Double shockwave (shockwave kép) from combo 6 onwards
    if (comboCount >= 6) {
        setTimeout(() => {
            if (isPlaying && scene && shockwavesEnabled) {
                spawnRing(0.85); // concentric second ring inside the first
            }
        }, 100);
    }

    // --- SINH CÁC ĐƯỜNG SÁNG CHẠY THEO BIÊN THEO NHỊP BEAT (NEON BOUNDARY PULSES) ---
    if (typeof showBoundariesEnabled !== 'undefined' && showBoundariesEnabled) {
        if (!pulseGeometry) pulseGeometry = new THREE.BoxGeometry(0.20, 0.05, 12);
        if (!pulseMaterialTemplate) {
            pulseMaterialTemplate = new THREE.MeshBasicMaterial({
                color: 0x00ffff,
                transparent: true,
                opacity: 0.85,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });
        }
        
        let beatDistance = Math.abs(baseBallVelocityZ) * 1.0;
        if (tiles && tiles.length > 0) {
            const currentTileIdx = tiles.findIndex(t => Math.abs(t.position.z - tile.position.z) < 0.1);
            if (currentTileIdx !== -1 && currentTileIdx + 1 < tiles.length) {
                // Đường chạy tối đa của pulse dựa trên block xa nhất hiện có phía trước
                const furthestTile = tiles[tiles.length - 1];
                beatDistance = Math.abs(tile.position.z - furthestTile.position.z);
            }
        }
        beatDistance = Math.max(1.0, beatDistance);

        const spawnPulse = (x, z, maxDist) => {
            let mesh;
            if (boundaryPulsePool.length > 0) {
                mesh = boundaryPulsePool.pop();
            } else {
                const mat = pulseMaterialTemplate.clone();
                mesh = new THREE.Mesh(pulseGeometry, mat);
            }
            
            if (dynamicColorsEnabled) {
                mesh.material.color.setHex(themeColor);
            } else {
                mesh.material.color.setHex(0x00ffff);
            }
            mesh.material.opacity = 0.85;
            
            mesh.position.set(x, (typeof surfaceY !== 'undefined' ? surfaceY : 0.2) + 0.01, z);
            scene.add(mesh);
            boundaryPulses.push({
                mesh: mesh,
                speed: baseBallVelocityZ * 2.8, // Run forward in negative Z direction
                startZ: z,
                maxDistance: maxDist,
                opacity: 0.85
            });
        };
        
        spawnPulse(-6.75, tile.position.z, beatDistance);
        spawnPulse(6.75, tile.position.z, beatDistance);
    }
}

// Replaced/Removed perfect ring
function triggerPerfectRing(position) {}

function initBallTrail() {
    if (ballTrailSegments.length > 0) {
        for (let i = ballTrailSegments.length - 1; i >= 0; i--) {
            const segment = ballTrailSegments[i];
            scene.remove(segment.mesh);
            trailPool.push(segment.mesh);
        }
        ballTrailSegments = [];
    }
}

// --- TÍNH TOÁN QUỸ ĐẠO PARABOL (TỰ ĐỘNG ĐỒNG BỘ CHUẨN BEAT KHI TILE PHÓNG TO / THU NHỎ / RESCUE) ---
function calculateNextParabola(currentTargetIndex) {
    const currentTile = tiles[currentTargetIndex];
    const nextTile = tiles[currentTargetIndex + 1];
    if (!currentTile || !nextTile) return;

    const currentTileEffectiveZ = currentTile.userData.isEntering && (spawnAnimationMode === 'slide' || spawnAnimationMode === 'mix') ? currentTile.userData.targetZ : currentTile.position.z;
    const nextTileEffectiveZ = nextTile.userData.isEntering && (spawnAnimationMode === 'slide' || spawnAnimationMode === 'mix') ? nextTile.userData.targetZ : nextTile.position.z;
    const distanceZ = Math.abs(currentTileEffectiveZ - nextTileEffectiveZ);

    let standardVelocityZ = baseBallVelocityZ * gameSpeed;
    let standardFlightTime = distanceZ / Math.abs(standardVelocityZ);
    let targetFlightTime = standardFlightTime;

    // Tự động triệt tiêu tích lũy trôi nhịp mượt mà (đồng bộ chính xác theo beat bài nhạc) - ĐÃ COMMENT THEO YÊU CẦU
    /*
    if (audio && !audio.paused && nextTile.userData && typeof nextTile.userData.time === 'number') {
        const now = audio.currentTime;
        const targetBeatTime = nextTile.userData.time;
        const currentSpeed = Math.min(3.0, gameSpeed);
        const timeRemainingSec = (targetBeatTime - now) / currentSpeed;

        if (timeRemainingSec >= standardFlightTime * 0.5) {
            targetFlightTime = Math.max(standardFlightTime * 0.8, Math.min(standardFlightTime * 1.25, timeRemainingSec));
        } else if (timeRemainingSec > 0.05) {
            targetFlightTime = standardFlightTime;
            const targetRate = (targetBeatTime - now) / standardFlightTime;
            const clampedRate = Math.max(gameSpeed * 0.85, Math.min(gameSpeed * 1.15, targetRate));
            audio.playbackRate = clampedRate;
        }
    }
    */

    flightTime = targetFlightTime;
    ballVelocityZ = -distanceZ / flightTime;

    const baseHeight = 3.5;
    const adaptiveHeight = Math.min(5.5, baseHeight + (distanceZ - tileSpacingMin) * 0.1);

    currentGravity = -(8 * adaptiveHeight) / (flightTime * flightTime);
    currentBounceVelocityY = (4 * adaptiveHeight) / flightTime;
}

// --- TÍNH TOÁN QUỸ ĐẠO PARABOL CỨU BÓNG THÍCH ỨNG (KHÔNG GIẬT NHẠC, ĐỒNG BỘ CHUẨN BEAT, KHÔNG LÀM CHẬM GAME) ---
function calculateRescueParabola(currentTargetIndex) {
    const currentTile = tiles[currentTargetIndex];
    const nextTile = tiles[currentTargetIndex + 1];
    if (!currentTile || !nextTile) {
        calculateNextParabola(currentTargetIndex);
        return;
    }

    const currentTileEffectiveZ = currentTile.userData.isEntering && (spawnAnimationMode === 'slide' || spawnAnimationMode === 'mix') ? currentTile.userData.targetZ : currentTile.position.z;
    const nextTileEffectiveZ = nextTile.userData.isEntering && (spawnAnimationMode === 'slide' || spawnAnimationMode === 'mix') ? nextTile.userData.targetZ : nextTile.position.z;
    const distanceZ = Math.abs(currentTileEffectiveZ - nextTileEffectiveZ);

    let standardVelocityZ = baseBallVelocityZ * gameSpeed;
    let standardFlightTime = distanceZ / Math.abs(standardVelocityZ);
    let targetFlightTime = standardFlightTime;

    /*
    if (audio && !audio.paused && nextTile.userData && typeof nextTile.userData.time === 'number') {
        const now = audio.currentTime;
        const targetBeatTime = nextTile.userData.time;
        const currentSpeed = Math.min(3.0, gameSpeed);
        const timeRemainingSec = (targetBeatTime - now) / currentSpeed;

        if (timeRemainingSec >= standardFlightTime * 0.5) {
            targetFlightTime = Math.max(standardFlightTime * 0.8, Math.min(standardFlightTime * 1.25, timeRemainingSec));
        } else {
            // Nếu thời gian tới beat kế tiếp bị trễ do nhún cứu bóng,
            // giữ nhịp nhảy mượt mà và vi điều chỉnh playbackRate thay vì ngắt/seek audio.currentTime
            targetFlightTime = standardFlightTime;
            if (timeRemainingSec > 0) {
                const targetRate = (targetBeatTime - now) / standardFlightTime;
                const clampedRate = Math.max(gameSpeed * 0.85, Math.min(gameSpeed * 1.15, targetRate));
                audio.playbackRate = clampedRate;
            }
        }
    }
    */

    flightTime = targetFlightTime;
    ballVelocityZ = -distanceZ / flightTime;

    const baseHeight = 3.5;
    const adaptiveHeight = Math.min(5.5, baseHeight + (distanceZ - tileSpacingMin) * 0.1);

    currentGravity = -(8 * adaptiveHeight) / (flightTime * flightTime);
    currentBounceVelocityY = (4 * adaptiveHeight) / flightTime;
}

// --- FLOATING ORIGIN (DỊCH CHUYỂN GỐC TỌA ĐỘ) ---
function shiftCoordinateOrigin(offsetZ) {
    if (offsetZ === 0 || !ball || !camera) return;

    // 1. Dịch chuyển bóng & camera
    ball.position.z += offsetZ;
    camera.position.z += offsetZ;

    // 2. Dịch chuyển các mốc tọa độ Z trong tính toán physics
    lastTileZ += offsetZ;
    jumpStartRawZ += offsetZ;

    // 3. Dịch chuyển tất cả gạch hiện có
    tiles.forEach(tile => {
        tile.position.z += offsetZ;
        if (tile.userData.targetZ !== undefined) tile.userData.targetZ += offsetZ;
    });

    // 4. Dịch chuyển gạch đang biến mất (exit tiles)
    exitingTiles.forEach(tile => {
        tile.position.z += offsetZ;
        if (tile.userData.exitStartZ !== undefined) tile.userData.exitStartZ += offsetZ;
    });

    // 5. Dịch chuyển đuôi bóng (trail segments)
    ballTrailSegments.forEach(segment => {
        segment.mesh.position.z += offsetZ;
    });

    // 6. Dịch chuyển các vòng sóng xung kích (shockwaves)
    shockwaves.forEach(sw => {
        sw.mesh.position.z += offsetZ;
    });

    // 7. Dịch chuyển gạch giả và các mảnh vỡ (Fake blocks)
    if (window.FakeBlocksManager) {
        if (window.FakeBlocksManager.fakeTiles) {
            window.FakeBlocksManager.fakeTiles.forEach(ft => {
                ft.position.z += offsetZ;
                if (ft.userData.targetZ !== undefined) ft.userData.targetZ += offsetZ;
                if (ft.userData.exitStartZ !== undefined) ft.userData.exitStartZ += offsetZ;
            });
        }
        if (window.FakeBlocksManager.fragments) {
            window.FakeBlocksManager.fragments.forEach(frag => {
                frag.position.z += offsetZ;
            });
        }
        if (window.FakeBlocksManager.lastSpawnZ !== null && window.FakeBlocksManager.lastSpawnZ !== undefined) {
            window.FakeBlocksManager.lastSpawnZ += offsetZ;
        }
    }

    // 8. Dịch chuyển hệ thống hạt nền (starField)
    if (starField && starField.geometry && starField.geometry.attributes.position) {
        const posArr = starField.geometry.attributes.position.array;
        for (let i = 0; i < posArr.length / 3; i++) {
            posArr[i * 3 + 2] += offsetZ;
        }
        starField.geometry.attributes.position.needsUpdate = true;
    }

    // 9. Cập nhật lại hướng nhìn camera theo tọa độ mới
    camera.lookAt(camera.position.x, 1.6, camera.position.z - 18);
}

function checkAndApplyFloatingOrigin() {
    if (!ball) return;
    const landedTileVal = tiles[currentTileIndex];
    // Reset tọa độ về 0 khi nhảy đến Round mới, hoặc khi bóng đi quá xa (quá -1000 đơn vị Z)
    if (landedTileVal && (landedTileVal.userData.isRoundStart || ball.position.z < -1000)) {
        const offsetZ = -landedTileVal.position.z;
        shiftCoordinateOrigin(offsetZ);
    }
}

// --- ĐIỀU KHIỂN ĐẦU VÀO ---
function onInputMove(clientX) {
    if (!isPlaying || isFailTransition || (typeof isHoldExitTransition !== 'undefined' && isHoldExitTransition) || (window.AutoplayManager && window.AutoplayManager.shouldBypassInput())) return;
    
    const controlWidth = Math.min(window.innerWidth, window.innerHeight * 0.83);
    const halfControlWidth = controlWidth / 2;
    
    if (typeof window.absoluteControlCenter !== 'number') {
        window.absoluteControlCenter = window.innerWidth / 2;
    }
    
    let relativeX = clientX - window.absoluteControlCenter;
    
    if (relativeX < -halfControlWidth) {
        window.absoluteControlCenter = clientX + halfControlWidth;
        relativeX = -halfControlWidth;
    } else if (relativeX > halfControlWidth) {
        window.absoluteControlCenter = clientX - halfControlWidth;
        relativeX = halfControlWidth;
    }
    
    let normalizedX = relativeX / halfControlWidth;
    
    if (typeof invertControlsEnabled !== 'undefined' && invertControlsEnabled) {
        normalizedX = -normalizedX;
    }
    ballTargetX = normalizedX * 6.75;
}

function onWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const aspect = width / height;

    camera.aspect = aspect;
    camera.fov = aspect < 1 ? 75 : 60;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    if (bgVisualizerCanvas) {
        bgVisualizerCanvas.width = width;
        bgVisualizerCanvas.height = height;
    }

    if (selectedBackground === 'japan' && bgMesh) {
        const distance = 15;
        const vFOV = THREE.MathUtils.degToRad(camera.fov);
        const bgHeight = 2 * Math.tan(vFOV / 2) * distance;
        const bgWidth = bgHeight * camera.aspect;
        bgMesh.scale.set(bgWidth, bgHeight, 1);

        bgMesh.position.copy(camera.position);
        bgMesh.quaternion.copy(camera.quaternion);
        bgMesh.translateZ(-distance);
    }

    if (typeof window.adjustTabsKerning === 'function') {
        window.adjustTabsKerning();
    }
}

// --- RENDERER & PARTICLES ---
function updatePixelRatio() {
    let targetRatio = 1;
    let maxPixelRatio = 2;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (currentGraphicsQuality === 'simple') {
        maxPixelRatio = isMobile ? 0.85 : 1;
    } else if (currentGraphicsQuality === 'hd') {
        maxPixelRatio = 1.5;
    } else if (currentGraphicsQuality === 'fhd') {
        maxPixelRatio = 2;
    } else if (currentGraphicsQuality === 'qhd') {
        maxPixelRatio = 2.5;
    } else if (currentGraphicsQuality === 'uhd') {
        maxPixelRatio = 4;
    }
    targetRatio = Math.min(window.devicePixelRatio, maxPixelRatio);
    renderer.setPixelRatio(targetRatio);
}

function initParticles() {
    if (starField) scene.remove(starField);
    if (particlesGeo) particlesGeo.dispose();
    if (particlesMat) particlesMat.dispose();

    let particleCount = 400;
    if (currentGraphicsQuality === 'simple') particleCount = 100;
    else if (currentGraphicsQuality === 'hd') particleCount = 250;
    else if (currentGraphicsQuality === 'fhd') particleCount = 400;
    else if (currentGraphicsQuality === 'qhd') particleCount = 600;
    else if (currentGraphicsQuality === 'uhd') particleCount = 800;
    particlesGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const pColors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 80;
        positions[i * 3 + 1] = Math.random() * 45 - 10;

        const camZ = camera ? camera.position.z : 10;
        positions[i * 3 + 2] = camZ - Math.random() * 300;

        const pColor = Math.random() > 0.5 ? new THREE.Color(0x00ffff) : new THREE.Color(0xff00ff);
        pColors[i * 3] = pColor.r;
        pColors[i * 3 + 1] = pColor.g;
        pColors[i * 3 + 2] = pColor.b;
    }
    particlesGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particlesGeo.setAttribute('color', new THREE.BufferAttribute(pColors, 3));

    let pSize = 0.5;

    particlesMat = new THREE.PointsMaterial({
        size: currentGraphicsQuality === 'simple' ? 0.7 : 0.5,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
        vertexColors: true,
        depthWrite: false
    });
    starField = new THREE.Points(particlesGeo, particlesMat);
    starField.frustumCulled = false; // Tránh tình trạng Three.js tự ẩn object khi camera di chuyển ra xa
    starField.visible = bgParticlesEnabled;
    scene.add(starField);
}

let leftBoundaryLine, rightBoundaryLine;
let boundaryPulses = [];
const boundaryPulsePool = [];
let pulseGeometry = null;
let pulseMaterialTemplate = null;

function initBoundaries() {
    if (leftBoundaryLine) scene.remove(leftBoundaryLine);
    if (rightBoundaryLine) scene.remove(rightBoundaryLine);

    const boundaryMat = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.22,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    const boundaryGeo = new THREE.BoxGeometry(0.20, 0.04, 500);

    leftBoundaryLine = new THREE.Mesh(boundaryGeo, boundaryMat);
    leftBoundaryLine.position.set(-6.75, (typeof surfaceY !== 'undefined' ? surfaceY : 0.2) - 0.02, 0);

    rightBoundaryLine = new THREE.Mesh(boundaryGeo, boundaryMat);
    rightBoundaryLine.position.set(6.75, (typeof surfaceY !== 'undefined' ? surfaceY : 0.2) - 0.02, 0);

    scene.add(leftBoundaryLine);
    scene.add(rightBoundaryLine);

    updateBoundariesVisibility();
}

function updateBoundariesVisibility() {
    if (leftBoundaryLine) leftBoundaryLine.visible = typeof showBoundariesEnabled !== 'undefined' && showBoundariesEnabled;
    if (rightBoundaryLine) rightBoundaryLine.visible = typeof showBoundariesEnabled !== 'undefined' && showBoundariesEnabled;
}

function createBall() {
    if (ball) {
        if (typeof ballGlowMesh !== 'undefined' && ballGlowMesh) {
            if (ballGlowMesh.geometry) ballGlowMesh.geometry.dispose();
            if (ballGlowMesh.material) ballGlowMesh.material.dispose();
        }
        if (typeof ballGlowLight !== 'undefined' && ballGlowLight && ballGlowLight.dispose) {
            ballGlowLight.dispose();
        }

        scene.remove(ball);
        if (ball.geometry) ball.geometry.dispose();
        if (ball.material) ball.material.dispose();
    }

    let segments = 32;
    if (currentGraphicsQuality === 'simple') segments = 16;
    else if (currentGraphicsQuality === 'hd') segments = 24;
    else if (currentGraphicsQuality === 'fhd') segments = 32;
    else if (currentGraphicsQuality === 'qhd') segments = 48;
    else if (currentGraphicsQuality === 'uhd') segments = 64;

    const ballGeo = new THREE.SphereGeometry(ballRadius, segments, segments);
    const ballMat = currentGraphicsQuality === 'simple' ?
        new THREE.MeshBasicMaterial({ color: 0x00ffff }) :
        new THREE.MeshPhongMaterial({ color: 0x00ffff, emissive: 0x0088cc, shininess: 100 });

    ball = new THREE.Mesh(ballGeo, ballMat);
    ball.position.set(0, minFloor, 0);

    // --- HIỆU ỨNG PHÁT SÁNG BÓNG (BALL GLOW) ---
    const glowGeo = new THREE.SphereGeometry(ballRadius * 1.15, segments, segments);
    const glowMat = new THREE.MeshBasicMaterial({
        color: 0xffaa00,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    ballGlowMesh = new THREE.Mesh(glowGeo, glowMat);
    ball.add(ballGlowMesh);

    ballGlowLight = new THREE.PointLight(0xffaa00, 0, 8);
    ball.add(ballGlowLight);

    initBallTrail();

    scene.add(ball);
}

// --- KHỞI TẠO THREE.JS ---
async function initThree() {
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x020108, 0.012);

    const aspect = window.innerWidth / window.innerHeight;
    camera = new THREE.PerspectiveCamera(aspect < 1 ? 75 : 60, aspect, 0.1, 1000);
    camera.position.set(0, 6, 9.5);

    const rawApi = localStorage.getItem('graphicsAPI') || 'webgl';
    const currentApi = (rawApi === 'd2ViZ3B1' || rawApi === 'webgpu') ? 'webgpu' : 'webgl';
    console.log("[Renderer] Selected graphics API setting:", currentApi);

    if (currentApi === 'webgpu') {
        try {
            const RendererClass = THREE.WebGPURenderer || THREE.Renderer;
            if (!RendererClass) {
                throw new Error("Three.js WebGPU/Renderer constructor not found.");
            }
            renderer = new RendererClass({
                antialias: antialiasingEnabled,
                powerPreference: "high-performance",
                alpha: false,
                stencil: false
            });
            await renderer.init();

            if (renderer.backend && renderer.backend.isWebGPUBackend) {
                console.log("%c[Renderer] Using WebGPU backend", "color: #00ffff; font-weight: bold;");
            } else {
                console.log("%c[Renderer] WebGPU not supported. Falling back to WebGL 2 backend", "color: #ff00ff; font-weight: bold;");
            }
        } catch (e) {
            console.warn("WebGPU initialization failed, falling back to WebGL 2:", e);
            initWebGLRenderer();
        }
    } else {
        initWebGLRenderer();
    }

    function initWebGLRenderer() {
        const canvas = document.createElement('canvas');
        const glOptions = {
            antialias: antialiasingEnabled,
            powerPreference: "high-performance",
            alpha: false,
            stencil: false
        };
        let context = canvas.getContext('webgl2', glOptions);
        let usingWebGL2 = true;
        if (!context) {
            context = canvas.getContext('webgl', glOptions) || canvas.getContext('experimental-webgl', glOptions);
            usingWebGL2 = false;
        }

        renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            context: context,
            antialias: antialiasingEnabled,
            alpha: false,
            stencil: false
        });

        if (usingWebGL2) {
            console.log("%c[Renderer] Using WebGL 2 context", "color: #00ffff; font-weight: bold;");
        } else {
            console.log("%c[Renderer] WebGL 2 not supported. Using WebGL 1 context", "color: #ff00ff; font-weight: bold;");
        }
    }

    let ambientIntensity = 2.0;
    let dirIntensity = 2.5;

    // WebGL 2 runs on r128 (no ColorManagement). WebGPU runs on r171 (has ColorManagement).
    if (THREE.ColorManagement) {
        THREE.ColorManagement.enabled = true;
        if (renderer) {
            renderer.outputColorSpace = THREE.SRGBColorSpace || 'srgb';
        }
        // Scale down light intensities for WebGPU (r171) physically-based lighting to prevent washouts
        ambientIntensity = 0.55;
        dirIntensity = 1.0;
    }

    renderer.setSize(container.clientWidth, container.clientHeight);
    updatePixelRatio();
    renderer.setClearColor(scene.fog.color);
    container.appendChild(renderer.domElement);

    if (bgVisualizerCanvas) {
        bgVisualizerCanvas.width = window.innerWidth;
        bgVisualizerCanvas.height = window.innerHeight;
        visualizerCtx = bgVisualizerCanvas.getContext('2d');
    }

    const ambientLight = new THREE.AmbientLight(0x220044, ambientIntensity);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x00ffff, dirIntensity);
    dirLight.position.set(5, 25, 10);
    scene.add(dirLight);

    // --- HẠT NỀN NEON DUST ---
    initParticles();
    initBoundaries();

    // Bóng Neon
    createBall(); // Gọi hàm createBall để khởi tạo bóng cùng với hiệu ứng phát sáng

    spawnTile(true);
    spawnTile(false);

    if (tiles[0] && tiles[0].userData.centerMesh) {
        tiles[0].userData.centerMesh.visible = true;
        if (tiles[0].userData.centerMesh.material) tiles[0].userData.centerMesh.material.opacity = 1.0;
        tiles[0].userData.centerMeshFade = true;
    }

    jumpStartRawZ = tiles[0].position.z;
    calculateNextParabola(0);

    // --- SỰ KIỆN ĐIỀU KHIỂN (MOUSE & TOUCH) ---
    let isTouchActive = false;

    window.addEventListener('mousedown', (e) => {
        if (isTouchActive) return;
        if (e.button !== 0) return; // Chỉ cho phép chuột trái điều khiển
        isMouseDown = true;
        lastInputX = e.clientX;
        window.absoluteControlCenter = e.clientX;
        if (!isRelativePC) onInputMove(e.clientX);
        if (window.EasyModeManager) window.EasyModeManager.triggerPressEffect();
    });

    window.addEventListener('mouseup', (e) => {
        if (isTouchActive) return;
        if (e.button !== 0) return; // Chỉ xử lý nhả chuột trái
        isMouseDown = false;
    });

    window.addEventListener('mousemove', (e) => {
        if (isTouchActive) return;
        if (isRelativePC) {
            // Kiểm tra xem chuột trái có đang được nhấn giữ thực tế không
            const isLeftDown = (e.buttons !== undefined) ? (e.buttons & 1) === 1 : isMouseDown;
            if (isLeftDown) {
                // Nếu chuột đang giữ nhưng flag isMouseDown là false (ví dụ: bị lỡ sự kiện mousedown)
                // thiết lập lại để tránh di chuyển nhảy vị trí đột ngột
                if (!isMouseDown) {
                    isMouseDown = true;
                    lastInputX = e.clientX;
                    return;
                }
                if (isPlaying && !isFailTransition && !(typeof isHoldExitTransition !== 'undefined' && isHoldExitTransition) && !(window.AutoplayManager && window.AutoplayManager.shouldBypassInput())) {
                    let deltaX = e.clientX - lastInputX;
                    if (typeof invertControlsEnabled !== 'undefined' && invertControlsEnabled) {
                        deltaX = -deltaX;
                    }
                    const controlWidth = Math.min(window.innerWidth, window.innerHeight * 0.83);
                    ballTargetX = Math.max(-6.75, Math.min(6.75, ballTargetX + (deltaX / controlWidth) * 13.5 * sensitivity));
                }
                lastInputX = e.clientX;
            } else {
                isMouseDown = false;
            }
        } else {
            onInputMove(e.clientX);
            lastInputX = e.clientX;
        }
    });

    window.addEventListener('blur', () => {
        isMouseDown = false;
    });

    window.addEventListener('touchstart', (e) => {
        isTouchActive = true;
        lastInputX = e.touches[0].clientX;
        window.absoluteControlCenter = e.touches[0].clientX;
        if (window.EasyModeManager) window.EasyModeManager.triggerPressEffect();
    }, { passive: true });

    window.addEventListener('touchend', (e) => {
        if (e.touches.length > 0) {
            lastInputX = e.touches[0].clientX;
        } else {
            setTimeout(() => isTouchActive = false, 500);
        }
    });

    window.addEventListener('touchmove', (e) => {
        if (!isPlaying || isFailTransition || (typeof isHoldExitTransition !== 'undefined' && isHoldExitTransition) || (window.AutoplayManager && window.AutoplayManager.shouldBypassInput())) {
            if (e.touches.length > 0) lastInputX = e.touches[0].clientX;
            return;
        }
        e.preventDefault();
        const currentX = e.touches[0].clientX;
        let deltaX = currentX - lastInputX;
        if (typeof invertControlsEnabled !== 'undefined' && invertControlsEnabled) {
            deltaX = -deltaX;
            }
        lastInputX = currentX;
        const controlWidth = Math.min(window.innerWidth, window.innerHeight * 0.83);
        ballTargetX = Math.max(-6.75, Math.min(6.75, ballTargetX + (deltaX / controlWidth) * 13.5 * sensitivity));
    }, { passive: false });

    window.addEventListener('resize', onWindowResize);

    // Phím ESC và Nút thoát nhanh
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && typeof autoFullscreenEnabled !== 'undefined' && autoFullscreenEnabled) {
            e.preventDefault();
        }
        keys[e.key] = true;
    });
    window.addEventListener('keyup', (e) => keys[e.key] = false);

    // Đăng ký sự kiện hold cho nút thoát nhanh (Autoplay Back)
    autoplayBackBtn.addEventListener('mousedown', () => isHoldingBtn = true);
    autoplayBackBtn.addEventListener('mouseup', () => isHoldingBtn = false);
    autoplayBackBtn.addEventListener('mouseleave', () => isHoldingBtn = false);
    autoplayBackBtn.addEventListener('touchstart', (e) => { e.preventDefault(); isHoldingBtn = true; }, { passive: false });
    autoplayBackBtn.addEventListener('touchend', () => isHoldingBtn = false);

    // --- LOGIC CHUYỂN TAB CHÍNH (HOME / SETTINGS) ---
    const mainNavBtns = document.querySelectorAll('.nav-btn');
    const panelHome = document.getElementById('panel-home');
    const panelSettings = document.getElementById('panel-settings');
    const panelMusic = document.getElementById('panel-music');
    const panelPersonalize = document.getElementById('panel-personalize');
    const panelAccount = document.getElementById('panel-account');

    mainNavBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            mainNavBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            if (typeof window.updateMainMenuTheme === 'function') {
                window.updateMainMenuTheme();
            }

            const panels = [
                { id: 'nav-home', el: panelHome },
                { id: 'nav-personalize', el: panelPersonalize },
                { id: 'nav-music', el: panelMusic },
                { id: 'nav-account', el: panelAccount },
                { id: 'nav-settings', el: panelSettings }
            ];

            panels.forEach(p => {
                if (!p.el) return;
                if (btn.id === p.id) {
                    p.el.classList.remove('hidden');
                    if (typeof anime !== 'undefined' && (typeof uiAnimationsEnabled === 'undefined' || uiAnimationsEnabled)) {
                        p.el.style.opacity = 0;
                        p.el.style.transform = 'translateY(10px)';
                        anime({ targets: p.el, opacity: 1, translateY: 0, duration: 300, easing: 'easeOutQuad' });
                    } else {
                        p.el.style.opacity = 1;
                        p.el.style.transform = 'none';
                    }
                } else {
                    p.el.classList.add('hidden');
                }
            });

            if (typeof window.adjustTabsKerning === 'function') {
                setTimeout(window.adjustTabsKerning, 50);
            }

            if (typeof window.updateActiveTabIndicator === 'function') {
                window.updateActiveTabIndicator(btn.id);
            }

            // Lô-gic điều khiển nhạc khi chuyển Tab (Fade In/Out)
            if (btn.id === 'nav-music') {
                if (typeof window.MusicPlayer !== 'undefined') {
                    if (!window.MusicPlayer.isPlaying) {
                        window.MusicPlayer.togglePlay(true); // true = Bật Fade-in
                    }
                }
            } else {
                if (typeof window.MusicPlayer !== 'undefined' && window.MusicPlayer.isPlaying) {
                    // Bật Cross-fade: Trả lại tiếng nhạc nền song song với việc tắt dần nhạc phát trong Player
                    if (typeof audioCtx !== 'undefined' && audioCtx && typeof menuGainNode !== 'undefined' && menuGainNode && (typeof currentPreviewIndex === 'undefined' || currentPreviewIndex === -1)) {
                        const now = audioCtx.currentTime;
                        menuGainNode.gain.cancelScheduledValues(now);
                        menuGainNode.gain.setValueAtTime(menuGainNode.gain.value, now);
                        menuGainNode.gain.linearRampToValueAtTime(typeof menuVolume !== 'undefined' ? (typeof isMenuMuted !== 'undefined' && isMenuMuted ? 0 : menuVolume) : 0.5, now + 0.5);
                        const isIntroVisible = typeof introOverlay !== 'undefined' && introOverlay && introOverlay.style.display !== 'none';
                        if (!isIntroVisible && typeof menuAudio !== 'undefined' && menuAudio) {
                            const playPromise = menuAudio.play();
                            if (playPromise !== undefined) {
                                playPromise.catch(e => { setTimeout(() => { menuAudio.play().catch(() => { }); }, 50); });
                            }
                        }
                    } else if (typeof menuAudio !== 'undefined' && menuAudio && (typeof currentPreviewIndex === 'undefined' || currentPreviewIndex === -1)) {
                        menuAudio.volume = typeof menuVolume !== 'undefined' ? (typeof isMenuMuted !== 'undefined' && isMenuMuted ? 0 : menuVolume) : 0.5;
                        const isIntroVisible = typeof introOverlay !== 'undefined' && introOverlay && introOverlay.style.display !== 'none';
                        if (!isIntroVisible) {
                            const playPromise = menuAudio.play();
                            if (playPromise !== undefined) {
                                playPromise.catch(e => { setTimeout(() => { menuAudio.play().catch(() => { }); }, 50); });
                            }
                        }
                    }
                    window.MusicPlayer.fadeOutAndStop();
                } else {
                    if (typeof audioCtx !== 'undefined' && audioCtx && typeof menuGainNode !== 'undefined' && menuGainNode && (typeof currentPreviewIndex === 'undefined' || currentPreviewIndex === -1)) {
                        const now = audioCtx.currentTime;
                        menuGainNode.gain.cancelScheduledValues(now);
                        menuGainNode.gain.setValueAtTime(menuGainNode.gain.value, now);
                        menuGainNode.gain.linearRampToValueAtTime(typeof menuVolume !== 'undefined' ? (typeof isMenuMuted !== 'undefined' && isMenuMuted ? 0 : menuVolume) : 0.5, now + 0.5);
                        const isIntroVisible = typeof introOverlay !== 'undefined' && introOverlay && introOverlay.style.display !== 'none';
                        if (!isIntroVisible && typeof menuAudio !== 'undefined' && menuAudio) {
                            const playPromise = menuAudio.play();
                            if (playPromise !== undefined) {
                                playPromise.catch(e => { setTimeout(() => { menuAudio.play().catch(() => { }); }, 50); });
                            }
                        }
                    }
                }
            }
        });
    });

    // --- LOGIC CHO MENU RÚT GỌN TRÊN DI ĐỘNG (MOBILE HAMBURGER DROPDOWN) ---
    const menuToggle = document.getElementById('nav-menu-toggle');
    const dropdownMenu = document.getElementById('nav-dropdown-menu');
    if (menuToggle && dropdownMenu) {
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            const willShow = dropdownMenu.classList.contains('hidden');
            if (willShow) {
                dropdownMenu.classList.remove('hidden');
                if (typeof anime !== 'undefined' && (typeof uiAnimationsEnabled === 'undefined' || uiAnimationsEnabled)) {
                    anime.remove(dropdownMenu);
                    anime({
                        targets: dropdownMenu,
                        opacity: [0, 1],
                        translateY: [-10, 0],
                        duration: 200,
                        easing: 'easeOutQuad'
                    });
                } else {
                    dropdownMenu.style.opacity = 1;
                    dropdownMenu.style.transform = 'none';
                }
            } else {
                dropdownMenu.classList.add('hidden');
            }
        });

        // Đóng dropdown khi click ra ngoài
        document.addEventListener('click', () => {
            dropdownMenu.classList.add('hidden');
        });

        // Bắt sự kiện click các nút trong dropdown menu
        const dropdownBtns = dropdownMenu.querySelectorAll('.dropdown-nav-btn');
        dropdownBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetId = btn.dataset.target;
                const targetBtn = document.getElementById(targetId);
                if (targetBtn) {
                    targetBtn.click(); // Giả lập click nút tab chính tương ứng
                }
                dropdownMenu.classList.add('hidden');
            });
        });
    }

    // Hàm cập nhật trạng thái hiển thị của tab hiện tại trên header di động
    window.updateActiveTabIndicator = function(activeBtnId) {
        const activeBtn = document.getElementById(activeBtnId);
        const activeText = document.getElementById('active-tab-text');
        const activeIcon = document.getElementById('active-tab-icon');
        if (!activeBtn || !activeText || !activeIcon) return;

        const textSpan = activeBtn.querySelector('span');
        if (textSpan) {
            activeText.textContent = textSpan.textContent;
            activeText.setAttribute('data-i18n', textSpan.getAttribute('data-i18n') || '');
        }

        const svg = activeBtn.querySelector('svg');
        if (svg) {
            activeIcon.innerHTML = svg.outerHTML;
            const nestedSvg = activeIcon.querySelector('svg');
            if (nestedSvg) {
                // Đảm bảo icon trên header di động nhỏ và đồng bộ màu
                nestedSvg.setAttribute('class', 'w-4 h-4 text-cyan-400');
                nestedSvg.style.width = '16px';
                nestedSvg.style.height = '16px';
            }
        }
    };

    // Khởi tạo trạng thái ban đầu cho indicator di động
    if (window.updateActiveTabIndicator) {
        window.updateActiveTabIndicator('nav-home');
    }

    // --- LOGIC CHUYỂN TAB CÀI ĐẶT ---
    const settingTabBtns = document.querySelectorAll('.tab-btn');
    settingTabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.dataset.tab;

            settingTabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.add('hidden'));
            const targetPane = document.getElementById(targetId);
            if (targetPane) {
                targetPane.classList.remove('hidden');
                if (targetId === 'tab-storage' && typeof window.renderStorageList === 'function') {
                    window.renderStorageList();
                }
                if (typeof anime !== 'undefined' && (typeof uiAnimationsEnabled === 'undefined' || uiAnimationsEnabled)) {
                    targetPane.style.opacity = 0;
                    targetPane.style.transform = 'translateX(-10px)';
                    anime({ targets: targetPane, opacity: 1, translateX: 0, duration: 300, easing: 'easeOutQuad' });
                } else {
                    targetPane.style.opacity = 1;
                    targetPane.style.transform = 'none';
                }
            }

            if (typeof window.adjustTabsKerning === 'function') {
                setTimeout(window.adjustTabsKerning, 50);
            }
        });
    });

    // --- ĐỒNG BỘ GIÁ TRỊ TỪ LOCALSTORAGE VÀO DOM ---
    if (togglePerfMode) togglePerfMode.checked = performanceModeEnabled;
    const qualityRadio = document.querySelector(`input[name="graphics-quality"][value="${currentGraphicsQuality}"]`);
    if (qualityRadio) qualityRadio.checked = true;

    const rawApiVal = typeof graphicsAPI !== 'undefined' ? graphicsAPI : (localStorage.getItem('graphicsAPI') || 'webgl');
    const resolvedApiVal = (rawApiVal === 'd2ViZ3B1' || rawApiVal === 'webgpu') ? 'webgpu' : 'webgl';
    const apiRadio = document.querySelector(`input[name="graphics-api"][value="${resolvedApiVal}"]`);
    if (apiRadio) apiRadio.checked = true;



    if (toggleShockwaves) toggleShockwaves.checked = shockwavesEnabled;
    if (toggleRelativePC) toggleRelativePC.checked = isRelativePC;
    if (typeof toggleRawInput !== 'undefined' && toggleRawInput) toggleRawInput.checked = rawInputEnabled;
    if (toggleAntialiasing) toggleAntialiasing.checked = antialiasingEnabled;
    if (toggleDynamicColors) toggleDynamicColors.checked = dynamicColorsEnabled;
    if (toggleVisualizer) toggleVisualizer.checked = visualizerEnabled;
    if (toggleBgParticles) toggleBgParticles.checked = bgParticlesEnabled;
    if (toggleTileBounce) toggleTileBounce.checked = tileBounceEnabled;
    if (typeof toggleBlockShatter !== 'undefined' && toggleBlockShatter) toggleBlockShatter.checked = (typeof blockShatterEnabled !== 'undefined' ? blockShatterEnabled : true);
    if (typeof toggleUiAnimations !== 'undefined' && toggleUiAnimations) toggleUiAnimations.checked = (typeof uiAnimationsEnabled !== 'undefined' ? uiAnimationsEnabled : true);
    if (spawnAnimationSelect) spawnAnimationSelect.value = spawnAnimationMode;
    if (typeof limitBeatmapAudioSelect !== 'undefined' && limitBeatmapAudioSelect) limitBeatmapAudioSelect.value = limitBeatmapAudioCount;

    if (sensitivitySlider) sensitivitySlider.value = sensitivity;
    if (typeof tileDetailSlider !== 'undefined' && tileDetailSlider) tileDetailSlider.value = typeof tileDetailScale !== 'undefined' ? tileDetailScale : 1.0;
    if (blocksAheadSlider) blocksAheadSlider.value = blocksAheadLimit;
    if (blocksBehindSlider) blocksBehindSlider.value = blocksBehindLimit;
    if (typeof maxFpsSlider !== 'undefined' && maxFpsSlider) {
        maxFpsSlider.value = typeof maxFps !== 'undefined' ? maxFps : 0;
        if (typeof maxFpsValue !== 'undefined' && maxFpsValue) {
            const currentVal = typeof maxFps !== 'undefined' ? maxFps : 0;
            if (currentVal === 0) {
                maxFpsValue.innerText = typeof t === 'function' ? t('max_fps_unlimited') : 'Không giới hạn';
            } else if (currentVal === 361) {
                maxFpsValue.innerText = typeof t === 'function' ? t('max_fps_vsync') : 'Vs thiết bị';
            } else if (currentVal === 362) {
                maxFpsValue.innerText = typeof t === 'function' ? t('max_fps_eco') : 'Eco (60 FPS)';
            } else {
                maxFpsValue.innerText = `${currentVal} FPS`;
            }
        }
    }
    if (menuVolumeSlider) menuVolumeSlider.value = menuVolume;
    if (typeof playSfxVolumeSlider !== 'undefined' && playSfxVolumeSlider) playSfxVolumeSlider.value = typeof playSfxVolume !== 'undefined' ? playSfxVolume : 0.8;
    if (typeof previewVolumeSlider !== 'undefined' && previewVolumeSlider) previewVolumeSlider.value = typeof previewVolume !== 'undefined' ? previewVolume : 0.6
    if (typeof pregameVolumeSlider !== 'undefined' && pregameVolumeSlider) pregameVolumeSlider.value = typeof pregameVolume !== 'undefined' ? pregameVolume : 0.8;
    if (gameVolumeSlider) gameVolumeSlider.value = gameVolume;
    if (roundVolumeSlider) roundVolumeSlider.value = roundVolume;
    if (uiVolumeSlider) uiVolumeSlider.value = uiVolume;
    if (typeof breakBlockVolumeSlider !== 'undefined' && breakBlockVolumeSlider) breakBlockVolumeSlider.value = typeof breakBlockVolume !== 'undefined' ? breakBlockVolume : 0.8;
    if (toggleRelativePC) toggleRelativePC.checked = isRelativePC;

    // ĐỒNG BỘ UI SETTINGS TRƯỚC KHI APPLY
    if (toggleTileBounce) toggleTileBounce.checked = tileBounceEnabled;
    if (typeof toggleUiAnimations !== 'undefined' && toggleUiAnimations) toggleUiAnimations.checked = (typeof uiAnimationsEnabled !== 'undefined' ? uiAnimationsEnabled : true);
    if (spawnAnimationSelect) spawnAnimationSelect.value = spawnAnimationMode;
    if (typeof limitBeatmapAudioSelect !== 'undefined' && limitBeatmapAudioSelect) limitBeatmapAudioSelect.value = limitBeatmapAudioCount;
    if (toggleBallGlow) toggleBallGlow.checked = ballGlowEnabled;
    if (toggleBallTrail) toggleBallTrail.checked = ballTrailEnabled;
    if (toggleShowBoundaries) toggleShowBoundaries.checked = showBoundariesEnabled;
    if (togglePreservePitch) togglePreservePitch.checked = preservePitchEnabled;
    if (sensitivitySlider) sensitivitySlider.value = sensitivity;
    if (typeof tileDetailSlider !== 'undefined' && tileDetailSlider) tileDetailSlider.value = typeof tileDetailScale !== 'undefined' ? tileDetailScale : 1.0;

    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const pcRelativeContainer = document.getElementById('pc-relative-container');
    const rawInputContainer = document.getElementById('raw-input-container');
    if (isMobile) {
        if (pcRelativeContainer) pcRelativeContainer.style.display = 'none';
        if (rawInputContainer) rawInputContainer.style.display = 'none';
    }

    if (sfxVolumeSlider) sfxVolumeSlider.value = sfxVolume;

    applySettings();
    updateBackgroundStyle();
}

// --- PORTAL CANVAS TEXTURE GENERATOR ---
let portalCanvas = null;
let portalCtx = null;
let portalTexture = null;

function drawPortalCanvas() {
    if (!portalCanvas) {
        portalCanvas = document.createElement('canvas');
        portalCanvas.width = 256; // 256x256 cực kỳ nhẹ
        portalCanvas.height = 256;
        portalCtx = portalCanvas.getContext('2d');
    }
    
    const ctx = portalCtx;
    ctx.clearRect(0, 0, 256, 256);
    
    // Nền đen hoàn toàn (vì ta sẽ nhân màu trên GPU)
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 256, 256);
    
    ctx.save();
    ctx.translate(128, 128);
    
    // Lớp 1: Ambient Glow ngoài cùng (trắng mờ)
    const grad1 = ctx.createRadialGradient(0, 0, 20, 0, 0, 120);
    grad1.addColorStop(0, 'rgba(255,255,255,0)');
    grad1.addColorStop(0.35, 'rgba(255,255,255,0.4)');
    grad1.addColorStop(0.85, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad1;
    ctx.fillRect(-128, -128, 256, 256);

    // Lớp 2: Xoắn ốc 1 (trắng sáng)
    ctx.save();
    ctx.rotate(0.3);
    ctx.scale(1.25, 0.75); // Bầu dục nghiêng 3D
    const grad2 = ctx.createRadialGradient(-15, 0, 12, 0, 0, 95);
    grad2.addColorStop(0, 'rgba(0,0,0,0)');
    grad2.addColorStop(0.45, 'rgba(255,255,255,0.7)');
    grad2.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad2;
    ctx.globalCompositeOperation = 'screen';
    ctx.fillRect(-128, -128, 256, 256);
    ctx.restore();

    // Lớp 3: Xoắn ốc 2 (trắng sáng, góc khác)
    ctx.save();
    ctx.rotate(-0.8);
    ctx.scale(0.75, 1.25);
    const grad3 = ctx.createRadialGradient(15, -8, 8, 0, 0, 85);
    grad3.addColorStop(0, 'rgba(0,0,0,0)');
    grad3.addColorStop(0.5, 'rgba(255,255,255,0.55)');
    grad3.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad3;
    ctx.globalCompositeOperation = 'screen';
    ctx.fillRect(-128, -128, 256, 256);
    ctx.restore();
    
    // Lớp 4: Lõi tối ở trung tâm để làm nổi bật bóng khi chơi
    const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 42);
    coreGrad.addColorStop(0, '#000000');
    coreGrad.addColorStop(0.4, 'rgba(0,0,0,0.92)');
    coreGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = coreGrad;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillRect(-128, -128, 256, 256);
    
    ctx.restore();
}

// --- BACKGROUND STYLES IMPLEMENTATION ---
function updateBackgroundStyle() {
    if (!camera) return;

    if (selectedBackground === 'default') {
        if (bgMesh) {
            bgMesh.visible = false;
        }
        // Khôi phục sương mù & màu renderer mặc định
        if (scene && scene.fog) {
            scene.fog.color.setHex(0x020108);
            scene.fog.density = 0.012;
        }
        if (renderer && scene && scene.fog) {
            renderer.setClearColor(scene.fog.color);
        }
        return;
    }

    if (selectedBackground === 'japan') {
        // Khởi tạo Canvas Texture (chỉ vẽ 1 lần duy nhất trên CPU)
        if (!portalCanvas) {
            portalCanvas = document.createElement('canvas');
            portalCanvas.width = 256;
            portalCanvas.height = 256;
            portalCtx = portalCanvas.getContext('2d');
            
            drawPortalCanvas();
            portalTexture = new THREE.CanvasTexture(portalCanvas);
            portalTexture.center.set(0.5, 0.5);
        }

        // Áp dụng màu ban đầu
        let activeTile = tiles[currentTileIndex];
        let tileColorHex = 0x00ffff;
        if (activeTile && activeTile.userData && activeTile.userData.themeColor) {
            tileColorHex = activeTile.userData.themeColor;
        }
        
        const baseGray = 0.10;
        targetBgColor.setHex(tileColorHex).multiplyScalar(0.07);
        targetBgColor.r += baseGray;
        targetBgColor.g += baseGray;
        targetBgColor.b += baseGray;
        currentBgColor.copy(targetBgColor);

        if (!bgMesh) {
            // Dùng MeshBasicMaterial kết hợp màu uColor trực tiếp trên GPU
            bgMaterial = new THREE.MeshBasicMaterial({
                map: portalTexture,
                color: currentBgColor,
                depthTest: false,
                depthWrite: false,
                fog: false,
                transparent: false
            });

            const bgGeometry = new THREE.PlaneGeometry(1, 1);
            bgMesh = new THREE.Mesh(bgGeometry, bgMaterial);
            bgMesh.renderOrder = -10000;

            // Thêm trực tiếp vào scene
            scene.add(bgMesh);
        } else {
            bgMaterial.color.copy(currentBgColor);
        }

        bgMesh.visible = true;
        
        // Căn thẳng hàng và bám sát camera ở khoảng cách 15 đơn vị
        const distance = 15; 
        bgMesh.position.copy(camera.position);
        bgMesh.quaternion.copy(camera.quaternion);
        bgMesh.translateZ(-distance);

        const vFOV = THREE.MathUtils.degToRad(camera.fov);
        const bgHeight = 2 * Math.tan(vFOV / 2) * distance;
        const bgWidth = bgHeight * camera.aspect;

        bgMesh.scale.set(bgWidth, bgHeight, 1);

        if (scene && scene.fog) {
            scene.fog.color.copy(currentBgColor);
        }
        if (renderer) {
            renderer.setClearColor(scene.fog.color);
        }
    }
}
window.updateBackgroundStyle = updateBackgroundStyle;


// --- VÒNG LẶP CHÍNH ---
let currentTileIndex = 0;
let gameStarted = false;
let lastTrailSpawnTime = 0;
let totalTilesJumped = 0;
let lastVisTime = 0;

// FPS Counter Variables
let fpsLastTime = performance.now();
let fpsFrameCount = 0;
let lastFrameTime = performance.now();

function animate() {
    requestAnimationFrame(animate);

    const now = performance.now();
    let limitValue = typeof maxFps !== 'undefined' ? maxFps : 0;
    if (limitValue === 362) {
        limitValue = 60; // Eco locks to 60 FPS
    }

    if (limitValue > 0 && limitValue <= 360) {
        const frameDuration = 1000 / limitValue;
        const elapsed = now - lastFrameTime;
        if (elapsed < frameDuration - 0.5) {
            return;
        }
        lastFrameTime = now - (elapsed % frameDuration);
    } else {
        lastFrameTime = now;
    }

    if (typeof showFpsEnabled !== 'undefined' && showFpsEnabled) {
        fpsFrameCount++;
        const elapsedFps = now - fpsLastTime;
        if (elapsedFps >= 1000) {
            const fpsValue = Math.round((fpsFrameCount * 1000) / elapsedFps);
            fpsFrameCount = 0;
            fpsLastTime = now;
            const fpsHud = document.getElementById('fps-hud');
            if (fpsHud) fpsHud.innerText = `FPS: ${fpsValue}`;
        }
    }

    let delta = clock.getDelta();

    // --- THUẬT TOÁN ĐỒNG BỘ NHẠC (AUDIO SYNC CORRECTION) ---
    // Liên tục kiểm tra tiến độ bài hát và bù trừ khung hình delta để ép game khớp với nhạc
    if (isPlaying && !isFalling && !isFailTransition && audio && !audio.paused) {
        let currentAudioTime = audio.currentTime;
        let drift = currentAudioTime - accumulatedSongTime;

        // Tốc độ thực tế của nhạc chỉ đạt tối đa 2.6x, ta đồng bộ thời gian theo tốc độ này
        // để không vô tình làm giảm biến delta khi gameSpeed > 2.6
        let currentAudioSpeed = Math.min(3.0, gameSpeed);

        if (Math.abs(drift) > 0.03 && Math.abs(drift) < 1.0) {
            let correction = (drift * 0.1) / currentAudioSpeed;
            delta += correction;
            delta = Math.max(0.001, Math.min(delta, 0.1));
        } else if (Math.abs(drift) >= 1.0) {
            accumulatedSongTime = currentAudioTime;
        }
        accumulatedSongTime += delta * currentAudioSpeed;
    }

    if (delta > 0.1) delta = 0.1;

    if (isPlaying) {
        // --- AUTOPLAY UPDATE ---
        if (window.AutoplayManager) {
            const autoResult = window.AutoplayManager.update(delta, tiles, currentTileIndex, isFalling, isFailTransition || (typeof isHoldExitTransition !== 'undefined' && isHoldExitTransition));
            if (autoResult.holdExited && !(typeof isHoldExitTransition !== 'undefined' && isHoldExitTransition) && !isFailTransition) {
                isFalling = true;
                fallVelocityY = 0; // Bóng rơi xuống luôn
                fallVelocityZ = ballVelocityZ;
                fallVelocityX = 0;

                if (typeof isHoldExitTransition !== 'undefined') isHoldExitTransition = true;
                failTimeElapsed = 0;
                if (audio) {
                    initialFailSpeed = audio.playbackRate;
                    audio.preservesPitch = false;
                    audio.mozPreservesPitch = false;
                    audio.webkitPreservesPitch = false;
                }
            } else if (autoResult.targetX !== null && !(typeof isHoldExitTransition !== 'undefined' && isHoldExitTransition) && !isFailTransition) {
                ballTargetX = autoResult.targetX;
            }
        }

        // --- RENDER VISUALIZER ---
        if (visualizerEnabled && visualizerCtx && analyserNode && isPlaying && !isFailTransition && !(typeof isHoldExitTransition !== 'undefined' && isHoldExitTransition)) {
            const nowTime = clock.getElapsedTime();
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            const visThrottle = (isMobile || currentGraphicsQuality === 'simple') ? 0.033 : 0.016;

            if (nowTime - lastVisTime >= visThrottle) {
                lastVisTime = nowTime;
                const bufferLength = analyserNode.frequencyBinCount;
                if (!visDataArray || visDataArray.length !== bufferLength) {
                    visDataArray = new Uint8Array(bufferLength); // Chỉ tạo 1 lần duy nhất
                }
                analyserNode.getByteFrequencyData(visDataArray);

                visualizerCtx.clearRect(0, 0, bgVisualizerCanvas.width, bgVisualizerCanvas.height);

                const width = bgVisualizerCanvas.width;
                const height = bgVisualizerCanvas.height;
                const centerY = height * 0.25;

                const numBars = Math.floor(width / 24);
                const barSpacing = width / numBars;
                const barWidth = Math.max(6, barSpacing - 8);

                const maxBlocks = 12;
                const blockHeight = Math.max(4, (height * 0.15) / maxBlocks);
                const blockGap = 3;

                const barData = [];
                for (let i = 0; i < numBars; i++) {
                    let centerDist = Math.abs(i - numBars / 2);
                    let dataIdx = Math.floor((centerDist / (numBars / 2)) * (bufferLength * 0.6));
                    let v = visDataArray[dataIdx] / 255.0;
                    if (v > 0.1) v = v * (0.8 + Math.random() * 0.2);
                    barData.push(Math.ceil(v * maxBlocks));
                }

                visualizerCtx.fillStyle = 'rgba(34, 211, 238, 0.85)';
                for (let i = 0; i < numBars; i++) {
                    const activeBlocks = barData[i];
                    if (activeBlocks === 0) continue;
                    const x = i * barSpacing + (barSpacing - barWidth) / 2;
                    const totalHeight = activeBlocks * (blockHeight + blockGap) - blockGap;
                    const y = centerY - totalHeight;
                    visualizerCtx.fillRect(x, y, barWidth, totalHeight);
                }

                visualizerCtx.globalCompositeOperation = 'destination-out';
                visualizerCtx.fillStyle = 'rgba(0,0,0,1)';
                for (let b = 1; b < maxBlocks; b++) {
                    const yUp = centerY - b * (blockHeight + blockGap);
                    visualizerCtx.fillRect(0, yUp, width, blockGap);
                }
                visualizerCtx.globalCompositeOperation = 'source-over';
            }
        } else if (visualizerCtx) {
            visualizerCtx.clearRect(0, 0, bgVisualizerCanvas.width, bgVisualizerCanvas.height);
        }

        // --- ĐỒNG BỘ ROUND & TỐC ĐỘ ---
        if (!isFalling && !isFailTransition) {
            if (audio && audio.duration) {
                const isWarmupPhase = (roundCount === 0 && totalTilesJumped < 16);
                if ((activeRoundCount > 1 || activeEndlessMode) && !isWarmupPhase) {
                    let increment = (SPEED_GAIN_PER_ROUND / BEATMAP_TOTAL_TIME) * delta * gameSpeed;
                    gameSpeed = Math.min(100.0, gameSpeed + increment);
                } else {
                    gameSpeed = 1.0;
                }
                audio.playbackRate = Math.min(3.0, gameSpeed);
            }

            const isWarmupText = !activeEndlessMode || (roundCount === 0 && totalTilesJumped < 16);
            let modeText = isWarmupText ? t('warmup') : `${t('round')} ${activeRoundCount}`;
            if (isWarmupText && beatmapBeats && beatmapBeats.length > 0) {
                const progress = Math.min(100, Math.floor((totalTilesJumped / beatmapBeats.length) * 100));
                modeText += ` ${progress}%`;
            }
            const newSpeedText = `${gameSpeed.toFixed(2)}x (${modeText})`;
            if (lastDisplayedSpeedText !== newSpeedText) {
                speedEl.innerText = newSpeedText;
                lastDisplayedSpeedText = newSpeedText;
            }
        }

        // --- CẬP NHẬT HẠT NỀN ---
        if (starField && starField.visible) {
            const posArr = starField.geometry.attributes.position.array;
            const speedFactor = 50 * gameSpeed * delta;
            const camZ = camera.position.z;
            for (let i = 0; i < posArr.length / 3; i++) {
                posArr[i * 3 + 2] += speedFactor;

                // Nếu hạt bay ra sau camera hoặc bị bỏ lại quá xa vì sự kiện reset game/chuyển cảnh
                if (posArr[i * 3 + 2] > camZ + 10 || posArr[i * 3 + 2] < camZ - 350) {
                    posArr[i * 3 + 2] = camZ - 100 - Math.random() * 200;
                    posArr[i * 3] = (Math.random() - 0.5) * 80;
                    posArr[i * 3 + 1] = Math.random() * 45 - 10;
                }
            }
            starField.geometry.attributes.position.needsUpdate = true;
        }

        // --- CẬP NHẬT ĐUÔI BÓNG ---
        if (typeof ballTrailEnabled !== 'undefined' && ballTrailEnabled && isPlaying && !isFalling && ball) {
            const now = clock.getElapsedTime();
            if (now - lastTrailSpawnTime > 0.02) { // Tần suất sinh
                lastTrailSpawnTime = now;

                let segmentMesh;
                if (!cachedTrailGeo) cachedTrailGeo = new THREE.TetrahedronGeometry(ballRadius * 0.6);
                if (trailPool.length > 0) {
                    segmentMesh = trailPool.pop();
                    // [FIX] WebGPU disposes GPU index/vertex buffers when mesh is scene.remove()'d.
                    // Re-assign geometry and mark all attributes needsUpdate so WebGPU re-uploads buffers,
                    // preventing "setIndexBuffer: parameter 1 is not of type 'GPUBuffer'" error.
                    segmentMesh.geometry = cachedTrailGeo;
                    if (cachedTrailGeo.index) cachedTrailGeo.index.needsUpdate = true;
                    for (const key in cachedTrailGeo.attributes) {
                        cachedTrailGeo.attributes[key].needsUpdate = true;
                    }
                    segmentMesh.material.color.copy(ball.material.color);
                    segmentMesh.material.opacity = 0.7;
                    segmentMesh.scale.setScalar(1);
                } else {
                    const trailMat = new THREE.MeshBasicMaterial({
                        color: ball.material.color.clone(),
                        transparent: true,
                        opacity: 0.7,
                        blending: THREE.AdditiveBlending,
                        depthWrite: false
                    });
                    segmentMesh = new THREE.Mesh(cachedTrailGeo, trailMat);
                }

                segmentMesh.position.copy(ball.position);

                // Random vị trí và góc xoay ban đầu để đuôi nhìn như bụi năng lượng
                segmentMesh.position.x += (Math.random() - 0.5) * 0.4;
                segmentMesh.position.y += (Math.random() - 0.5) * 0.4;
                segmentMesh.position.z += (Math.random() - 0.5) * 0.4;
                segmentMesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);

                scene.add(segmentMesh);
                ballTrailSegments.push({ mesh: segmentMesh, life: 1.0, rotSpeed: (Math.random() - 0.5) * 10 });
            }
        }

        for (let i = ballTrailSegments.length - 1; i >= 0; i--) {
            const segment = ballTrailSegments[i];
            segment.life -= delta * 2.0; // Tốc độ mờ dần
            segment.mesh.material.opacity = Math.max(0, segment.life * 0.7);

            // Hiệu ứng thu nhỏ và xoay dần
            segment.mesh.scale.setScalar(Math.max(0.01, segment.life));
            segment.mesh.rotation.x += segment.rotSpeed * delta;
            segment.mesh.rotation.y += segment.rotSpeed * delta;

            if (segment.life <= 0) {
                scene.remove(segment.mesh);
                trailPool.push(segment.mesh);
                ballTrailSegments.splice(i, 1);
            }
        }

        // --- CẬP NHẬT BIÊN (BOUNDARIES) ---
        if (leftBoundaryLine && rightBoundaryLine && camera) {
            leftBoundaryLine.position.z = camera.position.z - 150;
            rightBoundaryLine.position.z = camera.position.z - 150;
            leftBoundaryLine.position.y = (typeof surfaceY !== 'undefined' ? surfaceY : 0.2) - 0.02;
            rightBoundaryLine.position.y = (typeof surfaceY !== 'undefined' ? surfaceY : 0.2) - 0.02;

            if (dynamicColorsEnabled) {
                const nowTime = clock.getElapsedTime();
                const hue = (nowTime * 0.2) % 1;
                tempColor.setHSL(hue, 0.8, 0.5);
                leftBoundaryLine.material.color.copy(tempColor);
                rightBoundaryLine.material.color.copy(tempColor);
            } else {
                leftBoundaryLine.material.color.setHex(0x00ffff);
                rightBoundaryLine.material.color.setHex(0x00ffff);
            }
        }

        // --- CẬP NHẬT ĐƯỜNG SÁNG CHẠY THEO NHỊP (NEON BOUNDARY PULSES) ---
        for (let i = boundaryPulses.length - 1; i >= 0; i--) {
            const pulse = boundaryPulses[i];
            pulse.mesh.position.z += pulse.speed * gameSpeed * delta; // Chạy nhanh về phía trước (Z âm) đồng bộ với game speed
            
            const distanceTraveled = Math.abs(pulse.mesh.position.z - pulse.startZ);
            pulse.opacity = 0.85 * (1.0 - (distanceTraveled / pulse.maxDistance));
            
            if (pulse.mesh.material) {
                pulse.mesh.material.opacity = Math.max(0, pulse.opacity);
            }
            
            if (pulse.opacity <= 0 || distanceTraveled >= pulse.maxDistance) {
                scene.remove(pulse.mesh);
                boundaryPulsePool.push(pulse.mesh);
                boundaryPulses.splice(i, 1);
            }
        }

        // --- CẬP NHẬT GẠCH & MÀU SẮC ---
        const time = clock.getElapsedTime();
        tiles.forEach(tile => {
            if (dynamicColorsEnabled) {
                const hue = (time * 0.2) % 1;
                tempColor.setHSL(hue, 0.8, 0.5);
                const hex = tempColor.getHex();

                tile.userData.themeColor = hex;
                if (tile.material) {
                    tile.material.color.setHex(hex);
                    if (tile.material.emissive) tile.material.emissive.copy(tempColor).multiplyScalar(0.2);
                }

                if (tile.userData.borderLine && tile.userData.borderLine.material) {
                    const rawApi = localStorage.getItem('graphicsAPI') || 'webgl';
                    const isWebGPU = (rawApi === 'd2ViZ3B1' || rawApi === 'webgpu');
                    tile.userData.borderLine.material.color.setHex(isWebGPU ? 0xffffff : hex);
                }
                const glowMesh = tile.getObjectByName("glowMesh");
                if (glowMesh && glowMesh.material) {
                    const glowMat = Array.isArray(glowMesh.material) ? glowMesh.material[1] : glowMesh.material;
                    if (glowMat) {
                        if (glowMat.uniforms) {
                            glowMat.uniforms.color.value.setHex(hex);
                        } else {
                            glowMat.color.setHex(hex);
                        }
                    }
                }
            }

            if (tile.userData.centerMeshFade && tile.userData.centerMesh && tile.userData.centerMesh.material) {
                tile.userData.centerMesh.material.opacity -= delta * 2.5; // Mờ dần trong ~0.4s
                if (tile.userData.centerMesh.material.opacity <= 0) {
                    tile.userData.centerMesh.material.opacity = 0.0;
                    tile.userData.centerMeshFade = false;
                }
            }

            // Cập nhật lò xo nhún cho gạch khi tiếp xúc bóng
            if (tile.userData.springY !== undefined && tile.userData.springVelocityY !== undefined) {
                let springY = tile.userData.springY;
                let springVelocityY = tile.userData.springVelocityY;

                if (springY !== 0 || springVelocityY !== 0) {
                    const k = 250; // Độ cứng lò xo
                    const c = 12;  // Hệ số cản / Damping
                    const mass = 1;

                    // Giới hạn delta time tránh giật lag nhảy nổ vật lý
                    const dt = Math.min(delta, 0.03);

                    const springForce = -k * springY;
                    const dampingForce = -c * springVelocityY;
                    const acceleration = (springForce + dampingForce) / mass;

                    springVelocityY += acceleration * dt;
                    springY += springVelocityY * dt;

                    if (Math.abs(springY) < 0.001 && Math.abs(springVelocityY) < 0.01) {
                        springY = 0;
                        springVelocityY = 0;
                    }

                    tile.userData.springY = springY;
                    tile.userData.springVelocityY = springVelocityY;
                }

                if (tile.userData.baseY === undefined) {
                    tile.userData.baseY = 0;
                }
                
                // Cập nhật vị trí Y (chỉ nhún xuống theo trục Y)
                tile.position.y = tile.userData.baseY + springY;

                // Cập nhật tỷ lệ scale mượt mà khi gạch thu nhỏ hoặc phóng to
                let currentScale = tile.userData.scale !== undefined ? tile.userData.scale : 1.0;
                const targetScale = typeof currentTileScale !== 'undefined' ? currentTileScale : 1.0;
                if (Math.abs(currentScale - targetScale) > 0.001) {
                    currentScale += (targetScale - currentScale) * Math.min(1.0, 10 * delta);
                    tile.userData.scale = currentScale;
                } else {
                    currentScale = targetScale;
                    tile.userData.scale = targetScale;
                }
                tile.scale.set(currentScale, currentScale, 1.0);

                // Cập nhật hitbox cho gạch nếu cơ chế Show Hitbox bật
                if (tile.userData.hitboxMesh) {
                    const hitboxMesh = tile.userData.hitboxMesh;
                    const isHitboxVisible = typeof showHitboxEnabled !== 'undefined' && showHitboxEnabled;
                    hitboxMesh.visible = isHitboxVisible;
                    if (isHitboxVisible) {
                        const scaleX = tileWidth + (ballRadius * 1.64 / currentScale);
                        const scaleY = tileLength + (ballRadius * 1.64 / currentScale);
                        hitboxMesh.scale.set(scaleX, scaleY, 0.4);
                    }
                }
            }

            // Animation spawn
            if (tile.userData.isEntering) {
                const animationMultiplier = Math.max(1.0, gameSpeed * 0.8);
                const enterSpeed = 1 - Math.exp(-12 * animationMultiplier * delta);

                if (spawnAnimationMode === 'slide' || spawnAnimationMode === 'mix') {
                    const targetZ = tile.userData.targetZ;
                    tile.position.z += (targetZ - tile.position.z) * enterSpeed;

                    const distToTargetZ = Math.abs(ball.position.z - targetZ);
                    if (distToTargetZ < 15 || ball.position.z < tile.position.z || Math.abs(tile.position.z - targetZ) < 0.1) {
                        tile.position.z = targetZ;
                        tile.userData.isEntering = false;
                    }
                }
            }
        });

        // --- CẬP NHẬT KHỐI DI CHUYỂN (TỪ MANAGER) ---
        if (typeof window.MovingBlocksManager !== 'undefined') {
            window.MovingBlocksManager.update(delta, gameSpeed, ball.position.z);
        }

        // --- CẬP NHẬT FAKE BLOCKS ---
        if (typeof window.FakeBlocksManager !== 'undefined') {
            window.FakeBlocksManager.update(delta, gameSpeed, ball, currentTileIndex);
        }

        // --- POOLING & LAZY SPAWN ---
        if (currentTileIndex > blocksBehindLimit) {
            const recycled = tiles.shift();
            if (spawnAnimationMode !== 'none') {
                recycled.userData.isExiting = true;
                exitingTiles.push(recycled);
            } else {
                pushTileToPool(recycled);
            }
            currentTileIndex--;
        }

        for (let i = exitingTiles.length - 1; i >= 0; i--) {
            const et = exitingTiles[i];

            // Khởi tạo exit state khi mới bắt đầu thoát
            if (et.userData.exitVelZ === undefined) {
                et.userData.exitVelZ = 0;
                et.userData.exitStartZ = et.position.z;
                // Khởi tạo exitOpacity từ borderLine (luôn visible dù body đã bị dim)
                const bl = et.userData.borderLine;
                et.userData.exitOpacity = (bl && bl.material) ? (bl.material.opacity || 1.0) : 1.0;
            }

            // Tăng tốc dần về phía sau (hướng camera) — ease-in
            et.userData.exitVelZ += 60 * delta;
            et.position.z += et.userData.exitVelZ * delta;

            // Fade tất cả các phần hiển thị
            const fadeDelta = 2.2 * delta;
            et.userData.exitOpacity = Math.max(0, et.userData.exitOpacity - fadeDelta);
            const op = et.userData.exitOpacity;

            // Body (có thể đã dim rất thấp, fade cùng)
            if (et.material) et.material.opacity = Math.max(0, et.material.opacity - fadeDelta);

            // Viền — luôn fade để animation thấy được
            if (et.userData.borderLine && et.userData.borderLine.material) {
                et.userData.borderLine.material.opacity = op;
            }

            // Center dot
            if (et.userData.centerMesh && et.userData.centerMesh.material) {
                et.userData.centerMesh.material.opacity = Math.max(0, et.userData.centerMesh.material.opacity - fadeDelta);
            }

            // Glow
            const glowMesh = et.getObjectByName("glowMesh");
            if (glowMesh && glowMesh.material) {
                const glowMat = Array.isArray(glowMesh.material) ? glowMesh.material[1] : glowMesh.material;
                if (glowMat) {
                    if (glowMat.uniforms) {
                        glowMat.uniforms.opacityMultiplier.value = Math.max(0, glowMat.uniforms.opacityMultiplier.value - fadeDelta);
                    } else {
                        glowMat.opacity = Math.max(0, glowMat.opacity - fadeDelta * 0.85);
                    }
                }
            }

            // Thu hồi khi viền đã fade hết hoặc đã trượt ra quá xa
            const camZ = typeof camera !== 'undefined' ? camera.position.z : et.userData.exitStartZ + 20;
            if (op <= 0 || et.position.z > camZ + 5) {
                delete et.userData.exitVelZ;
                delete et.userData.exitStartZ;
                delete et.userData.exitOpacity;
                pushTileToPool(et);
                exitingTiles.splice(i, 1);
            }
        }

        // --- CƠ CHẾ SPAWN MỚI: CHỈ LOAD KHỐI KHI VÀO VÙNG NHÌN THẤY ĐƯỢC ---
        // Thay vì load cố định số lượng khối, tính toán khoảng cách hiển thị tối đa (View Distance)
        const viewDistance = Math.max(50, blocksAheadLimit * 10);

        while (lastTileZ > ball.position.z - viewDistance) {
            // Tuân thủ nghiêm ngặt giới hạn render tối đa từ Settings để đảm bảo hiệu năng (tránh giật lag)
            if (tiles.length - currentTileIndex >= blocksAheadLimit) break;
            const spawned = spawnTile(false);
            if (spawned === false) break;
        }

        // Dự phòng bắt buộc: Đảm bảo luôn có tối thiểu vài khối phía trước để tránh lỡ nhịp nhảy
        while (tiles.length - currentTileIndex < Math.min(3, blocksAheadLimit)) {
            const spawned = spawnTile(false);
            if (spawned === false) break;
        }

        // --- CẬP NHẬT SÓNG XUNG KÍCH ---
        const camZ = typeof camera !== 'undefined' ? camera.position.z : (ball ? ball.position.z + 10 : 0);
        for (let i = shockwaves.length - 1; i >= 0; i--) {
            const sw = shockwaves[i];
            
            // Dọn dẹp lập tức nếu tile mục tiêu đã bị thu hồi/ẩn, hoặc sóng đã trôi ra sau camera
            const isTileInactive = sw.targetTile && (!sw.targetTile.parent || !sw.targetTile.visible);
            const isBehindCam = sw.mesh.position.z > camZ + 5;
            
            if (isTileInactive || isBehindCam) {
                sw.mesh.visible = false;
                shockwavePool.push(sw.mesh);
                shockwaves.splice(i, 1);
                continue;
            }
            
            // Tính toán tỷ lệ lan rộng hiện tại (từ 0 đến 1)
            const startScale = sw.startScale || 1.0;
            const progress = Math.min(1.0, (sw.scale - startScale) / (sw.maxScale - startScale + 0.001));
            
            // Tốc độ lan nở có quán tính (chậm dần khi lan rộng - ease-out)
            const currentSpeed = sw.speed * (1.0 - progress * 0.45);
            sw.scale += currentSpeed * delta;
            
            sw.mesh.scale.set(sw.scale, sw.scale, 1);
            
            // Đồng bộ vị trí thực tế của sóng theo tile (cho cả trục X di động và trục Z khi trượt thoát)
            if (sw.targetTile && sw.targetTile.parent) {
                sw.mesh.position.x = sw.targetTile.position.x;
                sw.mesh.position.z = sw.targetTile.position.z;
            }
            
            // Fade out mượt bằng hàm cosine bình phương (smooth step-down)
            // Bắt đầu nhanh, kết thúc cực kỳ nhẹ nhàng và trong suốt dần, không thô cụt
            const fadeFactor = Math.pow(Math.cos(progress * Math.PI / 2), 2.0);
            sw.mesh.material.opacity = fadeFactor;

            if (progress >= 1.0 || fadeFactor <= 0.001) {
                sw.mesh.visible = false;
                shockwavePool.push(sw.mesh);
                shockwaves.splice(i, 1);
            }
        }



        // --- VẬT LÝ BÓNG ---
        if (isVictoryTransition) {
            victoryTimeElapsed += delta;
            
            const progress = Math.min(1.0, victoryTimeElapsed / 2.0);
            const targetCeiling = 5.5; // Chiều cao trần nhảy tối đa như lúc chơi bình thường
            
            // Bay xa và cao dần lên trần max theo đồ thị hình sin mượt mà, không bị rơi đột ngột
            ball.position.y = minFloor + Math.sin(progress * Math.PI / 2) * targetCeiling;
            
            const flySpeedZ = baseBallVelocityZ * 1.5; // Bay vút nhanh về phía trước
            ball.position.z += flySpeedZ * delta;
            
            // Giảm dần độ bám đuôi camera trục Z
            victoryCameraDecay = Math.max(0.0, victoryCameraDecay - delta * 0.85);
            
            if (victoryTimeElapsed >= 2.0) {
                isVictoryTransition = false;
                gameVictory();
            }
        } else if (!isFalling) {
            jumpElapsedTime += delta;

            // Fix 1: Dùng vòng lặp while để xử lý bù trừ khi tốc độ game quá nhanh
            // (Thời gian bay 1 nhịp bé hơn 1 khung hình render delta)
            while (jumpElapsedTime >= flightTime && !isFalling && !isVictoryTransition) {
                let targetTile = tiles[currentTileIndex + 1];
                if (targetTile) {
                    let diffX = Math.abs(ball.position.x - targetTile.position.x);

                    if (window.AutoplayManager) {
                        diffX = window.AutoplayManager.applyPerfectAim(diffX, ball, targetTile);
                    }

                    if (typeof window.BotAssistManager !== 'undefined' && typeof botAssistEnabled !== 'undefined' && botAssistEnabled) {
                        diffX = window.BotAssistManager.applyAssist(diffX, ball, targetTile, currentTileScale);
                    }

                    const activeScale = targetTile.userData.scale || 1.0; // Đã bao gồm cả base scale và dynamic scale
                    const maxAllowedOffset = (tileWidth * activeScale / 2) + (ballRadius * 0.82);

                    if (diffX < maxAllowedOffset) {
                        const isPerfect = diffX < 0.6;

                        if (isPerfect) {
                            nonPerfectStreak = 0;
                            comboCount++;
                            if (comboCount >= 6) {
                                currentTileScale = Math.min(1.0, currentTileScale + 0.02);
                            }
                            score += 1 + Math.min(20, comboCount);


                            comboEl.innerText = `PERFECT x${comboCount}`;
                            comboEl.style.color = comboCount >= 15 ? "#ff00ff" : (comboCount >= 8 ? "#ffaa00" : "#ffff00");
                            comboEl.classList.remove('active');
                            void comboEl.offsetWidth;
                            comboEl.classList.add('active');

                            if (targetTile.userData && targetTile.userData.centerMesh) {
                                targetTile.userData.centerMesh.visible = true;
                                if (targetTile.userData.centerMesh.material) targetTile.userData.centerMesh.material.opacity = 1.0;
                                targetTile.userData.centerMeshFade = true;
                            }
                        } else {
                            nonPerfectStreak++;
                            if (nonPerfectStreak > 10) {
                                currentTileScale = Math.max(0.4, currentTileScale - 0.02);
                            }
                            comboCount = 0;
                            score += 1;
                            comboEl.classList.remove('active');
                            comboEl.innerText = "";
                        }

                        if (lastDisplayedScore !== score) {
                            scoreEl.innerText = score;
                            lastDisplayedScore = score;
                        }
                        if (perfectStreakHud && lastDisplayedPerfectHUD !== comboCount) {
                            perfectStreakHud.innerText = comboCount;
                            lastDisplayedPerfectHUD = comboCount;
                        }

                        const landedTile = tiles[currentTileIndex + 1];
                        if (landedTile && landedTile.userData) {
                            if (tileBounceEnabled) {
                                landedTile.userData.springVelocityY = -14.0;
                            }
                        }
                        jumpStartRawZ = landedTile.userData.isEntering && (spawnAnimationMode === 'slide' || spawnAnimationMode === 'mix') ? landedTile.userData.targetZ : landedTile.position.z;
                        const driftRatio = diffX / (tileWidth * activeScale / 2);
                        let shockwaveScale = 1.0;

                        if (driftRatio > 0.85) {
                            shockwaveScale = 1.35;
                            const originalX = targetTile.position.x;
                            targetTile.position.x += (ball.position.x > targetTile.position.x ? 0.15 : -0.15);
                            setTimeout(() => {
                                if (targetTile && !targetTile.userData.isMoving) targetTile.position.x = originalX;
                            }, 80);
                        }

                        const tileColor = targetTile.userData.themeColor || 0x00ffff;
                        triggerShockwave(targetTile, tileColor, shockwaveScale, activeScale);
                        dimLandedTile(targetTile);

                        currentTileIndex++;
                        totalTilesJumped++;

                        const landedTileVal = tiles[currentTileIndex];
                        if (window.chosenPlayMode === 'normal' && landedTileVal && landedTileVal.userData && landedTileVal.userData.isFinalStarTile) {
                            isVictoryTransition = true;
                            victoryTimeElapsed = 0;
                            ballVictoryVelocityY = 32; // Khởi động nhảy cao
                            if (typeof starCollectAudio !== 'undefined' && starCollectAudio) {
                                starCollectAudio.currentTime = 0;
                                starCollectAudio.play().catch(() => {});
                            } else if (newBestAudio) {
                                newBestAudio.currentTime = 0;
                                newBestAudio.play().catch(() => {});
                            }
                            fadeOutGameAudio(1.2);
                        } else {
                            const currentTile = tiles[currentTileIndex];
                            if (currentTile && currentTile.userData.isRoundStart) {
                                activeEndlessMode = true;
                                activeRoundCount = currentTile.userData.roundValue;

                                if (audio) {
                                    audio.currentTime = 0;
                                    accumulatedSongTime = 0;
                                    audio.play().catch(() => { });
                                    if (roundStartAudio) roundStartAudio.play().catch(() => { });
                                }
                            }

                            jumpElapsedTime -= flightTime;
                            calculateNextParabola(currentTileIndex);
                        }

                        if (targetTile.material.emissive) targetTile.material.emissive.setHex(0x00ffff);
                        const capturedTile = targetTile;
                        setTimeout(() => {
                            if (capturedTile && capturedTile.material && capturedTile.material.emissive) {
                                capturedTile.material.emissive.setHex(capturedTile.userData.themeColor === 0xff00ff ? 0x220022 : 0x001122);
                            }
                        }, 150);
                    } else {
                        isFalling = true;
                        // Cắt giảm vận tốc rơi tự do ban đầu để người chơi có thêm thời gian phản xạ cứu bóng
                        fallVelocityY = Math.max(-22, currentBounceVelocityY + currentGravity * flightTime);
                        fallVelocityZ = ballVelocityZ;
                        fallVelocityX = (ballTargetX - ball.position.x) * 15;
                    }
                } else {
                    if (window.chosenPlayMode === 'normal' && currentTileIndex === tiles.length - 1) {
                        gameVictory();
                    } else {
                        gameOver();
                    }
                    return;
                }
            }

            if (!isFalling) {
                ball.position.z = jumpStartRawZ + ballVelocityZ * jumpElapsedTime;
                ball.position.y = minFloor + currentBounceVelocityY * jumpElapsedTime + 0.5 * currentGravity * jumpElapsedTime * jumpElapsedTime;

                const targetAudioSpeed = Math.min(3.0, gameSpeed);
                if (audio && !isFailTransition && Math.abs(audio.playbackRate - targetAudioSpeed) > 0.001) {
                    audio.playbackRate += (targetAudioSpeed - audio.playbackRate) * Math.min(1.0, 4.0 * delta);
                }
            }
        } else {
            let slowMoFactor = 1.0;
            if (isFailTransition || (typeof isHoldExitTransition !== 'undefined' && isHoldExitTransition)) {
                let speedRatio = Math.max(0.0, 1.0 - Math.min(1.0, failTimeElapsed / failDuration));
                slowMoFactor = speedRatio;
            } else if (audio && isFailTransition) {
                slowMoFactor = audio.playbackRate / gameSpeed;
            }
            let effectiveDelta = delta * slowMoFactor;

            ball.position.y += fallVelocityY * effectiveDelta;
            ball.position.z += fallVelocityZ * effectiveDelta;
            // Cập nhật fallVelocityX liên tục theo vị trí điều khiển thực tế của người chơi để vẫn có thể lái bóng khi đang rơi tự do
            fallVelocityX = (ballTargetX - ball.position.x) * 15;
            ball.position.x += fallVelocityX * effectiveDelta;
            fallVelocityY += -65 * effectiveDelta;

            // Kiểm tra cứu nguy bóng rơi (Hitbox kéo dài xuống Neon Glow)
            let targetTile = tiles[currentTileIndex + 1];
            // Hitbox vùng sáng cố định là 1.5 bất kể cài đặt đồ họa tắt hay giảm
            const glowHeightHitbox = 1.5;
            const bottomY = -currentTileThickness / 2 - glowHeightHitbox + ballRadius;

            if (targetTile && !(typeof isHoldExitTransition !== 'undefined' && isHoldExitTransition)) {
                const activeScale = targetTile.userData.scale || 1.0;
                // Tăng độ rộng hitbox cứu bóng (X, Z) để khớp trực quan với phần viền sáng Neon Glow mở rộng
                const maxAllowedOffset = (tileWidth * activeScale / 2) + (ballRadius * 1.25);
                const diffX = Math.abs(ball.position.x - targetTile.position.x);

                // Check X bounds
                const isXCol = diffX < maxAllowedOffset;

                // Check Z bounds
                const diffZ = Math.abs(ball.position.z - targetTile.position.z);
                const isZCol = diffZ < (tileLength * activeScale / 2) + (ballRadius * 1.25);

                // Check Y bounds (from top of tile down to bottom of glow)
                const topY = minFloor;
                const isYCol = ball.position.y >= bottomY && ball.position.y <= topY + 0.1;

                if (isXCol && isZCol && isYCol && !isFailTransition) {
                    // Cứu bóng thành công (Hitbox Glow Mesh) — Nhảy TRỰC TIẾP tiếp sang gạch tiếp theo (Tiles Hop style)
                    isFalling = false;
                    isFailTransition = false;
                    failTimeElapsed = 0;

                    if (audio) {
                        audio.playbackRate = Math.min(3.0, gameSpeed);
                    }
                    if (gainNode) {
                        gainNode.gain.value = typeof isGameMuted !== 'undefined' && isGameMuted ? 0 : gameVolume;
                    }

                    // Đánh giá điểm / combo cho cú nẩy cứu bóng
                    const isPerfect = diffX < 0.6;
                    if (isPerfect) {
                        nonPerfectStreak = 0;
                        comboCount++;
                        if (comboCount >= 6) {
                            currentTileScale = Math.min(1.0, currentTileScale + 0.02);
                        }
                        score += 1 + Math.min(20, comboCount);

                        comboEl.innerText = `PERFECT x${comboCount}`;
                        comboEl.style.color = comboCount >= 15 ? "#ff00ff" : (comboCount >= 8 ? "#ffaa00" : "#ffff00");
                        comboEl.classList.remove('active');
                        void comboEl.offsetWidth;
                        comboEl.classList.add('active');

                        if (targetTile.userData && targetTile.userData.centerMesh) {
                            targetTile.userData.centerMesh.visible = true;
                            if (targetTile.userData.centerMesh.material) targetTile.userData.centerMesh.material.opacity = 1.0;
                            targetTile.userData.centerMeshFade = true;
                        }
                    } else {
                        nonPerfectStreak++;
                        if (nonPerfectStreak > 10) {
                            currentTileScale = Math.max(0.4, currentTileScale - 0.02);
                        }
                        comboCount = 0;
                        score += 1;
                        comboEl.classList.remove('active');
                        comboEl.innerText = "";
                    }

                    if (lastDisplayedScore !== score) {
                        scoreEl.innerText = score;
                        lastDisplayedScore = score;
                    }
                    if (perfectStreakHud && lastDisplayedPerfectHUD !== comboCount) {
                        perfectStreakHud.innerText = comboCount;
                        lastDisplayedPerfectHUD = comboCount;
                    }

                    if (tileBounceEnabled) {
                        targetTile.userData.springVelocityY = -14.0;
                    }

                    jumpStartRawZ = targetTile.userData.isEntering && (spawnAnimationMode === 'slide' || spawnAnimationMode === 'mix') ? targetTile.userData.targetZ : targetTile.position.z;

                    const driftRatio = diffX / (tileWidth * activeScale / 2);
                    let shockwaveScale = 1.0;

                    if (driftRatio > 0.85) {
                        shockwaveScale = 1.35;
                        const originalX = targetTile.position.x;
                        targetTile.position.x += (ball.position.x > targetTile.position.x ? 0.15 : -0.15);
                        setTimeout(() => {
                            if (targetTile && !targetTile.userData.isMoving) targetTile.position.x = originalX;
                        }, 80);
                    }

                    const tileColor = targetTile.userData.themeColor || 0x00ffff;
                    triggerShockwave(targetTile, tileColor, shockwaveScale, activeScale);
                    dimLandedTile(targetTile);

                    currentTileIndex++;
                    totalTilesJumped++;

                    const landedTileVal = tiles[currentTileIndex];
                    if (window.chosenPlayMode === 'normal' && landedTileVal && landedTileVal.userData && landedTileVal.userData.isFinalStarTile) {
                        isVictoryTransition = true;
                        victoryTimeElapsed = 0;
                        ballVictoryVelocityY = 32;
                        if (typeof starCollectAudio !== 'undefined' && starCollectAudio) {
                            starCollectAudio.currentTime = 0;
                            starCollectAudio.play().catch(() => {});
                        } else if (newBestAudio) {
                            newBestAudio.currentTime = 0;
                            newBestAudio.play().catch(() => {});
                        }
                        fadeOutGameAudio(1.2);
                    } else {
                        const currentTile = tiles[currentTileIndex];
                        if (currentTile && currentTile.userData.isRoundStart) {
                            activeEndlessMode = true;
                            activeRoundCount = currentTile.userData.roundValue;

                            if (audio) {
                                audio.currentTime = 0;
                                accumulatedSongTime = 0;
                                audio.play().catch(() => { });
                                if (roundStartAudio) roundStartAudio.play().catch(() => { });
                            }
                        }

                        jumpElapsedTime = 0;
                        calculateRescueParabola(currentTileIndex);
                    }

                    if (targetTile.material && targetTile.material.emissive) targetTile.material.emissive.setHex(0x00ffff);
                    const capturedTile = targetTile;
                    setTimeout(() => {
                        if (capturedTile && capturedTile.material && capturedTile.material.emissive) {
                            capturedTile.material.emissive.setHex(capturedTile.userData.themeColor === 0xff00ff ? 0x220022 : 0x001122);
                        }
                    }, 150);
                } else if (ball.position.y < -10 && !isFailTransition) {
                    // Nếu đã rơi qua đáy glow, bắt đầu fail transition (1.5s chờ game over)
                    isFailTransition = true;
                    failTimeElapsed = 0;
                    if (audio) {
                        initialFailSpeed = audio.playbackRate;
                        audio.preservesPitch = false;
                        audio.mozPreservesPitch = false;
                        audio.webkitPreservesPitch = false;
                    }
                }
            } else if (!isFailTransition && !(typeof isHoldExitTransition !== 'undefined' && isHoldExitTransition)) {
                // Trường hợp không còn gạch tiếp theo
                isFailTransition = true;
                failTimeElapsed = 0;
                if (audio) {
                    initialFailSpeed = audio.playbackRate;
                    audio.preservesPitch = false;
                    audio.mozPreservesPitch = false;
                    audio.webkitPreservesPitch = false;
                }
            }

            if (isFailTransition || (typeof isHoldExitTransition !== 'undefined' && isHoldExitTransition)) {
                failTimeElapsed += delta;
                let speedRatio = Math.max(0.0, 1.0 - Math.min(1.0, failTimeElapsed / failDuration));

                if (audio) {
                    let targetRate = initialFailSpeed * speedRatio;
                    if (targetRate > 0.0625) {
                        audio.playbackRate = targetRate;
                    } else {
                        audio.playbackRate = 0.0625;
                    }
                    if (speedRatio <= 0 && !audio.paused) {
                        audio.pause();
                    }
                }

                if (gainNode) {
                    gainNode.gain.value = Math.max(0.0, (typeof isGameMuted !== 'undefined' && isGameMuted ? 0 : gameVolume) * speedRatio);
                }

                const totalFailTime = failDuration + (typeof failWaitDuration !== 'undefined' ? failWaitDuration : 0.22);
                if (failTimeElapsed >= totalFailTime) {
                    if (typeof isHoldExitTransition !== 'undefined' && isHoldExitTransition) {
                        isHoldExitTransition = false;
                        returnToMenu();
                    } else {
                        isFailTransition = false;
                        gameOver();
                    }
                    return;
                }
            }
        }

        if (!isFalling) {
            const bypassRawInput = window.AutoplayManager ? window.AutoplayManager.shouldBypassInput() : false;
            if (typeof rawInputEnabled !== 'undefined' && rawInputEnabled && !bypassRawInput) {
                ball.position.x = ballTargetX; // Cập nhật bóng vị trí 1:1 tức thời (0 độ trễ)
            } else {
                const lerpSpeed = window.AutoplayManager ? window.AutoplayManager.getLerpSpeed(gameSpeed, sensitivity) : 15 * sensitivity * Math.max(1.0, gameSpeed * 0.8);
                const lerpFactor = 1 - Math.exp(-lerpSpeed * delta);
                ball.position.x += (ballTargetX - ball.position.x) * lerpFactor;
            }
        }

        // --- CẬP NHẬT MÀU BÓNG (THEO COMBO) ---
        if (ball && ball.material) {
            let targetBallColor = 0x00ffff; // Cyan mặc định
            let targetEmissiveColor = 0x0088cc;

            if (comboCount >= 15) { targetBallColor = 0xff00ff; targetEmissiveColor = 0xaa00aa; } // Tím
            else if (comboCount >= 8) { targetBallColor = 0xffaa00; targetEmissiveColor = 0xaa5500; } // Cam
            else if (comboCount >= 6) { targetBallColor = 0xffff00; targetEmissiveColor = 0xaaaa00; } // Vàng

            tempColor.setHex(targetBallColor);
            ball.material.color.lerp(tempColor, 15 * delta); // Hiệu ứng chuyển màu mượt mà (Fade)
            if (ball.material.emissive) {
                tempColor.setHex(targetEmissiveColor);
                ball.material.emissive.lerp(tempColor, 15 * delta);
            }
        }

        // --- CẬP NHẬT PHÁT SÁNG BÓNG (BALL GLOW) ---
        if (typeof ballGlowMesh !== 'undefined' && ballGlowMesh && typeof ballGlowLight !== 'undefined' && ballGlowLight) {
            let targetGlowOpacity = 0;
            let targetGlowIntensity = 0;

            if (typeof ballGlowEnabled !== 'undefined' && ballGlowEnabled && comboCount >= 6 && !isFailTransition && !(typeof isHoldExitTransition !== 'undefined' && isHoldExitTransition)) {
                const time = clock.getElapsedTime();
                // Đổi màu đồng bộ theo mốc combo (Vàng -> Cam -> Tím)
                let glowColor = comboCount >= 15 ? 0xff00ff : (comboCount >= 8 ? 0xffaa00 : 0xffff00);

                ballGlowMesh.material.color.setHex(glowColor);
                ballGlowLight.color.setHex(glowColor);

                targetGlowOpacity = 0.45 + Math.sin(time * 20) * 0.15; // Hiệu ứng thở (chớp nháy), dịu hơn
                targetGlowIntensity = 2.5 + Math.sin(time * 20) * 1.0;

                const scalePulse = 1.0 + Math.sin(time * 25) * 0.03; // Mạch đập nhẹ nhàng hơn
                ballGlowMesh.scale.set(scalePulse, scalePulse, scalePulse);
            }

            ballGlowMesh.material.opacity += (targetGlowOpacity - ballGlowMesh.material.opacity) * 10 * delta;
            ballGlowLight.intensity += (targetGlowIntensity - ballGlowLight.intensity) * 10 * delta;
        }

        // --- CAMERA ---
        if (ball && gameStarted) {
            const targetCamZ = ball.position.z + 10;
            const targetCamY = 6.0;
            const sideLimit = 4.5;
            let targetCamX = Math.max(-sideLimit, Math.min(sideLimit, ball.position.x));

            const decayFactor = (typeof victoryCameraDecay !== 'undefined' ? victoryCameraDecay : 1.0);

            if (Math.abs(camera.position.z - targetCamZ) > 50 && !(typeof isVictoryTransition !== 'undefined' && isVictoryTransition)) {
                // Teleport nếu bị lạc quá xa (reset scene)
                camera.position.set(targetCamX, targetCamY, targetCamZ);
                camVelX = 0; camVelY = 0; camVelZ = 0;
            } else {
                // --- SMOOTH DAMP (Critically-Damped Spring) ---
                // Công thức: giống Unity SmoothDamp — tạo quán tính ease-in-out
                // mà không thay đổi tốc độ hội tụ tổng thể.
                // smoothTime nhỏ = bám nhanh hơn. Công thức: omega = 2/smoothTime
                const smoothTimeX = 0.5;                              // Trục X: mượt hơn (ít bám sát X hơn)
                const smoothTimeZ = 0.333 / (gameSpeed * decayFactor + 0.001); // Trục Z: bám theo speed

                // Clamp smoothTime để tránh phân kỳ
                const dtX = Math.min(delta, 0.1);
                const dtZ = Math.min(delta, 0.1);

                const omegaX = 2.0 / smoothTimeX;
                const omegaZ = 2.0 / Math.max(0.05, smoothTimeZ);

                // SmoothDamp axis X
                const xX = omegaX * dtX;
                const expX = 1.0 / (1.0 + xX + 0.48 * xX * xX + 0.235 * xX * xX * xX);
                const deltaX = camera.position.x - targetCamX;
                const tempVX = (camVelX + omegaX * deltaX) * dtX;
                camVelX = (camVelX - omegaX * tempVX) * expX;
                camera.position.x = targetCamX + (deltaX + tempVX) * expX;

                // SmoothDamp axis Y
                const xY = omegaZ * dtZ;
                const expY = 1.0 / (1.0 + xY + 0.48 * xY * xY + 0.235 * xY * xY * xY);
                const deltaY = camera.position.y - targetCamY;
                const tempVY = (camVelY + omegaZ * deltaY) * dtZ;
                camVelY = (camVelY - omegaZ * tempVY) * expY;
                camera.position.y = targetCamY + (deltaY + tempVY) * expY;

                // SmoothDamp axis Z
                const xZ = omegaZ * dtZ;
                const expZ = 1.0 / (1.0 + xZ + 0.48 * xZ * xZ + 0.235 * xZ * xZ * xZ);
                const deltaZ = camera.position.z - targetCamZ;
                const tempVZ = (camVelZ + omegaZ * deltaZ) * dtZ;
                camVelZ = (camVelZ - omegaZ * tempVZ) * expZ;
                camera.position.z = targetCamZ + (deltaZ + tempVZ) * expZ;
            }

            // Dùng camera.position.z - 18 thay vì ball.position.z - 8 để tránh hiện tượng camera giật/dịch chuyển đột ngột khi bóng giải cứu (teleport Z)
            camera.lookAt(camera.position.x, 1.6, camera.position.z - 18);
        }

        // --- FLOATING ORIGIN DETECT & RESET ---
        if (gameStarted && !(typeof isVictoryTransition !== 'undefined' && isVictoryTransition)) {
            checkAndApplyFloatingOrigin();
        }
    }

    // --- CẬP NHẬT MÀU SẮC HÌNH NỀN ---
    if (selectedBackground === 'japan' && bgMesh && bgMaterial) {
        let activeTile = tiles[currentTileIndex];
        let tileColorHex = 0x00ffff;
        if (activeTile && activeTile.userData && activeTile.userData.themeColor) {
            tileColorHex = activeTile.userData.themeColor;
        }

        const baseGray = 0.10;
        tempColor.setHex(tileColorHex).multiplyScalar(0.07);
        tempColor.r += baseGray;
        tempColor.g += baseGray;
        tempColor.b += baseGray;
        targetBgColor.copy(tempColor);

        const lerpSpeed = 3.0;
        const lerpFactor = 1 - Math.exp(-lerpSpeed * delta);
        currentBgColor.lerp(targetBgColor, lerpFactor);
        
        // Xoay texture trên GPU (Không vẽ lại Canvas, không upload texture lên GPU => 0% CPU cost!)
        const time = clock.getElapsedTime();
        portalTexture.rotation = time * 0.12;
        bgMaterial.color.copy(currentBgColor);

        // Đồng bộ vị trí hình nền bám sát camera ở khoảng cách 15 đơn vị
        const distance = 15;
        bgMesh.position.copy(camera.position);
        bgMesh.quaternion.copy(camera.quaternion);
        bgMesh.translateZ(-distance);

        if (scene && scene.fog) {
            scene.fog.color.copy(currentBgColor);
        }
        if (renderer) {
            renderer.setClearColor(scene.fog.color);
        }
    }

    renderer.render(scene, camera);
}

// --- DỌN DẸP ĐỐI TƯỢNG CŨ ---
function cleanUpOldObjects() {
    shockwaves.forEach(sw => {
        sw.mesh.visible = false;
        shockwavePool.push(sw.mesh);
    });
    shockwaves = [];

    perfectRings.forEach(ring => {
        scene.remove(ring.mesh);
        perfectRingPool.push(ring.mesh);
    });
    perfectRings = [];

    ballTrailSegments.forEach(segment => {
        scene.remove(segment.mesh);
        trailPool.push(segment.mesh);
    });
    ballTrailSegments = [];

    exitingTiles.forEach(tile => {
        pushTileToPool(tile);
    });
    exitingTiles = [];

    if (typeof window.FakeBlocksManager !== 'undefined') {
        window.FakeBlocksManager.reset();
    }
    if (typeof window.MovingBlocksManager !== 'undefined') {
        window.MovingBlocksManager.reset();
    }
}

function fadeOutGameAudio(durationSeconds = 1.0) {
    try {
        if (typeof audioCtx !== 'undefined' && audioCtx && typeof gainNode !== 'undefined' && gainNode && audioCtx.state !== 'suspended') {
            const now = audioCtx.currentTime;
            gainNode.gain.cancelScheduledValues(now);
            gainNode.gain.setValueAtTime(gainNode.gain.value, now);
            gainNode.gain.linearRampToValueAtTime(0, now + durationSeconds);
        }
        if (audio) {
            let startVol = audio.volume;
            let startTime = performance.now();
            let interval = setInterval(() => {
                let elapsed = (performance.now() - startTime) / 1000;
                if (elapsed >= durationSeconds) {
                    audio.volume = 0;
                    audio.pause();
                    clearInterval(interval);
                } else {
                    audio.volume = startVol * (1 - elapsed / durationSeconds);
                }
            }, 50);
        }
    } catch (e) {
        if (audio) audio.pause();
    }
}

// --- GAME VICTORY ---
async function gameVictory() {
    isPlaying = false;
    const maxSpeedReached = gameSpeed;
    isVictoryTransition = false;
    victoryTimeElapsed = 0;
    ballVictoryVelocityY = 0;
    victoryCameraDecay = 1.0;
    camVelX = 0; camVelY = 0; camVelZ = 0;

    let oldBest = 0;
    try {
        const cached = cachedBestScores[selectedSongIndex];
        if (cached !== undefined && cached !== null) {
            oldBest = typeof cached === 'number' ? cached : (parseInt(cached, 10) || 0);
        } else {
            oldBest = await getLocalBestScore(selectedSongIndex);
        }
    } catch (e) {
        oldBest = 0;
    }

    gameSpeed = 1.0;
    comboCount = 0;
    nonPerfectStreak = 0;
    currentTileScale = 1.0;
    currentBeatIndex = 0;
    isEndlessMode = false;
    endlessBufferCount = 0;
    roundCount = 0;
    activeRoundCount = 0;
    activeEndlessMode = false;
    blocksSinceLastRound = 0;
    targetSpeed = 1.0;
    totalTilesJumped = 0;
    comboEl.classList.remove('active');
    comboEl.innerText = "";

    if (audio) {
        audio.pause();
        audio.currentTime = 0;
        audio.playbackRate = 1.0;
    }

    tiles.forEach(tile => {
        pushTileToPool(tile);
    });
    tiles = [];

    cleanUpOldObjects();

    const menuBtnElement = document.getElementById('menu-btn');
    const restartBtnElement = document.getElementById('restart-btn');
    if (menuBtnElement) {
        menuBtnElement.classList.add('opacity-0', 'pointer-events-none');
        menuBtnElement.classList.remove('opacity-100');
    }
    if (restartBtnElement) {
        restartBtnElement.innerText = t('btn_endless') || "ENDLESS (KHÔNG HỒI KẾT)";
        restartBtnElement.setAttribute('data-action', 'endless');
        if (window.AsianModeManager && window.AsianModeManager.isEnabled) {
            restartBtnElement.className = "flex-1 py-3 text-xs font-black text-white bg-gradient-to-r from-red-600 via-rose-600 to-purple-800 hover:from-red-500 hover:via-rose-500 hover:to-purple-700 rounded-xl font-orbitron uppercase transition-all duration-200 transform hover:scale-105 opacity-0 pointer-events-none shadow-[0_0_25px_rgba(225,29,72,0.8)] border border-red-500/50";
        } else if (window.HardModeManager && window.HardModeManager.isEnabled) {
            restartBtnElement.className = "flex-1 py-3 text-xs font-black text-white bg-gradient-to-r from-yellow-500 via-orange-500 to-red-600 hover:from-yellow-400 hover:via-orange-400 hover:to-red-500 rounded-xl font-orbitron uppercase transition-all duration-200 transform hover:scale-105 opacity-0 pointer-events-none shadow-[0_0_20px_rgba(239,68,68,0.6)] border border-orange-400/30";
        } else if (window.EasyModeManager && window.EasyModeManager.isEnabled) {
            restartBtnElement.className = "flex-1 py-3 text-xs font-black text-black bg-gradient-to-r from-emerald-400 via-teal-400 to-green-500 hover:from-emerald-300 hover:via-teal-300 hover:to-green-400 rounded-xl font-orbitron uppercase transition-all duration-200 transform hover:scale-105 opacity-0 pointer-events-none shadow-[0_0_20px_rgba(16,185,129,0.6)] border border-emerald-400/30";
        } else {
            restartBtnElement.className = "flex-1 py-3 text-xs font-black text-black bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 rounded-xl font-orbitron uppercase transition-all duration-200 transform hover:scale-105 opacity-0 pointer-events-none";
        }
    }

    // Hiển thị UI ban đầu
    finalScoreEl.innerText = "0";
    if (window.AsianModeManager && window.AsianModeManager.isEnabled) {
        finalScoreEl.className = "text-3xl text-red-500 font-bold neon-glow-red animate-pulse";
    } else if (window.HardModeManager && window.HardModeManager.isEnabled) {
        finalScoreEl.className = "text-3xl text-orange-500 font-bold neon-glow-orange animate-pulse";
    } else if (window.EasyModeManager && window.EasyModeManager.isEnabled) {
        finalScoreEl.className = "text-3xl text-green-400 font-bold neon-glow-green animate-pulse";
    } else {
        finalScoreEl.className = "text-3xl text-cyan-400 font-bold";
    }
    highScoreDisplay.classList.add('hidden');
    finalSpeedEl.innerText = ""; // Ẩn tốc độ tối đa cho chế độ Thường
    speedEl.innerText = `${t('speed')} 1.00x`;
    lastDisplayedSpeedText = `${t('speed')} 1.00x`;
    if (perfectStreakHud) perfectStreakHud.innerText = "0";

    // Đổi giao diện Game Over sang Hoàn thành (Victory)
    const gameoverTitle = gameoverScreen.querySelector('h2');
    if (gameoverTitle) {
        gameoverTitle.innerText = t('normal_mode_completed') || "Hoàn thành";
        gameoverTitle.setAttribute('data-i18n', 'normal_mode_completed');
    }

    // Kích hoạt hiệu ứng Particle và Style cho Màn hình Hoàn thành (Victory / Mode Completed) như Game Over
    const isRage = window.HardModeManager && window.HardModeManager.isEnabled;
    const isEasy = window.EasyModeManager && window.EasyModeManager.isEnabled;
    const isAsian = window.AsianModeManager && window.AsianModeManager.isEnabled;

    if (isAsian && window.AsianGameOverFireManager) {
        if (window.RageGameOverFireManager) window.RageGameOverFireManager.stop();
        if (window.EasyGameOverCloverManager) window.EasyGameOverCloverManager.stop();
        if (window.DefaultGameOverParticleManager) window.DefaultGameOverParticleManager.stop();
        window.AsianGameOverFireManager.start();
    } else if (isRage && window.RageGameOverFireManager) {
        if (window.AsianGameOverFireManager) window.AsianGameOverFireManager.stop();
        if (window.EasyGameOverCloverManager) window.EasyGameOverCloverManager.stop();
        if (window.DefaultGameOverParticleManager) window.DefaultGameOverParticleManager.stop();
        window.RageGameOverFireManager.start();
    } else if (isEasy && window.EasyGameOverCloverManager) {
        if (window.AsianGameOverFireManager) window.AsianGameOverFireManager.stop();
        if (window.RageGameOverFireManager) window.RageGameOverFireManager.stop();
        if (window.DefaultGameOverParticleManager) window.DefaultGameOverParticleManager.stop();
        window.EasyGameOverCloverManager.start();
    } else if (window.DefaultGameOverParticleManager) {
        if (window.AsianGameOverFireManager) window.AsianGameOverFireManager.stop();
        if (window.RageGameOverFireManager) window.RageGameOverFireManager.stop();
        if (window.EasyGameOverCloverManager) window.EasyGameOverCloverManager.stop();
        window.DefaultGameOverParticleManager.start(true);
    } else {
        if (window.AsianGameOverFireManager) window.AsianGameOverFireManager.stop();
        if (window.RageGameOverFireManager) window.RageGameOverFireManager.stop();
        if (window.EasyGameOverCloverManager) window.EasyGameOverCloverManager.stop();
        if (window.DefaultGameOverParticleManager) window.DefaultGameOverParticleManager.stop();
        if (gameoverTitle) {
            gameoverTitle.className = "text-4xl font-black text-cyan-400 neon-glow-cyan font-orbitron uppercase mb-6 animate-pulse";
        }
        if (gameoverScreenWindow) {
            gameoverScreenWindow.classList.remove('border-pink-500/40', 'border-red-500/70', 'border-orange-500/70', 'border-green-500/70');
            gameoverScreenWindow.classList.add('border-cyan-500/40');
        }
    }

    gameoverScreen.style.display = 'flex';

    let gameOverMiniCard = document.getElementById('gameover-mini-music-card');
    if (!gameOverMiniCard) {
        gameOverMiniCard = document.createElement('div');
        gameOverMiniCard.id = 'gameover-mini-music-card';
        gameoverScreen.appendChild(gameOverMiniCard);
    }

    let cardBorder = "border-cyan-500/40 bg-cyan-950/80 shadow-[0_0_20px_rgba(34,211,238,0.2)]";
    let iconColor = "text-cyan-400";
    let iconBg = "bg-cyan-900/50 border-cyan-500/50";
    let textColor = "text-cyan-300";
    let textShadow = "0 0 8px rgba(34,211,238,0.6)";

    if (isAsian) {
        cardBorder = "border-red-500/40 bg-red-950/80 shadow-[0_0_20px_rgba(239,68,68,0.2)]";
        iconColor = "text-red-400";
        iconBg = "bg-red-900/50 border-red-500/50";
        textColor = "text-red-300";
        textShadow = "0 0 8px rgba(239,68,68,0.6)";
    } else if (isRage) {
        cardBorder = "border-orange-500/40 bg-orange-950/80 shadow-[0_0_20px_rgba(249,115,22,0.2)]";
        iconColor = "text-orange-400";
        iconBg = "bg-orange-900/50 border-orange-500/50";
        textColor = "text-orange-300";
        textShadow = "0 0 8px rgba(249,115,22,0.6)";
    } else if (isEasy) {
        cardBorder = "border-emerald-500/40 bg-emerald-950/80 shadow-[0_0_20px_rgba(16,185,129,0.2)]";
        iconColor = "text-emerald-400";
        iconBg = "bg-emerald-900/50 border-emerald-500/50";
        textColor = "text-emerald-300";
        textShadow = "0 0 8px rgba(16,185,129,0.6)";
    }

    gameOverMiniCard.className = `absolute top-12 left-1/2 -translate-x-1/2 flex flex-col items-center justify-center px-6 py-3 rounded-2xl border ${cardBorder} backdrop-blur-md min-w-[220px] max-w-[90vw] md:max-w-md pointer-events-none`;

    const song = typeof activePlaylist !== 'undefined' ? activePlaylist[selectedSongIndex] : playlist[selectedSongIndex];
    const songName = song.name || song.title || (typeof t === 'function' ? t('unknown_track') : "Unknown Track");
    const songArtist = song.artist || (typeof t === 'function' ? t('unknown_artist') : "Unknown Artist");

    gameOverMiniCard.innerHTML = `
        <div class="flex items-center gap-3 w-full">
            <div class="w-10 h-10 rounded-full ${iconBg} flex items-center justify-center shrink-0">
                <svg class="w-5 h-5 ${iconColor} animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"></path></svg>
            </div>
            <div class="flex flex-col items-start overflow-hidden w-full max-w-[150px]">
                <div class="${textColor} font-orbitron font-bold text-sm overflow-hidden whitespace-nowrap w-full relative flex justify-start marquee-container" style="text-shadow: ${textShadow}">
                    <span class="marquee-text inline-block">${songName}</span>
                </div>
                <span class="text-gray-400 text-[10px] tracking-widest uppercase mt-0.5 truncate w-full">${songArtist}</span>
            </div>
        </div>
    `;

    const gameOverMarquee = gameOverMiniCard.querySelector('.marquee-text');
    if (gameOverMarquee && typeof window.applyMarquee === 'function') {
        window.applyMarquee(gameOverMarquee);
    }

    if (typeof anime !== 'undefined' && (typeof uiAnimationsEnabled === 'undefined' || uiAnimationsEnabled)) {
        gameoverScreen.style.opacity = 0;
        if (gameoverScreenWindow) gameoverScreenWindow.style.transform = 'scale(0.92)';
        anime({
            targets: gameoverScreen,
            opacity: 1,
            duration: 400,
            easing: 'easeOutQuint'
        });
        if (gameoverScreenWindow) {
            anime({
                targets: gameoverScreenWindow,
                scale: [0.92, 1],
                duration: 400,
                easing: 'easeOutQuint'
            });
        }
    } else {
        gameoverScreen.style.opacity = 1;
        if (gameoverScreenWindow) gameoverScreenWindow.style.transform = 'scale(1)';
    }

    // Hiển thị điểm cao UI với hiệu ứng loading dự phòng nếu backend chậm
    renderBestScoreUI(selectedSongIndex);

    // Không phát nhạc kỷ lục mới ở đây để tránh đè âm thanh kết quả hoàn thành

    // Phát nhạc nền kết quả (Endless Result BGM) khi hoàn thành
    let gameOverAudioToPlay = typeof gameOverRoundAudio !== 'undefined' ? gameOverRoundAudio : null;
    if (gameOverAudioToPlay) {
        if (gameOverAudioToPlay.fadeTimeout) clearTimeout(gameOverAudioToPlay.fadeTimeout);
        if (gameOverAudioToPlay.fadeInterval) clearInterval(gameOverAudioToPlay.fadeInterval);

        if (typeof audioCtx !== 'undefined' && audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        if (typeof useAudioContextFallback !== 'undefined' && useAudioContextFallback) {
            gameOverAudioToPlay.volume = (typeof isMfxGameOverMuted !== 'undefined' && isMfxGameOverMuted) ? 0 : (typeof mfxGameOverVolume !== 'undefined' ? mfxGameOverVolume : 0.8);
        } else if (typeof mfxGameOverGainNode !== 'undefined' && mfxGameOverGainNode && typeof audioCtx !== 'undefined' && audioCtx) {
            const now = audioCtx.currentTime;
            mfxGameOverGainNode.gain.cancelScheduledValues(now);
            const targetVol = (typeof isMfxGameOverMuted !== 'undefined' && isMfxGameOverMuted) ? 0 : (typeof mfxGameOverVolume !== 'undefined' ? mfxGameOverVolume : 0.8);
            mfxGameOverGainNode.gain.setValueAtTime(targetVol, now);
        }
        gameOverAudioToPlay.currentTime = 0;
        gameOverAudioToPlay.play().catch(() => { });
    }

    // Logic chạy điểm (Animate Score)
    let currentDisplayScore = 0;
    const duration = 1500; // 1.5 giây
    const startTime = performance.now();
    let lastTickIndex = -1;
    const maxTicks = 30;

    const animateScore = (now) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        currentDisplayScore = Math.floor(progress * score);

        if (finalScoreEl.innerText !== currentDisplayScore.toString()) {
            finalScoreEl.innerText = currentDisplayScore;
            const tickCount = Math.min(score, maxTicks);
            if (tickCount > 0) {
                const currentTickIndex = Math.floor(progress * (tickCount - 1));
                if (currentTickIndex > lastTickIndex) {
                    if (scoreTickAudio) {
                        scoreTickAudio.currentTime = 0;
                        scoreTickAudio.play().catch(() => { });
                    }
                    lastTickIndex = currentTickIndex;
                }
            }
        }

        if (progress < 1) {
            requestAnimationFrame(animateScore);
        } else {
            // Sau khi chạy điểm xong, check kỷ lục (không lưu/gửi điểm ở Relax mode, Autoplay, hoặc Bot Assist)
            const canSave = typeof isAnyHelperModeActive === 'function' ? !isAnyHelperModeActive() : (
                !((typeof relaxModeEnabled !== 'undefined' && relaxModeEnabled) || localStorage.getItem('relaxModeEnabled') === 'true') &&
                !((typeof botAssistEnabled !== 'undefined' && botAssistEnabled) || localStorage.getItem('botAssistEnabled') === 'true') &&
                !((typeof isAutoplay !== 'undefined' && isAutoplay) || (typeof isNaturalAutoplay !== 'undefined' && isNaturalAutoplay))
            );

            const showButtons = () => {
                const menuBtnEl = menuBtnElement || document.getElementById('menu-btn');
                const restartBtnEl = restartBtnElement || document.getElementById('restart-btn');
                if (menuBtnEl) {
                    menuBtnEl.classList.remove('opacity-0', 'pointer-events-none');
                    menuBtnEl.classList.add('opacity-100');
                }
                if (restartBtnEl) {
                    restartBtnEl.classList.remove('opacity-0', 'pointer-events-none');
                    restartBtnEl.classList.add('opacity-100');
                }
            };

            try {
                // Đồng bộ trạng thái pass bài lên Server & Local (để luôn mở khóa lựa chọn chế độ)
                if (typeof window.submitScoreToServer === 'function') {
                    window.submitScoreToServer(score, true);
                }
                saveBestScore(selectedSongIndex, score, true);

                if (canSave && score > oldBest) {
                    bestScoreLabel.innerText = `${t('best_score')} ${score}`;
                    highScoreDisplay.classList.remove('hidden');
                }
            } catch (err) {
                console.error("Lỗi xử lý kết quả chiến thắng:", err);
            } finally {
                setTimeout(showButtons, 1000);
            }
        }
    };

    requestAnimationFrame(animateScore);
    autoplayBackBtn.style.display = 'none';
}

// ============================================================
// DefaultGameOverParticleManager — Hiệu ứng hạt bụi Cyberpunk phát sáng cho Chế độ Thường (Game Over)
// ============================================================
window.DefaultGameOverParticleManager = {
    canvas: null,
    ctx: null,
    animationFrameId: null,
    particles: [],
    isActive: false,
    width: 0,
    height: 0,
    cyanTexture: null,
    pinkTexture: null,

    init: function () {
        if (this.canvas) return;

        this.canvas = document.getElementById('gameover-fire-canvas');
        if (!this.canvas) return;

        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';

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

    createGlowTexture: function (colorHex, glowHex) {
        const size = 32;
        const offscreenCanvas = document.createElement('canvas');
        offscreenCanvas.width = size;
        offscreenCanvas.height = size;
        const ctx = offscreenCanvas.getContext('2d');

        const center = size / 2;
        const grad = ctx.createRadialGradient(center, center, 0, center, center, center);
        grad.addColorStop(0, colorHex);
        grad.addColorStop(0.35, glowHex);
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(center, center, center, 0, Math.PI * 2);
        ctx.fill();

        return offscreenCanvas;
    },

    createTextures: function () {
        if (this.cyanTexture && this.pinkTexture) return;
        this.cyanTexture = this.createGlowTexture('rgba(255, 255, 255, 1)', 'rgba(34, 211, 238, 0.85)');
        this.pinkTexture = this.createGlowTexture('rgba(255, 255, 255, 1)', 'rgba(236, 72, 153, 0.85)');
    },

    start: function (isVictory = false) {
        this.init();
        if (!this.canvas) return;

        this.isActive = true;
        this.resizeCanvas();
        this.createTextures();

        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const count = isMobile ? 25 : Math.min(50, Math.max(30, Math.floor(this.width / 25)));

        this.particles = [];
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                vx: (Math.random() - 0.5) * 0.6,
                vy: -Math.random() * 1.5 - 0.5,
                size: Math.random() * 16 + 10,
                type: isVictory ? (Math.random() > 0.3 ? 'cyan' : 'pink') : (Math.random() > 0.5 ? 'cyan' : 'pink'),
                opacity: Math.random() * 0.6 + 0.4,
                pulseSpeed: Math.random() * 0.04 + 0.015,
                pulseOffset: Math.random() * Math.PI * 2
            });
        }

        const gameoverTitle = document.querySelector('#gameover-screen-window h2');
        if (gameoverTitle) {
            if (isVictory) {
                gameoverTitle.className = "text-4xl font-black text-cyan-400 neon-glow-cyan font-orbitron uppercase mb-6 animate-pulse";
                gameoverTitle.style.textShadow = '0 0 14px #22d3ee, 0 0 28px #06b6d4, 0 0 50px #0891b2';
                gameoverTitle.style.color = '#22d3ee';
            } else {
                gameoverTitle.className = "text-4xl font-black text-pink-500 neon-glow-pink font-orbitron uppercase mb-6";
                gameoverTitle.style.textShadow = '';
                gameoverTitle.style.color = '';
            }
        }

        const gameoverWindow = document.getElementById('gameover-screen-window');
        if (gameoverWindow) {
            gameoverWindow.style.boxShadow = '';
            gameoverWindow.style.borderColor = '';
            gameoverWindow.classList.remove('border-red-500/70', 'border-green-500/70', 'border-orange-500/70', 'border-pink-500/40', 'border-cyan-500/70', 'border-cyan-500/40');
            if (isVictory) {
                gameoverWindow.classList.add('border-cyan-500/70');
                gameoverWindow.style.borderColor = '#06b6d4';
                gameoverWindow.style.boxShadow = '0 0 35px rgba(6, 182, 212, 0.6), inset 0 0 20px rgba(34, 211, 238, 0.3)';
            } else {
                gameoverWindow.classList.add('border-pink-500/40');
            }
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

        this.particles = [];
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
        if (!this.cyanTexture || !this.pinkTexture) this.createTextures();

        const time = Date.now() * 0.002;
        ctx.globalCompositeOperation = 'screen';

        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            p.y += p.vy;
            p.x += p.vx + Math.sin(time + p.pulseOffset) * 0.3;

            if (p.y < -30) {
                p.y = h + 20;
                p.x = Math.random() * w;
            }

            const currentOpacity = p.opacity * (0.7 + Math.sin(time * 2 + p.pulseOffset) * 0.3);
            const tex = p.type === 'cyan' ? this.cyanTexture : this.pinkTexture;

            ctx.globalAlpha = Math.max(0, Math.min(1, currentOpacity));
            ctx.drawImage(tex, p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        }

        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1.0;
    }
};

// --- GAME OVER ---
async function gameOver() {
    isPlaying = false;
    const maxSpeedReached = gameSpeed;
    isVictoryTransition = false;
    victoryTimeElapsed = 0;
    ballVictoryVelocityY = 0;
    victoryCameraDecay = 1.0;
    camVelX = 0; camVelY = 0; camVelZ = 0;

    let oldBest = 0;
    try {
        const cached = cachedBestScores[selectedSongIndex];
        if (cached !== undefined && cached !== null) {
            oldBest = typeof cached === 'number' ? cached : (parseInt(cached, 10) || 0);
        } else {
            oldBest = await getLocalBestScore(selectedSongIndex);
        }
    } catch (e) {
        oldBest = 0;
    }

    // Đảm bảo khôi phục tiêu đề và kiểu dáng Game Over chuẩn (đề phòng lần trước thắng)
    const gameoverTitle = gameoverScreen.querySelector('h2');
    if (gameoverTitle) {
        gameoverTitle.innerText = t('game_over') || "GAME OVER";
        gameoverTitle.className = "text-4xl font-black text-pink-500 neon-glow-pink font-orbitron uppercase mb-6";
        gameoverTitle.setAttribute('data-i18n', 'game_over');
    }
    if (gameoverScreenWindow) {
        gameoverScreenWindow.classList.remove('border-cyan-500/40');
        gameoverScreenWindow.classList.add('border-pink-500/40');
    }

    // Lưu lại trạng thái vòng chơi trước khi reset các biến
    const wasEndless = isEndlessMode || activeEndlessMode || activeRoundCount >= 1 || roundCount >= 1;

    gameSpeed = 1.0;
    comboCount = 0;
    nonPerfectStreak = 0;
    currentTileScale = 1.0;
    currentBeatIndex = 0;
    isEndlessMode = false;
    endlessBufferCount = 0;
    roundCount = 0;
    activeRoundCount = 0;
    activeEndlessMode = false;
    blocksSinceLastRound = 0;
    targetSpeed = 1.0;
    totalTilesJumped = 0;
    comboEl.classList.remove('active');
    comboEl.innerText = "";

    if (audio) {
        audio.pause();
        audio.currentTime = 0;
        audio.playbackRate = 1.0;
    }

    if (roundGainNode) {
        roundGainNode.gain.value = typeof isRoundMuted !== 'undefined' && isRoundMuted ? 0 : roundVolume;
    }

    if (sfxGainNode) {
        sfxGainNode.gain.value = typeof isSfxMuted !== 'undefined' && isSfxMuted ? 0 : sfxVolume;
    }

    if (uiGainNode) {
        uiGainNode.gain.value = typeof isUiMuted !== 'undefined' && isUiMuted ? 0 : uiVolume;
    }

    tiles.forEach(tile => {
        pushTileToPool(tile);
    });
    tiles = [];

    cleanUpOldObjects();

    const menuBtnElement = document.getElementById('menu-btn');
    const restartBtnElement = document.getElementById('restart-btn');
    if (menuBtnElement) {
        menuBtnElement.classList.add('opacity-0', 'pointer-events-none');
        menuBtnElement.classList.remove('opacity-100');
    }
    if (restartBtnElement) {
        restartBtnElement.innerText = t('btn_restart') || "RESTART";
        restartBtnElement.setAttribute('data-action', 'restart');
        if (window.AsianModeManager && window.AsianModeManager.isEnabled) {
            restartBtnElement.className = "flex-1 py-3 text-xs font-black text-white bg-gradient-to-r from-red-600 via-rose-600 to-purple-800 hover:from-red-500 hover:via-rose-500 hover:to-purple-700 rounded-xl font-orbitron uppercase transition-all duration-200 transform hover:scale-105 opacity-0 pointer-events-none shadow-[0_0_25px_rgba(225,29,72,0.8)] border border-red-500/50";
        } else if (window.HardModeManager && window.HardModeManager.isEnabled) {
            restartBtnElement.className = "flex-1 py-3 text-xs font-black text-white bg-gradient-to-r from-yellow-500 via-orange-500 to-red-600 hover:from-yellow-400 hover:via-orange-400 hover:to-red-500 rounded-xl font-orbitron uppercase transition-all duration-200 transform hover:scale-105 opacity-0 pointer-events-none shadow-[0_0_20px_rgba(239,68,68,0.6)] border border-orange-400/30";
        } else if (window.EasyModeManager && window.EasyModeManager.isEnabled) {
            restartBtnElement.className = "flex-1 py-3 text-xs font-black text-black bg-gradient-to-r from-emerald-400 via-teal-400 to-green-500 hover:from-emerald-300 hover:via-teal-300 hover:to-green-400 rounded-xl font-orbitron uppercase transition-all duration-200 transform hover:scale-105 opacity-0 pointer-events-none shadow-[0_0_20px_rgba(16,185,129,0.6)] border border-emerald-400/30";
        } else {
            restartBtnElement.className = "flex-1 py-3 text-xs font-black text-black bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-400 hover:to-purple-400 rounded-xl font-orbitron uppercase transition-all duration-200 transform hover:scale-105 opacity-0 pointer-events-none";
        }
    }

    // Hiển thị UI ban đầu
    finalScoreEl.innerText = "0";
    if (window.AsianModeManager && window.AsianModeManager.isEnabled) {
        finalScoreEl.className = "text-3xl text-red-500 font-bold neon-glow-red animate-pulse";
    } else if (window.HardModeManager && window.HardModeManager.isEnabled) {
        finalScoreEl.className = "text-3xl text-orange-500 font-bold neon-glow-orange animate-pulse";
    } else if (window.EasyModeManager && window.EasyModeManager.isEnabled) {
        finalScoreEl.className = "text-3xl text-green-400 font-bold neon-glow-green animate-pulse";
    } else {
        finalScoreEl.className = "text-3xl text-cyan-400 font-bold";
    }
    highScoreDisplay.classList.add('hidden');
    finalSpeedEl.innerText = `${t('max_speed')} ${maxSpeedReached.toFixed(2)}x`;
    speedEl.innerText = `${t('speed')} 1.00x`;
    lastDisplayedSpeedText = `${t('speed')} 1.00x`;
    if (perfectStreakHud) perfectStreakHud.innerText = "0";

    gameoverScreen.style.display = 'flex';

    // Kích hoạt hiệu ứng Game Over: Lửa (Rage Mode / Asian Mode), Cỏ 4 lá (Easy Mode), Hạt Cyber (Thường)
    const isRage = window.HardModeManager && window.HardModeManager.isEnabled;
    const isEasy = window.EasyModeManager && window.EasyModeManager.isEnabled;
    const isAsian = window.AsianModeManager && window.AsianModeManager.isEnabled;

    if (isAsian && window.AsianGameOverFireManager) {
        if (window.RageGameOverFireManager) window.RageGameOverFireManager.stop();
        if (window.EasyGameOverCloverManager) window.EasyGameOverCloverManager.stop();
        if (window.DefaultGameOverParticleManager) window.DefaultGameOverParticleManager.stop();
        window.AsianGameOverFireManager.start();
    } else if (isRage && window.RageGameOverFireManager) {
        if (window.AsianGameOverFireManager) window.AsianGameOverFireManager.stop();
        if (window.EasyGameOverCloverManager) window.EasyGameOverCloverManager.stop();
        if (window.DefaultGameOverParticleManager) window.DefaultGameOverParticleManager.stop();
        window.RageGameOverFireManager.start();
    } else if (isEasy && window.EasyGameOverCloverManager) {
        if (window.AsianGameOverFireManager) window.AsianGameOverFireManager.stop();
        if (window.RageGameOverFireManager) window.RageGameOverFireManager.stop();
        if (window.DefaultGameOverParticleManager) window.DefaultGameOverParticleManager.stop();
        window.EasyGameOverCloverManager.start();
    } else if (window.DefaultGameOverParticleManager) {
        if (window.AsianGameOverFireManager) window.AsianGameOverFireManager.stop();
        if (window.RageGameOverFireManager) window.RageGameOverFireManager.stop();
        if (window.EasyGameOverCloverManager) window.EasyGameOverCloverManager.stop();
        window.DefaultGameOverParticleManager.start();
    } else {
        if (window.AsianGameOverFireManager) window.AsianGameOverFireManager.stop();
        if (window.RageGameOverFireManager) window.RageGameOverFireManager.stop();
        if (window.EasyGameOverCloverManager) window.EasyGameOverCloverManager.stop();
        if (window.DefaultGameOverParticleManager) window.DefaultGameOverParticleManager.stop();
    }

    let gameOverMiniCard = document.getElementById('gameover-mini-music-card');
    if (!gameOverMiniCard) {
        gameOverMiniCard = document.createElement('div');
        gameOverMiniCard.id = 'gameover-mini-music-card';
        gameOverMiniCard.className = "absolute top-12 left-1/2 -translate-x-1/2 flex flex-col items-center justify-center px-6 py-3 rounded-2xl border border-cyan-500/40 bg-cyan-950/80 backdrop-blur-md shadow-[0_0_20px_rgba(34,211,238,0.2)] min-w-[220px] max-w-[90vw] md:max-w-md pointer-events-none";
        gameoverScreen.appendChild(gameOverMiniCard);
    }

    const song = typeof activePlaylist !== 'undefined' ? activePlaylist[selectedSongIndex] : playlist[selectedSongIndex];
    const songName = song.name || song.title || (typeof t === 'function' ? t('unknown_track') : "Unknown Track");
    const songArtist = song.artist || (typeof t === 'function' ? t('unknown_artist') : "Unknown Artist");

    gameOverMiniCard.innerHTML = `
        <div class="flex items-center gap-3 w-full">
            <div class="w-10 h-10 rounded-full bg-cyan-900/50 flex items-center justify-center border border-cyan-500/50 shrink-0">
                <svg class="w-5 h-5 text-pink-400 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"></path></svg>
            </div>
            <div class="flex flex-col items-start overflow-hidden w-full max-w-[150px]">
                <div class="text-cyan-300 font-orbitron font-bold text-sm overflow-hidden whitespace-nowrap w-full relative flex justify-start marquee-container" style="text-shadow: 0 0 8px rgba(34,211,238,0.6)">
                    <span class="marquee-text inline-block">${songName}</span>
                </div>
                <span class="text-gray-400 text-[10px] tracking-widest uppercase mt-0.5 truncate w-full">${songArtist}</span>
            </div>
        </div>
    `;

    const gameOverMarquee = gameOverMiniCard.querySelector('.marquee-text');
    if (gameOverMarquee && typeof window.applyMarquee === 'function') {
        window.applyMarquee(gameOverMarquee);
    }

    if (typeof anime !== 'undefined' && (typeof uiAnimationsEnabled === 'undefined' || uiAnimationsEnabled)) {
        gameoverScreen.style.opacity = 0;
        if (gameoverScreenWindow) gameoverScreenWindow.style.transform = 'scale(0.92)';
        anime({
            targets: gameoverScreen,
            opacity: 1,
            duration: 400,
            easing: 'easeOutQuint'
        });
        if (gameoverScreenWindow) {
            anime({
                targets: gameoverScreenWindow,
                scale: [0.92, 1],
                duration: 400,
                easing: 'easeOutQuint'
            });
        }
    } else {
        gameoverScreen.style.opacity = 1;
        if (gameoverScreenWindow) gameoverScreenWindow.style.transform = 'scale(1)';
    }

    // Hiển thị điểm cao UI với hiệu ứng loading dự phòng nếu backend chậm
    renderBestScoreUI(selectedSongIndex);

    // Phân luồng phát nhạc Game Over
    let gameOverAudioToPlay = null;
    if (wasEndless) {
        gameOverAudioToPlay = typeof gameOverRoundAudio !== 'undefined' ? gameOverRoundAudio : null;
    } else {
        gameOverAudioToPlay = typeof gameOverDefaultAudio !== 'undefined' ? gameOverDefaultAudio : null;
    }

    if (gameOverAudioToPlay) {
        if (gameOverAudioToPlay.fadeTimeout) clearTimeout(gameOverAudioToPlay.fadeTimeout);
        if (gameOverAudioToPlay.fadeInterval) clearInterval(gameOverAudioToPlay.fadeInterval);

        if (typeof audioCtx !== 'undefined' && audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        if (typeof useAudioContextFallback !== 'undefined' && useAudioContextFallback) {
            gameOverAudioToPlay.volume = (typeof isMfxGameOverMuted !== 'undefined' && isMfxGameOverMuted) ? 0 : (typeof mfxGameOverVolume !== 'undefined' ? mfxGameOverVolume : 0.8);
        } else if (typeof mfxGameOverGainNode !== 'undefined' && mfxGameOverGainNode && typeof audioCtx !== 'undefined' && audioCtx) {
            const now = audioCtx.currentTime;
            mfxGameOverGainNode.gain.cancelScheduledValues(now);
            const targetVol = (typeof isMfxGameOverMuted !== 'undefined' && isMfxGameOverMuted) ? 0 : (typeof mfxGameOverVolume !== 'undefined' ? mfxGameOverVolume : 0.8);
            mfxGameOverGainNode.gain.setValueAtTime(targetVol, now);
        }
        gameOverAudioToPlay.currentTime = 0;
        gameOverAudioToPlay.play().catch(() => { });
    }

    // Logic chạy điểm (Animate Score)
    let currentDisplayScore = 0;
    const duration = 1500; // 1.5 giây
    const startTime = performance.now();
    let lastTickIndex = -1;
    const maxTicks = 30;

    const animateScore = (now) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        currentDisplayScore = Math.floor(progress * score);

        if (finalScoreEl.innerText !== currentDisplayScore.toString()) {
            finalScoreEl.innerText = currentDisplayScore;
            // Cơ chế tick: tối đa 30 tick trong suốt quá trình chạy điểm
            const tickCount = Math.min(score, maxTicks);
            if (tickCount > 0) {
                const currentTickIndex = Math.floor(progress * (tickCount - 1));
                if (currentTickIndex > lastTickIndex) {
                    if (scoreTickAudio) {
                        scoreTickAudio.currentTime = 0;
                        scoreTickAudio.play().catch(() => { });
                    }
                    lastTickIndex = currentTickIndex;
                }
            }

        }

        if (progress < 1) {
            requestAnimationFrame(animateScore);
        } else {
            // Sau khi chạy điểm xong, check kỷ lục (không lưu/gửi điểm ở Relax mode, Autoplay, hoặc Bot Assist)
            const canSave = typeof isAnyHelperModeActive === 'function' ? !isAnyHelperModeActive() : (
                !((typeof relaxModeEnabled !== 'undefined' && relaxModeEnabled) || localStorage.getItem('relaxModeEnabled') === 'true') &&
                !((typeof botAssistEnabled !== 'undefined' && botAssistEnabled) || localStorage.getItem('botAssistEnabled') === 'true') &&
                !((typeof isAutoplay !== 'undefined' && isAutoplay) || (typeof isNaturalAutoplay !== 'undefined' && isNaturalAutoplay))
            );

            const showButtons = () => {
                const menuBtnEl = menuBtnElement || document.getElementById('menu-btn');
                const restartBtnEl = restartBtnElement || document.getElementById('restart-btn');
                if (menuBtnEl) {
                    menuBtnEl.classList.remove('opacity-0', 'pointer-events-none');
                    menuBtnEl.classList.add('opacity-100');
                }
                if (restartBtnEl) {
                    restartBtnEl.classList.remove('opacity-0', 'pointer-events-none');
                    restartBtnEl.classList.add('opacity-100');
                }
            };

            try {
                if (canSave) {
                    // Đồng bộ điểm lên Server và lưu kỷ lục cục bộ (Nếu chơi hợp lệ - không bot/relax/autoplay)
                    if (typeof window.submitScoreToServer === 'function') {
                        window.submitScoreToServer(score);
                    }

                    saveBestScore(selectedSongIndex, score);

                    if (score > oldBest) {
                        bestScoreLabel.innerText = `${t('best_score')} ${score}`;
                        highScoreDisplay.classList.remove('hidden');
                        if (newBestAudio) newBestAudio.play().catch(() => { });
                        setTimeout(showButtons, 1500); // Đợi audio kỷ lục phát xong mới hiện
                    } else {
                        showButtons();
                    }
                } else {
                    showButtons();
                }
            } catch (err) {
                console.error("Lỗi xử lý kết quả Game Over:", err);
                showButtons();
            }
        }
    };

    requestAnimationFrame(animateScore);

    autoplayBackBtn.style.display = 'none';
    tapToPlayOverlay.style.display = 'none';
}

// --- RESET SCENE ---
function resetGameScene() {
    gameStarted = false;
    isPlaying = false;

    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
    }

    score = 0;
    comboCount = 0;
    gameSpeed = 1.0;
    nonPerfectStreak = 0;
    currentTileScale = 1.0;
    currentTileIndex = 0;
    totalTilesJumped = 0;
    lastTileZ = 0;
    accumulatedSongTime = 0;
    ballTargetX = 0;
    currentBeatIndex = 0;
    isEndlessMode = false;
    endlessBufferCount = 0;
    roundCount = 0;
    activeRoundCount = 0;
    activeEndlessMode = false;
    blocksSinceLastRound = 0;
    scoreEl.innerText = "0";
    if (window.AsianModeManager && window.AsianModeManager.isEnabled) {
        scoreEl.classList.remove('text-cyan-400', 'neon-glow-cyan', 'text-orange-500', 'neon-glow-orange', 'text-green-400', 'neon-glow-green', 'text-yellow-400', 'neon-glow-yellow');
        scoreEl.classList.add('text-red-500', 'neon-glow-red');
    } else if (window.HardModeManager && window.HardModeManager.isEnabled) {
        scoreEl.classList.remove('text-cyan-400', 'neon-glow-cyan', 'text-green-400', 'neon-glow-green', 'text-yellow-400', 'neon-glow-yellow', 'text-red-500', 'neon-glow-red');
        scoreEl.classList.add('text-orange-500', 'neon-glow-orange');
    } else if (window.EasyModeManager && window.EasyModeManager.isEnabled) {
        scoreEl.classList.remove('text-cyan-400', 'neon-glow-cyan', 'text-orange-500', 'neon-glow-orange', 'text-yellow-400', 'neon-glow-yellow', 'text-red-500', 'neon-glow-red');
        scoreEl.classList.add('text-green-400', 'neon-glow-green');
    } else {
        scoreEl.classList.remove('text-orange-500', 'neon-glow-orange', 'text-green-400', 'neon-glow-green', 'text-yellow-400', 'neon-glow-yellow', 'text-red-500', 'neon-glow-red');
        scoreEl.classList.add('text-cyan-400', 'neon-glow-cyan');
    }
    comboEl.innerText = "";
    comboEl.classList.remove('active');
    if (perfectStreakHud) perfectStreakHud.innerText = "0";
    speedEl.innerText = `${t('speed')} 1.00x`;
    lastDisplayedSpeedText = `${t('speed')} 1.00x`;
    autoplayBackBtn.style.display = 'none';
    tapToPlayOverlay.style.display = 'none';

    if (typeof stopGameOverMusic === 'function') {
        stopGameOverMusic();
    }
    if (window.AsianGameOverFireManager) window.AsianGameOverFireManager.stop();
    if (window.RageGameOverFireManager) window.RageGameOverFireManager.stop();
    if (window.EasyGameOverCloverManager) window.EasyGameOverCloverManager.stop();
    if (window.DefaultGameOverParticleManager) window.DefaultGameOverParticleManager.stop();

    tiles.forEach(tile => {
        pushTileToPool(tile);
    });
    tiles = [];

    exitingTiles.forEach(tile => {
        pushTileToPool(tile);
    });
    exitingTiles = [];

    if (typeof window.FakeBlocksManager !== 'undefined') {
        window.FakeBlocksManager.reset();
    }

    if (typeof window.MovingBlocksManager !== 'undefined') {
        window.MovingBlocksManager.reset();
    }

    cleanUpOldObjects();

    // Dọn dẹp các đường sáng chạy trên biên (đưa vào pool)
    boundaryPulses.forEach(pulse => {
        scene.remove(pulse.mesh);
        boundaryPulsePool.push(pulse.mesh);
    });
    boundaryPulses = [];

    ball.position.set(0, minFloor, 0);
    ball.scale.set(1, 1, 1);

    spawnTile(true);
    spawnTile(false);

    if (tiles[0] && tiles[0].userData.centerMesh) {
        tiles[0].userData.centerMesh.visible = true;
        if (tiles[0].userData.centerMesh.material) tiles[0].userData.centerMesh.material.opacity = 1.0;
        tiles[0].userData.centerMeshFade = true;
    }

    jumpElapsedTime = 0;
    isFalling = false;
    isRescuing = false;
    rescueTargetTile = null;
    isFailTransition = false;
    if (typeof isHoldExitTransition !== 'undefined') isHoldExitTransition = false;
    jumpStartRawZ = tiles[0].position.z;
    calculateNextParabola(0);
    updateBackgroundStyle();

    if (audio) {
        audio.pause();
        audio.currentTime = 0;
        audio.playbackRate = 1.0;
        audio.preservesPitch = typeof preservePitchEnabled !== 'undefined' ? preservePitchEnabled : false;
        audio.mozPreservesPitch = typeof preservePitchEnabled !== 'undefined' ? preservePitchEnabled : false;
        audio.webkitPreservesPitch = typeof preservePitchEnabled !== 'undefined' ? preservePitchEnabled : false;
    }

    if (gainNode) {
        gainNode.gain.value = gameVolume;
    }

    if (camera) {
        camera.position.set(0, 6, 10);
        camera.lookAt(0, 1.6, -8);
    }

    gameStarted = false;

    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }

    clock.getDelta();
}

// --- INTRO & GAME FLOW ---
// Helper to show a fading splash slide (auto-fades out after duration)
function showIntroSlide(slideId, duration = 2000) {
    return new Promise(resolve => {
        const slide = document.getElementById(slideId);
        if (!slide) {
            resolve();
            return;
        }
        slide.classList.remove('hidden');
        void slide.offsetWidth; // force reflow
        slide.classList.remove('opacity-0');
        slide.classList.add('opacity-100');
        
        setTimeout(() => {
            slide.classList.remove('opacity-100');
            slide.classList.add('opacity-0');
            setTimeout(() => {
                slide.classList.add('hidden');
                resolve();
            }, 700); // match transition-opacity duration-700
        }, duration);
    });
}

// Helper to show the disclaimer slide (waits 3s, then click anywhere to continue)
function showIntroDisclaimer(slideId) {
    return new Promise(resolve => {
        if (typeof applyTranslations === 'function') {
            applyTranslations();
        }
        const slide = document.getElementById(slideId);
        if (!slide) {
            resolve();
            return;
        }
        slide.classList.remove('hidden');
        void slide.offsetWidth;
        slide.classList.remove('opacity-0');
        slide.classList.add('opacity-100');
        
        // Hide tap text initially
        const tapText = document.getElementById('disclaimer-tap-text');
        if (tapText) {
            tapText.classList.remove('opacity-100');
            tapText.classList.add('opacity-0');
        }

        setTimeout(() => {
            // After 3 seconds, show tap text and make slide clickable
            if (tapText) {
                tapText.classList.remove('opacity-0');
                tapText.classList.add('opacity-100');
                tapText.classList.add('animate-pulse');
            }
            slide.style.cursor = 'pointer';
            
            const handleProceed = () => {
                slide.removeEventListener('click', handleProceed);
                slide.classList.remove('opacity-100');
                slide.classList.add('opacity-0');
                setTimeout(() => {
                    slide.classList.add('hidden');
                    slide.style.cursor = 'default';
                    resolve();
                }, 700);
            };
            
            slide.addEventListener('click', handleProceed);
        }, 3000);
    });
}

// --- INTRO & GAME FLOW ---
async function handleIntro() {
    // 1. Show logos side by side (Slide 1)
    await showIntroSlide('intro-slide-logos', 3000);

    // 3. Show disclaimer (Slide 3)
    await showIntroDisclaimer('intro-slide-disclaimer');

    // 4. Show loading screen (Slide 4)
    const loadingSlide = document.getElementById('intro-slide-loading');
    if (loadingSlide) {
        loadingSlide.classList.remove('hidden');
        void loadingSlide.offsetWidth;
        loadingSlide.classList.remove('opacity-0');
        loadingSlide.classList.add('opacity-100');
    }

    // 5. Wait for background resource init (if not yet completed)
    if (window.bgInitPromise) {
        await window.bgInitPromise;
    }

    // 6. Now load the default beatmap
    if (typeof ensureSongLoaded === 'function') {
        await ensureSongLoaded(selectedSongIndex);
    }

    let bootBeats = activePlaylist[selectedSongIndex].beats;
    if (!Array.isArray(bootBeats) || bootBeats.length === 0) {
        console.warn('[bootGame] Beats không hợp lệ cho bài', selectedSongIndex, '- dùng fallback an toàn.');
        bootBeats = [0, 1, 2, 3];
        activePlaylist[selectedSongIndex].beats = bootBeats;
    }
    beatmapBeats = bootBeats;
    BEATMAP_TOTAL_TIME = beatmapBeats[beatmapBeats.length - 1] || 10;

    if (typeof renderSongList === 'function') {
        renderSongList(null);
    }

    if (window.MusicPlayer && playlist.length > 0) {
        window.MusicPlayer.currentIndex = selectedSongIndex;
        const song = playlist[selectedSongIndex];
        if (window.MusicPlayer.uiTitle) {
            window.MusicPlayer.uiTitle.innerText = song.name || song.title || "Unknown Track";
            if (typeof window.applyMarquee === 'function') {
                window.applyMarquee(window.MusicPlayer.uiTitle);
            }
        }
        if (window.MusicPlayer.uiGenre) window.MusicPlayer.uiGenre.innerText = song.artist || "Unknown Artist";
    }

    if (!menuAudio) initAudio();

    // Set initial camera far position for the intro animation
    if (typeof camera !== 'undefined' && camera) {
        camera.position.set(0, 21, 34.5);
        camera.lookAt(0, 0, 0);
    }

    await changeSong(selectedSongIndex, false);
    animate();

    let progress = 0;
    const simulateLoad = setInterval(() => {
        if (menuAudio && menuAudio.readyState >= 3) {
            progress += Math.random() * 10;
        } else {
            progress += Math.random() * 2;
            if (progress > 95) progress = 95; // Chờ nhạc nền tải hoặc xuất từ bộ đệm xong
        }

        if (progress >= 100) {
            progress = 100;
            clearInterval(simulateLoad);
            introLoadingContainer.style.display = 'none';
            startGameBtn.style.display = 'block';
        }

        introProgressBar.style.width = progress + '%';
        loadPercentText.innerText = Math.floor(progress) + '%';
    }, 100);

    startGameBtn.addEventListener('click', () => {
        // KIỂM TRA OFFLINE MÀ CHƯA CÓ NHẠC
        if (!navigator.onLine && (!audio || !audio.src || audio.src === window.location.href)) {
            if (typeof showCyberModal === 'function') {
                showCyberModal({
                    title: typeof t === 'function' ? t('offline_title') : "OFFLINE",
                    message: typeof t === 'function' ? t('offline_msg') : "Bạn đang ngoại tuyến! Hãy kiểm tra kết nối mạng.",
                    type: 'alert'
                });
            }
            return;
        }

        if (audioCtx) audioCtx.resume();

        if (menuAudio) {
            menuAudio.play().catch(e => console.log("Cần click để phát nhạc"));
        }

        // 1. Ẩn nút START ngay lập tức
        startGameBtn.style.display = 'none';

        // Ẩn Menu chính đi để chuẩn bị lộ cảnh 3D trống không
        if (typeof startScreen !== 'undefined' && startScreen) {
            startScreen.style.display = 'none';
            startScreen.style.opacity = 0;
            if (typeof startScreenWindow !== 'undefined' && startScreenWindow) {
                startScreenWindow.style.transform = 'scale(0.92)';
            }
        }

        if (typeof uiAnimationsEnabled !== 'undefined' && uiAnimationsEnabled && typeof anime !== 'undefined') {
            // --- HOẠT CẢNH START GAME MỚI ---

            // 2. Mờ dần và ẩn màn hình Intro (Logo)
            anime({
                targets: introOverlay,
                opacity: 0,
                duration: 800,
                easing: 'easeInOutQuad',
                complete: () => {
                    introOverlay.style.display = 'none';

                    // 3. Xong logo thì camera mới bay về lại gần
                    if (typeof camera !== 'undefined' && camera) {
                        anime({
                            targets: camera.position,
                            y: 6,
                            z: 9.5,
                            duration: 1500,
                            easing: 'easeInOutCubic',
                            complete: () => {
                                // 4. Camera về xong mới hiện Menu chính lên
                                if (typeof startScreen !== 'undefined' && startScreen) {
                                    startScreen.style.display = 'flex';
                                    anime({
                                        targets: startScreen,
                                        opacity: 1,
                                        duration: 500,
                                        easing: 'easeOutQuint'
                                    });
                                    if (typeof startScreenWindow !== 'undefined' && startScreenWindow) {
                                        anime({
                                            targets: startScreenWindow,
                                            scale: [0.92, 1],
                                            duration: 500,
                                            easing: 'easeOutQuint'
                                        });
                                    }
                                }
                            }
                        });
                    }
                }
            });

            // Gỡ bỏ hiệu ứng Lowpass cho nhạc nền mượt hơn
            if (typeof audioCtx !== 'undefined' && audioCtx && typeof menuFilterNode !== 'undefined' && menuFilterNode) {
                const now = audioCtx.currentTime;
                menuFilterNode.frequency.cancelScheduledValues(now);
                menuFilterNode.frequency.setValueAtTime(menuFilterNode.frequency.value, now);
                menuFilterNode.frequency.exponentialRampToValueAtTime(22050, now + 2.5); // Kéo dài ra cho khớp thời gian animation mới
            }

        } else {
            // Fallback nếu animation bị tắt
            if (typeof camera !== 'undefined' && camera) {
                camera.position.set(0, 6, 9.5);
            }
            introOverlay.style.opacity = 0;
            introOverlay.style.display = 'none';
            if (typeof startScreen !== 'undefined' && startScreen) {
                startScreen.style.display = 'flex';
                startScreen.style.opacity = 1;
                if (typeof startScreenWindow !== 'undefined' && startScreenWindow) {
                    startScreenWindow.style.transform = 'scale(1)';
                }
            }
        }
    });
}

function startGame() {
    if (typeof selectedSongIndex !== 'undefined' && selectedSongIndex !== null) {
        getBestScore(selectedSongIndex).catch(() => {});
    }

    if (!audio) {
        initAudio();
    }

    if (menuAudio) menuAudio.pause();
    if (typeof window.MusicPlayer !== 'undefined' && window.MusicPlayer.isPlaying) window.MusicPlayer.stop();

    audio.currentTime = 0;
    audio.loop = false;
    audio.playbackRate = Math.min(3.0, gameSpeed);
    audio.preservesPitch = typeof preservePitchEnabled !== 'undefined' ? preservePitchEnabled : false;
    audio.mozPreservesPitch = typeof preservePitchEnabled !== 'undefined' ? preservePitchEnabled : false;
    audio.webkitPreservesPitch = typeof preservePitchEnabled !== 'undefined' ? preservePitchEnabled : false;

    if (gainNode) {
        gainNode.gain.value = typeof isGameMuted !== 'undefined' && isGameMuted ? 0 : gameVolume;
    }

    const startLogic = () => {
        clock.getDelta();
        setupGameStates();
    };

    if (audioCtx && !useAudioContextFallback) {
        audioCtx.resume().then(() => {
            let playPromise = audio.play();
            if (playPromise !== undefined) {
                playPromise.then(startLogic).catch(startLogic);
            } else startLogic();
        });
    } else {
        let playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise.then(startLogic).catch(startLogic);
        } else startLogic();
    }
}

function setupGameStates() {
    jumpElapsedTime = 0;
    isFalling = false;
    isRescuing = false;
    rescueTargetTile = null;
    isFailTransition = false;
    isVictoryTransition = false;
    victoryTimeElapsed = 0;
    ballVictoryVelocityY = 0;
    victoryCameraDecay = 1.0;
    camVelX = 0; camVelY = 0; camVelZ = 0;
    currentTileIndex = 0;
    totalTilesJumped = 0;
    comboCount = 0;

    if (audio) {
        audio.volume = 1.0;
    }

    if (window.chosenPlayMode === 'endless') {
        isEndlessMode = true;
        activeEndlessMode = true;
        roundCount = 1;
        activeRoundCount = 1;
    } else {
        isEndlessMode = false;
        activeEndlessMode = false;
        roundCount = 0;
        activeRoundCount = 0;
    }

    jumpStartRawZ = tiles[0].position.z;
    calculateNextParabola(0);

    accumulatedSongTime = 0;
    gameStarted = true;
    isPlaying = true;
    clock.getDelta();
    clock.getDelta();
}

function returnToMenu() {
    if (window.RageGameOverFireManager) {
        window.RageGameOverFireManager.stop();
    }
    isPlaying = false;
    if (typeof autoFullscreenEnabled !== 'undefined' && autoFullscreenEnabled) {
        triggerExitFullscreen();
    }
    if (typeof anime !== 'undefined' && (typeof uiAnimationsEnabled === 'undefined' || uiAnimationsEnabled)) {
        anime({
            targets: gameoverScreen,
            opacity: 0,
            duration: 300,
            easing: 'easeInOutQuad',
            complete: () => gameoverScreen.style.display = 'none'
        });
        if (gameoverScreenWindow) {
            anime({
                targets: gameoverScreenWindow,
                scale: [1, 0.92],
                duration: 300,
                easing: 'easeInQuad'
            });
        }
        startScreen.style.opacity = 0;
        startScreen.style.display = 'flex';
        if (startScreenWindow) startScreenWindow.style.transform = 'scale(0.92)';
        anime({
            targets: startScreen,
            opacity: 1,
            duration: 400,
            easing: 'easeOutQuint'
        });
        if (startScreenWindow) {
            anime({
                targets: startScreenWindow,
                scale: [0.92, 1],
                duration: 400,
                easing: 'easeOutQuint'
            });
        }
    } else {
        gameoverScreen.style.opacity = 0;
        gameoverScreen.style.display = 'none';
        if (gameoverScreenWindow) gameoverScreenWindow.style.transform = 'scale(1)';
        startScreen.style.display = 'flex';
        startScreen.style.opacity = 1;
        if (startScreenWindow) startScreenWindow.style.transform = 'scale(1)';
    }

    if (audio && typeof audio.pause === 'function') audio.pause();

    const finalizeReturn = () => {
        changeSong(selectedSongIndex, false);
        resetGameScene();
    };

    if (typeof menuAudio !== 'undefined' && typeof activePlaylist !== 'undefined' && activePlaylist[selectedSongIndex]) {
        const lastUrl = activePlaylist[selectedSongIndex].url;
        if (typeof getCachedAudioUrl === 'function') {
            getCachedAudioUrl(lastUrl).then(url => {
                if (menuAudio.src !== url) {
                    menuAudio.src = url;
                    menuAudio.load();
                }
                finalizeReturn();
            });
        } else {
            if (menuAudio.src !== lastUrl) {
                menuAudio.src = lastUrl;
                menuAudio.load();
            }
            finalizeReturn();
        }
    } else {
        finalizeReturn();
    }
}

menuBtn.addEventListener('click', returnToMenu);

function showTapToOverlay(type = 'start') {
    tapToPlayOverlay.style.display = 'flex';
    countdownNumber.innerText = type === 'start' ? t('tap_play') : t('tap_resume');

    // Detect if game volume is too low or muted
    const lowVolWarn = document.getElementById('low-volume-warning');
    if (lowVolWarn) {
        const isMuted = typeof isGameMuted !== 'undefined' && isGameMuted;
        const volLevel = typeof gameVolume !== 'undefined' ? gameVolume : 0.8;
        if (isMuted || volLevel < 0.2) {
            lowVolWarn.classList.remove('hidden');
            lowVolWarn.onclick = (e) => {
                e.stopPropagation(); // Prevent launching tap to play handleTap
                if (typeof window.restoreGameVolume === 'function') {
                    window.restoreGameVolume();
                }
            };
        } else {
            lowVolWarn.classList.add('hidden');
        }
    }

    const handleTap = () => {
        // KIỂM TRA OFFLINE MÀ CHƯA CÓ NHẠC
        if (!navigator.onLine && (!audio || !audio.src || audio.src === window.location.href)) {
            if (typeof showCyberModal === 'function') {
                showCyberModal({
                    title: typeof t === 'function' ? t('offline_title') : "OFFLINE",
                    message: typeof t === 'function' ? t('offline_msg') : "Bạn đang ngoại tuyến! Chỉ có thể phát các bài hát đã được lưu trong bộ nhớ đệm (Cache).",
                    type: 'alert'
                });
            }
            return;
        }

        tapToPlayOverlay.style.display = 'none';
        tapToPlayOverlay.removeEventListener('click', handleTap);
        tapToPlayOverlay.removeEventListener('touchstart', handleTap);
        if (typeof stopPregameMusic === 'function') stopPregameMusic();

        if (type === 'start') {
            startGame();
        } else {
            resumeGame();
        }
    };

    let tapBackBtn = document.getElementById('tap-back-btn');
    if (tapBackBtn) {
        const newTapBackBtn = tapBackBtn.cloneNode(true);
        tapBackBtn.parentNode.replaceChild(newTapBackBtn, tapBackBtn);
        tapBackBtn = newTapBackBtn;

        tapBackBtn.style.display = type === 'start' ? 'flex' : 'none';

        const stopProp = (e) => e.stopPropagation();
        ['mousedown', 'touchstart', 'dblclick'].forEach(evt => tapBackBtn.addEventListener(evt, stopProp));

        tapBackBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            tapToPlayOverlay.style.display = 'none';
            tapToPlayOverlay.removeEventListener('click', handleTap);
            tapToPlayOverlay.removeEventListener('touchstart', handleTap);
            if (typeof stopPregameMusic === 'function') stopPregameMusic();
            returnToMenu();
        });
    }

    const relaxWarning = document.getElementById('relax-mode-warning');
    if (relaxWarning) {
        if (typeof relaxModeEnabled !== 'undefined' && relaxModeEnabled) {
            relaxWarning.classList.remove('hidden');
        } else {
            relaxWarning.classList.add('hidden');
        }
    }

    let miniCard = document.getElementById('tap-mini-music-card');
    if (!miniCard) {
        miniCard = document.createElement('div');
        miniCard.id = 'tap-mini-music-card';
        miniCard.className = "absolute top-12 left-1/2 -translate-x-1/2 flex flex-col items-center justify-center px-6 py-3 rounded-2xl border border-cyan-500/40 bg-cyan-950/80 backdrop-blur-md shadow-[0_0_20px_rgba(34,211,238,0.2)] min-w-[220px] max-w-[90vw] md:max-w-md pointer-events-none";
        tapToPlayOverlay.appendChild(miniCard);
    }

    const song = activePlaylist[selectedSongIndex];
    const songName = song.name || song.title || "Unknown Track";
    const songArtist = song.artist || "Unknown Artist";

    let copyrightColorClass = 'text-yellow-500';
    let copyrightBgClass = 'bg-yellow-900/30';
    let copyrightBorderClass = 'border-yellow-500/40';
    let copyrightHoverBgClass = 'hover:bg-yellow-800/50';
    let copyrightHoverTextClass = 'hover:text-yellow-400';
    let copyrightShadowClass = 'shadow-[0_0_10px_rgba(234,179,8,0.2)]';

    if (song.copyright_status) {
        const statusLower = song.copyright_status.toLowerCase();
        if (statusLower === 'verified') {
            copyrightColorClass = 'text-green-500';
            copyrightBgClass = 'bg-green-900/30';
            copyrightBorderClass = 'border-green-500/40';
            copyrightHoverBgClass = 'hover:bg-green-800/50';
            copyrightHoverTextClass = 'hover:text-green-400';
            copyrightShadowClass = 'shadow-[0_0_10px_rgba(34,197,94,0.2)]';
        } else if (statusLower.includes('copyright')) {
            copyrightColorClass = 'text-red-500';
            copyrightBgClass = 'bg-red-900/30';
            copyrightBorderClass = 'border-red-500/40';
            copyrightHoverBgClass = 'hover:bg-red-800/50';
            copyrightHoverTextClass = 'hover:text-red-400';
            copyrightShadowClass = 'shadow-[0_0_10px_rgba(239,68,68,0.2)]';
        }
    }

    miniCard.innerHTML = `
        <div class="flex items-center gap-3 w-full">
            <div class="w-10 h-10 rounded-full bg-cyan-900/50 flex items-center justify-center border border-cyan-500/50 shrink-0">
                <svg class="w-5 h-5 text-pink-400 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"></path></svg>
            </div>
            <div class="flex flex-col items-start overflow-hidden w-full max-w-[150px]">
                <div class="text-cyan-300 font-orbitron font-bold text-sm overflow-hidden whitespace-nowrap w-full relative flex justify-start marquee-container" style="text-shadow: 0 0 8px rgba(34,211,238,0.6)">
                    <span class="marquee-text inline-block">${songName}</span>
                </div>
                <span class="text-gray-400 text-[10px] tracking-widest uppercase mt-0.5 truncate w-full">${songArtist}</span>
            </div>
        </div>
        ${song.copyright_status ? `
        <div id="copyright-check-btn" class="mt-3 w-full py-1.5 px-3 rounded-lg ${copyrightBgClass} border ${copyrightBorderClass} text-[10px] font-orbitron font-bold ${copyrightColorClass} ${copyrightHoverBgClass} ${copyrightHoverTextClass} transition-all flex justify-between items-center cursor-pointer pointer-events-auto ${copyrightShadowClass}">
            <div id="copyright-text-wrapper" class="flex-1 overflow-hidden whitespace-nowrap min-w-0 max-w-[65vw] sm:max-w-[250px] pr-2">
                <span>COPYRIGHT: <span class="text-gray-300">${song.copyright_status}</span></span>
            </div>
            <svg class="w-3 h-3 ${copyrightColorClass} shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        </div>
        ` : ''}
        ${song.warning_alert ? `
        <div class="mt-3 w-full py-1.5 px-3 rounded-lg bg-red-950/40 border border-red-500/50 text-[10px] font-bold text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.3)] flex items-center justify-center text-center">
            <span class="animate-pulse whitespace-normal leading-relaxed font-orbitron uppercase drop-shadow-md">⚠️ ${song.warning_alert}</span>
        </div>
        ` : ''}
    `;

    const tapMarquee = miniCard.querySelector('.marquee-text');
    if (tapMarquee && typeof window.applyMarquee === 'function') {
        window.applyMarquee(tapMarquee);
    }

    if (typeof setupCopyrightCheck === 'function') {
        setupCopyrightCheck(songName, songArtist, song.copyright_status);
    }

    if (song.copyright_status) {
        setTimeout(() => {
            const wrapper = document.getElementById('copyright-text-wrapper');
            if (wrapper && wrapper.scrollWidth > wrapper.clientWidth + 2) {
                const textHtml = wrapper.innerHTML;
                wrapper.innerHTML = '<marquee scrollamount="3" behavior="scroll" direction="left" class="w-full">' + textHtml + '</marquee>';
            }
        }, 100);
    }

    // --- QUICK SETTINGS PANEL ---
    let quickSettingsBtn = document.getElementById('tap-quick-settings-btn');
    let quickSettingsPanel = document.getElementById('tap-quick-settings-panel');

    if (!quickSettingsBtn) {
        quickSettingsBtn = document.createElement('button');
        quickSettingsBtn.id = 'tap-quick-settings-btn';
        quickSettingsBtn.className = "absolute bottom-6 right-6 w-10 h-10 rounded-full bg-cyan-900/50 border border-cyan-500/50 flex items-center justify-center text-cyan-400 hover:bg-cyan-800 transition-all z-50 shadow-[0_0_10px_rgba(34,211,238,0.3)]";
        quickSettingsBtn.innerHTML = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>`;
        tapToPlayOverlay.appendChild(quickSettingsBtn);

        quickSettingsPanel = document.createElement('div');
        quickSettingsPanel.id = 'tap-quick-settings-panel';
        quickSettingsPanel.className = "absolute bottom-20 right-6 w-64 rounded-xl border border-cyan-500/40 bg-cyan-950/90 backdrop-blur-md shadow-[0_0_20px_rgba(34,211,238,0.2)] p-4 flex flex-col gap-4 hidden z-50 font-rajdhani";

        quickSettingsPanel.innerHTML = `
            <h3 class="text-cyan-400 font-orbitron font-bold text-sm text-center border-b border-cyan-500/30 pb-2">QUICK SETTINGS</h3>
            <div class="flex flex-col gap-1">
                <div class="flex justify-between items-center text-xs">
                    <span class="text-gray-300 font-bold">${typeof t === 'function' ? t('game_vol') : 'GAME VOLUME'}</span>
                    <span id="qs-game-vol-val" class="text-cyan-400 font-bold">80%</span>
                </div>
                <input type="range" id="qs-game-vol" min="0" max="1" step="0.05" value="0.8" class="w-full accent-cyan-400 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer">
            </div>
            <div class="flex flex-col gap-1">
                <div class="flex justify-between items-center text-xs">
                    <span class="text-gray-300 font-bold">${typeof t === 'function' ? t('sens_title') : 'SENSITIVITY'}</span>
                    <span id="qs-sens-val" class="text-cyan-400 font-bold">1.0x</span>
                </div>
                <input type="range" id="qs-sens" min="0.1" max="5.0" step="0.1" value="1.0" class="w-full accent-cyan-400 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer">
            </div>
            <div class="flex flex-col gap-1">
                <span class="text-gray-300 font-bold text-xs mb-1">${typeof t === 'function' ? t('quality_title') : 'GRAPHICS QUALITY'}</span>
                <select id="qs-quality" class="w-full bg-cyan-950 border border-cyan-500/50 rounded px-2 py-1.5 text-xs text-cyan-300 outline-none font-bold">
                    <option value="simple">Simple (Low)</option>
                    <option value="hd">HD (Medium)</option>
                    <option value="fhd">FHD (High)</option>
                    <option value="qhd">QHD (Quad HD)</option>
                    <option value="uhd">UHD (Ultra HD)</option>
                </select>
            </div>
        `;
        tapToPlayOverlay.appendChild(quickSettingsPanel);

        const stopProp = (e) => e.stopPropagation();
        quickSettingsBtn.addEventListener('click', (e) => {
            stopProp(e);
            quickSettingsPanel.classList.toggle('hidden');
        });
        ['mousedown', 'touchstart', 'dblclick'].forEach(evt => quickSettingsBtn.addEventListener(evt, stopProp));
        ['click', 'mousedown', 'touchstart', 'dblclick'].forEach(evt => quickSettingsPanel.addEventListener(evt, stopProp));

        const qsGameVol = document.getElementById('qs-game-vol');
        const qsGameVolVal = document.getElementById('qs-game-vol-val');
        qsGameVol.addEventListener('input', (e) => {
            const vol = parseFloat(e.target.value);
            qsGameVolVal.innerText = Math.round(vol * 100) + '%';
            if (typeof gameVolumeSlider !== 'undefined' && gameVolumeSlider) {
                gameVolumeSlider.value = vol;
                gameVolumeSlider.dispatchEvent(new Event('input'));
            }
        });

        const qsSens = document.getElementById('qs-sens');
        const qsSensVal = document.getElementById('qs-sens-val');
        qsSens.addEventListener('input', (e) => {
            const sens = parseFloat(e.target.value);
            qsSensVal.innerText = sens.toFixed(1) + 'x';
            if (typeof sensitivitySlider !== 'undefined' && sensitivitySlider) {
                sensitivitySlider.value = sens;
                sensitivitySlider.dispatchEvent(new Event('input'));
            }
        });

        const qsQuality = document.getElementById('qs-quality');
        qsQuality.addEventListener('change', (e) => {
            const mainRadio = document.querySelector(`input[name="graphics-quality"][value="${e.target.value}"]`);
            if (mainRadio) {
                mainRadio.checked = true;
                if (typeof applySettings === 'function') applySettings();
            }
        });
    }

    if (quickSettingsPanel) {
        document.getElementById('qs-game-vol').value = typeof gameVolume !== 'undefined' ? gameVolume : 0.8;
        document.getElementById('qs-game-vol-val').innerText = Math.round((typeof gameVolume !== 'undefined' ? gameVolume : 0.8) * 100) + '%';
        document.getElementById('qs-sens').value = typeof sensitivity !== 'undefined' ? sensitivity : 1.0;
        document.getElementById('qs-sens-val').innerText = (typeof sensitivity !== 'undefined' ? sensitivity : 1.0).toFixed(1) + 'x';
        document.getElementById('qs-quality').value = typeof currentGraphicsQuality !== 'undefined' ? currentGraphicsQuality : 'fhd';
        quickSettingsPanel.classList.add('hidden');
    }

    if (type === 'start') {
        if (typeof playPregameMusic === 'function') playPregameMusic();
    }

    tapToPlayOverlay.addEventListener('click', handleTap);
    tapToPlayOverlay.addEventListener('touchstart', handleTap);
}

function startCountdown() {
    showTapToOverlay('start');
}

function pauseGame() {
    if (!isPlaying || isFailTransition || (typeof isHoldExitTransition !== 'undefined' && isHoldExitTransition)) return;
    isPlaying = false;
    if (audio) audio.pause();
    showTapToOverlay('resume');
}

function resumeGame() {
    const resumeLogic = () => {
        isPlaying = true;
        clock.getDelta();
    };
    if (audio) {
        let playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise.then(resumeLogic).catch(resumeLogic);
        } else resumeLogic();
    } else {
        resumeLogic();
    }
}

// Tạm dừng khi mất focus hoặc chuyển tab
window.addEventListener('blur', pauseGame);
document.addEventListener('visibilitychange', () => {
    if (document.hidden) pauseGame();
});

// --- KIỂM TRA WEBGL SUPPORT ---
function isWebGLSupported() {
    try {
        const canvas = document.createElement('canvas');
        return !!(window.WebGL2RenderingContext && canvas.getContext('webgl2')) ||
               !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
    } catch (e) {
        return false;
    }
}

// --- KHỞI CHẠY HỆ THỐNG ---
async function bootGame() {
    if (!isWebGLSupported()) {
        const webglOverlay = document.getElementById('webgl-error-overlay');
        if (webglOverlay) {
            webglOverlay.classList.remove('hidden');
        }
        const introOverlay = document.getElementById('intro-overlay');
        if (introOverlay) {
            introOverlay.classList.add('hidden');
        }
        return;
    }

    // Bắt đầu khởi tạo tài nguyên ngầm ngay lập tức
    window.bgInitPromise = (async () => {
        if (typeof loadPlaylistData === 'function') {
            await loadPlaylistData();
        }

        if (typeof playlist !== 'undefined' && playlist.length > 0) {
            activePlaylist = playlist;
        } else {
            activePlaylist = [{ name: 'Default Song', url: '', beats: [0, 1, 2, 3, 4] }];
        }

        // --- KHÔI PHỤC BÀI HÁT CHƠI LẦN CUỐI THEO ID/URL ---
        const savedId = localStorage.getItem('selectedSongId');
        const savedUrl = localStorage.getItem('selectedSongUrl');
        const savedIndex = parseInt(localStorage.getItem('selectedSongIndex'));
        
        let foundIndex = -1;
        if (savedId) {
            foundIndex = activePlaylist.findIndex(s => String(s.id) === String(savedId));
        }
        if (foundIndex === -1 && savedUrl) {
            foundIndex = activePlaylist.findIndex(s => s.url === savedUrl);
        }
        if (foundIndex === -1 && !isNaN(savedIndex) && savedIndex >= 0 && savedIndex < activePlaylist.length) {
            foundIndex = savedIndex;
        }
        
        selectedSongIndex = foundIndex !== -1 ? foundIndex : 0;

        await initThree();
        
        if (typeof initAudio === 'function') {
            initAudio();
        }
    })();

    // Bắt đầu chuỗi Intro Splash Screen
    handleIntro();
}

bootGame();