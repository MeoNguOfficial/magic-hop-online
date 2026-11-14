# 🎵 Cyber Beat Hopper (v1.0.10)

**Cyber Beat Hopper** (phiên bản hiện tại **v1.0.10**, phát triển trên nền tảng *MeoTN HOP ENGINE v3.7*) là một tựa game nhịp điệu (Rhythm Game) 3D mang phong cách Cyberpunk/Neon rực rỡ và cuốn hút. Game kết hợp hoàn hảo giữa lối chơi nảy gạch theo giai điệu dồn dập, kết nối **Online** (bảng xếp hạng, lưu tài khoản, đồng bộ đám mây), khả năng chơi ngoại tuyến toàn diện (PWA & Desktop Standalone) và hệ thống tùy biến sâu rộng.

---
## 🚀 Phiên Bản v1.0.10 Có gì mới?

# 🚀 UPDATE LOG: TÁI CẤU TRÚC CÁ NHÂN HÓA ĐA TAB KÈM PREVIEW TRỰC QUAN, HỆ THỐNG HẠT ĐƯỜNG BIÊN (BOUNDARY PARTICLES), VORTEX BLOCK, KHỬ KHỰNG FPS CAO & PHÁT HÀNH CHÍNH THỨC v1.0.10 (RELEASE v1.0.10)

Chào các bạn, bản cập nhật **v1.0.10** tập trung hoàn thiện chiều sâu cá nhân hóa, bổ sung hiệu ứng vật lý/đồ họa mới và giải quyết triệt để các lỗi khựng vi mô khi chơi ở FPS cao:

---

### 🎨 1. TÁI CẤU TRÚC MỤC CÁ NHÂN HÓA (PERSONALIZE REMASTER) & PREVIEW TRỰC QUAN
- **Giao diện sub-tab gọn gàng chuẩn Settings:**
  - Tổ chức lại toàn bộ mục **Nền & Bóng** thành 5 tab riêng biệt dễ thao tác trên cả PC lẫn Mobile: `Hình nền`, `Bóng`, `Môi trường`, `Đường biên`, `Hạt biên`.
- **2 Hình nền mới tối ưu hiệu năng:**
  - **Màu theo độ khó (`difficulty`):** Tự động chuyển đổi bảng màu nền theo chế độ chơi (*Easy*, *Normal*, *Hard*, *Asian*).
  - **Công nghệ (`led_board`):** Không gian mạch điện tử viễn tưởng *Cyber Tech* & luồng dữ liệu GPU siêu nhẹ.
  - Bổ sung đầy đủ thumbnail preview trực quan cho toàn bộ hình nền.
- **Preview 3D cho Môi trường & Hoa văn Bóng:**
  - Thêm thẻ preview phối cảnh 3D SVG siêu nhẹ cho 4 Môi trường (*Hư Không*, *Đường Lưới 3D*, *Thành Phố*, *Đồng Lúa*).
  - Thêm preview quả cầu 3D cho 6 Hoa văn bóng (*Đặc*, *Khung*, *Caro*, *Sọc dọc*, *Chấm bi*, *Lưới vi mạch*) và tự động đổi màu preview theo **Màu Bóng** đang chọn.
- **Sửa lỗi không lưu cài đặt Personalize:**
  - Đồng bộ hóa `VALID_LOCAL_STORAGE_KEYS`, `personalize.js` và `initThree()`, đảm bảo mọi tùy chọn (hình nền, màu bóng, hoa văn, môi trường, đường biên, hạt biên) được lưu giữ 100% sau khi F5 hoặc khởi động lại ứng dụng.

---

### ✨ 2. HẠT ĐƯỜNG BIÊN (BOUNDARY PARTICLES) & REMASTER ĐƯỜNG BIÊN
- **Ra mắt mục độc lập Hạt Đường Biên (Boundary Particles):**
  - Hệ thống hạt phát sáng bắn ra từ hai bên đường biên theo nhịp beat với 6 chế độ tùy chọn (*Off*, *Classic Particles*, *Normal Burst*, *Wave Shooter*, *Horizontal Spray*, *Random*) cùng khung preview mô phỏng riêng biệt.
- **Remaster Đường Biên (Boundary Pulse):**
  - Thiết kế lại các thẻ chọn hiệu ứng đường biên (*Off*, *Classic*, *Normal*, *Wave*, *Horizontal*, *Random*) với preview minh họa trực quan.

---

### 🎮 3. GAMEPLAY MỚI, ĐỒNG BỘ NHỊP MESH & KHỬ KHỰNG FPS CAO
- **Bổ sung Vortex Block & Tinh chỉnh Dash Block:**
  - Thêm loại gạch **Vortex Block** mới, đồng thời tối ưu hiệu ứng trượt và phản hồi trên **Dash Block**.
- **Sửa lỗi lệch nhịp khi va chạm Mesh:**
  - Khắc phục triệt để tình trạng bóng va chạm tại mesh khiến block tăng tốc đột ngột làm nhanh/chậm nhịp; bảo toàn giới hạn trần tốc độ nhạc `3.0` trong khi `gameSpeed` vẫn tăng tiến mượt mà.
- **Khử khựng giả (High-FPS Micro-Stutter Fix):**
  - Tinh chỉnh bộ điều phối khung hình và chu kỳ cập nhật để loại bỏ cảm giác giật/khựng nhẹ ngay cả khi máy đang đạt FPS cao.
- **Nâng cấp UI & Điều khiển:**
  - Bổ sung nút **Bỏ qua kiểm tra Online (Skip Online Check)** tại màn hình chọn bài hát, làm mới thiết kế **Logo**, tự động tắt **Pointer Lock** khi hoàn thành màn warm-up và sửa lỗi ô nhập văn bản không phản hồi.

---

### 🌐 4. ĐỒNG BỘ ĐA NGÔN NGỮ 100% (10 QUỐC GIA)
- Bổ sung và chuẩn hóa đầy đủ **658 khóa dịch** trên toàn bộ 10 ngôn ngữ (`vi`, `en`, `es`, `fr`, `ja`, `ko`, `pt`, `ru`, `zh-CN`, `zh-TW`), bao phủ hoàn toàn giao diện Cá nhân hóa, Đường biên, Hạt biên, Biểu đồ FPS và Toàn màn hình.

---

## 🚀 Bản trước đó: Phiên Bản v1.0.9 Có gì mới?

# 🚀 UPDATE LOG: HERO ĐĨA THAN VINYL NỔI BẬT (FEATURED VINYL DISC), CẢI TỔ UI LANDSCAPE MOBILE/TABLET (APK), TỐI ƯU HIỆU SUẤT GAME THREE.JS & PHÁT HÀNH CHÍNH THỨC v1.0.9 (RELEASE v1.0.9)

Chào các bạn, bản cập nhật **v1.0.9** mang đến bước nhảy vọt về mặt thẩm mỹ thị giác và trải nghiệm mượt mà cho **Cyber Beat Hopper**: giới thiệu cụm Hero Đĩa Than Vinyl 3D tương tác tại màn hình chọn bài hát, nâng cấp toàn diện giao diện HUD chiến đấu khi chơi trên thiết bị di động/máy tính bảng xoay ngang (APK Landscape), tối ưu hóa sâu kiến trúc Three.js & WebGL, cùng cơ chế điều khiển Native tràn viền chuẩn Immersive:

---

### 💿 1. CỤM HERO ĐĨA THAN VINYL NỔI BẬT (FEATURED VINYL DISC HERO & QUICK PLAY)
- **Đĩa than phong cách Cyberpunk tương tác sống động:**
  - Thiết kế đĩa vinyl 3D xoay tròn vô tận với hiệu ứng rãnh đĩa siêu nét, tâm đĩa mạ vàng, cùng vòng hào quang ánh sáng đổi màu theo nhịp điệu Cyberpunk rực rỡ.
  - Tự động hiển thị và đồng bộ bài hát chơi lần gần nhất (hoặc bài mới nhất khi lần đầu vào game) cùng tên bài hát, nghệ sĩ và huy hiệu *"CHƠI NGAY"*.
- **Tính năng Chơi Nhanh (Tap to Play Instantly):**
  - Người chơi chỉ cần nhấp trực tiếp vào đĩa than để bắt đầu ván đấu ngay lập tức (hỗ trợ chuyển hướng chọn chế độ thông minh nếu bài hát đã đạt kỷ lục hoặc đang bật chế độ trợ giúp).
- **Cuộn mượt mà & Chuyển đổi trạng thái thông minh (Smart Scroll & Seamless Collapse):**
  - Đĩa than nằm ở vị trí trung tâm, cuộn tự nhiên cùng danh sách bài hát.
  - Khi cuộn xuống làm đĩa khuất khỏi màn hình, thanh tìm kiếm và bộ lọc bài hát sẽ tự động trượt mở (accordion slide) xuống cực kỳ êm ái.
  - Khi cuộn ngược trở lại đĩa, thanh tìm kiếm & bộ lọc sẽ tự động thu gọn êm ái, nhường không gian tối đa cho trải nghiệm thị giác.

---

### 📱 2. TỐI ƯU HÓA GIAO DIỆN CHƠI GAME TRÊN MOBILE & TABLET MÀN HÌNH NGANG (APK LANDSCAPE HUD)
- **Chuẩn hóa tỷ lệ hiển thị chuẩn PC trên màn hình ngang di động:**
  - Thiết kế lại các thành phần HUD chiến đấu trên thiết bị di động và tablet khi xoay ngang: căn chỉnh độ cao cân đối, mở rộng tầm quan sát đường bay của bóng và nhịp gạch.
  - Bố trí lại nút "THOÁT / GIỮ VÁN ĐẤU" sang góc phải tinh tế, hạ thấp thanh tiến trình bài hát và bộ đếm combo/điểm số để không che chắn tầm nhìn.
- **Trải nghiệm Native Immersive Fullscreen trên Android APK:**
  - Nhận diện môi trường APK tự động và ẩn hoàn toàn các nút toàn màn hình dư thừa (cả màn hình ngang và dọc), vì trò chơi trên APK đã kích hoạt chế độ toàn màn hình tràn viền (`IMMERSIVE_STICKY`) sẵn.
  - Tối ưu hóa phản hồi cảm ứng đa điểm, loại bỏ triệt để độ trễ.

---

### ⚡ 3. SỬA LỖI ĐỒ HỌA, MÀU SẮC & BÀN PHÍM ẢO TRÊN APK
- **Sửa lỗi sóng xung kích (Shockwaves):** Khôi phục trạng thái cập nhật ma trận chuẩn xác của Three.js cho toàn bộ hệ thống Object Pool, triệt tiêu lỗi sóng xung kích xuất hiện xa vị trí gạch hoặc biến mất ngẫu nhiên.
- **Sửa lỗi nhấp nháy màu sắc (Color Glitch):** Khử hoàn toàn hiện tượng nhấp nháy màu trên WebGL và Canvas nền bằng cách đồng bộ chuẩn double-buffering và tách biệt bộ màu bóng động độc lập.
- **Khắc phục lỗi nhập văn bản trên APK (cả ngang & dọc):**
  - Tắt cờ `captureInput` của Capacitor để trả lại quyền điều khiển bàn phím ảo cho Android IME.
  - Cấu hình `windowSoftInputMode="adjustResize"` và bật focusable cho Android WebView giúp mở bàn phím ảo mượt mà khi chạm vào bất kỳ ô nhập văn bản nào.
  - Tối ưu hóa animation mở/đóng thanh tìm kiếm bài hát theo cuộn trên mọi kích thước màn hình.

---

### 🔊 4. SỬA LỖI ÂM THANH & ĐỒNG BỘ FOCUS NATIVE
- **Sửa lỗi âm thanh intro:** Đảm bảo nhạc nền không phát sớm khi đang chạy màn hình intro (logo, audio disclaimer, intro sequence) trên tất cả các nền tảng.
- **Sửa lỗi dừng nhạc đột ngột:** Hoàn thiện cơ chế tự động khôi phục và tiếp tục phát nhạc khi chuyển tab, thu nhỏ ứng dụng hoặc quay lại game trên PC, Web và Android APK.

---

## 📜 Tóm tắt các phiên bản trước (v1.0.0 – v1.0.8)

<details>
<summary>Xem tóm tắt thay đổi từ v1.0.0 đến v1.0.8</summary>

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

*Bản quyền © 2026 **MeoTN Gaming** | Phiên bản v1.0.10*