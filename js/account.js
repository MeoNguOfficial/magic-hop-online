// ============================================================
//  account.js — Xử lý Logic Giao diện & Tích hợp API Tài khoản
// ============================================================

// Tự động khai báo dự phòng phương thức showCyberModal nếu chưa được nạp từ game chính
if (typeof window.showCyberModal !== 'function') {
    window.showCyberModal = function (options) {
        let modalId = 'dynamic-cyber-modal';
        let existing = document.getElementById(modalId);
        if (existing) existing.remove();

        const modalBackdrop = document.createElement('div');
        modalBackdrop.id = modalId;
        modalBackdrop.className = "fixed inset-0 z-[9999] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in";
        modalBackdrop.style.fontFamily = "'Orbitron', 'Rajdhani', sans-serif";

        const isConfirm = options.type === 'confirm';
        const cancelBtnHtml = isConfirm ? `
            <button id="dynamic-modal-cancel" class="flex-1 py-2 border border-cyan-500/30 hover:bg-cyan-950/20 text-gray-400 hover:text-cyan-300 rounded font-orbitron font-bold uppercase transition-all text-[10px] tracking-wider">
                ${options.cancelText || 'Cancel'}
            </button>
        ` : '';

        modalBackdrop.innerHTML = `
            <div class="bg-black/90 border border-cyan-500/50 p-6 rounded-xl shadow-[0_0_30px_rgba(6,182,212,0.25)] w-full max-w-sm text-center">
                <h2 class="text-sm font-orbitron font-bold text-cyan-400 mb-2 uppercase tracking-widest">${options.title || 'SYSTEM NOTICE'}</h2>
                <div class="text-[11px] text-gray-300 mb-5 leading-relaxed font-orbitron">${options.message || ''}</div>
                <div class="flex gap-2">
                    ${cancelBtnHtml}
                    <button id="dynamic-modal-ok" class="flex-1 py-2 bg-cyan-950/50 border border-cyan-500/50 text-cyan-400 font-bold font-orbitron uppercase rounded transition-all hover:bg-cyan-900/40 text-[10px] tracking-wider shadow-[0_0_8px_rgba(34,211,238,0.2)]">
                        ${options.confirmText || 'OK'}
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modalBackdrop);

        const btnOk = modalBackdrop.querySelector('#dynamic-modal-ok');
        const btnCancel = modalBackdrop.querySelector('#dynamic-modal-cancel');

        const cleanup = () => {
            modalBackdrop.remove();
        };

        btnOk.addEventListener('click', () => {
            cleanup();
            if (typeof options.onConfirm === 'function') options.onConfirm();
        });

        if (btnCancel) {
            btnCancel.addEventListener('click', () => {
                cleanup();
                if (typeof options.onCancel === 'function') options.onCancel();
            });
        }
    };
}

// Trạng thái chat đã được di chuyển sang js/chat.js

// Hàm tìm kiếm sâu đệ quy để bắt dính các key trong cấu trúc JSON lồng nhau từ Laravel
function findKeyDeep(obj, keyToFind) {
    if (!obj || typeof obj !== 'object') return null;
    if (keyToFind in obj) return obj[keyToFind];
    for (let k in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, k) && typeof obj[k] === 'object') {
            let found = findKeyDeep(obj[k], keyToFind);
            if (found !== null) return found;
        }
    }
    return null;
}

// Bộ chuyển đổi ngày tháng tương thích đa trình duyệt và an toàn với Safari
function parseBannedDate(dateStr) {
    if (!dateStr) return null;
    if (/^\d+$/.test(dateStr)) {
        return new Date(parseInt(dateStr, 10));
    }
    let s = String(dateStr).trim();
    let date = new Date(s);
    if (isNaN(date.getTime())) {
        date = new Date(s.replace(' ', 'T'));
    }
    if (isNaN(date.getTime())) {
        // Fallback tự tách chuỗi MySQL DateTime "YYYY-MM-DD HH:MM:SS"
        const parts = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:\s+|T)(\d{1,2}):(\d{1,2}):(\d{1,2})/);
        if (parts) {
            date = new Date(
                parseInt(parts[1], 10),
                parseInt(parts[2], 10) - 1,
                parseInt(parts[3], 10),
                parseInt(parts[4], 10),
                parseInt(parts[5], 10),
                parseInt(parts[6], 10)
            );
        }
    }
    return isNaN(date.getTime()) ? null : date;
}

// --- HÀM HIỂN THỊ THÔNG BÁO BAN TÙY CHỈNH KÈM THỜI GIAN & LÝ DO TRỰC QUAN ---
function handleBannedError(error) {
    const responseData = error.response?.data || {};

    // Tìm kiếm sâu toàn diện để lôi các thuộc tính phạt ra ngoài bất kể độ sâu JSON
    const rawBannedUntil = findKeyDeep(responseData, 'banned_until') || findKeyDeep(responseData, 'ban_until');
    const rawReason = findKeyDeep(responseData, 'reason') || findKeyDeep(responseData, 'banned_reason') || findKeyDeep(responseData, 'ban_reason');

    const bannedUntilDate = parseBannedDate(rawBannedUntil);
    const reason = rawReason || responseData.message || "Phát hiện vi phạm quy định trò chơi!";

    let remainingText = "";
    if (bannedUntilDate) {
        const timeDiff = bannedUntilDate - new Date();
        if (timeDiff > 0) {
            const secs = Math.floor(timeDiff / 1000);
            const mins = Math.floor(secs / 60);
            const hours = Math.floor(mins / 60);
            const days = Math.floor(hours / 24);

            if (activeLang === 'vi') {
                remainingText = `${days > 0 ? days + ' ngày ' : ''}${hours % 24 > 0 ? (hours % 24) + ' giờ ' : ''}${mins % 60 > 0 ? (mins % 60) + ' phút ' : ''}${secs % 60} giây`;
            } else {
                remainingText = `${days > 0 ? days + 'd ' : ''}${hours % 24 > 0 ? (hours % 24) + 'h ' : ''}${mins % 60 > 0 ? (mins % 60) + 'm ' : ''}${secs % 60}s`;
            }
        } else {
            remainingText = activeLang === 'vi' ? "Đã hết hạn (Vui lòng đăng nhập lại)" : "Expired (Please re-login)";
        }
    } else {
        remainingText = activeLang === 'vi' ? "Vĩnh viễn (Permanent)" : "Permanent";
    }

    let msg = "";
    if (activeLang === 'vi') {
        msg = `<div class="text-left space-y-2.5 font-orbitron text-[11px] leading-relaxed">
            <p class="text-red-400 font-bold text-center text-xs uppercase mb-3 border-b border-red-500/20 pb-1">Tài khoản của bạn đã bị khóa!</p>
            <div class="bg-red-950/20 border border-red-500/20 p-2.5 rounded-lg">
                <span class="text-[9px] text-red-400 font-bold uppercase tracking-wider block">📝 Lý do phạt:</span>
                <span class="text-white font-bold mt-1 block">${reason}</span>
            </div>
            <div class="bg-cyan-950/20 border border-cyan-500/20 p-2.5 rounded-lg">
                <span class="text-[9px] text-cyan-400 font-bold uppercase tracking-wider block">⏱️ Thời hạn còn lại:</span>
                <span class="text-cyan-300 font-bold mt-1 block">${remainingText}</span>
            </div>
        </div>`;
    } else {
        msg = `<div class="text-left space-y-2.5 font-orbitron text-[11px] leading-relaxed">
            <p class="text-red-400 font-bold text-center text-xs uppercase mb-3 border-b border-red-500/20 pb-1">Your account has been banned!</p>
            <div class="bg-red-950/20 border border-red-500/20 p-2.5 rounded-lg">
                <span class="text-[9px] text-red-400 font-bold uppercase tracking-wider block">📝 Reason:</span>
                <span class="text-white font-bold mt-1 block">${reason}</span>
            </div>
            <div class="bg-cyan-950/20 border border-cyan-500/20 p-2.5 rounded-lg">
                <span class="text-[9px] text-cyan-400 font-bold uppercase tracking-wider block">⏱️ Remaining time:</span>
                <span class="text-cyan-300 font-bold mt-1 block">${remainingText}</span>
            </div>
        </div>`;
    }

    showCyberModal({
        title: activeLang === 'vi' ? "TÀI KHOẢN BỊ KHÓA" : "ACCOUNT BANNED",
        message: msg,
        type: 'alert'
    });
}

// --- HÀM GIẢI MÃ THÔNG TIN USER ĐA TẦNG AN TOÀN (CRASH-PROOF) ---
function getAuthUser() {
    const raw = localStorage.getItem('auth_user');
    if (!raw) return {};

    // 1. Thử parse trực tiếp dưới dạng JSON thông thường
    try {
        return JSON.parse(raw);
    } catch (e) { }

    // 2. Thử giải mã Base64 + URL-encoded
    try {
        let decoded = atob(raw);
        if (decoded.includes('%')) {
            decoded = decodeURIComponent(decoded);
        }
        return JSON.parse(decoded);
    } catch (e) { }

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
    } catch (e) { }

    return {};
}

document.addEventListener('DOMContentLoaded', () => {
    // Đợi 1 chút cho các DOM tĩnh khởi tạo rồi mới vẽ nội dung tài khoản
    setTimeout(() => {
        const urlParams = new URLSearchParams(window.search || window.location.search);
        const resetToken = urlParams.get('token');
        const resetEmail = urlParams.get('email');

        if (resetToken) {
            const navAccountBtn = document.getElementById('nav-account');
            if (navAccountBtn) {
                navAccountBtn.click();
            } else {
                const navSettingsBtn = document.getElementById('nav-settings');
                if (navSettingsBtn) navSettingsBtn.click();
            }

            renderResetPasswordState(resetEmail || "", resetToken);

            // Cập nhật URL tránh người dùng F5 lại dính token
            window.history.replaceState({}, document.title, window.location.pathname);
            return;
        }

        checkLoginStatus();
    }, 200);
});

// --- QUẢN LÝ TÀI KHOẢN ĐÃ LƯU TRÊN THIẾT BỊ (ACCOUNT SWITCHER) ---
function getSavedAccounts() {
    try {
        const raw = localStorage.getItem('saved_accounts');
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        return [];
    }
}

function saveAccountToSavedList(user, token, tokenExp) {
    if (!user || (!user.id && !user.email && !user.username) || !token) return;
    let list = getSavedAccounts();
    const accountId = user.id || user.email || user.username;
    const userEmail = user.email ? user.email.toLowerCase() : null;
    const userName = user.username || user.name;

    const existingIndex = list.findIndex(a => 
        (a.id && user.id && String(a.id) === String(user.id)) ||
        (userEmail && a.email && a.email.toLowerCase() === userEmail) ||
        (userName && a.username && a.username === userName)
    );

    const accountData = {
        id: accountId,
        username: user.username || user.name || user.realname || 'PLAYER',
        realname: user.realname || '',
        email: user.email || '',
        token: token,
        tokenExp: tokenExp || (Date.now() + 30 * 24 * 60 * 60 * 1000).toString(),
        user: user,
        savedAt: Date.now()
    };

    if (existingIndex !== -1) {
        list[existingIndex] = accountData;
    } else {
        list.push(accountData);
    }
    localStorage.setItem('saved_accounts', JSON.stringify(list));
}

function removeSavedAccount(accountId) {
    let list = getSavedAccounts();
    list = list.filter(a => String(a.id) !== String(accountId) && String(a.email) !== String(accountId) && String(a.username) !== String(accountId));
    localStorage.setItem('saved_accounts', JSON.stringify(list));
}

// --- HÀM TỰ ĐỘNG KÉO VÀ GHI ĐÈ DỮ LIỆU TỪ SERVER VỀ THIẾT BỊ KHI CHUYỂN TÀI KHOẢN ---
async function syncServerDataToLocal(userId) {
    if (!userId) return;
    try {
        const scoreRes = await window.ApiService.getScores({ user_id: userId, limit: 1000 });
        const serverScores = scoreRes.data?.data || scoreRes.data || [];
        
        const db = typeof getDB === 'function' ? await getDB() : (typeof initDB === 'function' ? await initDB() : null);
        if (!db) return;

        const tx = db.transaction("highScores", "readwrite");
        const store = tx.objectStore("highScores");

        // Xóa hoàn toàn kỷ lục cũ trên IndexedDB thiết bị để nạp dữ liệu sạch từ Server tài khoản mới
        await new Promise((resolve) => {
            const clearReq = store.clear();
            clearReq.onsuccess = resolve;
            clearReq.onerror = resolve;
        });

        const mergedScores = {};
        serverScores.forEach(s => {
            if (typeof playlist !== 'undefined') {
                const rawBeatmapId = s.beatmap_id ?? s.beatmapId ?? s.song_id ?? s.songId ?? s.map_id ?? s.beatmap?.id ?? s.song?.id ?? s.beatmap?.beatmap_id;
                const targetBeatmapId = (rawBeatmapId !== undefined && rawBeatmapId !== null) ? String(rawBeatmapId) : null;
                if (!targetBeatmapId) return;

                const songIndex = playlist.findIndex(p => {
                    const bId = typeof getBeatmapIdFromSong === 'function' ? getBeatmapIdFromSong(p) : String(p.id);
                    return bId && bId === targetBeatmapId;
                });
                if (songIndex !== -1) {
                    const isHard = s.is_hard_mode || s.hard_mode || s.is_rage_mode || s.rage_mode;
                    if (!mergedScores[songIndex]) {
                        mergedScores[songIndex] = {
                            normalScore: 0,
                            normalPassed: false,
                            rageScore: 0,
                            ragePassed: false
                        };
                    }

                    const rawPassed = s.is_normal_mode_passed ?? s.is_normal_passed ?? s.is_passed ?? s.isNormalModePassed ?? s.isNormalPassed ?? s.normal_passed;
                    const isNormalPassed = Boolean(rawPassed) || Number(rawPassed) === 1 || String(rawPassed) === '1' || String(rawPassed).toLowerCase() === 'true' || rawPassed === true;

                    if (isHard) {
                        if (s.score > mergedScores[songIndex].rageScore) {
                            mergedScores[songIndex].rageScore = s.score;
                        }
                        if (isNormalPassed) {
                            mergedScores[songIndex].ragePassed = true;
                        }
                    } else {
                        if (s.score > mergedScores[songIndex].normalScore) {
                            mergedScores[songIndex].normalScore = s.score;
                        }
                        if (isNormalPassed) {
                            mergedScores[songIndex].normalPassed = true;
                        }
                    }
                }
            }
        });

        Object.keys(mergedScores).forEach(songIdxStr => {
            const songIdx = parseInt(songIdxStr, 10);
            const ms = mergedScores[songIdx];
            const record = {
                songIndex: songIdx,
                score: ms.normalScore > 0 ? btoa(ms.normalScore.toString()) : undefined,
                isNormalModePassed: ms.normalPassed ? true : false,
                rageScore: ms.rageScore > 0 ? btoa(ms.rageScore.toString()) : undefined,
                isRageModePassed: ms.ragePassed ? true : false
            };
            store.put(record);
        });
    } catch (e) {
        console.error('[Account] Lỗi đồng bộ dữ liệu từ server khi chuyển tài khoản:', e);
    }
}
window.syncServerDataToLocal = syncServerDataToLocal;

async function checkLoginStatus(forceRefresh = false) {
    const token = localStorage.getItem('auth_token');
    const tokenExp = localStorage.getItem('auth_token_exp');

    if (token) {
        // Kiểm tra Token đã quá hạn 30 ngày chưa
        if (tokenExp && Date.now() > parseInt(tokenExp, 10)) {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('auth_token_exp');
            localStorage.removeItem('auth_user');
            renderLoggedOutState();
            return;
        }
        try {
            const options = forceRefresh ? { forceRefresh: true } : {};
            const response = await window.ApiService.getMe(options);

            // Lấy dữ liệu user (xử lý trường hợp backend bọc trong object "data" hoặc "user")
            const userData = response.data?.data?.user || response.data?.data || response.data;
            if (userData) {
                localStorage.setItem('auth_user', JSON.stringify(userData));
                saveAccountToSavedList(userData, token, tokenExp);
                renderLoggedInState(userData);
                syncServerDataToLocal(userData.id);
                if (typeof window.preloadBackendAndPassedStatusOnStartup === 'function') {
                    window.preloadBackendAndPassedStatusOnStartup();
                }
            } else {
                throw new Error("Không có dữ liệu user");
            }
        } catch (error) {
            const responseData = error.response?.data || {};
            const isBanned = findKeyDeep(responseData, 'is_banned') === true ||
                findKeyDeep(responseData, 'is_banned') == 1 ||
                findKeyDeep(responseData, 'banned_until') !== null && findKeyDeep(responseData, 'banned_until') !== undefined ||
                responseData.message?.toLowerCase().includes('ban');

            if (isBanned) {
                handleBannedError(error);
                localStorage.removeItem('auth_token');
                localStorage.removeItem('auth_token_exp');
                localStorage.removeItem('auth_user');
                renderLoggedOutState();
                return;
            }

            const cachedUser = getAuthUser();
            if (cachedUser && cachedUser.id) {
                renderLoggedInState(cachedUser);
                syncServerDataToLocal(cachedUser.id);
                if (typeof window.preloadBackendAndPassedStatusOnStartup === 'function') {
                    window.preloadBackendAndPassedStatusOnStartup();
                }
            } else {
                renderLoggedOutState();
            }
        }
    } else {
        renderLoggedOutState();
    }
}

function renderLoggedInState(user) {
    const container = document.getElementById('account-tab-content');
    if (!container) return;

    const isAdmin = user && (user.role === 'admin' || user.is_admin === 1 || user.is_admin === true || user.id === 1);

    container.innerHTML = `
        <div class="space-y-4 p-2">
            <!-- TABS -->
            <div class="flex border-b border-cyan-500/30 mb-2">
                <button id="subtab-account" class="flex-1 py-2 text-[11px] font-bold text-cyan-400 border-b-2 border-cyan-400 uppercase font-orbitron transition-all" data-i18n="account_info">${t('account_info')}</button>
                <button id="subtab-chat" class="flex-1 py-2 text-[11px] font-bold text-gray-500 hover:text-cyan-300 border-b-2 border-transparent uppercase font-orbitron transition-all" data-i18n="subtab_chat">${t('subtab_chat')}</button>
                ${isAdmin ? `<button id="subtab-manage" class="flex-1 py-2 text-[11px] font-bold text-gray-500 hover:text-cyan-300 border-b-2 border-transparent uppercase font-orbitron transition-all" data-i18n="subtab_manage">${t('subtab_manage')}</button>` : ''}
            </div>
            
            <!-- ACCOUNT SUBTAB CONTENT -->
            <div id="subtab-content-account" class="space-y-4 animate-fade-in">
                <div class="bg-black/40 border border-cyan-500/30 rounded-xl p-6 text-center shadow-lg shadow-cyan-500/10 mt-2">
                    <div class="w-16 h-16 mx-auto bg-cyan-900/50 border-2 border-cyan-400/50 rounded-full flex items-center justify-center mb-4 shadow-[0_0_15px_rgba(34,211,238,0.3)]">
                        <svg class="w-8 h-8 text-cyan-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"></path>
                        </svg>
                    </div>
                    <p class="text-xs text-gray-400 font-orbitron mb-1"><span data-i18n="account_welcome">${t('account_welcome')}</span></p>
                    <h4 class="text-lg font-bold text-cyan-400 font-orbitron uppercase tracking-widest truncate px-2">${user.realname || user.name || user.username || 'PLAYER'}</h4>
                    <p class="text-[11px] text-gray-500 mt-1 font-orbitron truncate px-2">${user.email || ''}</p>
                    
                    <div class="mt-4 pt-4 border-t border-cyan-500/20">
                         <div class="text-[10px] text-gray-500 uppercase tracking-widest font-orbitron mb-1" data-i18n="account_status">${t('account_status')}</div>
                         <div class="text-xs text-green-400 font-bold font-orbitron uppercase tracking-wider animate-pulse" data-i18n="account_online">${t('account_online')}</div>
                    </div>
                </div>

                <button id="btn-edit-info" class="w-full py-3 text-xs font-bold text-yellow-400 border border-yellow-500/30 hover:bg-yellow-950/20 rounded uppercase font-orbitron transition-all mt-4" data-i18n="account_btn_edit">${t('account_btn_edit')}</button>
                <button id="btn-change-password" class="w-full py-3 text-xs font-bold text-purple-400 border border-purple-500/30 hover:bg-purple-950/20 rounded uppercase font-orbitron transition-all mt-2" data-i18n="account_btn_change_password">${t('account_btn_change_password')}</button>
                <button id="btn-switch-account" class="w-full py-3 text-xs font-bold text-cyan-400 border border-cyan-500/30 hover:bg-cyan-950/20 rounded uppercase font-orbitron transition-all mt-2" data-i18n="account_btn_switch">${t('account_btn_switch') || 'CHUYỂN ĐỔI TÀI KHOẢN'}</button>
                <button id="btn-logout" class="w-full py-3 text-xs font-bold text-red-400 border border-red-500/30 hover:bg-red-950/20 rounded uppercase font-orbitron transition-all mt-4" data-i18n="account_logout">${t('account_logout')}</button>
                <button id="btn-delete-account" class="w-full py-3 text-xs font-bold text-red-600 border border-red-600/30 hover:bg-red-950/30 rounded uppercase font-orbitron transition-all mt-2" data-i18n="account_btn_delete_account">${t('account_btn_delete_account')}</button>
            </div>

            <!-- CHAT SUBTAB CONTENT -->
            <div id="subtab-content-chat" class="hidden space-y-4 animate-fade-in mt-2">
                <div class="bg-black/40 border border-cyan-500/30 rounded-xl p-4 min-h-[320px] flex flex-col justify-between shadow-lg shadow-cyan-500/10 mt-2">
                    <!-- Tiêu đề Chat hoặc Quay lại dành cho Admin -->
                    <div id="chat-header-area" class="border-b border-cyan-500/20 pb-2 mb-2 text-center">
                        <span class="text-xs font-bold text-cyan-400 uppercase font-orbitron tracking-wider" data-i18n="chat_system_title">${t('chat_system_title')}</span>
                    </div>

                    <!-- Danh sách phòng chat hoặc các tin nhắn đối thoại -->
                    <div id="chat-body-area" class="flex-1 overflow-y-auto space-y-2 pr-1 text-xs max-h-[220px] min-h-[180px] scrollbar-thin scrollbar-thumb-cyan-500">
                        <p class="text-gray-500 text-center py-4 font-orbitron animate-pulse" data-i18n="chat_connecting">${t('chat_connecting')}</p>
                    </div>

                    <!-- Form nhập nội dung tin nhắn gửi đi kèm đính kèm hình ảnh -->
                    <form id="chat-input-form" class="hidden mt-2 pt-2 border-t border-cyan-500/20 flex flex-col gap-1.5">
                        <div id="chat-image-preview-zone" class="hidden flex items-center gap-2 p-1 bg-cyan-950/20 border border-cyan-500/20 rounded-lg animate-fade-in">
                            <div class="relative w-12 h-12 border border-cyan-400 rounded overflow-hidden flex-shrink-0">
                                <img id="img-chat-preview" class="w-full h-full object-cover" src="" />
                                <button type="button" id="btn-remove-preview-img" class="absolute top-0 right-0 bg-red-600 text-white font-bold text-[9px] w-3.5 h-3.5 flex items-center justify-center rounded-bl hover:bg-red-500 transition-all">×</button>
                            </div>
                            <span class="text-[10px] text-gray-400 truncate flex-1 font-orbitron" id="lbl-preview-filename">image.png</span>
                        </div>

                        <div class="flex gap-2 items-center">
                            <label for="chat-file-uploader" class="cursor-pointer px-2.5 py-2 text-sm text-cyan-400 border border-cyan-500/30 hover:bg-cyan-950/30 rounded-lg transition-all flex items-center justify-center shrink-0" title="Gửi ảnh đính kèm">
                                📷
                            </label>
                            <input type="file" id="chat-file-uploader" accept="image/*" class="hidden" />

                            <input type="text" id="chat-message-input" placeholder="${t('chat_input_placeholder')}" data-i18n-placeholder="chat_input_placeholder" class="flex-1 bg-black/60 border border-cyan-500/30 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-orbitron" autocomplete="off" />
                            <button type="submit" class="w-10 h-8 flex items-center justify-center shrink-0 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-950/30 rounded-lg transition-all" title="${t('chat_btn_send') || 'Send'}">
                                <svg class="w-4 h-4 text-cyan-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"/>
                                </svg>
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- MANAGE SUBTAB CONTENT -->
            ${isAdmin ? `
            <div id="subtab-content-manage" class="hidden space-y-4 animate-fade-in">
                <div class="bg-black/40 border border-pink-500/30 rounded-xl p-4 text-center shadow-lg shadow-pink-500/10 mt-2">
                    <div class="w-12 h-12 mx-auto bg-pink-900/50 border-2 border-pink-400/50 rounded-full flex items-center justify-center mb-3 shadow-[0_0_15px_rgba(236,72,153,0.3)]">
                        <svg class="w-6 h-6 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                    </div>
                    <p class="text-xs text-gray-400 mb-4 font-orbitron" data-i18n="admin_dashboard_tools">${t('admin_dashboard_tools')}</p>
                    <div class="space-y-2">
                        <a href="admin.html" target="_blank" class="w-full block py-3 text-xs font-bold text-white bg-pink-600/80 hover:bg-pink-500 rounded uppercase font-orbitron transition-all shadow-[0_0_10px_rgba(236,72,153,0.3)]">Admin Dashboard</a>
                        <a href="beat_editor.html" target="_blank" class="w-full block py-3 text-xs font-bold text-cyan-400 border border-cyan-500/30 hover:bg-cyan-950/20 rounded uppercase font-orbitron transition-all shadow-[0_0_10px_rgba(6,182,212,0.2)] text-center">Beat Editor Pro</a>
                        <button id="btn-open-admin-modal-inside" class="w-full py-3 text-xs font-bold text-pink-400 border border-pink-500/30 hover:bg-pink-950/20 rounded uppercase font-orbitron transition-all" data-i18n="admin_open_ingame">${t('admin_open_ingame')}</button>
                    </div>
                </div>
            </div>
            ` : ''}
        </div>
    `;

    const subtabAccount = document.getElementById('subtab-account');
    const subtabChat = document.getElementById('subtab-chat');
    const subtabManage = document.getElementById('subtab-manage');

    const subtabContentAccount = document.getElementById('subtab-content-account');
    const subtabContentChat = document.getElementById('subtab-content-chat');
    const subtabContentManage = document.getElementById('subtab-content-manage');

    // Hàm thu hồi dọn dẹp các tab đang active
    const deactivateTabs = () => {
        if (typeof deactivateChat === 'function') {
            deactivateChat();
        }

        [subtabAccount, subtabChat, subtabManage].forEach(tab => {
            if (tab) {
                tab.classList.replace('text-cyan-400', 'text-gray-500');
                tab.classList.replace('border-cyan-400', 'border-transparent');
            }
        });
        [subtabContentAccount, subtabContentChat, subtabContentManage].forEach(content => {
            if (content) content.classList.add('hidden');
        });
    };

    if (subtabAccount) {
        subtabAccount.addEventListener('click', () => {
            deactivateTabs();
            subtabAccount.classList.replace('text-gray-500', 'text-cyan-400');
            subtabAccount.classList.replace('border-transparent', 'border-cyan-400');
            subtabContentAccount.classList.remove('hidden');
        });
    }

    if (subtabChat) {
        subtabChat.addEventListener('click', () => {
            deactivateTabs();
            subtabChat.classList.replace('text-gray-500', 'text-cyan-400');
            subtabChat.classList.replace('border-transparent', 'border-cyan-400');
            subtabContentChat.classList.remove('hidden');
            // Khởi chạy luồng nạp tin nhắn chatroom
            initChatModule(isAdmin, user);
        });
    }

    if (subtabManage) {
        subtabManage.addEventListener('click', () => {
            deactivateTabs();
            subtabManage.classList.replace('text-gray-500', 'text-cyan-400');
            subtabManage.classList.replace('border-transparent', 'border-cyan-400');
            subtabContentManage.classList.remove('hidden');
        });
    }

    if (isAdmin) {
        const btnOpenAdmin = document.getElementById('btn-open-admin-modal-inside');
        if (btnOpenAdmin) {
            btnOpenAdmin.addEventListener('click', () => {
                const adminPanelModal = document.getElementById('admin-panel-modal');
                if (adminPanelModal) {
                    adminPanelModal.style.display = 'flex';
                    const adminAutoplayToggle = document.getElementById('admin-autoplay-toggle');
                    if (adminAutoplayToggle) {
                        adminAutoplayToggle.checked = typeof isAutoplay !== 'undefined' ? isAutoplay : false;
                    }
                    const adminNaturalAutoplayToggle = document.getElementById('admin-natural-autoplay-toggle');
                    if (adminNaturalAutoplayToggle) {
                        adminNaturalAutoplayToggle.checked = typeof isNaturalAutoplay !== 'undefined' ? isNaturalAutoplay : false;
                    }
                    const adminDevModeToggle = document.getElementById('admin-devmode-toggle');
                    if (adminDevModeToggle && typeof window.getDevMode === 'function') {
                        adminDevModeToggle.checked = window.getDevMode();
                    }
                }
            });
        }
    }

    document.getElementById('btn-edit-info').addEventListener('click', () => {
        deactivateTabs();
        renderUpdateInfoState(user);
    });

    document.getElementById('btn-change-password').addEventListener('click', () => {
        deactivateTabs();
        renderChangePasswordState(user);
    });

    document.getElementById('btn-switch-account')?.addEventListener('click', () => {
        deactivateTabs();
        renderSwitchAccountState(user);
    });

    document.getElementById('btn-logout').addEventListener('click', async () => {
        deactivateTabs();
        try {
            await window.ApiService.logout();
        } catch (error) {
        } finally {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('auth_token_exp');
            localStorage.removeItem('auth_user');
            renderLoggedOutState();
        }
    });

    document.getElementById('btn-delete-account')?.addEventListener('click', () => {
        window.showCyberModal({
            title: t('account_delete_confirm_title'),
            message: t('account_delete_confirm_message'),
            type: 'confirm',
            confirmText: activeLang === 'vi' ? 'XÓA' : 'DELETE',
            cancelText: activeLang === 'vi' ? 'HỦY' : 'CANCEL',
            onConfirm: async () => {
                try {
                    await window.ApiService.deleteUser(user.id);
                    window.showCyberModal({
                        title: activeLang === 'vi' ? 'THÀNH CÔNG' : 'SUCCESS',
                        message: t('account_delete_success'),
                        type: 'alert',
                        onConfirm: () => {
                            localStorage.removeItem('auth_token');
                            localStorage.removeItem('auth_token_exp');
                            localStorage.removeItem('auth_user');
                            renderLoggedOutState();
                        }
                    });
                } catch (error) {
                    console.error('[Account] Lỗi xóa tài khoản:', error);
                    window.showCyberModal({
                        title: activeLang === 'vi' ? 'LỖI HỆ THỐNG' : 'SYSTEM ERROR',
                        message: error.response?.data?.message || t('account_delete_error'),
                        type: 'alert'
                    });
                }
            }
        });
    });

    if (typeof applyTranslations === 'function') applyTranslations();
}

function renderUpdateInfoState(user) {
    const container = document.getElementById('account-tab-content');
    if (!container) return;

    container.innerHTML = `
        <div class="space-y-4 p-2">
            <h3 class="text-sm font-black text-cyan-400 font-orbitron uppercase tracking-wider text-center" data-i18n="account_update_info">${t('account_update_info')}</h3>
            <form id="form-update-info" class="space-y-3">
                <div>
                    <label class="text-[10px] text-gray-400 uppercase tracking-widest font-orbitron ml-1" data-i18n="account_username">${t('account_username')}</label>
                    <input type="text" id="update-username" value="${user.username || user.name || ''}" class="w-full bg-black/40 border border-cyan-500/30 rounded-lg py-2.5 px-4 text-xs text-white focus:outline-none focus:border-cyan-400 transition-all font-orbitron" required />
                </div>
                <div>
                    <label class="text-[10px] text-gray-400 uppercase tracking-widest font-orbitron ml-1" data-i18n="account_realname">${t('account_realname')}</label>
                    <input type="text" id="update-realname" value="${user.realname || ''}" class="w-full bg-black/40 border border-cyan-500/30 rounded-lg py-2.5 px-4 text-xs text-white focus:outline-none focus:border-cyan-400 transition-all font-orbitron" />
                </div>
                <div>
                    <label class="text-[10px] text-gray-400 uppercase tracking-widest font-orbitron ml-1" data-i18n="account_email">${t('account_email')}</label>
                    <input type="email" id="update-email" value="${user.email || ''}" class="w-full bg-black/40 border border-cyan-500/30 rounded-lg py-2.5 px-4 text-xs text-white focus:outline-none focus:border-cyan-400 transition-all font-orbitron" required />
                </div>
                <div>
                    <label class="text-[10px] text-gray-400 uppercase tracking-widest font-orbitron ml-1" data-i18n="account_phone">${t('account_phone')}</label>
                    <input type="text" id="update-phone" value="${user.phone || ''}" class="w-full bg-black/40 border border-cyan-500/30 rounded-lg py-2.5 px-4 text-xs text-white focus:outline-none focus:border-cyan-400 transition-all font-orbitron" />
                </div>
                <div class="pt-2 border-t border-cyan-500/20">
                    <label class="text-[10px] text-red-400 uppercase tracking-widest font-orbitron ml-1" data-i18n="account_current_password">${t('account_current_password')}</label>
                    <input type="password" id="update-password" class="w-full bg-black/40 border border-red-500/30 rounded-lg py-2.5 px-4 text-xs text-white focus:outline-none focus:border-red-400 transition-all font-orbitron" required />
                </div>
                <div class="flex gap-2 pt-2">
                    <button type="button" id="btn-cancel-update" class="flex-1 py-2.5 text-xs font-bold text-gray-400 border border-gray-500/30 hover:bg-gray-800/20 rounded uppercase font-orbitron transition-all" data-i18n="btn_cancel">${t('btn_cancel')}</button>
                    <button type="submit" class="flex-1 py-2.5 text-xs font-bold text-cyan-400 border border-cyan-500/30 hover:bg-cyan-950/20 rounded uppercase font-orbitron transition-all" data-i18n="account_update_info">${t('account_update_info')}</button>
                </div>
            </form>
        </div>
    `;

    document.getElementById('btn-cancel-update').addEventListener('click', () => {
        renderLoggedInState(user);
    });

    document.getElementById('form-update-info').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            const response = await window.ApiService.updateUser(user.id, {
                username: document.getElementById('update-username').value,
                name: document.getElementById('update-username').value,
                realname: document.getElementById('update-realname').value,
                email: document.getElementById('update-email').value,
                phone: document.getElementById('update-phone').value,
                current_password: document.getElementById('update-password').value
            });
            showCyberModal({ title: t('account_update_info') || "UPDATE INFO", message: t('account_update_success'), type: 'alert' });
            checkLoginStatus();
        } catch (error) {
            const msg = error.response?.data?.message || t('account_update_error');
            showCyberModal({ title: t('account_update_info') || "UPDATE INFO", message: msg, type: 'alert' });
        }
    });

    if (typeof applyTranslations === 'function') applyTranslations();
}

function renderChangePasswordState(user) {
    const container = document.getElementById('account-tab-content');
    if (!container) return;

    container.innerHTML = `
        <div class="space-y-4 p-2">
            <h3 class="text-sm font-black text-cyan-400 font-orbitron uppercase tracking-wider text-center" data-i18n="account_change_password_title">${t('account_change_password_title')}</h3>
            <form id="form-change-password" class="space-y-3">
                <div>
                    <label class="text-[10px] text-gray-400 uppercase tracking-widest font-orbitron ml-1" data-i18n="account_current_password_label">${t('account_current_password_label')}</label>
                    <input type="password" id="change-current-password" class="w-full bg-black/40 border border-red-500/30 rounded-lg py-2.5 px-4 text-xs text-white focus:outline-none focus:border-red-400 transition-all font-orbitron" required />
                </div>
                <div>
                    <label class="text-[10px] text-gray-400 uppercase tracking-widest font-orbitron ml-1" data-i18n="account_new_password">${t('account_new_password')}</label>
                    <input type="password" id="change-new-password" class="w-full bg-black/40 border border-cyan-500/30 rounded-lg py-2.5 px-4 text-xs text-white focus:outline-none focus:border-cyan-400 transition-all font-orbitron" required minlength="6" />
                </div>
                <div>
                    <label class="text-[10px] text-gray-400 uppercase tracking-widest font-orbitron ml-1" data-i18n="account_new_password_confirm">${t('account_new_password_confirm')}</label>
                    <input type="password" id="change-new-password-confirm" class="w-full bg-black/40 border border-cyan-500/30 rounded-lg py-2.5 px-4 text-xs text-white focus:outline-none focus:border-cyan-400 transition-all font-orbitron" required minlength="6" />
                </div>
                <div class="flex gap-2 pt-2">
                    <button type="button" id="btn-cancel-change-password" class="flex-1 py-2.5 text-xs font-bold text-gray-400 border border-gray-500/30 hover:bg-gray-800/20 rounded uppercase font-orbitron transition-all" data-i18n="btn_cancel">${t('btn_cancel')}</button>
                    <button type="submit" class="flex-1 py-2.5 text-xs font-bold text-purple-400 border border-purple-500/30 hover:bg-purple-950/20 rounded uppercase font-orbitron transition-all" data-i18n="account_btn_change_password">${t('account_btn_change_password')}</button>
                </div>
            </form>
        </div>
    `;

    document.getElementById('btn-cancel-change-password').addEventListener('click', () => {
        renderLoggedInState(user);
    });

    document.getElementById('form-change-password').addEventListener('submit', async (e) => {
        e.preventDefault();

        const current_password = document.getElementById('change-current-password').value;
        const password = document.getElementById('change-new-password').value;
        const password_confirmation = document.getElementById('change-new-password-confirm').value;
        const btnSubmit = e.target.querySelector('button[type="submit"]');

        if (password !== password_confirmation) {
            const msg = t('account_password_mismatch');
            showCyberModal({ title: t('account_change_password_title'), message: msg, type: 'alert' });
            return;
        }

        if (current_password === password) {
            const msg = t('account_password_same_as_current');
            showCyberModal({ title: t('account_change_password_title'), message: msg, type: 'alert' });
            return;
        }

        try {
            btnSubmit.innerText = t('msg_loading');
            btnSubmit.disabled = true;

            await window.ApiService.changePassword({
                current_password,
                password,
                password_confirmation
            });

            showCyberModal({ title: t('account_change_password_title'), message: t('account_change_password_success'), type: 'alert' });
            renderLoggedInState(user);
        } catch (error) {
            const status = error.response?.status;
            const responseData = error.response?.data;
            const looksLikeRawTranslationKey = (str) => typeof str === 'string' && /^[a-z0-9_]+(\.[a-z0-9_]+)+$/i.test(str.trim());

            let msg = t('account_change_password_error');

            if (status === 400) {
                msg = t('account_current_password_incorrect');
            } else if (responseData?.errors) {
                const firstField = Object.keys(responseData.errors)[0];
                const firstMsg = firstField ? responseData.errors[firstField]?.[0] : null;
                if (firstMsg && !looksLikeRawTranslationKey(firstMsg)) msg = firstMsg;
            } else if (responseData?.message && !looksLikeRawTranslationKey(responseData.message)) {
                msg = responseData.message;
            }

            showCyberModal({ title: t('account_change_password_title'), message: msg, type: 'alert' });
        } finally {
            btnSubmit.innerText = t('account_btn_change_password');
            btnSubmit.disabled = false;
        }
    });

    if (typeof applyTranslations === 'function') applyTranslations();
}

function renderSwitchAccountState(currentUser) {
    const container = document.getElementById('account-tab-content');
    if (!container) return;

    // Nếu chưa có danh sách hoặc tài khoản hiện tại chưa nằm trong danh sách, lưu vào
    const currentToken = localStorage.getItem('auth_token');
    const currentTokenExp = localStorage.getItem('auth_token_exp');
    if (currentUser && (currentUser.id || currentUser.email) && currentToken) {
        saveAccountToSavedList(currentUser, currentToken, currentTokenExp);
    }

    const updatedList = getSavedAccounts();

    let listHtml = '';
    if (updatedList.length === 0) {
        listHtml = `<p class="text-xs text-gray-500 text-center py-6 font-orbitron font-bold uppercase" data-i18n="account_switcher_empty">${t('account_switcher_empty') || 'Chưa có tài khoản nào được lưu trên thiết bị này.'}</p>`;
    } else {
        updatedList.forEach(acc => {
            const isActive = currentUser && (
                (currentUser.id && acc.id && String(currentUser.id) === String(acc.id)) ||
                (currentUser.email && acc.email && currentUser.email.toLowerCase() === acc.email.toLowerCase()) ||
                (currentUser.username && acc.username && currentUser.username === acc.username)
            );
            const activeBadgeHtml = isActive ? `
                <span class="px-2.5 py-1 text-[9px] font-bold text-green-400 bg-green-950/60 border border-green-500/40 rounded uppercase font-orbitron tracking-wider" data-i18n="account_switcher_active">${t('account_switcher_active') || 'ĐANG SỬ DỤNG'}</span>
            ` : `
                <button data-id="${acc.id}" class="btn-select-account px-3 py-1.5 text-[10px] font-bold text-cyan-400 border border-cyan-500/40 hover:bg-cyan-900/40 rounded font-orbitron uppercase transition-all shadow-[0_0_8px_rgba(6,182,212,0.2)]" data-i18n="account_switcher_btn_select">
                    ${t('account_switcher_btn_select') || 'CHUYỂN SANG'}
                </button>
            `;

            listHtml += `
                <div class="flex items-center justify-between bg-black/40 border ${isActive ? 'border-cyan-400/60 shadow-[0_0_12px_rgba(34,211,238,0.2)]' : 'border-cyan-500/20'} p-3 rounded-xl transition-all hover:border-cyan-500/40 mb-2">
                    <div class="flex items-center gap-3 min-w-0 pr-2">
                        <div class="w-10 h-10 rounded-full bg-cyan-950/80 border border-cyan-400/40 flex items-center justify-center shrink-0">
                            <svg class="w-5 h-5 text-cyan-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"></path>
                            </svg>
                        </div>
                        <div class="min-w-0">
                            <h4 class="text-xs font-bold text-white font-orbitron truncate uppercase">${acc.username || acc.realname || 'PLAYER'}</h4>
                            <p class="text-[10px] text-gray-400 font-orbitron truncate">${acc.email || ''}</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-2 shrink-0">
                        ${activeBadgeHtml}
                        ${!isActive ? `
                            <button data-id="${acc.id}" class="btn-remove-saved-account p-1 text-gray-500 hover:text-red-400 transition-colors" title="${t('account_switcher_remove_title') || 'Xóa tài khoản khỏi máy'}">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        });
    }

    container.innerHTML = `
        <div class="space-y-4 p-2 animate-fade-in">
            <div class="flex items-center justify-between border-b border-cyan-500/20 pb-3">
                <h3 class="text-xs font-bold text-cyan-400 font-orbitron uppercase tracking-wider flex items-center gap-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path></svg>
                    <span data-i18n="account_switcher_title">${t('account_switcher_title') || 'CHUYỂN ĐỔI TÀI KHOẢN'}</span>
                </h3>
                <button id="btn-back-to-account" class="text-[10px] text-gray-400 hover:text-cyan-300 font-orbitron uppercase transition-colors">← <span data-i18n="btn_back_menu">${t('btn_back_menu') || 'QUAY LẠI'}</span></button>
            </div>

            <div class="space-y-2 max-h-[280px] overflow-y-auto pr-1 custom-scrollbar">
                ${listHtml}
            </div>

            <div class="pt-2 border-t border-cyan-500/20 flex flex-col gap-2">
                <button id="btn-add-account" class="w-full py-2.5 text-xs font-bold text-cyan-400 border border-cyan-500/40 hover:bg-cyan-950/30 rounded-lg uppercase font-orbitron transition-all flex items-center justify-center gap-2 shadow-[0_0_10px_rgba(6,182,212,0.15)]">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                    <span data-i18n="account_switcher_login_other">${t('account_switcher_login_other') || 'ĐĂNG NHẬP TÀI KHOẢN KHÁC'}</span>
                </button>
            </div>
        </div>
    `;

    document.getElementById('btn-back-to-account')?.addEventListener('click', () => {
        const cachedUser = getAuthUser();
        if (cachedUser && (cachedUser.id || cachedUser.email)) {
            renderLoggedInState(cachedUser);
        } else {
            renderLoggedOutState();
        }
    });

    document.getElementById('btn-add-account')?.addEventListener('click', () => {
        const currentToken = localStorage.getItem('auth_token');
        const currentExp = localStorage.getItem('auth_token_exp');
        const currentUser = getAuthUser();
        const prevSession = currentToken ? { token: currentToken, tokenExp: currentExp, user: currentUser } : null;

        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_token_exp');
        localStorage.removeItem('auth_user');
        renderLoggedOutState(true, prevSession);
    });

    // Sự kiện chọn chuyển đổi sang tài khoản khác
    container.querySelectorAll('.btn-select-account').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const rawId = e.currentTarget.dataset.id;
            const savedList = getSavedAccounts();
            const targetAcc = savedList.find(a => String(a.id) === String(rawId));
            if (targetAcc && targetAcc.token) {
                localStorage.setItem('auth_token', targetAcc.token);
                localStorage.setItem('auth_token_exp', targetAcc.tokenExp);
                localStorage.setItem('auth_user', JSON.stringify(targetAcc.user));
                
                // Tự động kéo dữ liệu từ Server của tài khoản vừa chọn về thiết bị (Tránh xung đột/bug với data tài khoản cũ)
                if (targetAcc.user && targetAcc.user.id) {
                    await syncServerDataToLocal(targetAcc.user.id);
                }

                checkLoginStatus();

                if (typeof showCyberModal === 'function') {
                    showCyberModal({
                        title: t('account_switcher_switched_title') || "ĐÃ CHUYỂN TÀI KHOẢN",
                        message: `${t('account_switcher_switched_msg') || 'Đã đăng nhập thành công vào tài khoản'} <strong class="text-cyan-400">${targetAcc.username}</strong>!`,
                        type: 'alert'
                    });
                }
            }
        });
    });

    // Sự kiện xóa tài khoản đã lưu khỏi danh sách thiết bị
    container.querySelectorAll('.btn-remove-saved-account').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const rawId = e.currentTarget.dataset.id;
            removeSavedAccount(rawId);
            renderSwitchAccountState(currentUser);
        });
    });

    if (typeof applyTranslations === 'function') applyTranslations();
}

function renderLoggedOutState(canGoBack = false, previousSession = null) {
    const container = document.getElementById('account-tab-content');
    if (!container) return;

    const savedAccounts = getSavedAccounts();
    const showBack = canGoBack || savedAccounts.length > 0;

    container.innerHTML = `
        <div class="space-y-4 p-2 animate-fade-in">
            <div class="flex items-center justify-between border-b border-cyan-500/20 pb-3">
                <h3 class="text-xs font-bold text-cyan-400 font-orbitron uppercase tracking-wider flex items-center gap-2">
                    <span data-i18n="account_login">${t('account_login')}</span>
                </h3>
                ${showBack ? `
                    <button id="btn-back-from-login" class="text-[10px] text-gray-400 hover:text-cyan-300 font-orbitron uppercase transition-colors">← <span data-i18n="btn_back_menu">${t('btn_back_menu') || 'QUAY LẠI'}</span></button>
                ` : ''}
            </div>

            <form id="form-login" class="space-y-3">
                <div>
                    <input type="text" id="login-username" class="w-full bg-black/40 border border-cyan-500/30 rounded-lg py-2.5 px-4 text-xs text-white focus:outline-none focus:border-cyan-400 transition-all placeholder:text-gray-600 font-orbitron" data-i18n-placeholder="account_username_email" placeholder="${t('account_username_email')}" required />
                </div>
                <div>
                    <input type="password" id="login-password" class="w-full bg-black/40 border border-cyan-500/30 rounded-lg py-2.5 px-4 text-xs text-white focus:outline-none focus:border-cyan-400 transition-all placeholder:text-gray-600 font-orbitron" data-i18n-placeholder="account_password" placeholder="${t('account_password')}" required />
                </div>
                <div class="flex justify-end mt-1">
                    <button type="button" id="btn-forgot-password" class="text-[10px] text-cyan-400 hover:text-cyan-300 font-orbitron underline" data-i18n="forgot_password_link">${t('forgot_password_link')}</button>
                </div>
                <button type="submit" class="w-full py-2.5 text-xs font-bold text-cyan-400 border border-cyan-500/30 hover:bg-cyan-950/20 rounded uppercase font-orbitron transition-all mt-2" data-i18n="account_login">${t('account_login')}</button>
            </form>
            <div class="border-t border-cyan-500/20 pt-4 mt-4 text-center">
                <p class="text-[10px] text-gray-500 mb-2 font-orbitron" data-i18n="account_no_account_yet">${t('account_no_account_yet')}</p>
                <button id="btn-go-register" class="w-full py-2 text-[10px] font-bold text-gray-400 border border-gray-600/30 hover:bg-gray-800/20 rounded uppercase font-orbitron transition-all" data-i18n="account_register">${t('account_register')}</button>
            </div>
        </div>
    `;

    if (showBack) {
        document.getElementById('btn-back-from-login')?.addEventListener('click', () => {
            if (previousSession && previousSession.token) {
                localStorage.setItem('auth_token', previousSession.token);
                localStorage.setItem('auth_token_exp', previousSession.tokenExp);
                localStorage.setItem('auth_user', JSON.stringify(previousSession.user));
                renderSwitchAccountState(previousSession.user);
            } else if (savedAccounts.length > 0) {
                const activeAcc = savedAccounts.find(a => a.token === localStorage.getItem('auth_token')) || savedAccounts[0];
                if (activeAcc && activeAcc.token) {
                    localStorage.setItem('auth_token', activeAcc.token);
                    localStorage.setItem('auth_token_exp', activeAcc.tokenExp);
                    localStorage.setItem('auth_user', JSON.stringify(activeAcc.user));
                    renderSwitchAccountState(activeAcc.user);
                } else {
                    renderSwitchAccountState(null);
                }
            } else {
                checkLoginStatus();
            }
        });
    }

    document.getElementById('form-login').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        try {
            const btnSubmit = e.target.querySelector('button[type="submit"]');
            btnSubmit.innerText = t('msg_loading');
            btnSubmit.disabled = true;

            await window.ApiService.login({ username, password });

            // Lưu thời hạn 30 ngày cho phiên đăng nhập
            const expTime = Date.now() + 30 * 24 * 60 * 60 * 1000;
            localStorage.setItem('auth_token_exp', expTime.toString());

            // Lấy thông tin user
            const response = await window.ApiService.getMe();
            const userData = response.data?.data?.user || response.data?.data || response.data;
            if (userData) {
                localStorage.setItem('auth_user', JSON.stringify(userData));
                const token = localStorage.getItem('auth_token');
                saveAccountToSavedList(userData, token, expTime.toString());
            }

            // Fetch dữ liệu từ server
            let serverScores = [];
            try {
                const scoreRes = await window.ApiService.getScores({ user_id: userData.id, limit: 1000 });
                serverScores = scoreRes.data?.data || scoreRes.data || [];
            } catch (err) { }

            // Đọc dữ liệu local
            let localScores = [];
            try {
                const db = typeof getDB === 'function' ? await getDB() : (typeof initDB === 'function' ? await initDB() : null);
                if (db) {
                    const tx = db.transaction("highScores", "readonly");
                    const store = tx.objectStore("highScores");
                    localScores = await new Promise((resolve) => {
                        const req = store.getAll();
                        req.onsuccess = () => resolve(req.result || []);
                        req.onerror = () => resolve([]);
                    });
                }
            } catch (err) { }

            // Hàm hỗ trợ đồng bộ ngầm lên Server cho cả Normal và Rage Mode
            const syncLocalToRemote = async () => {
                try {
                    for (const s of localScores) {
                        if (typeof playlist !== 'undefined' && playlist[s.songIndex]) {
                            const song = playlist[s.songIndex];
                            if (!song || !song.id) continue;

                            // 1. Đồng bộ Normal Mode
                            let decodedScore = 0;
                            if (typeof s.score === 'number') decodedScore = s.score;
                            else if (s.score) {
                                try {
                                    decodedScore = parseInt(atob(s.score));
                                    if (isNaN(decodedScore)) decodedScore = parseInt(s.score) || 0;
                                } catch (e) { decodedScore = parseInt(s.score) || 0; }
                            }
                            if (decodedScore > 0) {
                                await window.ApiService.postScore({
                                    beatmap_id: song.id,
                                    score: decodedScore,
                                    is_normal_mode_passed: s.isNormalModePassed ? 1 : 0
                                }).catch(() => { });
                            }

                            // 2. Đồng bộ Rage Mode
                            let decodedRageScore = 0;
                            if (typeof s.rageScore === 'number') decodedRageScore = s.rageScore;
                            else if (s.rageScore) {
                                try {
                                    decodedRageScore = parseInt(atob(s.rageScore));
                                    if (isNaN(decodedRageScore)) decodedRageScore = parseInt(s.rageScore) || 0;
                                } catch (e) { decodedRageScore = parseInt(s.rageScore) || 0; }
                            }
                            if (decodedRageScore > 0) {
                                await window.ApiService.postScore({
                                    beatmap_id: song.id,
                                    score: decodedRageScore,
                                    is_hard_mode: 1,
                                    is_hard_mode_passed: s.isRageModePassed ? 1 : 0,
                                    hard_mode: 1,
                                    is_rage_mode: 1,
                                    rage_mode: 1
                                }).catch(() => { });
                            }
                        }
                    }
                } catch (e) { }
            };

            if (serverScores.length > 0) {
                const modalHtml = `
                    <div class="text-left space-y-3 mb-2 mt-2">
                        <p class="text-xs text-gray-300 leading-relaxed">${t('choose_data_source_desc')}</p>
                        <div class="flex gap-2">
                            <div class="flex-1 bg-cyan-950/30 border border-cyan-500/30 p-3 rounded-lg text-center shadow-[0_0_10px_rgba(6,182,212,0.1)]">
                                <h4 class="text-cyan-400 font-bold text-[11px] uppercase tracking-wider" data-i18n="choose_data_from_device">${t('choose_data_from_device')}</h4>
                                <p class="text-[10px] text-gray-400 mt-1.5 uppercase font-orbitron"><span data-i18n="lbl_records">${t('lbl_records')}</span> <span class="text-white font-bold text-xs">${localScores.length}</span></p>
                            </div>
                            <div class="flex-1 bg-pink-950/30 border border-pink-500/30 p-3 rounded-lg text-center shadow-[0_0_10px_rgba(236,72,153,0.1)]">
                                <h4 class="text-pink-400 font-bold text-[11px] uppercase tracking-wider" data-i18n="choose_data_from_server">${t('choose_data_from_server')}</h4>
                                <p class="text-[10px] text-gray-400 mt-1.5 uppercase font-orbitron"><span data-i18n="lbl_records">${t('lbl_records')}</span> <span class="text-white font-bold text-xs">${serverScores.length}</span></p>
                            </div>
                        </div>
                    </div>
                `;

                if (typeof showCyberModal === 'function') {
                    showCyberModal({
                        title: t('choose_data_source_title'),
                        message: modalHtml,
                        type: 'confirm',
                        confirmText: t('btn_use_server'),
                        cancelText: t('btn_use_device'),
                        onConfirm: async () => {
                            try {
                                const db = typeof getDB === 'function' ? await getDB() : await initDB();
                                const tx = db.transaction("highScores", "readwrite");
                                const store = tx.objectStore("highScores");

                                // Gom nhóm các điểm số từ server theo songIndex trước để tránh xung đột ghi/đọc song song của IndexedDB
                                const mergedScores = {};
                                serverScores.forEach(s => {
                                    if (typeof playlist !== 'undefined') {
                                        const songIndex = playlist.findIndex(p => String(p.id) === String(s.beatmap_id) || String(p.id) === String(s.song_id));
                                        if (songIndex !== -1) {
                                            const isHard = s.is_hard_mode || s.hard_mode || s.is_rage_mode || s.rage_mode;
                                            if (!mergedScores[songIndex]) {
                                                mergedScores[songIndex] = {
                                                    normalScore: 0,
                                                    normalPassed: false,
                                                    rageScore: 0,
                                                    ragePassed: false
                                                };
                                            }

                                            const rawPassed = s.is_normal_mode_passed ?? s.is_normal_passed ?? s.is_passed ?? s.isNormalModePassed ?? s.isNormalPassed ?? s.normal_passed;
                                            const isNormalPassed = Boolean(rawPassed) || Number(rawPassed) === 1 || String(rawPassed) === '1' || String(rawPassed).toLowerCase() === 'true' || rawPassed === true;

                                            if (isHard) {
                                                if (s.score > mergedScores[songIndex].rageScore) {
                                                    mergedScores[songIndex].rageScore = s.score;
                                                }
                                                if (isNormalPassed) {
                                                    mergedScores[songIndex].ragePassed = true;
                                                }
                                            } else {
                                                if (s.score > mergedScores[songIndex].normalScore) {
                                                    mergedScores[songIndex].normalScore = s.score;
                                                }
                                                if (isNormalPassed) {
                                                    mergedScores[songIndex].normalPassed = true;
                                                }
                                            }
                                        }
                                    }
                                });

                                // Sau đó ghi một lần duy nhất cho mỗi songIndex vào IndexedDB
                                Object.keys(mergedScores).forEach(songIdxStr => {
                                    const songIdx = parseInt(songIdxStr);
                                    const ms = mergedScores[songIdx];
                                    
                                    const req = store.get(songIdx);
                                    req.onsuccess = () => {
                                        const existing = req.result || { songIndex: songIdx };
                                        
                                        // Cập nhật Normal score
                                        if (ms.normalScore > 0) {
                                             let currentNormal = 0;
                                             if (existing.score) {
                                                 try { currentNormal = parseInt(atob(existing.score)) || 0; } catch(e) {}
                                             }
                                             if (ms.normalScore > currentNormal) {
                                                 existing.score = btoa(ms.normalScore.toString());
                                             }
                                        }
                                        if (ms.normalPassed) {
                                             existing.isNormalModePassed = true;
                                        }

                                        // Cập nhật Rage score
                                        if (ms.rageScore > 0) {
                                             let currentRage = 0;
                                             if (existing.rageScore) {
                                                 try { currentRage = parseInt(atob(existing.rageScore)) || 0; } catch(e) {}
                                             }
                                             if (ms.rageScore > currentRage) {
                                                 existing.rageScore = btoa(ms.rageScore.toString());
                                             }
                                        }
                                        if (ms.ragePassed) {
                                             existing.isRageModePassed = true;
                                        }

                                        store.put(existing);
                                    };
                                });
                            } catch (e) { }
                            checkLoginStatus();
                        },
                        onCancel: async () => {
                            syncLocalToRemote();
                            checkLoginStatus();
                        }
                    });
                } else checkLoginStatus();
            } else {
                syncLocalToRemote();
                showCyberModal({ title: t('account_login') || "LOGIN", message: t('account_login_success'), type: 'alert' });
                checkLoginStatus();
            }
        } catch (error) {
            const responseData = error.response?.data || {};
            // Quét sâu hơn trong JSON phản hồi từ Laravel để bắt dính lỗi cấm (Ban)
            const isBanned = findKeyDeep(responseData, 'is_banned') === true ||
                findKeyDeep(responseData, 'is_banned') == 1 ||
                (findKeyDeep(responseData, 'banned_until') !== null && findKeyDeep(responseData, 'banned_until') !== undefined) ||
                responseData.message?.toLowerCase().includes('ban');

            if (isBanned) {
                handleBannedError(error);
            } else {
                const msg = responseData.message || t('account_login_error');
                showCyberModal({ title: t('account_login') || "LOGIN", message: msg, type: 'alert' });
            }
        } finally {
            const btnSubmit = e.target.querySelector('button[type="submit"]');
            if (btnSubmit) {
                btnSubmit.innerText = t('account_login');
                btnSubmit.disabled = false;
            }
        }
    });

    document.getElementById('btn-forgot-password').addEventListener('click', () => {
        renderForgotPasswordState();
    });

    document.getElementById('btn-go-register').addEventListener('click', () => {
        renderRegisterState();
    });

    if (typeof applyTranslations === 'function') applyTranslations();
}

function renderRegisterState() {
    const container = document.getElementById('account-tab-content');
    if (!container) return;

    container.innerHTML = `
        <div class="space-y-4 p-2 animate-fade-in">
            <div class="flex items-center justify-between border-b border-cyan-500/20 pb-3">
                <h3 class="text-xs font-bold text-cyan-400 font-orbitron uppercase tracking-wider flex items-center gap-2">
                    <span data-i18n="account_register">${t('account_register')}</span>
                </h3>
                <button id="btn-back-from-register" class="text-[10px] text-gray-400 hover:text-cyan-300 font-orbitron uppercase transition-colors">← <span data-i18n="btn_back_menu">${t('btn_back_menu') || 'QUAY LẠI'}</span></button>
            </div>
            <form id="form-register" class="space-y-3">
                <div>
                    <input type="text" id="register-username" class="w-full bg-black/40 border border-cyan-500/30 rounded-lg py-2.5 px-4 text-xs text-white focus:outline-none focus:border-cyan-400 transition-all placeholder:text-gray-600 font-orbitron" data-i18n-placeholder="account_username" placeholder="${t('account_username')}" required />
                </div>
                <div>
                    <input type="email" id="register-email" class="w-full bg-black/40 border border-cyan-500/30 rounded-lg py-2.5 px-4 text-xs text-white focus:outline-none focus:border-cyan-400 transition-all placeholder:text-gray-600 font-orbitron" data-i18n-placeholder="account_email" placeholder="${t('account_email')}" required />
                </div>
                <div>
                    <input type="password" id="register-password" class="w-full bg-black/40 border border-cyan-500/30 rounded-lg py-2.5 px-4 text-xs text-white focus:outline-none focus:border-cyan-400 transition-all placeholder:text-gray-600 font-orbitron" data-i18n-placeholder="account_password" placeholder="${t('account_password')}" required />
                </div>
                <button type="submit" class="w-full py-2.5 text-xs font-bold text-cyan-400 border border-cyan-500/30 hover:bg-cyan-950/20 rounded uppercase font-orbitron transition-all mt-2" data-i18n="account_register">${t('account_register')}</button>
            </form>
            <div class="border-t border-cyan-500/20 pt-4 mt-4 text-center">
                <p class="text-[10px] text-gray-500 mb-2 font-orbitron" data-i18n="account_no_account_yet">${t('account_no_account_yet')}</p>
                <button id="btn-go-login" class="w-full py-2 text-[10px] font-bold text-gray-400 border border-gray-600/30 hover:bg-gray-800/20 rounded uppercase font-orbitron transition-all" data-i18n="account_login">${t('account_login')}</button>
            </div>
        </div>
    `;

    document.getElementById('form-register').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('register-username').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const btnSubmit = e.target.querySelector('button[type="submit"]');

        try {
            btnSubmit.innerText = t('msg_loading');
            btnSubmit.disabled = true;

            // 1. Đăng ký tài khoản mới
            await window.ApiService.register({ username: username, name: username, email, password });

            // 2. Tự động đăng nhập ngay sau khi đăng ký thành công
            await window.ApiService.login({ username: email, password: password });

            // 3. Xử lý logic sau đăng nhập
            const expTime = Date.now() + 30 * 24 * 60 * 60 * 1000;
            localStorage.setItem('auth_token_exp', expTime.toString());

            const response = await window.ApiService.getMe();
            const userData = response.data?.data?.user || response.data?.data || response.data;
            if (userData) localStorage.setItem('auth_user', JSON.stringify(userData));

            let serverScores = [];
            try {
                const scoreRes = await window.ApiService.getScores({ user_id: userData.id, limit: 1000 });
                serverScores = scoreRes.data?.data || scoreRes.data || [];
            } catch (err) { }

            let localScores = [];
            try {
                const db = typeof getDB === 'function' ? await getDB() : (typeof initDB === 'function' ? await initDB() : null);
                if (db) {
                    const tx = db.transaction("highScores", "readonly");
                    const store = tx.objectStore("highScores");
                    localScores = await new Promise((resolve) => {
                        const req = store.getAll();
                        req.onsuccess = () => resolve(req.result || []);
                        req.onerror = () => resolve([]);
                    });
                }
            } catch (err) { }

            const syncLocalToRemote = async () => {
                try {
                    for (const s of localScores) {
                        if (typeof playlist !== 'undefined' && playlist[s.songIndex]) {
                            const song = playlist[s.songIndex];
                            if (!song || !song.id) continue;

                            // 1. Đồng bộ Normal Mode
                            let decodedScore = 0;
                            if (typeof s.score === 'number') decodedScore = s.score;
                            else if (s.score) {
                                try {
                                    decodedScore = parseInt(atob(s.score));
                                    if (isNaN(decodedScore)) decodedScore = parseInt(s.score) || 0;
                                } catch (e) { decodedScore = parseInt(s.score) || 0; }
                            }
                            if (decodedScore > 0) {
                                await window.ApiService.postScore({
                                    beatmap_id: song.id,
                                    score: decodedScore,
                                    is_normal_mode_passed: s.isNormalModePassed ? 1 : 0
                                }).catch(() => { });
                            }

                            // 2. Đồng bộ Rage Mode
                            let decodedRageScore = 0;
                            if (typeof s.rageScore === 'number') decodedRageScore = s.rageScore;
                            else if (s.rageScore) {
                                try {
                                    decodedRageScore = parseInt(atob(s.rageScore));
                                    if (isNaN(decodedRageScore)) decodedRageScore = parseInt(s.rageScore) || 0;
                                } catch (e) { decodedRageScore = parseInt(s.rageScore) || 0; }
                            }
                            if (decodedRageScore > 0) {
                                await window.ApiService.postScore({
                                    beatmap_id: song.id,
                                    score: decodedRageScore,
                                    is_hard_mode: 1,
                                    is_hard_mode_passed: s.isRageModePassed ? 1 : 0,
                                    hard_mode: 1,
                                    is_rage_mode: 1,
                                    rage_mode: 1
                                }).catch(() => { });
                            }
                        }
                    }
                } catch (e) { }
            };

            syncLocalToRemote();
            showCyberModal({ title: t('account_register') || "REGISTER", message: t('account_register_success'), type: 'alert' });
            checkLoginStatus();

        } catch (error) {
            const responseData = error.response?.data || {};
            const isBanned = findKeyDeep(responseData, 'is_banned') === true ||
                findKeyDeep(responseData, 'is_banned') == 1 ||
                (findKeyDeep(responseData, 'banned_until') !== null && findKeyDeep(responseData, 'banned_until') !== undefined) ||
                responseData.message?.toLowerCase().includes('ban');

            if (isBanned) {
                handleBannedError(error);
            } else {
                const msg = responseData.message || t('account_register_error');
                showCyberModal({ title: t('account_register') || "REGISTER", message: msg, type: 'alert' });
            }
        } finally {
            if (btnSubmit) {
                btnSubmit.innerText = t('account_register');
                btnSubmit.disabled = false;
            }
        }
    });

    document.getElementById('btn-go-login').addEventListener('click', () => {
        renderLoggedOutState();
    });

    document.getElementById('btn-back-from-register')?.addEventListener('click', () => {
        renderLoggedOutState();
    });

    if (typeof applyTranslations === 'function') applyTranslations();
}

function renderForgotPasswordState() {
    const container = document.getElementById('account-tab-content');
    if (!container) return;

    container.innerHTML = `
        <div class="space-y-4 p-2">
            <h3 class="text-sm font-black text-cyan-400 font-orbitron uppercase tracking-wider text-center" data-i18n="forgot_pass_title">${t('forgot_pass_title')}</h3>
            <form id="form-forgot-password" class="space-y-3">
                <p class="text-[11px] text-gray-400 text-center font-orbitron mb-2" data-i18n="forgot_pass_desc">${t('forgot_pass_desc')}</p>
                <div>
                    <input type="email" id="forgot-email" class="w-full bg-black/40 border border-cyan-500/30 rounded-lg py-2.5 px-4 text-xs text-white focus:outline-none focus:border-cyan-400 transition-all placeholder:text-gray-600 font-orbitron" data-i18n-placeholder="forgot_email_placeholder" placeholder="${t('forgot_email_placeholder')}" required />
                </div>
                <button type="submit" class="w-full py-2.5 text-xs font-bold text-cyan-400 border border-cyan-500/30 hover:bg-cyan-950/20 rounded uppercase font-orbitron transition-all mt-2" data-i18n="forgot_btn_send">${t('forgot_btn_send')}</button>
            </form>
            <div class="border-t border-cyan-500/20 pt-4 mt-4 text-center">
                <button id="btn-back-login" class="w-full py-2 text-[10px] font-bold text-gray-400 border border-gray-600/30 hover:bg-gray-800/20 rounded uppercase font-orbitron transition-all" data-i18n="account_login">${t('account_login')}</button>
            </div>
            <div class="text-center mt-2">
                <button id="btn-have-token" type="button" class="text-[10px] text-cyan-400 hover:text-cyan-300 font-orbitron underline" data-i18n="forgot_btn_have_token">${t('forgot_btn_have_token')}</button>
            </div>
        </div>
    `;

    document.getElementById('form-forgot-password').addEventListener('submit', async (e) => {
        e.preventDefault();
        const emailInput = document.getElementById('forgot-email');
        const email = emailInput ? emailInput.value.trim() : '';
        const btnSubmit = e.target.querySelector('button[type="submit"]');

        if (!email) return;

        try {
            btnSubmit.innerText = t('forgot_btn_sending');
            btnSubmit.disabled = true;

            // Gọi API yêu cầu cấp mã OTP qua email
            await window.ApiService.forgotPassword({ email });

            showCyberModal({ title: t('forgot_pass_title'), message: t('forgot_send_success'), type: 'alert' });
            
            // Chuyển tiếp sang màn hình Reset mật khẩu đồng thời truyền sẵn email vừa nhập qua
            renderResetPasswordState(email, "");
        } catch (error) {
            const msg = error.response?.data?.message || t('forgot_send_error');
            showCyberModal({ title: t('error_title'), message: msg, type: 'alert' });
        } finally {
            btnSubmit.innerText = t('forgot_btn_send');
            btnSubmit.disabled = false;
        }
    });

    document.getElementById('btn-back-login').addEventListener('click', () => {
        renderLoggedOutState();
    });

    document.getElementById('btn-have-token').addEventListener('click', () => {
        renderResetPasswordState("", "");
    });

    if (typeof applyTranslations === 'function') applyTranslations();
}

function renderResetPasswordState(prefillEmail = "", prefillToken = "") {
    const container = document.getElementById('account-tab-content');
    if (!container) return;

    container.innerHTML = `
        <div class="space-y-4 p-2">
            <h3 class="text-sm font-black text-cyan-400 font-orbitron uppercase tracking-wider text-center" data-i18n="reset_pass_title">${t('reset_pass_title')}</h3>
            <form id="form-reset-password" class="space-y-3">
                <p class="text-[11px] text-gray-400 text-center font-orbitron mb-2" data-i18n="reset_pass_desc">${t('reset_pass_desc')}</p>
                <div>
                    <input type="email" id="reset-email" value="${prefillEmail}" class="w-full bg-black/40 border border-cyan-500/30 rounded-lg py-2.5 px-4 text-xs text-white focus:outline-none focus:border-cyan-400 transition-all placeholder:text-gray-600 font-orbitron" data-i18n-placeholder="reset_email_placeholder" placeholder="${t('reset_email_placeholder')}" required />
                </div>
                <div>
                    <input type="text" id="reset-token" value="${prefillToken}" class="w-full bg-black/40 border border-cyan-500/30 rounded-lg py-2.5 px-4 text-xs text-white focus:outline-none focus:border-cyan-400 transition-all placeholder:text-gray-600 font-orbitron" data-i18n-placeholder="reset_token_placeholder" placeholder="${t('reset_token_placeholder')}" required />
                </div>
                <div>
                    <input type="password" id="reset-password" class="w-full bg-black/40 border border-cyan-500/30 rounded-lg py-2.5 px-4 text-xs text-white focus:outline-none focus:border-cyan-400 transition-all placeholder:text-gray-600 font-orbitron" data-i18n-placeholder="reset_password_placeholder" placeholder="${t('reset_password_placeholder')}" required />
                </div>
                <div>
                    <input type="password" id="reset-password-confirm" class="w-full bg-black/40 border border-cyan-500/30 rounded-lg py-2.5 px-4 text-xs text-white focus:outline-none focus:border-cyan-400 transition-all placeholder:text-gray-600 font-orbitron" data-i18n-placeholder="reset_password_confirm_placeholder" placeholder="${t('reset_password_confirm_placeholder')}" required />
                </div>
                <button type="submit" class="w-full py-2.5 text-xs font-bold text-cyan-400 border border-cyan-500/30 hover:bg-cyan-950/20 rounded uppercase font-orbitron transition-all mt-2" data-i18n="reset_pass_title">${t('reset_pass_title')}</button>
            </form>
            <div class="border-t border-cyan-500/20 pt-4 mt-4 text-center">
                <button id="btn-back-login" class="w-full py-2 text-[10px] font-bold text-gray-400 border border-gray-600/30 hover:bg-gray-800/20 rounded uppercase font-orbitron transition-all" data-i18n="account_login">${t('account_login')}</button>
            </div>
        </div>
    `;

    document.getElementById('form-reset-password').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('reset-email').value.trim();
        const token = document.getElementById('reset-token').value.trim();
        const password = document.getElementById('reset-password').value;
        const password_confirmation = document.getElementById('reset-password-confirm').value;
        const btnSubmit = e.target.querySelector('button[type="submit"]');

        try {
            btnSubmit.innerText = t('reset_btn_submitting');
            btnSubmit.disabled = true;

            // Đồng bộ tên trường: Gán 'token' ở giao diện vào khóa 'otp' để gửi về Laravel
            await window.ApiService.resetPassword({
                email,
                otp: token, 
                password,
                password_confirmation
            });

            showCyberModal({ title: t('success_title'), message: t('reset_success'), type: 'alert' });
            
            // Đổi mật khẩu thành công, quay về giao diện Đăng nhập
            renderLoggedOutState();
        } catch (error) {
            const msg = error.response?.data?.message || t('reset_error');
            showCyberModal({ title: t('error_title'), message: msg, type: 'alert' });
        } finally {
            btnSubmit.innerText = t('reset_pass_title');
            btnSubmit.disabled = false;
        }
    });

    document.getElementById('btn-back-login').addEventListener('click', () => {
        renderLoggedOutState();
    });

    if (typeof applyTranslations === 'function') applyTranslations();
}
