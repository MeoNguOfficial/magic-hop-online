// ============================================================
// dash-blocks.js — Quản lý Gạch Lướt Siêu Tốc (Dash Blocks Manager)
// ============================================================

window.DashBlocksManager = {
    matDash: null,
    borderMatDash: null,
    glowMatDash: null,
    dimmedMatDash: null,
    geoCache: new Map(),

    /**
     * Helper tạo hình bo góc chuẩn xác (không làm méo góc khi đổi độ dài)
     */
    createRoundedRectShape: function (width, height, radius) {
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
    },

    /**
     * Khởi tạo vật liệu riêng cho Dash Tiles (Vàng Kim / Cam Neon hổ phách)
     */
    initMaterials: function (currentGraphicsQuality) {
        if (!this.matDash) {
            this.matDash = (currentGraphicsQuality === 'simple'
                ? new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.85, depthWrite: false, color: 0xffaa00 })
                : new THREE.MeshPhongMaterial({ transparent: true, opacity: 0.75, shininess: 140, depthWrite: false, color: 0xffaa00, emissive: 0x332200 }));
            window.globalTileMatDash = this.matDash;
        }
        if (!this.dimmedMatDash) {
            this.dimmedMatDash = this.matDash.clone();
            this.dimmedMatDash.opacity = 0.08;
            window.globalTileDimmedMatDash = this.dimmedMatDash;
        }
        if (!this.borderMatDash) {
            this.borderMatDash = new THREE.MeshBasicMaterial({
                color: 0xffcc00,
                transparent: true,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });
            window.globalBorderMatDash = this.borderMatDash;
        }
        if (!this.glowMatDash) {
            if (window.globalTileGlowMatDash) {
                this.glowMatDash = window.globalTileGlowMatDash;
            } else if (typeof window.createTileGlowMaterial === 'function') {
                this.glowMatDash = window.createTileGlowMaterial(0xffaa00);
                window.globalTileGlowMatDash = this.glowMatDash;
            }
        }
    },

    /**
     * Đồng bộ màu động (Dynamic Color) cho Dash Tiles - Zero GC
     */
    syncDynamicColor: function (currentFrameHex, tempColor, isDynamic) {
        if (!this.matDash) return;

        if (isDynamic && currentFrameHex !== undefined) {
            if (this.matDash.color.getHex() !== currentFrameHex) {
                this.matDash.color.setHex(currentFrameHex);
                if (this.matDash.emissive && tempColor) {
                    this.matDash.emissive.copy(tempColor).multiplyScalar(0.2);
                }
            }
            if (this.dimmedMatDash && this.dimmedMatDash.color.getHex() !== currentFrameHex) {
                this.dimmedMatDash.color.setHex(currentFrameHex);
                if (this.dimmedMatDash.emissive && tempColor) {
                    this.dimmedMatDash.emissive.copy(tempColor).multiplyScalar(0.2);
                }
            }
            if (this.borderMatDash && this.borderMatDash.color.getHex() !== currentFrameHex) {
                this.borderMatDash.color.setHex(currentFrameHex);
            }
            if (this.glowMatDash) {
                if (this.glowMatDash.uniforms && this.glowMatDash.uniforms.color) {
                    if (this.glowMatDash.uniforms.color.value.getHex() !== currentFrameHex) {
                        this.glowMatDash.uniforms.color.value.setHex(currentFrameHex);
                    }
                } else if (this.glowMatDash.color && this.glowMatDash.color.getHex() !== currentFrameHex) {
                    this.glowMatDash.color.setHex(currentFrameHex);
                }
            }
        } else {
            // Khôi phục màu Vàng Kim / Cam Neon gốc khi Dynamic Colors tắt
            if (this.matDash.color.getHex() !== 0xffaa00) {
                this.matDash.color.setHex(0xffaa00);
                if (this.matDash.emissive) this.matDash.emissive.setHex(0x332200);
            }
            if (this.dimmedMatDash && this.dimmedMatDash.color.getHex() !== 0xffaa00) {
                this.dimmedMatDash.color.setHex(0xffaa00);
                if (this.dimmedMatDash.emissive) this.dimmedMatDash.emissive.setHex(0x332200);
            }
            if (this.borderMatDash && this.borderMatDash.color.getHex() !== 0xffcc00) {
                this.borderMatDash.color.setHex(0xffcc00);
            }
            if (this.glowMatDash) {
                if (this.glowMatDash.uniforms && this.glowMatDash.uniforms.color) {
                    if (this.glowMatDash.uniforms.color.value.getHex() !== 0xffaa00) {
                        this.glowMatDash.uniforms.color.value.setHex(0xffaa00);
                    }
                } else if (this.glowMatDash.color && this.glowMatDash.color.getHex() !== 0xffaa00) {
                    this.glowMatDash.color.setHex(0xffaa00);
                }
            }
        }
    },

    /**
     * Nhận diện phần tử beat có phải là Dash Tile hay không
     */
    isDashBeat: function (beatItem) {
        return Array.isArray(beatItem) && beatItem.length >= 2;
    },

    /**
     * Trích xuất mốc thời gian bắt đầu và kết thúc của Dash Tile
     */
    getDashTimes: function (beatItem) {
        if (!this.isDashBeat(beatItem)) {
            const t = Number(beatItem) || 0;
            return { startTime: t, endTime: t, duration: 0 };
        }
        const s = Number(beatItem[0]) || 0;
        const e = Number(beatItem[1]) || 0;
        return { startTime: s, endTime: e, duration: Math.max(0, e - s) };
    },

    /**
     * Tính toán chiều dài dải lướt và tọa độ trục Z, góc chéo XZ
     */
    calculateDashZ: function (startZ, duration, baseBallVelocityZ, startX = 0, deltaX = 0) {
        const baseLength = duration * Math.abs(baseBallVelocityZ);
        const dX = deltaX || 0;
        const physicalLength = Math.sqrt(dX * dX + baseLength * baseLength);
        const angleZ = -Math.atan2(dX, baseLength);
        const exitX = startX + dX;
        const tileX = startX + (dX / 2);
        const tileZ = startZ - (baseLength / 2);
        const exitZ = startZ - baseLength;
        const totalZDist = Math.max(0.001, startZ - exitZ);
        return {
            dashLength: physicalLength,
            baseLength: baseLength,
            angleZ: angleZ,
            startX: startX,
            exitX: exitX,
            deltaX: dX,
            tileX: tileX,
            tileZ: tileZ,
            startZ: startZ,
            exitZ: exitZ,
            totalZDist: totalZDist,
            invTotalZDist: 1.0 / totalZDist,
            nextTileReferenceZ: exitZ,
            nextTileReferenceX: exitX
        };
    },

    /**
     * Lấy hoặc tạo mới Geometry chuẩn kích thước thực cho Dash Tile (Loại bỏ hoàn toàn Transform Scale)
     */
    getOrCreateGeometries: function (dashLength, tileWidth, currentGraphicsQuality, detailScale) {
        const dScale = typeof detailScale !== 'undefined' ? detailScale : 1.0;
        const quality = currentGraphicsQuality || 'fhd';
        // Tối ưu hóa: Lượng tử hóa độ dài theo bước 0.25 để gom nhóm cache cực đại, loại bỏ giật lag sinh geometry
        const roundedLength = Math.max(tileWidth, Math.round(dashLength * 4) / 4);
        const key = `${roundedLength}_${quality}_${dScale}`;

        if (this.geoCache.has(key)) {
            return this.geoCache.get(key);
        }

        const tileShape = this.createRoundedRectShape(tileWidth, roundedLength, 0.8);

        let baseCurve = 12;
        if (quality === 'simple') baseCurve = 1;
        else if (quality === 'hd') baseCurve = 6;
        else if (quality === 'fhd') baseCurve = 12;
        else if (quality === 'qhd') baseCurve = 18;
        else if (quality === 'uhd') baseCurve = 24;

        const curveSegments = Math.max(1, Math.round(baseCurve * dScale));
        const bevelEnabled = (typeof currentBevelEnabled !== 'undefined' && currentBevelEnabled) && (dScale >= 0.3);
        const tileThickness = typeof currentTileThickness !== 'undefined' ? currentTileThickness : 0.5;

        const extrudeSettings = {
            depth: tileThickness,
            bevelEnabled: bevelEnabled,
            bevelThickness: (typeof currentBevelThickness !== 'undefined' ? currentBevelThickness : 0.1) * Math.min(1.0, dScale),
            bevelSize: (typeof currentBevelSize !== 'undefined' ? currentBevelSize : 0.08) * Math.min(1.0, dScale),
            bevelSegments: Math.max(0, Math.round((typeof currentBevelSegments !== 'undefined' ? currentBevelSegments : 1) * dScale)),
            curveSegments: curveSegments
        };

        const tileGeo = new THREE.ExtrudeGeometry(tileShape, extrudeSettings);
        tileGeo.center();

        // Border Geometry: Viền chuẩn đều 0.25 trên mọi cạnh
        const borderThickness = 0.25;
        const borderShape = this.createRoundedRectShape(tileWidth + borderThickness, roundedLength + borderThickness, 0.8 + borderThickness / 2);
        const borderHole = this.createRoundedRectShape(tileWidth - borderThickness, roundedLength - borderThickness, Math.max(0, 0.8 - borderThickness / 2));
        borderShape.holes.push(borderHole);
        const borderGeo = new THREE.ShapeGeometry(borderShape, curveSegments);

        // Glow Skirt Geometry: Bể sáng khớp hoàn hảo theo viền dải gạch
        const glowHeight = typeof getCurrentGlowHeight === 'function' ? getCurrentGlowHeight() : 1.0;
        const glowExtrudeSettings = {
            depth: glowHeight,
            bevelEnabled: false,
            curveSegments: curveSegments
        };
        const glowGeo = new THREE.ExtrudeGeometry(tileShape, glowExtrudeSettings);
        glowGeo.center();

        // Shockwave Ring Geometry: Vòng sóng xung kích theo đúng hình dáng dải gạch
        const swBorderThickness = 0.22;
        const swShape = this.createRoundedRectShape(tileWidth + swBorderThickness, roundedLength + swBorderThickness, 0.9);
        const swHole = this.createRoundedRectShape(tileWidth - swBorderThickness, roundedLength - swBorderThickness, Math.max(0, 0.9 - swBorderThickness));
        swShape.holes.push(swHole);
        const shockwaveGeo = new THREE.ShapeGeometry(swShape, curveSegments);

        const entry = { tileGeo, borderGeo, glowGeo, shockwaveGeo };
        this.geoCache.set(key, entry);
        return entry;
    },

    /**
     * Khởi tạo trước (Prewarm) các kích thước gạch Dash tiêu chuẩn để 100% không bị đứng hình lúc chơi
     */
    prewarmGeometries: function (tileWidth, tileLength, currentGraphicsQuality, detailScale) {
        this.initMaterials(currentGraphicsQuality);
        const tWidth = tileWidth || 4.3;
        const tLen = tileLength || 4.3;
        const padLength = tLen * 0.5;
        const commonLengths = [
            tLen,
            tLen + padLength * 2,
            tLen * 1.5 + padLength * 2,
            tLen * 2.0 + padLength * 2,
            tLen * 2.5 + padLength * 2,
            tLen * 3.0 + padLength * 2,
            tLen * 4.0 + padLength * 2
        ];
        for (let i = 0; i < commonLengths.length; i++) {
            this.getOrCreateGeometries(commonLengths[i], tWidth, currentGraphicsQuality, detailScale);
        }
    },

    /**
     * Lấy Geometry sóng xung kích theo hình dáng dải gạch
     */
    getShockwaveGeometry: function (dashLength, tileWidth, currentGraphicsQuality, detailScale) {
        const entry = this.getOrCreateGeometries(dashLength, tileWidth, currentGraphicsQuality, detailScale);
        return entry ? entry.shockwaveGeo : null;
    },

    /**
     * Cấu hình trực quan và vật lý cho một Dash Tile lấy từ Object Pool
     */
    setupDashTile: function (tile, dashInfo, finalScale, surfaceZ, tileWidth, tileLength, ballRadius, currentGraphicsQuality, detailScale) {
        this.initMaterials(currentGraphicsQuality);

        const tLen = tileLength || 4.3;
        const padLength = tLen * 0.5;
        const physicalLength = Math.max(0, (dashInfo && dashInfo.dashLength) || 0);

        // Mở rộng chiều dài (expand length) ở điểm đầu (+Z) và điểm cuối (-Z) mỗi đầu thêm padLength = tileLength / 2
        // Giúp dải gạch có phần đệm đầu và đuôi đầy đủ như block thường, triệt tiêu hoàn toàn lỗi impossible jump
        const dashLength = Math.max(tLen, physicalLength + padLength * 2);
        const geos = this.getOrCreateGeometries(dashLength, tileWidth, currentGraphicsQuality, detailScale);

        // Gán Geometry đúng chuẩn tỉ lệ thực (KHÔNG dùng transform non-uniform scale)
        tile.geometry = geos.tileGeo;
        if (tile.userData.borderLine) {
            tile.userData.borderLine.geometry = geos.borderGeo;
            tile.userData.borderLine.material = this.borderMatDash;
        }

        const poolGlowMesh = (tile.userData && tile.userData.glowMesh) ? tile.userData.glowMesh : (tile.userData.glowMesh = tile.getObjectByName('glowMesh'));
        if (poolGlowMesh) {
            poolGlowMesh.geometry = geos.glowGeo;
            if (Array.isArray(poolGlowMesh.material)) {
                if (!this.glowMatDash) this.initMaterials(currentGraphicsQuality);
                if (this.glowMatDash) poolGlowMesh.material[1] = this.glowMatDash;
            }
        }

        // Tỉ lệ đồng nhất (Uniform Scale) - giữ nguyên góc bo tròn 0.8 và độ dày viền 0.25 tuyệt đối
        tile.scale.set(finalScale, finalScale, 1);
        tile.rotation.set(-Math.PI / 2, 0, dashInfo.angleZ || 0);

        // Đặt tâm tròn nguyên bản tại điểm đón bóng ở đầu dải lướt (tọa độ startZ / startX)
        // Trong hệ tọa độ local của mesh: tâm là 0, điểm đón bóng start nằm tại -(physicalLength / 2),
        // cách mép trước đúng padLength = tileLength / 2 như block thường!
        if (tile.userData.centerMesh) {
            tile.userData.centerMesh.scale.set(1, 1, 1);
            const entranceY = -(physicalLength / 2);
            tile.userData.centerMesh.position.set(0, entranceY, surfaceZ + 0.015);
            tile.userData.centerMesh.visible = true;
            tile.userData.centerMesh.updateMatrix();
        }

        // Cập nhật Hitbox Mesh cho gạch dài bao phủ toàn bộ chiều dài đã expand
        if (tile.userData.hitboxMesh) {
            const hitboxMesh = tile.userData.hitboxMesh;
            const scaleX = tileWidth + (ballRadius * 2.5 / finalScale);
            const scaleY = dashLength + (ballRadius * 1.64 / finalScale);
            hitboxMesh.scale.set(scaleX, scaleY, 0.4);
        }

        // Gán Material chuyên biệt tone Vàng Kim
        tile.material = this.matDash;

        // Gán UserData chuẩn xác
        const ud = tile.userData;
        ud.isDashTile = true;
        ud.themeColor = (typeof dynamicColorsEnabled !== 'undefined' && dynamicColorsEnabled && typeof currentFrameHex !== 'undefined') ? currentFrameHex : 0xffaa00;
        ud.dashLength = dashLength;
        ud.physicalLength = physicalLength;
        ud.dashStartTime = dashInfo.startTime;
        ud.dashEndTime = dashInfo.endTime;
        ud.startZ = dashInfo.startZ;
        ud.endZ = dashInfo.exitZ;
        ud.startX = dashInfo.startX !== undefined ? dashInfo.startX : tile.position.x;
        ud.exitX = dashInfo.exitX !== undefined ? dashInfo.exitX : tile.position.x;
        ud.deltaX = dashInfo.deltaX || 0;
        ud.angleZ = dashInfo.angleZ || 0;
        ud.totalZDist = dashInfo.totalZDist || Math.max(0.001, ud.startZ - ud.endZ);
        ud.invTotalZDist = dashInfo.invTotalZDist || (1.0 / ud.totalZDist);
    },

    /**
     * Bắt buộc góc quay chuẩn cho Dash Tile:
     * - Nếu là Moving Block: 100% thẳng dọc trục Z (rotation.z = 0)
     * - Nếu đứng yên: cho phép góc chéo angleZ tùy biến
     */
    enforceOrientation: function (tile) {
        if (tile && tile.userData && tile.userData.isDashTile) {
            if (tile.userData.isMoving) {
                tile.rotation.set(-Math.PI / 2, 0, 0);
            } else {
                tile.rotation.set(-Math.PI / 2, 0, tile.userData.angleZ || 0);
            }
        }
    },

    /**
     * Xóa sạch cấu hình Dash và khôi phục Geometry gốc khi tile được thu hồi về Object Pool
     */
    resetTile: function (tile, surfaceZ, tileLength) {
        if (!tile || !tile.userData) return;

        // Khôi phục Geometry gốc của Normal Tile
        if (typeof cachedTileGeo !== 'undefined' && cachedTileGeo) {
            tile.geometry = cachedTileGeo;
        }
        if (tile.userData.borderLine && typeof cachedBorderGeo !== 'undefined' && cachedBorderGeo) {
            tile.userData.borderLine.geometry = cachedBorderGeo;
        }
        if (tile.userData.glowMesh && typeof cachedGlowGeo !== 'undefined' && cachedGlowGeo) {
            tile.userData.glowMesh.geometry = cachedGlowGeo;
        }

        // Khôi phục Material tương ứng theo themeColor của tile
        const isMagenta = tile.userData.themeColor === 0xff00ff;
        tile.material = isMagenta ? window.globalTileMatMagenta : window.globalTileMatCyan;

        if (tile.userData.borderLine) {
            tile.userData.borderLine.material = isMagenta ? window.globalBorderMatMagenta : window.globalBorderMatCyan;
        }
        if (tile.userData.glowMesh && Array.isArray(tile.userData.glowMesh.material)) {
            tile.userData.glowMesh.material[1] = isMagenta ? window.globalTileGlowMatMagenta : window.globalTileGlowMatCyan;
        }

        tile.scale.set(1, 1, 1);
        tile.rotation.set(-Math.PI / 2, 0, 0);
        tile.userData.isDashTile = false;
        tile.userData.dashLength = 0;
        tile.userData.physicalLength = 0;
        tile.userData.dashStartTime = 0;
        tile.userData.dashEndTime = 0;
        tile.userData.startZ = 0;
        tile.userData.endZ = 0;
        tile.userData.startX = 0;
        tile.userData.exitX = 0;
        tile.userData.deltaX = 0;
        tile.userData.angleZ = 0;
        tile.userData.bounceY = 0;
        tile.userData.springVelocityY = 0;
        tile.userData.springY = 0;
        tile.userData.b = 0;
        tile.position.y = 0;

        if (tile.userData.centerMesh) {
            tile.userData.centerMesh.scale.set(1, 1, 1);
            tile.userData.centerMesh.position.set(0, 0, surfaceZ + 0.015);
            tile.userData.centerMesh.visible = true;
            tile.userData.centerMesh.updateMatrix();
        }
    },

    /**
     * Giải phóng cache Geometries khi đổi chất lượng đồ họa trong Cài đặt
     */
    clearCache: function () {
        this.geoCache.forEach(entry => {
            if (entry.tileGeo) entry.tileGeo.dispose();
            if (entry.borderGeo) entry.borderGeo.dispose();
            if (entry.glowGeo) entry.glowGeo.dispose();
            if (entry.shockwaveGeo) entry.shockwaveGeo.dispose();
        });
        this.geoCache.clear();
    }
};
