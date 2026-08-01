// ============================================================
//  alert.js — Thông báo bảo trì hệ thống / Thông báo tạm thời
// ============================================================

(function () {
    function showMaintenanceAlert() {
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
                    title: "THÔNG BÁO BẢO TRÌ",
                    message: `
                        <div class="text-left font-orbitron space-y-3 text-xs leading-relaxed max-w-md mx-auto">
                            <p class="text-gray-300">
                                Chào các bạn, hệ thống đang tiến hành bảo trì máy chủ beatmap ngoại tuyến. Trong thời gian này, một số tính năng sẽ thay đổi như sau:
                            </p>
                            
                            <div class="space-y-1 bg-red-950/20 border border-red-500/20 p-2.5 rounded-lg">
                                <h4 class="font-bold text-red-400 flex items-center gap-1.5">
                                    <span class="inline-block w-1.5 h-1.5 rounded-full bg-red-400"></span>
                                    TÍNH NĂNG TẠM NGƯNG:
                                </h4>
                                <ul class="list-disc list-inside pl-3 text-gray-400 space-y-0.5">
                                    <li>Chơi Online (Trực tuyến).</li>
                                    <li>Tải bài hát mới.</li>
                                    <li>Xem/cập nhật Bảng xếp hạng.</li>
                                </ul>
                            </div>

                            <div class="space-y-1 bg-emerald-950/20 border border-emerald-500/20 p-2.5 rounded-lg">
                                <h4 class="font-bold text-emerald-400 flex items-center gap-1.5">
                                    <span class="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                    TÍNH NĂNG VẪN HOẠT ĐỘNG:
                                </h4>
                                <ul class="list-disc list-inside pl-3 text-gray-400 space-y-0.5">
                                    <li>Chơi bình thường với các bài hát <strong class="text-emerald-300">đã tải sẵn</strong> trên máy.</li>
                                </ul>
                            </div>

                            <p class="text-[10px] text-cyan-400 font-bold bg-cyan-950/30 border border-cyan-500/20 p-2 rounded-lg text-center mt-2">
                                Thời gian bảo trì dự kiến: 08:00 ngày 04/07/2026 đến 22:00 ngày 06/07/2026.
                            </p>
                        </div>
                    `,
                    confirm: "TÔI ĐÃ HIỂU"
                },
                en: {
                    title: "MAINTENANCE NOTICE",
                    message: `
                        <div class="text-left font-orbitron space-y-3 text-xs leading-relaxed max-w-md mx-auto">
                            <p class="text-gray-300">
                                Hi players, the system is currently undergoing offline beatmap server maintenance. During this period, some features will be adjusted as follows:
                            </p>
                            
                            <div class="space-y-1 bg-red-950/20 border border-red-500/20 p-2.5 rounded-lg">
                                <h4 class="font-bold text-red-400 flex items-center gap-1.5">
                                    <span class="inline-block w-1.5 h-1.5 rounded-full bg-red-400"></span>
                                    TEMPORARILY SUSPENDED:
                                </h4>
                                <ul class="list-disc list-inside pl-3 text-gray-400 space-y-0.5">
                                    <li>Online Play (Multiplayer).</li>
                                    <li>Downloading new songs.</li>
                                    <li>Viewing/updating Leaderboards.</li>
                                </ul>
                            </div>

                            <div class="space-y-1 bg-emerald-950/20 border border-emerald-500/20 p-2.5 rounded-lg">
                                <h4 class="font-bold text-emerald-400 flex items-center gap-1.5">
                                    <span class="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                    STILL ACTIVE:
                                </h4>
                                <ul class="list-disc list-inside pl-3 text-gray-400 space-y-0.5">
                                    <li>Normal gameplay with <strong class="text-emerald-300">pre-downloaded</strong> offline songs.</li>
                                </ul>
                            </div>

                            <p class="text-[10px] text-cyan-400 font-bold bg-cyan-950/30 border border-cyan-500/20 p-2 rounded-lg text-center mt-2">
                                Estimated maintenance window: 08:00 July 4, 2026 to 22:00 July 6, 2026.
                            </p>
                        </div>
                    `,
                    confirm: "I UNDERSTAND"
                }
            };

            const t = dict[currentLang] || dict['en'];

            window.showCyberModal({
                title: t.title,
                message: t.message,
                type: 'alert',
                confirmText: t.confirm
            });
        } else {
            // Nếu vì lý do nào đó showCyberModal chưa nạp, thử lại sau 100ms
            setTimeout(showMaintenanceAlert, 100);
        }
    }

    // Đợi trang tải xong rồi hiển thị
    document.addEventListener('DOMContentLoaded', () => {
        // Trì hoãn hiển thị 800ms để chạy mượt mà sau khi trang đã vẽ xong
        setTimeout(showMaintenanceAlert, 800);
    });
})();
