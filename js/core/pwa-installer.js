// ============================================================
//  pwa-installer.js — Hướng dẫn cài đặt ứng dụng (PWA)
// ============================================================

let swRegistration = null;
let isManualUpdateCheck = false;

// LƯU Ý: Sự kiện 'beforeinstallprompt' đã được chuyển sang <head> của index.html
// để tránh lỗi Race Condition (JS tải chậm hơn tốc độ trình duyệt bắn sự kiện).

/**
 * Hiển thị hướng dẫn hoặc kích hoạt Prompt cài đặt PWA
 */
function showPWAInstallGuide() {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

    if (isStandalone) {
        if (typeof showCyberModal === 'function') {
            showCyberModal({
                title: t('install_app_title'),
                message: activeLang === 'vi' ? "Bạn đã cài đặt và đang sử dụng phiên bản App!" : "You are already using the App version!",
                type: 'alert'
            });
        }
        return;
    }

    if (isIOS) {
        showCyberModal({
            title: t('install_app_title'),
            message: t('install_ios_guide'),
            type: 'alert'
        });
    } else if (window.globalDeferredPrompt) {
        // Dùng biến toàn cục đã hứng được từ thẻ <head> của index.html
        window.globalDeferredPrompt.prompt();
        window.globalDeferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('[PWA] User accepted install');
            }
            // Reset lại prompt sau khi người dùng đã tương tác
            window.globalDeferredPrompt = null;
        });
    } else {
        showCyberModal({
            title: t('install_app_title'),
            message: activeLang === 'vi'
                ? "Để tải App: Nhấn vào biểu tượng Menu (3 chấm) trên trình duyệt và chọn 'Cài đặt ứng dụng' (Install App) hoặc 'Thêm vào màn hình chính'."
                : "To download App: Open browser menu and select 'Install App' or 'Add to Home Screen'.",
            type: 'alert'
        });
    }
}

/**
 * Đăng ký Service Worker và kiểm tra cập nhật
 */
function initPWAUpdateDetection() {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.register('./sw.js').then(reg => {
        swRegistration = reg;
        // 1. Kiểm tra nếu đã có bản cập nhật đang chờ sẵn (waiting)
        if (reg.waiting) {
            promptUserToUpdate(reg.waiting);
        }

        // 2. Lắng nghe sự kiện tìm thấy bản cập nhật mới (installing)
        reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            newWorker.addEventListener('statechange', () => {
                // Khi bản mới đã cài đặt xong và trình duyệt đang kiểm soát bởi bản cũ
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    promptUserToUpdate(newWorker, isManualUpdateCheck);
                }
            });
        });
    });

    // 3. Tự động tải lại trang khi Service Worker mới đã kích hoạt thành công
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
    });
}

/**
 * Kiểm tra cập nhật App thủ công (Đã Fix)
 */
async function manualCheckForUpdate() {
    // 1. Kiểm tra API trình duyệt có hỗ trợ không
    if (!('serviceWorker' in navigator)) {
        if (typeof showCyberModal === 'function') {
            showCyberModal({
                title: t('install_app_title'),
                message: activeLang === 'vi' ? "Trình duyệt không hỗ trợ Service Worker." : "Browser does not support Service Worker.",
                type: 'alert'
            });
        }
        return;
    }

    // 2. Lấy trực tiếp thông tin Service Worker đang chạy từ trình duyệt
    const currentReg = await navigator.serviceWorker.getRegistration();

    // 3. Nếu trình duyệt thực sự không có SW nào đang đăng ký
    if (!currentReg) {
        if (typeof showCyberModal === 'function') {
            showCyberModal({
                title: t('install_app_title'),
                message: activeLang === 'vi' ? "Trình duyệt không hỗ trợ kiểm tra cập nhật (Thiếu Service Worker)." : "Browser does not support update checking.",
                type: 'alert'
            });
        }
        return;
    }

    isManualUpdateCheck = true;

    // Nếu đã có bản cập nhật đang chờ sẵn (người dùng trước đó đã bỏ qua)
    if (currentReg.waiting) {
        promptUserToUpdate(currentReg.waiting, true);
        return;
    }

    // Thông báo cho người dùng biết hệ thống đang làm việc
    if (typeof showCyberModal === 'function') {
        showCyberModal({
            title: t('install_app_title'),
            message: activeLang === 'vi' ? "Đang kiểm tra cập nhật..." : "Checking for updates...",
            type: 'alert'
        });
    }

    // Tiến hành gọi lệnh update
    currentReg.update().then(updatedReg => {
        if (!updatedReg.waiting && !updatedReg.installing) {
            showCyberModal({
                title: t('install_app_title'),
                message: activeLang === 'vi' ? "Ứng dụng của bạn đã ở phiên bản mới nhất." : "Your app is already up to date.",
                type: 'alert'
            });
        }
    }).catch(err => {
        if (typeof showCyberModal === 'function') {
            showCyberModal({
                title: t('install_app_title'),
                message: activeLang === 'vi' ? "Không thể kết nối máy chủ. Vui lòng kiểm tra lại mạng." : "Failed to connect to the server. Please check your network.",
                type: 'alert'
            });
        }
    });
}

function promptUserToUpdate(worker, isManual = false) {
    // Nếu không phải kiểm tra thủ công và người dùng tắt tự động cập nhật thì thoát
    const autoUpdate = JSON.parse(localStorage.getItem('swAutoUpdateEnabled')) !== false;
    if (!isManual && !autoUpdate) return;

    if (typeof showCyberModal === 'function') {
        showCyberModal({
            title: t('install_app_title'),
            message: t('msg_new_update'),
            type: 'confirm',
            confirmText: t('btn_update_now'),
            onConfirm: () => {
                // Chạy hiệu ứng Cinematic Outro trước khi gửi lệnh cập nhật
                if (typeof playEndSceneAndReload === 'function') {
                    playEndSceneAndReload(() => {
                        // Gửi lệnh skipWaiting cho Service Worker sau khi màn hình đã đen
                        worker.postMessage('skipWaiting');
                    });
                } else {
                    worker.postMessage('skipWaiting');
                }
            }
        });
    }
}

// Khởi chạy khi tải trang
window.addEventListener('load', initPWAUpdateDetection);