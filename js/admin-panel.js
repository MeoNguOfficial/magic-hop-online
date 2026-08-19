document.head.insertAdjacentHTML('beforeend', `
            <style>
                .admin-tab-btn.active {
                    background-color: rgba(6, 182, 212, 0.2);
                    border-color: rgba(6, 182, 212, 0.5);
                    color: #22d3ee;
                    text-shadow: 0 0 8px rgba(34,211,238,0.5);
                }
                .skeleton-item {
                    background: linear-gradient(90deg, 
                        rgba(6, 182, 212, 0.05) 25%, 
                        rgba(6, 182, 212, 0.15) 37%, 
                        rgba(6, 182, 212, 0.05) 63%
                    );
                    background-size: 400% 100%;
                    animation: skeleton-pulse 1.8s infinite ease-in-out;
                    border-radius: 4px;
                    display: inline-block;
                }
                @keyframes skeleton-pulse {
                    0% {
                        background-position: 200% 0;
                    }
                    100% {
                        background-position: -200% 0;
                    }
                }
            </style>
        `);

const loginOverlay = document.getElementById('admin-login-overlay');
const adminUserName = document.getElementById('admin-user-name');

const tabBtns = document.querySelectorAll('.admin-tab-btn');
const tabContents = document.querySelectorAll('.admin-tab-content');

const consoleOutput = document.getElementById('console-output');
const consoleInput = document.getElementById('console-input');
const btnConsoleSend = document.getElementById('btn-console-send');
const btnConsoleClear = document.getElementById('btn-console-clear');

const sidebar = document.getElementById('admin-sidebar');
const sidebarToggleBtn = document.getElementById('sidebar-toggle');

// Biến điều khiển chat toàn cục hệ thống Admin
let currentAdminActiveRoomId = null;
let adminChatIntervalTimer = null;
let adminChatFilterStatus = 'all';

// --- QOL HELPER TRẠNG THÁI NÚT SUBMIT / ACTION BUTTONS (Xoay tròn, Xanh lá thành công, Đỏ thất bại) ---
function setSubmitButtonState(btnSubmit, state, options = {}) {
    if (!btnSubmit) return;

    if (!btnSubmit.dataset.originalHtml) {
        btnSubmit.dataset.originalHtml = btnSubmit.innerHTML;
    }
    if (!btnSubmit.dataset.originalClass) {
        btnSubmit.dataset.originalClass = btnSubmit.className;
    }

    const originalHtml = btnSubmit.dataset.originalHtml;
    const originalClass = btnSubmit.dataset.originalClass;

    if (btnSubmit._stateTimer) {
        clearTimeout(btnSubmit._stateTimer);
        btnSubmit._stateTimer = null;
    }

    if (state === 'loading') {
        btnSubmit.disabled = true;
        const loadingText = options.text || 'ĐANG XỬ LÝ...';
        btnSubmit.innerHTML = `
            <span class="inline-flex items-center justify-center gap-2">
                <svg class="w-4 h-4 animate-spin shrink-0 text-current" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>${loadingText}</span>
            </span>
        `;
        btnSubmit.classList.add('opacity-80', 'cursor-not-allowed');
    } else if (state === 'success') {
        btnSubmit.disabled = true;
        const successText = options.text || 'THÀNH CÔNG!';
        btnSubmit.className = originalClass + ' !bg-green-600 hover:!bg-green-500 !text-white !border-green-400 !shadow-[0_0_15px_rgba(34,197,94,0.6)] transition-all duration-300';
        btnSubmit.innerHTML = `
            <span class="inline-flex items-center justify-center gap-2">
                <svg class="w-4 h-4 shrink-0 text-white animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path>
                </svg>
                <span>${successText}</span>
            </span>
        `;

        const resetDelay = options.delay !== undefined ? options.delay : 1000;
        if (resetDelay > 0) {
            btnSubmit._stateTimer = setTimeout(() => {
                resetSubmitButtonState(btnSubmit);
            }, resetDelay);
        }
    } else if (state === 'error') {
        btnSubmit.disabled = false;
        const errorText = options.text || 'THẤT BẠI!';
        btnSubmit.className = originalClass + ' !bg-red-600 hover:!bg-red-500 !text-white !border-red-400 !shadow-[0_0_15px_rgba(239,68,68,0.6)] transition-all duration-300';
        btnSubmit.innerHTML = `
            <span class="inline-flex items-center justify-center gap-2">
                <svg class="w-4 h-4 shrink-0 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
                <span>${errorText}</span>
            </span>
        `;

        const resetDelay = options.delay !== undefined ? options.delay : 3000;
        if (resetDelay > 0) {
            btnSubmit._stateTimer = setTimeout(() => {
                resetSubmitButtonState(btnSubmit);
            }, resetDelay);
        }
    } else {
        resetSubmitButtonState(btnSubmit);
    }
}

function resetSubmitButtonState(btnSubmit) {
    if (!btnSubmit) return;
    if (btnSubmit._stateTimer) {
        clearTimeout(btnSubmit._stateTimer);
        btnSubmit._stateTimer = null;
    }
    btnSubmit.disabled = false;
    if (btnSubmit.dataset.originalClass) {
        btnSubmit.className = btnSubmit.dataset.originalClass;
    }
    if (btnSubmit.dataset.originalHtml) {
        btnSubmit.innerHTML = btnSubmit.dataset.originalHtml;
    }
    btnSubmit.classList.remove('opacity-80', 'cursor-not-allowed');
}
window.setSubmitButtonState = setSubmitButtonState;
window.resetSubmitButtonState = resetSubmitButtonState;

// --- BIẾN ĐIỀU PHỐI DEBOUNCE TÌM KIẾM TOÀN CỤC ---
let userSearchTimeout = null;
let bmSearchTimeout = null;
let scoreBmSearchTimeout = null;

// --- HÀM GIẢI MÃ THÔNG TIN USER ĐA TẦNG AN TOÀN (CRASH-PROOF) ---
function getAuthUser() {
    const raw = localStorage.getItem('auth_user');
    if (!raw) return {};
    
    // 1. Thử parse trực tiếp dưới dạng JSON thông thường
    try {
        return JSON.parse(raw);
    } catch (e) {}

    // 2. Thử giải mã Base64 + URL-encoded
    try {
        let decoded = atob(raw);
        if (decoded.includes('%')) {
            decoded = decodeURIComponent(decoded);
        }
        return JSON.parse(decoded);
    } catch (e) {}

    // 3. Thử giải mã XOR dự phòng (MEO_ Cipher bảo mật của game)
    try {
        let cleanRaw = raw;
        if (raw.startsWith("MEO_")) {
            cleanRaw = raw.substring(4);
        }
        let decodedBase64 = atob(cleanRaw);
        const xorKey = "MeoTNCyberHop2024";
        let unxored = '';
        for (let i = 0; i < decodedBase64.length; i++) {
            unxored += String.fromCharCode(decodedBase64.charCodeAt(i) ^ xorKey.charCodeAt(i % xorKey.length));
        }
        if (unxored.includes('%')) {
            unxored = decodeURIComponent(unxored);
        }
        return JSON.parse(unxored);
    } catch (e) {}

    return {};
}

// --- I18N DICTIONARY & LOGIC ---
const adminDict = {
    vi: {
        admin_title: "BẢNG ĐIỀU KHIỂN",
        admin_logout: "Đăng xuất",
        admin_goto_game: "Về Game",
        admin_tab_dashboard: "Tổng quan",
        admin_tab_users: "Người dùng",
        admin_tab_beatmaps: "Beatmaps",
        admin_tab_scores: "Điểm số",
        admin_tab_chat: "Phòng chat",
        admin_tab_console: "Bảng lệnh",
        admin_login_title: "ĐĂNG NHẬP QUẢN TRỊ",
        admin_login_user: "Tên tài khoản / Email",
        admin_login_pass: "Mật khẩu",
        admin_login_fail: "Đăng nhập thất bại.",
        admin_btn_login: "Đăng nhập",
        admin_dashboard_overview: "Tổng quan Hệ thống",
        admin_stat_users: "Tổng người dùng",
        admin_stat_beatmaps: "Tổng Beatmaps",
        admin_stat_scores: "Lượt chơi",
        admin_stat_status: "Trạng thái API",
        admin_users_title: "Quản lý Người dùng",
        admin_users_add: "Thêm Người dùng",
        admin_stt: "STT",
        admin_name: "Tên",
        admin_role: "Vai trò",
        admin_created_at: "Ngày tạo",
        admin_actions: "Thao tác",
        admin_loading_users: "Đang tải danh sách...",
        admin_beatmaps_title: "Quản lý Beatmaps",
        admin_beatmaps_sync: "Đồng bộ",
        admin_beatmaps_add: "Thêm Beatmap",
        admin_title_col: "Tiêu đề",
        admin_artist: "Nghệ sĩ",
        admin_status: "Trạng thái",
        admin_loading_beatmaps: "Đang tải danh sách...",
        admin_scores_title: "Điểm số & Kỷ lục",
        admin_scores_desc: "Tính năng đang phát triển hoặc chọn beatmap để xem.",
        admin_console_title: "Bảng lệnh hệ thống",
        admin_console_placeholder: "Nhập lệnh...",
        admin_btn_send: "Gửi",
        admin_btn_clear: "Xóa",
        admin_role_admin: "Quản trị",
        admin_role_user: "Người dùng",
        admin_status_active: "Hoạt động",
        admin_status_hidden: "Đang ẩn",
        admin_action_edit: "Sửa",
        admin_action_delete: "Xóa",
        admin_failed_load: "Tải dữ liệu thất bại",
        admin_user_add_title: "Thêm Người dùng",
        admin_user_edit_title: "Chỉnh sửa Người dùng",
        admin_user_delete_title: "Xóa Người dùng?",
        admin_user_delete_desc: "Bạn có chắc chắn muốn xóa người dùng này? Thao tác không thể hoàn tác.",
        admin_btn_save: "Lưu thay đổi",
        admin_btn_cancel: "Hủy",
        admin_btn_prev: "Trang trước",
        admin_btn_next: "Trang sau",
        admin_username: "Tên đăng nhập",
        admin_realname: "Tên hiển thị",
        admin_phone: "Số điện thoại",
        admin_status_banned: "Đã khóa",
        admin_password_leave_blank: "Mật khẩu (Bỏ trống nếu không đổi)",
        admin_bm_add_title: "Thêm Beatmap",
        admin_bm_edit_title: "Chỉnh sửa Beatmap",
        admin_bm_delete_title: "Xóa Beatmap?",
        admin_bm_delete_desc: "Bạn có chắc chắn muốn xóa bản đồ nhạc này? Thao tác không thể hoàn tác.",
        admin_btn_import: "Nạp",
        admin_btn_import_json: "Nạp JSON",
        admin_action_export_json: "Xuất JSON",
        admin_action_export_all_json: "Xuất Tất Cả JSON",
        admin_bm_import_title: "Nạp Beatmap từ JSON",
        admin_score_delete_title: "Xóa điểm số?",
        admin_score_delete_desc: "Bạn có chắc chắn muốn xóa kỷ lục này?",
        admin_btn_load_prev_hidden: "TẢI PHẦN TRƯỚC ({count} BỊ ẨN)",
        admin_btn_load_next_hidden: "TẢI PHẦN TIẾP THEO ({count} BỊ ẨN)",
        admin_btn_load_more_data: "TẢI THÊM DỮ LIỆU",
        admin_btn_load_more_songs: "TẢI THÊM BÀI HÁT",
        admin_msg_loading: "Đang tải...",
        admin_msg_error_retry: "Lỗi, thử lại",
        admin_msg_searching: "Đang tìm kiếm...",
        admin_chat_queue: "Hàng chờ hỗ trợ",
        admin_btn_refresh: "Làm mới",
        admin_game_settings: "CẤU HÌNH GAME",
        admin_show_hitbox: "HIỂN THỊ HITBOX BLOCK",
        admin_show_hitbox_desc: "Hiển thị hộp va chạm của gạch trong game. (Lưu ý: Có thể làm tụt hiệu năng / FPS)",
        admin_autoreload_updated: "Đã cập nhật dữ liệu mới"
    }
};
adminDict.en = adminDict.vi;

const XOR_KEY = "MeoTNCyberHop2024";
function xorEncryptDecrypt(input) {
    let output = '';
    for (let i = 0; i < input.length; i++) {
        output += String.fromCharCode(input.charCodeAt(i) ^ XOR_KEY.charCodeAt(i % XOR_KEY.length));
    }
    return output;
}

function getSavedLanguage() {
    return 'vi';
}

let activeLang = 'vi';
function detectLanguage() {
    activeLang = 'vi';
}

function t(key) {
    return adminDict['vi']?.[key] || key;
}

function applyTranslations() {
    detectLanguage();
    document.querySelectorAll('[data-i18n]').forEach(el => {
        el.innerText = t(el.getAttribute('data-i18n'));
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
    });
}

// Chạy dịch thuật ban đầu khi nạp trang
applyTranslations();

// --- SIDEBAR TOGGLE LOGIC ---
if (sidebar && sidebarToggleBtn) {
    const isCollapsed = localStorage.getItem('adminSidebarCollapsed') === 'true';
    if (isCollapsed) {
        sidebar.classList.add('sidebar-collapsed');
    }

    sidebarToggleBtn?.addEventListener('click', () => {
        sidebar.classList.toggle('sidebar-collapsed');
        if (sidebar.classList.contains('sidebar-collapsed')) {
            localStorage.setItem('adminSidebarCollapsed', 'true');
        } else {
            localStorage.removeItem('adminSidebarCollapsed');
        }
    });
}

// --- MODAL OPEN/CLOSE ANIMATION (Windows-style) ---
function openModal(modal) {
    if (!modal) return;
    modal.classList.remove('hidden', 'modal-closing');
    modal.classList.add('modal-opening');
    void modal.offsetWidth;
    requestAnimationFrame(() => {
        modal.classList.remove('modal-opening');
    });
}

function closeModal(modal) {
    if (!modal) return;
    modal.classList.add('modal-closing');
    const onEnd = () => {
        modal.classList.add('hidden');
        modal.classList.remove('modal-closing');
        modal.removeEventListener('transitionend', onEnd);
    };
    modal.addEventListener('transitionend', onEnd);
    setTimeout(() => {
        if (modal.classList.contains('modal-closing')) {
            modal.classList.add('hidden');
            modal.classList.remove('modal-closing');
        }
    }, 250);
}

// --- HỆ THỐNG CUSTOM MODAL THÔNG BÁO XÁC NHẬN/CẢNH BÁO ---
function showAdminConfirm(title, message, onConfirm) {
    const modal = document.getElementById('admin-custom-confirm-modal');
    const titleEl = document.getElementById('confirm-modal-title');
    const msgEl = document.getElementById('confirm-modal-message');
    const btnCancel = document.getElementById('btn-confirm-modal-cancel');
    const btnOk = document.getElementById('btn-confirm-modal-ok');

    if (!modal || !titleEl || !msgEl || !btnCancel || !btnOk) return;

    titleEl.innerText = title;
    msgEl.innerText = message;

    openModal(modal);

    const cleanup = () => {
        closeModal(modal);
        btnOk.removeEventListener('click', handleOk);
        btnCancel.removeEventListener('click', handleCancel);
    };

    function handleOk() {
        if (typeof onConfirm === 'function') onConfirm();
        cleanup();
    }

    function handleCancel() {
        cleanup();
    }

    btnOk.addEventListener('click', handleOk);
    btnCancel.addEventListener('click', handleCancel);
}

function showAdminAlert(title, message) {
    const modal = document.getElementById('admin-custom-alert-modal');
    const titleEl = document.getElementById('alert-modal-title');
    const msgEl = document.getElementById('alert-modal-message');
    const btnOk = document.getElementById('btn-alert-modal-ok');

    if (!modal || !titleEl || !msgEl || !btnOk) {
        console.error(`${title}: ${message}`);
        return;
    }

    titleEl.innerText = title;
    msgEl.innerText = message;

    openModal(modal);

    const handleOk = () => {
        closeModal(modal);
        btnOk.removeEventListener('click', handleOk);
    };

    btnOk.addEventListener('click', handleOk);
}


function logToConsole(msg, type = 'info') {
    const el = document.createElement('div');
    const time = new Date().toLocaleTimeString();
    let color = 'text-gray-300';
    if (type === 'error') color = 'text-red-400';
    if (type === 'success') color = 'text-green-400';
    if (type === 'warning') color = 'text-yellow-400';

    el.className = color;
    el.innerText = `[${time}] ${msg}`;
    consoleOutput.appendChild(el);
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
}

async function checkAuth() {
    const authCard = document.getElementById('admin-auth-card');
    const authTitle = document.getElementById('admin-auth-title');
    const authDesc = document.getElementById('admin-auth-desc');
    const authIcon = document.getElementById('admin-auth-icon');
    const authActions = document.getElementById('admin-auth-actions');

    loginOverlay?.classList.remove('hidden');

    const setStatusSuccess = () => {
        if (authCard) authCard.className = "bg-green-950/40 border border-green-500/50 p-8 rounded-xl shadow-[0_0_30px_rgba(34,197,94,0.25)] w-full max-w-md text-center transition-all duration-300";
        if (authIcon) {
            authIcon.className = "w-16 h-16 bg-green-900/30 border border-green-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-[0_0_15px_rgba(34,197,94,0.4)]";
            authIcon.innerHTML = `<svg class="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg>`;
        }
        if (authTitle) {
            authTitle.innerText = "Access granted";
            authTitle.className = "text-xl font-orbitron font-bold text-green-400 mb-2 uppercase tracking-widest";
        }
        if (authDesc) {
            authDesc.innerText = "Xác thực chức vụ thành công!";
            authDesc.className = "text-green-300 text-xs font-orbitron mb-4";
        }
        if (authActions) authActions.classList.add('hidden');
    };

    const token = localStorage.getItem('auth_token');
    if (!token) {
        showNoPermission();
        return;
    }

    try {
        const res = await ApiService.getMe();
        const user = res.data?.data?.user || res.data?.data || res.data;
        if (user && (user.role === 'admin' || user.is_admin == 1 || user.is_admin === true || user.id === 1)) {
            setStatusSuccess();
            await new Promise(r => setTimeout(r, 2000));
            loginOverlay?.classList.add('hidden');
            showDashboard(user);
        } else {
            logToConsole('Access Denied: Not an admin', 'error');
            showNoPermission();
        }
    } catch (err) {
        showNoPermission();
    }
}

function showNoPermission() {
    const authCard = document.getElementById('admin-auth-card');
    const authTitle = document.getElementById('admin-auth-title');
    const authDesc = document.getElementById('admin-auth-desc');
    const authIcon = document.getElementById('admin-auth-icon');
    const authActions = document.getElementById('admin-auth-actions');

    loginOverlay?.classList.remove('hidden');
    if (authCard) authCard.className = "bg-red-950/40 border border-red-500/50 p-8 rounded-xl shadow-[0_0_30px_rgba(239,68,68,0.25)] w-full max-w-md text-center transition-all duration-300";
    if (authIcon) {
        authIcon.className = "w-16 h-16 bg-red-900/30 border border-red-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-[0_0_15px_rgba(239,68,68,0.4)]";
        authIcon.innerHTML = `<svg class="w-8 h-8 text-red-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>`;
    }
    if (authTitle) {
        authTitle.innerText = "Access denied";
        authTitle.className = "text-xl font-orbitron font-bold text-red-500 mb-2 uppercase tracking-widest";
    }
    if (authDesc) {
        authDesc.innerText = "Tài khoản của bạn không có quyền Admin! Vui lòng quay lại game hoặc đăng nhập tài khoản Admin từ trang chủ.";
        authDesc.className = "text-gray-300 text-xs font-orbitron leading-relaxed mb-4";
    }
    if (authActions) authActions.classList.remove('hidden');
    adminUserName?.classList.add('hidden');
}

// ============================================================
//  AdminAutoReloader — Smart Polling cho Admin Panel
//  Kiểm tra backend mỗi INTERVAL giây, chỉ reload khi có
//  dữ liệu mới. Hiển thị toast thông báo khi cập nhật.
//  Tạm dừng khi tab ẩn, tự tiếp tục khi tab hiển thị lại.
// ============================================================
const AdminAutoReloader = (() => {
    const INTERVAL_MS = 20_000; // 20 giây
    let _timer = null;
    let _lastSignature = null;
    let _isRunning = false;

    /** Hiển thị toast nhỏ góc dưới phải khi có data mới */
    function _showToast(message) {
        const existing = document.getElementById('admin-autoreload-toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.id = 'admin-autoreload-toast';
        toast.style.cssText = [
            'position:fixed', 'bottom:24px', 'right:24px', 'z-index:99999',
            'background:rgba(6,182,212,0.15)', 'border:1px solid rgba(6,182,212,0.4)',
            'backdrop-filter:blur(12px)', 'color:#22d3ee',
            'padding:10px 18px', 'border-radius:10px',
            'font-size:13px', 'font-weight:500',
            'box-shadow:0 4px 24px rgba(0,0,0,0.4)',
            'display:flex', 'align-items:center', 'gap:8px',
            'transition:opacity 0.4s ease',
            'opacity:0'
        ].join(';');
        toast.innerHTML = `<span style="font-size:15px">✓</span> ${message}`;
        document.body.appendChild(toast);

        // Fade in
        requestAnimationFrame(() => {
            requestAnimationFrame(() => { toast.style.opacity = '1'; });
        });
        // Fade out & remove sau 3s
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 400);
        }, 3000);
    }

    function _buildSignature(responseData) {
        const meta = responseData?.meta;
        const items = responseData?.data || (Array.isArray(responseData) ? responseData : []);
        const total = meta?.total ?? items.length;
        const latestUpdatedAt = items[0]?.updated_at ?? items[0]?.created_at ?? '';
        return `${total}|${latestUpdatedAt}`;
    }

    function snapshotFromResponse(responseData) {
        _lastSignature = _buildSignature(responseData);
    }

    async function _tick() {
        if (document.hidden) return;
        if (!window.ApiService) return;

        try {
            const res = await ApiService.checkAdminBeatmapsUpdated();
            const newSig = _buildSignature(res.data);

            if (_lastSignature === null) {
                _lastSignature = newSig;
                return;
            }

            if (newSig !== _lastSignature) {
                console.log(`[AdminAutoReload] Phát hiện dữ liệu mới (${_lastSignature} → ${newSig}), đang làm mới...`);
                _lastSignature = newSig;
                await loadBeatmaps();
                await loadDashboardStats();
                _showToast(t('admin_autoreload_updated') || 'Đã cập nhật dữ liệu mới');
            }
        } catch (e) {
            // Lỗi mạng / 401 → bỏ qua
        }
    }

    function start() {
        if (_isRunning) return;
        _isRunning = true;
        _timer = setInterval(_tick, INTERVAL_MS);
        document.addEventListener('visibilitychange', _onVisibilityChange);
        console.log('[AdminAutoReload] Đã khởi động (interval ' + INTERVAL_MS / 1000 + 's).');
    }

    function stop() {
        if (!_isRunning) return;
        _isRunning = false;
        clearInterval(_timer);
        _timer = null;
        document.removeEventListener('visibilitychange', _onVisibilityChange);
        console.log('[AdminAutoReload] Đã dừng.');
    }

    function _onVisibilityChange() {
        if (!document.hidden) _tick();
    }

    return { start, stop, snapshotFromResponse };
})();

function showDashboard(user) {
    loginOverlay?.classList.add('hidden');
    adminUserName?.classList.remove('hidden');
    if (adminUserName) adminUserName.innerText = user.name || user.username || 'Admin';
    logToConsole('Admin logged in successfully.', 'success');

    loadDashboardStats();
    loadUsers();
    loadBeatmaps().then(() => {
        // Snapshot sau khi load lần đầu để có baseline chính xác,
        // sau đó khởi động auto-reloader (guard bên trong ngăn chạy 2 lần).
        AdminAutoReloader.start();
    });
    loadScoreBeatmaps(); // Khởi tạo danh mục nốt nhạc điểm số
    loadAdminChatPaneRooms(); // Tải danh sách các phòng hỗ trợ của người dùng
}

tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-tab');

        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        tabContents.forEach(content => {
            if (content.id === targetId) {
                content.classList.remove('hidden');
            } else {
                content.classList.add('hidden');
            }
        });

        if (targetId === 'tab-scores' && typeof renderAdminScoreBeatmaps === 'function') {
            renderAdminScoreBeatmaps();
        }

        // Tự động dọn dẹp hoặc khởi tạo luồng Polling Chat khi chuyển Tab
        if (targetId !== 'tab-chat') {
            if (adminChatIntervalTimer) {
                clearInterval(adminChatIntervalTimer);
                adminChatIntervalTimer = null;
            }
            currentAdminActiveRoomId = null;
        } else {
            loadAdminChatPaneRooms();
        }
    });
});

const cardStatScores = document.getElementById('card-stat-scores');
if (cardStatScores) {
    cardStatScores?.addEventListener('click', () => {
        const scoreTabBtn = document.querySelector('.admin-tab-btn[data-tab="tab-scores"]');
        if (scoreTabBtn) scoreTabBtn.click();
    });
}

// --- BINDING REFRESH BUTTONS FOR EACH TAB ---
async function withRefreshAnimation(buttonId, asyncFunc) {
    const btn = document.getElementById(buttonId);
    if (!btn) {
        await asyncFunc();
        return;
    }
    const svg = btn.querySelector('svg');
    if (svg) svg.classList.add('animate-spin');
    btn.disabled = true;
    try {
        await asyncFunc();
    } finally {
        // Subtle delay so animation is visible even for very fast requests
        await new Promise(resolve => setTimeout(resolve, 500));
        if (svg) svg.classList.remove('animate-spin');
        btn.disabled = false;
    }
}

document.getElementById('btn-refresh-dashboard')?.addEventListener('click', () => {
    withRefreshAnimation('btn-refresh-dashboard', async () => {
        logToConsole('Refreshing dashboard overview...', 'info');
        if (typeof window.deleteApiCache === 'function') {
            window.deleteApiCache('/users');
            window.deleteApiCache('/beatmaps');
        }
        await loadDashboardStats();
    });
});

document.getElementById('btn-refresh-users')?.addEventListener('click', () => {
    withRefreshAnimation('btn-refresh-users', async () => {
        logToConsole('Refreshing user list...', 'info');
        if (typeof window.deleteApiCache === 'function') {
            window.deleteApiCache('/users');
        }
        await loadUsers(currentUsersPage);
    });
});

document.getElementById('btn-refresh-beatmaps')?.addEventListener('click', () => {
    withRefreshAnimation('btn-refresh-beatmaps', async () => {
        logToConsole('Refreshing beatmap list...', 'info');
        if (typeof window.deleteApiCache === 'function') {
            window.deleteApiCache('/beatmaps');
        }
        await loadBeatmaps();
    });
});

document.getElementById('btn-refresh-scores')?.addEventListener('click', () => {
    withRefreshAnimation('btn-refresh-scores', async () => {
        logToConsole('Refreshing scores list...', 'info');
        if (typeof window.deleteApiCache === 'function') {
            window.deleteApiCache('/scores');
            window.deleteApiCache('/beatmaps');
        }
        await loadScoreBeatmaps();
        if (currentScoreBeatmapId) {
            const map = globalBeatmapsList.find(m => m.id === currentScoreBeatmapId);
            if (map) {
                await loadTopScoresForBeatmap(map);
            }
        }
    });
});

document.getElementById('btn-refresh-chat')?.addEventListener('click', () => {
    withRefreshAnimation('btn-refresh-chat', async () => {
        logToConsole('Refreshing chat rooms and messages...', 'info');
        if (typeof window.deleteApiCache === 'function') {
            window.deleteApiCache('/chat');
        }
        await loadAdminChatPaneRooms();
        if (currentAdminActiveRoomId) {
            await loadAdminActiveMessages();
        }
    });
});

async function loadDashboardStats() {
    try {
        logToConsole('Fetching dashboard stats...');
        const userRes = await apiClient.get('/users');
        const usersCount = userRes.data?.data?.length || userRes.data?.length || 0;
        const statUsersEl = document.getElementById('stat-users');
        if (statUsersEl) statUsersEl.innerText = formatScoreDisplay(usersCount);

        const bmRes = await ApiService.getBeatmaps();
        const bmCount = bmRes.data?.data?.data?.length || bmRes.data?.data?.length || bmRes.data?.length || 0;
        const statBmEl = document.getElementById('stat-beatmaps');
        if (statBmEl) statBmEl.innerText = formatScoreDisplay(bmCount);

        const statScoresEl = document.getElementById('stat-scores');
        if (statScoresEl) statScoresEl.innerText = 'N/A';
        logToConsole('Dashboard stats updated.', 'success');
    } catch (e) {
        logToConsole('Error fetching stats: ' + e.message, 'error');
    }
}

function setupSearchClearButton(inputId, clearButtonId, searchFunction) {
    const input = document.getElementById(inputId);
    const clearBtn = document.getElementById(clearButtonId);

    if (!input || !clearBtn) return;

    input.addEventListener('input', () => {
        clearBtn.classList.toggle('hidden', input.value.length === 0);
    });

    clearBtn.addEventListener('click', () => {
        input.value = '';
        clearBtn.classList.add('hidden');
        input.focus();
        if (typeof searchFunction === 'function') {
            searchFunction();
        }
    });
}


// --- USERS SEARCH & PAGINATION ---
let globalUsersList = [];
let currentUsersPage = 1;
let adminUserSearchTerm = '';

const adminUserSearchInput = document.getElementById('admin-users-search');
if (adminUserSearchInput) {
    setupSearchClearButton('admin-users-search', 'admin-users-search-clear', () => {
        adminUserSearchTerm = '';
        currentUsersPage = 1;
        loadUsers(1);
    });
}

async function loadUsers(page = 1) {
    const tbody = document.getElementById('table-users-body');
    if (!tbody) return;
    try {
        let url = `/users?page=${page}`;
        if (adminUserSearchTerm) {
            url += `&search=${encodeURIComponent(adminUserSearchTerm)}`;
        }
        const res = await apiClient.get(url);

        let users = [];
        let lastPage = 1;
        if (res.data?.data?.data) {
            users = res.data.data.data;
            currentUsersPage = res.data.data.current_page;
            lastPage = res.data.data.last_page;
        } else if (res.data?.data && res.data?.current_page) {
            users = res.data.data;
            currentUsersPage = res.data.current_page;
            lastPage = res.data.last_page;
        } else {
            users = res.data?.data || res.data;
        }

        if (!Array.isArray(users)) throw new Error('Invalid users data format');

        globalUsersList = users;
        tbody.innerHTML = '';

        let perPage = res.data?.data?.per_page || res.data?.per_page || 15;
        let offset = res.data?.data?.from || res.data?.from || ((currentUsersPage - 1) * perPage + 1);

        users.forEach((u, index) => {
            const isAdmin = u.is_admin == 1 || u.is_admin === true || u.is_admin === "1";
            const isBanned = u.is_banned == 1 || u.is_banned === true || u.is_banned === "1";
            const isActived = u.is_actived === undefined ? true : (u.is_actived == 1 || u.is_actived === true || u.is_actived === "1");

            const roleHtml = isAdmin ? `<span class="text-pink-400 font-bold">${t('admin_role_admin')}</span>` : t('admin_role_user');
            let statusHtml = '';
            if (isBanned) statusHtml = `<span class="text-red-500 font-bold">${t('admin_status_banned')}</span>`;
            else if (!isActived) statusHtml = `<span class="text-yellow-500 font-bold">Inactive</span>`;
            else statusHtml = `<span class="text-green-400 font-bold">${t('admin_status_active')}</span>`;

            const isSelf = u.id == getAuthUser()?.id;
            const deleteBtnHtml = isSelf 
                ? `<span class="text-gray-500 cursor-not-allowed select-none opacity-50 text-xs px-1 inline-block align-middle" title="${activeLang === 'vi' ? 'Không thể tự xóa chính mình' : 'Cannot delete yourself'}">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                   </span>` 
                : `<button class="text-red-400 hover:text-red-300 btn-delete-user inline-block align-middle hover:scale-110 transition-transform" data-id="${u.id}" title="${t('admin_action_delete') || 'Delete'}">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                   </button>`;

            tbody.innerHTML += `
                        <tr class="hover:bg-cyan-950/30 transition-colors">
                            <td class="p-4 border-b border-cyan-500/10">${offset + index}</td>
                            <td class="p-4 border-b border-cyan-500/10 font-bold">${u.realname || u.username || u.name}</td>
                            <td class="p-4 border-b border-cyan-500/10 text-gray-400">${u.email}</td>
                            <td class="p-4 border-b border-cyan-500/10">${roleHtml} <br> <span class="text-[10px]">${statusHtml}</span></td>
                            <td class="p-4 border-b border-cyan-500/10 text-gray-500">${new Date(u.created_at).toLocaleDateString()}</td>
                            <td class="p-4 border-b border-cyan-500/10 text-right space-x-3">
                                <button class="text-cyan-400 hover:text-cyan-300 btn-edit-user inline-block align-middle hover:scale-110 transition-transform" data-id="${u.id}" title="${t('admin_action_edit') || 'Edit'}">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                                    </svg>
                                </button>
                                ${deleteBtnHtml}
                            </td>
                        </tr>
                    `;
        });

        const usersPageInfoEl = document.getElementById('users-page-info');
        if (usersPageInfoEl) usersPageInfoEl.innerText = `${currentUsersPage} / ${lastPage}`;
        
        const btnPrevEl = document.getElementById('btn-prev-users');
        const btnNextEl = document.getElementById('btn-next-users');
        if (btnPrevEl) btnPrevEl.disabled = currentUsersPage <= 1;
        if (btnNextEl) btnNextEl.disabled = currentUsersPage >= lastPage;

        attachUserEvents();
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-red-400">${t('admin_failed_load')}</td></tr>`;
    }
}

document.getElementById('btn-prev-users')?.addEventListener('click', () => loadUsers(currentUsersPage - 1));
document.getElementById('btn-next-users')?.addEventListener('click', () => loadUsers(currentUsersPage + 1));

function attachUserEvents() {
    document.querySelectorAll('.btn-edit-user').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = btn.getAttribute('data-id') || e.currentTarget.getAttribute('data-id');
            openEditUserModal(id);
        });
    });
    document.querySelectorAll('.btn-delete-user').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = btn.getAttribute('data-id') || e.currentTarget.getAttribute('data-id');
            openDeleteUserModal(id);
        });
    });
}

const addUserModal = document.getElementById('admin-user-add-modal');
const editUserModal = document.getElementById('admin-user-edit-modal');
const deleteUserModal = document.getElementById('admin-user-delete-modal');
const addUserForm = document.getElementById('admin-user-add-form');
const editUserForm = document.getElementById('admin-user-edit-form');

document.getElementById('btn-add-user')?.addEventListener('click', () => {
    addUserForm?.reset();
    const activeChkbx = document.getElementById('add-user-actived');
    if (activeChkbx) activeChkbx.checked = true;
    document.getElementById('add-user-error')?.classList.add('hidden');
    openModal(addUserModal);
});

document.getElementById('btn-close-add-user')?.addEventListener('click', () => {
    closeModal(addUserModal);
});

addUserForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btnSubmit = e.target.querySelector('button[type="submit"]');
    const data = {
        username: document.getElementById('add-user-username')?.value,
        realname: document.getElementById('add-user-realname')?.value,
        email: document.getElementById('add-user-email')?.value,
        phone: document.getElementById('add-user-phone')?.value,
        password: document.getElementById('add-user-password')?.value,
        is_admin: document.getElementById('add-user-admin')?.checked ? 1 : 0,
        is_banned: document.getElementById('add-user-banned')?.checked ? 1 : 0,
        is_actived: document.getElementById('add-user-actived')?.checked ? 1 : 0
    };
    const errEl = document.getElementById('add-user-error');
    if (errEl) errEl.classList.add('hidden');

    setSubmitButtonState(btnSubmit, 'loading', { text: 'ĐANG TẠO...' });

    try {
        await apiClient.post(`/users`, data);
        logToConsole(`User ${data.username} created successfully.`, 'success');
        setSubmitButtonState(btnSubmit, 'success', { text: 'ĐÃ THÊM!' });
        setTimeout(() => {
            closeModal(addUserModal);
            loadUsers(1);
            resetSubmitButtonState(btnSubmit);
        }, 800);
    } catch (err) {
        const errorMsg = err.response?.data?.message || err.message || 'Create failed.';
        if (errEl) {
            errEl.innerText = errorMsg;
            errEl.classList.remove('hidden');
            logToConsole(`Create user failed: ${errEl.innerText}`, 'error');
        }
        setSubmitButtonState(btnSubmit, 'error', { text: 'TẠO THẤT BẠI!' });
    }
});

function openEditUserModal(id) {
    const user = globalUsersList.find(u => u.id == id);
    if (!user) return;
    
    const editIdEl = document.getElementById('edit-user-id');
    const editUsernameEl = document.getElementById('edit-user-username');
    const editRealnameEl = document.getElementById('edit-user-realname');
    const editEmailEl = document.getElementById('edit-user-email');
    const editPhoneEl = document.getElementById('edit-user-phone');
    const editPasswordEl = document.getElementById('edit-user-password');
    const editAdminEl = document.getElementById('edit-user-admin');
    const editActivedEl = document.getElementById('edit-user-actived');
    const editBannedEl = document.getElementById('edit-user-banned');

    if (editIdEl) editIdEl.value = user.id;
    if (editUsernameEl) editUsernameEl.value = user.username || user.name || '';
    if (editRealnameEl) editRealnameEl.value = user.realname || '';
    if (editEmailEl) editEmailEl.value = user.email || '';
    if (editPhoneEl) editPhoneEl.value = user.phone || '';
    if (editPasswordEl) editPasswordEl.value = '';
    if (editAdminEl) editAdminEl.checked = (user.is_admin == 1 || user.is_admin === true || user.is_admin === "1");
    if (editActivedEl) editActivedEl.checked = user.is_actived === undefined ? true : (user.is_actived == 1 || user.is_actived === true || user.is_actived === "1");
    if (editBannedEl) editBannedEl.checked = (user.is_banned == 1 || user.is_banned === true || user.is_banned === "1");
    
    document.getElementById('edit-user-error')?.classList.add('hidden');
    openModal(editUserModal);
}

document.getElementById('btn-close-edit-user')?.addEventListener('click', () => {
    closeModal(editUserModal);
});

editUserForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btnSubmit = e.target.querySelector('button[type="submit"]');
    const id = document.getElementById('edit-user-id')?.value;
    const data = {
        username: document.getElementById('edit-user-username')?.value,
        realname: document.getElementById('edit-user-realname')?.value,
        email: document.getElementById('edit-user-email')?.value,
        phone: document.getElementById('edit-user-phone')?.value,
        is_admin: document.getElementById('edit-user-admin')?.checked ? 1 : 0,
        is_banned: document.getElementById('edit-user-banned')?.checked ? 1 : 0,
        is_actived: document.getElementById('edit-user-actived')?.checked ? 1 : 0
    };

    const pwd = document.getElementById('edit-user-password')?.value;
    if (pwd) data.password = pwd;

    const errEl = document.getElementById('edit-user-error');
    if (errEl) errEl.classList.add('hidden');

    setSubmitButtonState(btnSubmit, 'loading', { text: 'ĐANG LƯU...' });

    try {
        await apiClient.put(`/users/${id}`, data);
        logToConsole(`User ${id} updated successfully.`, 'success');
        setSubmitButtonState(btnSubmit, 'success', { text: 'ĐÃ LƯU!' });
        setTimeout(() => {
            closeModal(editUserModal);
            loadUsers(currentUsersPage);
            resetSubmitButtonState(btnSubmit);
        }, 800);
    } catch (err) {
        const errorMsg = err.response?.data?.message || err.message || 'Update failed.';
        if (errEl) {
            errEl.innerText = errorMsg;
            errEl.classList.remove('hidden');
            logToConsole(`Update user ${id} failed: ${errEl.innerText}`, 'error');
        }
        setSubmitButtonState(btnSubmit, 'error', { text: 'LƯU THẤT BẠI!' });
    }
});

function openDeleteUserModal(id) {
    const currentUserId = getAuthUser()?.id;
    if (id == currentUserId) {
        showAdminAlert(
            activeLang === 'vi' ? 'Lỗi thao tác' : 'Action Error',
            activeLang === 'vi' ? 'Bạn không thể tự xóa tài khoản của chính mình từ bảng quản trị!' : 'You cannot delete your own account from the admin panel!'
        );
        return;
    }
    const deleteIdEl = document.getElementById('delete-user-id');
    if (deleteIdEl) deleteIdEl.value = id;
    document.getElementById('delete-user-error')?.classList.add('hidden');
    openModal(deleteUserModal);
}

document.getElementById('btn-cancel-delete-user').addEventListener('click', () => {
    closeModal(deleteUserModal);
});

document.getElementById('btn-confirm-delete-user').addEventListener('click', async (e) => {
    const btnSubmit = e.currentTarget;
    const id = document.getElementById('delete-user-id')?.value;
    const errEl = document.getElementById('delete-user-error');
    if (errEl) errEl.classList.add('hidden');

    setSubmitButtonState(btnSubmit, 'loading', { text: 'ĐANG XÓA...' });

    try {
        await ApiService.deleteUser(id);
        logToConsole(`User ${id} deleted successfully.`, 'success');
        setSubmitButtonState(btnSubmit, 'success', { text: 'ĐÃ XÓA!' });
        setTimeout(() => {
            closeModal(deleteUserModal);
            loadUsers(currentUsersPage);
            resetSubmitButtonState(btnSubmit);
        }, 800);
    } catch (err) {
        const errorMsg = err.response?.data?.message || err.message || 'Delete failed.';
        if (errEl) {
            errEl.innerText = errorMsg;
            errEl.classList.remove('hidden');
            logToConsole(`Delete user ${id} failed: ${errEl.innerText}`, 'error');
        }
        setSubmitButtonState(btnSubmit, 'error', { text: 'XÓA THẤT BẠI!' });
    }
});

// --- BEATMAPS SEARCH & LAZY LOADING ---
let globalBeatmapsList = [];
let adminBmNextCursor = null;
let adminBmHasMore = true;
let isAdminBmLoading = false;
let adminBmRenderStartIndex = 0;
const ADMIN_BM_MAX_VISIBLE = 20;
let adminBmSearchTerm = '';

const adminBmSearchInput = document.getElementById('admin-beatmaps-search');
if (adminBmSearchInput) {
    setupSearchClearButton('admin-beatmaps-search', 'admin-beatmaps-search-clear', () => {
        adminBmSearchTerm = '';
        loadBeatmaps();
    });
}

window.adminSelectedArtist = '';
window.adminSelectedGenre = '';
window.adminSelectedCopyright = '';

async function loadBeatmaps() {
    const tbody = document.getElementById('table-beatmaps-body');
    if (!tbody) return;
    try {
        const params = {};
        if (adminBmSearchTerm) params.search = adminBmSearchTerm;
        if (window.adminSelectedArtist) params.artist = window.adminSelectedArtist;
        if (window.adminSelectedGenre) params.genre = window.adminSelectedGenre;
        if (window.adminSelectedCopyright) params.copyright_status = window.adminSelectedCopyright;

        const res = await ApiService.getBeatmaps(params);

        let maps = [];
        maps = res.data?.data || res.data || [];

        if (!Array.isArray(maps)) throw new Error('Invalid beatmaps data format');

        // Lọc phía Client nếu Backend chưa trả về kết quả lọc chính xác
        if (window.adminSelectedArtist) {
            maps = maps.filter(m => m.artist && m.artist.toLowerCase() === window.adminSelectedArtist.toLowerCase());
        }
        if (window.adminSelectedGenre) {
            maps = maps.filter(m => m.genre && m.genre.toLowerCase() === window.adminSelectedGenre.toLowerCase());
        }
        if (window.adminSelectedCopyright) {
            maps = maps.filter(m => {
                const copyright = (m.copyright_status || '').toLowerCase();
                if (window.adminSelectedCopyright === 'free') {
                    return !copyright || copyright.includes('no') || copyright.includes('free') || copyright.includes('không');
                } else if (window.adminSelectedCopyright === 'claimed') {
                    return copyright && !copyright.includes('no') && !copyright.includes('free') && !copyright.includes('không');
                }
                return true;
            });
        }

        globalBeatmapsList = maps;
        tbody.innerHTML = '';

        if (res.data?.meta) {
            adminBmNextCursor = res.data.meta.next_cursor;
            adminBmHasMore = res.data.meta.has_more;
        } else {
            adminBmHasMore = false;
        }

        // Lưu filter_options từ API vào biến toàn cục để dropdown dùng
        // Chỉ cập nhật khi không có bộ lọc nào đang active, đảm bảo luôn
        // có danh sách đầy đủ từ DB (không bị thu hẹp bởi query đã lọc).
        if (
            res.data?.filter_options &&
            !adminBmSearchTerm &&
            !window.adminSelectedArtist &&
            !window.adminSelectedGenre &&
            !window.adminSelectedCopyright
        ) {
            window.adminApiFilterOptions = res.data.filter_options;
        }

        adminBmRenderStartIndex = 0;
        populateAdminFilterDropdowns();
        renderAdminBeatmapsTable();
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-red-400">${t('admin_failed_load')}</td></tr>`;
    }
}

async function loadMoreBeatmapsFromAPI() {
    if (isAdminBmLoading || !adminBmHasMore || !adminBmNextCursor) return;

    isAdminBmLoading = true;
    const btnLoadMore = document.getElementById('btn-load-more-beatmaps');
    if (btnLoadMore) btnLoadMore.innerText = t('admin_msg_loading');

    try {
        const params = { cursor: adminBmNextCursor };
        if (adminBmSearchTerm) params.search = adminBmSearchTerm;
        if (window.adminSelectedArtist) params.artist = window.adminSelectedArtist;
        if (window.adminSelectedGenre) params.genre = window.adminSelectedGenre;
        if (window.adminSelectedCopyright) params.copyright_status = window.adminSelectedCopyright;

        const res = await ApiService.getBeatmaps(params);
        let newMaps = res.data?.data || [];

        // Lọc phía Client nếu Backend chưa trả về kết quả lọc chính xác
        if (window.adminSelectedArtist) {
            newMaps = newMaps.filter(m => m.artist && m.artist.toLowerCase() === window.adminSelectedArtist.toLowerCase());
        }
        if (window.adminSelectedGenre) {
            newMaps = newMaps.filter(m => m.genre && m.genre.toLowerCase() === window.adminSelectedGenre.toLowerCase());
        }
        if (window.adminSelectedCopyright) {
            newMaps = newMaps.filter(m => {
                const copyright = (m.copyright_status || '').toLowerCase();
                if (window.adminSelectedCopyright === 'free') {
                    return !copyright || copyright.includes('no') || copyright.includes('free') || copyright.includes('không');
                } else if (window.adminSelectedCopyright === 'claimed') {
                    return copyright && !copyright.includes('no') && !copyright.includes('free') && !copyright.includes('không');
                }
                return true;
            });
        }

        if (res.data?.meta) {
            adminBmNextCursor = res.data.meta.next_cursor;
            adminBmHasMore = res.data.meta.has_more;
        } else {
            adminBmHasMore = false;
        }

        globalBeatmapsList.push(...newMaps);
        isAdminBmLoading = false;

        // Cửa sổ trượt đi xuống dưới cùng
        if (globalBeatmapsList.length > ADMIN_BM_MAX_VISIBLE) {
            adminBmRenderStartIndex = globalBeatmapsList.length - ADMIN_BM_MAX_VISIBLE;
        } else {
            adminBmRenderStartIndex = 0;
        }

        renderAdminBeatmapsTable();
    } catch (error) {
        isAdminBmLoading = false;
        if (btnLoadMore) btnLoadMore.innerText = t('admin_msg_error_retry');
    }
}

/**
 * Khởi tạo custom searchable dropdown (dùng chung cho admin và game).
 * Xem song-selector.js để biết chi tiết về tham số.
 */
function initSearchableFilterDropdown(cfg) {
    const btn      = document.getElementById(cfg.btnId);
    const dropdown = document.getElementById(cfg.dropdownId);
    const searchEl = document.getElementById(cfg.searchId);
    const listEl   = document.getElementById(cfg.listId);
    const hidden   = document.getElementById(cfg.hiddenId);
    const labelEl  = document.getElementById(cfg.labelId);
    if (!btn || !dropdown || !searchEl || !listEl || !hidden || !labelEl) return;

    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = !dropdown.classList.contains('hidden');
        document.querySelectorAll('.searchable-filter-dropdown').forEach(d => d.classList.add('hidden'));
        if (!isOpen) {
            dropdown.classList.remove('hidden');
            searchEl.value = '';
            searchEl.focus();
            renderList('');
        }
    });

    searchEl.addEventListener('input', () => renderList(searchEl.value));

    document.addEventListener('click', (e) => {
        if (!btn.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.add('hidden');
        }
    });

    dropdown.classList.add('searchable-filter-dropdown');

    function renderList(query) {
        const q = query.toLowerCase().trim();
        const items = hidden.dataset.allItems ? JSON.parse(hidden.dataset.allItems) : [];
        const filtered = q ? items.filter(v => v.toLowerCase().includes(q)) : items;

        listEl.innerHTML = '';
        const allItem = document.createElement('div');
        allItem.className = `px-2.5 py-1.5 text-xs font-orbitron cursor-pointer transition-colors ${!hidden.value ? 'text-cyan-400 bg-cyan-950/50' : 'text-gray-400 hover:text-white hover:bg-cyan-950/30'}`;
        allItem.textContent = cfg.allLabel;
        allItem.addEventListener('click', () => select('', cfg.allLabel));
        listEl.appendChild(allItem);

        if (filtered.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'px-2.5 py-2 text-xs text-gray-600 font-orbitron text-center';
            empty.textContent = 'Không tìm thấy';
            listEl.appendChild(empty);
            return;
        }
        filtered.forEach(val => {
            const item = document.createElement('div');
            const isActive = hidden.value === val;
            item.className = `px-2.5 py-1.5 text-xs font-orbitron cursor-pointer transition-colors truncate ${isActive ? 'text-cyan-400 bg-cyan-950/50' : 'text-gray-300 hover:text-white hover:bg-cyan-950/30'}`;
            item.textContent = val.toUpperCase();
            item.title = val;
            item.addEventListener('click', () => select(val, val));
            listEl.appendChild(item);
        });
    }

    function select(value, display) {
        hidden.value = value;
        labelEl.textContent = value ? value.toUpperCase() : cfg.allLabel;
        dropdown.classList.add('hidden');
        if (typeof cfg.onSelect === 'function') cfg.onSelect(value);
    }

    btn._updateItems = function(items) {
        hidden.dataset.allItems = JSON.stringify(items);
        renderList(searchEl.value);
    };
    btn._getValue = () => hidden.value;
    btn._setValue = (v) => {
        hidden.value = v;
        labelEl.textContent = v ? v.toUpperCase() : cfg.allLabel;
    };
}

let _adminFilterArtistInited = false;
let _adminFilterGenreInited  = false;

function populateAdminFilterDropdowns() {
    let artists, genres;

    // Ưu tiên dùng filter_options từ API (toàn bộ DB) nếu có
    if (window.adminApiFilterOptions) {
        artists = (window.adminApiFilterOptions.artists || []).filter(a => a && a !== 'Unknown').map(a => a.trim()).sort();
        genres  = (window.adminApiFilterOptions.genres  || []).filter(g => g).map(g => g.trim()).sort();
    } else {
        // Fallback: scan local globalBeatmapsList (chưa có dữ liệu API)
        const artistSet = new Set();
        const genreSet  = new Set();
        globalBeatmapsList.forEach(m => {
            if (m.artist && m.artist !== 'Unknown') artistSet.add(m.artist.trim());
            if (m.genre) genreSet.add(m.genre.trim());
        });
        artists = Array.from(artistSet).sort();
        genres  = Array.from(genreSet).sort();
    }

    // Khởi tạo dropdown lần đầu
    if (!_adminFilterArtistInited) {
        _adminFilterArtistInited = true;
        if (typeof initSearchableFilterDropdown === 'function') {
            initSearchableFilterDropdown({
                btnId:      'admin-filter-artist-btn',
                dropdownId: 'admin-filter-artist-dropdown',
                searchId:   'admin-filter-artist-search',
                listId:     'admin-filter-artist-list',
                hiddenId:   'admin-filter-artist',
                labelId:    'admin-filter-artist-label',
                allLabel:   'TẤT CẢ CA SĨ',
                onSelect: (value) => {
                    window.adminSelectedArtist = value;
                    loadBeatmaps();
                }
            });
        }
    }
    if (!_adminFilterGenreInited) {
        _adminFilterGenreInited = true;
        if (typeof initSearchableFilterDropdown === 'function') {
            initSearchableFilterDropdown({
                btnId:      'admin-filter-genre-btn',
                dropdownId: 'admin-filter-genre-dropdown',
                searchId:   'admin-filter-genre-search',
                listId:     'admin-filter-genre-list',
                hiddenId:   'admin-filter-genre',
                labelId:    'admin-filter-genre-label',
                allLabel:   'TẤT CẢ THỂ LOẠI',
                onSelect: (value) => {
                    window.adminSelectedGenre = value;
                    loadBeatmaps();
                }
            });
        }
    }

    // Cập nhật danh sách items vào dropdown
    const artistBtn = document.getElementById('admin-filter-artist-btn');
    const genreBtn  = document.getElementById('admin-filter-genre-btn');
    if (artistBtn && artistBtn._updateItems) artistBtn._updateItems(artists);
    if (genreBtn  && genreBtn._updateItems)  genreBtn._updateItems(genres);
}

function loadPreviousBeatmapsFromMemory() {
    adminBmRenderStartIndex = Math.max(0, adminBmRenderStartIndex - ADMIN_BM_MAX_VISIBLE);
    renderAdminBeatmapsTable();
}

function loadNextBeatmapsFromMemory() {
    adminBmRenderStartIndex = Math.min(globalBeatmapsList.length - ADMIN_BM_MAX_VISIBLE, adminBmRenderStartIndex + ADMIN_BM_MAX_VISIBLE);
    renderAdminBeatmapsTable();
}

// --- SCORE BEATMAPS LOGIC ---
let adminScoreBmSearchTerm = '';
let adminScoreBmNextCursor = null;
let adminScoreBmHasMore = true;
let adminScoreBmList = [];
let isAdminScoreBmLoading = false;

const searchInputEl = document.getElementById('admin-score-search');
if (searchInputEl) {
    setupSearchClearButton('admin-score-search', 'admin-score-search-clear', () => {
        adminScoreBmSearchTerm = '';
        loadScoreBeatmaps();
    });
}

async function loadScoreBeatmaps() {
    const listEl = document.getElementById('admin-score-beatmaps-list');
    if (!listEl) return;

    listEl.innerHTML = `<div class="p-4 text-center text-cyan-400 font-orbitron animate-pulse text-xs">${t('admin_msg_searching')}</div>`;

    try {
        const params = {};
        if (adminScoreBmSearchTerm) params.search = adminScoreBmSearchTerm;

        const res = await ApiService.getBeatmaps(params);
        const maps = res.data?.data || res.data || [];

        if (res.data?.meta) {
            adminScoreBmNextCursor = res.data.meta.next_cursor;
            adminScoreBmHasMore = res.data.meta.has_more;
        } else {
            adminScoreBmHasMore = false;
        }

        adminScoreBmList = maps;
        renderAdminScoreBeatmaps();
    } catch (e) {
        listEl.innerHTML = `<div class="p-4 text-center text-red-400 text-xs">Lỗi tải dữ liệu</div>`;
    }
}

async function loadMoreScoreBeatmapsFromAPI() {
    if (isAdminScoreBmLoading || !adminScoreBmHasMore || !adminScoreBmNextCursor) return;
    isAdminScoreBmLoading = true;

    const btn = document.getElementById('admin-score-beatmaps-load-more');
    if (btn) btn.innerText = t('admin_msg_loading');

    try {
        const params = { cursor: adminScoreBmNextCursor };
        if (adminScoreBmSearchTerm) params.search = adminScoreBmSearchTerm;

        const res = await ApiService.getBeatmaps(params);
        const newMaps = res.data?.data || [];

        if (res.data?.meta) {
            adminScoreBmNextCursor = res.data.meta.next_cursor;
            adminScoreBmHasMore = res.data.meta.has_more;
        } else {
            adminScoreBmHasMore = false;
        }

        adminScoreBmList.push(...newMaps);
        isAdminScoreBmLoading = false;
        renderAdminScoreBeatmaps();
    } catch (e) {
        isAdminScoreBmLoading = false;
        if (btn) btn.innerText = t('admin_msg_error_retry');
    }
}

function renderAdminScoreBeatmaps() {
    const listEl = document.getElementById('admin-score-beatmaps-list');
    if (!listEl) return;

    listEl.innerHTML = '';
    adminScoreBmList.forEach(m => {
        const div = document.createElement('div');
        div.className = "p-2 rounded hover:bg-cyan-950/50 cursor-pointer border border-transparent hover:border-cyan-500/30 text-xs transition-all";
        if (currentScoreBeatmapId === m.id) div.classList.add('bg-cyan-900/50', 'border-cyan-500/50');
        div.innerHTML = `<div class="font-bold text-white truncate">${m.title || m.name}</div><div class="text-[10px] text-gray-400 truncate">${m.artist}</div>`;
        div.onclick = () => {
            document.querySelectorAll('#admin-score-beatmaps-list > div').forEach(el => el.classList.remove('bg-cyan-900/50', 'border-cyan-500/50'));
            div.classList.add('bg-cyan-900/50', 'border-cyan-500/50');
            loadTopScoresForBeatmap(m);
        };
        listEl.appendChild(div);
    });

    const oldLoadMoreBtn = document.getElementById('admin-score-beatmaps-load-more');
    if (oldLoadMoreBtn) oldLoadMoreBtn.remove();

    if (adminScoreBmHasMore) {
        const btn = document.createElement('button');
        btn.id = 'admin-score-beatmaps-load-more';
        btn.className = "w-full p-2 mt-2 bg-cyan-900/50 hover:bg-cyan-800 text-cyan-400 rounded text-xs font-bold font-orbitron border border-cyan-500/30 transition-all";
        btn.innerText = t('admin_btn_load_more_songs');
        btn.onclick = async () => {
            await loadMoreScoreBeatmapsFromAPI();
        };
        listEl.appendChild(btn);
    }
}

let currentScoreBeatmapId = null;
let adminScoreList = [];
let adminScoreNextCursor = null;
let adminScoreHasMore = true;
let isAdminScoreLoading = false;
let adminScoreRenderStartIndex = 0;
const ADMIN_SCORE_MAX_VISIBLE = 20;
window.adminScoreSelectedMode = 'default';

async function loadTopScoresForBeatmap(beatmap) {
    currentScoreBeatmapId = beatmap.id;
    const scoreTitleEl = document.getElementById('admin-score-selected-title');
    if (scoreTitleEl) scoreTitleEl.innerText = `Scores: ${beatmap.title || beatmap.name}`;
    
    document.getElementById('admin-score-empty')?.classList.add('hidden');
    document.getElementById('admin-score-table')?.classList.remove('hidden');
    document.getElementById('admin-score-refresh-btn')?.classList.remove('hidden');

    adminScoreNextCursor = null;
    adminScoreHasMore = true;
    adminScoreRenderStartIndex = 0;
    adminScoreList = [];

    await fetchScoresFromAPI();
}

async function fetchScoresFromAPI(loadMore = false) {
    if (isAdminScoreLoading || (!loadMore && !adminScoreHasMore) || (loadMore && !adminScoreHasMore)) return;

    isAdminScoreLoading = true;
    const loading = document.getElementById('admin-score-loading');
    const btnLoadMore = document.getElementById('btn-load-more-scores');

    if (!loadMore) {
        renderAdminScoresSkeleton();
    } else if (btnLoadMore) {
        btnLoadMore.innerText = t('admin_msg_loading');
    }

    try {
        const params = { beatmap_id: currentScoreBeatmapId };
        if (loadMore && adminScoreNextCursor) {
            params.cursor = adminScoreNextCursor;
        }

        const res = await ApiService.getScores(params);
        const newScores = res.data?.data || res.data || [];

        if (res.data?.meta) {
            adminScoreNextCursor = res.data.meta.next_cursor;
            adminScoreHasMore = res.data.meta.has_more;
        } else {
            adminScoreHasMore = false;
        }

        if (loadMore) {
            adminScoreList.push(...newScores);
            if (adminScoreList.length > ADMIN_SCORE_MAX_VISIBLE) {
                adminScoreRenderStartIndex = adminScoreList.length - ADMIN_SCORE_MAX_VISIBLE;
            }
        } else {
            adminScoreList = newScores;
            adminScoreRenderStartIndex = 0;
        }

        renderAdminScoresTable();
    } catch (e) {
        const tbody = document.getElementById('admin-score-table-body');
        if (!loadMore && tbody) {
            tbody.innerHTML = `<tr><td colspan="5" class="py-4 text-center text-red-400">Lỗi tải dữ liệu.</td></tr>`;
        }
        if (btnLoadMore) btnLoadMore.innerText = t('admin_msg_error_retry');
    } finally {
        isAdminScoreLoading = false;
        loading?.classList.add('hidden');
    }
}

async function loadMoreScoresFromAPI() {
    await fetchScoresFromAPI(true);
}

function loadPreviousScoresFromMemory() {
    adminScoreRenderStartIndex = Math.max(0, adminScoreRenderStartIndex - ADMIN_SCORE_MAX_VISIBLE);
    renderAdminScoresTable();
}

function loadNextScoresFromMemory() {
    adminScoreRenderStartIndex = Math.min(adminScoreList.length - ADMIN_SCORE_MAX_VISIBLE, adminScoreList.length);
    renderAdminScoresTable();
}

function renderAdminScoresSkeleton() {
    const tbody = document.getElementById('admin-score-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    for (let i = 0; i < 5; i++) {
        tbody.innerHTML += `
            <tr class="hover:bg-cyan-950/10 transition-colors">
                <td class="py-3 px-2 w-12"><div class="skeleton-item w-8 h-4"></div></td>
                <td class="py-3 px-2"><div class="skeleton-item w-28 h-4"></div></td>
                <td class="py-3 px-2 text-right"><div class="skeleton-item w-20 h-4"></div></td>
                <td class="py-3 px-2 text-right"><div class="skeleton-item w-24 h-4"></div></td>
                <td class="py-3 px-2 text-right"><div class="skeleton-item w-6 h-4"></div></td>
            </tr>
        `;
    }
}

function renderAdminScoresTable() {
    const tbody = document.getElementById('admin-score-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (adminScoreList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="py-4 text-center text-gray-500">Chưa có điểm nào được ghi nhận.</td></tr>`;
        document.getElementById('admin-score-load-prev-container')?.classList.add('hidden');
        document.getElementById('admin-score-load-more-container')?.classList.add('hidden');
        return;
    }

    const mode = window.adminScoreSelectedMode || 'default';

    // Sắp xếp điểm số theo tab đang chọn
    let sortedScores = [...adminScoreList];
    if (mode === 'easy') {
        sortedScores.sort((a, b) => (b.easy_mode_score ?? 0) - (a.easy_mode_score ?? 0));
    } else if (mode === 'rage') {
        sortedScores.sort((a, b) => (b.hard_mode_score ?? 0) - (a.hard_mode_score ?? 0));
    } else if (mode === 'asian') {
        sortedScores.sort((a, b) => (b.asian_mode_score ?? 0) - (a.asian_mode_score ?? 0));
    } else {
        sortedScores.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    }

    const endIndex = Math.min(adminScoreRenderStartIndex + ADMIN_SCORE_MAX_VISIBLE, sortedScores.length);
    const visibleScores = sortedScores.slice(adminScoreRenderStartIndex, endIndex);

    visibleScores.forEach((s, index) => {
        const absoluteIndex = adminScoreRenderStartIndex + index;
        
        let scoreDisplay;
        if (mode === 'easy') {
            scoreDisplay = `<span class="text-green-400 font-bold" title="Easy Score">${formatScoreDisplay(s.easy_mode_score ?? 0)}</span>`;
        } else if (mode === 'rage') {
            scoreDisplay = `<span class="text-orange-400 font-bold" title="Rage Score">${formatScoreDisplay(s.hard_mode_score ?? 0)}</span>`;
        } else if (mode === 'asian') {
            scoreDisplay = `<span class="text-red-400 font-bold" title="Asian Score">${formatScoreDisplay(s.asian_mode_score ?? 0)}</span>`;
        } else {
            scoreDisplay = `<span class="text-pink-400 font-bold" title="Normal Score">${formatScoreDisplay(s.score ?? 0)}</span>`;
        }

        tbody.innerHTML += `<tr class="hover:bg-cyan-950/20 transition-colors"><td class="py-3 px-2 text-cyan-400 font-bold w-12">#${absoluteIndex + 1}</td><td class="py-3 px-2 font-bold text-white">${s.user?.realname || s.user?.username || 'Unknown'}</td><td class="py-3 px-2 text-right font-orbitron font-bold">${scoreDisplay}</td><td class="py-3 px-2 text-right text-xs text-gray-500">${new Date(s.created_at).toLocaleDateString()}</td><td class="py-3 px-2 text-right"><button class="text-red-400 hover:text-red-300 btn-delete-score" data-id="${s.id}" title="Delete"><svg class="w-4 h-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button></td></tr>`;
    });

    document.querySelectorAll('.btn-delete-score').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            openDeleteScoreModal(id);
        });
    });

    const topContainer = document.getElementById('admin-score-load-prev-container');
    const btnLoadPrev = document.getElementById('btn-load-prev-scores');
    if (adminScoreRenderStartIndex > 0) {
        topContainer?.classList.remove('hidden');
        if (btnLoadPrev) btnLoadPrev.innerText = t('admin_btn_load_prev_hidden').replace('{count}', adminScoreRenderStartIndex);
    } else {
        topContainer?.classList.add('hidden');
    }

    let bottomContainer = document.getElementById('admin-score-load-more-container');
    const btnLoadMore = document.getElementById('btn-load-more-scores');
    if (btnLoadMore) {
        const newBtnLoadMore = btnLoadMore.cloneNode(true);
        btnLoadMore.parentNode.replaceChild(newBtnLoadMore, btnLoadMore);

        if (endIndex < sortedScores.length) {
            bottomContainer?.classList.remove('hidden');
            const hiddenCount = sortedScores.length - endIndex;
            newBtnLoadMore.innerText = t('admin_btn_load_next_hidden').replace('{count}', hiddenCount);
            newBtnLoadMore.addEventListener('click', loadNextScoresFromMemory);
        } else if (adminScoreHasMore) {
            bottomContainer?.classList.remove('hidden');
            newBtnLoadMore.innerText = t('admin_btn_load_more_data');
            newBtnLoadMore.addEventListener('click', loadMoreScoresFromAPI);
        } else {
            bottomContainer?.classList.add('hidden');
        }
    }
}

document.getElementById('btn-load-prev-scores')?.addEventListener('click', loadPreviousScoresFromMemory);

const scoreRefreshBtn = document.getElementById('admin-score-refresh-btn');
if (scoreRefreshBtn) scoreRefreshBtn.addEventListener('click', () => { if (currentScoreBeatmapId) { const map = globalBeatmapsList.find(m => m.id === currentScoreBeatmapId); if (map) loadTopScoresForBeatmap(map); } });

function renderAdminBeatmapsTable() {
    const tbody = document.getElementById('table-beatmaps-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    const endIndex = Math.min(adminBmRenderStartIndex + ADMIN_BM_MAX_VISIBLE, globalBeatmapsList.length);
    const visibleMaps = globalBeatmapsList.slice(adminBmRenderStartIndex, endIndex);

    visibleMaps.forEach((m, index) => {
        const absoluteIndex = adminBmRenderStartIndex + index;
        const statusClass = m.is_available ? 'text-green-400' : 'text-gray-500';
        const statusText = m.is_available ? t('admin_status_active') : t('admin_status_hidden');
        tbody.innerHTML += `
                    <tr class="hover:bg-cyan-950/30 transition-colors">
                        <td class="p-4 border-b border-cyan-500/10">${absoluteIndex + 1}</td>
                        <td class="p-4 border-b border-cyan-500/10 font-bold text-white">${m.title || m.name || 'Untitled'}</td>
                        <td class="p-4 border-b border-cyan-500/10 text-gray-400">${m.artist}</td>
                        <td class="p-4 border-b border-cyan-500/10 ${statusClass}">${statusText}</td>
                        <td class="p-4 border-b border-cyan-500/10 text-right space-x-3">
                            <button class="text-cyan-400 hover:text-cyan-300 btn-edit-beatmap inline-block align-middle hover:scale-110 transition-transform" data-id="${m.id}" title="${t('admin_action_edit') || 'Edit'}">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                                </svg>
                            </button>
                            <button class="text-yellow-400 hover:text-yellow-300 btn-export-beatmap inline-block align-middle hover:scale-110 transition-transform" data-id="${m.id}" title="${t('admin_action_export_json') || 'Export JSON'}">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                                </svg>
                            </button>
                            <button class="text-red-400 hover:text-red-300 btn-delete-beatmap inline-block align-middle hover:scale-110 transition-transform" data-id="${m.id}" title="${t('admin_action_delete') || 'Delete'}">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                </svg>
                            </button>
                        </td>
                    </tr>
                `;
    });

    // Gắn sự kiện sửa/xóa/export cho Beatmap
    document.querySelectorAll('.btn-edit-beatmap').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-id');
            if (id) {
                openEditBeatmapModal(id);
            }
        });
    });

    document.querySelectorAll('.btn-export-beatmap').forEach(btn => {
        btn.addEventListener('click', () => {
            exportBeatmapAsJson(btn.getAttribute('data-id'));
        });
    });

    document.querySelectorAll('.btn-delete-beatmap').forEach(btn => {
        btn.addEventListener('click', () => {
            openDeleteBeatmapModal(btn.getAttribute('data-id'));
        });
    });

    // Nút tải phần trước (Hiển thị ở đầu)
    const topContainer = document.getElementById('admin-beatmap-load-prev-container');
    const btnLoadPrev = document.getElementById('btn-load-prev-beatmaps');
    if (adminBmRenderStartIndex > 0) {
        topContainer?.classList.remove('hidden');
        if (btnLoadPrev) btnLoadPrev.innerText = t('admin_btn_load_prev_hidden').replace('{count}', adminBmRenderStartIndex);
    } else {
        topContainer?.classList.add('hidden');
    }

    // Nút tải phần tiếp theo (Hiển thị ở cuối)
    let bottomContainer = document.getElementById('admin-beatmap-load-more-container');
    const btnLoadMore = document.getElementById('btn-load-more-beatmaps');
    if (btnLoadMore) {
        const newBtnLoadMore = btnLoadMore.cloneNode(true);
        btnLoadMore.parentNode.replaceChild(newBtnLoadMore, btnLoadMore);

        if (endIndex < globalBeatmapsList.length) {
            bottomContainer?.classList.remove('hidden');
            const hiddenCount = globalBeatmapsList.length - endIndex;
            newBtnLoadMore.innerText = t('admin_btn_load_next_hidden').replace('{count}', hiddenCount);
            newBtnLoadMore.addEventListener('click', loadNextBeatmapsFromMemory);
        } else if (adminBmHasMore) {
            bottomContainer?.classList.remove('hidden');
            newBtnLoadMore.innerText = t('admin_btn_load_more_data');
            newBtnLoadMore.addEventListener('click', loadMoreBeatmapsFromAPI);
        } else {
            bottomContainer?.classList.add('hidden');
        }
    }
}

document.getElementById('btn-load-prev-beatmaps')?.addEventListener('click', loadPreviousBeatmapsFromMemory);

function exportBeatmapAsJson(beatmapId) {
    const beatmap = globalBeatmapsList.find(m => m.id == beatmapId);
    if (!beatmap) {
        logToConsole(`Beatmap with ID ${beatmapId} not found for export.`, 'error');
        return;
    }

    const exportData = {
        name: beatmap.title || beatmap.name,
        artist: beatmap.artist,
        song: beatmap.url || beatmap.file_url,
        beats: beatmap.beats,
        bpm: beatmap.bpm,
        speed: beatmap.speed,
        genre: beatmap.genre,
    };

    Object.keys(exportData).forEach(key => (exportData[key] === undefined || exportData[key] === null) && delete exportData[key]);

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');

    const fileName = (beatmap.title || beatmap.name || 'beatmap').replace(/[^a-z0-9_ \-]/gi, '_');
    a.href = url;
    a.download = `${fileName}.json`;
    document.body.appendChild(a);
    a.click();

    setTimeout(() => { document.body.removeChild(a); window.URL.revokeObjectURL(url); }, 100);
    logToConsole(`Exported ${fileName}.json`, 'success');
}

// --- XUẤT TẤT CẢ JSON / LƯU ZIP NẾU > 1 BEATMAP ---
async function loadJsZip() {
    if (window.JSZip) return window.JSZip;
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
        script.onload = () => resolve(window.JSZip);
        script.onerror = () => reject(new Error('Không thể tải thư viện JSZip từ CDN.'));
        document.head.appendChild(script);
    });
}

async function exportAllBeatmapsAsJson() {
    if (!globalBeatmapsList || globalBeatmapsList.length === 0) {
        logToConsole(`Không có beatmap nào trong danh sách để xuất.`, 'error');
        return;
    }

    // Nếu chỉ có 1 beatmap trong danh sách, thực hiện tải file JSON đơn lẻ
    if (globalBeatmapsList.length === 1) {
        exportBeatmapAsJson(globalBeatmapsList[0].id);
        return;
    }

    logToConsole(`Đang chuẩn bị nén và xuất ${globalBeatmapsList.length} beatmaps...`, 'warning');

    try {
        const JSZipLib = await loadJsZip();
        const zip = new JSZipLib();
        const usedNames = {};

        globalBeatmapsList.forEach(beatmap => {
            const exportData = {
                name: beatmap.title || beatmap.name,
                artist: beatmap.artist,
                song: beatmap.url || beatmap.file_url,
                beats: beatmap.beats,
                bpm: beatmap.bpm,
                speed: beatmap.speed,
                genre: beatmap.genre,
            };

            Object.keys(exportData).forEach(key => (exportData[key] === undefined || exportData[key] === null) && delete exportData[key]);

            const jsonString = JSON.stringify(exportData, null, 2);
            let fileName = (beatmap.title || beatmap.name || 'beatmap').replace(/[^a-z0-9_ \-]/gi, '_');

            // Tránh trùng tên tệp trong tệp ZIP
            if (usedNames[fileName]) {
                usedNames[fileName]++;
                fileName = `${fileName}_(${usedNames[fileName]})`;
            } else {
                usedNames[fileName] = 1;
            }

            zip.file(`${fileName}.json`, jsonString);
        });

        const content = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');

        const dateStr = new Date().toISOString().slice(0, 10);
        a.href = url;
        a.download = `all_beatmaps_${dateStr}.zip`;
        document.body.appendChild(a);
        a.click();

        setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, 100);

        logToConsole(`Xuất thành công ${globalBeatmapsList.length} beatmaps vào file ZIP.`, 'success');
    } catch (err) {
        logToConsole(`Xuất hàng loạt thất bại: ${err.message}`, 'error');
    }
}

function attachBeatmapEvents() {
    document.querySelectorAll('.btn-edit-beatmap').forEach(btn => {
        btn.addEventListener('click', (e) => {
            openEditBeatmapModal(e.target.getAttribute('data-id'));
        });
    });
    document.querySelectorAll('.btn-export-beatmap').forEach(btn => {
        btn.addEventListener('click', (e) => {
            exportBeatmapAsJson(e.target.getAttribute('data-id'));
        });
    });
    document.querySelectorAll('.btn-delete-beatmap').forEach(btn => {
        btn.addEventListener('click', (e) => {
            openDeleteBeatmapModal(e.target.getAttribute('data-id'));
        });
    });
}

// --- BEATMAP CRUD LOGIC ---
function getValidBeatsArray(beatsStr) {
    if (!beatsStr || !beatsStr.trim()) throw new Error("Dữ liệu Beats không được để trống.");
    let parsed;
    try { parsed = JSON.parse(beatsStr); }
    catch (e) { throw new Error("Sai định dạng JSON (Beats phải là một mảng)."); }
    if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error("Dữ liệu Beats phải là một mảng số không rỗng.");
    }
    return parsed.map(Number).filter(n => !isNaN(n) && n >= 0).sort((a, b) => a - b);
}

const addBmModal = document.getElementById('admin-beatmap-add-modal');
const editBmModal = document.getElementById('admin-beatmap-edit-modal');
const deleteBmModal = document.getElementById('admin-beatmap-delete-modal');
const importBmModal = document.getElementById('admin-beatmap-import-modal');

document.getElementById('btn-add-beatmap')?.addEventListener('click', () => {
    document.getElementById('admin-beatmap-add-form')?.reset();
    const addBmAvail = document.getElementById('add-bm-available');
    if (addBmAvail) addBmAvail.checked = true;
    document.getElementById('add-bm-error')?.classList.add('hidden');
    openModal(addBmModal);
});
document.getElementById('btn-close-add-beatmap')?.addEventListener('click', () => closeModal(addBmModal));

document.getElementById('btn-import-beatmap')?.addEventListener('click', () => {
    document.getElementById('admin-beatmap-import-form')?.reset();
    document.getElementById('import-bm-error')?.classList.add('hidden');
    openModal(importBmModal);
});
document.getElementById('btn-close-import-beatmap')?.addEventListener('click', () => closeModal(importBmModal));

// --- HÀNG CHỜ UPLOAD JSON TỪ TỆP ---
let importQueue = [];
let isImporting = false;

const importBmFile = document.getElementById('import-bm-file');
if (importBmFile) {
    importBmFile?.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        files.forEach(file => {
            importQueue.push(file);
        });
        renderImportQueue();
        e.target.value = ''; // Reset input
    });
}

function renderImportQueue() {
    const queueContainer = document.getElementById('import-bm-queue');
    if (!queueContainer) return;
    queueContainer.innerHTML = '';
    importQueue.forEach((file, index) => {
        const li = document.createElement('li');
        li.className = 'text-xs text-cyan-300 py-1.5 px-2 bg-cyan-950/40 border border-cyan-500/20 rounded mt-1 flex justify-between items-center';
        li.innerHTML = `
            <span class="truncate pr-2">${file.name}</span>
            <button type="button" class="text-red-400 hover:text-red-300 shrink-0" onclick="removeFromImportQueue(${index})">Xóa</button>
        `;
        queueContainer.appendChild(li);
    });
}

window.removeFromImportQueue = function (index) {
    importQueue.splice(index, 1);
    renderImportQueue();
};

async function processImportQueue() {
    let successCount = 0;
    let failCount = 0;
    const errEl = document.getElementById('import-bm-error');

    while (importQueue.length > 0) {
        const file = importQueue[0];
        try {
            const jsonString = await file.text();
            const data = JSON.parse(jsonString);
            await ApiService.importBeatmapJson(data);
            logToConsole(`Beatmap ${file.name} imported successfully.`, 'success');
            successCount++;
        } catch (err) {
            logToConsole(`Import ${file.name} failed: ${err.response?.data?.message || err.message}`, 'error');
            failCount++;
        }
        importQueue.shift();
        renderImportQueue();
    }

    if (failCount > 0) {
        if (errEl) {
            errEl.innerText = `Hoàn tất: ${successCount} thành công, ${failCount} thất bại. (Xem Console log)`;
            errEl.classList.remove('hidden');
        }
    } else {
        closeModal(importBmModal);
    }
    loadBeatmaps();
}

document.getElementById('admin-beatmap-import-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (isImporting) return;
    const btnSubmit = e.target.querySelector('button[type="submit"]');
    const errEl = document.getElementById('import-bm-error');
    errEl?.classList.add('hidden');

    const jsonInput = document.getElementById('import-bm-json');
    const jsonString = jsonInput ? jsonInput.value.trim() : '';

    if (!jsonString && importQueue.length === 0) {
        if (errEl) {
            errEl.innerText = 'Vui lòng nhập chuỗi JSON hoặc chọn file.';
            errEl.classList.remove('hidden');
        }
        setSubmitButtonState(btnSubmit, 'error', { text: 'THIẾU DỮ LIỆU!' });
        return;
    }

    try {
        isImporting = true;
        setSubmitButtonState(btnSubmit, 'loading', { text: 'ĐANG NẠP JSON...' });

        if (jsonString) {
            const data = JSON.parse(jsonString);
            await ApiService.importBeatmapJson(data);
            logToConsole(`Beatmap imported from text successfully.`, 'success');
            if (jsonInput) jsonInput.value = '';
        }

        if (importQueue.length > 0) {
            await processImportQueue();
        } else if (jsonString) {
            setSubmitButtonState(btnSubmit, 'success', { text: 'NẠP THÀNH CÔNG!' });
            setTimeout(() => {
                closeModal(importBmModal);
                loadBeatmaps();
                resetSubmitButtonState(btnSubmit);
            }, 800);
        }

        isImporting = false;
    } catch (err) {
        isImporting = false;
        const errorMsg = err.response?.data?.message || err.message || 'Import thất bại. Kiểm tra lại JSON.';
        if (errEl) {
            errEl.innerText = errorMsg;
            errEl.classList.remove('hidden');
        }
        setSubmitButtonState(btnSubmit, 'error', { text: 'NẠP THẤT BẠI!' });
    }
});

document.getElementById('admin-beatmap-add-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btnSubmit = e.target.querySelector('button[type="submit"]');
    const errEl = document.getElementById('add-bm-error');
    if (errEl) errEl.classList.add('hidden');
    try {
        const name = document.getElementById('add-bm-name')?.value.trim();
        const artist = document.getElementById('add-bm-artist')?.value.trim();
        const url = document.getElementById('add-bm-url')?.value.trim();
        if (!name || !artist || !url) throw new Error("Vui lòng điền đủ Tên, Nghệ sĩ và URL.");
        const beats = getValidBeatsArray(document.getElementById('add-bm-beats')?.value);

        const data = {
            title: name,
            name: name,
            artist,
            file_url: url,
            url: url,
            beats,
            genre: document.getElementById('add-bm-genre')?.value,
            bpm: parseFloat(document.getElementById('add-bm-bpm')?.value) || 120,
            speed: parseFloat(document.getElementById('add-bm-speed')?.value) || 0,
            copyright_status: document.getElementById('add-bm-copyright')?.value,
            warning_alert: document.getElementById('add-bm-warning')?.value,
            is_available: document.getElementById('add-bm-available')?.checked ? 1 : 0,
            no_fake_block: document.getElementById('add-bm-nofake')?.checked ? 1 : 0,
            day_show: document.getElementById('add-bm-day-show')?.value || null,
            day_hide: document.getElementById('add-bm-day-hide')?.value || null
        };

        setSubmitButtonState(btnSubmit, 'loading', { text: 'ĐANG TẠO...' });
        await ApiService.createBeatmap(data);
        logToConsole(`Beatmap "${data.name}" created.`, 'success');
        setSubmitButtonState(btnSubmit, 'success', { text: 'ĐÃ THÊM!' });
        setTimeout(() => {
            closeModal(addBmModal);
            loadBeatmaps();
            resetSubmitButtonState(btnSubmit);
        }, 800);
    } catch (err) {
        const errorMsg = err.response?.data?.message || err.message || 'Tạo thất bại.';
        if (errEl) {
            errEl.innerText = errorMsg;
            errEl.classList.remove('hidden');
        }
        setSubmitButtonState(btnSubmit, 'error', { text: 'TẠO THẤT BẠI!' });
    }
});

function openEditBeatmapModal(id) {
    const bm = globalBeatmapsList.find(m => m.id == id);
    if (!bm) return;
    
    const editBmIdEl = document.getElementById('edit-bm-id');
    const editBmNameEl = document.getElementById('edit-bm-name');
    const editBmArtistEl = document.getElementById('edit-bm-artist');
    const editBmUrlEl = document.getElementById('edit-bm-url');
    const editBmGenreEl = document.getElementById('edit-bm-genre');
    const editBmBpmEl = document.getElementById('edit-bm-bpm');
    const editBmSpeedEl = document.getElementById('edit-bm-speed');
    const editBmCopyrightEl = document.getElementById('edit-bm-copyright');
    const editBmWarningEl = document.getElementById('edit-bm-warning');
    const editBmAvailableEl = document.getElementById('edit-bm-available');
    const editBmNofakeEl = document.getElementById('edit-bm-nofake');
    const editBmBeatsEl = document.getElementById('edit-bm-beats');

    if (editBmIdEl) editBmIdEl.value = bm.id;
    if (editBmNameEl) editBmNameEl.value = bm.title || bm.name || '';
    if (editBmArtistEl) editBmArtistEl.value = bm.artist || '';
    if (editBmUrlEl) editBmUrlEl.value = bm.url || bm.file_url || '';
    if (editBmGenreEl) editBmGenreEl.value = bm.genre || '';
    if (editBmBpmEl) editBmBpmEl.value = bm.bpm || 120;
    if (editBmSpeedEl) editBmSpeedEl.value = bm.speed || 0;
    if (editBmCopyrightEl) editBmCopyrightEl.value = bm.copyright_status || '';
    if (editBmWarningEl) editBmWarningEl.value = bm.warning_alert || '';
    if (editBmAvailableEl) editBmAvailableEl.checked = bm.is_available !== false;
    if (editBmNofakeEl) editBmNofakeEl.checked = !!bm.no_fake_block;
    if (editBmBeatsEl) editBmBeatsEl.value = JSON.stringify(bm.beats || []);
    const editBmDayShowEl = document.getElementById('edit-bm-day-show');
    const editBmDayHideEl = document.getElementById('edit-bm-day-hide');
    if (editBmDayShowEl) editBmDayShowEl.value = bm.day_show || bm.date_show || '';
    if (editBmDayHideEl) editBmDayHideEl.value = bm.day_hide || bm.time_hide || '';
    
    document.getElementById('edit-bm-error')?.classList.add('hidden');
    openModal(editBmModal);
}
document.getElementById('btn-close-edit-beatmap')?.addEventListener('click', () => closeModal(editBmModal));

document.getElementById('admin-beatmap-edit-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btnSubmit = e.target.querySelector('button[type="submit"]');
    const errEl = document.getElementById('edit-bm-error');
    if (errEl) errEl.classList.add('hidden');
    try {
        const id = document.getElementById('edit-bm-id')?.value;
        const beats = getValidBeatsArray(document.getElementById('edit-bm-beats')?.value);
        const data = {
            title: document.getElementById('edit-bm-name')?.value.trim(),
            name: document.getElementById('edit-bm-name')?.value.trim(),
            artist: document.getElementById('edit-bm-artist')?.value.trim(),
            file_url: document.getElementById('edit-bm-url')?.value.trim(),
            url: document.getElementById('edit-bm-url')?.value.trim(),
            beats,
            genre: document.getElementById('edit-bm-genre')?.value,
            bpm: parseFloat(document.getElementById('edit-bm-bpm')?.value) || 120,
            speed: parseFloat(document.getElementById('edit-bm-speed')?.value) || 0,
            copyright_status: document.getElementById('edit-bm-copyright').value,
            warning_alert: document.getElementById('edit-bm-warning').value,
            is_available: document.getElementById('edit-bm-available').checked ? 1 : 0,
            no_fake_block: document.getElementById('edit-bm-nofake')?.checked ? 1 : 0,
            day_show: document.getElementById('edit-bm-day-show')?.value || null,
            day_hide: document.getElementById('edit-bm-day-hide')?.value || null
        };
        setSubmitButtonState(btnSubmit, 'loading', { text: 'ĐANG LƯU...' });
        await ApiService.updateBeatmap(id, data);
        logToConsole(`Beatmap ${id} updated.`, 'success');
        setSubmitButtonState(btnSubmit, 'success', { text: 'ĐÃ LƯU!' });
        setTimeout(() => {
            closeModal(editBmModal);
            loadBeatmaps();
            resetSubmitButtonState(btnSubmit);
        }, 800);
    } catch (err) {
        const errorMsg = err.response?.data?.message || err.message || 'Cập nhật thất bại.';
        if (errEl) {
            errEl.innerText = errorMsg;
            errEl.classList.remove('hidden');
        }
        setSubmitButtonState(btnSubmit, 'error', { text: 'LƯU THẤT BẠI!' });
    }
});

function openDeleteBeatmapModal(id) {
    const deleteIdEl = document.getElementById('delete-bm-id');
    if (deleteIdEl) deleteIdEl.value = id;
    document.getElementById('delete-bm-error')?.classList.add('hidden');
    openModal(deleteBmModal);
}
document.getElementById('btn-cancel-delete-bm')?.addEventListener('click', () => closeModal(deleteBmModal));
document.getElementById('btn-confirm-delete-bm')?.addEventListener('click', async (e) => {
    const btnSubmit = e.currentTarget;
    const id = document.getElementById('delete-bm-id')?.value;
    const errEl = document.getElementById('delete-bm-error');
    if (errEl) errEl.classList.add('hidden');

    setSubmitButtonState(btnSubmit, 'loading', { text: 'ĐANG XÓA...' });

    try {
        await ApiService.deleteBeatmap(id);
        logToConsole(`Beatmap ${id} deleted.`, 'success');
        setSubmitButtonState(btnSubmit, 'success', { text: 'ĐÃ XÓA!' });
        setTimeout(() => {
            closeModal(deleteBmModal);
            loadBeatmaps();
            resetSubmitButtonState(btnSubmit);
        }, 800);
    } catch (err) {
        const errorMsg = err.response?.data?.message || err.message || 'Xóa thất bại.';
        if (errEl) {
            errEl.innerText = errorMsg;
            errEl.classList.remove('hidden');
        }
        setSubmitButtonState(btnSubmit, 'error', { text: 'XÓA THẤT BẠI!' });
    }
});

// --- SCORES CRUD LOGIC ---
const deleteScoreModal = document.getElementById('admin-score-delete-modal');

function openDeleteScoreModal(id) {
    const deleteIdEl = document.getElementById('delete-score-id');
    if (deleteIdEl) deleteIdEl.value = id;
    document.getElementById('delete-score-error')?.classList.add('hidden');
    openModal(deleteScoreModal);
}

document.getElementById('btn-cancel-delete-score')?.addEventListener('click', () => closeModal(deleteScoreModal));

document.getElementById('btn-confirm-delete-score')?.addEventListener('click', async (e) => {
    const btnSubmit = e.currentTarget;
    const id = document.getElementById('delete-score-id')?.value;
    const errEl = document.getElementById('delete-score-error');
    if (errEl) errEl.classList.add('hidden');

    setSubmitButtonState(btnSubmit, 'loading', { text: 'ĐANG XÓA...' });

    try {
        await ApiService.deleteScore(id);
        logToConsole(`Score ${id} deleted.`, 'success');
        setSubmitButtonState(btnSubmit, 'success', { text: 'ĐÃ XÓA!' });
        setTimeout(() => {
            closeModal(deleteScoreModal);
            const map = globalBeatmapsList.find(m => m.id === currentScoreBeatmapId);
            if (map) loadTopScoresForBeatmap(map);
            resetSubmitButtonState(btnSubmit);
        }, 800);
    } catch (err) {
        const errorMsg = err.response?.data?.message || err.message || 'Xóa thất bại.';
        if (errEl) {
            errEl.innerText = errorMsg;
            errEl.classList.remove('hidden');
        }
        setSubmitButtonState(btnSubmit, 'error', { text: 'XÓA THẤT BẠI!' });
    }
});

// ============================================================
//  Hệ thống Chat Hỗ trợ Khách hàng - Admin Panel (Hỗ trợ Ảnh & Xóa)
// --- HỆ THỐNG CHAT HỖ TRỢ KHÁCH HÀNG - ADMIN PANEL (HỖ TRỢ ẢNH & XÓA) ---

// Nạp danh sách các phòng hỗ trợ của người dùng kèm phân lọc
async function loadAdminChatPaneRooms() {
    const listEl = document.getElementById('admin-chat-rooms-list');
    if (!listEl) return;

    try {
        const params = {};
        if (adminChatFilterStatus !== 'all') {
            params.status = adminChatFilterStatus;
        }

        const res = await ApiService.getAdminChatRooms(params);
        const rooms = res.data?.data || res.data || [];

        if (rooms.length === 0) {
            listEl.innerHTML = `<p class="text-center text-gray-500 py-6 font-orbitron text-xs">Không có yêu cầu hỗ trợ nào.</p>`;
            return;
        }

        listEl.innerHTML = '';
        rooms.forEach(room => {
            const div = document.createElement('div');
            const isActive = currentAdminActiveRoomId === room.id;

            const statusStyles = {
                'pending': 'bg-yellow-950/40 text-yellow-500 border-yellow-500/30',
                'open': 'bg-green-950/40 text-green-500 border-green-500/30',
                'resolved': 'bg-blue-950/40 text-blue-400 border-blue-500/30',
                'closed': 'bg-zinc-800 text-gray-500 border-zinc-700'
            };
            const statusStyle = statusStyles[room.status] || 'bg-zinc-800 text-gray-400 border-zinc-700';

            div.className = `p-2.5 rounded-lg cursor-pointer border transition-all text-left group flex flex-col gap-1 ${
                isActive 
                ? 'bg-cyan-900/40 border-cyan-500/60 shadow-[0_0_8px_rgba(6,182,212,0.2)]' 
                : 'bg-black/60 border-pink-500/10 hover:border-pink-500/40'
            }`;

            div.innerHTML = `
                <div class="flex justify-between items-center gap-2">
                    <span class="text-[8px] px-1 py-0.2 rounded border ${statusStyle} font-orbitron uppercase shrink-0">${room.status}</span>
                    <div class="flex items-center gap-1.5 shrink-0">
                        <span class="text-[10px] text-gray-500 font-orbitron text-right">${new Date(room.updated_at || Date.now()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        <button class="btn-delete-chatroom text-[10px] text-red-500/60 hover:text-red-400 hover:scale-110 transition-all font-bold px-1" data-room-id="${room.id}" title="Xóa phòng chat này">🗑️</button>
                    </div>
                </div>
                <div class="truncate">
                    <p class="font-bold text-gray-300 group-hover:text-cyan-400 transition-colors font-orbitron truncate text-[11px]">${room.title || 'Phòng hỗ trợ'}</p>
                    <p class="text-[10px] text-gray-500 truncate mt-0.5">${room.latest_message?.message || 'Chưa có tin nhắn...'}</p>
                </div>
            `;

            // Thay thế div.onclick cũ bằng addEventListener hỗ trợ event propagation để ngăn xung đột khi click xóa phòng chat
            div.addEventListener('click', (e) => {
                const deleteBtn = e.target.closest('.btn-delete-chatroom');
                if (deleteBtn) {
                    e.stopPropagation(); // Ngăn không kích hoạt sự kiện chọn phòng
                    const roomId = deleteBtn.getAttribute('data-room-id');
                    deleteChatRoomAdmin(roomId, room.title || 'Phòng hỗ trợ');
                    return;
                }
                selectAdminActiveChatRoom(room);
            });

            listEl.appendChild(div);
        });
    } catch (err) {
        listEl.innerHTML = `<p class="text-center text-red-400 py-4 text-xs font-orbitron">Lỗi tải danh sách phòng</p>`;
    }
}

// Hàm xử lý gọi API xóa toàn bộ phòng chat
async function deleteChatRoomAdmin(roomId, title) {
    showAdminConfirm(
        'Xóa cuộc hội thoại',
        `Bạn có chắc chắn muốn xóa phòng chat "${title}" này không? Thao tác này sẽ dọn sạch toàn bộ tin nhắn và ảnh liên quan trên server.`,
        async () => {
            try {
                await ApiService.deleteChatRoom(roomId);
                logToConsole(`Đã xóa phòng chat hỗ trợ #${roomId} (${title})`, 'success');
                
                // Nếu phòng bị xóa đang là phòng mở hiện tại thì dọn dẹp khung chat bên phải
                if (currentAdminActiveRoomId == roomId) {
                    currentAdminActiveRoomId = null;
                    if (adminChatIntervalTimer) {
                        clearInterval(adminChatIntervalTimer);
                        adminChatIntervalTimer = null;
                    }
                    const messagesArea = document.getElementById('admin-chat-messages-area');
                    if (messagesArea) {
                        messagesArea.innerHTML = `<p class="text-center text-gray-500 text-xs py-8 font-orbitron">Vui lòng chọn một cuộc hội thoại hỗ trợ từ danh sách bên trái để bắt đầu trò chuyện trực tiếp.</p>`;
                    }
                    const titleEl = document.getElementById('admin-chat-active-title');
                    if (titleEl) titleEl.innerText = 'Chọn phòng hỗ trợ';
                    document.getElementById('admin-chat-pane-status-select')?.classList.add('hidden');
                    document.getElementById('admin-chat-send-form')?.classList.add('hidden');
                }
                
                // Làm mới lại hàng đợi danh sách phòng chat
                loadAdminChatPaneRooms();
            } catch (err) {
                showAdminAlert('Lỗi xóa phòng', err.response?.data?.message || err.message || 'Không thể xử lý yêu cầu xóa phòng chat.');
            }
        }
    );
}

// Khi Admin chọn click vào một cuộc trò chuyện từ danh sách
async function selectAdminActiveChatRoom(room) {
    currentAdminActiveRoomId = room.id;

    if (adminChatIntervalTimer) clearInterval(adminChatIntervalTimer);

    // Responsive Mobile: Ẩn cột danh sách bên trái, chỉ hiện box chat bên phải
    const listPane = document.getElementById('admin-chat-list-pane');
    const boxPane = document.getElementById('admin-chat-box-pane');
    if (window.innerWidth < 768) {
        listPane?.classList.add('hidden');
        boxPane?.classList.remove('hidden');
        boxPane?.classList.add('flex', 'w-full');
    }

    const titleEl = document.getElementById('admin-chat-active-title');
    const statusSelect = document.getElementById('admin-chat-pane-status-select');
    const sendForm = document.getElementById('admin-chat-send-form');

    if (titleEl) titleEl.innerText = room.title || 'Phòng hỗ trợ';
    if (statusSelect) {
        statusSelect.value = room.status;
        statusSelect.classList.remove('hidden');
    }
    if (sendForm) sendForm.classList.remove('hidden');

    // Thao tác làm nổi bật nút đã chọn
    document.querySelectorAll('#admin-chat-rooms-list > div').forEach(el => {
        el.classList.remove('bg-cyan-900/40', 'border-cyan-500/60', 'shadow-[0_0_8px_rgba(6,182,212,0.2)]');
        el.classList.add('bg-black/60', 'border-pink-500/10');
    });

    await loadAdminActiveMessages();
    adminChatIntervalTimer = setInterval(loadAdminActiveMessages, 3000);
}

// Hàm tải tin nhắn lịch sử và hiển thị (Hỗ trợ Ảnh & nút Xóa tin nhắn)
async function loadAdminActiveMessages() {
    if (!currentAdminActiveRoomId) return;
    const messagesArea = document.getElementById('admin-chat-messages-area');
    if (!messagesArea) return;

    try {
        const res = await ApiService.getChatRoom(currentAdminActiveRoomId);
        const roomData = res.data?.data || res.data;
        let messages = roomData?.messages || [];
        
        // Giải bọc nếu Laravel bọc collection tin nhắn vào .data
        if (messages && messages.data && Array.isArray(messages.data)) {
            messages = messages.data;
        } else if (!Array.isArray(messages)) {
            messages = [];
        }

        const currentUserId = getAuthUser()?.id;

        if (messages.length === 0) {
            messagesArea.innerHTML = `<p class="text-center text-gray-500 py-8 font-orbitron text-xs">Cuộc hội thoại chưa có tin nhắn.</p>`;
            return;
        }

        const shouldScroll = messagesArea.scrollHeight - messagesArea.scrollTop <= messagesArea.clientHeight + 60;

        messagesArea.innerHTML = '';
        messages.forEach(msg => {
            const isMe = msg.user_id === currentUserId || msg.sender_id === currentUserId;
            
            // Xác định đối tượng gửi (sender hoặc user dự phòng)
            const senderObj = msg.sender || msg.user;
            const isSenderAdmin = senderObj?.role === 'admin' || senderObj?.is_admin === 1 || senderObj?.is_admin === true;
            
            let senderName = '';
            let bubbleStyle = '';

            if (msg.type === 'system') {
                senderName = '🤖 TRỢ LÝ ẢO';
                bubbleStyle = 'bg-yellow-950/60 text-yellow-200 border border-yellow-500/40 rounded-tl-none shadow-[0_0_10px_rgba(234,179,8,0.15)]';
            } else if (isMe) {
                senderName = 'Bạn (ADMIN)';
                bubbleStyle = 'bg-cyan-950/80 text-cyan-200 border border-cyan-500/40 rounded-tr-none shadow-[0_0_8px_rgba(6,182,212,0.1)]';
            } else {
                senderName = isSenderAdmin ? 'ADMIN' : (senderObj?.username || senderObj?.name || 'Người chơi');
                bubbleStyle = 'bg-zinc-900/90 text-gray-200 border border-zinc-700/50 rounded-tl-none';
            }

            // Xử lý hiển thị nội dung tin nhắn dạng hình ảnh hoặc text thô
            let contentHtml = msg.message || '';
            if (msg.type === 'image' || msg.image_url) {
                const imageUrl = msg.image_url || msg.message;
                contentHtml = `
                    <div class="space-y-1">
                        <img src="${imageUrl}" class="max-w-[200px] rounded border border-cyan-500/20 cursor-zoom-in hover:brightness-110 transition-all shadow-md" onclick="window.open('${imageUrl}', '_blank')" alt="Chat Image" onerror="this.onerror=null; this.src='https://placehold.co/150?text=Error+Loading+Image'" />
                        ${msg.message && msg.message !== imageUrl ? `<p class="mt-1">${msg.message}</p>` : ''}
                    </div>
                `;
            }

            const row = document.createElement('div');
            row.className = `flex flex-col mb-2 max-w-[85%] ${isMe ? 'ml-auto items-end' : 'mr-auto items-start'}`;
            row.innerHTML = `
                <div class="flex items-center gap-2 mb-0.5 px-1 font-orbitron text-[9px] text-gray-500">
                    <span>${senderName}</span>
                    <button class="btn-delete-chat-msg text-[9px] text-red-500/60 hover:text-red-400 hover:scale-110 transition-all cursor-pointer" data-msg-id="${msg.id}" title="Thu hồi / Xóa tin nhắn">
                        [Xóa]
                    </button>
                </div>
                <div class="px-3 py-1.5 rounded-xl text-xs break-words leading-relaxed ${bubbleStyle}">
                    ${contentHtml}
                </div>
            `;
            messagesArea.appendChild(row);
        });

        // Đăng ký bộ xử lý Event Delegation lắng nghe click Xóa tin nhắn nếu chưa gán
        if (!messagesArea.dataset.listenerAttached) {
            messagesArea.dataset.listenerAttached = "true";
            messagesArea.addEventListener('click', async (e) => {
                const deleteBtn = e.target.closest('.btn-delete-chat-msg');
                if (deleteBtn) {
                    const msgId = deleteBtn.getAttribute('data-msg-id');
                    showAdminConfirm(
                        'Thu hồi tin nhắn',
                        'Bạn có chắc chắn muốn thu hồi hoặc xóa tin nhắn hỗ trợ này không?',
                        async () => {
                            try {
                                await ApiService.deleteChatMessage(msgId);
                                logToConsole(`Đã xóa tin nhắn hỗ trợ #${msgId}`, 'success');
                                await loadAdminActiveMessages();
                            } catch (err) {
                                showAdminAlert('Lỗi thu hồi', err.response?.data?.message || err.message || 'Không thể thực thi lệnh thu hồi tin nhắn.');
                            }
                        }
                    );
                }
            });
        }

        if (shouldScroll) {
            messagesArea.scrollTop = messagesArea.scrollHeight;
        }
    } catch (err) {
        console.error("Lỗi đồng bộ tin nhắn hỗ trợ của Admin:", err);
    }
}

// Lắng nghe hành vi đổi Status từ dropdown trong Box Chat Admin
const adminChatStatusSelect = document.getElementById('admin-chat-pane-status-select');
if (adminChatStatusSelect) {
    adminChatStatusSelect.addEventListener('change', async () => {
        if (!currentAdminActiveRoomId) return;
        const newStatus = adminChatStatusSelect.value;
        try {
            await ApiService.updateChatRoomStatus(currentAdminActiveRoomId, { status: newStatus });
            logToConsole(`Đã đổi trạng thái phòng chat sang ${newStatus.toUpperCase()}`, 'success');
            loadAdminChatPaneRooms(); // Cập nhật màu trạng thái trên List phòng
        } catch (err) {
            showAdminAlert('Lỗi trạng thái', 'Không thể hoàn tất thay đổi trạng thái phiên hỗ trợ này.');
        }
    });
}

// Nút gửi tin nhắn hỗ trợ phía Admin (Hỗ trợ Ảnh & FormData)
const adminChatSendForm = document.getElementById('admin-chat-send-form');
if (adminChatSendForm && !adminChatSendForm.dataset.listenerAttached) {
    adminChatSendForm.dataset.listenerAttached = "true";
    adminChatSendForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!currentAdminActiveRoomId) return;

        const input = document.getElementById('admin-chat-text-input');
        const uploader = document.getElementById('admin-chat-file-uploader');
        const btnSubmit = e.target.querySelector('button[type="submit"]');

        const text = input?.value.trim() || '';
        const attachedFile = uploader && uploader.files ? uploader.files[0] : null;

        if (!text && !attachedFile) return;

        try {
            if (input) input.disabled = true;
            if (uploader) uploader.disabled = true;
            setSubmitButtonState(btnSubmit, 'loading', { text: 'GỬI...' });

            // Gói payload tương tự client player để Laravel nhận diện tệp ảnh
            const payload = {
                type: attachedFile ? 'image' : 'text'
            };
            if (text) {
                payload.message = text;
            }
            if (attachedFile) {
                payload.image = attachedFile;
            }

            await ApiService.sendChatMessage(currentAdminActiveRoomId, payload);
            setSubmitButtonState(btnSubmit, 'success', { text: 'ĐÃ GỬI!', delay: 600 });
            
            if (input) input.value = '';
            clearAdminChatImageUploader();
            
            await loadAdminActiveMessages();
            loadAdminChatPaneRooms(); // Làm mới hiển thị dòng chat xem trước bên trái
        } catch (err) {
            setSubmitButtonState(btnSubmit, 'error', { text: 'LỖI!', delay: 2000 });
            showAdminAlert('Lỗi gửi tin', err.response?.data?.message || err.message || 'Không thể truyền đi phản hồi hỗ trợ của bạn.');
        } finally {
            if (input) {
                input.disabled = false;
                input.focus();
            }
            if (uploader) {
                uploader.disabled = false;
            }
        }
    });
}

// Lắng nghe sự kiện Admin kẹp tệp hình ảnh để hiển thị vùng xem trước
document.addEventListener('change', (e) => {
    if (e.target && e.target.id === 'admin-chat-file-uploader') {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            showAdminAlert('Kích thước tệp quá hạn', 'Giới hạn dung lượng tải tệp lên trong một tin nhắn hỗ trợ là 5MB!');
            e.target.value = '';
            return;
        }

        const previewZone = document.getElementById('admin-chat-image-preview-zone');
        const previewImg = document.getElementById('img-admin-chat-preview');
        const filenameLbl = document.getElementById('lbl-admin-preview-filename');

        if (previewZone && previewImg && filenameLbl) {
            filenameLbl.innerText = file.name;
            previewImg.src = URL.createObjectURL(file);
            previewZone.classList.remove('hidden');
        }
    }
});

// Lắng nghe sự kiện Admin hủy bỏ xem trước ảnh đã chọn
document.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'btn-remove-admin-preview-img') {
        clearAdminChatImageUploader();
    }
});

// Hàm dọn dẹp vùng nhớ xem trước hình ảnh của Admin
function clearAdminChatImageUploader() {
    const uploader = document.getElementById('admin-chat-file-uploader');
    const previewZone = document.getElementById('admin-chat-image-preview-zone');
    const previewImg = document.getElementById('img-admin-chat-preview');
    
    if (uploader) uploader.value = '';
    if (previewZone) previewZone.classList.add('hidden');
    if (previewImg) {
        if (previewImg.src.startsWith('blob:')) {
            URL.revokeObjectURL(previewImg.src); // Thu hồi blob tránh rò rỉ RAM trình duyệt
        }
        previewImg.src = '';
    }
}

// Nút "Quay lại" trên thiết bị di động
const btnAdminChatBack = document.getElementById('btn-admin-chat-back');
if (btnAdminChatBack) {
    btnAdminChatBack.addEventListener('click', () => {
        if (adminChatIntervalTimer) clearInterval(adminChatIntervalTimer);
        adminChatIntervalTimer = null;
        currentAdminActiveRoomId = null;

        const listPane = document.getElementById('admin-chat-list-pane');
        const boxPane = document.getElementById('admin-chat-box-pane');
        listPane?.classList.remove('hidden');
        boxPane?.classList.add('hidden');
        boxPane?.classList.remove('flex', 'w-full');

        loadAdminChatPaneRooms();
    });
}

// Đăng ký sự kiện lọc trạng thái Admin Chat Rooms
document.querySelectorAll('.chat-filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.chat-filter-btn').forEach(b => {
            b.classList.remove('border-pink-500/40', 'bg-pink-950/40', 'text-pink-400', 'font-bold');
            b.classList.add('border-transparent', 'text-gray-500');
        });
        btn.classList.add('border-pink-500/40', 'bg-pink-950/40', 'text-pink-400', 'font-bold');
        btn.classList.remove('border-transparent', 'text-gray-500');

        adminChatFilterStatus = btn.getAttribute('data-status');
        loadAdminChatPaneRooms();
    });
});


// --- CONSOLE COMMANDS & SCRIPTS ---
async function handleCommand(cmd) {
    logToConsole(`> ${cmd}`);
    if (cmd === 'clear') {
        if (consoleOutput) consoleOutput.innerHTML = '';
        return;
    }
    if (cmd === 'help') {
        const isVi = activeLang === 'vi';
        logToConsole(isVi ? 'Lệnh máy khách: clear, help, refresh_users, refresh_maps' : 'Client commands: clear, help, refresh_users, refresh_maps', 'info');
        logToConsole(isVi ? 'Lệnh máy chủ: inspire, user:ban {user}, user:unban {user}, user:admin {user}, leaderboard:reset {id}' : 'Server commands: inspire, user:ban {user}, user:unban {user}, user:admin {user}, leaderboard:reset {id}', 'info');
        return;
    }
    if (cmd === 'refresh_users') {
        loadUsers(currentUsersPage);
        logToConsole(activeLang === 'vi' ? 'Đang làm mới người dùng...' : 'Refreshing users...', 'info');
        return;
    }
    if (cmd === 'refresh_maps') {
        loadBeatmaps();
        logToConsole(activeLang === 'vi' ? 'Đang làm mới beatmaps...' : 'Refreshing beatmaps...', 'info');
        return;
    }

    // Gửi lệnh lên Backend API để thực thi Artisan
    try {
        logToConsole(activeLang === 'vi' ? 'Đang thực thi lệnh trên server...' : 'Executing command on server...', 'warning');
        const res = await ApiService.executeCommand({ command: cmd });
        const output = res.data?.output || res.data?.message || res.data?.data || JSON.stringify(res.data);
        logToConsole(output, 'success');
    } catch (err) {
        const errMsg = err.response?.data?.message || err.response?.data?.error || err.message || 'Execution failed';
        logToConsole(`Error: ${errMsg}`, 'error');
    }
}

// --- HỆ THỐNG LƯU LỊCH SỬ LỆNH (COMMAND HISTORY) ---
let commandHistory = [];
let historyIndex = -1;

btnConsoleSend?.addEventListener('click', async () => {
    const val = consoleInput?.value.trim();
    if (val) {
        if (btnConsoleSend) btnConsoleSend.disabled = true;

        await handleCommand(val);
        commandHistory.push(val);
        historyIndex = commandHistory.length;
        
        if (consoleInput) consoleInput.value = '';
        if (btnConsoleSend) btnConsoleSend.disabled = false;
        consoleInput?.focus();
    }
});

consoleInput?.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        btnConsoleSend?.click();
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (historyIndex > 0) {
            historyIndex--;
            if (consoleInput) consoleInput.value = commandHistory[historyIndex];
        }
    } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (historyIndex < commandHistory.length - 1) {
            historyIndex++;
            if (consoleInput) consoleInput.value = commandHistory[historyIndex];
        } else {
            historyIndex = commandHistory.length;
            if (consoleInput) consoleInput.value = '';
        }
    }
});

btnConsoleClear?.addEventListener('click', () => {
    if (consoleOutput) consoleOutput.innerHTML = '';
});

document.getElementById('btn-sync-beatmaps')?.addEventListener('click', async () => {
    logToConsole('Synchronizing beatmaps...', 'warning');
    try {
        await loadBeatmaps();
        logToConsole('Beatmaps synchronized successfully.', 'success');
    } catch (e) {
        logToConsole('Sync failed: ' + e.message, 'error');
    }
});

// Đăng ký sự kiện Export All
const btnExportAll = document.getElementById('btn-export-all-beatmaps');
if (btnExportAll) {
    btnExportAll.addEventListener('click', exportAllBeatmapsAsJson);
}

// --- BẢO VỆ AN TOÀN & KHẮC PHỤC LỖI TRÙNG LẶP DEBOUNCE TÌM KIẾM ---
if (adminUserSearchInput) {
    adminUserSearchInput.addEventListener('input', (e) => {
        clearTimeout(userSearchTimeout);
        userSearchTimeout = setTimeout(() => {
            adminUserSearchTerm = e.target.value.trim();
            currentUsersPage = 1;
            loadUsers(1);
        }, 500);
    });
}

if (adminBmSearchInput) {
    adminBmSearchInput.addEventListener('input', (e) => {
        clearTimeout(bmSearchTimeout);
        bmSearchTimeout = setTimeout(() => {
            adminBmSearchTerm = e.target.value.trim();
            loadBeatmaps();
        }, 500);
    });
}

if (searchInputEl) {
    searchInputEl.addEventListener('input', (e) => {
        clearTimeout(scoreBmSearchTimeout);
        scoreBmSearchTimeout = setTimeout(() => {
            adminScoreBmSearchTerm = e.target.value.trim();
            loadScoreBeatmaps();
        }, 500);
    });
}

function initAdminFilters() {
    const copyrightSelect = document.getElementById('admin-filter-copyright');
    const clearBtn = document.getElementById('btn-clear-admin-filters');

    // Artist & Genre: được xử lý qua callback onSelect trong populateAdminFilterDropdowns

    if (copyrightSelect) {
        copyrightSelect.addEventListener('change', () => {
            window.adminSelectedCopyright = copyrightSelect.value;
            loadBeatmaps();
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            window.adminSelectedArtist = '';
            window.adminSelectedGenre  = '';
            window.adminSelectedCopyright = '';

            // Reset custom searchable dropdowns
            const artistBtn = document.getElementById('admin-filter-artist-btn');
            const genreBtn  = document.getElementById('admin-filter-genre-btn');
            if (artistBtn && artistBtn._setValue) artistBtn._setValue('', 'TẤT CẢ CA SĨ');
            if (genreBtn  && genreBtn._setValue)  genreBtn._setValue('', 'TẤT CẢ THỂ LOẠI');
            // Reset hidden inputs directly
            const artistHidden = document.getElementById('admin-filter-artist');
            const genreHidden  = document.getElementById('admin-filter-genre');
            if (artistHidden) artistHidden.value = '';
            if (genreHidden)  genreHidden.value  = '';

            if (copyrightSelect) copyrightSelect.value = '';
            loadBeatmaps();
        });
    }
}

function initAdminScoreTabs() {
    const btnEasy = document.getElementById('btn-admin-score-tab-easy');
    const btnDefault = document.getElementById('btn-admin-score-tab-default');
    const btnRage = document.getElementById('btn-admin-score-tab-rage');
    const btnAsian = document.getElementById('btn-admin-score-tab-asian');
    
    const modeBtns = [
        { id: 'easy', el: btnEasy },
        { id: 'default', el: btnDefault },
        { id: 'rage', el: btnRage },
        { id: 'asian', el: btnAsian },
    ];

    const activeClass = "px-2 py-0.5 text-[10px] font-bold font-orbitron uppercase rounded bg-cyan-500 text-black transition-all";
    const inactiveClass = "px-2 py-0.5 text-[10px] font-bold font-orbitron uppercase rounded text-cyan-400 hover:text-white transition-all";

    modeBtns.forEach(item => {
        if (item.el) {
            item.el.addEventListener('click', () => {
                if (window.adminScoreSelectedMode === item.id) return;
                window.adminScoreSelectedMode = item.id;
                modeBtns.forEach(b => {
                    if (b.el) b.el.className = b.id === item.id ? activeClass : inactiveClass;
                });
                renderAdminScoresTable();
            });
        }
    });
}

initAdminFilters();
initAdminScoreTabs();
checkAuth();

// --- GAME SETTINGS INITIALIZATION ---
function initGameSettingsToggle() {
    const toggleShowHitbox = document.getElementById('admin-toggle-show-hitbox');
    if (toggleShowHitbox) {
        toggleShowHitbox.checked = localStorage.getItem('showHitboxEnabled') === 'true';
        toggleShowHitbox.addEventListener('change', () => {
            localStorage.setItem('showHitboxEnabled', toggleShowHitbox.checked);
        });
    }
}
initGameSettingsToggle();