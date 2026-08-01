// ============================================================
//  chat.js — Xử lý Logic Giao diện & Tích hợp API Chat Hỗ trợ
// ============================================================

// Các biến toàn cục điều phối trạng thái chat
let currentActiveRoomId = null;
let chatIntervalTimer = null;
let activeAdminFilter = 'all'; // Trạng thái bộ lọc của Admin: 'all', 'pending', 'open', 'resolved', 'closed'

// Hàm thu hồi dọn dẹp chat khi chuyển Tab
function deactivateChat() {
    if (chatIntervalTimer) {
        clearInterval(chatIntervalTimer);
        chatIntervalTimer = null;
    }
    currentActiveRoomId = null;
}

async function initChatModule(isAdmin, currentUser) {
    if (chatIntervalTimer) clearInterval(chatIntervalTimer);
    currentActiveRoomId = null;

    const bodyArea = document.getElementById('chat-body-area');
    const headerArea = document.getElementById('chat-header-area');
    const inputForm = document.getElementById('chat-input-form');

    inputForm.classList.add('hidden');

    if (isAdmin) {
        // LUỒNG ADMIN: Hiển thị toàn bộ yêu cầu liên hệ từ người chơi kèm phân loại bộ lọc status
        await loadAdminChatRooms();
    } else {
        // LUỒNG NGƯỜI CHƠI: Chat hỗ trợ, cho phép chọn chủ đề lỗi phù hợp với validate của Laravel
        let activeRoomId = localStorage.getItem('active_support_room_id');

        bodyArea.innerHTML = `<p class="text-center text-gray-500 py-4 font-orbitron animate-pulse" data-i18n="chat_restoring">${t('chat_restoring')}</p>`;
        if (typeof applyTranslations === 'function') applyTranslations();

        // [NÂNG CẤP ĐỒNG BỘ SERVER]: Tự động gửi request lấy danh sách phòng chat của người dùng này từ Laravel Backend.
        try {
            if (window.ApiService) {
                const syncResponse = await window.ApiService.getChatRooms();
                const serverRooms = syncResponse.data?.data || syncResponse.data || [];
                // Lọc phòng chat bất kỳ có trạng thái khác 'resolved' (giải quyết) và khác 'closed' (đóng)
                const activeServerRoom = serverRooms.find(r => r.status !== 'resolved' && r.status !== 'closed');
                if (activeServerRoom) {
                    activeRoomId = activeServerRoom.id;
                    localStorage.setItem('active_support_room_id', activeRoomId);
                }
            }
        } catch (syncErr) {
            console.warn("[Chat Sync] Không đồng bộ được danh sách phòng từ server, sử dụng fallback cache cũ:", syncErr);
        }

        if (activeRoomId) {
            try {
                const res = await window.ApiService.getChatRoom(activeRoomId);
                const room = res.data?.data || res.data;

                // KIỂM TRA TRẠNG THÁI: Chỉ khôi phục trực tiếp nếu cuộc chat chưa hoàn thành (chưa đóng/chưa giải quyết xong)
                if (room && room.id && room.status !== 'resolved' && room.status !== 'closed') {
                    currentActiveRoomId = room.id;
                    renderUserChatHeader(room);
                    inputForm.classList.remove('hidden');

                    await loadConversationMessages();
                    chatIntervalTimer = setInterval(loadConversationMessages, 3000);
                    return;
                } else {
                    // Nếu cuộc chat cũ đã được đánh dấu giải quyết hoặc đã đóng, dọn khỏi cache
                    localStorage.removeItem('active_support_room_id');
                }
            } catch (err) {
                // Nếu phòng đã bị xóa hoặc lỗi, hủy ID cũ để người chơi tạo phòng mới
                localStorage.removeItem('active_support_room_id');
            }
        }

        // Render giao diện chọn chủ đề lỗi để bắt đầu
        renderSupportCategorySelection(currentUser);
    }
}

function renderSupportCategorySelection(currentUser) {
    const bodyArea = document.getElementById('chat-body-area');
    const headerArea = document.getElementById('chat-header-area');
    const inputForm = document.getElementById('chat-input-form');

    headerArea.innerHTML = `<span class="text-xs font-bold text-cyan-400 font-orbitron uppercase tracking-wider" data-i18n="chat_system_title">${t('chat_system_title')}</span>`;
    inputForm.classList.add('hidden');

    bodyArea.innerHTML = `
        <div class="space-y-2.5 p-1 animate-fade-in text-center">
            <p class="text-[10px] text-gray-400 font-orbitron leading-relaxed mb-2" data-i18n="chat_select_category_desc">${t('chat_select_category_desc')}</p>
            <div class="grid grid-cols-1 gap-1.5 max-h-[190px] overflow-y-auto">
                <button class="btn-chat-type-select text-left p-2 bg-black/60 border border-cyan-500/20 hover:border-cyan-400 rounded-lg text-xs text-gray-300 font-orbitron transition-all flex items-center gap-2 group" data-type="technical">
                    <span class="text-cyan-400 group-hover:scale-110 transition-transform">🛠️</span>
                    <span data-i18n="chat_cat_technical">${t('chat_cat_technical')}</span>
                </button>
                <button class="btn-chat-type-select text-left p-2 bg-black/60 border border-cyan-500/20 hover:border-cyan-400 rounded-lg text-xs text-gray-300 font-orbitron transition-all flex items-center gap-2 group" data-type="account_issue">
                    <span class="text-cyan-400 group-hover:scale-110 transition-transform">🛡️</span>
                    <span data-i18n="chat_cat_account_issue">${t('chat_cat_account_issue')}</span>
                </button>
                <button class="btn-chat-type-select text-left p-2 bg-black/60 border border-cyan-500/20 hover:border-cyan-400 rounded-lg text-xs text-gray-300 font-orbitron transition-all flex items-center gap-2 group" data-type="forgot_password">
                    <span class="text-cyan-400 group-hover:scale-110 transition-transform">🔑</span>
                    <span data-i18n="chat_cat_forgot_password">${t('chat_cat_forgot_password')}</span>
                </button>
                <button class="btn-chat-type-select text-left p-2 bg-black/60 border border-cyan-500/20 hover:border-cyan-400 rounded-lg text-xs text-gray-300 font-orbitron transition-all flex items-center gap-2 group" data-type="change_password">
                    <span class="text-cyan-400 group-hover:scale-110 transition-transform">⚙️</span>
                    <span data-i18n="chat_cat_change_password">${t('chat_cat_change_password')}</span>
                </button>
                <button class="btn-chat-type-select text-left p-2 bg-black/60 border border-cyan-500/20 hover:border-cyan-400 rounded-lg text-xs text-gray-300 font-orbitron transition-all flex items-center gap-2 group" data-type="delete_account">
                    <span class="text-cyan-400 group-hover:scale-110 transition-transform">⚠️</span>
                    <span data-i18n="chat_cat_delete_account">${t('chat_cat_delete_account')}</span>
                </button>
            </div>
        </div>
    `;

    bodyArea.querySelectorAll('.btn-chat-type-select').forEach(btn => {
        btn.addEventListener('click', async () => {
            const selectedType = btn.getAttribute('data-type');
            await startSupportSession(selectedType, currentUser);
        });
    });

    if (typeof applyTranslations === 'function') applyTranslations();
}

async function startSupportSession(type, currentUser) {
    const bodyArea = document.getElementById('chat-body-area');
    const inputForm = document.getElementById('chat-input-form');

    bodyArea.innerHTML = `<p class="text-center text-gray-500 py-6 font-orbitron animate-pulse" data-i18n="chat_connecting_support">${t('chat_connecting_support')}</p>`;
    if (typeof applyTranslations === 'function') applyTranslations();

    try {
        const res = await window.ApiService.createChatRoom({
            type: type,
            title: `Support: ${currentUser.username || currentUser.name || 'Player'}`
        });
        const room = res.data?.data || res.data;
        if (room && room.id) {
            currentActiveRoomId = room.id;
            localStorage.setItem('active_support_room_id', room.id);
            renderUserChatHeader(room);
            inputForm.classList.remove('hidden');

            await loadConversationMessages();
            chatIntervalTimer = setInterval(loadConversationMessages, 3000);
        } else {
            bodyArea.innerHTML = `<p class="text-center text-red-400 py-4 font-orbitron" data-i18n="chat_init_failed">${t('chat_init_failed')}</p>`;
            if (typeof applyTranslations === 'function') applyTranslations();
            setTimeout(() => renderSupportCategorySelection(currentUser), 2000);
        }
    } catch (err) {
        bodyArea.innerHTML = `<p class="text-center text-red-400 py-4 font-orbitron" data-i18n="chat_cannot_connect">${t('chat_cannot_connect')}</p>`;
        if (typeof applyTranslations === 'function') applyTranslations();
        setTimeout(() => renderSupportCategorySelection(currentUser), 2000);
    }
}

function renderUserChatHeader(room) {
    const headerArea = document.getElementById('chat-header-area');
    const labels = {
        'technical': 'chat_header_technical',
        'account_issue': 'chat_header_account_issue',
        'forgot_password': 'chat_header_forgot_password',
        'change_password': 'chat_header_change_password',
        'delete_account': 'chat_header_delete_account'
    };
    const key = labels[room.type] || 'chat_header_support';

    headerArea.innerHTML = `
        <div class="flex justify-between items-center px-1">
            <span class="text-[10px] font-bold text-cyan-400 font-orbitron" data-i18n="${key}">${t(key)}</span>
            <span class="text-xs font-bold text-gray-300 font-orbitron truncate max-w-[130px]">${room.title || 'Support'}</span>
            <button id="btn-user-new-ticket" class="text-[9px] text-red-400 border border-red-500/20 hover:border-red-400 rounded px-1.5 py-0.5 font-orbitron transition-all" data-i18n="chat_new_request">${t('chat_new_request')}</button>
        </div>
    `;

    document.getElementById('btn-user-new-ticket').addEventListener('click', () => {
        showCyberModal({
            title: t('chat_new_request') || "NEW REQUEST",
            message: t('chat_confirm_new_request') || "Bạn có muốn đóng cuộc trò chuyện hiện tại để bắt đầu một yêu cầu hỗ trợ mới?",
            type: 'confirm',
            confirmText: t('btn_confirm') || 'OK',
            cancelText: t('btn_cancel') || 'Cancel',
            onConfirm: () => {
                if (chatIntervalTimer) clearInterval(chatIntervalTimer);
                localStorage.removeItem('active_support_room_id');
                currentActiveRoomId = null;
                const currentUser = getAuthUser();
                initChatModule(false, currentUser);
            }
        });
    });

    if (typeof applyTranslations === 'function') applyTranslations();
}

async function loadAdminChatRooms() {
    const bodyArea = document.getElementById('chat-body-area');
    const headerArea = document.getElementById('chat-header-area');

    // Render thanh tab lọc trạng thái Ticket ở đầu
    headerArea.innerHTML = `
        <div class="flex flex-col space-y-1.5 pb-1">
            <span class="text-xs font-bold text-pink-400 font-orbitron uppercase tracking-wider" data-i18n="chat_admin_mailbox">${t('chat_admin_mailbox')}</span>
            <div class="flex justify-center gap-1 text-[8px] font-orbitron">
                <button class="admin-filter-pill px-1.5 py-0.5 rounded border transition-all ${activeAdminFilter === 'all' ? 'bg-pink-950/40 text-pink-400 border-pink-500/40 font-black' : 'bg-transparent text-gray-500 border-transparent hover:text-gray-300'}" data-filter="all" data-i18n="chat_filter_all">${t('chat_filter_all')}</button>
                <button class="admin-filter-pill px-1.5 py-0.5 rounded border transition-all ${activeAdminFilter === 'pending' ? 'bg-yellow-950/40 text-yellow-500 border-yellow-500/40 font-black' : 'bg-transparent text-gray-500 border-transparent hover:text-gray-300'}" data-filter="pending" data-i18n="chat_filter_pending">${t('chat_filter_pending')}</button>
                <button class="admin-filter-pill px-1.5 py-0.5 rounded border transition-all ${activeAdminFilter === 'open' ? 'bg-green-950/40 text-green-400 border-green-500/40 font-black' : 'bg-transparent text-gray-500 border-transparent hover:text-gray-300'}" data-filter="open" data-i18n="chat_filter_open">${t('chat_filter_open')}</button>
                <button class="admin-filter-pill px-1.5 py-0.5 rounded border transition-all ${activeAdminFilter === 'resolved' ? 'bg-blue-950/40 text-blue-400 border-blue-500/40 font-black' : 'bg-transparent text-gray-500 border-transparent hover:text-gray-300'}" data-filter="resolved" data-i18n="chat_filter_resolved">${t('chat_filter_resolved')}</button>
            </div>
        </div>
    `;

    // Ủy quyền sự kiện chuyển đổi bộ lọc
    headerArea.querySelectorAll('.admin-filter-pill').forEach(btn => {
        btn.addEventListener('click', async () => {
            activeAdminFilter = btn.getAttribute('data-filter');
            await loadAdminChatRooms();
        });
    });

    try {
        const params = {};
        if (activeAdminFilter !== 'all') {
            params.status = activeAdminFilter;
        }

        const res = await window.ApiService.getAdminChatRooms(params);
        const rooms = res.data?.data || res.data || [];

        if (rooms.length === 0) {
            bodyArea.innerHTML = `<p class="text-center text-gray-500 py-6 font-orbitron" data-i18n="chat_no_request_category">${t('chat_no_request_category')}</p>`;
            if (typeof applyTranslations === 'function') applyTranslations();
            return;
        }

        bodyArea.innerHTML = '';
        rooms.forEach(room => {
            const roomBtn = document.createElement('div');
            roomBtn.className = "p-2 bg-black/60 border border-pink-500/20 hover:border-pink-400 rounded-lg cursor-pointer transition-all flex justify-between items-center group mb-1.5 text-left";

            const statusStyles = {
                'pending': 'bg-yellow-950/40 text-yellow-500 border-yellow-500/30',
                'open': 'bg-green-950/40 text-green-500 border-green-500/30',
                'resolved': 'bg-blue-950/40 text-blue-400 border-blue-500/30',
                'closed': 'bg-zinc-800 text-gray-500 border-zinc-700'
            };
            const statusStyle = statusStyles[room.status] || 'bg-zinc-800 text-gray-400 border-zinc-700';

            roomBtn.innerHTML = `
                <div class="truncate pr-2 flex-1">
                    <div class="flex items-center gap-1.5">
                        <span class="text-[8px] px-1 py-0.2 rounded border ${statusStyle} font-orbitron uppercase shrink-0">${room.status}</span>
                        <p class="font-bold text-gray-300 group-hover:text-pink-400 transition-colors font-orbitron truncate text-[11px]">${room.title || 'Phòng hỗ trợ'}</p>
                    </div>
                    <p class="text-[10px] text-gray-500 truncate mt-1">
                        ${room.latest_message?.message || t('chat_no_message')}
                    </p>
                </div>
                <span class="text-[9px] px-2 py-1 rounded bg-pink-950/60 text-pink-400 font-orbitron border border-pink-500/30 uppercase shrink-0 hover:bg-pink-500 hover:text-white transition-all" data-i18n="chat_process">${t('chat_process')}</span>
            `;

            roomBtn.addEventListener('click', () => {
                enterAdminChatRoom(room);
            });
            bodyArea.appendChild(roomBtn);
        });
    } catch (err) {
        bodyArea.innerHTML = `<p class="text-center text-red-400 py-4 font-orbitron" data-i18n="chat_cannot_connect">${t('chat_cannot_connect')}</p>`;
    }

    if (typeof applyTranslations === 'function') applyTranslations();
}

async function enterAdminChatRoom(room) {
    currentActiveRoomId = room.id;

    const headerArea = document.getElementById('chat-header-area');
    const inputForm = document.getElementById('chat-input-form');

    headerArea.innerHTML = `
        <div class="flex flex-col space-y-1 pb-1.5 border-b border-pink-500/20">
            <div class="flex justify-between items-center px-1">
                <button id="btn-chat-back-list" class="text-[10px] text-pink-400 hover:underline font-orbitron" data-i18n="chat_back">${t('chat_back')}</button>
                <span class="text-xs font-bold text-gray-300 font-orbitron max-w-[120px] truncate">${room.title}</span>
                <select id="admin-chat-status-select" class="text-[9px] bg-black border border-pink-500/30 text-pink-400 rounded px-1 py-0.5 focus:outline-none font-orbitron">
                    <option value="pending" ${room.status === 'pending' ? 'selected' : ''}>${t('chat_filter_pending')} (Pending)</option>
                    <option value="open" ${room.status === 'open' ? 'selected' : ''}>${t('chat_filter_open')} (Open)</option>
                    <option value="resolved" ${room.status === 'resolved' ? 'selected' : ''}>${t('chat_filter_resolved')} (Resolved)</option>
                    <option value="closed" ${room.status === 'closed' ? 'selected' : ''}>${t('chat_filter_closed')} (Closed)</option>
                </select>
            </div>
        </div>
    `;

    document.getElementById('btn-chat-back-list').addEventListener('click', () => {
        if (chatIntervalTimer) clearInterval(chatIntervalTimer);
        initChatModule(true, null); // Quay về danh sách phòng
    });

    // Event listener thay đổi trực tiếp status của ticket
    const statusSelect = document.getElementById('admin-chat-status-select');
    statusSelect.addEventListener('change', async () => {
        const newStatus = statusSelect.value;
        try {
            await window.ApiService.updateChatRoomStatus(room.id, { status: newStatus });
            showCyberModal({ title: t('confirm_title') || "CONFIRM", message: (t('chat_confirm_status_change') || "Changed status to: ") + newStatus.toUpperCase(), type: 'alert' });
        } catch (err) {
            showCyberModal({ title: t('error_title') || "ERROR", message: t('chat_status_error') || "Failed to update chat room status.", type: 'alert' });
        }
    });

    inputForm.classList.remove('hidden');

    // Khởi động tuần hoàn nạp tin nhắn
    await loadConversationMessages();
    chatIntervalTimer = setInterval(loadConversationMessages, 3000);

    if (typeof applyTranslations === 'function') applyTranslations();
}

async function loadConversationMessages() {
    if (!currentActiveRoomId) return;
    const bodyArea = document.getElementById('chat-body-area');

    try {
        const res = await window.ApiService.getChatRoom(currentActiveRoomId, { forceRefresh: true });
        const roomData = res.data?.data || res.data;
        let messages = roomData?.messages || [];

        // Giải bọc nếu Laravel bọc collection tin nhắn vào .data
        if (messages && messages.data) {
            messages = messages.data;
        }

        const currentUserId = getAuthUser()?.id;

        if (messages.length === 0) {
            bodyArea.innerHTML = `<p class="text-center text-gray-600 py-6 font-orbitron" data-i18n="chat_conversation_empty">${t('chat_conversation_empty')}</p>`;
            if (typeof applyTranslations === 'function') applyTranslations();
            return;
        }

        // Lưu vị trí cuộn chuột trước khi vẽ
        const shouldScrollToBottom = bodyArea.scrollHeight - bodyArea.scrollTop <= bodyArea.clientHeight + 40;

        bodyArea.innerHTML = '';
        messages.forEach(msg => {
            const isMe = msg.user_id === currentUserId || msg.sender_id === currentUserId;

            // Xác định đối tượng gửi (sender hoặc user dự phòng)
            const senderObj = msg.sender || msg.user;
            const isSenderAdmin = senderObj?.role === 'admin' || senderObj?.is_admin === 1 || senderObj?.is_admin === true;

            // Xác định danh tính hiển thị
            let senderName = '';
            let bubbleStyle = '';

            if (msg.type === 'system') {
                senderName = t('chat_sender_bot');
                bubbleStyle = 'bg-yellow-950/60 text-yellow-200 border border-yellow-500/40 rounded-tl-none shadow-[0_0_10px_rgba(234,179,8,0.15)]';
            } else if (isMe) {
                senderName = t('chat_sender_you');
                bubbleStyle = 'bg-cyan-950/80 text-cyan-200 border border-cyan-500/40 rounded-tr-none shadow-[0_0_8px_rgba(6,182,212,0.1)]';
            } else {
                senderName = isSenderAdmin ? 'ADMIN' : (senderObj?.username || senderObj?.name || t('chat_sender_player'));
                bubbleStyle = 'bg-zinc-900/90 text-gray-200 border border-zinc-700/50 rounded-tl-none';
            }

            // Xử lý nội dung tin nhắn hiển thị (Kiểm tra xem tin nhắn có định dạng hình ảnh hay không)
            let contentHtml = msg.message || '';
            if (msg.type === 'image' || msg.image_url) {
                const imageUrl = msg.image_url || msg.message;
                contentHtml = `
                    <div class="space-y-1">
                        <img src="${imageUrl}" class="max-w-[160px] rounded border border-cyan-500/20 cursor-zoom-in hover:brightness-110 transition-all shadow-md" onclick="window.open('${imageUrl}', '_blank')" alt="Chat Image" onerror="this.onerror=null; this.src='https://placehold.co/150?text=Error+Loading+Image'" />
                        ${msg.message && msg.message !== imageUrl ? `<p class="mt-1">${msg.message}</p>` : ''}
                    </div>
                `;
            }

            const msgRow = document.createElement('div');
            msgRow.className = `flex flex-col mb-2 max-w-[85%] ${isMe ? 'ml-auto items-end' : 'mr-auto items-start'}`;

            msgRow.innerHTML = `
                <span class="text-[9px] text-gray-500 mb-0.5 px-1 font-orbitron">${senderName}</span>
                <div class="px-3 py-1.5 rounded-xl text-xs break-words leading-relaxed ${bubbleStyle}">
                    ${contentHtml}
                </div>
            `;
            bodyArea.appendChild(msgRow);
        });

        // Tự động cuộn xuống dưới cùng nếu người dùng không cuộn lên xem lịch sử cũ
        if (shouldScrollToBottom) {
            bodyArea.scrollTop = bodyArea.scrollHeight;
        }
    } catch (err) {
        console.error("Lỗi cập nhật tin nhắn hộp thoại:", err);
    }
}

// Xử lý gửi tin nhắn đi từ form input (Hỗ trợ gửi Text hoặc Ảnh đính kèm)
document.addEventListener('submit', async (e) => {
    if (e.target && e.target.id === 'chat-input-form') {
        e.preventDefault();
        if (!currentActiveRoomId) return;

        const input = document.getElementById('chat-message-input');
        const uploader = document.getElementById('chat-file-uploader');
        const btnSubmit = e.target.querySelector('button[type="submit"]');

        const messageText = input?.value.trim() || '';
        const attachedFile = uploader && uploader.files ? uploader.files[0] : null;

        // Nếu không có cả chữ lẫn ảnh thì không gửi
        if (!messageText && !attachedFile) return;

        try {
            if (input) input.disabled = true;
            if (uploader) uploader.disabled = true;
            if (btnSubmit) {
                btnSubmit.disabled = true;
                btnSubmit.innerHTML = '<span class="text-xs">...</span>';
            }

            // Gói payload dữ liệu theo chuẩn xử lý của ApiService.sendChatMessage
            const payload = {
                type: attachedFile ? 'image' : 'text'
            };

            if (messageText) {
                payload.message = messageText;
            }
            if (attachedFile) {
                payload.image = attachedFile; // Gắn đối tượng File thực tế
            }

            // Gọi API tích hợp từ api.js (tự động chuyển đổi thành FormData)
            await window.ApiService.sendChatMessage(currentActiveRoomId, payload);

            // Reset form sau khi gửi thành công
            if (input) input.value = '';
            clearChatImageUploader();

            await loadConversationMessages(); // Reload cập nhật ngay lập tức tin vừa gửi
        } catch (err) {
            showCyberModal({ title: t('error_title') || "ERROR", message: t('chat_send_error'), type: 'alert' });
        } finally {
            if (input) input.disabled = false;
            if (uploader) uploader.disabled = false;
            if (btnSubmit) {
                btnSubmit.disabled = false;
                btnSubmit.innerHTML = `
                    <svg class="w-4 h-4 text-cyan-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"/>
                    </svg>
                `;
            }
            if (input) input.focus();
        }
    }
});

// Lắng nghe sự kiện chọn file ảnh để hiển thị vùng xem trước (Preview)
document.addEventListener('change', (e) => {
    if (e.target && e.target.id === 'chat-file-uploader') {
        const file = e.target.files[0];
        if (!file) return;

        // Giới hạn dung lượng nếu cần (ví dụ: 5MB)
        if (file.size > 5 * 1024 * 1024) {
            showCyberModal({ title: "FILE LARGE", message: "Kích thước ảnh tối đa là 5MB!", type: 'alert' });
            e.target.value = '';
            return;
        }

        const previewZone = document.getElementById('chat-image-preview-zone');
        const previewImg = document.getElementById('img-chat-preview');
        const filenameLbl = document.getElementById('lbl-preview-filename');

        if (previewZone && previewImg && filenameLbl) {
            filenameLbl.innerText = file.name;
            previewImg.src = URL.createObjectURL(file);
            previewZone.classList.remove('hidden');
        }
    }
});

// Lắng nghe sự kiện hủy ảnh đã chọn
document.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'btn-remove-preview-img') {
        clearChatImageUploader();
    }
});

// Hàm dọn dẹp vùng nhớ và reset input file
function clearChatImageUploader() {
    const uploader = document.getElementById('chat-file-uploader');
    const previewZone = document.getElementById('chat-image-preview-zone');
    const previewImg = document.getElementById('img-chat-preview');

    if (uploader) uploader.value = '';
    if (previewZone) previewZone.classList.add('hidden');
    if (previewImg) {
        if (previewImg.src.startsWith('blob:')) {
            URL.revokeObjectURL(previewImg.src); // Giải phóng bộ nhớ Blob tránh rò rỉ (leak) RAM
        }
        previewImg.src = '';
    }
}
