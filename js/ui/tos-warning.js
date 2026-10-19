// ============================================================
//  tos-warning.js — Hiển thị thông báo điều khoản dịch vụ
// ============================================================

(function () {
    function showTOSModal() {
        if (typeof window.showCyberModal === 'function') {
            // Xác định ngôn ngữ hiện tại
            let currentLang = 'vi';
            if (typeof activeLang !== 'undefined') {
                currentLang = activeLang;
            } else {
                // Fallback nếu không có activeLang
                const userLang = localStorage.getItem('selectedLanguage') || 'auto';
                if (userLang === 'auto' || !userLang) {
                    currentLang = (navigator.language || navigator.userLanguage).startsWith('vi') ? 'vi' : 'en';
                } else {
                    currentLang = userLang === 'vi' ? 'vi' : 'en';
                }
            }

            const dict = {
                vi: {
                    title: "ĐIỀU KHOẢN DỊCH VỤ",
                    message: "Chào mừng đến với Magic Hop Online! Bằng việc chơi game này, hãy tuân thủ <a href='terms.html' target='_blank' class='text-cyan-400 hover:underline font-bold'>điều khoản dịch vụ</a> của chúng tôi.",
                    confirm: "ĐỒNG Ý VÀ CHƠI"
                },
                en: {
                    title: "TERMS OF SERVICE",
                    message: "Welcome to Magic Hop Online! By playing this game, please comply with our <a href='terms.html' target='_blank' class='text-cyan-400 hover:underline font-bold'>terms of service</a>.",
                    confirm: "AGREE AND PLAY"
                }
            };

            const t = dict[currentLang] || dict['en'];

            window.showCyberModal({
                title: t.title,
                message: `<div class="text-center p-2"><p class="text-xs text-gray-300 leading-relaxed font-orbitron">${t.message}</p></div>`,
                type: 'alert',
                confirmText: t.confirm,
                onConfirm: () => {
                    localStorage.setItem('tos_accepted', 'true');
                }
            });
        } else {
            // Nếu vì lý do nào đó showCyberModal chưa nạp, thử lại sau 100ms
            setTimeout(showTOSModal, 100);
        }
    }

    // Đợi trang tải xong rồi hiển thị
    document.addEventListener('DOMContentLoaded', () => {
        // Kiểm tra xem đã đồng ý điều khoản chưa
        const tosAccepted = localStorage.getItem('tos_accepted') === 'true';
        if (!tosAccepted) {
            // Trì hoãn hiển thị 600ms để đảm bảo UI/intro ổn định
            setTimeout(showTOSModal, 600);
        }
    });
})();
