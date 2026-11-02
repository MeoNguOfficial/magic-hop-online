// ============================================================
//  pwa-installer.js — Quản lý Cài đặt Ứng dụng & Kiểm tra Cập nhật (PWA / PC / APK)
// ============================================================

window.APP_VERSION = '1.0.7';

let swRegistration = null;
let isManualUpdateCheck = false;

/**
 * Phát hiện xem ứng dụng có đang chạy dưới dạng App đóng gói (PC Standalone hoặc Android Native APK) hay không.
 */
function isPackagedNativeApp() {
    const isPC = !!(
        (typeof window.isDesktopApp !== 'undefined' && window.isDesktopApp) ||
        window.location.search.includes('app=standalone') ||
        (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('app_mode') === 'standalone') ||
        window.location.port === '38281' ||
        window.location.port === '9091' ||
        window.__TAURI__ ||
        (window.chrome && window.chrome.webview) ||
        window.__DESKTOP_APP__
    );

    const isAndroid = !!(
        (window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform()) ||
        (window.Capacitor && window.Capacitor.getPlatform && window.Capacitor.getPlatform() === 'android') ||
        window.location.origin === 'https://localhost' ||
        window.location.protocol === 'capacitor:'
    );

    return isPC || isAndroid;
}

window.isPackagedNativeApp = isPackagedNativeApp;

/**
 * Tự động điều chỉnh giao diện Cài đặt dựa trên nền tảng:
 * - Nếu là App đóng gói (PC / APK): Ẩn hoàn toàn nút "Tải App" (PWA), mở rộng nút "Kiểm tra cập nhật".
 * - Nếu là Web thông thường: Hiện cả 2 nút "Kiểm tra cập nhật" và "Tải App".
 */
function applyPlatformUIAdjustments() {
    const isPackaged = isPackagedNativeApp();
    const installAppBtn = document.getElementById('install-app-btn');
    const updateContainer = document.getElementById('app-update-actions-container');
    const checkAppUpdateBtn = document.getElementById('check-app-update-btn');

    if (isPackaged) {
        if (installAppBtn) {
            installAppBtn.style.display = 'none';
        }
        if (updateContainer) {
            updateContainer.classList.remove('grid-cols-2');
            updateContainer.classList.add('grid-cols-1');
        }
    } else {
        if (installAppBtn) {
            installAppBtn.style.display = '';
        }
        if (updateContainer) {
            updateContainer.classList.remove('grid-cols-1');
            updateContainer.classList.add('grid-cols-2');
        }
    }
}
window.applyPlatformUIAdjustments = applyPlatformUIAdjustments;

/**
 * Kiểm tra xem PWA đã được cài đặt trên thiết bị hay chưa.
 */
function isPWAInstalled() {
    return !!(
        (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
        window.navigator.standalone === true ||
        (document.referrer && document.referrer.includes('android-app://')) ||
        (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('pwa_installed') === 'true') ||
        (typeof localStorage !== 'undefined' && localStorage.getItem('pwa_installed') === 'true') ||
        (typeof window !== 'undefined' && window._isPWAInstalledNative)
    );
}

// Tự động kiểm tra PWA đã cài đặt qua API trình duyệt
if (typeof navigator !== 'undefined' && 'getInstalledRelatedApps' in navigator) {
    navigator.getInstalledRelatedApps().then(apps => {
        if (apps && apps.length > 0) {
            window._isPWAInstalledNative = true;
            try { localStorage.setItem('pwa_installed', 'true'); } catch(e){}
            if (typeof checkPWAInstallationStatus === 'function') checkPWAInstallationStatus();
        }
    }).catch(() => {});
}
window.isPWAInstalled = isPWAInstalled;

/**
 * Nhận diện hệ điều hành / thiết bị của người dùng để ưu tiên bản tải (Featured Hero Card)
 */
function detectUserDevicePlatform() {
    const ua = (navigator.userAgent || '').toLowerCase();
    const platform = (navigator.platform || '').toLowerCase();
    if (/android/i.test(ua)) return 'android';
    if (/iphone|ipad|ipod/i.test(ua) || (platform.includes('mac') && navigator.maxTouchPoints > 1)) return 'ios';
    if (/mac/i.test(platform) || /macintosh/i.test(ua)) return 'macos';
    return 'windows';
}

/**
 * Tự động đồng bộ Featured Hero Card và danh sách nền tảng khác theo thiết bị
 */
function updateHeroPlatformCard() {
    const dev = detectUserDevicePlatform();
    const heroTitle = document.getElementById('hero-platform-title');
    const heroDesc = document.getElementById('hero-platform-desc');
    const heroBtn = document.getElementById('hero-action-btn');
    const rowPC = document.getElementById('row-opt-pc');
    const rowAPK = document.getElementById('row-opt-apk');

    const downloadText = (typeof t === 'function' ? t('download_btn_download') : null) || 'TẢI VỀ';
    const pcTitle = (typeof t === 'function' ? t('download_opt_pc_title') : null) || 'PC Windows (.exe)';
    const pcDesc = (typeof t === 'function' ? t('download_opt_pc_desc') : null) || 'Bản độc lập, tối ưu đồ họa, hỗ trợ 144Hz+. · v1.0.7 · 48 MB';
    const apkTitle = (typeof t === 'function' ? t('download_opt_apk_title') : null) || 'Android (APK)';
    const apkDesc = (typeof t === 'function' ? t('download_opt_apk_desc') : null) || 'Bản độc lập, cảm ứng siêu nhạy. · v1.0.7 · 32 MB';

    if (dev === 'android') {
        if (heroTitle) {
            heroTitle.textContent = apkTitle;
            heroTitle.setAttribute('data-i18n', 'download_opt_apk_title');
        }
        if (heroDesc) {
            heroDesc.textContent = apkDesc;
            heroDesc.setAttribute('data-i18n', 'download_opt_apk_desc');
        }
        if (heroBtn) {
            heroBtn.textContent = downloadText;
            heroBtn.setAttribute('data-i18n', 'download_btn_download');
            heroBtn.href = window._cachedApkDownloadUrl || 'https://github.com/MeoNguOfficial/magic-hop-online/releases/latest';
        }
        if (rowAPK) rowAPK.classList.add('hidden');
        if (rowPC) rowPC.classList.remove('hidden');
    } else {
        if (heroTitle) {
            heroTitle.textContent = pcTitle;
            heroTitle.setAttribute('data-i18n', 'download_opt_pc_title');
        }
        if (heroDesc) {
            heroDesc.textContent = pcDesc;
            heroDesc.setAttribute('data-i18n', 'download_opt_pc_desc');
        }
        if (heroBtn) {
            heroBtn.textContent = downloadText;
            heroBtn.setAttribute('data-i18n', 'download_btn_download');
            heroBtn.href = window._cachedPcDownloadUrl || 'https://github.com/MeoNguOfficial/magic-hop-online/releases/latest';
        }
        if (rowPC) rowPC.classList.add('hidden');
        if (rowAPK) rowAPK.classList.remove('hidden');
    }
}
window.updateHeroPlatformCard = updateHeroPlatformCard;

/**
 * Cập nhật trạng thái hiển thị của tùy chọn PWA trong modal tải ứng dụng
 */
function checkPWAInstallationStatus() {
    const pwaBtn = document.getElementById('download-opt-pwa');
    const desc = document.getElementById('pwa-desc-text');
    if (!pwaBtn) return;

    const isInstalled = isPWAInstalled();
    const isStandalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;

    const runningText = (typeof t === 'function' ? t('download_btn_running') : null) || 'ĐANG CHẠY';
    const openText = (typeof t === 'function' ? t('download_btn_open') : null) || 'MỞ APP';
    const installText = (typeof t === 'function' ? t('download_btn_install') : null) || 'CÀI ĐẶT';

    if (isStandalone) {
        if (desc) desc.textContent = (typeof t === 'function' ? t('download_opt_pwa_desc') : 'Cài trực tiếp, mở tức thì, chơi được khi offline.');
        pwaBtn.textContent = runningText;
        pwaBtn.setAttribute('data-i18n', 'download_btn_running');
        pwaBtn.className = 'shrink-0 px-4 py-2 border border-emerald-500/50 bg-emerald-950/40 text-emerald-400 font-orbitron font-bold text-xs uppercase rounded-lg cursor-default whitespace-nowrap';
    } else if (isInstalled) {
        pwaBtn.textContent = openText;
        pwaBtn.setAttribute('data-i18n', 'download_btn_open');
        pwaBtn.className = 'shrink-0 px-4 py-2 border border-cyan-400/80 bg-cyan-500/20 text-cyan-300 font-orbitron font-bold text-xs uppercase rounded-lg transition-all active:scale-95 cursor-pointer whitespace-nowrap shadow-[0_0_10px_rgba(6,182,212,0.25)]';
    } else {
        pwaBtn.textContent = installText;
        pwaBtn.setAttribute('data-i18n', 'download_btn_install');
        pwaBtn.className = 'shrink-0 px-4 py-2 border border-cyan-500/60 hover:bg-cyan-500/15 text-cyan-400 font-orbitron font-bold text-xs uppercase rounded-lg transition-all active:scale-95 cursor-pointer whitespace-nowrap';
    }
}
window.checkPWAInstallationStatus = checkPWAInstallationStatus;

/**
 * Hiển thị thông báo hướng dẫn khi người dùng mở PWA đã cài đặt
 */
function showPWAInstalledPromptGuide() {
    const lang = typeof activeLang !== 'undefined' ? activeLang : 'vi';
    const title = typeof t === 'function' ? t('install_app_title') : 'TẢI APP';
    const msg = lang === 'vi'
        ? "Ứng dụng Cyber Beat Hopper đã được cài đặt trên máy của bạn!\n\n💡 Cách mở ứng dụng:\n1. Bấm vào biểu tượng [⊞↗] trên góc phải thanh địa chỉ (URL) Chrome để chọn 'Mở ứng dụng'.\n2. Hoặc tìm mở trực tiếp từ màn hình chính (Desktop) / Start Menu."
        : "Cyber Beat Hopper is already installed on your device!\n\n💡 How to open:\n1. Click the [⊞↗] icon on the right side of the Chrome address bar to select 'Open app'.\n2. Or open directly from your Desktop / Start Menu.";

    if (typeof showCyberModal === 'function') {
        showCyberModal({
            title: title,
            message: msg,
            type: 'alert'
        });
    } else if (typeof showCustomNotification === 'function') {
        showCustomNotification(msg, 'info');
    } else {
        alert(msg);
    }
}
window.showPWAInstalledPromptGuide = showPWAInstalledPromptGuide;

/**
 * So sánh 2 chuỗi phiên bản Semantic Versioning (vd: "1.0.7" vs "1.0.6")
 * @returns {number} 1 nếu v1 > v2, -1 nếu v1 < v2, 0 nếu bằng nhau
 */
function compareSemVer(v1, v2) {
    const p1 = (v1 || '').replace(/[^0-9.]/g, '').split('.').map(n => parseInt(n, 10) || 0);
    const p2 = (v2 || '').replace(/[^0-9.]/g, '').split('.').map(n => parseInt(n, 10) || 0);
    const len = Math.max(p1.length, p2.length);
    for (let i = 0; i < len; i++) {
        const num1 = p1[i] || 0;
        const num2 = p2[i] || 0;
        if (num1 > num2) return 1;
        if (num1 < num2) return -1;
    }
    return 0;
}

/**
 * Mở Modal Tải Ứng Dụng Đa Nền Tảng (Thiết kế Cyberpunk hiện đại, Featured Platform & Nền tảng khác)
 */
function showDownloadAppModal() {
    const modal = document.getElementById('download-app-modal');
    if (!modal) {
        if (typeof showPWAInstallGuide === 'function') showPWAInstallGuide();
        return;
    }

    if (typeof updateHeroPlatformCard === 'function') updateHeroPlatformCard();
    if (typeof fetchLatestDownloadLinks === 'function') fetchLatestDownloadLinks();
    if (typeof checkPWAInstallationStatus === 'function') checkPWAInstallationStatus();
    if (typeof applyTranslations === 'function') applyTranslations();

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    modal.style.display = 'flex';
}
window.showDownloadAppModal = showDownloadAppModal;

function closeDownloadAppModal() {
    const modal = document.getElementById('download-app-modal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    modal.style.display = 'none';
}
window.closeDownloadAppModal = closeDownloadAppModal;

/**
 * Nạp dữ liệu phiên bản từ máy chủ từ xa với cơ chế dự phòng đa tầng (Multi-tier Fallback):
 * 1. GitHub Raw (CORS luôn bật, không bị lỗi 503 serverless)
 * 2. Vercel Web App chính thức
 * 3. File local ./version.json (khi test trên localhost/127.0.0.1)
 */
async function fetchRemoteVersionData() {
    const isLocalOrigin = typeof window !== 'undefined' && window.location && (window.location.origin.includes('127.0.0.1') || window.location.origin.includes('localhost'));
    const candidateUrls = [
        // Ưu tiên nạp từ local nếu đang dev/test cục bộ để không gặp lỗi CORS hay 503 từ server ngoài
        isLocalOrigin ? './version.json?t=' + Date.now() : null,
        'https://raw.githubusercontent.com/MeoNguOfficial/magic-hop-online/main/version.json?t=' + Date.now(),
        ((typeof WEB_APP_URL !== 'undefined' && WEB_APP_URL) ? WEB_APP_URL : 'https://magic-hop.vercel.app').replace(/\/+$/, '') + '/version.json?t=' + Date.now()
    ].filter(Boolean);

    for (const url of candidateUrls) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 4000);
            const res = await fetch(url, {
                cache: 'no-store',
                mode: 'cors',
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (res.ok) {
                const data = await res.json();
                if (data && data.version) {
                    return data;
                }
            }
        } catch {
            // Thử nguồn kế tiếp
        }
    }
    throw new Error('Không thể nạp thông tin phiên bản từ máy chủ.');
}

/**
 * Nạp link tải mới nhất từ version.json
 */
async function fetchLatestDownloadLinks() {
    try {
        const data = await fetchRemoteVersionData();
        if (data && data.downloads) {
            const pcBtn = document.getElementById('download-opt-pc');
            const apkBtn = document.getElementById('download-opt-apk');
            if (pcBtn && data.downloads.pc) pcBtn.href = data.downloads.pc;
            if (apkBtn && data.downloads.apk) apkBtn.href = data.downloads.apk;
        }
    } catch { }
}

/**
 * Hiển thị hướng dẫn hoặc kích hoạt Prompt cài đặt PWA
 */
function showPWAInstallGuide() {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

    if (isStandalone) {
        if (typeof showCyberModal === 'function') {
            showCyberModal({
                title: typeof t === 'function' ? t('install_app_title') : 'TẢI APP',
                message: typeof activeLang !== 'undefined' && activeLang === 'vi' ? "Bạn đã cài đặt và đang sử dụng phiên bản App!" : "You are already using the App version!",
                type: 'alert'
            });
        }
        return;
    }

    if (isIOS) {
        showCyberModal({
            title: typeof t === 'function' ? t('install_app_title') : 'TẢI APP',
            message: typeof t === 'function' ? t('install_ios_guide') : 'Để cài đặt trên iOS: Nhấn biểu tượng Chia sẻ (Share) trên Safari và chọn "Thêm vào Màn hình chính" (Add to Home Screen).',
            type: 'alert'
        });
    } else if (window.globalDeferredPrompt) {
        window.globalDeferredPrompt.prompt();
        window.globalDeferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('[PWA] User accepted install');
            }
            window.globalDeferredPrompt = null;
        });
    } else {
        showCyberModal({
            title: typeof t === 'function' ? t('install_app_title') : 'TẢI APP',
            message: typeof activeLang !== 'undefined' && activeLang === 'vi'
                ? "Để tải App: Nhấn vào biểu tượng Menu (3 chấm) trên trình duyệt và chọn 'Cài đặt ứng dụng' (Install App) hoặc 'Thêm vào màn hình chính'."
                : "To download App: Open browser menu and select 'Install App' or 'Add to Home Screen'.",
            type: 'alert'
        });
    }
}
window.showPWAInstallGuide = showPWAInstallGuide;

/**
 * Đăng ký Service Worker và kiểm tra cập nhật (DÀNH CHO WEB / PWA)
 */
function initPWAUpdateDetection() {
    applyPlatformUIAdjustments();

    // Nếu là App đóng gói (PC Standalone hoặc Android APK), bỏ qua đăng ký Service Worker
    if (isPackagedNativeApp()) {
        console.log('[App] PWA Service Worker skipped for packaged app. Using native update checker.');
        initNativeAppAutoUpdate();
        return;
    }

    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.register('./sw.js').then(reg => {
        swRegistration = reg;
        if (reg.waiting) {
            promptUserToUpdate(reg.waiting);
        }

        reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    promptUserToUpdate(newWorker, isManualUpdateCheck);
                }
            });
        });
    }).catch(err => {
        console.warn('[PWA] Service Worker registration failed:', err);
    });

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
    });
}

/**
 * Tự động kiểm tra bản cập nhật mới trong nền khi khởi động app (dành cho PC / APK)
 */
function initNativeAppAutoUpdate() {
    const autoUpdate = JSON.parse(localStorage.getItem('swAutoUpdateEnabled')) !== false;
    if (!autoUpdate) return;

    // Chờ 3.5 giây sau khi game đã khởi động để không ảnh hưởng đến FPS lúc tải
    setTimeout(() => {
        checkNativeAppUpdate(false);
    }, 3500);
}

/**
 * Kiểm tra cập nhật App cho Bản Đóng Gói (PC Standalone & Android APK)
 */
async function checkNativeAppUpdate(isManual = true) {
    const isPC = !!(
        (typeof window.isDesktopApp !== 'undefined' && window.isDesktopApp) ||
        window.location.search.includes('app=standalone') ||
        window.location.port === '38281'
    );
    const platformName = isPC ? 'PC Windows' : 'Android APK';
    const currentVersion = window.APP_VERSION || '1.0.7';
    const lang = typeof activeLang !== 'undefined' ? activeLang : 'vi';

    if (isManual) {
        if (typeof showCyberModal === 'function') {
            showCyberModal({
                title: typeof t === 'function' ? t('install_app_title') : 'CẬP NHẬT ỨNG DỤNG',
                message: lang === 'vi' ? 'Đang kết nối máy chủ kiểm tra bản cập nhật...' : 'Connecting to server to check for updates...',
                type: 'alert'
            });
        }
    }

    try {
        const data = await fetchRemoteVersionData();

        const remoteVersion = data.version || '1.0.7';
        const isNewer = compareSemVer(remoteVersion, currentVersion) > 0;

        if (isNewer) {
            const changelogText = (data.changelog && (data.changelog[lang] || data.changelog.vi || data.changelog.en)) || 'Tối ưu hóa hiệu năng, cải tiến giao diện và sửa lỗi.';
            const downloadUrl = isPC 
                ? (data.downloads?.pc || 'https://github.com/MeoNguOfficial/magic-hop-online/releases/latest')
                : (data.downloads?.apk || 'https://github.com/MeoNguOfficial/magic-hop-online/releases/latest');

            showCyberModal({
                title: lang === 'vi' ? '🎉 CÓ BẢN CẬP NHẬT MỚI!' : '🎉 NEW UPDATE AVAILABLE!',
                message: lang === 'vi'
                    ? `Đã có phiên bản ${remoteVersion} dành cho ${platformName} (Bản hiện tại: ${currentVersion}).\n\nNội dung mới:\n• ${changelogText}\n\nBạn có muốn tải bản cập nhật ngay bây giờ?`
                    : `Version ${remoteVersion} is available for ${platformName} (Current: ${currentVersion}).\n\nWhat's new:\n• ${changelogText}\n\nWould you like to download the update now?`,
                type: 'confirm',
                confirmText: lang === 'vi' ? 'TẢI CẬP NHẬT' : 'DOWNLOAD UPDATE',
                cancelText: lang === 'vi' ? 'ĐỂ SAU' : 'LATER',
                onConfirm: () => {
                    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Browser) {
                        window.Capacitor.Plugins.Browser.open({ url: downloadUrl });
                    } else {
                        window.open(downloadUrl, '_blank');
                    }
                }
            });
        } else {
            if (isManual) {
                showCyberModal({
                    title: typeof t === 'function' ? t('install_app_title') : 'CẬP NHẬT ỨNG DỤNG',
                    message: lang === 'vi'
                        ? `Ứng dụng ${platformName} của bạn đang ở phiên bản mới nhất (v${currentVersion}).`
                        : `Your ${platformName} app is already up to date (v${currentVersion}).`,
                    type: 'alert'
                });
            }
        }
    } catch (err) {
        if (isManual) {
            showCyberModal({
                title: typeof t === 'function' ? t('install_app_title') : 'CẬP NHẬT ỨNG DỤNG',
                message: lang === 'vi'
                    ? 'Không thể kết nối máy chủ cập nhật. Vui lòng kiểm tra lại kết nối mạng.'
                    : 'Failed to connect to update server. Please check your internet connection.',
                type: 'alert'
            });
        }
    }
}
window.checkNativeAppUpdate = checkNativeAppUpdate;

/**
 * Kiểm tra cập nhật App thủ công (Phân luồng thông minh giữa Native App và Web/PWA)
 */
async function manualCheckForUpdate() {
    // 1. Nếu là App đóng gói (PC / APK): Chạy trình kiểm tra bản cập nhật Native
    if (isPackagedNativeApp()) {
        checkNativeAppUpdate(true);
        return;
    }

    // 2. Nếu là Web / PWA: Kiểm tra qua Service Worker
    const lang = typeof activeLang !== 'undefined' ? activeLang : 'vi';

    if (!('serviceWorker' in navigator)) {
        checkNativeAppUpdate(true);
        return;
    }

    const currentReg = await navigator.serviceWorker.getRegistration().catch(() => null);

    if (!currentReg) {
        checkNativeAppUpdate(true);
        return;
    }

    isManualUpdateCheck = true;

    if (currentReg.waiting) {
        promptUserToUpdate(currentReg.waiting, true);
        return;
    }

    if (typeof showCyberModal === 'function') {
        showCyberModal({
            title: typeof t === 'function' ? t('install_app_title') : 'CẬP NHẬT ỨNG DỤNG',
            message: lang === 'vi' ? "Đang kiểm tra cập nhật..." : "Checking for updates...",
            type: 'alert'
        });
    }

    currentReg.update().then(updatedReg => {
        if (!updatedReg.waiting && !updatedReg.installing) {
            showCyberModal({
                title: typeof t === 'function' ? t('install_app_title') : 'CẬP NHẬT ỨNG DỤNG',
                message: lang === 'vi' ? `Ứng dụng của bạn đã ở phiên bản mới nhất (v${window.APP_VERSION}).` : `Your app is already up to date (v${window.APP_VERSION}).`,
                type: 'alert'
            });
        }
    }).catch(() => {
        checkNativeAppUpdate(true);
    });
}
window.manualCheckForUpdate = manualCheckForUpdate;

function promptUserToUpdate(worker, isManual = false) {
    const autoUpdate = JSON.parse(localStorage.getItem('swAutoUpdateEnabled')) !== false;
    if (!isManual && !autoUpdate) return;

    if (typeof showCyberModal === 'function') {
        showCyberModal({
            title: typeof t === 'function' ? t('install_app_title') : 'CẬP NHẬT ỨNG DỤNG',
            message: typeof t === 'function' ? t('msg_new_update') : 'Đã có bản cập nhật mới! Bạn có muốn cập nhật ngay bây giờ?',
            type: 'confirm',
            confirmText: typeof t === 'function' ? t('btn_update_now') : 'CẬP NHẬT NGAY',
            onConfirm: () => {
                if (typeof playEndSceneAndReload === 'function') {
                    playEndSceneAndReload(() => {
                        worker.postMessage('skipWaiting');
                    });
                } else {
                    worker.postMessage('skipWaiting');
                }
            }
        });
    }
}

// Khởi tạo các sự kiện modal tải ứng dụng
document.addEventListener('DOMContentLoaded', () => {
    applyPlatformUIAdjustments();

    const closeBtn = document.getElementById('close-download-app-modal');
    if (closeBtn) {
        closeBtn.onclick = closeDownloadAppModal;
    }

    const pwaBtn = document.getElementById('download-opt-pwa');
    if (pwaBtn) {
        pwaBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeDownloadAppModal();
            if (isPWAInstalled()) {
                try {
                    window.open(window.location.origin + window.location.pathname, '_blank');
                } catch (err) {}
                showPWAInstalledPromptGuide();
            } else if (window.globalDeferredPrompt) {
                showPWAInstallGuide();
            } else {
                showPWAInstallGuide();
            }
        };
    }

    const modal = document.getElementById('download-app-modal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeDownloadAppModal();
            }
        });
    }
});

window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const modal = document.getElementById('download-app-modal');
        if (modal && modal.style.display !== 'none' && !modal.classList.contains('hidden')) {
            closeDownloadAppModal();
        }
    }
});

// Lắng nghe sự kiện cài đặt PWA thành công từ trình duyệt
window.addEventListener('appinstalled', () => {
    try {
        localStorage.setItem('pwa_installed', 'true');
    } catch (e) {}
    if (typeof checkPWAInstallationStatus === 'function') {
        checkPWAInstallationStatus();
    }
});

// Khởi chạy khi tải trang
window.addEventListener('load', initPWAUpdateDetection);

// Lắng nghe sự kiện click nút Tải App trên toàn hệ thống
document.addEventListener('click', (e) => {
    const btn = e.target && e.target.closest && e.target.closest('#install-app-btn');
    if (btn) {
        e.preventDefault();
        e.stopPropagation();
        if (typeof showDownloadAppModal === 'function') {
            showDownloadAppModal();
        } else if (typeof showPWAInstallGuide === 'function') {
            showPWAInstallGuide();
        }
    }
}, true);
