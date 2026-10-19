const dict = {
    vi: {
        title: "Cảnh Báo Hệ Thống | Cyber Beat Hopper",
        heading: "Ey zô quách súp!!!",
        message: "Hệ thống phát hiện hành vi bất thường.<br>Bảo vệ bởi MeoTN Easy Cheat.<br><br><span class='text-red-400 font-bold uppercase'>Chà... Bạn đang làm gì đó ở hậu trường thế? Vui lòng đóng các công cụ kiểm tra để tiếp tục nhé!</span>",
        btn: "QUAY LẠI TRÒ CHƠI"
    },
    en: {
        title: "System Warning | Cyber Beat Hopper",
        heading: "Ey zô quách súp!!!",
        message: "System detected unusual behavior.<br>Protected by MeoTN Easy Cheat.<br><br><span class='text-red-400 font-bold uppercase'>Well... What are you doing behind the scenes? Please close any inspecting tools to continue!</span>",
        btn: "RETURN TO GAME"
    }
};

const XOR_KEY = "MeoTNCyberHop2024";
function xorEncryptDecrypt(input) {
    let output = '';
    for (let i = 0; i < input.length; i++) {
        output += String.fromCharCode(input.charCodeAt(i) ^ XOR_KEY.charCodeAt(i % XOR_KEY.length));
    }
    return output;
}

// Hàm giải mã giá trị từ localStorage do i18n.js đã mã hóa
function getSavedLanguage() {
    let val = localStorage.getItem('selectedLanguage');
    if (!val) return 'auto';

    if (val.startsWith("MEO_")) {
        try {
            let decodedBase64 = atob(val.substring(4));
            let unxored = xorEncryptDecrypt(decodedBase64);
            return decodeURIComponent(unxored);
        } catch (e) { }
    }

    try {
        let decoded = atob(val);
        if (/^[\x20-\x7E]*$/.test(decoded)) {
            return decodeURIComponent(decoded);
        }
    } catch (e) { }
    return val;
}

let userLang = getSavedLanguage();
let currentLang = 'en';
if (userLang === 'auto' || !userLang) {
    currentLang = (navigator.language || navigator.userLanguage).startsWith('vi') ? 'vi' : 'en';
} else {
    currentLang = userLang === 'vi' ? 'vi' : 'en';
}

function applyLang(lang) {
    currentLang = lang;
    const t = dict[currentLang];
    document.title = t.title;

    const heading = document.getElementById('warn-heading');
    heading.innerHTML = t.heading;
    heading.setAttribute('data-text', t.heading); // Áp dụng nội dung cho hiệu ứng Glitch
    document.getElementById('warn-message').innerHTML = t.message;
    document.getElementById('warn-btn').innerText = t.btn;

    // Tắt font Orbitron nếu dùng tiếng Việt để tránh lỗi hiển thị có dấu
    if (currentLang === 'vi') heading.classList.remove('font-orbitron');
    else heading.classList.add('font-orbitron');

    // Đổi màu highlight cho UI chuyển đổi ngôn ngữ
    document.getElementById('btn-lang-vi').classList.toggle('text-cyan-400', currentLang === 'vi');
    document.getElementById('btn-lang-vi').classList.toggle('text-gray-500', currentLang !== 'vi');
    document.getElementById('btn-lang-en').classList.toggle('text-cyan-400', currentLang === 'en');
    document.getElementById('btn-lang-en').classList.toggle('text-gray-500', currentLang !== 'en');
}

function setLanguage(lang) {
    try {
        let uriEncoded = encodeURIComponent(lang);
        let xored = xorEncryptDecrypt(uriEncoded);
        localStorage.setItem('selectedLanguage', "MEO_" + btoa(xored));
    }
    catch (e) { localStorage.setItem('selectedLanguage', lang); }
    applyLang(lang);
}

applyLang(currentLang);

// Tự động phát âm thanh cảnh báo
const warningAudio = new Audio("https://an4sdmu4yskbqrq6.public.blob.vercel-storage.com/dd_start.mp3");
warningAudio.loop = true;
warningAudio.play().catch(() => {
    document.body.addEventListener('click', () => warningAudio.play(), { once: true });
});

// --- ANTI RIGHT-CLICK SECURE SCRIPT (SILENT) ---
document.addEventListener('contextmenu', (event) => {
    let isDevModeActive = false;
    try {
        if (typeof window.getDevMode === 'function') {
            isDevModeActive = (window.getDevMode() === true);
        }
    } catch (e) {
        // Bỏ qua lỗi nếu có
    }

    // Nếu KHÔNG bật Dev Mode, âm thầm chặn menu context
    if (!isDevModeActive) {
        event.preventDefault();
    }
});