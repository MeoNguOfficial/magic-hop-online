// ============================================================
// beatmap-worker.js — Web Worker for Asynchronous Beatmap Processing
// GPU-First Pipeline: Offloads Beatmap Parsing & Coordinate Generation
// from the Main Thread to guarantee frame times < 8.33ms (120+ FPS)
// ============================================================

self.onmessage = function (e) {
    const { action, payload } = e.data;

    if (action === 'PROCESS_BEATMAP') {
        const { beats, baseVelocityZ, chosenMode, tileWidth, roundCount } = payload;
        const result = processBeatmapData(beats, baseVelocityZ, chosenMode, tileWidth, roundCount);

        // Zero-copy transfer using Transferable ArrayBuffer
        self.postMessage({
            action: 'BEATMAP_PROCESSED',
            tileCount: result.tileCount,
            buffer: result.buffer
        }, [result.buffer.buffer]);
    }
};

/**
 * Parses beats and pre-computes 3D coordinates (X, Y, Z) and difficulty parameters.
 * Serializes into a compact Float32Array: 6 floats per tile
 * [0: posX, 1: posY, 2: posZ, 3: timeDiff, 4: themeColor, 5: flags]
 */
function processBeatmapData(beats, baseVelocityZ, chosenMode, blockUnit = 4.0, round = 0) {
    if (!beats || !beats.length) {
        return { tileCount: 0, buffer: new Float32Array(0) };
    }

    const n = beats.length;
    // 6 floats per tile: X, Y, Z, timeDiff, themeColorHex, flags
    const stride = 6;
    const buffer = new Float32Array(n * stride);

    let lastZ = 0;
    let prevX = 0;
    const absVelZ = Math.abs(baseVelocityZ || -40);

    for (let i = 0; i < n; i++) {
        let timeDiff = 1.0;
        let isTooClose = false;

        if (i === 0) {
            timeDiff = 1.0;
        } else if (i === 1) {
            timeDiff = beats.length > 1 ? Math.max(0.3, beats[1] - beats[0]) : 1.0;
        } else {
            timeDiff = beats[i] - beats[i - 1];
        }

        if (timeDiff < 0.08) isTooClose = true;

        const tileZ = i === 0 ? 0 : lastZ - (timeDiff * absVelZ);
        lastZ = tileZ;

        // Calculate tile X positioning
        let tileX = 0;
        const isWarmup = (round === 0 && i < 16);
        const isFirst3 = (round === 0 && i < 3);

        if (i === 0 || isFirst3) {
            tileX = 0;
        } else if (isWarmup) {
            if (timeDiff < 0.3) {
                tileX = prevX;
            } else {
                const maxDelta = 0.5 * blockUnit;
                const minX = Math.max(-4.5, prevX - maxDelta);
                const maxX = Math.min(4.5, prevX + maxDelta);
                tileX = minX + Math.random() * (maxX - minX);
            }
        } else if (isTooClose) {
            tileX = prevX;
        } else {
            let maxDeltaX = Math.max(1.5, Math.min(6.0, timeDiff * 18));
            const minX = Math.max(-4.5, prevX - maxDeltaX);
            const maxX = Math.min(4.5, prevX + maxDeltaX);
            tileX = minX + Math.random() * (maxX - minX);
        }

        prevX = tileX;

        // Flags bitmask: bit 0: isRoundStart, bit 1: isFinalStar, bit 2: isWarmup
        let flags = 0;
        if (i === 0 && round > 0) flags |= 1;
        if (i === n - 1 && chosenMode === 'normal') flags |= 2;
        if (isWarmup) flags |= 4;

        const offset = i * stride;
        buffer[offset + 0] = tileX;
        buffer[offset + 1] = 0.0;
        buffer[offset + 2] = tileZ;
        buffer[offset + 3] = timeDiff;
        buffer[offset + 4] = (Math.random() > 0.4 ? 0xff00ff : 0x00ffff);
        buffer[offset + 5] = flags;
    }

    return {
        tileCount: n,
        buffer: buffer
    };
}
