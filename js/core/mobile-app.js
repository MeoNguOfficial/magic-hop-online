// ============================================================
// mobile-app.js — Trình Quản Lý & Tối Ưu Hóa Game App Cho Mobile (Android & iOS)
// Tương thích với Capacitor, Tauri Mobile, PWA & Trình duyệt di động.
// Cung cấp: Haptic Feedback (rung khi nảy gạch), Screen WakeLock (chống tắt màn hình),
// Android Hardware Back Button, iOS Web Audio unlock & Quản lý App Lifecycle.
// ============================================================

(function () {
    const isMobileDevice = (typeof window.IS_MOBILE !== 'undefined')
        ? window.IS_MOBILE
        : /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    const isNativeMobileApp = !!(
        window.Capacitor ||
        (window.__TAURI__ && (navigator.userAgent.includes('Android') || /iPhone|iPad|iPod/i.test(navigator.userAgent))) ||
        window.matchMedia('(display-mode: standalone)').matches
    );

    window.isMobileDevice = isMobileDevice;
    window.isNativeMobileApp = isNativeMobileApp;

    // --- 1. HAPTIC FEEDBACK (RUNG XÚC GIÁC KHI NẢY GẠCH) ---
    // Cho cảm giác nảy gạch chân thực và đã tay trên cả Android và iOS
    let hapticEnabled = localStorage.getItem('hapticFeedbackEnabled') !== 'false';
    window.hapticFeedbackEnabled = hapticEnabled;

    function triggerMobileHaptic(type = 'light') {
        if (!hapticEnabled || !isMobileDevice) return;

        try {
            // A. Sử dụng Capacitor Haptics Plugin nếu đang chạy trong App Native
            if (window.Capacitor && window.Capacitor.isPluginAvailable && window.Capacitor.isPluginAvailable('Haptics')) {
                const Haptics = window.Capacitor.Plugins.Haptics;
                if (type === 'medium') {
                    Haptics.impact({ style: 'medium' });
                } else if (type === 'heavy') {
                    Haptics.impact({ style: 'heavy' });
                } else {
                    Haptics.impact({ style: 'light' });
                }
                return;
            }

            // B. Fallback qua HTML5 Vibration API (hỗ trợ tốt trên Android Chrome / WebView)
            if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
                if (type === 'medium') {
                    navigator.vibrate(22);
                } else if (type === 'heavy') {
                    navigator.vibrate([28, 20, 28]);
                } else {
                    navigator.vibrate(12);
                }
            }
        } catch (e) {}
    }
    window.triggerMobileHaptic = triggerMobileHaptic;

    // --- 2. SCREEN WAKE LOCK (GIỮ MÀN HÌNH LUÔN SÁNG TRONG LÚC CHƠI BÀI HÁT) ---
    let wakeLockSentinel = null;

    async function requestScreenWakeLock() {
        if (!isMobileDevice) return;
        try {
            if ('wakeLock' in navigator && !wakeLockSentinel) {
                wakeLockSentinel = await navigator.wakeLock.request('screen');
                wakeLockSentinel.addEventListener('release', () => {
                    wakeLockSentinel = null;
                });
            }
        } catch (e) {}
    }

    async function releaseScreenWakeLock() {
        try {
            if (wakeLockSentinel) {
                await wakeLockSentinel.release();
                wakeLockSentinel = null;
            }
        } catch (e) {}
    }

    window.requestScreenWakeLock = requestScreenWakeLock;
    window.releaseScreenWakeLock = releaseScreenWakeLock;

    // --- 3. XỬ LÝ NÚT BACK CỦA ANDROID (HARDWARE BACK BUTTON) ---
    function setupAndroidBackButton() {
        if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
            window.Capacitor.Plugins.App.addListener('backButton', ({ canGoBack }) => {
                // 1. Nếu đang chơi ván game -> Chặn thoát, tạm dừng game và thông báo bảo vệ
                const isActivePlay = (typeof window.isGamePlayActive === 'function')
                    ? window.isGamePlayActive()
                    : ((typeof isPlaying !== 'undefined' && isPlaying) || (typeof gameStarted !== 'undefined' && gameStarted));

                if (isActivePlay) {
                    if (typeof window.handleBlockedBackNavigation === 'function') {
                        window.handleBlockedBackNavigation();
                    } else if (typeof pauseGame === 'function') {
                        pauseGame();
                    }
                    return;
                }

                // 2. Khi KHÔNG ở trong trận đấu: Đóng popup hoặc yêu cầu nhấn 2 lần để thoát
                if (typeof window.handleMenuBackPress === 'function') {
                    window.handleMenuBackPress();
                }
            });
        }
    }

    // --- 3.1. TRÌNH BẢO VỆ ĐIỀU HƯỚNG TOÀN CẦU (SWIPE BACK GESTURE, BROWSER BACK & POPSTATE) ---
    function setupUniversalNavigationGuard() {
        // Đảm bảo có state trong history để bắt popstate ngay từ menu
        try {
            if (!window.history.state || !window.history.state.gameSessionInitialized) {
                window.history.replaceState({ gameSessionInitialized: true, root: true }, document.title, window.location.href);
                window.history.pushState({ gameSessionInitialized: true, inApp: true }, document.title, window.location.href);
            }
        } catch (e) {}

        // A. Bắt sự kiện popstate (khi vuốt cạnh màn hình trên iOS Safari/Android Chrome hoặc ấn nút Back trình duyệt)
        window.addEventListener('popstate', function (e) {
            const isActivePlay = (typeof window.isGamePlayActive === 'function')
                ? window.isGamePlayActive()
                : ((typeof isPlaying !== 'undefined' && isPlaying) || (typeof gameStarted !== 'undefined' && gameStarted));

            if (isActivePlay) {
                // Khôi phục lại state trong history ngay lập tức để không bị điều hướng ra khỏi game
                try {
                    window.history.pushState({ gameSessionInitialized: true, inGamePlaySession: true }, document.title, window.location.href);
                } catch (err) {}

                // Chặn, pause game và hiển thị Cyber Toast cảnh báo
                if (typeof window.handleBlockedBackNavigation === 'function') {
                    window.handleBlockedBackNavigation();
                }
                return;
            }

            // Khi KHÔNG ở trong trận đấu: Đóng modal hoặc yêu cầu nhấn 2 lần để thoát
            if (typeof window.handleMenuBackPress === 'function') {
                const exited = window.handleMenuBackPress();
                if (!exited) {
                    try {
                        window.history.pushState({ gameSessionInitialized: true, inApp: true }, document.title, window.location.href);
                    } catch (err) {}
                }
            }
        });

        // B. Cảnh báo trước khi đóng tab hoặc tải lại trang khi đang trong ván chơi
        window.addEventListener('beforeunload', function (e) {
            const isActivePlay = (typeof window.isGamePlayActive === 'function')
                ? window.isGamePlayActive()
                : ((typeof isPlaying !== 'undefined' && isPlaying) || (typeof gameStarted !== 'undefined' && gameStarted));

            if (isActivePlay) {
                e.preventDefault();
                e.returnValue = '';
                return '';
            }
        });
    }

    // --- 4. QUẢN LÝ VÒNG ĐỜI ỨNG DỤNG (APP LIFECYCLE) CHO MOBILE ---
    // Tự động tạm dừng game và âm thanh khi có cuộc gọi đến, chuyển ứng dụng hoặc tắt màn hình
    function setupMobileAppLifecycle() {
        if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
            window.Capacitor.Plugins.App.addListener('appStateChange', ({ isActive }) => {
                if (!isActive) {
                    // Ứng dụng rơi vào background
                    if (typeof pauseGame === 'function' && typeof isPlaying !== 'undefined' && isPlaying) {
                        pauseGame();
                    }
                    releaseScreenWakeLock();
                    if (typeof audioCtx !== 'undefined' && audioCtx && audioCtx.state === 'running') {
                        audioCtx.suspend().catch(() => {});
                    }
                } else {
                    // Ứng dụng quay lại foreground
                    if (typeof audioCtx !== 'undefined' && audioCtx && audioCtx.state === 'suspended') {
                        audioCtx.resume().catch(() => {});
                    }
                }
            });
        }

        // Tự động bật chế độ Immersive / ẩn Status Bar trên Android và iOS nếu chạy native
        if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.StatusBar) {
            window.Capacitor.Plugins.StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
            window.Capacitor.Plugins.StatusBar.hide().catch(() => {});
        }

        // Khóa hướng màn hình dọc (Portrait) cho game nảy gạch trên mobile
        if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.ScreenOrientation) {
            window.Capacitor.Plugins.ScreenOrientation.lock({ orientation: 'portrait' }).catch(() => {});
        }
    }

    // --- 5. TỰ ĐỘNG MỞ KHÓA WEB AUDIO CHO iOS (SAFARI & WKWEBVIEW) ---
    // Trên iOS, AudioContext bị chặn phát âm thanh cho đến khi người dùng chạm vào màn hình
    function unlockWebAudioForIOS() {
        const unlock = () => {
            if (typeof audioCtx !== 'undefined' && audioCtx && audioCtx.state === 'suspended') {
                audioCtx.resume().catch(() => {});
            }
            document.removeEventListener('touchstart', unlock, true);
            document.removeEventListener('touchend', unlock, true);
            document.removeEventListener('click', unlock, true);
        };
        document.addEventListener('touchstart', unlock, { capture: true, once: true });
        document.addEventListener('touchend', unlock, { capture: true, once: true });
        document.addEventListener('click', unlock, { capture: true, once: true });
    }

    // Khởi tạo các thành phần khi tải trang
    function initMobileApp() {
        // Kích hoạt bộ bảo vệ điều hướng toàn cầu cho cả Mobile và Desktop Web
        setupUniversalNavigationGuard();

        if (isMobileDevice) {
            document.body.classList.add('mobile-device-mode');
            unlockWebAudioForIOS();
            setupAndroidBackButton();
            setupMobileAppLifecycle();
            console.log("%c[MobileApp] Trình hỗ trợ di động đã kích hoạt (Haptics, Safe-Area & WakeLock sẵn sàng)", "color: #10b981; font-weight: bold;");
        }
    }

    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', initMobileApp);
    } else {
        initMobileApp();
    }
})();

