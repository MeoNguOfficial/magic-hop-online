# 🎵 Cyber Beat Hopper (v1.0.5)

**Cyber Beat Hopper** (phiên bản hiện tại **v1.0.5**, phát triển trên nền tảng *MeoTN HOP ENGINE*) là một tựa game nhịp điệu (Rhythm Game) 3D mang phong cách Cyberpunk/Neon rực rỡ và cuốn hút. Game kết hợp hoàn hảo giữa lối chơi nảy gạch theo giai điệu dồn dập, kết nối **Online** (bảng xếp hạng, lưu tài khoản, đồng bộ đám mây), khả năng chơi ngoại tuyến toàn diện (PWA) và hệ thống tùy biến sâu rộng.

---
## 🚀 Phiên Bản v1.0.5 Có gì mới?

# 🚀 UPDATE LOG: HỖ TRỢ TOÀN DIỆN KÍCH CỠ CHỮ UI & HUD, TỐC ĐỘ BOUNCY BLOCK & FIX ZOOM GAME OVER (RELEASE v1.0.5)

Chào các bạn, bản cập nhật **v1.0.5** mang đến khả năng tùy chỉnh hiển thị font chữ toàn diện, cải tiến nhịp độ vật lý gạch nảy và khắc phục lỗi chuyển cảnh màn hình kết thúc trận đấu:

---

### 🔤 1. HỖ TRỢ TOÀN DIỆN KÍCH CỠ CHỮ HIỂN THỊ (FULL DISPLAY FONT SIZE SUPPORT)
- **Tùy biến 4 mức font chữ mượt mà:** Hỗ trợ đầy đủ 4 mức kích thước: **Nhỏ (Small)**, **Vừa (Medium - Mặc định)**, **Lớn (Large)** và **Rất lớn (Very Large)**.
- **Tối ưu hóa Bảng Cài đặt (Settings UI):**
  - Đồng bộ kích thước chữ cho thanh tìm kiếm cài đặt (`#settings-search-input`) và toàn bộ danh sách kết quả tìm kiếm (`#settings-search-results`).
  - Co giãn tỷ lệ font cho các nút tùy chọn chất lượng đồ họa (`#graphics-quality-options`) đảm bảo luôn vừa vặn, không bị vỡ bố cục 5 cột.
  - Tự động co giãn hộp thông tin nhận diện GPU (`#gpu-info-box`), tên card đồ họa và các ghi chú hướng dẫn.
  - Bổ sung đầy đủ các bộ chọn còn thiếu cho chế độ Rất lớn (`theme-font-xlarge`), giúp toàn bộ mô tả, nhãn phụ đề, ô nhập liệu và nút bấm co giãn chính xác.
- **Mở rộng đồng bộ các Panel Menu:** Cập nhật áp dụng cỡ chữ linh hoạt cho toàn bộ các màn hình chức năng: Giao diện chính (Home), Tùy biến (Personalize), Trình phát nhạc (Music Player), Tài khoản (Account).
- **Hỗ trợ HUD trong trận đấu (Top-Left HUD):**
  - Chỉ số tốc độ bài hát (`#speed`) và toàn bộ cụm theo dõi hiệu năng (`#fps-hud`: text FPS, frame time ms, biểu đồ canvas) tự động co giãn theo cỡ chữ đã chọn.
  - Tuyệt đối giữ nguyên kích thước chuẩn của các thành phần giao diện trung tâm (`#center-hud`: Điểm số, Combo, Perfect streak, Autoplay indicator) để đảm bảo trải nghiệm chơi game tối ưu nhất.

---

### 🔄 2. SỬA LỖI PHÓNG TO KHI QUAY VỀ MENU TỪ GAME OVER (GAME OVER ZOOM FIX)
- **Khắc phục lỗi tỷ lệ hiển thị:** Sửa triệt để hiện tượng góc nhìn camera và giao diện bị phóng to/scale đột ngột khi nhấn nút quay về Menu chính từ màn hình Game Over / Hoàn thành bài hát.
- **Trải nghiệm chuyển cảnh mượt mà:** Khôi phục góc nhìn chuẩn và trạng thái canvas ổn định, liền mạch khi điều hướng giữa các màn hình.

---

### ⚡ 3. TĂNG TỐC ĐỘ HỒI NẢY GẠCH NHÚN (BOUNCY BLOCKS SPEED & DYNAMICS)
- **Tăng tốc độ đàn hồi (`baseDecay = 9.0`):** Nâng cao tốc độ hồi phục vị trí của khối gạch nảy sau khi bóng tiếp xúc, giúp hiệu ứng nảy nhanh hơn, dứt khoát hơn và ăn khớp hoàn hảo với nhịp điệu dồn dập ở các bài hát có tốc độ cao.

---

## 🚀 Bản trước đó: Phiên Bản v1.0.4 Có gì mới?

# 🚀 UPDATE LOG: TỐI ƯU HIỆU NĂNG THÍCH ỨNG, FPS GRAPH CYBERPUNK, VẬT LÝ BOUNCE & BẢO VỆ ĐA TẦNG (RELEASE v1.0.4)

Chào các bạn, bản cập nhật **v1.0.4** tập trung cải thiện tí hiệu suất, tối ưu lại mã nguồn và tinh chỉnh trải nghiệm gameplay:

---

### ⚡ 1. BỘ ĐIỀU PHỐI HIỆU NĂNG THÍCH ỨNG & BIỂU ĐỒ FPS THỜI GIAN THỰC (ADAPTIVE PERFORMANCE & FPS GRAPH)
- **Tự động điều tiết thích ứng (`adaptive-performance.js`):** Hệ thống thông minh tự động đo đạc rolling FPS trong thời gian thực. Khi máy yếu hoặc phát hiện drop FPS, hệ thống sẽ tự động hạ tải GPU/CPU (giảm Pixel Ratio, tắt sao nền, giới hạn sóng xung kích shockwaves, culling tầm nhìn khối gạch) nhằm duy trì ổn định 60 FPS mượt mà.
- **Bảo vệ băng thông Fillrate ở tốc độ cao:** Tự động khóa Pixel Ratio về 1.0 khi `gameSpeed >= 1.35` trên các màn hình có mật độ điểm ảnh cao (High-DPI / Windows Scaling > 100% / Retina), triệt tiêu hoàn toàn hiện tượng tụt khung hình sâu ở các khúc nhạc dồn dập.
- **HUD & Biểu đồ FPS Cyberpunk Neon (`fps-graph.js`):** Tích hợp công cụ theo dõi FPS và Frametime trực quan, vẽ biểu đồ dạng sóng canvas 60 frame theo thời gian thực với công nghệ zero-allocation (tái sử dụng gradient, không sinh rác GC). Cho phép click vào HUD để bật/tắt nhanh biểu đồ.
- **Tùy chọn đồ họa chuyên sâu & Nhận diện GPU:** Mở rộng các mức đồ họa `Simple`, `HD`, `FHD`, `QHD`, `UHD`. Thêm tùy chọn ưu tiên GPU rời (`preferDiscreteGpu`) và tự động nhận diện phần cứng đồ họa (NVIDIA, AMD Radeon, Intel Arc, Apple Silicon...).

---

### 🎯 2. ĐỘ LÚN GẠCH & TÙY CHỌN TỐC ĐỘ NẢY ĐỘNG (DYNAMIC BOUNCE DYNAMICS)
- **Tùy chọn Dynamic Bounce Speed (`dynamicBounceSpeedEnabled`):** Thêm tính năng cho phép tốc độ hồi/đàn hồi của khối gạch nảy (Bouncy Block) biến thiên linh hoạt tỉ lệ thuận theo tốc độ game (`gameSpeed`), hoặc giữ tốc độ suy giảm cố định theo ý muốn người chơi.
- **Tăng độ lún Bouncy Block:** Gia tăng độ lún sâu của khối gạch từ 0.38 lên 0.52 world units, áp dụng công thức xung lực Half-sine wave (-sin(b * π) * amplitude) đem lại cảm giác nảy cực kỳ đã tay và chân thực theo nhịp điệu.
- **Tối ưu hóa culling gạch (Z-Culling):** Thuật toán duyệt gạch ngắt sớm toàn bộ các khối nằm ngoài khoảng nhìn camera, giảm đáng kể chi phí duyệt cây Three.js.

---

### 🏗️ 3. TÁI CẤU TRÚC MÔ-ĐUN HÓA & BIÊN DỊCH CỤC BỘ (MODULAR ARCHITECTURE & LOCAL MIGRATION)
- **Kiến trúc thư mục JavaScript chuẩn hóa:** Tách biệt và tổ chức toàn diện mã nguồn thành các module chuyên biệt:
  - `js/audio/`: Quản lý AudioContext, Beatmap Worker, Music Player, Playlist và Visualizer.
  - `js/core/`: Quản lý vòng đời ứng dụng (`app-main.js`), cấu hình (`config.js`), biến toàn cục và đa ngôn ngữ (`i18n.js`).
  - `js/engine/`: Engine 3D cốt lõi, camera, hiệu ứng Three.js, FPS graph và adaptive performance.
  - `js/game/`: Phân tách rõ ràng các cơ chế bổ trợ (Autoplay, Bot Assist), quản lý khối gạch (Normal, Moving, Fake blocks) và chế độ chơi (Easy, Hard, Asian).
  - `js/libs/`: Lưu trữ các thư viện cục bộ độc lập (`three.module.js`, `anime.min.js`, `disable-devtool.min.js`).
  - `js/services/`: Dịch vụ gọi API backend, kiểm tra bản quyền, quản lý bộ nhớ đệm và lưu trữ.
  - `js/ui/`: Các thành phần giao diện người dùng (Cài đặt, tài khoản, chat, cảnh báo, tùy biến cá nhân).
- **Loại bỏ hoàn toàn CDN bên ngoài:**
  - Chuyển sang sử dụng **Tailwind CSS precompiled cục bộ** (`css/tailwind.min.css`) xây dựng thông qua `@tailwindcss/cli`, tối ưu hóa kích thước và loại bỏ độ trễ tải mạng.
  - Chuyển Three.js và AnimeJS từ CDN sang ES Module cục bộ, đảm bảo tính ổn định và khả năng hoạt động offline 100%.

---

### 💾 4. LƯU TRỮ THẾ HỆ MỚI VỚI OPFS & QUẢN LÝ BỘ NHỚ TOÀN DIỆN (STORAGE MANAGER & OPFS)
- **Tích hợp OPFS (Origin Private File System):** Hỗ trợ lưu trữ các file nhạc MP3/OGG và dữ liệu Beatmap JSON trực tiếp vào hệ thống tệp riêng tư tốc độ cao của trình duyệt, phá vỡ rào cản giới hạn bộ nhớ của IndexedDB truyền thống.
- **Nâng cấp IndexedDB v3 (`MagicHopDB`):** Hỗ trợ đầy đủ các Object Store: `audio_cache`, `json_cache`, `playlist_cache`, `highScores`, `api_cache`.
- **Trung tâm StorageManager & Dọn dẹp LRU:** Bổ sung giao diện trực quan trong Cài đặt hiển thị dung lượng sử dụng theo thời gian thực (OPFS, Cache, IndexedDB, LocalStorage). Thuật toán LRU tự động bảo vệ các tệp SFX và nhạc menu gốc khi dọn dẹp bài hát cũ.

---

### 🛡️ 5. BẢO MỆT ĐA TẦNG & CHỐNG CAN THIỆP (MEOTN EASY ANTICHEAT)
- **Bảo vệ Anti-Dev Engine đa tầng siêu nhẹ:**
  - **Tầng 1 (Size Mismatch):** Phát hiện việc mở DevTools dạng docked (gắn liền cửa sổ) trên mọi trình duyệt.
  - **Tầng 2 (Debugger Timing Loop):** Sử dụng hàm kiểm tra thời gian thực thi debugger được biên dịch sẵn, triệt tiêu 100% rác bộ nhớ GC.
  - **Tầng 3 (Element Trap):** Bẫy getter trên thuộc tính ID phát hiện khi tab Elements hoặc Console được kiểm tra.
  - **Tầng 4 (Event-driven Keys):** Chặn các tổ hợp phím tắt kiểm tra mã (F12, Ctrl+Shift+I/J/C, Ctrl+U, Cmd+Option+I/J/C) với 0% chi phí CPU.
  - **Tầng 5 (Target Scoping MutationObserver):** Tối ưu hóa bộ giám sát DOM chỉ theo dõi các thẻ script và container cấp 1 của `head`/`body`, lập tức triệt tiêu các công cụ chèn ngoài (Eruda, vConsole, Chii...) mà không gây ảnh hưởng đến hiệu năng render.
- **Trang Cảnh Báo Cyberpunk Glitch (`warning.html`):** Tự động điều hướng và đồng bộ kiểm tra trạng thái đóng công cụ để đưa người chơi trở lại game an toàn. Tự động lọc thông báo khi người dùng là Admin.

---

### 🌐 6. MỞ RỘNG ĐA NGÔN NGỮ (10 QUỐC GIA - i18n)
- Mở rộng hệ thống bản địa hóa hỗ trợ **10 ngôn ngữ**: Tiếng Việt (vi), Tiếng Anh (en), Tiếng Pháp (fr), Tiếng Trung Giản thể (zh-CN), Tiếng Trung Phồn thể (zh-TW), Tiếng Hàn (ko), Tiếng Nhật (ja), Tiếng Tây Ban Nha (es), Tiếng Bồ Đào Nha (pt), Tiếng Nga (ru).
- Lưu trữ ngôn ngữ bảo mật với mã hóa chống can thiệp.

---

### 🎨 7. NÂNG CẤP GIAO DIỆN & TIỆN ÍCH (UI/UX & QoL)
- Thiết kế lại thanh Cài đặt nhanh (Quick Settings) tinh gọn, đẹp mắt hơn.
- Hoán đổi vị trí nút "Chơi ngay" (Play Now) và "Bảng xếp hạng" (Leaderboard) thuận tiện thao tác một tay.
- Hoàn thiện và tích hợp công cụ chỉnh sửa Beatmap (`beat_editor.html`).
- Tối ưu bộ nhớ đệm Service Worker lên phiên bản `v1.0.0.46` đảm bảo tài nguyên luôn được cập nhật mới nhất.

---

## 🚀 Bản trước đó: Phiên Bản v1.0.3 Có gì mới?

# 🚀 UPDATE LOG: CẬP NHẬT KHU VỰC API & SỬA LỖI MỞ KHÓA CHẾ ĐỘ CHƠI (RELEASE v1.0.3)

Chào các bạn, bản cập nhật **v1.0.3** tập trung vào việc thay đổi khu vực kết nối API máy chủ và khắc phục triệt để logic mở khóa chế độ chơi.

---

### 🌐 1. ĐỔI KHU VỰC API (API REGION UPDATE)
- **Cập nhật Khu vực API:** Thay đổi endpoint và hệ thống máy chủ backend API, nâng cao tốc độ phản hồi và độ ổn định khi đồng bộ dữ liệu điểm số, tài khoản và bảng xếp hạng.

---

### 🎯 2. SỬA LỖI MỞ KHÓA CHẾ ĐỘ CHƠI (PLAY MODE UNLOCK FIX)
- **Căn chỉnh logic mở khóa:** Khắc phục lỗi khi chọn Easy mode, Hard mode, Asian mode mà chưa vượt qua (Passed) Normal mode của bài hát vẫn chọn được Chế độ Vô tận (Endless Mode) dù không bật các chế độ hỗ trợ (Autoplay, Relax, Bot Assist).
- **Yêu cầu Passed Normal Mode:** Giờ đây ngay cả khi bật Easy, Hard hay Asian mode, bài hát bắt buộc phải Passed ở Normal mode (hoặc bật chế độ hỗ trợ) mới được phép mở khóa chế độ Vô tận.

---

### ⚡ 3. TỐI ƯU PWA & SERVICE WORKER (v1.0.0.3)
- **Nâng cấp Cache Version:** Cập nhật Service Worker lên phiên bản `v1.0.0.3`, tự động làm tươi bộ nhớ đệm và đồng bộ mã nguồn mới nhất trên thiết bị.

---

## 🚀 Bản trước đó: Phiên Bản v1.0.2 Có gì mới?

# 🚀 UPDATE LOG: TỐI ƯU ĐƯỜNG BIÊN & CẬP NHẬT GIẤY PHÉP BẢN QUYỀN

Chào các bạn, bản cập nhật **v1.0.2** mang tới những tối ưu hóa mạnh mẽ về mặt hiệu năng hiển thị và thay đổi quan trọng về giấy phép sử dụng của dự án.

---

### ⚡ 1. TỐI ƯU HÓA ĐƯỜNG BIÊN & ĐỒNG BỘ GAME SPEED (TRACK BOUNDARY POOLING)
- **Hỗ trợ Object Pooling:** Tích hợp cơ chế tái sử dụng mesh cho hiệu ứng xung ánh sáng chạy dọc biên (neon boundary pulses), loại bỏ hoàn toàn việc cấp phát/giải phóng bộ nhớ liên tục nhằm triệt tiêu hiện tượng giật lag (GC frame drop) khi chơi các bản nhạc tiết tấu nhanh.
- **Tốc độ đồng bộ Game Speed:** Vận tốc di chuyển của các pulse chạy dọc biên được nhân đồng bộ trực tiếp với hệ số tốc độ game (`gameSpeed`), đảm bảo hiệu ứng ánh sáng phản hồi đúng nhịp độ dồn dập khi màn chơi tăng tốc.
- **Giới hạn đường chạy thông minh:** Thay vì chỉ đi tới 1 block kế tiếp, quãng đường chạy tối đa của các pulse được căn chỉnh theo khoảng cách tới block xa nhất hiện có trên màn hình. Trong các phần nhạc nhanh, nhiều pulse sẽ được sinh ra liên tiếp tạo thành hiệu ứng sóng ánh sáng đồng bộ cực kỳ bắt mắt dọc theo đường đua.

---

### 📜 2. CẬP NHẬT GIẤY PHÉP BẢN QUYỀN MỚI (MEOTN OPEN SOURCE LICENSE)
- **Giấy phép sử dụng mới:** Chuyển đổi giấy phép từ MIT sang **MEOTN OPEN SOURCE LICENSE**, cho phép sử dụng tự do đối với mục đích cá nhân, học tập và phi thương mại, đồng thời hạn chế và yêu cầu cấp phép đối với mọi mục đích thương mại.
- **Trang Giấy phép Cyberpunk (`license.html`):** Thiết kế mới hoàn toàn một trang hiển thị giấy phép chi tiết với phong cách neon đẹp mắt, hỗ trợ chuyển đổi hai ngôn ngữ (Anh/Việt) trực quan qua các tab tương tác.
- **Liên kết trong Credits:** Bảng tín nhiệm (Credits) trong game đã được cập nhật đường dẫn trực tiếp, cho phép người dùng click vào dòng chữ giấy phép để mở trang điều khoản bản quyền trên tab mới.

---

## 🚀 Bản trước đó: Phiên Bản v1.0.1 Có gì mới?

# 🚀 UPDATE LOG: THÊM NHẠC MỚI & TIẾN BƯỚC ĐẾN ONLINE

Chào các bạn, bản cập nhật lần này đánh dấu một bước chuyển mình quan trọng của dự án. Không chỉ mang đến những giai điệu bùng nổ hơn để khuấy động trải nghiệm chơi đơn, chúng tôi còn đặt những viên gạch đầu tiên cho hệ thống **Chơi Online (Multiplayer)** — tính năng được mong đợi nhất!

---

### 🎵 1. ĐA DẠNG HÓA VỚI NHẠC MỚI
Để tăng tính kích thích cũng như đa dạng, tôi đã update thêm nhạc mới.

---

### 🌐 2. TIẾN BƯỚC ĐẾN ONLINE (THE MULTIPLAYER ROADMAP)
Chúng tôi đang chính thức chuyển dịch từ một tựa game thuần Offline sang hỗ trợ Co-op/Versus qua mạng internet. Trong bản cập nhật này, phần cốt lõi "xương sườn" của hệ thống Online hiện mới chỉ thử nghiệm ở beatmap.

> ⚠️ **Lưu ý quan trọng:** Tính năng Online hiện tại đang được mở khóa ở dạng **Alpha Test giới hạn** dành cho các nhà phát triển và một số Tester được chọn. Phiên bản Public Beta cho toàn bộ người chơi dự kiến sẽ ra mắt trong vòng vài tuần tới.

---

### 🐛 3. CÁC SỬA LỖI & TỐI ƯU KHÁC (BUG FIXES)
* Tối ưu hóa dung lượng bộ nhớ đệm (Cache) khi tải tài nguyên âm thanh, giảm **20%** lượng RAM tiêu thụ.

---

🔥 **HÃY SẴN SÀNG!** Cảm ơn sự đồng hành và những đóng góp quý giá của các bạn. Hãy bật max volume, tận hưởng những giai điệu mới và chuẩn bị tinh thần để chiến đấu cùng bạn bè nhé!

## 🚀 Bản trước đó: Phiên Bản v1.0.0 (First Release)

### 🎮 Gameplay & Cơ Chế Cốt Lõi
- **Nâng Cấp Thuật Toán Block:** Block di chuyển giờ đây thông minh hơn, giới hạn vùng hẹp lại và tự động căn chỉnh theo nhịp điệu. Bổ sung hệ thống Cooldown (thời gian nghỉ) để triệt tiêu hoàn toàn lỗi "impossible jump".
- **Tối Ưu Đường Chạy:** Thu hẹp không gian Track Boundaries (còn 3 khối) để cân bằng độ khó ở tốc độ cao, đồng thời đưa **Fake Block (Khối giả)** trở thành một tính năng cơ bản của game.
- **Hệ Thống Bot Assist (Hỗ trợ vào tâm):** Tự động điều chỉnh bóng vào tâm nếu khoảng cách lệch dưới 50%. *(Lưu ý: Chế độ này sẽ không ghi nhận Highscore).*
- **Thử Thách Mới - Invert Controls:** Extension cực "hại não" dành cho dân Hardcore — vuốt trái bóng sẽ sang phải và ngược lại.
- **Giao Diện Warm-up Mới:** Xuất hiện các nhãn 3D màu hồng nổi bật đánh dấu tiến độ (20%, 40%, 60%, 80%) ngay trên bề mặt block trong giai đoạn khởi động.

### 🎬 Đồ Họa & Hiệu Ứng Điện Ảnh
- **Trải Nghiệm Cinematic Mượt Mà:** - **Intro:** Nhạc nền nổi lên, logo mờ dần, camera bay sát vào không gian menu chính.
  - **Outro / Fail:** Tính năng "Hold to Exit" hoặc khi Cập nhật/Reset Data sẽ kích hoạt hiệu ứng rơi bóng, nhạc lowpass chậm dần, camera zoom out và chuyển cảnh cực ấn tượng.
- **Bóng & Đuôi Động (Dynamic Visuals):** Quả bóng và hiệu ứng đuôi 3D (các khối đa diện nhọn) sẽ tự động chuyển màu mượt mà (Vàng, Cam, Tím) dựa trên chuỗi Combo PERFECT của người chơi.
- **Sửa Lỗi Hiển Thị:** Khắc phục triệt để lỗi Center Mesh bị áp màu sai trong chế độ Endless.

### 🎵 Âm Thanh & Hệ Thống Beatmap
- **Tải Beatmap Thông Minh:** Trải nghiệm "One-Click Play". Hệ thống tự động đối chiếu ETag với Server để tải ngầm hoặc cập nhật Map. Đi kèm cảnh báo Timeout 60s để chống treo game khi mạng yếu.
- **Nâng Cấp Audio UI:** Bổ sung âm thanh Click (phong cách Minecraft) và hiệu ứng Whoosh khi chuyển Tab menu.
- **Tùy Chỉnh Âm Thanh Độc Lập:** Tách biệt hoàn toàn thanh trượt điều chỉnh cho **Âm lượng Round Start** và **Âm lượng SFX**.
- **Cảnh Báo Bài Hát (Warning Alert):** Hiển thị cảnh báo độ khó/nguy cơ giật lag ngay tại màn hình "Tap To Play" đối với các bài hát đặc thù.

### ⚙️ Trải Nghiệm Ứng Dụng (PWA) & Tối Ưu
- **Cài Đặt App Đa Nền Tảng:** Game giờ đây là một PWA thực thụ. Nút "Tải App" tích hợp sẵn cho cả Android/PC (kích hoạt Prompt) và hướng dẫn riêng biệt cho iOS.
- **Cập Nhật Ngầm Thông Minh:** Service Worker tự động phát hiện bản mới. Người chơi có thể dùng tùy chọn "Tự động cập nhật App" hoặc check thủ công trong Cài đặt (đồng bộ hiệu ứng Cinematic khi update).
- **Tối Ưu & Dọn Dẹp:** Logic PWA được tách riêng để mã nguồn sạch sẽ, khắc phục toàn bộ lỗi xung đột biến (`SyntaxError`) và lỗi DOM khi khởi động. Giao diện Settings cũng được đồng bộ hóa in hoa, nhất quán và chuyên nghiệp.

---

- **🧱 Nâng Cấp Thuật Toán Block Di Chuyển (Smarter Moving Blocks):**
  - Giới hạn vùng di chuyển hẹp hơn và căn chỉnh thông minh dựa theo tốc độ nhịp, khắc phục hoàn toàn tình trạng "impossible jump" (bước nhảy bất khả thi).
  - Bổ sung hệ thống Cooldown (thời gian nghỉ) xen kẽ giữa các chuỗi gạch di chuyển giúp người chơi có thời gian phản xạ tốt hơn.
- **🔀 Thu Hẹp Đường Chạy & Khối Giả (Fake Blocks Update):**
  - Giới hạn không gian hai bên mép đường chạy (Track Boundaries) hẹp lại (còn 3 khối thay vì 4), giúp giảm tải độ khó trong chế độ tốc độ cao.
  - Khối giả (Fake Block) giờ đây chính thức trở thành tính năng gốc của game thay vì chỉ là một Extension.
- **🎮 Tiện Ích Đảo Ngược Điều Khiển (Invert Controls Extension):**
  - Thêm Extension cực "hại não": Vuốt sang trái bóng sẽ chạy sang phải. Một thử thách thú vị dành cho các người chơi Hardcore.
- **🔊 Nâng Cấp Hiệu Ứng Âm Thanh & Chuyển Cảnh:**
  - Thêm hiệu ứng âm thanh (SFX) riêng biệt và phong cách hơn khi chọn bài hát (Nút Play).
  - Tính năng "Hold to Exit" (Giữ để thoát) giờ đây sẽ kích hoạt mượt mà hiệu ứng rơi bóng (Fail Transition) cùng tiếng nhạc chậm dần trước khi về Menu.
- **🐛 Sửa lỗi (Bug Fixes):**
  - Sửa lỗi tâm màu trắng (Center Mesh) bị áp dụng màu động (Dynamic Colors) nhầm khi chơi ở chế độ Endless.

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

Dự án phát hành dưới điều khoản **MEOTN OPEN SOURCE LICENSE**:
- **Sử dụng tự do & Phi thương mại:** Bạn được tự do sử dụng, sao chép, tùy biến, học tập và trải nghiệm dự án cho mục đích cá nhân, giáo dục hoặc phi thương mại.
- **Sử dụng thương mại:** Mọi hành vi sử dụng cho mục đích thương mại (kinh doanh, bán phần mềm, tích hợp dịch vụ thu phí) đều cần có sự liên hệ và cấp phép chính thức từ tác giả.
- Xem chi tiết điều khoản tại [LICENSE](file:///d:/MeoTN%20Games/MagicHopGame/magic-hop-online/LICENSE) hoặc trang giao diện [license.html](file:///d:/MeoTN%20Games/MagicHopGame/magic-hop-online/license.html).

---

*Bản quyền © 2026 **MeoTN Gaming** | Phiên bản v1.0.5*