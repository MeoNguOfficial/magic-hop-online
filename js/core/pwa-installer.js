// ============================================================
//  pwa-installer.js — Quản lý Cài đặt Ứng dụng & Kiểm tra Cập nhật (PWA / PC / APK)
// ============================================================

window.APP_VERSION = (typeof window !== 'undefined' && window.SCRIPT_BUILD_VERSION) ? window.SCRIPT_BUILD_VERSION : '1.0.10';

function getCurrentAppVersion() {
    return (typeof window !== 'undefined' && (window.SCRIPT_BUILD_VERSION || window.APP_VERSION)) || '1.0.10';
}
window.getCurrentAppVersion = getCurrentAppVersion;

let swRegistration = null;
let isManualUpdateCheck = false;
let _allowSwReload = false;
let _hasPromptedUpdateThisLoad = false;

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
    const isPWA = isPWAInstalled();
    const isInApp = isPackaged || isPWA || (typeof window.isDesktopApp !== 'undefined' && window.isDesktopApp) || (typeof window.isNativeMobileApp !== 'undefined' && window.isNativeMobileApp);

    const installAppBtn = document.getElementById('install-app-btn');
    const updateContainer = document.getElementById('app-update-actions-container');
    const checkAppUpdateBtn = document.getElementById('check-app-update-btn');
    const notice = document.getElementById('mobile-optimize-notice');

    // Ẩn hoàn toàn thông báo "Tải app ngay để đạt hiệu suất tốt nhất" khi đang ở trong App
    if (notice) {
        if (isInApp) {
            notice.style.setProperty('display', 'none', 'important');
        } else {
            notice.style.display = '';
        }
    }
    if (isInApp) {
        document.documentElement.classList.add('in-app-mode');
        document.body.classList.add('in-app-mode');
    }

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
 * Kiểm tra xem ứng dụng có đang thực sự chạy trong cửa sổ PWA độc lập (standalone) hay không.
 * (Khác với isPWAInstalled — dùng để phân biệt tab trình duyệt thường với app PWA).
 */
function isPWAStandalone() {
    return !!(
        (window.matchMedia && (
            window.matchMedia('(display-mode: standalone)').matches ||
            window.matchMedia('(display-mode: window-controls-overlay)').matches
        )) ||
        window.navigator.standalone === true ||
        (document.referrer && document.referrer.includes('android-app://')) ||
        (typeof window !== 'undefined' && window._isPWAInstalledNative)
    );
}
window.isPWAStandalone = isPWAStandalone;

/**
 * Kiểm tra xem PWA đã được cài đặt trên thiết bị hay chưa.
 */
function isPWAInstalled() {
    return !!(
        isPWAStandalone() ||
        (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('pwa_installed') === 'true') ||
        (typeof localStorage !== 'undefined' && localStorage.getItem('pwa_installed') === 'true')
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
    const pcDesc = (typeof t === 'function' ? t('download_opt_pc_desc') : null) || 'Bản độc lập, tối ưu đồ họa, hỗ trợ 144Hz+. · v1.0.10 · 48 MB';
    const apkTitle = (typeof t === 'function' ? t('download_opt_apk_title') : null) || 'Android (APK)';
    const apkDesc = (typeof t === 'function' ? t('download_opt_apk_desc') : null) || 'Bản độc lập, cảm ứng siêu nhạy. · v1.0.10 · 32 MB';

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
    const isPackaged = isPackagedNativeApp();
    const isLocalOrigin = typeof window !== 'undefined' && window.location && (window.location.origin.includes('127.0.0.1') || window.location.origin.includes('localhost'));
    const candidateUrls = [
        // Chỉ đọc ./version.json cục bộ khi đang chạy web/dev server (không dùng cho App đóng gói PC/APK vì sẽ đọc nhầm bản đóng gói bên trong)
        (!isPackaged && isLocalOrigin) ? './version.json?t=' + Date.now() : null,
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
/**
 * Trả về thông tin nền tảng hiện tại: pc | apk | pwa | web
 */
function getRuntimePlatformInfo() {
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

    if (isPC) {
        return { key: 'pc', name: 'PC Windows', isPC: true, isAndroid: false, isPackaged: true, isPWA: false, isWeb: false };
    }
    if (isAndroid) {
        return { key: 'apk', name: 'Android APK', isPC: false, isAndroid: true, isPackaged: true, isPWA: false, isWeb: false };
    }
    if (isPWAStandalone()) {
        return { key: 'pwa', name: 'PWA', isPC: false, isAndroid: false, isPackaged: false, isPWA: true, isWeb: false };
    }
    return { key: 'web', name: 'Web', isPC: false, isAndroid: false, isPackaged: false, isPWA: false, isWeb: true };
}

function trPwa(key, fallback) {
    if (typeof t === 'function') {
        const val = t(key);
        if (val && val !== key) return val;
    }
    return fallback;
}

/**
 * Thực thi cập nhật trực tiếp trên Web / PWA:
 * Xóa cache tĩnh & động (giữ lại cache âm thanh), kích hoạt Service Worker chờ (nếu có) và tải lại trang.
 */
async function performWebUpdate(worker = null) {
    if (isPackagedNativeApp()) return;
    _allowSwReload = true;

    try {
        if ('caches' in window) {
            const keys = await caches.keys();
            await Promise.all(
                keys
                    .filter(k => !k.startsWith('magic-hop-audio'))
                    .map(k => caches.delete(k))
            );
        }

        let targetWorker = worker || (swRegistration && swRegistration.waiting);
        if (!targetWorker && 'serviceWorker' in navigator) {
            const reg = swRegistration || await navigator.serviceWorker.getRegistration().catch(() => null);
            if (reg) {
                await reg.update().catch(() => {});
                targetWorker = reg.waiting;
                if (!targetWorker && reg.installing) {
                    await new Promise(resolve => {
                        const inst = reg.installing;
                        const timer = setTimeout(resolve, 2500);
                        inst.addEventListener('statechange', () => {
                            if (inst.state === 'installed' || inst.state === 'redundant') {
                                clearTimeout(timer);
                                resolve();
                            }
                        });
                    });
                    targetWorker = reg.waiting;
                }
                if (!targetWorker) {
                    await reg.unregister().catch(() => {});
                }
            }
        }

        if (targetWorker) {
            const reloadFallback = setTimeout(() => {
                window.location.reload();
            }, 1500);
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.addEventListener('controllerchange', () => {
                    clearTimeout(reloadFallback);
                }, { once: true });
            }
            targetWorker.postMessage('skipWaiting');
            return;
        }
    } catch (err) {
        console.warn('[WebUpdate] Lỗi dọn cache khi cập nhật Web:', err);
    }

    window.location.reload();
}
window.performWebUpdate = performWebUpdate;

function runWebUpdateWithScene(worker = null) {
    if (typeof playEndSceneAndReload === 'function') {
        playEndSceneAndReload(() => {
            performWebUpdate(worker);
        });
    } else {
        performWebUpdate(worker);
    }
}

/**
 * Hiển thị hộp thoại thông báo có bản cập nhật mới.
 * - PC / APK (Packaged): chỉ hiện LATER + DOWNLOAD UPDATE
 * - Web / PWA: hiện LATER + WEB UPDATE + DOWNLOAD UPDATE
 */
function showAppUpdateModal({ remoteVersion = '', changelogText = '', downloadUrl = '', worker = null, isManual = false }) {
    if (!isManual && _hasPromptedUpdateThisLoad) return;
    _hasPromptedUpdateThisLoad = true;

    const platform = getRuntimePlatformInfo();
    const currentVersion = getCurrentAppVersion();
    const lang = typeof activeLang !== 'undefined' ? activeLang : 'vi';

    const title = trPwa(
        'title_new_update',
        lang === 'vi' ? '🎉 CÓ BẢN CẬP NHẬT MỚI!' : '🎉 NEW UPDATE AVAILABLE!'
    );

    let message;
    if (remoteVersion) {
        const defaultChangelog = lang === 'vi'
            ? 'Tối ưu hóa hiệu năng, cải tiến giao diện và sửa lỗi.'
            : 'Performance optimizations, UI improvements, and bug fixes.';
        const notes = changelogText || defaultChangelog;
        message = lang === 'vi'
            ? `Đã có phiên bản ${remoteVersion} dành cho ${platform.name} (Bản hiện tại: ${currentVersion}).\n\nNội dung mới:\n• ${notes}\n\nBạn có muốn tải bản cập nhật ngay bây giờ?`
            : `Version ${remoteVersion} is available for ${platform.name} (Current: ${currentVersion}).\n\nWhat's new:\n• ${notes}\n\nWould you like to download the update now?`;
    } else {
        message = trPwa(
            'msg_new_update',
            lang === 'vi'
                ? 'Đã có bản cập nhật mới! Bạn có muốn tải lại trang để áp dụng ngay không?'
                : 'A new version is available! Would you like to reload to apply it now?'
        );
    }

    const fallbackUrl = 'https://github.com/MeoNguOfficial/magic-hop-online/releases/latest';
    const targetUrl = downloadUrl || fallbackUrl;

    const extraButtons = [];
    // Nút WEB UPDATE chỉ hiển thị trên bản Web / PWA (không hiển thị trên PC / APK đóng gói)
    if (!platform.isPackaged) {
        extraButtons.push({
            text: trPwa('btn_web_update', lang === 'vi' ? 'CẬP NHẬT WEB' : 'WEB UPDATE'),
            className: 'flex-1 min-w-[110px] py-2 px-3 text-xs font-bold text-cyan-300 bg-cyan-500/15 border border-cyan-400/70 hover:bg-cyan-500/30 rounded uppercase font-orbitron transition-all',
            onClick: () => runWebUpdateWithScene(worker || (swRegistration && swRegistration.waiting) || null)
        });
    }

    if (typeof showCyberModal === 'function') {
        showCyberModal({
            title,
            message,
            type: 'confirm',
            confirmText: trPwa('btn_download_update', lang === 'vi' ? 'TẢI CẬP NHẬT' : 'DOWNLOAD UPDATE'),
            cancelText: trPwa('btn_later', lang === 'vi' ? 'ĐỂ SAU' : 'LATER'),
            extraButtons,
            onConfirm: () => {
                if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Browser) {
                    window.Capacitor.Plugins.Browser.open({ url: targetUrl });
                } else {
                    window.open(targetUrl, '_blank');
                }
            }
        });
    }
}

/**
 * Đăng ký Service Worker và kiểm tra cập nhật thông minh theo nền tảng:
 * - PC / APK đóng gói: Bỏ qua SW (gỡ SW cũ nếu còn sót), chỉ kiểm tra bản phát hành từ xa.
 * - Web trình duyệt: Luôn chạy bản mới nhất trên web, KHÔNG tự bật popup làm phiền.
 * - PWA Standalone: Tự kiểm tra cập nhật mới (qua SW + version.json từ xa).
 */
function initPWAUpdateDetection() {
    applyPlatformUIAdjustments();
    const platform = getRuntimePlatformInfo();

    // 1. App đóng gói (PC Standalone hoặc Android APK): Không dùng Service Worker
    if (platform.isPackaged) {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations()
                .then(regs => regs.forEach(r => r.unregister()))
                .catch(() => {});
        }
        console.log('[App] PWA Service Worker skipped for packaged app. Using native update checker.');
        initNativeAppAutoUpdate();
        return;
    }

    if (!('serviceWorker' in navigator)) {
        if (platform.isPWA) initNativeAppAutoUpdate();
        return;
    }

    navigator.serviceWorker.register('./sw.js').then(reg => {
        swRegistration = reg;

        // Bản trình duyệt web luôn là bản mới nhất: chỉ dùng SW để cache tài nguyên mượt mà,
        // không tự động popup cập nhật hay tự reload giữa chừng trừ khi người dùng bấm WEB UPDATE.
        if (!platform.isPWA) {
            return;
        }

        const autoUpdate = JSON.parse(localStorage.getItem('swAutoUpdateEnabled')) !== false;
        if (!autoUpdate) return;

        if (reg.waiting) {
            promptUserToUpdate(reg.waiting, false);
        }

        reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (!newWorker) return;
            newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    promptUserToUpdate(newWorker, isManualUpdateCheck);
                }
            });
        });
    }).catch(err => {
        console.warn('[PWA] Service Worker registration failed:', err);
    });

    // Kiểm tra thêm version.json cho PWA Standalone (phòng trường hợp SW chưa cập nhật kịp)
    if (platform.isPWA) {
        initNativeAppAutoUpdate();
    }

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing || !_allowSwReload) return;
        refreshing = true;
        window.location.reload();
    });
}

/**
 * Tự động kiểm tra bản cập nhật mới trong nền khi khởi động app (PC / APK / PWA)
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
 * Kiểm tra cập nhật qua version.json từ xa (dùng cho PC Standalone, Android APK, PWA và check thủ công)
 */
async function checkNativeAppUpdate(isManual = true) {
    const platform = getRuntimePlatformInfo();
    const currentVersion = getCurrentAppVersion();
    const lang = typeof activeLang !== 'undefined' ? activeLang : 'vi';

    if (isManual && typeof showCyberModal === 'function') {
        showCyberModal({
            title: trPwa('install_app_title', lang === 'vi' ? 'CẬP NHẬT ỨNG DỤNG' : 'APP UPDATE'),
            message: trPwa(
                'msg_checking_update',
                lang === 'vi' ? 'Đang kết nối máy chủ kiểm tra bản cập nhật...' : 'Connecting to server to check for updates...'
            ),
            type: 'alert'
        });
    }

    try {
        const data = await fetchRemoteVersionData();
        const remoteVersion = data.version || currentVersion;
        const isNewer = compareSemVer(remoteVersion, currentVersion) > 0;
        const waitingWorker = (!platform.isPackaged && swRegistration && swRegistration.waiting) ? swRegistration.waiting : null;

        if (isNewer) {
            const changelogText = (data.changelog && (data.changelog[lang] || data.changelog.vi || data.changelog.en)) || '';
            const downloadUrl = platform.isPC
                ? (data.downloads?.pc || 'https://github.com/MeoNguOfficial/magic-hop-online/releases/latest')
                : (platform.isAndroid
                    ? (data.downloads?.apk || 'https://github.com/MeoNguOfficial/magic-hop-online/releases/latest')
                    : (data.downloads?.pc || data.downloads?.apk || 'https://github.com/MeoNguOfficial/magic-hop-online/releases/latest'));

            showAppUpdateModal({
                remoteVersion,
                changelogText,
                downloadUrl,
                worker: waitingWorker,
                isManual
            });
            return;
        }

        // Nếu đang ở bản mới nhất trên Web/PWA nhưng còn SW waiting tồn đọng -> kích hoạt âm thầm (không reload ngang) để lần sau không báo nữa
        if (waitingWorker && !_allowSwReload) {
            try { waitingWorker.postMessage('skipWaiting'); } catch (e) {}
        }

        if (isManual && typeof showCyberModal === 'function') {
            if (platform.isWeb) {
                const webMsg = trPwa(
                    'msg_web_always_latest',
                    lang === 'vi'
                        ? `Phiên bản Web trên trình duyệt luôn là bản mới nhất (v${currentVersion}).`
                        : `Browser Web always runs the latest live version (v${currentVersion}).`
                ).replace('{version}', currentVersion);

                showCyberModal({
                    title: trPwa('install_app_title', lang === 'vi' ? 'CẬP NHẬT ỨNG DỤNG' : 'APP UPDATE'),
                    message: webMsg,
                    type: 'alert',
                    extraButtons: [{
                        text: trPwa('btn_web_update', lang === 'vi' ? 'CẬP NHẬT WEB' : 'WEB UPDATE'),
                        className: 'flex-1 min-w-[110px] py-2 px-3 text-xs font-bold text-cyan-300 bg-cyan-500/15 border border-cyan-400/70 hover:bg-cyan-500/30 rounded uppercase font-orbitron transition-all',
                        onClick: () => runWebUpdateWithScene(waitingWorker)
                    }]
                });
            } else {
                const upToDateMsg = trPwa(
                    'msg_app_up_to_date',
                    lang === 'vi'
                        ? `Ứng dụng ${platform.name} của bạn đang ở phiên bản mới nhất (v${currentVersion}).`
                        : `Your ${platform.name} app is already up to date (v${currentVersion}).`
                ).replace('{platform}', platform.name).replace('{version}', currentVersion);

                showCyberModal({
                    title: trPwa('install_app_title', lang === 'vi' ? 'CẬP NHẬT ỨNG DỤNG' : 'APP UPDATE'),
                    message: upToDateMsg,
                    type: 'alert'
                });
            }
        }
    } catch (err) {
        if (isManual && typeof showCyberModal === 'function') {
            if (platform.isWeb) {
                const webMsg = trPwa(
                    'msg_web_always_latest',
                    lang === 'vi'
                        ? `Phiên bản Web trên trình duyệt luôn là bản mới nhất (v${currentVersion}).`
                        : `Browser Web always runs the latest live version (v${currentVersion}).`
                ).replace('{version}', currentVersion);

                showCyberModal({
                    title: trPwa('install_app_title', lang === 'vi' ? 'CẬP NHẬT ỨNG DỤNG' : 'APP UPDATE'),
                    message: webMsg,
                    type: 'alert',
                    extraButtons: [{
                        text: trPwa('btn_web_update', lang === 'vi' ? 'CẬP NHẬT WEB' : 'WEB UPDATE'),
                        className: 'flex-1 min-w-[110px] py-2 px-3 text-xs font-bold text-cyan-300 bg-cyan-500/15 border border-cyan-400/70 hover:bg-cyan-500/30 rounded uppercase font-orbitron transition-all',
                        onClick: () => runWebUpdateWithScene(null)
                    }]
                });
            } else {
                showCyberModal({
                    title: trPwa('install_app_title', lang === 'vi' ? 'CẬP NHẬT ỨNG DỤNG' : 'APP UPDATE'),
                    message: trPwa(
                        'msg_update_connect_error',
                        lang === 'vi'
                            ? 'Không thể kết nối máy chủ cập nhật. Vui lòng kiểm tra lại kết nối mạng.'
                            : 'Failed to connect to update server. Please check your internet connection.'
                    ),
                    type: 'alert'
                });
            }
        }
    }
}
window.checkNativeAppUpdate = checkNativeAppUpdate;

/**
 * Kiểm tra cập nhật App thủ công (Phân luồng thông minh giữa Native App, PWA Standalone và Web Trình duyệt)
 */
async function manualCheckForUpdate() {
    const platform = getRuntimePlatformInfo();
    isManualUpdateCheck = true;

    // 1. App đóng gói (PC / APK): kiểm tra trực tiếp version.json từ xa
    if (platform.isPackaged) {
        return await checkNativeAppUpdate(true);
    }

    // 2. Web trình duyệt thông thường: luôn bản mới nhất (kiểm tra đồng bộ tab hiện tại với bản live)
    if (platform.isWeb) {
        if ('serviceWorker' in navigator) {
            const reg = await navigator.serviceWorker.getRegistration().catch(() => null);
            if (reg) {
                swRegistration = reg;
                await reg.update().catch(() => {});
            }
        }
        return await checkNativeAppUpdate(true);
    }

    // 3. PWA Standalone: vừa update Service Worker vừa kiểm tra version.json từ xa
    if ('serviceWorker' in navigator) {
        const currentReg = await navigator.serviceWorker.getRegistration().catch(() => null);
        if (currentReg) {
            swRegistration = currentReg;
            if (currentReg.waiting) {
                await promptUserToUpdate(currentReg.waiting, true);
                return;
            }
            await currentReg.update().catch(() => {});
            if (currentReg.waiting) {
                await promptUserToUpdate(currentReg.waiting, true);
                return;
            }
        }
    }

    return await checkNativeAppUpdate(true);
}
window.manualCheckForUpdate = manualCheckForUpdate;

/**
 * Xử lý thông báo cập nhật từ Service Worker trên PWA (có đối chiếu version.json để không báo lặp bản cũ)
 */
async function promptUserToUpdate(worker, isManual = false) {
    const platform = getRuntimePlatformInfo();
    if (platform.isPackaged) return;

    // Trình duyệt web luôn là bản mới nhất, không tự popup thông báo SW nền
    if (platform.isWeb && !isManual) return;

    const autoUpdate = JSON.parse(localStorage.getItem('swAutoUpdateEnabled')) !== false;
    if (!isManual && !autoUpdate) return;

    const currentVersion = getCurrentAppVersion();
    const lang = typeof activeLang !== 'undefined' ? activeLang : 'vi';

    try {
        const data = await fetchRemoteVersionData();
        const remoteVersion = data.version || currentVersion;
        if (compareSemVer(remoteVersion, currentVersion) > 0) {
            const changelogText = (data.changelog && (data.changelog[lang] || data.changelog.vi || data.changelog.en)) || '';
            const downloadUrl = data.downloads?.pc || data.downloads?.apk || 'https://github.com/MeoNguOfficial/magic-hop-online/releases/latest';
            showAppUpdateModal({
                remoteVersion,
                changelogText,
                downloadUrl,
                worker,
                isManual
            });
            return;
        }

        // Nếu đã ở đúng phiên bản mới nhất trên remote mà vẫn có worker cũ đang waiting: âm thầm đẩy lên active (không reload)
        if (!isManual) {
            try { worker.postMessage('skipWaiting'); } catch (e) {}
            return;
        }
    } catch (err) {
        // Khi ngoại tuyến mà PWA có worker đang chờ -> vẫn cho phép người dùng chọn Web Update
    }

    showAppUpdateModal({
        worker,
        isManual
    });
}

// Khởi tạo các sự kiện modal tải ứng dụng
function initPwaInstallerUI() {
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
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPwaInstallerUI);
} else {
    initPwaInstallerUI();
}

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
