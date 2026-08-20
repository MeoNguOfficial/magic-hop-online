// js/api.js
// Client API Integration for Laravel Backend

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 60000, // Chờ tối đa 60 giây (cho Render free tier khởi động/spin-up)
    withCredentials: true,
    crossDomain: true,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
});

// Helper tạo Cache Key chuẩn hóa cho các request GET
function buildApiCacheKey(url, params) {
    if (!url) return '';
    let key = url;
    if (params && typeof params === 'object') {
        const sortedKeys = Object.keys(params).sort();
        const searchParams = new URLSearchParams();
        sortedKeys.forEach(k => {
            if (params[k] !== undefined && params[k] !== null) {
                searchParams.append(k, params[k]);
            }
        });
        const strParams = searchParams.toString();
        if (strParams) {
            key += (key.includes('?') ? '&' : '?') + strParams;
        }
    }
    return `GET:${key}`;
}

// Hàm tự động invalidate API Cache phù hợp khi thực hiện Mutation (POST, PUT, DELETE)
function invalidateCacheForMutation(url) {
    if (!url || typeof window.deleteApiCache !== 'function') return;
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes('/scores') || lowerUrl.includes('/leaderboard')) {
        window.deleteApiCache('/scores');
        window.deleteApiCache('/leaderboard');
    }
    if (lowerUrl.includes('/beatmaps')) {
        window.deleteApiCache('/beatmaps');
    }
    if (lowerUrl.includes('/users') || lowerUrl.includes('/me') || lowerUrl.includes('/user-settings')) {
        window.deleteApiCache('/users');
        window.deleteApiCache('/me');
    }
    if (lowerUrl.includes('/chat')) {
        window.deleteApiCache('/chat');
    }
    if (lowerUrl.includes('/login') || lowerUrl.includes('/logout')) {
        if (typeof window.clearAllApiCache === 'function') {
            window.clearAllApiCache();
        }
    }
}

// Ghi đè phương thức get của apiClient để hỗ trợ đọc từ Cache/IndexedDB và cờ forceRefresh
const originalGet = apiClient.get.bind(apiClient);
const originalPost = apiClient.post.bind(apiClient);
const originalPut = apiClient.put.bind(apiClient);
const originalDelete = apiClient.delete.bind(apiClient);

apiClient.get = async function (url, config = {}) {
    const isForceRefresh = config.forceRefresh === true || (config.headers && config.headers['X-Force-Refresh'] === 'true');
    const cacheKey = buildApiCacheKey(url, config.params);

    // Nếu KHÔNG có cờ làm mới thủ công, kiểm tra cache trước
    if (!isForceRefresh && typeof window.getApiCache === 'function') {
        const cachedData = await window.getApiCache(cacheKey);
        if (cachedData !== null && cachedData !== undefined) {
            console.log('[ApiCache] Trả về dữ liệu từ Cache/IndexedDB cho:', cacheKey);
            return {
                data: cachedData,
                status: 200,
                statusText: 'OK (Cached)',
                headers: {},
                config: config,
                isCached: true
            };
        }
    }

    // Nếu buộc làm mới hoặc chưa có cache, thực hiện request thực tới backend
    try {
        const response = await originalGet(url, config);
        if (response && response.status >= 200 && response.status < 300 && typeof window.setApiCache === 'function') {
            await window.setApiCache(cacheKey, response.data);
            console.log('[ApiCache] Đã lưu dữ liệu mới từ Backend vào Cache/IndexedDB cho:', cacheKey);
        }
        return response;
    } catch (error) {
        // Fallback: Nếu mạng lỗi nhưng có cache cũ, trả về cache cũ kèm cảnh báo
        if (typeof window.getApiCache === 'function') {
            const staleCache = await window.getApiCache(cacheKey, { allowExpired: true });
            if (staleCache !== null && staleCache !== undefined) {
                console.warn('[ApiCache] Request tới Backend thất bại, tự động fallback dùng cache cũ:', cacheKey, error);
                return {
                    data: staleCache,
                    status: 200,
                    statusText: 'OK (Stale Cache Fallback)',
                    headers: {},
                    config: config,
                    isCached: true,
                    isStale: true
                };
            }
        }
        throw error;
    }
};

apiClient.post = async function (url, data, config) {
    const response = await originalPost(url, data, config);
    invalidateCacheForMutation(url);
    return response;
};

apiClient.put = async function (url, data, config) {
    const response = await originalPut(url, data, config);
    invalidateCacheForMutation(url);
    return response;
};

apiClient.delete = async function (url, config) {
    const response = await originalDelete(url, config);
    invalidateCacheForMutation(url);
    return response;
};

// Tự động gắn Token vào Header nếu đã đăng nhập (Hỗ trợ giải mã Base64/URL-decode nếu token bị mã hóa)
apiClient.interceptors.request.use((config) => {
    let token = localStorage.getItem('auth_token');
    if (token) {
        try {
            if (!token.includes('|') && token.length > 20) {
                let decoded = atob(token);
                if (decoded.includes('%')) {
                    decoded = decodeURIComponent(decoded);
                }
                if (decoded.includes('|')) {
                    token = decoded;
                }
            }
        } catch (e) {
            console.error('[API] Lỗi giải mã token trong request interceptor:', e);
        }
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => Promise.reject(error));

// Xử lý lỗi HTTP global & Tự động thử lại khi Render đang khởi động (spin-up)
apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const config = error.config;

        // Nếu request gặp lỗi mạng/timeout/503 (thường xảy ra khi Render Free đang spin-up), tự động retry 1 lần sau 3s
        if (config && !config._retry && (!error.response || error.response.status === 503 || error.code === 'ECONNABORTED')) {
            config._retry = true;
            console.warn('[API] Render API có thể đang khởi động (spin-up). Đang tự động thử lại sau 3 giây...');
            await new Promise(resolve => setTimeout(resolve, 3000));
            return apiClient(config);
        }

        if (error.response && error.response.status === 401) {
            console.warn("[API] Token hết hạn hoặc truy cập bị từ chối. Tiến hành đăng xuất ngầm.");
            localStorage.removeItem('auth_token');
            localStorage.removeItem('auth_token_exp');
            localStorage.removeItem('auth_user');

            // Tự động gọi cập nhật giao diện tài khoản nếu tồn tại hàm render
            if (typeof renderLoggedOutState === 'function') {
                renderLoggedOutState();
            }
        }
        return Promise.reject(error);
    }
);

const ApiService = {
    // 1. Quản lý Đăng xuất & Tài khoản Cá nhân
    register: (data) => apiClient.post('/register', data),
    login: async (data) => {
        const response = await apiClient.post('/login', data);
        const resData = response.data || {};
        const token = resData.access_token || resData.token || resData.data?.access_token || resData.data?.token || resData.data?.authorisation?.token || resData.authorisation?.token;
        const user = resData.user || resData.data?.user || (resData.data && typeof resData.data === 'object' && resData.data.id ? resData.data : null);

        if (token) {
            localStorage.setItem('auth_token', token);
        }
        if (user) {
            localStorage.setItem('auth_user', JSON.stringify(user));
        }
        return response;
    },
    logout: async () => {
        const response = await apiClient.post('/logout');
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_token_exp');
        localStorage.removeItem('auth_user');
        return response;
    },
    forgotPassword: (data) => apiClient.post('/forgot-password', data),
    resetPassword: (data) => apiClient.post('/reset-password', data),
    changePassword: (data) => apiClient.post('/change-password', data),
    getMe: (options = {}) => apiClient.get('/me', options),
    // Lấy danh sách / chi tiết user — mọi người dùng đã đăng nhập đều gọi được
    getUsers: (params = {}, options = {}) => apiClient.get('/users', { params, ...options }),
    getUser: (id, options = {}) => apiClient.get(`/users/${id}`, options),
    // Tạo / Cập nhật / Xóa user — CHỈ DÀNH CHO ADMIN (middleware 'admin' phía backend)
    createUser: (data) => apiClient.post('/users', data),
    updateUser: (id, data) => apiClient.put(`/users/${id}`, data),
    deleteUser: (id) => apiClient.delete(`/users/${id}`),
    // Tự cập nhật thông tin cá nhân (user tự sửa chính mình — không cần quyền admin)
    updateMe: (data) => apiClient.put(`/users/${JSON.parse(localStorage.getItem('auth_user') || '{}').id}`, data),

    // 2. Quản lý Cấu hình Cài đặt Game (Âm thanh, Đồ họa)
    updateSettings: (userId, data) => apiClient.put(`/user-settings/${userId}`, data),

    // 3. Quản lý Màn chơi / Bản đồ nốt nhạc (Beatmaps CRUD)
    getPublicBeatmaps: (params = {}, options = {}) => apiClient.get('/beatmaps', { params, ...options }),
    getBeatmaps: (params = {}, options = {}) => apiClient.get('/beatmaps', { params: { mode: 'admin', ...params }, ...options }),
    getBeatmapDetails: (id, options = {}) => apiClient.get(`/beatmaps/${id}`, options),
    importBeatmapJson: (data) => apiClient.post('/admin/beatmaps/import-json', data),
    createBeatmap: (data) => apiClient.post('/admin/beatmaps', data),
    updateBeatmap: (id, data) => apiClient.put(`/admin/beatmaps/${id}`, data),
    deleteBeatmap: (id) => apiClient.delete(`/admin/beatmaps/${id}`),

    // 4. Quản lý Điểm số & Bảng xếp hạng Kỷ lục (Scores & Leaderboard)
    getScores: (params = {}, options = {}) => apiClient.get('/scores', { params, ...options }),
    postScore: (data) => apiClient.post('/scores', data),
    getLeaderboard: (beatmapId, params = {}, options = {}) => apiClient.get(`/beatmaps/${beatmapId}/leaderboard`, { params, ...options }),
    deleteScore: (id) => apiClient.delete(`/scores/${id}`),

    // 4b. Kiểm tra nhanh xem có dữ liệu Beatmap mới không (dùng cho smart polling)
    checkPublicBeatmapsUpdated: (options = {}) => apiClient.get('/beatmaps', { params: { limit: 1, sort: 'updated_at_desc' }, ...options }),
    checkAdminBeatmapsUpdated: (options = {}) => apiClient.get('/beatmaps', { params: { mode: 'admin', limit: 1, sort: 'updated_at_desc' }, ...options }),

    // 5. Hệ thống Chat Hỗ trợ & Trợ lý ảo (Dành cho Người dùng & Quản trị)
    // Lưu ý: GET /chat/rooms đã chuyển vào /admin/chat/rooms — getChatRooms giờ gọi endpoint admin.
    getChatRooms: (params = {}, options = {}) => apiClient.get('/admin/chat/rooms', { params, ...options }),
    createChatRoom: (data) => apiClient.post('/chat/rooms', data),

    sendChatMessage: (roomId, data) => {
        if (data && data.image instanceof File) {
            const formData = new FormData();
            formData.append('image', data.image);
            if (data.message !== undefined && data.message !== null) {
                formData.append('message', data.message);
            }
            if (data.type) {
                formData.append('type', data.type);
            }
            if (data.expiration) {
                formData.append('expiration', data.expiration);
            }
            return apiClient.post(`/chat/rooms/${roomId}/messages`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
        }
        return apiClient.post(`/chat/rooms/${roomId}/messages`, data);
    },

    getChatRoom: (roomId, options = {}) => apiClient.get(`/chat/rooms/${roomId}`, options),
    deleteChatRoom: (roomId) => apiClient.delete(`/chat/rooms/${roomId}`),
    deleteChatMessage: (messageId) => apiClient.delete(`/chat/messages/${messageId}`),

    // 6. Chức năng Hệ thống / Quản trị (Admin)
    getAdminChatRooms: (params = {}, options = {}) => apiClient.get('/admin/chat/rooms', { params, ...options }),
    updateChatRoomStatus: (roomId, data) => apiClient.put(`/admin/chat/rooms/${roomId}/status`, data),
    executeCommand: (data) => apiClient.post('/admin/command', data)
};

window.ApiService = ApiService;