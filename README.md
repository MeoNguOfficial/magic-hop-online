# 🎵 Cyber Beat Hopper (v1.0.3)

**Cyber Beat Hopper** (phiên bản hiện tại **v1.0.3**, phát triển trên nền tảng *MeoTN HOP ENGINE*) là một tựa game nhịp điệu (Rhythm Game) 3D mang phong cách Cyberpunk/Neon cực kỳ bắt mắt. Game tiếp tục duy trì kết nối **Online** (bảng xếp hạng, lưu tài khoản), tuy nhiên phiên bản này chính thức chuyển sang mô hình **Mã nguồn đóng (Closed Source)** dành riêng cho **NỘI BỘ (Internal Build)** (dự án **MeoTN Open Source** sẽ được phân tách phát triển riêng ở kho lưu trữ độc lập).

---
## 🚀 Phiên Bản v1.0.3 Có gì mới?

# 🚀 UPDATE LOG: CẬP NHẬT KHU VỰC API, SỬA LỖI MỞ KHÓA CHẾ ĐỘ CHƠI & BẢN NỘI BỘ (RELEASE v1.0.3)

Chào các bạn, bản cập nhật **v1.0.3** tập trung vào việc thay đổi khu vực kết nối API máy chủ, khắc phục triệt để logic mở khóa chế độ chơi và đóng gói phiên bản thử nghiệm nội bộ.

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

### 🔒 4. MÃ NGUỒN ĐÓNG & BẢN NỘI BỘ (CLOSED SOURCE & MEOTN OPEN SOURCE)
- **Vẫn duy trì kết nối Online:** Game tiếp tục nâng cấp hệ thống kết nối Online (tài khoản, bảng xếp hạng, lưu dữ liệu server).
- **Mã nguồn đóng (Closed Source):** Dự án hiện chuyển sang mô hình mã nguồn đóng dành riêng cho phát triển & thử nghiệm nội bộ. Dự án **MeoTN Open Source** sẽ được phân tách và phát triển riêng ở kho lưu trữ khác.
- **Ẩn giấy phép công khai:** Thông tin về **Giấy phép MeoTN Open Source** (MeoTN Open Source License) tạm thời được ẩn trong phần Credits đối với bản phát hành này.

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

- **Đồ họa 3D Cyberpunk:** Hiệu ứng hình ảnh rực rỡ với các hạt bụi không gian (Particles), Sóng xung kích (Shockwaves), và khối gạch tự đổi màu động (Dynamic Colors).
- **Âm nhạc đa dạng:** Tích hợp một danh sách bài hát nhiều thể loại (EDM, Rock, Pop, Chill...) với nhịp điệu (beatmap) được căn chỉnh thủ công khớp với từng khối gạch.
- **Tối ưu hóa đa thiết bị:** Người chơi có thể tự do tùy chỉnh chất lượng đồ họa (Simple, HD, FHD) và vô hiệu hóa hiệu ứng để phù hợp từ thiết bị cấu hình thấp đến máy chơi game chuyên dụng.
- **Lưu trữ Offline Toàn diện (PWA):** Tích hợp Service Worker và CacheManager tự động tải ngầm game, tính năng mở rộng và bài hát. Cho phép trải nghiệm game trọn vẹn không cần Internet.
- **Đa ngôn ngữ (i18n):** Hỗ trợ chuyển đổi nhanh giữa Tiếng Việt và Tiếng Anh.

---

## 🛠 Công nghệ sử dụng

Dự án được xây dựng trực tiếp chạy trên nền tảng Web:
- **HTML5 / CSS3 / JavaScript thuần (Vanilla JS)**
- **Tailwind CSS:** Thiết kế giao diện (UI) hiện đại, đáp ứng (Responsive).
- **Three.js:** Xây dựng, render không gian 3D, xử lý camera và ánh sáng.
- **AnimeJS:** Xử lý các hoạt ảnh (animation) mượt mà cho UI.
- **Web Audio API:** Xử lý đồng bộ âm thanh, kiểm soát bộ lọc (Lowpass) và tốc độ phát nhạc (Playback Rate).

---

## 🚀 Hướng dẫn chạy dự án ở Local (Local Setup)

Vì dự án xử lý tải các tệp tin từ cloud (âm thanh, modules), nếu bạn dùng các tệp tin cục bộ, bạn cần chạy thông qua một máy chủ web cục bộ (Local Web Server) thay vì mở trực tiếp file `index.html` trên trình duyệt để tránh lỗi CORS.

**Các bước thực hiện:**
1. Clone hoặc tải mã nguồn dự án về máy.
2. Mở thư mục dự án bằng một trình soạn thảo (khuyên dùng **VS Code**).
3. Cài đặt tiện ích mở rộng **Live Server** trên VS Code.
4. Nhấn chuột phải vào file `index.html` và chọn **"Open with Live Server"**.
5. Trình duyệt sẽ tự động khởi chạy game tại địa chỉ `http://localhost:5500`.

*Mẹo: Nếu bạn đã cài đặt Node.js hoặc Python, bạn cũng có thể mở Terminal tại thư mục dự án và chạy `npx http-server` hoặc `python -m http.server`.*

---

## 🎧 Tùy chỉnh danh sách bài hát (Custom Playlist) Cho dân muốn clone dự án

Cho dân nào muốn clone dự án, thì kể từ phiên bản 1.0.3, bạn có thể dễ dàng thêm hoặc thay đổi bài hát bằng cách sử dụng file JSON riêng biệt hoặc dán đường link vào mảng `playlistSource` trong tệp `js/playlist.js`. Việc này giúp dễ dàng chia sẻ, lưu trữ trên Cloud và quản lý:

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

**2. Khai báo vào game (`js/playlist.js`):**
```javascript
const playlistSource = [
    // Dùng link URL đến file JSON (Cloud hoặc Local)
    {
        name: "Aleph-0",
        artist: "Leaf",
        warning_alert: "Level nhịp dồn dập, có thể gây lag cho máy yếu",
        beatmapUrl: "beatmap/music_41.json" // Hoặc là Link URL đến file JSON hoặc đường dẫn cục bộ
    },
];
```
*Lưu ý:*
- Mảng `beats` là các mốc thời gian (tính bằng giây) chỉ định lúc quả bóng nảy trúng khối gạch. Bạn có thể tự căn nhịp thủ công hoặc dùng các công cụ phân tích Audio/MIDI để tự động tạo beatmap.
- Về bản quyền âm nhạc: Khi thêm các bài hát tùy chỉnh của riêng bạn vào trò chơi, vui lòng đảm bảo rằng bạn có quyền sử dụng hợp pháp các bản nhạc đó (ví dụ: nhạc không bản quyền, nhạc tự sáng tác, hoặc đã mua giấy phép) để tránh các vấn đề vi phạm bản quyền nếu bạn có ý định phát hành hay chia sẻ dự án ra cộng đồng.

---

## 🔒 Mô Hình Phát Triển & Mã Nguồn (Closed Source & MeoTN Open Source)

Game vẫn duy trì trải nghiệm **Online** (Đồng bộ tài khoản, điểm số, Bảng xếp hạng server). 

Dự án hiện tại là phiên bản **Mã nguồn đóng (Closed Source)** phục vụ phát triển & thử nghiệm **Nội bộ (Internal Build)**. Phiên bản **MeoTN Open Source** dành cho cộng đồng sẽ được chuyển sang phân tách và phát triển ở một kho lưu trữ (repository) riêng.

---

## 📜 Giấy phép & Thông tin bản quyền (Credits & License)

Phiên bản **v1.0.3** là bản phát hành dành riêng cho **NỘI BỘ (Internal Release)**. Thông tin về **Giấy phép MeoTN Open Source** (MeoTN Open Source License) tạm thời được ẩn trong phần Credits đối với bản phát hành này.

---

*Bản quyền thuộc về **MeoTN Gaming** | Phiên bản Nội bộ (Internal Build v1.0.3)*