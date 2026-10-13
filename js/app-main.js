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
    let intervalDebugger = null;

    function isAllowedBypass() {
        return isUserAdmin() === true || devModeAllowed === true;
    }

    // --- BƯỚC 4: TÍCH HỢP DISABLE-DEVTOOL (THƯ VIỆN CHỐNG F12) ---
    function setupDisableDevtool() {
        if (typeof DisableDevtool !== 'undefined') {
            try {
                DisableDevtool({
                    url: 'warning.html',      // Chuyển hướng ngay lập tức khi mở F12
                    timeOutUrl: 'warning.html', // Chuyển hướng khi bị ai đó cố tình chặn script
                    tkName: 'devmode',
                    clearLog: false,          // Không xóa log của admin khi mở DevTools
                    disableMenu: false,       // Giữ nguyên Menu để trải nghiệm game mobile không bị lỗi touch
                    disableSelect: false,
                    disableCopy: false,
                    disableCut: false,
                    disablePaste: false,
                    seo: true,
                    ondevtoolopen: (type, next) => {
                        if (isAllowedBypass()) return;
                        next();
                    }
                });
                DisableDevtool.isSuspend = isAllowedBypass();
                return true;
            } catch (e) {}
        }
        return false;
    }

    if (!setupDisableDevtool()) {
        window.addEventListener('DOMContentLoaded', setupDisableDevtool);
        window.addEventListener('load', setupDisableDevtool);
    }

    // --- BƯỚC 5: NATIVE DEFENSE (CHẶN PHÍM TẮT & CÔNG CỤ DEBUG BÊN THỨ 3) ---
    function startNativeAntiDev() {
        if (isAllowedBypass()) return;
        window.addEventListener('keydown', preventKeys);
        checkThirdPartyTools();
    }

    function checkThirdPartyTools() {
        setInterval(() => {
            if (isAllowedBypass()) return;
            if (document.getElementById('__vconsole') || document.getElementById('eruda') || window.vConsole || window.eruda) {
                window.location.href = 'warning.html';
            }
        }, 1500);
    }

    function stopNativeAntiDev() {
        window.removeEventListener('keydown', preventKeys);
        if (intervalDebugger) {
            clearInterval(intervalDebugger);
            intervalDebugger = null;
        }
    }

    function preventKeys(e) {
        if (isAllowedBypass()) return;
        // Chặn F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+U
        if (
            e.keyCode === 123 || 
            (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67)) || 
            (e.ctrlKey && e.keyCode === 85)
        ) {
            e.preventDefault();
            window.location.href = 'warning.html';
            return false;
        }
    }

    startNativeAntiDev();

    // --- BƯỚC 6: QUẢN LÝ ĐỒNG BỘ TRẠNG THÁI ADMIN (DEV MODE) ---
    window.setDevMode = function(state, persistDays = 0) {
        devModeAllowed = state;
        
        if (state && persistDays > 0) {
            const expTime = new Date().getTime() + persistDays * 24 * 60 * 60 * 1000;
            localStorage.setItem('MeoTNDevModeExp', expTime.toString());
        } else if (!state) {
            localStorage.removeItem('MeoTNDevModeExp');
        }

        if (typeof DisableDevtool !== 'undefined') {
            DisableDevtool.isSuspend = state || isUserAdmin(); 
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