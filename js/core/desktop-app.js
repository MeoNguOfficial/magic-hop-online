// ============================================================
// desktop-app.js — Bộ Điều Khiển Tối Ưu Hóa Game App Độc Lập (NO Electron)
// Tương thích chuẩn xác với Tauri v2, Windows WebView2 Runtime & Edge App Container.
// Quản lý Fullscreen F11, chống thoát ngoài ý muốn, khóa zoom và loại bỏ context menu mặc định.
// ============================================================

(function () {
    const isDesktop = !!(
        window.__TAURI__ ||
        window.__TAURI_INTERNALS__ ||
        (window.chrome && window.chrome.webview) ||
        window.__DESKTOP_APP__ ||
        window.location.protocol === 'tauri:' ||
        window.location.protocol === 'asset:' ||
        window.location.search.indexOf('app=standalone') !== -1 ||
        window.location.port === '38281' ||
        (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('app_mode') === 'standalone') ||
        (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
        (window.matchMedia && window.matchMedia('(display-mode: window-controls-overlay)').matches)
    );

    window.isDesktopApp = isDesktop;

    const DesktopAppManager = {
        isApp: isDesktop,

        toggleFullscreen: function () {
            if (typeof window.toggleFullscreen === 'function') {
                window.toggleFullscreen();
            } else if (!document.fullscreenElement) {
                const docEl = document.documentElement;
                const req = docEl.requestFullscreen || docEl.webkitRequestFullscreen || docEl.mozRequestFullScreen || docEl.msRequestFullscreen;
                if (req) req.call(docEl).catch(() => {});
            } else {
                const exit = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || document.msExitFullscreen;
                if (exit) exit.call(document).catch(() => {});
            }
        },

        exitApp: function () {
            if (window.__TAURI__ && window.__TAURI__.process && typeof window.__TAURI__.process.exit === 'function') {
                window.__TAURI__.process.exit(0);
            } else if (window.__TAURI__ && window.__TAURI__.window) {
                window.__TAURI__.window.getCurrentWindow().close();
            } else {
                window.close();
            }
        }
    };

    window.DesktopAppManager = DesktopAppManager;

    // 1. Chặn chuột phải mặc định của trình duyệt để không làm gián đoạn game
    // (Vẫn giữ nguyên menu chuột phải bài hát song-context-menu và các ô nhập văn bản input/textarea)
    document.addEventListener('contextmenu', function (e) {
        if (e.target.closest('#song-list-container') || e.target.closest('#song-context-menu') || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }
        e.preventDefault();
    }, { capture: true });

    // 2. Chặn các tổ hợp phím gây thoát hoặc reload ngoài ý muốn khi đang chơi game
    window.addEventListener('keydown', function (e) {
        // F11: Chuyển đổi toàn màn hình mượt mà trong chế độ app
        if (e.key === 'F11' || e.keyCode === 122) {
            e.preventDefault();
            DesktopAppManager.toggleFullscreen();
            return;
        }

        // Chặn phím Zoom: Ctrl + '+' / '-' / '=' / '0' hoặc Cmd + '+' / '-' / '=' / '0'
        // Zoom trình duyệt sẽ làm biến dạng tỉ lệ 3D viewport và độ nhạy chuột
        if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '-' || e.key === '=' || e.key === '0' || e.keyCode === 187 || e.keyCode === 189 || e.keyCode === 48)) {
            e.preventDefault();
            return;
        }

        // Chặn phím In: Ctrl+P
        if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P' || e.keyCode === 80)) {
            e.preventDefault();
            return;
        }

        // Chặn phím Lưu trang: Ctrl+S
        if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S' || e.keyCode === 83)) {
            e.preventDefault();
            return;
        }

        // Kiểm tra xem người chơi có đang trong ván game tích cực hay không
        const isActivePlay = (typeof window.isGamePlayActive === 'function')
            ? window.isGamePlayActive()
            : ((typeof isPlaying !== 'undefined' && isPlaying) || (typeof gameStarted !== 'undefined' && gameStarted));

        const isAltLeft = e.altKey && (e.key === 'ArrowLeft' || e.code === 'ArrowLeft' || e.keyCode === 37);
        const isBrowserBackKey = e.key === 'BrowserBack' || e.code === 'BrowserBack' || e.keyCode === 166;
        const isMacBackKey = (e.metaKey || e.ctrlKey) && (e.key === '[' || e.keyCode === 219);
        const isInputElement = e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable);
        const isBackspaceBack = (e.key === 'Backspace' || e.keyCode === 8) && !isInputElement;

        if (isActivePlay) {
            // A. Khi đang chơi ván đấu: Chặn hoàn toàn phím quay lại và bảo vệ ván đấu
            if (isAltLeft || isBrowserBackKey || isMacBackKey || isBackspaceBack) {
                e.preventDefault();
                e.stopPropagation();
                if (typeof window.handleBlockedBackNavigation === 'function') {
                    window.handleBlockedBackNavigation();
                }
                return;
            }

            // B. Chặn phím Reload (F5, Ctrl+R, Cmd+R) khi đang chơi để người chơi không bị mất điểm số / kỷ lục
            if (e.key === 'F5' || e.keyCode === 116 || ((e.ctrlKey || e.metaKey) && (e.key === 'r' || e.key === 'R' || e.keyCode === 82))) {
                e.preventDefault();
                e.stopPropagation();
                if (typeof window.showGameToast === 'function') {
                    const msg = (typeof t === 'function' ? t('msg_back_blocked') : null) || 'Đã chặn tải lại để bảo vệ ván đấu của bạn!';
                    window.showGameToast(msg, 3000, 'warning');
                }
                console.log("[DesktopApp] Đã bảo vệ tiến trình chơi: chặn reload ngoài ý muốn");
                return;
            }
        } else {
            // C. Khi KHÔNG ở trong ván đấu: Xử lý đóng modal hoặc nhấn 2 lần để thoát
            if (isAltLeft || isBrowserBackKey || isMacBackKey || isBackspaceBack) {
                e.preventDefault();
                e.stopPropagation();
                if (typeof window.handleMenuBackPress === 'function') {
                    window.handleMenuBackPress();
                }
                return;
            }
        }
    }, { capture: true });

    // 2.1. Chặn nút Back/Forward trên chuột gaming (Mouse Button 3 & 4)
    window.addEventListener('auxclick', function (e) {
        if (e.button === 3 || e.button === 4) {
            e.preventDefault();
            e.stopPropagation();
            const isActive = (typeof window.isGamePlayActive === 'function')
                ? window.isGamePlayActive()
                : (typeof isPlaying !== 'undefined' && isPlaying);
            if (isActive) {
                if (typeof window.handleBlockedBackNavigation === 'function') {
                    window.handleBlockedBackNavigation();
                }
            } else {
                if (typeof window.handleMenuBackPress === 'function') {
                    window.handleMenuBackPress();
                }
            }
        }
    }, { capture: true });

    window.addEventListener('mouseup', function (e) {
        if (e.button === 3 || e.button === 4) {
            const isActive = (typeof window.isGamePlayActive === 'function')
                ? window.isGamePlayActive()
                : (typeof isPlaying !== 'undefined' && isPlaying);
            if (isActive) {
                e.preventDefault();
                e.stopPropagation();
            }
        }
    }, { capture: true });

    // 3. Khóa Pinch-to-zoom và Ctrl+MouseWheel zoom trên màn hình/chuột máy tính
    window.addEventListener('wheel', function (e) {
        if (e.ctrlKey) {
            e.preventDefault();
        }
    }, { passive: false });

    // 4. Khởi tạo thuộc tính và meta hỗ trợ app khi DOM sẵn sàng
    function initAppMode() {
        if (window.isDesktopApp) {
            if (document.body) {
                document.body.classList.add('desktop-app-mode');
                document.body.classList.add('in-app-mode');
            }
            if (document.documentElement) {
                document.documentElement.classList.add('in-app-mode');
                document.documentElement.classList.add('desktop-app-mode');
            }
            const notice = document.getElementById('mobile-optimize-notice');
            if (notice) notice.style.setProperty('display', 'none', 'important');
            console.log("%c[DesktopApp] Chế độ Native Game App đã được kích hoạt (NO Electron - Native WebView2/Tauri)", "color: #00ffff; font-weight: bold;");
        }

        // Heartbeat giữ kết nối máy chủ cục bộ độc lập (CHỈ chạy khi khởi chạy từ CyberBeatHopper.exe standalone)
        const isStandaloneApp = (new URLSearchParams(window.location.search).get('app') === 'standalone') ||
                                (sessionStorage.getItem('app_mode') === 'standalone');

        if (isStandaloneApp) {
            sessionStorage.setItem('app_mode', 'standalone');
            let failedAttempts = 0;
            const heartbeatInterval = setInterval(function () {
                fetch('/heartbeat', { cache: 'no-store' })
                    .then(function (res) {
                        if (!res.ok) {
                            failedAttempts++;
                            if (failedAttempts >= 2) {
                                clearInterval(heartbeatInterval);
                            }
                        } else {
                            failedAttempts = 0;
                        }
                    })
                    .catch(function () {
                        failedAttempts++;
                        if (failedAttempts >= 3) {
                            clearInterval(heartbeatInterval);
                        }
                    });
            }, 2500);
        }
    }

    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', initAppMode);
    } else {
        initAppMode();
    }
})();

