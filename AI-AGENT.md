Hãy rà soát toàn bộ mã nguồn hiện tại của project trước khi thực hiện bất kỳ thay đổi nào.

Mục tiêu là thực hiện **2 yêu cầu chính** dưới đây, đồng thời **giữ nguyên hoàn toàn gameplay, logic và hành vi hiện tại** nếu không liên quan trực tiếp đến các yêu cầu này.

## 1. Thêm tùy chỉnh màu và hoa văn cho bóng

Bổ sung vào phần **BG / Background & Ball settings** tùy chọn để người chơi có thể:

* Chọn **màu của bóng**.
* Chọn **hoa văn / pattern / texture của bóng**.
* Preview trực quan bóng sau khi thay đổi.
* Các tùy chọn phải được tích hợp phù hợp với UI/settings hiện tại, không phá vỡ layout hoặc flow hiện có.
* Nếu project đã có hệ thống Settings, hãy **tái sử dụng hệ thống hiện tại** thay vì tạo một hệ thống settings mới không cần thiết.

### Lưu cấu hình

Các lựa chọn của người chơi phải được lưu persistent bằng:

* `localStorage`, hoặc
* `IndexedDB` nếu kiến trúc hiện tại phù hợp hơn.

Ưu tiên giải pháp đơn giản, nhẹ và phù hợp với dữ liệu settings.

Khi reload/reopen game:

* Các tùy chọn màu bóng và hoa văn phải được khôi phục tự động.
* Nếu chưa có dữ liệu đã lưu, sử dụng giá trị mặc định hiện tại của game.
* Phải có cơ chế xử lý dữ liệu settings cũ/missing/invalid để không làm game crash.

### Yêu cầu quan trọng

* Không làm thay đổi physics, collision, movement, scoring, gameplay logic hoặc các mechanic hiện tại.
* Không thay đổi kích thước/hitbox của bóng chỉ vì thêm visual customization.
* Việc thay đổi màu/hoa văn chỉ ảnh hưởng đến phần **render/visual presentation** của bóng.
* Nếu game có nhiều loại bóng hoặc nhiều trạng thái bóng, cần đảm bảo customization được áp dụng đúng đối tượng và không gây side effect.

---

# 2. Tối ưu hiệu suất toàn bộ project

Sau khi hiểu rõ kiến trúc hiện tại, hãy rà soát và tối ưu hiệu suất ở **3 khu vực: UI, Game và Core**.

## UI

Kiểm tra:

* Unnecessary re-render / redraw.
* DOM operations không cần thiết.
* Event listeners bị đăng ký lặp.
* Event listener không được cleanup.
* Layout/reflow/repaint không cần thiết.
* Animation không tối ưu.
* Các component/state update dư thừa.
* Các thao tác có thể cache nhưng đang được tính toán lại.
* Các asset/UI resource được load hoặc tạo lại nhiều lần.

Tối ưu nhưng **không làm thay đổi UI/UX hiện tại**, trừ khi thay đổi đó cần thiết để sửa vấn đề hiệu suất và không ảnh hưởng hành vi.

## Game

Kiểm tra:

* Game loop / update loop.
* Render loop.
* Physics/update calculations.
* Collision detection.
* Object creation/destruction.
* Garbage collection pressure.
* Allocation object/array/string trong loop.
* Các phép tính được thực hiện lặp lại nhưng có thể cache/precompute.
* Các object/resource có thể reuse.
* Animation và rendering.
* Các thao tác không cần thiết mỗi frame.

Đặc biệt chú ý những đoạn code chạy **mỗi frame / tick**.

Không được thay đổi:

* Physics behavior.
* Collision behavior.
* Movement.
* Timing gameplay.
* Difficulty.
* Score.
* Spawn logic.
* Game rules.
* Input behavior.

Mục tiêu là làm cho implementation hiệu quả hơn nhưng **kết quả gameplay phải tương đương với phiên bản hiện tại**.

## Core

Rà soát các module/core systems để tìm:

* Logic bị duplicate.
* Function được gọi quá nhiều lần.
* Computation có thể cache/memoize.
* Data structure chưa phù hợp.
* Unnecessary serialization/deserialization.
* Unnecessary state synchronization.
* Memory leak.
* Resource leak.
* Timer/interval không được cleanup.
* Event subscription không được unsubscribe.
* Các dependency/import không cần thiết.
* Code path không còn sử dụng.
* Các thao tác I/O/storage không cần thiết hoặc quá thường xuyên.

Ưu tiên các tối ưu có tác động thực tế và **không thay đổi public API hoặc behavior hiện tại** nếu không thực sự cần thiết.

---

# Nguyên tắc bắt buộc

### 1. Không rewrite toàn bộ project

Không được tự ý viết lại architecture hoặc thay framework/engine/library.

Chỉ refactor những phần thực sự cần thiết.

### 2. Không thay đổi gameplay

Đây là yêu cầu quan trọng nhất.

Sau khi tối ưu:

> Game phải hoạt động và cho kết quả giống phiên bản trước, chỉ khác ở hiệu suất và tính năng customization được yêu cầu.

### 3. Không over-engineering

Không tạo abstraction, manager, service hoặc architecture mới nếu hệ thống hiện tại đã có thể xử lý yêu cầu một cách đơn giản.

Ưu tiên:

> Existing architecture → minimal changes → measurable improvement.

### 4. Ưu tiên backward compatibility

Các settings/game data hiện tại phải tiếp tục hoạt động.

Không được làm mất dữ liệu người chơi đang có.

### 5. Không tối ưu mù

Trước khi sửa, hãy xác định:

* Đoạn code nào có vấn đề.
* Tại sao nó gây overhead.
* Nó chạy bao nhiêu lần / khi nào.
* Có thể tối ưu bằng cách nào.
* Việc tối ưu có risk gì đối với gameplay.

Không thay đổi code chỉ vì "trông có vẻ chưa tối ưu".

---

# Quy trình thực hiện

Hãy thực hiện theo thứ tự:

### Phase 1 — Audit

Rà soát toàn bộ source code và xác định:

* Architecture hiện tại.
* UI architecture.
* Game loop.
* Rendering.
* Physics/collision.
* State management.
* Settings system.
* Storage system.
* Các bottleneck tiềm năng.
* Các đoạn code chạy thường xuyên.

### Phase 2 — Implementation

Triển khai:

1. Ball color customization.
2. Ball pattern customization.
3. Persistent storage cho các settings.
4. Performance optimization cho UI.
5. Performance optimization cho Game.
6. Performance optimization cho Core.

### Phase 3 — Validation

Sau khi chỉnh sửa:

* Kiểm tra toàn bộ flow game.
* Kiểm tra UI.
* Kiểm tra settings.
* Reload game để kiểm tra persistence.
* Kiểm tra ball color/pattern.
* Kiểm tra gameplay trước và sau optimization.
* Kiểm tra console/runtime errors.
* Kiểm tra memory/resource leak nếu có thể.
* Kiểm tra performance regression.

Nếu project có test suite, hãy chạy toàn bộ test hiện có và bổ sung test cần thiết cho functionality mới.

---

# Output yêu cầu

Sau khi hoàn thành, hãy báo cáo rõ:

## A. Files đã thay đổi

Liệt kê từng file và lý do thay đổi.

## B. Tính năng mới

Mô tả:

* Ball color.
* Ball pattern.
* Storage/persistence.
* Default/fallback settings.

## C. Performance optimization

Chia thành:

* UI.
* Game.
* Core.

Với mỗi optimization, giải thích ngắn gọn:

**Before → After → Benefit**

Ví dụ:

* Loại bỏ object allocation trong game loop.
* Cache calculation được sử dụng nhiều lần.
* Cleanup event listener.
* Giảm unnecessary render/update.
* Reuse object thay vì tạo mới liên tục.

## D. Behavior compatibility

Xác nhận rõ những gameplay behavior nào đã được giữ nguyên.

Nếu có thay đổi behavior ngoài phạm vi yêu cầu, **không tự ý chấp nhận thay đổi đó**; hãy nêu rõ để tôi xem xét.

## E. Risk / Remaining issues

Liệt kê các vấn đề hiệu suất còn tồn tại nhưng chưa sửa, nếu có, cùng lý do tại sao chưa sửa.

---

### Tiêu chí hoàn thành

Chỉ coi task hoàn thành khi:

* [ ] Có thể chọn màu bóng.
* [ ] Có thể chọn hoa văn bóng.
* [ ] Có preview/feedback trực quan phù hợp.
* [ ] Settings được lưu persistent.
* [ ] Settings được restore sau reload.
* [ ] Không làm mất settings/data hiện tại.
* [ ] UI không bị regression.
* [ ] Gameplay không bị thay đổi.
* [ ] Game/core được tối ưu mà không phá behavior.
* [ ] Không phát sinh memory/resource leak do implementation mới.
* [ ] Không có runtime error liên quan đến các thay đổi.
* [ ] Test/validation hiện có vẫn pass.

**Quan trọng:** Đừng chỉ tập trung vào việc thêm tính năng. Hãy ưu tiên hiểu rõ source code hiện tại trước, sau đó thực hiện thay đổi nhỏ nhất cần thiết để đạt mục tiêu. Không rewrite hoặc thay đổi architecture nếu không có lý do kỹ thuật rõ ràng.
