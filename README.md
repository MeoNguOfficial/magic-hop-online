# 🎵 Cyber Beat Hopper (v1.1.0)

**Cyber Beat Hopper** (phiên bản hiện tại **v1.1.0**, phát triển trên nền tảng *MeoTN HOP ENGINE v3.7*) là một tựa game nhịp điệu (Rhythm Game) 3D mang phong cách Cyberpunk/Neon rực rỡ và cuốn hút. Game kết hợp hoàn hảo giữa lối chơi nảy gạch theo giai điệu dồn dập, kết nối **Online** (bảng xếp hạng, lưu tài khoản, đồng bộ đám mây), khả năng chơi ngoại tuyến toàn diện (PWA & Desktop Standalone) và hệ thống tùy biến sâu rộng.

---
## 🚀 Phiên Bản v1.1.0 Có gì mới?

# 🚀 UPDATE LOG: ĐẠI TU GIAO DIỆN TECHNOLOGY STYLE (UI 2.0), KHỬ RĂNG CƯA HẬU KỲ, REMASTER ÂM THANH GAME OVER & TỐI ƯU HIỆU SUẤT HIGH-REFRESH-RATE (RELEASE v1.1.0)

Chào các bạn, bản cập nhật **v1.1.0** đánh dấu cuộc lột xác toàn diện về mặt giao diện theo ngôn ngữ **Cyber Technology Style**, nâng cấp chất lượng hình ảnh/âm thanh và triệt tiêu các điểm nghẽn khung hình trên cả Web lẫn App Native:

---

### 🖥️ 1. ĐẠI TU GIAO DIỆN TECHNOLOGY STYLE (CYBER TECH UI)
- **Đồng bộ ngôn ngữ thiết kế Technology Style trên toàn bộ ứng dụng:**
  - Làm mới toàn bộ hệ thống giao diện từ Menu chính, Chọn bài hát, Bảng xếp hạng/Tài khoản, Cài đặt (Settings), Cài đặt nhanh (Quick Settings), Chat, Trình phát nhạc (Music Player) cho tới màn hình Game Over và HUD chiến đấu.
- **Tối ưu thao tác Cài đặt & Tìm kiếm:**
  - Khắc phục hiển thị icon kính lúp trong thanh tìm kiếm Settings (`SEARCH SETTINGS...`) và tinh gọn **Quick Settings** bằng cách loại bỏ các tùy chọn lỗi thời.
  - Chuẩn hóa hệ thống hoạt ảnh chuyển tab mượt mà thông qua mô-đun mới [`js/core/ui-animations.js`](file:///d:/MeoTN%20Games/MagicHopGame/magic-hop-online/js/core/ui-animations.js).

---

### 🎨 2. KHỬ RĂNG CƯA HẬU KỲ & TỐI ƯU HIỆU SUẤT HIGH-REFRESH-RATE (120HZ – 240HZ)
- **Hệ thống khử răng cưa hậu kỳ (`AntiAliasingManager`):**
  - Bổ sung [`js/engine/antialiasing.js`](file:///d:/MeoTN%20Games/MagicHopGame/magic-hop-online/js/engine/antialiasing.js) hỗ trợ nâng độ sắc nét cạnh khối 3D và phối hợp với bộ điều phối hiệu năng thích ứng (`AdaptivePerformanceManager`).
- **Sửa lỗi nhận diện tần số quét màn hình:**
  - Khắc phục hiện tượng nhận diện nhầm tần số quét màn hình trong `FPS Sync Mode`, giúp khóa nhịp và đồng bộ khung hình ổn định trên cả màn 60Hz/75Hz lẫn màn tần số quét cao 120Hz/144Hz/240Hz+.
- **Triệt tiêu các điểm nghẽn gây tụt FPS (Zero-Stutter Hot Path):**
  - **Fake Blocks Shared Materials:** Gom vật liệu khối giả dùng chung và pool vật liệu trượt thoát (`_exitingMatPool`) thay vì clone `ShaderMaterial` cho từng khối trong pool.
  - **Prewarm toàn dải cho Dash & Normal Blocks:** Quét khởi tạo trước hình học **Dash Tile** theo bước lượng tử hóa `0.25` trên toàn dải góc xiên để đạt tỷ lệ trúng cache 100% giữa trận; prewarm sẵn `vortexMat` trong pool gạch và bộ nhãn Sprite (`Round`, `%`, `Star`).
  - **Giảm tải CPU/GPU giữa trận:** Chặn việc ép hạ `pixelRatio` gây reallocate `RenderTarget` đột ngột ở tốc độ cao khi FPS đang ổn định, thay ring buffer cho lịch sử FPS, diff-cache DOM ở HUD FPS và tối giản kiểm tra vòng lặp `animate()`.

---

### 🎮 3. GAMEPLAY UX & REMASTER HIỆU ỨNG ÂM THANH GAME OVER
- **Màn chờ Pre-start chạy xếp gạch liên tục:**
  - Đường gạch ở màn hình chờ **Tap to Play** giờ sẽ tiếp tục chạy xếp tự nhiên, chỉ thực sự đóng băng không gian khi người chơi **Tạm dừng (Pause)**.
- **Remaster hiệu ứng Game Over khi bật `Preserve Pitch`:**
  - Thay vì giữ tốc độ/chất âm khô cứng hoặc tắt thô `preservesPitch`, chuỗi xử lý Web Audio mới kết hợp `DelayNode` + `BiquadFilterNode` + điều biến tốc độ tạo ra hiệu ứng **tape-stop** (băng đĩa chùng dần rồi tắt) tự nhiên tương đồng khi tắt `Preserve Pitch`, hỗ trợ cả chế độ fallback.

---

## 🚀 Bản trước đó: Phiên Bản v1.0.10 Có gì mới?

**Cyber Beat Hopper v1.0.10** tập trung hoàn thiện chiều sâu cá nhân hóa, bổ sung hiệu ứng vật lý/đồ họa mới và khử khựng vi mô ở FPS cao:

- **Tái cấu trúc Personalize đa tab kèm Preview trực quan:** Tổ chức lại mục **Nền & Bóng** thành 5 tab (`Hình nền`, `Bóng`, `Môi trường`, `Đường biên`, `Hạt biên`); thêm 2 hình nền **Màu theo độ khó (`difficulty`)** & **Công nghệ (`led_board`)** cùng preview 3D cho 4 Môi trường và 6 Hoa văn bóng; sửa lỗi lưu cài đặt Personalize.
- **Hạt Đường Biên (`Boundary Particles`) & Remaster Đường Biên:** Bổ sung 6 chế độ hạt bắn từ hai bên đường biên theo nhịp beat cùng thẻ preview minh họa mới.
- **Vortex Block, Dash Block & Sửa lỗi lệch nhịp Mesh:** Ra mắt **Vortex Block**, tinh chỉnh **Dash Block**, sửa lỗi va chạm mesh gây trôi nhịp, thêm nút **Bỏ qua kiểm tra Online**, làm mới Logo và tắt Pointer Lock tự động sau warm-up.
- **Đồng bộ 10 ngôn ngữ:** Chuẩn hóa 658 khóa dịch trên toàn bộ 10 quốc gia.

---

## 📜 Tóm tắt các phiên bản trước (v1.0.0 – v1.0.9)

<details>
<summary>Xem tóm tắt thay đổi từ v1.0.0 đến v1.0.9</summary>

- **v1.0.9:** Ra mắt cụm Hero Đĩa Than Vinyl 3D tương tác tại màn chọn bài hát, tối ưu HUD Landscape mobile/tablet (APK), kích hoạt Immersive Fullscreen, sửa lỗi Shockwaves, nhấp nháy màu, bàn phím ảo trên Android APK và đồng bộ âm thanh focus/intro.

- **v1.0.8:** Anti-Back & Reload Shield bảo vệ ván đấu, nhấn 2 lần nút Back để thoát, tái cấu trúc menu FPS Sync Mode theo tần số quét màn hình và khai báo đa nền tảng 10 ngôn ngữ.
- **v1.0.7:** Ra mắt bản đóng gói Native PC Standalone (C# Winsock + WebView2/Chromium, không Electron) và Android APK, bảo toàn dữ liệu 100% khi cập nhật, In-Game Page Viewer, modal Tải App 5 nền tảng & bộ kiểm tra cập nhật đa tầng.
- **v1.0.6:** Ra mắt **Dash Tile** (Gạch lướt siêu tốc), nâng cấp AI Autoplay/Natural Autoplay cho Dash và tiền biên dịch GPU Shader (`prewarmAllGpuShaders`) triệt tiêu drop FPS.
- **v1.0.5:** Hỗ trợ 4 mức cỡ chữ UI & HUD (`Small`–`Very Large`), sửa lỗi zoom khi quay về menu từ Game Over và tăng tốc hồi nảy Bouncy Block.
- **v1.0.4:** Bộ điều phối hiệu năng thích ứng (`adaptive-performance.js`), biểu đồ FPS Cyberpunk real-time, mô-đun hóa mã nguồn & migration 100% nội bộ (Tailwind CLI cục bộ, không CDN), lưu trữ OPFS + IndexedDB v3, Anti-DevTools đa tầng và mở rộng 10 ngôn ngữ.
- **v1.0.3:** Cập nhật khu vực Backend API, chuẩn hóa điều kiện mở khóa Endless Mode (yêu cầu Passed Normal Mode) và nâng cấp cache PWA.
- **v1.0.2:** Tối ưu Object Pooling cho Neon Boundary Pulses đồng bộ theo `gameSpeed` và ra mắt trang giấy phép `license.html`.
- **v1.0.1:** Bổ sung nhạc mới, đặt nền móng Online Alpha Test và tối ưu 20% RAM tải audio.
- **v1.0.0:** Phiên bản đầu tiên với thuật toán Moving/Fake Block, Bot Assist, Invert Controls, hiệu ứng Intro/Outro điện ảnh, tải Beatmap ETag thông minh và nền tảng PWA.

</details>

---

# 🎮 Cách Chơi (How To Play)

## 🌟 Giới thiệu

Mục tiêu của bạn rất đơn giản:

**Điều khiển quả bóng nảy qua từng khối gạch bát giác (Octagonal Tiles) trong không gian 3D và tuyệt đối không để rơi vào khoảng không vô tận.**

Càng đi xa, điểm số càng cao và thử thách càng khắc nghiệt hơn.

---

# 🕹️ Điều Khiển Cơ Bản

## 📱 Trên điện thoại

* Chạm và vuốt sang **trái** hoặc **phải** trên màn hình.
* Điều chỉnh hướng di chuyển và vị trí tiếp đất của quả bóng.
* Hệ thống điều khiển được tối ưu cho trải nghiệm chơi nhạc mượt mà.

## 🖥️ Trên máy tính

* Nhấn giữ **chuột trái**.
* Kéo chuột sang **trái** hoặc **phải** để điều khiển hướng rơi.
* Có thể bật chế độ **PC Drag Mode** trong phần Cài đặt để tăng độ chính xác khi điều khiển.

---

# 🎯 Hệ Thống PERFECT & Điểm Số

## 💎 PERFECT là gì?

Mỗi khối gạch đều có một vùng "hồng tâm" ở chính giữa.

Khi quả bóng tiếp đất chính xác vào khu vực này, bạn sẽ nhận được:

**PERFECT!**

## 🔥 Combo PERFECT

Thực hiện nhiều cú PERFECT liên tiếp để tăng hệ số nhân điểm:

* x2
* x3
* x4
* x5
* ...

Chuỗi combo càng dài, điểm số tăng càng nhanh. Nhưng không phải là tăng theo combo, mà là có giới hạn là 20 điểm, tức là từ 20 trở đi, anh em sẽ được 21 điểm.---

# 🌀 Chế Độ Vô Tận (Endless Mode)

Khi giai điệu bắt đầu vang lên, hành trình của bạn sẽ không có điểm kết thúc.

## 🎵 Giai Đoạn Khởi Động (Warm-up)

Game bắt đầu với nhịp độ vừa phải:

* Tốc độ bình thường (1x)
* Khoảng cách gạch dễ làm quen
* Góc nhìn ổn định

Đây là thời gian để bạn:

* Làm quen với bài nhạc
* Cảm nhận nhịp điệu
* Thích nghi với không gian 3D

---

## ♾️ Vòng Lặp Vô Tận

Sau khi kết thúc phần Warm-up:

**Chế độ Endless sẽ tự động được kích hoạt.**

Không có đích đến.

Không có điểm dừng.

Chỉ còn bạn, âm nhạc và thử thách ngày càng khốc liệt phía trước.

---

# ⚡ Độ Khó Tăng Dần

Mỗi vòng vượt qua thành công sẽ khiến trò chơi trở nên khó hơn.

## 🎼 Tốc Độ Nhạc Tăng

* BPM tăng dần
* Nhịp điệu dồn dập hơn
* Yêu cầu phản xạ nhanh hơn

## 🚀 Tốc Độ Trò Chơi Tăng

* Quả bóng di chuyển nhanh hơn
* Các khối gạch xuất hiện dày đặc hơn
* Thời gian phản ứng ngày càng ngắn

Chỉ một khoảnh khắc mất tập trung cũng có thể khiến bạn thất bại.

---

# 🌌 Cơ Chế Xoay & Hút 3D Độc Đáo

Khi tốc độ tăng cao, môi trường 3D sẽ liên tục thay đổi:

* Góc nhìn xoay động
* Hướng di chuyển biến đổi
* Hiệu ứng hút của các khối gạch
* Không gian liên tục dịch chuyển

Bạn phải:

* Quan sát thật nhanh
* Điều hướng chính xác
* Tận dụng lực hút của các khối gạch để duy trì quỹ đạo

Chỉ một cú vuốt sai thời điểm cũng có thể khiến quả bóng văng khỏi đường đi.

---

# ☠️ Chế Độ Sinh Tử

Khác với nhiều tựa game âm nhạc hoặc casual khác, thì với game này ta có:

* ❌ Không hồi sinh
* ❌ Không tiếp tục lượt chơi
* ❌ Không xem quảng cáo để cứu thua
* ❌ Không có cơ hội thứ hai

Bạn chỉ có:

# ❤️ 1 Mạng Duy Nhất

Trượt một khối gạch?

**GAME OVER**

Mọi sai lầm đều phải trả giá bằng việc bắt đầu lại từ đầu.
Nhưng bù lại tất cả bài hát sẽ được mở khóa cho bạn thoải mái lựa chọn

---

## 🌟 Tính năng nổi bật

- **Đồ họa 3D Cyberpunk & Object Pooling:** Hiệu ứng hình ảnh rực rỡ với các hạt bụi không gian (Particles), Sóng xung kích bo tròn (Shockwaves), Xung nhịp đường biên (Boundary Pulses), Bụi lửa độ khó (Boundary Flames) và Đuôi bóng 3D (`InstancedMesh`) triệt tiêu hoàn toàn rác bộ nhớ (GC).
- **Điều phối Hiệu năng Thích ứng (Adaptive Performance):** Tự động giám sát khung hình và tiết giảm tải CPU/GPU khi máy yếu, kết hợp cơ chế bảo vệ băng thông Fillrate ở tốc độ cao trên màn hình High-DPI/Retina để duy trì 60 FPS ổn định.
- **HUD & Biểu đồ FPS Cyberpunk:** Đồng hồ đo FPS, Frametime và đồ thị Canvas 60 frame thời gian thực phong cách Neon cực nhẹ với công nghệ zero-allocation.
- **Vật lý nảy gạch chân thực (Dynamic Bounce Physics):** Độ lún sâu của khối gạch nảy tăng lên 0.52 world units kết hợp tùy chọn tốc độ đàn hồi biến thiên theo nhịp độ bài hát (`dynamicBounceSpeedEnabled`).
- **Lưu trữ thế hệ mới (OPFS & IndexedDB v3):** Ứng dụng Origin Private File System kết hợp IndexedDB lưu trữ âm thanh, dữ liệu Beatmap ngoại tuyến tốc độ cao kèm giao diện StorageManager theo dõi và dọn dẹp dung lượng thông minh.
- **Bảo mật đa tầng (MeoTN Easy AntiCheat):** Tích hợp hệ thống bảo vệ Anti-Dev Engine đa tầng (Size mismatch, Debugger timing loop, Element trap, Key blocker, Target-scoped MutationObserver) ngăn chặn can thiệp trái phép.
- **Đa ngôn ngữ toàn cầu (10 Ngôn ngữ - i18n):** Hỗ trợ chuyển đổi mượt mà giữa 10 thứ tiếng (Tiếng Việt, Anh, Pháp, Trung Giản thể, Trung Phồn thể, Hàn, Nhật, Tây Ban Nha, Bồ Đào Nha, Nga).
- **Âm nhạc & Beat Editor tích hợp:** Danh sách bài hát đa thể loại với nhịp điệu căn chỉnh khớp từng khối gạch, đi kèm công cụ biên tập beatmap trực quan (`beat_editor.html`).
- **PWA Hoạt động Offline Toàn diện:** Service Worker tải ngầm thông minh, cho phép cài đặt app trên mọi thiết bị và chơi trọn vẹn không cần kết nối mạng.

---

## 🛠 Công nghệ sử dụng

Dự án được xây dựng và tối ưu chạy trực tiếp trên nền tảng Web hiện đại:
- **HTML5 / CSS3 / JavaScript (ES6+ Modular Architecture):** Mã nguồn được tổ chức mô-đun hóa rõ ràng theo cấu trúc thư mục chuẩn mực (`js/audio`, `js/core`, `js/engine`, `js/game`, `js/services`, `js/ui`).
- **Tailwind CSS:** Thiết kế giao diện phong cách Cyberpunk Responsive, được biên dịch precompiled cục bộ bằng `@tailwindcss/cli` (`css/tailwind.min.css`) tối ưu dung lượng và tốc độ tải.
- **Three.js:** Xây dựng không gian 3D, camera, ánh sáng, vật liệu neon và cơ chế Object Pooling / `InstancedMesh`.
- **AnimeJS:** Xử lý các hiệu ứng chuyển động và hoạt ảnh mượt mà cho UI.
- **Web Audio API:** Xử lý giải mã âm thanh đa kênh, AudioContext, bộ lọc tần số (Lowpass) và đồng bộ tốc độ phát theo thời gian thực.
- **OPFS (Origin Private File System) & IndexedDB (MagicHopDB v3):** Lưu trữ dữ liệu beatmap và tệp âm thanh hiệu năng cao trực tiếp trên trình duyệt.
- **Service Worker & Cache API:** Hỗ trợ PWA, cập nhật tài nguyên ngầm và hoạt động ngoại tuyến.

---

## 🚀 Hướng dẫn chạy dự án ở Local (Local Setup)

Vì dự án xử lý tải các tệp tin âm thanh và beatmap, bạn cần chạy thông qua một máy chủ web cục bộ (Local Web Server) thay vì mở trực tiếp file `index.html` trên trình duyệt để tránh lỗi bảo mật CORS.

**Các bước thực hiện:**
1. Clone hoặc tải mã nguồn dự án về máy.
2. Mở thư mục dự án bằng một trình soạn thảo (khuyên dùng **VS Code**).
3. Cài đặt tiện ích mở rộng **Live Server** trên VS Code.
4. Nhấn chuột phải vào file `index.html` và chọn **"Open with Live Server"**.
5. Trình duyệt sẽ tự động khởi chạy game tại địa chỉ `http://localhost:5500`.

*Mẹo: Nếu bạn đã cài đặt Node.js hoặc Python, bạn cũng có thể mở Terminal tại thư mục dự án và chạy `npx http-server` hoặc `python -m http.server`.*

---

## 🎧 Tùy chỉnh danh sách bài hát (Custom Playlist) Cho người phát triển

Bạn có thể dễ dàng thêm hoặc thay đổi bài hát bằng cách sử dụng file JSON riêng biệt hoặc khai báo đường link vào mảng `playlistSource` trong tệp `js/audio/playlist.js`. Việc này giúp dễ dàng chia sẻ, lưu trữ trên Cloud và quản lý:

**1. Cấu trúc một file JSON bài hát (ví dụ: `my-song.json`):**
```json
{
    "name": "Tên bài hát",
    "artist": "Tên nghệ sĩ",
    "speed": 18,
    "genre": "Thể loại nhạc (VD: EDM, Pop)",
    "bpm": 120,
    "copyright_status": "Verified",
    "no_fake_block": false,
    "url": "https://link-toi-file-nhac.mp3",
    "warning_alert": "Ví dụ cảnh báo",
    "day_show": {ngày của mình},
    "day_hide": {ngày của mình},
    "is_available": true,
    "beats": [0.5, 1.2, 2.0, 3.5, 4.1]
}
```

**2. Khai báo vào game (`js/audio/playlist.js`):**
```javascript
const playlistSource = [
    // Dùng link URL đến file JSON (Cloud hoặc Local)
    {
        name: "Aleph-0",
        artist: "Leaf",
        warning_alert: "Level nhịp dồn dập, có thể gây lag cho máy yếu",
        beatmapUrl: "beatmap/music_41.json" // Đường link URL tới file JSON hoặc đường dẫn cục bộ
    },
];
```
*Lưu ý:*
- Mảng `beats` là các mốc thời gian (tính bằng giây) chỉ định lúc quả bóng nảy trúng khối gạch. Bạn có thể tự căn nhịp thủ công hoặc dùng công cụ Beat Editor (`beat_editor.html`) tích hợp sẵn.
- Về bản quyền âm nhạc: Khi thêm các bài hát tùy chỉnh của riêng bạn vào trò chơi, vui lòng đảm bảo rằng bạn có quyền sử dụng hợp pháp các bản nhạc đó (nhạc không bản quyền, nhạc tự sáng tác, hoặc đã mua giấy phép) để tránh các vấn đề vi phạm bản quyền khi phát hành ra cộng đồng.

---

## 📜 Giấy phép & Bản quyền (License & Credits)

Dự án phát hành dưới điều khoản **MIT License**:
- Bạn được tự do sử dụng, sao chép, sửa đổi, hợp nhất, xuất bản, phân phối và sử dụng cho cả mục đích cá nhân lẫn thương mại theo các điều khoản của giấy phép MIT.

- Xem chi tiết danh sách tín nhiệm tại [CREDITS.md](file:///d:/MeoTN%20Games/MagicHopGame/magic-hop-online/CREDITS.md).
- Xem chi tiết điều khoản tại [LICENSE](file:///d:/MeoTN%20Games/MagicHopGame/magic-hop-online/LICENSE) hoặc trang giao diện [license.html](file:///d:/MeoTN%20Games/MagicHopGame/magic-hop-online/license.html).

---

*Bản quyền © 2026 **MeoTN Gaming** | Phiên bản v1.1.0*