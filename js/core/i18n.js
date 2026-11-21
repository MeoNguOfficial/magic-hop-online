// ============================================================
//  i18n.js — Internationalization
// ============================================================

// --- BỌC LOCALSTORAGE ĐỂ MÃ HÓA BASE64 (BẢO MẬT SETTINGS) ---
const originalSetItem = localStorage.setItem;
const originalGetItem = localStorage.getItem;
localStorage.setItem = function (key, value) {
    let encoded;
    try {
        encoded = btoa(encodeURIComponent(String(value)));
    } catch (e) {
        encoded = String(value);
    }
    try { originalSetItem.call(localStorage, key, encoded); } catch (e) { }
};
localStorage.getItem = function (key) {
    let val;
    try { val = originalGetItem.call(localStorage, key); } catch (e) { return null; }
    if (val === null) return null;
    try {
        let decoded = atob(val);
        // Vì encodeURIComponent chỉ tạo ra các ký tự ASCII có thể in được
        // Nên nếu atob() sinh ra ký tự lạ (VD: atob("true") = "¶»ž"), thì đó chắc chắn là chuỗi cũ chưa mã hóa
        if (/^[\x20-\x7E]*$/.test(decoded)) {
            return decodeURIComponent(decoded);
        }
    } catch (e) {
    }
    return val; // Dự phòng fallback trả về giá trị thô cho các setting cũ chưa bị mã hóa
};

const dict = {};
const availableLangs = [
    'vi', 'en', 'fr', 'zh-CN', 'zh-TW', 'ko', 'ja', 'es', 'pt', 'ru',
    'de', 'id', 'th', 'hi', 'ar', 'it', 'tr', 'pl', 'nl', 'ms'
];

// Tải dữ liệu ngôn ngữ từ thư mục language/ (tải trước ngôn ngữ đang dùng + fallback 'en' để tăng tốc khởi động, các ngôn ngữ khác lazy-load khi chọn)
const langCacheTag = (typeof window !== 'undefined' && (window.ASSET_CACHE_TAG || window.SCRIPT_BUILD_VERSION)) || '1.1.0-17';
const langPromises = {};

function ensureLanguageLoaded(lang) {
    const targetLang = availableLangs.includes(lang) ? lang : 'en';
    if (dict[targetLang]) return Promise.resolve(dict[targetLang]);
    if (!langPromises[targetLang]) {
        langPromises[targetLang] = fetch(`language/${targetLang}.json?v=${encodeURIComponent(langCacheTag)}`, { cache: 'no-store' })
            .then(r => r.json())
            .then(data => {
                dict[targetLang] = data;
                return data;
            })
            .catch(err => {
                delete langPromises[targetLang];
                console.error(`Lỗi tải ngôn ngữ (${targetLang}):`, err);
                return null;
            });
    }
    return langPromises[targetLang];
}

let userLang = localStorage.getItem('selectedLanguage') || 'auto';
let activeLang = 'en';

function detectLanguage() {
    if (userLang === 'auto') {
        const navLang = navigator.language || navigator.userLanguage || 'en';
        if (availableLangs.includes(navLang)) {
            activeLang = navLang;
        } else {
            const prefix = navLang.split('-')[0];
            const matched = availableLangs.find(lang => lang.startsWith(prefix));
            activeLang = matched || 'en';
        }
    } else {
        activeLang = availableLangs.includes(userLang) ? userLang : 'en';
    }
}

detectLanguage();

const initialLangsToLoad = activeLang === 'en' ? ['en'] : [activeLang, 'en'];
const translationsPromise = Promise.all(
    initialLangsToLoad.map(lang => ensureLanguageLoaded(lang))
).catch(err => {
    console.error("Lỗi tải ngôn ngữ:", err);
});

function t(key) {
    return dict[activeLang]?.[key] || dict['en']?.[key] || key;
}

function applyTranslations() {
    document.body.classList.remove('lang-vi', 'lang-en');
    document.body.classList.add(`lang-${activeLang}`);

    document.querySelectorAll('[data-i18n]').forEach(el => {
        // Tránh ghi đè nhãn bộ lọc khi đang có giá trị được chọn
        if (el.id === 'song-filter-artist-label') {
            const hidden = document.getElementById('song-filter-artist');
            if (hidden && hidden.value) {
                el.innerText = hidden.value.toUpperCase();
                return;
            }
        }
        if (el.id === 'song-filter-genre-label') {
            const hidden = document.getElementById('song-filter-genre');
            if (hidden && hidden.value) {
                el.innerText = hidden.value.toUpperCase();
                return;
            }
        }

        const key = el.getAttribute('data-i18n');
        const text = t(key);
        if (text.includes('<')) {
            el.innerHTML = text;
        } else {
            el.innerText = text;
        }
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        el.placeholder = t(key);
    });

    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        el.title = t(key);
    });

    // Cập nhật lại các label dropdown filter khi đổi ngôn ngữ
    const artistBtn = document.getElementById('song-filter-artist-btn');
    const genreBtn  = document.getElementById('song-filter-genre-btn');
    if (artistBtn && typeof artistBtn._refreshLabel === 'function') artistBtn._refreshLabel();
    if (genreBtn  && typeof genreBtn._refreshLabel === 'function') genreBtn._refreshLabel();

    if (typeof speedEl !== 'undefined' && speedEl && typeof isPlaying !== 'undefined' && !isPlaying) {
        speedEl.innerText = `${t('speed')} 1.00x`;
        if (typeof lastDisplayedSpeedText !== 'undefined') lastDisplayedSpeedText = `${t('speed')} 1.00x`;
    } else if (typeof speedEl !== 'undefined' && speedEl && typeof isPlaying !== 'undefined' && isPlaying) {
        if (typeof lastDisplayedSpeedText !== 'undefined') lastDisplayedSpeedText = "";
    }

    // Cập nhật trạng thái active cho các radio ngôn ngữ
    const langOptions = document.getElementById('language-options');
    if (langOptions) {
        const radioButtons = langOptions.querySelectorAll('input[name="selected-language"]');
        radioButtons.forEach(radio => {
            const label = radio.closest('label');
            const span = label.querySelector('.lang-text') || label.querySelector('span');
            if (radio.value === userLang) {
                radio.checked = true;
                label.classList.add('border-cyan-400', 'shadow-[0_0_10px_rgba(6,182,212,0.1)]', 'bg-cyan-950/40');
                label.classList.remove('border-cyan-500/20');
                if (span) {
                    span.classList.add('text-cyan-400');
                    span.classList.remove('text-gray-300');
                }
            } else {
                radio.checked = false;
                label.classList.remove('border-cyan-400', 'shadow-[0_0_10px_rgba(6,182,212,0.1)]', 'bg-cyan-950/40');
                label.classList.add('border-cyan-500/20');
                if (span) {
                    span.classList.remove('text-cyan-400');
                    span.classList.add('text-gray-300');
                }
            }
        });
    }

    // Cập nhật trạng thái active cho nút ngôn ngữ cảnh báo WebGL
    const webglLangVi = document.getElementById('webgl-lang-vi');
    const webglLangEn = document.getElementById('webgl-lang-en');
    if (webglLangVi && webglLangEn) {
        webglLangVi.classList.toggle('text-cyan-400', activeLang === 'vi');
        webglLangVi.classList.toggle('text-gray-500', activeLang !== 'vi');
        webglLangEn.classList.toggle('text-cyan-400', activeLang === 'en');
        webglLangEn.classList.toggle('text-gray-500', activeLang !== 'en');
    }

    if (typeof window.adjustTabsKerning === 'function') {
        window.adjustTabsKerning();
    }

    if (typeof window.updateFullscreenUI === 'function') {
        window.updateFullscreenUI();
    }

    if (typeof window.updateFpsSyncUI === 'function') {
        window.updateFpsSyncUI();
    }

    if (typeof window.updateAntiAliasingStatusUI === 'function') {
        window.updateAntiAliasingStatusUI();
    }
}

window.setGameLanguage = async function (lang) {
    if (!availableLangs.includes(lang) && lang !== 'auto') return;
    localStorage.setItem('selectedLanguage', lang);
    userLang = lang;
    detectLanguage();
    await ensureLanguageLoaded(activeLang);
    applyTranslations();
    if (typeof window.checkPWAInstallationStatus === 'function') {
        window.checkPWAInstallationStatus();
    }
};

window.showNotifyMe = function (platform) {
    const msg = (typeof t === 'function' ? t('download_notify_toast') : null) || 'Cảm ơn bạn! Phiên bản này sẽ sớm có mặt trong bản cập nhật tới.';
    if (typeof showCustomNotification === 'function') {
        showCustomNotification(msg, 'info');
    } else if (typeof showToast === 'function') {
        showToast(msg);
    } else {
        alert(msg);
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await translationsPromise;
    } catch (e) {
        console.error("Chờ tải ngôn ngữ thất bại:", e);
    }
    applyTranslations();

    const langOptions = document.getElementById('language-options');
    if (langOptions) {
        const radioButtons = langOptions.querySelectorAll('input[name="selected-language"]');
        radioButtons.forEach(radio => {
            radio.addEventListener('change', async (e) => {
                if (e.target.checked) {
                    const selectedVal = e.target.value;
                    localStorage.setItem('selectedLanguage', selectedVal);
                    userLang = selectedVal;
                    detectLanguage();
                    await ensureLanguageLoaded(activeLang);
                    applyTranslations();

                    if (typeof renderSongList === 'function') {
                        const searchInput = document.getElementById('song-search');
                        renderSongList(searchInput ? searchInput.value : '');
                    }
                }
            });
        });
    }

    // Sự kiện đổi ngôn ngữ trên màn hình cảnh báo WebGL
    const webglLangVi = document.getElementById('webgl-lang-vi');
    const webglLangEn = document.getElementById('webgl-lang-en');
    if (webglLangVi) {
        webglLangVi.addEventListener('click', async () => {
            localStorage.setItem('selectedLanguage', 'vi');
            userLang = 'vi';
            detectLanguage();
            await ensureLanguageLoaded(activeLang);
            applyTranslations();
        });
    }
    if (webglLangEn) {
        webglLangEn.addEventListener('click', () => {
            localStorage.setItem('selectedLanguage', 'en');
            userLang = 'en';
            detectLanguage();
            applyTranslations();
        });
    }
});