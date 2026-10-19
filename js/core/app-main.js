// ============================================================
// app-main.js — Security Gateway & Anti-Cheat bởi MeoTN Gaming
// ============================================================

(function() {
    // --- BƯỚC 1: XÁC MINH TÀI KHOẢN ADMIN (CRASH-PROOF & ĐA NGUỒN) ---
    function checkUserIsAdmin(u) {
        if (!u || typeof u !== 'object') return false;
        return !!(
            u.role === 'admin' ||
            u.is_admin === 1 ||
            u.is_admin === true ||
            u.is_admin === '1' ||
            u.id === 1 ||
            u.id === '1' ||
            u.username === 'admin' ||
            (typeof u.email === 'string' && u.email.toLowerCase() === 'admin@gmail.com')
        );
    }

    function isUserAdmin() {
        try {
            if (typeof window.isCurrentUserAdmin === 'function') {
                if (window.isCurrentUserAdmin()) return true;
            }
            if (typeof window.getAuthUser === 'function') {
                const u = window.getAuthUser();
                if (checkUserIsAdmin(u)) return true;
            }
            const rawUser = localStorage.getItem('auth_user');
            if (rawUser) {
                // 1. Thử parse trực tiếp JSON
                let user = null;
                try {
                    user = JSON.parse(rawUser);
                } catch (e) {}

                // 2. Thử giải mã Base64 + URL decode
                if (!user) {
                    try {
                        let decoded = atob(rawUser);
                        if (decoded.includes('%')) decoded = decodeURIComponent(decoded);
                        user = JSON.parse(decoded);
                    } catch (e) {}
                }

                // 3. Thử giải mã XOR cipher MEO_ của game
                if (!user && rawUser.startsWith('MEO_')) {
                    try {
                        let cleanRaw = rawUser.substring(4);
                        let decodedBase64 = atob(cleanRaw);
                        const xorKey = "MeoTNCyberHop2024";
                        let unxored = '';
                        for (let i = 0; i < decodedBase64.length; i++) {
                            unxored += String.fromCharCode(decodedBase64.charCodeAt(i) ^ xorKey.charCodeAt(i % xorKey.length));
                        }
                        if (unxored.includes('%')) unxored = decodeURIComponent(unxored);
                        user = JSON.parse(unxored);
                    } catch (e) {}
                }

                if (checkUserIsAdmin(user)) return true;
            }
        } catch (e) {}
        return false;
    }
    window.isUserAdmin = isUserAdmin;

    function isConsoleAllowed() {
        // QUY TẮC BẮT BUỘC: Tất cả console log CHỈ CÓ THỂ nhìn thấy khi đăng nhập bằng account Admin
        return isUserAdmin() === true;
    }
    window.isConsoleAllowed = isConsoleAllowed;

    // --- BƯỚC 2: KHÓA TOÀN BỘ CÁC PHƯƠNG THỨC CONSOLE (CHỈ ADMIN MỚI THẤY) ---
    const consoleMethods = [
        'log', 'info', 'warn', 'error', 'debug', 'trace',
        'dir', 'dirxml', 'table', 'group', 'groupCollapsed', 'groupEnd',
        'count', 'countReset', 'assert', 'time', 'timeLog', 'timeEnd'
    ];

    const originalConsole = {};
    window.__originalConsole = originalConsole;

    consoleMethods.forEach(method => {
        if (typeof console[method] === 'function') {
            originalConsole[method] = console[method].bind(console);
            console[method] = function(...args) {
                if (isConsoleAllowed()) {
                    originalConsole[method](...args);
                }
            };
        }
    });

    // --- BƯỚC 3: KIỂM TRA DEV MODE & BYPASS ---
    const urlParams = new URLSearchParams(window.location.search);
    const isBypass = urlParams.get('devmode') === 'true'; 

    const now = new Date().getTime();
    let isPersistedBypass = false;

    const savedExp = window.localStorage.getItem('MeoTNDevModeExp');
    if (savedExp) {
        try {
            let decoded = savedExp;
            try { decoded = decodeURIComponent(atob(savedExp)); } catch(e) {}
            const expTime = parseInt(decoded, 10);
            if (!isNaN(expTime) && now < expTime) {
                isPersistedBypass = true;
            } else {
                window.localStorage.removeItem('MeoTNDevModeExp');
            }
        } catch(e) {}
    }

    let devModeAllowed = isBypass || isPersistedBypass;

    function isAllowedBypass() {
        return isUserAdmin() === true || devModeAllowed === true;
    }
    window.isAllowedBypass = isAllowedBypass;

    // --- BƯỚC 4: HÀM ĐIỀU HƯỚNG CẢNH BÁO (REPLACE AN TOÀN) ---
    let isRedirecting = false;
    function triggerWarningRedirect() {
        if (isAllowedBypass() || isRedirecting) return;
        isRedirecting = true;
        try {
            window.location.replace('warning.html');
        } catch (e) {
            window.location.href = 'warning.html';
        }
    }

    // --- BƯỚC 5: TÍCH HỢP DISABLE-DEVTOOL (LOCAL & FULL DETECTORS) ---
    function setupDisableDevtool() {
        if (typeof window.DisableDevtool === 'function') {
            try {
                window.DisableDevtool({
                    url: 'warning.html',
                    timeOutUrl: 'warning.html',
                    tkName: 'devmode',
                    clearLog: false,
                    disableMenu: false,
                    disableSelect: false,
                    disableCopy: false,
                    disableCut: false,
                    disablePaste: false,
                    seo: true,
                    detectors: [0, 1, 2, 3, 4, 5, 6, 7],
                    ondevtoolopen: (type, next) => {
                        if (isAllowedBypass()) return;
                        triggerWarningRedirect();
                    }
                });
                window.DisableDevtool.isSuspend = isAllowedBypass();
                return true;
            } catch (e) {}
        }
        return false;
    }

    if (!setupDisableDevtool()) {
        window.addEventListener('DOMContentLoaded', setupDisableDevtool);
        window.addEventListener('load', setupDisableDevtool);
    }

    // --- BƯỚC 6: NATIVE MULTI-LAYER ANTI-DEV ENGINE (ĐA TẦNG PHÁT HIỆN) ---
    let nativeInterval = null;
    let trapElement = null;

    // Tầng 1: Window Size Difference (Phát hiện DevTools dạng Docked trên mọi trình duyệt)
    function checkSizeMismatch() {
        if (isAllowedBypass()) return false;
        const thresholdWidth = 160;
        const thresholdHeight = 200;
        const wDiff = window.outerWidth - window.innerWidth;
        const hDiff = window.outerHeight - window.innerHeight;
        return (wDiff > thresholdWidth || hDiff > thresholdHeight);
    }

    // Tầng 2: Debugger Timing Loop (Phát hiện DevTools dạng Undocked / Detached hoặc đã mở)
    function checkDebuggerTiming() {
        if (isAllowedBypass()) return false;
        const t0 = performance.now();
        (function() {}.constructor("debugger")());
        return (performance.now() - t0 > 100);
    }

    // Tầng 3: Element Trap (Phát hiện khi mở tab Elements hoặc Console)
    function initTrapElement() {
        if (!trapElement) {
            trapElement = document.createElement('div');
            Object.defineProperty(trapElement, 'id', {
                get: function() {
                    if (!isAllowedBypass()) {
                        triggerWarningRedirect();
                    }
                    return 'anti-dev';
                }
            });
        }
    }

    // Tầng 4: Chặn phím tắt F12, Ctrl+Shift+I/J/C, Ctrl+U, Cmd+Option+I/J/C
    function preventKeys(e) {
        if (isAllowedBypass()) return;
        const isF12 = (e.keyCode === 123);
        const isCtrlShift = e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67);
        const isCtrlU = e.ctrlKey && (e.keyCode === 85);
        const isMacCmdOpt = e.metaKey && e.altKey && (e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67 || e.keyCode === 85);

        if (isF12 || isCtrlShift || isCtrlU || isMacCmdOpt) {
            e.preventDefault();
            e.stopPropagation();
            triggerWarningRedirect();
            return false;
        }
    }

    function onWindowResize() {
        if (isAllowedBypass()) return;
        if (checkSizeMismatch()) {
            triggerWarningRedirect();
        }
    }

    function startNativeAntiDev() {
        if (isAllowedBypass()) return;

        window.addEventListener('keydown', preventKeys, true);
        window.addEventListener('resize', onWindowResize, { passive: true });
        initTrapElement();

        // Kiểm tra ngay lập tức nếu DevTools đã mở sẵn từ trước
        if (checkSizeMismatch()) {
            triggerWarningRedirect();
            return;
        }

        if (nativeInterval) clearInterval(nativeInterval);
        nativeInterval = setInterval(() => {
            if (isAllowedBypass()) {
                stopNativeAntiDev();
                return;
            }

            // 1. Kiểm tra kích thước cửa sổ
            if (checkSizeMismatch()) {
                triggerWarningRedirect();
                return;
            }

            // 2. Kiểm tra timing của debugger
            if (checkDebuggerTiming()) {
                triggerWarningRedirect();
                return;
            }

            // 3. Kích hoạt trap element console qua originalConsole
            if (originalConsole && typeof originalConsole.log === 'function' && trapElement) {
                originalConsole.log(trapElement);
            }

            // 4. Kiểm tra công cụ debug mobile bên thứ ba
            if (document.getElementById('__vconsole') || document.getElementById('eruda') || window.vConsole || window.eruda) {
                triggerWarningRedirect();
                return;
            }
        }, 700);
    }

    function stopNativeAntiDev() {
        window.removeEventListener('keydown', preventKeys, true);
        window.removeEventListener('resize', onWindowResize);
        if (nativeInterval) {
            clearInterval(nativeInterval);
            nativeInterval = null;
        }
    }

    startNativeAntiDev();

    // Thông báo trạng thái bypass cho Admin trong console gốc
    if (isAllowedBypass() && originalConsole && originalConsole.info) {
        originalConsole.info("%c[MeoTN Security Gateway] DevTools Bypass Active (Admin or DevMode enabled).", "color: #00ffff; font-weight: bold; background: #000; padding: 4px; border-radius: 4px;");
    }

    // --- BƯỚC 7: QUẢN LÝ ĐỒNG BỘ TRẠNG THÁI ADMIN (DEV MODE) ---
    window.setDevMode = function(state, persistDays = 0) {
        devModeAllowed = state;
        
        if (state && persistDays > 0) {
            const expTime = new Date().getTime() + persistDays * 24 * 60 * 60 * 1000;
            localStorage.setItem('MeoTNDevModeExp', expTime.toString());
        } else if (!state) {
            localStorage.removeItem('MeoTNDevModeExp');
        }

        if (typeof window.DisableDevtool !== 'undefined') {
            window.DisableDevtool.isSuspend = state || isUserAdmin(); 
        }
        
        if (state || isUserAdmin()) {
            stopNativeAntiDev();
            if (typeof hideWarning === 'function') hideWarning();
        } else {
            startNativeAntiDev();
        }
    };

    window.getDevMode = function() {
        return devModeAllowed;
    };
})();