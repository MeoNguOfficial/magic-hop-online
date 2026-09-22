**Mục tiêu:** 
Refactor và tối ưu hoá hiệu suất toàn bộ source code của game "Cyber Beat Hopper" (chạy trên Next.js/React & Canvas/WebGL). Đảm bảo game duy trì ổn định 60 FPS trên các máy cấu hình yếu, hạn chế tối đa nghẽn CPU, tụt khung hình do Garbage Collection và GPU render-overdraw.

**Nguyên tắc tối thượng:** 
- KHÔNG thay đổi bất kỳ logic gameplay hiện tại: công thức tính điểm, hitbox/collision, nhịp beat-sync, combo window, tốc độ rơi/di chuyển, và các state flow (Menu, Playing, GameOver).
- Giữ nguyên toàn bộ visual core style (Cyberpunk/Neon vibe) nhưng thay đổi cách dựng hình để tối ưu chi phí render.

---

### CÁC HẠNG MỤC TỐI ƯU CẦN THỰC HIỆN

#### 1. Zero-Allocation trong Game Loop & Triệt tiêu Garbage Collection (GC)
* **Object Pooling:** 
  - Áp dụng pool cố định cho toàn bộ entities sinh/hủy liên tục: Beats/Tiles, Particle effects, Shockwaves, Float text (+Score, Combo). 
  - Tái sử dụng mảng/object thay vì dùng `new Object()` hoặc array methods sinh mảng mới (`.map()`, `.filter()`, `.slice()`, spread operator `[...]`) bên trong `requestAnimationFrame` hay hàm update.
* **Pre-allocation:** Khởi tạo sẵn các vector, matrix hoặc biến tạm dùng cho tính toán toạ độ và bounding box ngay ngoài vòng lặp.

#### 2. Tối ưu Canvas / WebGL Rendering Pipeline
* **Tối ưu hiệu ứng Neon Glow (Đặc thù Cyberpunk):**
  - Tuyệt đối hạn chế lạm dụng `ctx.shadowBlur` và `ctx.shadowColor` liên tục trên từng frame vì gây nghẽn rasterization nghiêm trọng trên GPU yếu.
  - Chuyển đổi các asset phát sáng tĩnh/bán tĩnh (Tile nền, icon, bóng sáng cố định) sang kỹ thuật **Offscreen Canvas pre-rendering**: vẽ trước hiệu ứng blur một lần vào offscreen buffer và dùng `ctx.drawImage()` lên canvas chính.
* **Canvas Pixel Ratio (DPR) Scaling:**
  - Không hardcode `window.devicePixelRatio` lên mức 2x/3x trên mobile/low-end GPU.
  - Giới hạn DPR tối đa ở mức `Math.min(window.devicePixelRatio, 1.5)` (hoặc fallback về `1` nếu phát hiện FPS drop dưới 45).
* **Clear Rect & Batching:**
  - Gom các lệnh vẽ cùng thuộc tính (`fillStyle`, `strokeStyle`) lại với nhau trước khi gọi `fill()` / `stroke()` để giảm state changes.
  - Sử dụng toạ độ số nguyên (`| 0` hoặc `Math.floor`) khi render texture/bitmap để tránh trình duyệt phải xử lý sub-pixel anti-aliasing tốn kém.

#### 3. React / Next.js Lifecycle & Decoupling
* **Tách rời React State khỏi Game Loop:**
  - Tuyệt đối không lưu các biến thay đổi liên tục 60fps (vị trí người chơi, timer, animation frame, beat tick) vào React `useState`. 
  - Sử dụng React `useRef` để chứa toàn bộ state engine thời gian thực.
  - Chỉ trigger re-render React khi có state chuyển đổi giao diện lớn (Game Over, Level Clear, Pause menu).
* **HUD Overlay Tối ưu:**
  - Nếu điểm số, combo hiển thị bằng DOM text: dùng DOM Ref trực tiếp (`scoreRef.current.textContent = score`) hoặc vẽ trực tiếp lên Canvas thay vì ép React render lại component root.

#### 4. Beat Timing & Audio Engine Resilience
* **AudioContext Clock Sync:**
  - Giữ nguyên logic sync beat theo `audioContext.currentTime`, không phụ thuộc vào `performance.now()` hay biến delta time không ổn định khi drop frame.
  - Tách luồng tính toán audio scheduler chạy theo chunk nhỏ (lookahead scheduler) để nhạc không bị giật/khựng ngay cả khi main thread bị spike nhẹ.

#### 5. Adaptive Performance Mode (Fallback tự động)
* Thêm một module đo FPS ngầm:
  - Nếu FPS trung bình dưới 40 FPS trong 3 giây liên tiếp:
    - Giảm số lượng hạt sinh ra (Particles limit giảm 50%).
    - Vô hiệu hoá các hiệu ứng filter hậu kỳ (hạ scanline/chromatic aberration CSS nếu có).
    - Tắt glow thời gian thực trên các vật thể nhỏ.

---

### YÊU CẦU ĐẦU RA:
1. Đưa ra chi tiết những đoạn code được refactor (GameLoop, Canvas Renderer, Particle System, State Manager).
2. Giải thích ngắn gọn cơ chế giảm tải CPU/GPU ở từng phần tương ứng.
3. Đảm bảo cấu trúc code sạch, dễ bảo trì và tích hợp mượt mà với codebase hiện tại.