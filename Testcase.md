# Test Case: Cập nhật điểm lên Bảng Xếp Hạng (BXH)

**Mục tiêu:** Xác minh rằng hệ thống chỉ gửi điểm số lên máy chủ khi người chơi đạt được Kỷ lục mới (New Record) và không sử dụng các chế độ hỗ trợ.

**Điều kiện tiên quyết:**
1.  Game đã kết nối thành công với API backend.
2.  Người chơi đã đăng nhập vào tài khoản.
3.  Giả sử người chơi có một kỷ lục cũ cho một bài hát nào đó, hoặc chưa có kỷ lục nào.

---

## Kịch bản 1: Đạt được Kỷ lục mới

1.  **Bước 1:** Đăng nhập vào game.
2.  **Bước 2:** Chọn một bài hát. Giả sử kỷ lục hiện tại là **100 điểm**.
3.  **Bước 3:** Chơi và đạt được số điểm cao hơn kỷ lục cũ (ví dụ: **150 điểm**).
4.  **Bước 4:** Kết thúc màn chơi.
5.  **Kết quả mong đợi:**
    *   Giao diện "GAME OVER" hiển thị dòng chữ **"KỶ LỤC MỚI!"**.
    *   Điểm kỷ lục mới (150) được lưu vào bộ nhớ cục bộ (local storage / IndexedDB).
    *   Hệ thống gửi một yêu cầu mạng (network request) lên API của server (`POST /api/scores`) với nội dung chứa điểm số là **150**.

## Kịch bản 2: Không vượt qua Kỷ lục

1.  **Bước 1:** Đăng nhập vào game.
2.  **Bước 2:** Chọn bài hát từ Kịch bản 1. Kỷ lục hiện tại là **150 điểm**.
3.  **Bước 3:** Chơi và đạt được số điểm thấp hơn kỷ lục (ví dụ: **80 điểm**).
4.  **Bước 4:** Kết thúc màn chơi.
5.  **Kết quả mong đợi:**
    *   Giao diện "GAME OVER" **KHÔNG** hiển thị dòng chữ "KỶ LỤC MỚI!".
    *   Kỷ lục trên máy vẫn là 150.
    *   **KHÔNG** có yêu cầu mạng nào được gửi lên API của server để cập nhật điểm.

## Kịch bản 3: Chơi với chế độ hỗ trợ (Relax / Bot Assist)

1.  **Bước 1:** Đăng nhập vào game.
2.  **Bước 2:** Vào phần Cài đặt (Settings) và bật "Chế độ Thư giãn (Relax Mode)" hoặc "Bot Assist".
3.  **Bước 3:** Chọn một bài hát bất kỳ và chơi để đạt được điểm số rất cao.
4.  **Bước 4:** Kết thúc màn chơi.
5.  **Kết quả mong đợi:**
    *   Giao diện "GAME OVER" **KHÔNG** hiển thị "KỶ LỤC MỚI!", ngay cả khi điểm số cao hơn kỷ lục cũ.
    *   Kỷ lục trên máy không được cập nhật.
    *   **KHÔNG** có yêu cầu mạng nào được gửi lên API của server.

## Kịch bản 4: Chơi với tư cách Khách (Guest)

1.  **Bước 1:** Mở game và chơi mà không đăng nhập.
2.  **Bước 2:** Chọn một bài hát và đạt được một kỷ lục mới (cho phiên chơi của khách).
3.  **Bước 3:** Kết thúc màn chơi.
4.  **Kết quả mong đợi:**
    *   Giao diện "GAME OVER" có thể hiển thị "KỶ LỤC MỚI!" (dựa trên dữ liệu local của khách).
    *   **KHÔNG** có yêu cầu mạng nào được gửi lên API của server.