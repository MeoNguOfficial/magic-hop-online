// ============================================================
// fake-blocks.js — Logic khối phake (Core Logic)
// ============================================================

window.FakeBlocksManager = {
    fakeTiles: [],
    fakeTilePool: [],
    fragments: [],
    fragmentPool: [],
    maxPoolSize: (typeof maxTilePoolSize !== 'undefined') ? maxTilePoolSize * 2 : 40,
    _disposeMaterial: function(mat) {
        if (!mat) return;
        if (Array.isArray(mat)) {
            mat.forEach(m => { if (m && typeof m.dispose === 'function') m.dispose(); });
        } else if (typeof mat.dispose === 'function') {
            mat.dispose();
        }
    },
    spawnCounter: 0,
    // Lưu 3 tọa độ X gần nhất của các khối thật để kiểm soát "spawn thẳng"
    prevRealXs: [],
    
    // Biến theo dõi tọa độ Z và thông tin hàng để phát hiện các block thật nằm trên cùng 1 hàng
    lastSpawnZ: null,
    lastSpawnTime: null, // Dùng để xác định note cùng thời điểm (timestamp) chính xác hơn
    lastRowId: null,      // Dùng nếu hệ thống map có định danh rowId
    
    // Các biến trạng thái kiểm soát số lượng block chính trên cùng một hàng Z
    realBlocksOnCurrentZ: 0,
    usedSlotsOnCurrentZ: [],
    
    createFakeTile: function(realTile, timeDiff, forceCount = null) {
        const mainX = realTile.position.x;
        const realScale = realTile.userData.scale || 1.0;
        
        const tWidth = typeof tileWidth !== 'undefined' ? tileWidth : 4.0;
        const scaledWidth = tWidth * realScale;
        
        let spawnCount = 1;
        if (forceCount === 'SNAP_3_ONE_FAKE') {
            spawnCount = 1;
        } else if (forceCount !== null) {
            spawnCount = forceCount;
        } else {
            const rand = Math.random();
            if (rand > 0.5) spawnCount = 2;
            else spawnCount = 1;
        }

        let positionsToSpawn = [];

        // Khoảng cách cố định (offset = 4.5) để khoảng trắng giữa các block là 0.5
        const offset = 4.5;
        // Thu hẹp 2 biên (Max track = 4.5)
        const maxTrackX = 4.5;

        if (forceCount === 'SNAP_3_ONE_FAKE') {
            const slots = [-maxTrackX, 0, maxTrackX];
            let pick = slots[1]; // default middle
            
            try {
                const prevVal = (this.prevRealXs && this.prevRealXs.length) ? this.prevRealXs[this.prevRealXs.length - 1] : null;
                const trailing = prevVal !== null ? this._countTrailingSame(prevVal) : 0;
                const isHardMode = (typeof window.HardModeManager !== 'undefined' && window.HardModeManager.isEnabled);
                const maxTrailing = isHardMode ? 1 : 2;
                
                let candidates = slots.slice();
                if (trailing >= maxTrailing && prevVal !== null) {
                    candidates = candidates.filter(s => s !== prevVal);
                }
                if (candidates.length === 0) candidates = slots.slice();
                
                if (isHardMode && candidates.includes(0) && candidates.length > 1) {
                    const roll = Math.random();
                    if (roll < 0.15) {
                        pick = 0;
                    } else {
                        const sides = candidates.filter(s => s !== 0);
                        pick = sides[Math.floor(Math.random() * sides.length)];
                    }
                } else {
                    pick = candidates[Math.floor(Math.random() * candidates.length)];
                }
            } catch (e) {
                const r = Math.random();
                const isHardMode = (typeof window.HardModeManager !== 'undefined' && window.HardModeManager.isEnabled);
                if (isHardMode) {
                    if (r < 0.425) {
                        pick = slots[0];
                    } else if (r < 0.85) {
                        pick = slots[2];
                    } else {
                        pick = slots[1];
                    }
                } else {
                    if (r < 0.33) {
                        pick = slots[0];
                    } else if (r < 0.66) {
                        pick = slots[1];
                    } else {
                        pick = slots[2];
                    }
                }
            }
            
            realTile.position.x = pick;
            
            if (pick === slots[0]) {
                positionsToSpawn = [slots[1]];
            } else if (pick === slots[2]) {
                positionsToSpawn = [slots[1]];
            } else { // pick === slots[1]
                positionsToSpawn = [Math.random() < 0.5 ? slots[0] : slots[2]];
            }
        } else if (spawnCount === 2 && forceCount === 2) {
            // CƠ CHẾ 3 BLOCK (FORCE_3): Luôn khít 2 biên, có khoảng trắng đều (slots: -4.5, 0, 4.5)
            const slots = [-maxTrackX, 0, maxTrackX];
            let closestSlot = slots[0];
            let minDiff = Infinity;
            
            for (let s of slots) {
                const diff = Math.abs(s - mainX);
                if (diff < minDiff) {
                    minDiff = diff;
                    closestSlot = s;
                }
            }
            // Thêm xác suất để tạo pattern 1-3 hoặc 3-1 (real tile ở biên trái hoặc phải),
            // hoặc fallback về slot gần nhất.
            // Chọn real slot: left / middle / right — phân phối đều hơn,
            // nhưng tránh chọn slot giống 2 khối thật liên tiếp trước đó
            try {
                const prevVal = (this.prevRealXs && this.prevRealXs.length) ? this.prevRealXs[this.prevRealXs.length - 1] : null;
                const trailing = prevVal !== null ? this._countTrailingSame(prevVal) : 0;
                const isHardMode = (typeof window.HardModeManager !== 'undefined' && window.HardModeManager.isEnabled);
                const maxTrailing = isHardMode ? 1 : 2;
                
                let candidates = slots.slice();
                if (trailing >= maxTrailing && prevVal !== null) {
                    candidates = candidates.filter(s => s !== prevVal);
                }
                if (candidates.length === 0) candidates = slots.slice();
                
                let pick;
                if (isHardMode && candidates.includes(0) && candidates.length > 1) {
                    const roll = Math.random();
                    if (roll < 0.15) {
                        pick = 0;
                    } else {
                        const sides = candidates.filter(s => s !== 0);
                        pick = sides[Math.floor(Math.random() * sides.length)];
                    }
                } else {
                    pick = candidates[Math.floor(Math.random() * candidates.length)];
                }
                
                realTile.position.x = pick;
                positionsToSpawn = slots.filter(s => s !== pick);
            } catch (e) {
                const r = Math.random();
                const isHardMode = (typeof window.HardModeManager !== 'undefined' && window.HardModeManager.isEnabled);
                if (isHardMode) {
                    if (r < 0.425) {
                        realTile.position.x = slots[0];
                        positionsToSpawn = [slots[1], slots[2]];
                    } else if (r < 0.85) {
                        realTile.position.x = slots[2];
                        positionsToSpawn = [slots[1], slots[0]];
                    } else {
                        realTile.position.x = slots[1];
                        positionsToSpawn = [slots[0], slots[2]];
                    }
                } else {
                    if (r < 0.33) {
                        realTile.position.x = slots[0];
                        positionsToSpawn = [slots[1], slots[2]];
                    } else if (r < 0.66) {
                        realTile.position.x = slots[1];
                        positionsToSpawn = [slots[0], slots[2]];
                    } else {
                        realTile.position.x = slots[2];
                        positionsToSpawn = [slots[1], slots[0]];
                    }
                }
            }
        } else {
            const right1 = mainX + offset;
            const right2 = mainX + offset * 2;
            const left1 = mainX - offset;
            const left2 = mainX - offset * 2;
            
            const validTwoBlockConfigs = [];
            if (right2 <= maxTrackX) validTwoBlockConfigs.push([right1, right2]);
            if (left2 >= -maxTrackX) validTwoBlockConfigs.push([left1, left2]);
            if (left1 >= -maxTrackX && right1 <= maxTrackX) validTwoBlockConfigs.push([left1, right1]);
            
            const validOneBlockConfigs = [];
            if (right1 <= maxTrackX) validOneBlockConfigs.push([right1]);
            if (left1 >= -maxTrackX) validOneBlockConfigs.push([left1]);
            
            if (spawnCount === 2 && validTwoBlockConfigs.length > 0) {
                positionsToSpawn = validTwoBlockConfigs[Math.floor(Math.random() * validTwoBlockConfigs.length)];
            } else if (validOneBlockConfigs.length > 0) {
                positionsToSpawn = validOneBlockConfigs[Math.floor(Math.random() * validOneBlockConfigs.length)];
            } else {
                return;
            }
        }

        const rawApiForFake = localStorage.getItem('graphicsAPI') || 'webgl';
        const isWebGPUForFake = (rawApiForFake === 'd2ViZ3B1' || rawApiForFake === 'webgpu');

        positionsToSpawn.forEach(posX => {
            let fakeTile;
            
            if (this.fakeTilePool.length > 0) {
                fakeTile = this.fakeTilePool.pop();
                fakeTile.visible = true;
                
                fakeTile.scale.copy(realTile.scale);

                const realMat = realTile.material;
                const fakeMat = fakeTile.material;

                if (fakeMat && realMat) {
                    fakeMat.color.copy(realMat.color);
                    if (fakeMat.emissive && realMat.emissive) fakeMat.emissive.copy(realMat.emissive);
                    // Quay lại dùng opacity nguyên bản của fake block
                    fakeMat.opacity = isWebGPUForFake ? 0.3 : 0.25;
                    fakeMat.transparent = true;
                    fakeMat.depthWrite = false;
                }
                
                if (fakeTile.userData.borderLine && realTile.userData.borderLine && realTile.userData.borderLine.material) {
                    fakeTile.userData.borderLine.material.color.copy(realTile.userData.borderLine.material.color);
                }
                
                // Cài đặt độ mờ các con
                for (let i = fakeTile.children.length - 1; i >= 0; i--) {
                    const child = fakeTile.children[i];
                    if (child.name === 'glowMesh') {
                        const glowMat = Array.isArray(child.material) ? child.material[1] : child.material;
                        if (glowMat) {
                            if (glowMat.uniforms) {
                                if (realMat) glowMat.uniforms.color.value.copy(realMat.color);
                                // Quay lại độ mờ glow nguyên bản (0.3)
                                glowMat.uniforms.opacityMultiplier.value = 0.3;
                            } else {
                                if (realMat) glowMat.color.copy(realMat.color);
                                // Quay lại độ mờ glow nguyên bản (0.15)
                                glowMat.opacity = 0.15;
                            }
                        }
                    } else if (child.name !== 'bodyMesh' && child.name !== 'edgeMesh' && child.material) {
                        // Quay lại độ mờ viền nguyên bản (0.15)
                        child.material.opacity = 0.15;
                    }
                }
            } else {
                fakeTile = realTile.clone();
                
                fakeTile.material = realTile.material.clone();
                // Quay lại dùng opacity nguyên bản của fake block
                fakeTile.material.opacity = isWebGPUForFake ? 0.3 : 0.25; 
                fakeTile.material.transparent = true;
                fakeTile.material.depthWrite = isWebGPUForFake ? false : realTile.material.depthWrite;
                
                for (let i = fakeTile.children.length - 1; i >= 0; i--) {
                    const child = fakeTile.children[i];
                    if (child.type === 'Sprite') {
                        fakeTile.remove(child);
                    } else if (child.name === 'centerMesh' || (child.type === 'Mesh' && child.name !== 'borderLine' && child.name !== 'glowMesh')) { 
                        fakeTile.remove(child);
                    } else if (child.name === 'glowMesh') {
                        if (Array.isArray(child.material)) {
                            const newGlowMat = child.material[1].clone();
                            if (newGlowMat.uniforms) {
                                // Quay lại độ mờ glow nguyên bản (0.3)
                                newGlowMat.uniforms.opacityMultiplier.value = 0.3;
                            } else {
                                newGlowMat.opacity = 0.08;
                            }
                            child.material = [child.material[0], newGlowMat];
                        }
                    } else if (child.material) {
                        child.material = child.material.clone();
                        // Quay lại độ mờ viền nguyên bản (0.15)
                        child.material.opacity = 0.15;
                        child.material.transparent = true;
                        
                        if (child.name === 'borderLine' || child.type === "LineLoop" || child.type === "Line") fakeTile.userData.borderLine = child;
                    }
                }
            }
            
            fakeTile.position.set(posX, realTile.position.y, realTile.position.z);
            fakeTile.rotation.x = realTile.rotation.x;
            fakeTile.rotation.y = realTile.rotation.y;
            fakeTile.rotation.z = realTile.rotation.z;
            
            const fBorderLine = fakeTile.userData.borderLine;
 
            fakeTile.userData = {
                ...realTile.userData,
                bodyMesh: fakeTile.userData.bodyMesh || null,
                edgeMesh: fakeTile.userData.edgeMesh || null,
                centerMesh: null,
                isFake: true,
                isBroken: false,
                fallSpeed: 0
            };
            
            if (fBorderLine) fakeTile.userData.borderLine = fBorderLine;
            
            if (typeof scene !== 'undefined') scene.add(fakeTile);
            this.fakeTiles.push(fakeTile);
        });
    },

    // Ghi lại vị trí X của khối thật vừa spawn (giữ tối đa 3 entries)
    _recordRealX: function(x) {
        if (!this.prevRealXs) this.prevRealXs = [];
        // Tránh ghi trùng lặp liên tiếp của cùng 1 tile trong cùng 1 call
        const last = this.prevRealXs.length ? this.prevRealXs[this.prevRealXs.length - 1] : null;
        if (last === x) {
            // nếu trùng giá trị cuối cùng thì vẫn thêm (để đếm liên tiếp), nhưng giới hạn độ dài
        }
        this.prevRealXs.push(x);
        while (this.prevRealXs.length > 3) this.prevRealXs.shift();
    },

    _lastTwoEqual: function() {
        return this.prevRealXs && this.prevRealXs.length >= 2 && (this.prevRealXs[this.prevRealXs.length - 1] === this.prevRealXs[this.prevRealXs.length - 2]);
    },
    // Đếm số lần liên tiếp cuối cùng có cùng giá trị X
    _countTrailingSame: function(val) {
        if (!this.prevRealXs || this.prevRealXs.length === 0) return 0;
        let count = 0;
        for (let i = this.prevRealXs.length - 1; i >= 0; i--) {
            if (this.prevRealXs[i] === val) count++; else break;
        }
        return count;
    },

    // Trả về object { key: count } cho các X của khối thật trên cùng một hàng (row)
    _scanRealTilesInSameRow: function(tile) {
        const counts = {};
        try {
            if (typeof tiles === 'undefined' || !Array.isArray(tiles)) return counts;

            const zTolerance = 0.5;
            const currentTileTime = (tile.userData && typeof tile.userData.time !== 'undefined') ? tile.userData.time : null;
            const currentTileRowId = (tile.userData && typeof tile.userData.rowId !== 'undefined') ? tile.userData.rowId : null;

            for (let i = 0; i < tiles.length; i++) {
                const t = tiles[i];
                if (!t || !t.userData) continue;
                // Skip fake tiles in tiles[] if any
                if (t.userData.isFake) continue;

                let sameRow = false;
                if (currentTileRowId !== null && typeof t.userData.rowId !== 'undefined') {
                    if (t.userData.rowId === currentTileRowId) sameRow = true;
                } else if (currentTileTime !== null && typeof t.userData.time !== 'undefined') {
                    if (Math.abs(t.userData.time - currentTileTime) < 0.05) sameRow = true;
                } else if (typeof t.position !== 'undefined' && typeof tile.position !== 'undefined') {
                    if (Math.abs(t.position.z - tile.position.z) < zTolerance) sameRow = true;
                }

                if (sameRow) {
                    const key = Math.round(t.position.x * 100) / 100;
                    counts[key] = (counts[key] || 0) + 1;
                }
            }
        } catch (e) {}
        return counts;
    },
    
    willSpawnFakeForNextTile: function(isFirst, timeDiff, isTooClose, nextTimeDiff = 1.0) {
        if (typeof window.EasyModeManager !== 'undefined' && window.EasyModeManager.isEnabled) return false;
        if (typeof activePlaylist !== 'undefined' && typeof selectedSongIndex !== 'undefined') {
            if (activePlaylist[selectedSongIndex] && activePlaylist[selectedSongIndex].no_fake_block) return false;
        }
        let threshold = 0.25;
        if (typeof window.AsianModeManager !== 'undefined' && window.AsianModeManager.isEnabled) {
            threshold = window.AsianModeManager.getFakeBlockThreshold();
        } else if (typeof window.HardModeManager !== 'undefined' && window.HardModeManager.isEnabled) {
            threshold = window.HardModeManager.getFakeBlockThreshold();
        }
        if (isFirst || isTooClose || timeDiff < threshold || nextTimeDiff < threshold) return false;

        const nextCounter = (this.spawnCounter || 0) + 1;
        const cyclePos = (nextCounter - 1) % 180;

        if (cyclePos >= 30 && cyclePos < 60) return true; // SNAP_3_ONE_FAKE
        if (cyclePos >= 90 && cyclePos < 120) return true; // SOLE
        if (cyclePos >= 150 && cyclePos < 180) return true; // FORCE_3
        return false;
    },

    onTileSpawned: function(tile, isFirst, timeDiff, isTooClose, nextTimeDiff = 1.0) {
        // Bỏ qua nếu Easy mode đang bật hoặc bài hát được cấu hình không sử dụng khối giả
        if (typeof window.EasyModeManager !== 'undefined' && window.EasyModeManager.isEnabled) {
            try { this._recordRealX(tile.position.x); } catch (e) {}
            return;
        }

        if (typeof activePlaylist !== 'undefined' && typeof selectedSongIndex !== 'undefined') {
            if (activePlaylist[selectedSongIndex] && activePlaylist[selectedSongIndex].no_fake_block) {
                try { this._recordRealX(tile.position.x); } catch (e) {}
                return;
            }
        }

        // Bỏ qua các block 16 đầu tiên (Giai đoạn khởi động Warmup), block quá gần nhau về thời gian hoặc block chuyển vòng chơi
        const isWarmup = tile && tile.userData && tile.userData.roundValue === 0 && (tile.userData.beatIndex <= 16 || tile.userData.isInitial16Blocks);

        let threshold = 0.25;
        if (typeof window.AsianModeManager !== 'undefined' && window.AsianModeManager.isEnabled) {
            threshold = window.AsianModeManager.getFakeBlockThreshold();
        } else if (typeof window.HardModeManager !== 'undefined' && window.HardModeManager.isEnabled) {
            threshold = window.HardModeManager.getFakeBlockThreshold();
        }
        if (isFirst || isWarmup || isTooClose || timeDiff < threshold || nextTimeDiff < threshold || (tile.userData && tile.userData.isRoundStart) || (tile.userData && tile.userData.isMoving)) {
            try { this._recordRealX(tile.position.x); } catch (e) {}
            return;
        }
        
        this.spawnCounter = (this.spawnCounter || 0) + 1;
        
        // CƠ CHẾ PHA KE CHU KỲ (180 blocks):
        // - 0..29: NONE (Bình thường, không phake)
        // - 30..59: SNAP_3_ONE_FAKE (Snap3_one_fake)
        // - 60..89: NONE (Bình thường, không phake)
        // - 90..119: SOLE (So le - alternate between RANDOM and FORCE_3)
        // - 120..149: NONE (Bình thường, không phake)
        // - 150..179: FORCE_3 (Snap-3 hoàn toàn - 2 fake blocks)
        const cyclePos = (this.spawnCounter - 1) % 180;
        let spawnMode = 'NONE';
        if (cyclePos >= 30 && cyclePos < 60) spawnMode = 'SNAP_3_ONE_FAKE';
        else if (cyclePos >= 90 && cyclePos < 120) {
            // SOLE window: alternate between RANDOM and FORCE_3 (odd => RANDOM, even => FORCE_3)
            spawnMode = ((this.spawnCounter - 1) % 2 === 0) ? 'RANDOM' : 'FORCE_3';
        }
        else if (cyclePos >= 150 && cyclePos < 180) {
            spawnMode = 'FORCE_3';
        }
        
        // ============================================================
        // LOGIC CHỐNG OVERLAP & QUẢN LÝ ROW CHO ĐÚNG QUY TẮC CƠ CHẾ FORCE_3
        // ============================================================
        const zTolerance = 0.5; // Giảm sai số Z xuống nhỏ (0.5) để tối ưu độ chính xác tránh nhận diện nhầm hàng
        
        // Trích xuất thông tin định danh hàng từ map dữ liệu nếu có sẵn
        const currentTileTime = (tile.userData && typeof tile.userData.time !== 'undefined') ? tile.userData.time : null;
        const currentTileRowId = (tile.userData && typeof tile.userData.rowId !== 'undefined') ? tile.userData.rowId : null;

        // Xác định xem block mới xuất hiện có thuộc cùng 1 hàng đang theo dõi hay không
        let isSameRow = false;

        if (currentTileRowId !== null && this.lastRowId !== null) {
            isSameRow = (currentTileRowId === this.lastRowId);
        } else if (currentTileTime !== null && this.lastSpawnTime !== null) {
            isSameRow = (Math.abs(currentTileTime - this.lastSpawnTime) < 0.05); // Lệch nhau dưới 50ms được coi là cùng hàng
        } else if (this.lastSpawnZ !== null) {
            isSameRow = (Math.abs(tile.position.z - this.lastSpawnZ) < zTolerance);
        }

        if (isSameRow) {
            // ĐÂY LÀ BLOCK CHÍNH (REAL) TIẾP THEO XUẤT HIỆN TRÊN CÙNG HÀNG NGANG ĐÃ QUÉT!
            
            if (spawnMode === 'FORCE_3' || spawnMode === 'SNAP_3_ONE_FAKE') {
                const slots = [-4.5, 0, 4.5];

                // Đã có 3 block chính trên hàng này -> Ép sang hàng tiếp theo (Z mới)
                if (this.realBlocksOnCurrentZ >= 3) {
                    
                    // Lựa chọn slot trống từ các cột X còn lại (hoặc random nếu lỗi rỗng)
                    let freeSlot = slots.find(s => !this.usedSlotsOnCurrentZ.includes(s))
                        ?? slots[Math.floor(Math.random() * slots.length)];
                    try {
                        const rowCounts = this._scanRealTilesInSameRow(tile);
                        const freeKey = Math.round(freeSlot * 100) / 100;
                        if ((rowCounts[freeKey] || 0) >= 2) {
                            const alt = slots.find(s => (rowCounts[Math.round(s * 100) / 100] || 0) < 2 && !this.usedSlotsOnCurrentZ.includes(s));
                            if (typeof alt !== 'undefined') freeSlot = alt;
                        } else {
                            const prevVal = (this.prevRealXs && this.prevRealXs.length) ? this.prevRealXs[this.prevRealXs.length - 1] : null;
                            const isHardMode = (typeof window.HardModeManager !== 'undefined' && window.HardModeManager.isEnabled);
                            const maxTrailing = isHardMode ? 1 : 2;
                            if (prevVal !== null && this._countTrailingSame(prevVal) >= maxTrailing && freeSlot === prevVal) {
                                const alt = slots.find(s => s !== freeSlot && !this.usedSlotsOnCurrentZ.includes(s));
                                if (typeof alt !== 'undefined') freeSlot = alt;
                            }
                        }
                    } catch (e) {}

                    tile.position.x = freeSlot;

                    // Reset và khởi tạo bộ đếm định danh hàng mới cho block thứ 4 này
                    this.lastSpawnZ = tile.position.z;
                    this.lastSpawnTime = currentTileTime;
                    this.lastRowId = currentTileRowId;
                    
                    this.realBlocksOnCurrentZ = 1;
                    this.usedSlotsOnCurrentZ = [freeSlot];

                    // Ghi lịch sử X cho rule "không quá 2 gạch thẳng"
                    try { this._recordRealX(tile.position.x); } catch (e) {}
                    return;
                }

                // Chọn slot chưa dùng trên hàng hiện tại để khớp cột cho block chính tiếp theo
                const availableSlots = slots.filter(s => !this.usedSlotsOnCurrentZ.includes(s));

                if (availableSlots.length > 0) {
                    let bestSlot = availableSlots[0];
                    let minDiff = Infinity;

                    for (const slot of availableSlots) {
                        const diff = Math.abs(slot - tile.position.x);
                        if (diff < minDiff) {
                            minDiff = diff;
                            bestSlot = slot;
                        }
                    }

                    // Nếu 2 khối thật trước đó cùng X và bestSlot cũng giống vậy,
                    // ép chọn slot khác để tránh 3 khối thẳng liên tiếp.
                    let chosenSlot = bestSlot;
                    try {
                        const rowCounts = this._scanRealTilesInSameRow(tile);
                        const bestKey = Math.round(bestSlot * 100) / 100;
                        const bestCount = rowCounts[bestKey] || 0;

                        // Không chọn slot mà đã có >=2 real tiles
                        if (bestCount >= 2) {
                            const alt = availableSlots.find(s => (rowCounts[Math.round(s * 100) / 100] || 0) < 2) || availableSlots.find(s => s !== bestSlot) || availableSlots[0];
                            if (typeof alt !== 'undefined') chosenSlot = alt;
                        } else {
                            const isHardMode = (typeof window.HardModeManager !== 'undefined' && window.HardModeManager.isEnabled);
                            const maxTrailing = isHardMode ? 1 : 2;
                            const trailingCount = this._countTrailingSame(bestSlot);
                            if (trailingCount >= maxTrailing) {
                                const alt = availableSlots.find(s => s !== bestSlot) || availableSlots[0];
                                if (typeof alt !== 'undefined') chosenSlot = alt;
                            } else if (maxTrailing > 1 && this._lastTwoEqual()) {
                                const prevVal = this.prevRealXs[this.prevRealXs.length - 1];
                                if (prevVal === bestSlot) {
                                    const alt = availableSlots.find(s => s !== bestSlot && s !== prevVal) || availableSlots.find(s => s !== bestSlot);
                                    if (typeof alt !== 'undefined') chosenSlot = alt;
                                }
                            }
                        }
                    } catch (e) {}

                    tile.position.x = chosenSlot;

                    this.realBlocksOnCurrentZ++;
                    this.usedSlotsOnCurrentZ.push(chosenSlot);
                }
            }

            // Quét dọn các khối giả trước đó từng spawn đè vào vị trí X của block thật mới này
            const xTolerance = 1.0;
            for (let i = this.fakeTiles.length - 1; i >= 0; i--) {
                const fTile = this.fakeTiles[i];
                if (Math.abs(fTile.position.z - tile.position.z) < zTolerance && 
                    Math.abs(fTile.position.x - tile.position.x) < xTolerance) {
                    
                    if (typeof scene !== 'undefined') scene.remove(fTile);
                    fTile.visible = false;
                    
                    if (this.fakeTilePool.length < this.maxPoolSize) {
                        this.fakeTilePool.push(fTile);
                    } else {
                        this._disposeMaterial(fTile.material);
                        fTile.children.forEach(c => { this._disposeMaterial(c.material); });
                    }
                    this.fakeTiles.splice(i, 1);
                }
            }

            // Ghi lịch sử X sau khi xử lý row hiện tại
            try { this._recordRealX(tile.position.x); } catch (e) {}

            // Ngăn không cho đẻ thêm bất kỳ block phake nào trên hàng hiện tại
            return;
        }
        
        // TRƯỜNG HỢP KHỞI TẠO HÀNG Z MỚI
        this.lastSpawnZ = tile.position.z;
        this.lastSpawnTime = currentTileTime;
        this.lastRowId = currentTileRowId;
        
        // Áp rule: nếu 2 khối thật trước đó có cùng X, thì block thứ 3 không được cùng X nữa
        try {
            const offset = 4.5;
            const maxTrackX = 4.5;
            const prevVal = (this.prevRealXs && this.prevRealXs.length) ? this.prevRealXs[this.prevRealXs.length - 1] : null;
            const isHardMode = (typeof window.HardModeManager !== 'undefined' && window.HardModeManager.isEnabled);
            const maxTrailing = isHardMode ? 1 : 2;
            if (prevVal !== null && this._countTrailingSame(prevVal) >= maxTrailing) {
                if (tile.position.x === prevVal) {
                    try {
                        const rowCounts = this._scanRealTilesInSameRow(tile);
                        // find candidate that has <2 in row and within bounds
                        const candidates = [];
                        const tryRight = tile.position.x + offset;
                        const tryLeft = tile.position.x - offset;
                        if (tryRight <= maxTrackX) candidates.push(tryRight);
                        if (tryLeft >= -maxTrackX) candidates.push(tryLeft);
                        if (0 !== tile.position.x) candidates.push(0);

                        const alt = candidates.find(c => (rowCounts[Math.round(c * 100) / 100] || 0) < 2);
                        if (typeof alt !== 'undefined') {
                            tile.position.x = alt;
                        } else if (candidates.length > 0) {
                            tile.position.x = candidates[0];
                        }
                    } catch (e) {
                        const tryRight = tile.position.x + offset;
                        const tryLeft = tile.position.x - offset;
                        if (tryRight <= maxTrackX) {
                            tile.position.x = tryRight;
                        } else if (tryLeft >= -maxTrackX) {
                            tile.position.x = tryLeft;
                        } else if (tile.position.x !== 0) {
                            tile.position.x = 0;
                        }
                    }
                }
            }
        } catch (e) {}

        this.realBlocksOnCurrentZ = 1;
        this.usedSlotsOnCurrentZ = [tile.position.x];

        // Ghi lại vị trí X của khối thật mới này vào lịch sử
        try { this._recordRealX(tile.position.x); } catch (e) {}
        // ============================================================

        if (spawnMode === 'NONE') {
            try { this._recordRealX(tile.position.x); } catch (e) {}
            return;
        }
        
        // Tiến hành sinh khối fake
        this.createFakeTile(tile, timeDiff, spawnMode === 'FORCE_3' ? 2 : (spawnMode === 'SNAP_3_ONE_FAKE' ? 'SNAP_3_ONE_FAKE' : null));
    },

    shatterTile: function(fTile) {
        if (typeof blockShatterEnabled !== 'undefined' && !blockShatterEnabled) return;
        if (!this.fragments) this.fragments = [];
        if (!this.fragmentPool) this.fragmentPool = [];
        
        let tileColor;
        if (fTile.material && fTile.material.color) {
            tileColor = fTile.material.color.clone();
        } else {
            tileColor = new THREE.Color(0x00ffff);
        }
        
        const count = 6;
        const tWidth = typeof tileWidth !== 'undefined' ? tileWidth : 4.0;
        const rTileL = typeof tileLength !== 'undefined' ? tileLength : 4.0;
        const scaleX = fTile.scale.x || 1.0;
        const scaleZ = fTile.scale.z || 1.0;
        const actualWidth = tWidth * scaleX;
        const actualLength = rTileL * scaleZ;
        
        for (let i = 0; i < count; i++) {
            const w = (Math.random() * 0.4 + 0.2) * scaleX;
            const h = Math.random() * 0.2 + 0.1;
            const d = (Math.random() * 0.4 + 0.2) * scaleZ;
            
            let frag;
            if (this.fragmentPool.length > 0) {
                frag = this.fragmentPool.pop();
                if (frag.material) {
                    frag.material.color.copy(tileColor);
                    if (frag.material.emissive) {
                        frag.material.emissive.copy(tileColor).multiplyScalar(0.3);
                    }
                    frag.material.opacity = 0.8;
                }
                frag.visible = true;
            } else {
                if (!this.sharedFragGeometry) {
                    this.sharedFragGeometry = new THREE.BoxGeometry(1, 1, 1);
                }
                // Sử dụng MeshBasicMaterial cực kì nhẹ để tối ưu hóa hiệu năng render mảnh vỡ
                const mat = new THREE.MeshBasicMaterial({
                    color: tileColor,
                    transparent: true,
                    opacity: 0.8
                });
                frag = new THREE.Mesh(this.sharedFragGeometry, mat);
            }
            
            frag.scale.set(w, h, d);
            
            const offsetX = (Math.random() - 0.5) * actualWidth;
            const offsetZ = (Math.random() - 0.5) * actualLength;
            frag.position.set(
                fTile.position.x + offsetX,
                fTile.position.y + 0.1,
                fTile.position.z + offsetZ
            );
            
            const speedMultiplier = 6;
            const vx = (Math.random() - 0.5) * speedMultiplier;
            const vy = Math.random() * 6 + 4;
            const vz = (Math.random() - 0.5) * speedMultiplier;
            
            const rx = (Math.random() - 0.5) * 10;
            const ry = (Math.random() - 0.5) * 10;
            const rz = (Math.random() - 0.5) * 10;
            
            frag.userData = {
                vx: vx,
                vy: vy,
                vz: vz,
                rx: rx,
                ry: ry,
                rz: rz,
                opacity: 0.8
            };
            
            if (typeof scene !== 'undefined') scene.add(frag);
            this.fragments.push(frag);
        }
    },
    
    update: function(delta, gameSpeed, ball, currentTileIndex) {
        const ballZ = ball.position.z;
        const ballX = ball.position.x;
        const ballY = ball.position.y;
        
        const rTileW = typeof tileWidth !== 'undefined' ? tileWidth : 4.0;
        const rTileL = typeof tileLength !== 'undefined' ? tileLength : 4.0;
        const bRadius = typeof ballRadius !== 'undefined' ? ballRadius : 0.75;
        const mFloor = typeof minFloor !== 'undefined' ? minFloor : 0.95;
        
        for (let i = this.fakeTiles.length - 1; i >= 0; i--) {
            const fTile = this.fakeTiles[i];

            // --- XỬ LÝ TRƯỢT THOÁT CỦA FAKE BLOCK (ĐỒNG BỘ VỚI BLOCK CHÍNH) ---
            if (fTile.userData.isExiting) {
                // Khởi tạo exit state khi mới bắt đầu thoát
                if (fTile.userData.exitVelZ === undefined) {
                    fTile.userData.exitVelZ = 0;
                    fTile.userData.exitStartZ = fTile.position.z;
                    const bl = fTile.userData.borderLine;
                    fTile.userData.exitOpacity = (bl && bl.material) ? (bl.material.opacity || 1.0) : 1.0;
                }

                // Tăng tốc dần về phía sau (hướng camera) — ease-in
                fTile.userData.exitVelZ += 60 * delta;
                fTile.position.z += fTile.userData.exitVelZ * delta;

                // Fade tất cả các phần hiển thị
                const fadeDelta = 2.2 * delta;
                fTile.userData.exitOpacity = Math.max(0, fTile.userData.exitOpacity - fadeDelta);
                const op = fTile.userData.exitOpacity;

                // Body
                if (fTile.material) fTile.material.opacity = Math.max(0, fTile.material.opacity - fadeDelta);

                // Viền
                if (fTile.userData.borderLine && fTile.userData.borderLine.material) {
                    fTile.userData.borderLine.material.opacity = op;
                }

                // Glow
                const glowMesh = fTile.getObjectByName("glowMesh");
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
                const camZ = typeof camera !== 'undefined' ? camera.position.z : fTile.userData.exitStartZ + 20;
                if (op <= 0 || fTile.position.z > camZ + 5) {
                    if (typeof scene !== 'undefined') scene.remove(fTile);
                    fTile.visible = false;
                    
                    delete fTile.userData.exitVelZ;
                    delete fTile.userData.exitStartZ;
                    delete fTile.userData.exitOpacity;
                    delete fTile.userData.isExiting;

                    if (this.fakeTilePool.length < this.maxPoolSize) {
                        this.fakeTilePool.push(fTile);
                    } else {
                        this._disposeMaterial(fTile.material);
                        fTile.children.forEach(c => { this._disposeMaterial(c.material); });
                    }
                    this.fakeTiles.splice(i, 1);
                }
                continue;
            }
            
            // --- ĐỒNG BỘ MÀU SẮC ĐỘNG NHƯ KHỐI THẬT ---
            if (typeof dynamicColorsEnabled !== 'undefined' && dynamicColorsEnabled && typeof clock !== 'undefined' && typeof tempColor !== 'undefined') {
                const hue = (clock.getElapsedTime() * 0.2) % 1;
                tempColor.setHSL(hue, 0.8, 0.5);
                const hex = tempColor.getHex();
                
                fTile.userData.themeColor = hex;
                if (fTile.material) {
                    fTile.material.color.setHex(hex);
                    if (fTile.material.emissive) fTile.material.emissive.copy(tempColor).multiplyScalar(0.2);
                }
                if (fTile.userData.borderLine && fTile.userData.borderLine.material) {
                    const rawApi = localStorage.getItem('graphicsAPI') || 'webgl';
                    const isWebGPU = (rawApi === 'd2ViZ3B1' || rawApi === 'webgpu');
                    fTile.userData.borderLine.material.color.setHex(isWebGPU ? 0xffffff : hex);
                }
                const glowMesh = fTile.getObjectByName("glowMesh");
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
            
            // Animation lúc spawn (đồng bộ với block chính)
            if (fTile.userData.isEntering) {
                const animationMultiplier = Math.max(1.0, gameSpeed * 0.8);
                const enterSpeed = 1 - Math.exp(-12 * animationMultiplier * delta);
                
                const animMode = typeof spawnAnimationMode !== 'undefined' ? spawnAnimationMode : 'slide';

                if (animMode === 'slide' || animMode === 'mix') {
                    const targetZ = fTile.userData.targetZ;
                    fTile.position.z += (targetZ - fTile.position.z) * enterSpeed;

                    // Tạm tắt distToTargetZ < 15 (auto instant) để slide mượt ngay cả khi nhịp dồn dập
                    if (ballZ < fTile.position.z || Math.abs(fTile.position.z - targetZ) < 0.1) {
                        fTile.position.z = targetZ;
                        fTile.userData.isEntering = false;
                    }
                }
            }
            
            // Xử lý va chạm phá vỡ khối fake
            if (!fTile.userData.isBroken && typeof isFalling !== 'undefined' && !isFalling) {
                if (Math.abs(ballZ - fTile.position.z) < (rTileL / 2)) {
                    if (ballY - mFloor < 0.5) {
                        const fakeTileScale = fTile.userData.scale || 1.0;
                        if (Math.abs(ballX - fTile.position.x) < (rTileW * fakeTileScale / 2 + bRadius)) {
                            // Phát âm thanh khi vỡ
                            if (typeof playBreakBlockSound === 'function') {
                                playBreakBlockSound();
                            }
                            
                            // Tạo các mảnh vỡ
                            this.shatterTile(fTile);
                            
                            // Dọn dẹp & thu hồi khối fake lập tức
                            if (typeof scene !== 'undefined') scene.remove(fTile);
                            fTile.visible = false;
                            
                            if (this.fakeTilePool.length < this.maxPoolSize) {
                                this.fakeTilePool.push(fTile);
                            } else {
                                this._disposeMaterial(fTile.material);
                                fTile.children.forEach(c => { this._disposeMaterial(c.material); });
                            }
                            
                            this.fakeTiles.splice(i, 1);
                            continue;
                        }
                    }
                }
            }
            
            // Dọn dẹp nếu bị bỏ lại phía sau (Kích hoạt trượt thoát)
            if (fTile.position.z > ballZ + 15 && !fTile.userData.isBroken) {
                if (typeof spawnAnimationMode !== 'undefined' && spawnAnimationMode !== 'none') {
                    fTile.userData.isExiting = true;
                } else {
                    if (typeof scene !== 'undefined') scene.remove(fTile);
                    fTile.visible = false;
                    
                    if (this.fakeTilePool.length < this.maxPoolSize) {
                        this.fakeTilePool.push(fTile);
                    } else {
                        this._disposeMaterial(fTile.material);
                        fTile.children.forEach(c => { this._disposeMaterial(c.material); });
                    }
                    
                    this.fakeTiles.splice(i, 1);
                }
            }
        }

        // --- CẬP NHẬT MẢNH VỠ PHÁT RA TỪ KHỐI GIẢ ---
        if (this.fragments) {
            for (let k = this.fragments.length - 1; k >= 0; k--) {
                const frag = this.fragments[k];
                frag.userData.vy -= 25 * delta; // Trọng lực
                
                frag.position.x += frag.userData.vx * delta;
                frag.position.y += frag.userData.vy * delta;
                frag.position.z += frag.userData.vz * delta;
                
                frag.rotation.x += frag.userData.rx * delta;
                frag.rotation.y += frag.userData.ry * delta;
                frag.rotation.z += frag.userData.rz * delta;
                
                frag.userData.opacity -= 1.5 * delta;
                frag.material.opacity = frag.userData.opacity;
                
                if (frag.position.y < -20 || frag.userData.opacity <= 0) {
                    if (typeof scene !== 'undefined') scene.remove(frag);
                    frag.visible = false;
                    if (!this.fragmentPool) this.fragmentPool = [];
                    this.fragmentPool.push(frag);
                    this.fragments.splice(k, 1);
                }
            }
        }
    },
    
    reset: function() {
        this.fakeTiles.forEach(t => {
            if (typeof scene !== 'undefined') scene.remove(t);
            t.visible = false;
            
            if (this.fakeTilePool.length < this.maxPoolSize) {
                this.fakeTilePool.push(t);
            } else {
                this._disposeMaterial(t.material);
                t.children.forEach(c => { this._disposeMaterial(c.material); });
            }
        });
        this.fakeTiles = [];

        if (this.fragments) {
            this.fragments.forEach(f => {
                if (typeof scene !== 'undefined') scene.remove(f);
                f.visible = false;
                if (!this.fragmentPool) this.fragmentPool = [];
                this.fragmentPool.push(f);
            });
        }
        this.fragments = [];

        this.spawnCounter = 0;
        this.lastSpawnZ = null;
        this.lastSpawnTime = null;
        this.lastRowId = null;
        this.realBlocksOnCurrentZ = 0;
        this.usedSlotsOnCurrentZ = [];
    },
    
    destroy: function() {
        this.reset();
        
        // Giải phóng các tile trong pool
        this.fakeTilePool.forEach(t => {
            if (t.geometry) t.geometry.dispose();
            this._disposeMaterial(t.material);
            t.children.forEach(c => {
                if (c.geometry) c.geometry.dispose();
                this._disposeMaterial(c.material);
            });
        });
        this.fakeTilePool = [];
        
        // Giải phóng các mảnh vỡ trong pool
        if (this.fragmentPool) {
            this.fragmentPool.forEach(f => {
                if (f.geometry) f.geometry.dispose();
                this._disposeMaterial(f.material);
            });
        }
        this.fragmentPool = [];
        
        // Giải phóng geometry dùng chung cho mảnh vỡ
        if (this.sharedFragGeometry) {
            this.sharedFragGeometry.dispose();
            this.sharedFragGeometry = null;
        }
    }
};

// Khởi tạo trạng thái ban đầu
if (typeof window.FakeBlocksManager !== 'undefined') {
    window.FakeBlocksManager.reset();
}