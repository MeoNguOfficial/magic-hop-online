// ============================================================
// app-main.js — Easy Cheat bởi MeoTN Gaming
// ============================================================

(function() {
    // 1. Kiểm tra Bypass URL (tkName tương đương)
    // Cú pháp bypass: ?devmode=true
    const urlParams = new URLSearchParams(window.location.search);
    const isBypass = urlParams.get('devmode') === 'true'; 
    
    // 1.5 Kiểm tra cấu hình lưu trữ 7 ngày (Persisted Bypass)
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

    // --- LỚP 1: KẾT HỢP THƯ VIỆN DISABLE-DEVTOOL ---
    if (typeof DisableDevtool !== 'undefined') {
        DisableDevtool({
            url: 'warning.html',      // Chuyển hướng ngay lập tức khi mở F12
            timeOutUrl: 'warning.html', // Chuyển hướng khi bị ai đó cố tình chặn script/chặn debugger
            tkName: 'devmode',        // Trùng khớp với param bypass ở trên
            clearLog: true,           // Xóa sạch console log khi bật tab ẩn danh
            disableMenu: false,       // Giữ nguyên Menu để trải nghiệm game mobile không bị lỗi touch
            disableSelect: false,
            disableCopy: false,
            disableCut: false,
            disablePaste: false,
            seo: true
        });
        
        // Đồng bộ trạng thái ban đầu
        DisableDevtool.isSuspend = devModeAllowed;
    } else {
        // --- LỚP 2: KIỂM TRA BỊ THIẾU SCRIPT CHÍNH (THƯ VIỆN BỊ CHẶN) ---
        if (!devModeAllowed) {
            console.warn("Anti-DevTool core missing or blocked! Using fallback Native Defense.");
            // Do hỗ trợ PWA offline, đôi khi mạng lag script chưa load kịp, nên không chuyển hướng ngay.
            // Thay vào đó kích hoạt hệ thống chặn Native mạnh mẽ bên dưới.
        }
    }

    // --- LỚP 3: CHẶN PHÍM TẮT, BẪY DEBUGGER THUẦN VÀ 3RD PARTY TOOLS ---
    function startNativeAntiDev() {
        if (devModeAllowed) return;

        // 1. Chặn phím tắt mở DevTools và xem Source
        window.addEventListener('keydown', preventKeys);

        // 2. Bẫy debugger liên tục để đóng băng trình duyệt khi cố mở DevTools
        if (!intervalDebugger) {
            intervalDebugger = setInterval(function() {
                if (!devModeAllowed) {
                    const before = new Date().getTime();
                    (function() { return false; }
                        .constructor('debugger')
                        .call());
                    const after = new Date().getTime();
                    // Nếu thời gian khựng lớn hơn 100ms -> User đang mở DevTools hoặc bị breakpoint
                    if (after - before > 100) {
                        window.location.href = 'warning.html';
                    }
                }
            }, 100); // Chạy mỗi 100ms
        }

        // 3. Quét các công cụ gian lận/debug bên thứ ba (vConsole, Eruda)
        checkThirdPartyTools();
    }

    function checkThirdPartyTools() {
        setInterval(() => {
            if (devModeAllowed) return;
            if (document.getElementById('__vconsole') || document.getElementById('eruda') || window.vConsole || window.eruda) {
                window.location.href = 'warning.html';
            }
        }, 1500); // Quét mỗi 1.5 giây
    }

    function stopNativeAntiDev() {
        window.removeEventListener('keydown', preventKeys);
        if (intervalDebugger) {
            clearInterval(intervalDebugger);
            intervalDebugger = null;
        }
    }

    function preventKeys(e) {
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

    // --- KHỞI CHẠY HỆ THỐNG BẢO VỆ ---
    startNativeAntiDev();

    // --- QUẢN LÝ HIỂN THỊ CONSOLE LOG (Chỉ hiện khi Dev Mode ON hoặc Admin) ---
    function isUserAdmin() {
        try {
            const rawUser = localStorage.getItem('auth_user');
            if (rawUser) {
                const user = JSON.parse(rawUser);
                if (user && (user.role === 'admin' || user.is_admin === 1 || user.is_admin === true || user.id === 1)) {
                    return true;
                }
            }
        } catch (e) {}
        return false;
    }

    function isConsoleAllowed() {
        return devModeAllowed === true || isUserAdmin() === true;
    }

    const originalConsole = {
        log: console.log.bind(console),
        info: console.info.bind(console),
        warn: console.warn.bind(console),
        error: console.error.bind(console),
        debug: console.debug.bind(console),
        trace: console.trace.bind(console)
    };

    console.log = function(...args) {
        if (isConsoleAllowed()) originalConsole.log(...args);
    };
    console.info = function(...args) {
        if (isConsoleAllowed()) originalConsole.info(...args);
    };
    console.warn = function(...args) {
        if (isConsoleAllowed()) originalConsole.warn(...args);
    };
    console.error = function(...args) {
        if (isConsoleAllowed()) originalConsole.error(...args);
    };
    console.debug = function(...args) {
        if (isConsoleAllowed()) originalConsole.debug(...args);
    };
    console.trace = function(...args) {
        if (isConsoleAllowed()) originalConsole.trace(...args);
    };

    // --- QUẢN LÝ ĐỒNG BỘ TRẠNG THÁI ADMIN (DEV MODE) ---
    window.setDevMode = function(state, persistDays = 0) {
        devModeAllowed = state;
        
        if (state && persistDays > 0) {
            const expTime = new Date().getTime() + persistDays * 24 * 60 * 60 * 1000;
            localStorage.setItem('MeoTNDevModeExp', expTime.toString());
        } else if (!state) {
            localStorage.removeItem('MeoTNDevModeExp');
        }

        // Cập nhật cho thư viện DisableDevtool
        if (typeof DisableDevtool !== 'undefined') {
            DisableDevtool.isSuspend = state; 
        }
        
        // Cập nhật cho bộ chặn thuần (Native)
        if (state) {
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