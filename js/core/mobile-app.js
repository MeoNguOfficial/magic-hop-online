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
                // Nếu đang mở In-Game Page Viewer (license, terms) -> Bấm Back để đóng viewer ngay
                const pageViewer = document.getElementById('page-viewer-modal');
                if (pageViewer && pageViewer.style.display !== 'none' && !pageViewer.classList.contains('hidden')) {
                    if (typeof window.closeInGameViewer === 'function') {
                        window.closeInGameViewer();
                    } else {
                        pageViewer.classList.add('hidden');
                        pageViewer.style.display = 'none';
                    }
                    return;
                }

                // Nếu đang chơi ván game -> Bấm Back để tạm dừng (Pause)
                if (typeof isPlaying !== 'undefined' && isPlaying && typeof isFailTransition !== 'undefined' && !isFailTransition) {
                    if (typeof pauseGame === 'function') {
                        pauseGame();
                    }
                    return;
                }

                // Nếu đang mở bất kỳ popup/modal nào -> Bấm Back để đóng popup
                const openModals = document.querySelectorAll('#settings-modal:not(.hidden), #song-selector-modal:not(.hidden), #account-modal:not(.hidden), #tos-modal:not(.hidden)');
                if (openModals.length > 0) {
                    openModals.forEach(modal => {
                        modal.classList.add('hidden');
                        modal.style.display = 'none';
                    });
                    return;
                }

                // Nếu đang ở màn hình Game Over hoặc Pause Menu -> Trở về Menu chính
                const centerHud = document.getElementById('center-hud');
                if (centerHud && centerHud.style.display !== 'none') {
                    if (typeof returnToMenu === 'function') {
                        returnToMenu();
                        return;
                    }
                }

                // Nếu ở Menu chính -> Thoát app hoặc hỏi xác nhận
                if (canGoBack) {
                    window.history.back();
                } else {
                    window.Capacitor.Plugins.App.exitApp();
                }
            });
        }
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

