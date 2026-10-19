// ============================================================
// game-camera.js — Quản lý Camera, SmoothDamp & Floating Origin
// ============================================================

window.GameCameraManager = {
    camera: null,
    camVelX: 0,
    camVelY: 0,
    camVelZ: 0,

    lookTarget: null,

    init: function (cameraInstance) {
        this.camera = cameraInstance;
        this.camVelX = 0;
        this.camVelY = 0;
        this.camVelZ = 0;
        if (!this.lookTarget && typeof THREE !== 'undefined') {
            this.lookTarget = new THREE.Vector3();
        }
    },

    update: function (delta, ball, gameStarted, isVictoryTransition, victoryCameraDecay = 1.0) {
        if (!this.camera || !ball || !gameStarted) return;

        const targetCamZ = ball.position.z + 13.2;
        const targetCamY = 6.8;
        const sideLimit = 4.5;
        const targetCamX = Math.max(-sideLimit, Math.min(sideLimit, ball.position.x));

        if (typeof isVictoryTransition !== 'undefined' && isVictoryTransition) {
            // Trong hiệu ứng kết thúc chiến thắng: Giảm dần độ bám đuôi để bóng bay vút xa dần
            const decayFactor = victoryCameraDecay || 1.0;
            const smoothTimeZ = 0.333 / Math.max(0.01, decayFactor);
            const dtZ = Math.min(delta, 0.1);
            const omegaZ = 2.0 / Math.max(0.05, smoothTimeZ);
            const xZ = omegaZ * dtZ;
            const expZ = 1.0 / (1.0 + xZ + 0.48 * xZ * xZ + 0.235 * xZ * xZ * xZ);
            const deltaZ = this.camera.position.z - targetCamZ;
            const tempVZ = (this.camVelZ + omegaZ * deltaZ) * dtZ;
            this.camVelZ = (this.camVelZ - omegaZ * tempVZ) * expZ;
            this.camera.position.z = targetCamZ + (deltaZ + tempVZ) * expZ;
        } else {
            // Trong khi chơi: Khóa cự ly cố định trên trục Z (+13.2 so với bóng)
            this.camera.position.z = targetCamZ;
            this.camVelZ = 0;
        }

        // Trục Y: Cố định độ cao 6.8
        this.camera.position.y = targetCamY;
        this.camVelY = 0;

        // Trục X: Giữ độ mượt (SmoothDamp) khi bóng di chuyển ngang
        const smoothTimeX = 0.5;
        const dtX = Math.min(delta, 0.1);
        const omegaX = 2.0 / smoothTimeX;
        const xX = omegaX * dtX;
        const expX = 1.0 / (1.0 + xX + 0.48 * xX * xX + 0.235 * xX * xX * xX);
        const deltaX = this.camera.position.x - targetCamX;
        const tempVX = (this.camVelX + omegaX * deltaX) * dtX;
        this.camVelX = (this.camVelX - omegaX * tempVX) * expX;
        this.camera.position.x = targetCamX + (deltaX + tempVX) * expX;

        // Hướng nhìn của camera luôn ổn định theo cự ly cố định phía trước (0 Allocation)
        if (this.lookTarget) {
            this.lookTarget.set(this.camera.position.x, 1.6, this.camera.position.z - 20);
            this.camera.lookAt(this.lookTarget);
        } else {
            this.camera.lookAt(this.camera.position.x, 1.6, this.camera.position.z - 20);
        }
    },

    reset: function () {
        this.camVelX = 0;
        this.camVelY = 0;
        this.camVelZ = 0;
    }
};
