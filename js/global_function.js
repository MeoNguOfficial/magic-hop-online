// js/global_function.js

const MathUtils = {
    randomRange: function(min, max) {
        return min + Math.random() * (max - min);
    },
    randomInt: function(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },
    clamp: function(value, min, max) {
        return Math.max(min, Math.min(max, value));
    },
    lerp: function(start, end, amt) {
        return (1 - amt) * start + amt * end;
    },
    distanceSq: function(x1, y1, z1, x2, y2, z2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const dz = z2 - z1;
        return dx * dx + dy * dy + dz * dz;
    },
    distance: function(x1, y1, z1, x2, y2, z2) {
        return Math.sqrt(this.distanceSq(x1, y1, z1, x2, y2, z2));
    }
};

const PoolHelpers = {
    /**
     * Lấy object từ pool. Tự động tạo mới nếu pool trống (Auto-Expand).
     * @param {Array} pool - Mảng chứa các object nhàn rỗi.
     * @param {Function} createFunc - Hàm tạo object mới.
     * @param {Function} resetFunc - Hàm reset trạng thái object cũ.
     */
    acquire: function(pool, createFunc, resetFunc) {
        let obj;
        if (pool.length > 0) {
            obj = pool.pop();
            if (resetFunc) resetFunc(obj);
        } else {
            obj = createFunc();
        }
        return obj;
    },

    /**
     * Đưa object về lại pool để tái sử dụng, không huỷ object (GC friendly).
     * @param {Array} pool - Mảng chứa object.
     * @param {Object} obj - Object cần trả về.
     * @param {Function} cleanFunc - Hàm dọn dẹp các thành phần thừa (mesh visible = false...).
     */
    release: function(pool, obj, cleanFunc) {
        if (!obj) return;
        if (cleanFunc) cleanFunc(obj);
        pool.push(obj);
    },
    
    /**
     * Khởi tạo trước số lượng object vào pool.
     */
    prewarm: function(pool, count, createFunc, cleanFunc) {
        while (pool.length < count) {
            const obj = createFunc();
            if (cleanFunc) cleanFunc(obj);
            pool.push(obj);
        }
    }
};

window.MathUtils = MathUtils;
window.PoolHelpers = PoolHelpers;
