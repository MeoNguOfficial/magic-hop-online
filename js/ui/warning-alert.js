const dict = {
    vi: {
        title: "Cảnh Báo Hệ Thống | Cyber Beat Hopper",
        heading: "Ey zô quách súp!!!",
        message: "Hệ thống phát hiện hành vi bất thường.<br>Bảo vệ bởi MeoTN Easy AntiCheat.<br><br><span class='text-red-400 font-bold uppercase'>Chà... Bạn đang làm gì đó ở hậu trường thế? Vui lòng đóng các công cụ kiểm tra để tiếp tục nhé!</span>",
        btn: "QUAY LẠI TRÒ CHƠI",
        closedSuccess: "<span class='text-green-400 font-bold uppercase text-base'>Đã tắt công cụ kiểm tra thành công!</span><br><br><span class='text-gray-200'>Hệ thống đang tự động đưa bạn trở lại trò chơi...</span>",
        stillOpenWarn: "<span class='text-red-500 font-black uppercase text-base animate-pulse'>⚠️ BẠN CHƯA TẮT CÔNG CỤ KIỂM TRA!</span><br><br><span class='text-yellow-300 font-bold'>Vui lòng đóng hoàn toàn cửa sổ DevTools (F12) trước khi quay lại nhé!</span>",
        btnReturning: "ĐANG VÀO LẠI GAME..."
    },
    en: {
        title: "System Warning | Cyber Beat Hopper",
        heading: "Ey zô quách súp!!!",
        message: "System detected unusual behavior.<br>Protected by MeoTN Easy AntiCheat.<br><br><span class='text-red-400 font-bold uppercase'>Well... What are you doing behind the scenes? Please close any inspecting tools to continue!</span>",
        btn: "RETURN TO GAME",
        closedSuccess: "<span class='text-green-400 font-bold uppercase text-base'>Inspecting tools closed successfully!</span><br><br><span class='text-gray-200'>Automatically returning to game...</span>",
        stillOpenWarn: "<span class='text-red-500 font-black uppercase text-base animate-pulse'>⚠️ DEVTOOLS IS STILL OPEN!</span><br><br><span class='text-yellow-300 font-bold'>Please close all developer tools (F12) before returning!</span>",
        btnReturning: "RETURNING TO GAME..."
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
    if (heading) {
        heading.innerHTML = t.heading;
        heading.setAttribute('data-text', t.heading); // Áp dụng nội dung cho hiệu ứng Glitch
        if (currentLang === 'vi') heading.classList.remove('font-orbitron');
        else heading.classList.add('font-orbitron');
    }

    const msg = document.getElementById('warn-message');
    if (msg && !isReturning) {
        msg.innerHTML = t.message;
    }

    const btn = document.getElementById('warn-btn');
    if (btn && !isReturning) {
        btn.innerText = t.btn;
    }

    // Đổi màu highlight cho UI chuyển đổi ngôn ngữ
    const btnVi = document.getElementById('btn-lang-vi');
    const btnEn = document.getElementById('btn-lang-en');
    if (btnVi) {
        btnVi.classList.toggle('text-cyan-400', currentLang === 'vi');
        btnVi.classList.toggle('text-gray-500', currentLang !== 'vi');
    }
    if (btnEn) {
        btnEn.classList.toggle('text-cyan-400', currentLang === 'en');
        btnEn.classList.toggle('text-gray-500', currentLang !== 'en');
    }
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
    } catch (e) {}

    // Nếu KHÔNG bật Dev Mode, âm thầm chặn menu context
    if (!isDevModeActive) {
        event.preventDefault();
    }
});

// ============================================================
// AUTO-RETURN WATCHER (TỰ ĐỘNG CHUYỂN HƯỚNG KHI TẮT DEVTOOLS)
// ============================================================
let isReturning = false;
let closedConfirmedStreak = 0;

function isDevToolsCurrentlyOpen() {
    // 1. Kiểm tra độ lệch kích thước cửa sổ (DevTools docked)
    const threshold = 160;
    const wDiff = window.outerWidth - window.innerWidth;
    const hDiff = window.outerHeight - window.innerHeight;
    if (wDiff > threshold || hDiff > threshold) {
        return true;
    }

    // 2. Kiểm tra độ trễ debugger (DevTools undocked/detached)
    const t0 = performance.now();
    (function() {}.constructor("debugger")());
    if (performance.now() - t0 > 100) {
        return true;
    }

    return false;
}

function handleAutoReturn() {
    if (isReturning) return;
    isReturning = true;

    // Chuyển card sang trạng thái xanh an toàn
    const card = document.getElementById('warn-card') || document.querySelector('.max-w-xl');
    if (card) {
        card.classList.remove('border-red-500/50', 'shadow-[0_0_40px_rgba(255,0,85,0.3)]', 'animate-shake');
        card.classList.add('border-green-500/50', 'shadow-[0_0_40px_rgba(34,197,94,0.4)]');
    }

    const msg = document.getElementById('warn-message');
    if (msg) {
        msg.innerHTML = dict[currentLang].closedSuccess;
    }

    const btn = document.getElementById('warn-btn');
    if (btn) {
        btn.innerText = dict[currentLang].btnReturning;
        btn.classList.remove('bg-red-600', 'hover:bg-red-500');
        btn.classList.add('bg-green-600', 'hover:bg-green-500');
    }

    // Dừng âm thanh cảnh báo nếu đang phát
    try {
        warningAudio.pause();
    } catch (e) {}

    setTimeout(() => {
        window.location.replace('index.html');
    }, 700);
}

// 1. Tích hợp disable-devtool lắng nghe sự kiện ondevtoolclose
if (typeof DisableDevtool === 'function') {
    try {
        DisableDevtool({
            ondevtoolclose: function() {
                handleAutoReturn();
            }
        });
    } catch (e) {}
}

// 2. Lắng nghe sự kiện resize (khi người dùng đóng bảng DevTools docked)
window.addEventListener('resize', () => {
    if (!isDevToolsCurrentlyOpen()) {
        closedConfirmedStreak++;
        if (closedConfirmedStreak >= 1) {
            handleAutoReturn();
        }
    } else {
        closedConfirmedStreak = 0;
    }
}, { passive: true });

// 3. Vòng lặp kiểm tra định kỳ mỗi 500ms
const checkDevToolsClosedInterval = setInterval(() => {
    if (isReturning) {
        clearInterval(checkDevToolsClosedInterval);
        return;
    }

    if (!isDevToolsCurrentlyOpen()) {
        closedConfirmedStreak++;
        // Xác nhận đóng DevTools an toàn trong 2 chu kỳ liên tiếp (~1s)
        if (closedConfirmedStreak >= 2) {
            clearInterval(checkDevToolsClosedInterval);
            handleAutoReturn();
        }
    } else {
        closedConfirmedStreak = 0;
    }
}, 500);

// 4. Xử lý nút bấm thủ công "QUAY LẠI TRÒ CHƠI"
window.handleReturnToGame = function() {
    if (isReturning) return;

    if (isDevToolsCurrentlyOpen()) {
        // DevTools vẫn đang mở -> Cảnh báo và rung lắc giao diện
        const card = document.getElementById('warn-card') || document.querySelector('.max-w-xl');
        if (card) {
            card.classList.remove('animate-shake');
            void card.offsetWidth; // Trigger reflow để chạy lại animation
            card.classList.add('animate-shake');
        }

        const msg = document.getElementById('warn-message');
        if (msg) {
            msg.innerHTML = dict[currentLang].stillOpenWarn;
        }
        return;
    }

    // DevTools đã đóng -> Quay lại ngay
    handleAutoReturn();
};