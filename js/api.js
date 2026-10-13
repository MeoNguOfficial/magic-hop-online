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

// --- QUẢN LÝ TRẠNG THÁI DATABASE & MÁY CHỦ (HEALTH CHECK) ---
let isDatabaseOnlineState = true;
let lastDbHealthCheckTimestamp = 0;
const DB_HEALTH_CHECK_TTL = 30000; // Cache kết quả kiểm tra trong 30 giây

/**
 * Kiểm tra sức khỏe DB và Server qua GET /health
 * @param {Object} options - Tùy chọn cấu hình (timeout, forceRefresh, cacheTtl)
 * @returns {Promise<{isHealthy: boolean, status: string, database_status: string, message: string}>}
 */
async function checkDatabaseHealth(options = {}) {
    const force = options.force === true || options.forceRefresh === true;
    const cacheTtl = options.cacheTtl || DB_HEALTH_CHECK_TTL;
    const now = Date.now();

    // Dùng kết quả đã cache nếu còn hạn và không bị ép kiểm tra lại
    if (!force && lastDbHealthCheckTimestamp > 0 && (now - lastDbHealthCheckTimestamp < cacheTtl)) {
        return {
            isHealthy: isDatabaseOnlineState,
            status: isDatabaseOnlineState ? 'healthy' : 'degraded',
            database_status: isDatabaseOnlineState ? 'online' : 'offline',
            fromCache: true
        };
    }

    try {
        const response = await originalGet('/health', {
            timeout: options.timeout || 4000,
            skipRetry: true,
            validateStatus: (status) => status < 600, // Nhận cả 200 và 503 mà không ném AxiosError
            headers: { 'Accept': 'application/json' },
            ...options
        });

        lastDbHealthCheckTimestamp = Date.now();
        const data = response?.data || {};
        const isHealthy = response?.status === 200 && (data.database_status === 'online' || data.status === 'healthy');

        isDatabaseOnlineState = isHealthy;
        window.isDatabaseOnline = isHealthy;

        if (!isHealthy) {
            console.warn('[HealthCheck] Database trả về offline hoặc suy giảm dịch vụ:', data);
            updateConnectionStatusIndicator('cache');
        } else {
            console.log('[HealthCheck] Database và Server hoạt động bình thường (Online).');
            updateConnectionStatusIndicator('server');
        }

        return {
            isHealthy,
            status: data.status || (isHealthy ? 'healthy' : 'degraded'),
            database_status: data.database_status || (isHealthy ? 'online' : 'offline'),
            message: data.message || '',
            httpStatus: response.status,
            data
        };
    } catch (error) {
        lastDbHealthCheckTimestamp = Date.now();
        isDatabaseOnlineState = false;
        window.isDatabaseOnline = false;
        console.warn('[HealthCheck] Không thể kết nối tới máy chủ API / DB:', error);
        updateConnectionStatusIndicator('cache');

        return {
            isHealthy: false,
            status: 'degraded',
            database_status: 'offline',
            message: error.message || 'Server/Database unreachable',
            httpStatus: error.response?.status || 0,
            error
        };
    }
}

function isDbHealthy() {
    return isDatabaseOnlineState;
}

// --- QUẢN LÝ DẤU CHẤM TRẠNG THÁI NGUỒN DỮ LIỆU (XANH: SERVER, VÀNG: CACHE) ---
let currentConnectionSource = 'server';

function updateConnectionStatusIndicator(source = 'server') {
    currentConnectionSource = source;
    const isServer = source === 'server';
    const badges = document.querySelectorAll('.connection-status-badge');

    badges.forEach(badge => {
        const dot = badge.querySelector('.connection-status-dot');
        const text = badge.querySelector('.connection-status-text');

        if (isServer) {
            badge.classList.remove('border-yellow-500/40', 'bg-yellow-950/20', 'shadow-[0_0_10px_rgba(234,179,8,0.2)]', 'shadow-[0_0_8px_rgba(234,179,8,0.2)]');
            badge.classList.add('border-emerald-500/40', 'bg-emerald-950/20', 'shadow-[0_0_10px_rgba(16,185,129,0.15)]');
            badge.setAttribute('title', 'Nguồn dữ liệu: Đang kết nối trực tiếp từ Server (Nhấp để kiểm tra lại)');
            if (dot) {
                dot.classList.remove('bg-yellow-400', 'shadow-[0_0_8px_#facc15]', 'shadow-[0_0_6px_#facc15]');
                dot.classList.add('bg-emerald-400', 'shadow-[0_0_8px_#10b981]');
            }
            if (text) {
                text.classList.remove('text-yellow-400');
                text.classList.add('text-emerald-400');
                text.textContent = 'SERVER';
            }
        } else {
            badge.classList.remove('border-emerald-500/40', 'bg-emerald-950/20', 'shadow-[0_0_10px_rgba(16,185,129,0.15)]', 'shadow-[0_0_8px_rgba(16,185,129,0.15)]');
            badge.classList.add('border-yellow-500/40', 'bg-yellow-950/20', 'shadow-[0_0_10px_rgba(234,179,8,0.2)]');
            badge.setAttribute('title', 'Nguồn dữ liệu: Đang nạp từ Cache Ngoại tuyến (DB Offline/Mất kết nối - Nhấp để kiểm tra lại)');
            if (dot) {
                dot.classList.remove('bg-emerald-400', 'shadow-[0_0_8px_#10b981]', 'shadow-[0_0_6px_#10b981]');
                dot.classList.add('bg-yellow-400', 'shadow-[0_0_8px_#facc15]');
            }
            if (text) {
                text.classList.remove('text-emerald-400');
                text.classList.add('text-yellow-400');
                text.textContent = 'CACHE';
            }
        }
    });
}
window.updateConnectionStatusIndicator = updateConnectionStatusIndicator;
window.getConnectionSource = () => currentConnectionSource;

// Hỗ trợ nhấp vào badge để re-check kết nối bất kỳ lúc nào & lắng nghe online/offline
if (typeof document !== 'undefined') {
    document.addEventListener('click', (e) => {
        const badge = e.target.closest('.connection-status-badge');
        if (badge && window.ApiService && typeof window.ApiService.checkHealth === 'function') {
            const dot = badge.querySelector('.connection-status-dot');
            if (dot) dot.classList.add('animate-spin');
            window.ApiService.checkHealth({ force: true }).then((res) => {
                if (dot) dot.classList.remove('animate-spin');
                updateConnectionStatusIndicator(res.isHealthy ? 'server' : 'cache');
            }).catch(() => {
                if (dot) dot.classList.remove('animate-spin');
                updateConnectionStatusIndicator('cache');
            });
        }
    });

    if (typeof window !== 'undefined') {
        window.addEventListener('offline', () => {
            isDatabaseOnlineState = false;
            window.isDatabaseOnline = false;
            updateConnectionStatusIndicator('cache');
        });

        window.addEventListener('online', () => {
            checkDatabaseHealth({ force: true });
        });

        // Tự động kiểm tra sức khỏe DB sau khi tải trang
        window.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
                checkDatabaseHealth({ cacheTtl: 30000 });
            }, 500);
        });
    }
}

window.checkDatabaseHealth = checkDatabaseHealth;
window.isDatabaseOnline = true;

// Ghi đè phương thức get của apiClient để hỗ trợ đọc từ Cache/IndexedDB và cờ forceRefresh
const originalGet = apiClient.get.bind(apiClient);
const originalPost = apiClient.post.bind(apiClient);
const originalPut = apiClient.put.bind(apiClient);
const originalDelete = apiClient.delete.bind(apiClient);

apiClient.get = async function (url, config = {}) {
    const isHealthCheck = typeof url === 'string' && url.includes('/health');
    if (isHealthCheck) {
        return originalGet(url, config);
    }

    const isForceRefresh = config.forceRefresh === true || (config.headers && config.headers['X-Force-Refresh'] === 'true');
    const cacheKey = buildApiCacheKey(url, config.params);

    // TRƯỜNG HỢP 1: Database đang offline (health check false) -> TỰ ĐỘNG DÙNG CACHE NGAY
    if (!isDatabaseOnlineState) {
        if (typeof window.getApiCache === 'function') {
            const cachedData = await window.getApiCache(cacheKey, { allowExpired: true });
            if (cachedData !== null && cachedData !== undefined) {
                console.warn('[ApiCache] Database offline (check false): Tự động dùng Cache cho:', cacheKey);
                updateConnectionStatusIndicator('cache');
                return {
                    data: cachedData,
                    status: 200,
                    statusText: 'OK (Auto Cache - DB Offline)',
                    headers: {},
                    config: config,
                    isCached: true,
                    isDbOffline: true
                };
            }
        }

        // Nếu là endpoint /beatmaps mà chưa có trong api_cache, tự động lấy từ IndexedDB STORE_PLAYLIST
        if (typeof url === 'string' && url.includes('/beatmaps') && !url.includes('/beatmaps/') && typeof window.getCachedPlaylistFromDB === 'function') {
            try {
                const dbPlaylist = await window.getCachedPlaylistFromDB();
                if (dbPlaylist && Array.isArray(dbPlaylist) && dbPlaylist.length > 0) {
                    console.warn('[ApiCache] Database offline: Tự động dùng danh sách bài hát từ IndexedDB STORE_PLAYLIST.');
                    updateConnectionStatusIndicator('cache');
                    return {
                        data: { data: dbPlaylist, meta: { has_more: false } },
                        status: 200,
                        statusText: 'OK (IndexedDB Playlist - DB Offline)',
                        headers: {},
                        config: config,
                        isCached: true,
                        isDbOffline: true
                    };
                }
            } catch (e) {}
        }
    }

    // TRƯỜNG HỢP 2: Nếu KHÔNG có cờ làm mới thủ công, kiểm tra cache trước
    if (!isForceRefresh && typeof window.getApiCache === 'function') {
        const cachedData = await window.getApiCache(cacheKey);
        if (cachedData !== null && cachedData !== undefined) {
            console.log('[ApiCache] Trả về dữ liệu từ Cache/IndexedDB cho:', cacheKey);
            updateConnectionStatusIndicator('cache');
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

    // TRƯỜNG HỢP 3: Gửi request thực tới backend
    try {
        const response = await originalGet(url, config);
        if (response && response.status >= 200 && response.status < 300 && typeof window.setApiCache === 'function') {
            await window.setApiCache(cacheKey, response.data);
            console.log('[ApiCache] Đã lưu dữ liệu mới từ Backend vào Cache/IndexedDB cho:', cacheKey);
            isDatabaseOnlineState = true;
            window.isDatabaseOnline = true;
            updateConnectionStatusIndicator('server');
        }
        return response;
    } catch (error) {
        const isDbError = (error.response && (error.response.status === 500 || error.response.status === 503) && 
            (error.response.data?.error_code === 'DATABASE_CONNECTION_ERROR' || error.response.data?.database_status === 'offline'))
            || error.code === 'ECONNABORTED' || !error.response;

        if (isDbError) {
            isDatabaseOnlineState = false;
            window.isDatabaseOnline = false;
            lastDbHealthCheckTimestamp = Date.now();
        }

        // Fallback: Nếu request tới Backend thất bại (DB Offline / Mạng lỗi), tự động fallback dùng cache cũ
        if (typeof window.getApiCache === 'function') {
            const staleCache = await window.getApiCache(cacheKey, { allowExpired: true });
            if (staleCache !== null && staleCache !== undefined) {
                console.warn('[ApiCache] Request tới Backend thất bại (DB Offline/Lỗi mạng), tự động fallback dùng cache cũ:', cacheKey, error);
                updateConnectionStatusIndicator('cache');
                return {
                    data: staleCache,
                    status: 200,
                    statusText: 'OK (Stale Cache Fallback)',
                    headers: {},
                    config: config,
                    isCached: true,
                    isStale: true,
                    isDbOffline: isDbError
                };
            }
        }

        // Tương tự, nếu /beatmaps và có dữ liệu trong IndexedDB STORE_PLAYLIST
        if (typeof url === 'string' && url.includes('/beatmaps') && !url.includes('/beatmaps/') && typeof window.getCachedPlaylistFromDB === 'function') {
            try {
                const dbPlaylist = await window.getCachedPlaylistFromDB();
                if (dbPlaylist && Array.isArray(dbPlaylist) && dbPlaylist.length > 0) {
                    console.warn('[ApiCache] Request /beatmaps thất bại, tự động fallback dùng playlist IndexedDB:', error);
                    updateConnectionStatusIndicator('cache');
                    return {
                        data: { data: dbPlaylist, meta: { has_more: false } },
                        status: 200,
                        statusText: 'OK (IndexedDB Playlist Fallback)',
                        headers: {},
                        config: config,
                        isCached: true,
                        isStale: true,
                        isDbOffline: isDbError
                    };
                }
            } catch (e) {}
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

        // Gia han thoi gian dang nhap them 30 ngay ke tu lan tuong tac cuoi
        const expTime = Date.now() + 30 * 24 * 60 * 60 * 1000;
        localStorage.setItem('auth_token_exp', expTime.toString());
    }
    return config;
}, (error) => Promise.reject(error));

// Xử lý lỗi HTTP global & Tự động thử lại khi Render đang khởi động (spin-up)
apiClient.interceptors.response.use(
    (response) => {
        if (response.config?.url?.includes('/health') && response.data?.database_status === 'online') {
            isDatabaseOnlineState = true;
            window.isDatabaseOnline = true;
        }
        return response;
    },
    async (error) => {
        const config = error.config;
        const resData = error.response?.data;
        const isDbOfflineError = (error.response && (error.response.status === 500 || error.response.status === 503) && 
            (resData?.error_code === 'DATABASE_CONNECTION_ERROR' || resData?.database_status === 'offline'));

        if (isDbOfflineError) {
            isDatabaseOnlineState = false;
            window.isDatabaseOnline = false;
            lastDbHealthCheckTimestamp = Date.now();
            console.warn('[API] Phát hiện Database Offline từ response backend:', resData);
        }

        // Nếu request gặp lỗi mạng/timeout/503 (thường xảy ra khi Render Free đang spin-up), tự động retry 1 lần sau 3s
        // KHÔNG retry nếu đây là lỗi DATABASE_CONNECTION_ERROR hoặc request /health hoặc có skipRetry
        const isHealthCheck = config?.url?.includes('/health');
        if (config && !config._retry && !config.skipRetry && !isHealthCheck && !isDbOfflineError && (!error.response || error.response.status === 503 || error.code === 'ECONNABORTED')) {
            config._retry = true;
            console.warn('[API] Render API có thể đang khởi động (spin-up). Đang tự động thử lại sau 3 giây...');
            await new Promise(resolve => setTimeout(resolve, 3000));
            return apiClient(config);
        }

        // Nếu là lỗi DB offline: Chỉ hiển thị alert nếu là request mutation (POST/PUT/DELETE)
        // Với request GET, apiClient.get đã tự động fallback sang Cache để người chơi không bị chặn gián đoạn
        if (isDbOfflineError && config?.method && config.method.toUpperCase() !== 'get' && !config.suppressAlert) {
            console.error('[API] Lỗi kết nối CSDL khi thực hiện thay đổi dữ liệu.');
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    icon: 'warning',
                    title: 'Bảo trì máy chủ',
                    text: 'Hệ thống đang được nâng cấp hoặc bảo trì cơ sở dữ liệu. Thao tác lưu tạm thời chưa thể thực hiện!',
                    confirmButtonText: 'Đã hiểu',
                    confirmButtonColor: '#e0b230'
                });
            } else {
                alert('Hệ thống máy chủ trò chơi hiện đang nâng cấp hoặc bảo trì cơ sở dữ liệu. Vui lòng quay lại sau ít phút!');
            }
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
    // 0. Kiểm tra trạng thái máy chủ & Database (Health check)
    checkHealth: (options = {}) => checkDatabaseHealth(options),
    isDbHealthy: () => isDatabaseOnlineState,
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
