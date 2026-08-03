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
const availableLangs = ['vi', 'en', 'fr', 'zh-CN', 'zh-TW', 'ko', 'ja', 'es', 'pt', 'ru'];

// Tải dữ liệu ngôn ngữ từ thư mục language/
const translationsPromise = Promise.all(
    availableLangs.map(lang => 
        fetch(`language/${lang}.json`)
            .then(r => r.json())
            .then(data => { dict[lang] = data; })
    )
).catch(err => {
    console.error("Lỗi tải ngôn ngữ:", err);
});

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
        activeLang = userLang;
    }
}

detectLanguage();

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
}

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
            radio.addEventListener('change', (e) => {
                if (e.target.checked) {
                    const selectedVal = e.target.value;
                    localStorage.setItem('selectedLanguage', selectedVal);
                    userLang = selectedVal;
                    detectLanguage();
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
        webglLangVi.addEventListener('click', () => {
            localStorage.setItem('selectedLanguage', 'vi');
            userLang = 'vi';
            detectLanguage();
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