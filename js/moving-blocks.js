// ============================================================
// moving-blocks.js — Logic di chuyển khối nâng cấp (Expansion Pack)
// ============================================================

window.MovingBlocksManager = {
    allMovingTiles: [],
    movingGroupCount: 0,
    activeGroupType: null, // Lưu kiểu di chuyển hiện tại của nhóm: 'ALIGNED', 'WAVY', 'ALTERNATING', 'RANDOM'
    groupBasePhase: 0,     // Pha cơ bản (phase) để đồng bộ hóa cho nhóm
    // groupSpeed: (Math.PI * 4) / 5
    groupSpeed: (Math.PI * 2) / 3,   // Tốc độ chung của cả nhóm (Chu kỳ 3s ở 1x)
    cooldownCount: 0,      // Thời gian nghỉ (số khối) giữa các nhóm di chuyển

    removeTile: function (tile) {
        if (!tile) return;
        if (tile.userData) {
            tile.userData.isMoving = false;
            tile.userData.moveType = null;
            delete tile.userData.moveSpeed;
            delete tile.userData.moveTime;
            delete tile.userData.amplitude;
            delete tile.userData.baseX;
        }
        const idx = this.allMovingTiles.indexOf(tile);
        if (idx !== -1) {
            const last = this.allMovingTiles.pop();
            if (idx < this.allMovingTiles.length) this.allMovingTiles[idx] = last;
        }
    },

    /**
     * Xử lý thiết lập trạng thái di chuyển cho một Tile (khối)
     * @param {THREE.Mesh} tile - Đối tượng Mesh của khối 
     * @param {boolean} canBeMoving - Khối này có thể di chuyển được không
     * @param {number} roundCount - Số vòng/màn hiện tại để điều chỉnh độ khó (tăng dần trong Endless)
     * @param {number} timeDiff - Khoảng thời gian so với block trước
     */
    processTile: function (tile, canBeMoving, roundCount, timeDiff = 1.0) {
        // Xóa sạch tham chiếu cũ của tile trong allMovingTiles bằng O(1) in-place không tạo mảng rác
        const oldIdx = this.allMovingTiles.indexOf(tile);
        if (oldIdx !== -1) {
            const last = this.allMovingTiles.pop();
            if (oldIdx < this.allMovingTiles.length) this.allMovingTiles[oldIdx] = last;
        }

        // Đảm bảo xóa sạch trạng thái cũ từ Object Pool để tránh lỗi tái sử dụng
        if (tile.userData) {
            tile.userData.isMoving = false;
            tile.userData.moveType = null;
            delete tile.userData.moveSpeed;
            delete tile.userData.moveTime;
            delete tile.userData.amplitude;
            delete tile.userData.baseX;
        } else {
            tile.userData = {};
        }

        let isMovingThisTile = false;

        // Tiếp tục nhóm di chuyển hiện tại
        if (this.movingGroupCount > 0 && canBeMoving) { 
            isMovingThisTile = true;
            this.movingGroupCount--;
            if (this.movingGroupCount === 0) {
                this.cooldownCount = Math.floor(Math.random() * 3) + 2; // Cooldown 2-4 khối
            }
        } 
        // Cơ hội bắt đầu một nhóm di chuyển mới (nếu đã hết thời gian nghỉ)
        const isEasyMode = (typeof window.EasyModeManager !== 'undefined' && window.EasyModeManager.isEnabled);
        const isAsianMode = (typeof window.AsianModeManager !== 'undefined' && window.AsianModeManager.isEnabled);
        const spawnChance = isEasyMode ? 0.05 : (isAsianMode ? 0.25 : 0.15);
        if (canBeMoving && this.cooldownCount <= 0 && Math.random() < spawnChance) { 
            // SPAWN THÔNG MINH: Giới hạn số lượng khối di chuyển dựa trên tốc độ nhịp nhạc
            let maxAllowed = Math.min(8, roundCount + 2);
            const isHardMode = (typeof window.HardModeManager !== 'undefined' && window.HardModeManager.isEnabled);
            if (isEasyMode) {
                maxAllowed = 2;
            } else if (isHardMode || isAsianMode) {
                maxAllowed = 10;
            } else {
                if (timeDiff < 0.3) maxAllowed = Math.min(3, maxAllowed);
                else if (timeDiff < 0.4) maxAllowed = Math.min(5, maxAllowed);
            }
            
            this.movingGroupCount = Math.floor(Math.random() * maxAllowed) + 1;
            
            // SPAWN THÔNG MINH: Hạn chế các quỹ đạo khó ('ALTERNATING', 'RANDOM') ở nhịp quá nhanh hoặc màn chơi thấp
            let types = ['ALIGNED'];
            if (isHardMode || timeDiff >= 0.25) types.push('WAVY');
            if (isHardMode || (timeDiff >= 0.35 && roundCount >= 2)) types.push('ALTERNATING');
            if (isHardMode || (timeDiff >= 0.45 && roundCount >= 3)) types.push('RANDOM');
            
            this.activeGroupType = types[Math.floor(Math.random() * types.length)];
            this.groupBasePhase = Math.random() * Math.PI * 2; // Khởi tạo pha gốc ngẫu nhiên cho nhóm
            
            // Tốc độ ban đầu là 1x tương ứng di chuyển qua lại 2 biên trong 3s
            this.groupSpeed = (Math.PI * 2) / 4;
            
            isMovingThisTile = true;
            this.movingGroupCount--;
            if (this.movingGroupCount === 0) {
                this.cooldownCount = Math.floor(Math.random() * 3) + 2;
            }
        } 
        else {
            if (canBeMoving && this.cooldownCount > 0) this.cooldownCount--;
            this.movingGroupCount = 0;
            this.activeGroupType = null;
            return;
        }

        if (isMovingThisTile) {
            tile.userData.isMoving = true;
            tile.userData.moveType = this.activeGroupType;
            
            // LOGIC MỚI: Block sẽ quét qua lại toàn bộ 2 biên đường chạy (-4.5 đến 4.5)
            // Do đã có thời gian nghỉ (cooldown) nên người chơi đủ thời gian phản xạ
            tile.userData.amplitude = 4.5;
            tile.userData.baseX = 0; // Đặt tâm dao động ở chính giữa

            // Thiết lập tốc độ và thời gian bắt đầu (moveTime / Phase) dựa theo từng kiểu di chuyển:
            switch (this.activeGroupType) {
                case 'ALIGNED':
                    // Kiểu thẳng hàng: Tất cả các khối trong nhóm di chuyển song song, cùng pha, cùng hướng
                    tile.userData.moveSpeed = this.groupSpeed;
                    tile.userData.moveTime = this.groupBasePhase;
                    break;

                case 'WAVY':
                    // Kiểu uốn lượn: Pha di chuyển lệch dần dựa theo tọa độ Z tạo hiệu ứng lượn sóng mượt mà
                    tile.userData.moveSpeed = this.groupSpeed;
                    // Lệch pha dựa trên vị trí Z (khoảng cách giữa các khối)
                    tile.userData.moveTime = this.groupBasePhase + (tile.position.z * 0.15);
                    break;

                case 'ALTERNATING':
                    // Kiểu so le: Các khối kề nhau sẽ di chuyển ngược chiều nhau (lệch pha 180 độ - PI)
                    tile.userData.moveSpeed = this.groupSpeed;
                    const isEven = Math.round(tile.position.z / 10) % 2 === 0;
                    tile.userData.moveTime = this.groupBasePhase + (isEven ? 0 : Math.PI);
                    break;

                case 'RANDOM':
                default:
                    // Kiểu ngẫu nhiên thuần: Tốc độ có thể chênh lệch +/- 20%
                    tile.userData.moveSpeed = ((Math.PI * 2) / 3) * (0.8 + Math.random() * 0.4);
                    tile.userData.moveTime = Math.random() * Math.PI * 2;
                    break;
            }
            
            // LOGIC THÔNG MINH (CHỐNG IMPOSSIBLE JUMP): 
            // Giữ nguyên tọa độ X hiện tại, căn chỉnh lại Pha dao động (moveTime) để khối tiếp tục di chuyển từ điểm xuất hiện mà không bị giật hình.
            let ratio = tile.position.x / tile.userData.amplitude;
            ratio = Math.max(-1.0, Math.min(1.0, ratio)); // Đề phòng sai số
            let newAngle = Math.asin(ratio);
            tile.userData.moveTime = Math.cos(tile.userData.moveTime) < 0 ? Math.PI - newAngle : newAngle;

            this.allMovingTiles.push(tile);
        }
    },

    /**
     * Cập nhật vị trí và màu sắc của các khối đang di chuyển theo thời gian thực
     * @param {number} delta - Khoảng thời gian giữa các khung hình (Clock Delta)
     * @param {number} gameSpeed - Tốc độ hiện tại của game (tốc độ khối tỉ lệ thuận trực tiếp với biến này)
     * @param {number} ballZ - Vị trí Z của quả bóng để lọc các khối đã vượt qua
     * @param {number} [frameHex] - Màu động đã được tính trước ở khung hình (tùy chọn)
     */
    processedTilesSet: new Set(),

    update: function (delta, gameSpeed, ballZ, frameHex) {
        // TỐC ĐỘ DI CHUYỂN NGANG QUA LẠI: Tỉ lệ thuận với tốc độ game
        const speedFactor = gameSpeed; 
        const processedTiles = this.processedTilesSet;
        processedTiles.clear();

        for (let i = this.allMovingTiles.length - 1; i >= 0; i--) {
            const tile = this.allMovingTiles[i];

            // Loại khỏi danh sách khi block đã bị thu hồi về pool (parent = null), không phải khối di chuyển hoặc đã cập nhật trong frame
            if (!tile || !tile.userData || !tile.userData.isMoving || !tile.parent || tile.position.z > ballZ + 30 || processedTiles.has(tile)) {
                if (tile && tile.userData && tile.userData.isClone) {
                    if (typeof scene !== 'undefined' && scene) {
                        scene.remove(tile);
                    }
                    this.disposeHierarchy(tile);
                }
                const last = this.allMovingTiles.pop();
                if (i < this.allMovingTiles.length) {
                    this.allMovingTiles[i] = last;
                }
                continue;
            }

            processedTiles.add(tile);

            // Thực hiện tính toán di chuyển hình Sin tuần hoàn dựa trên moveTime riêng biệt của từng khối
            if (tile.userData.isMoving) {
                // Áp dụng speedFactor và delta
                tile.userData.moveTime += tile.userData.moveSpeed * speedFactor * delta;
                tile.position.x = tile.userData.baseX + Math.sin(tile.userData.moveTime) * tile.userData.amplitude;

                // Đồng bộ màu sắc động đổi màu liên tục (nếu cấu hình dynamic colors bật)
                if (typeof dynamicColorsEnabled !== 'undefined' && dynamicColorsEnabled) {
                    let hex = frameHex;
                    if (hex === undefined) {
                        if (tile.userData.themeColor !== undefined) {
                            hex = tile.userData.themeColor;
                        } else if (typeof clock !== 'undefined' && typeof tempColor !== 'undefined') {
                            const hue = (clock.getElapsedTime() * 0.2) % 1;
                            tempColor.setHSL(hue, 0.8, 0.5);
                            hex = tempColor.getHex();
                        } else {
                            hex = 0x00ffff;
                        }
                    }
                    
                    if (tile.userData.themeColor !== hex) {
                        tile.userData.themeColor = hex;
                        // Cập nhật màu mesh chính
                        if (tile.material) {
                            tile.material.color.setHex(hex);
                        }
                        // Cập nhật màu viền (borderLine)
                        if (tile.userData.borderLine && tile.userData.borderLine.material) {
                            const isWebGPU = (typeof window.isWebGPUCache !== 'undefined' ? window.isWebGPUCache : (typeof graphicsAPI !== 'undefined' && graphicsAPI === 'webgpu'));
                            tile.userData.borderLine.material.color.setHex(isWebGPU ? 0xffffff : hex);
                        }
                        // Cập nhật màu glowMesh
                        if (tile.userData.glowMesh === undefined) {
                            tile.userData.glowMesh = tile.getObjectByName("glowMesh") || null;
                        }
                        const glowMesh = tile.userData.glowMesh;
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
                }
            }
        }
    },

    /**
     * Dọn dẹp toàn bộ dữ liệu, xóa các khối clone khỏi Scene để tránh rò rỉ bộ nhớ khi restart game
     */
    reset: function () {
        this.allMovingTiles.forEach(tile => {
            if (tile.userData && tile.userData.isClone) {
                if (typeof scene !== 'undefined' && scene) {
                    scene.remove(tile);
                }
                this.disposeHierarchy(tile);
            }
        });
        
        this.allMovingTiles = [];
        this.movingGroupCount = 0;
        this.activeGroupType = null;
        this.groupBasePhase = 0;
        this.groupSpeed = (Math.PI * 2) / 3; // Trả về tốc độ ban đầu khi reset game
        this.cooldownCount = 0;
    },

    /**
     * Hàm bổ trợ dọn dẹp Geometry và Material để tối ưu bộ nhớ GPU
     * @param {THREE.Object3D} obj 
     */
    disposeHierarchy: function (obj) {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
            if (Array.isArray(obj.material)) {
                obj.material.forEach(mat => mat.dispose());
            } else {
                obj.material.dispose();
            }
        }
        if (obj.children) {
            obj.children.forEach(child => this.disposeHierarchy(child));
        }
    }
};