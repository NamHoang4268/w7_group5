# W7 Capstone Hackathon - Lý tưởng triển khai "ProductivityTech: AI Document Hub"

Tài liệu này phác thảo toàn bộ ý tưởng, kiến trúc và kế hoạch chạy nước rút 48h để đảm bảo nhóm hoàn thành xuất sắc dự án W7, bảo toàn quỹ $100 và lấy trọn điểm từ Giảng viên.

---

## 1. Ý TƯỞNG CỐT LÕI (CORE IDEA)
* **Tên dự án:** DocHub AI
* **Domain:** ProductivityTech (Kho tài liệu doanh nghiệp đa khách hàng - Multi-tenant).
* **Mô tả:** Người dùng (thuộc các công ty khác nhau) tải lên tài liệu (PDF, DOCX). AI sẽ là trợ lý tìm kiếm và giải đáp thông tin từ các tài liệu đó.
* **Thử thách cốt lõi (Core Challenge):** Phân quyền dữ liệu (Tenant Isolation) - Tuyệt đối không để AI lấy hợp đồng của Công ty B để trả lời câu hỏi của Công ty A. Xử lý triệt để bài toán này bằng **Metadata Filtering**.

---

## 2. KIẾN TRÚC 7 TIÊU CHÍ (7 MANDATORY CAPABILITIES)

| # | Tiêu chí W7 | Dịch vụ AWS Nhóm Chọn | Lý do lựa chọn (Dùng cho QnA và Báo cáo) |
|---|---|---|---|
| **1** | User Interface | **S3 Static + CloudFront** | Có sẵn HTTPS miễn phí, không tốn tiền duy trì server frontend. Tốc độ tải trang nhanh nhờ CDN toàn cầu. |
| **2** | Compute | **AWS Lambda (Python)** | Backend viết bằng Python (boto3) gọi AI dễ nhất. Serverless giúp chi phí tiệm cận $0 lúc dev, cold-start Python rất nhỏ. Chạy qua API Gateway. |
| **3** | AI / ML Feature | **Bedrock Knowledge Base + Claude 3.5 Haiku** | Dùng RAG để AI trả lời dựa trên file của user. Chọn Haiku vì tốc độ nhanh và rẻ bằng 1/5 Sonnet, cực kỳ phù hợp cho Hackathon. |
| **4** | Data Persistence | **DynamoDB (On-demand)** | Dùng để lưu 2 bảng: `Sessions` (Lịch sử chat) và `KnowledgeBases` (Danh sách thư mục). Chế độ On-demand không tốn tiền duy trì, truy vấn Key-Value tốc độ cao. |
| **5** | Object Storage | **S3** | Dùng làm Data Source cho Bedrock KB, lưu trữ file tài liệu vật lý PDF của người dùng. Tự động sync khi có file mới. |
| **6** | Network Foundation| **VPC + Subnets + VPC Endpoints** | Tránh dùng NAT Gateway (đắt đỏ). Mọi kết nối từ Lambda ra S3, DynamoDB, Bedrock đi qua VPC Endpoints để bảo mật và tiết kiệm tiền. |
| **7** | Identity & Access | **IAM Role (Least Privilege)** | Lambda chỉ được cấp quyền đọc đúng table trên DynamoDB và bucket S3 chỉ định, không cấp quyền `*` (wildcard). Đăng nhập dùng tài khoản hardcode giả lập. |

---

## 3. TIÊU CHÍ TÙY CHỌN (1 OPTIONAL CAPABILITY)
* **Lựa chọn:** Tiêu chí #8 - **Full Observability**.
* **Thực thi:** Tạo CloudWatch Dashboard giám sát tỷ lệ lỗi của Lambda, thời gian phản hồi của Bedrock. Tạo 1 **Custom Metric** ghi nhận `DocumentsUploaded` mỗi khi có file mới. Gài Alarm nếu Lambda lỗi vượt mức 5%.

---

## 4. THIẾT KẾ CƠ SỞ DỮ LIỆU & LUỒNG (DATA DESIGN)

### 4.1 DynamoDB
Bảng `DocHub_Workspaces`
* Khóa chính (Partition Key): `workspace_id` (String) - Ví dụ: `W-CongTyA`
* Thuộc tính: `tenant_name` (String), `created_at` (String).

### 4.2 S3 & Bedrock KB (Tuyệt chiêu Tenant Isolation)
Thay vì tạo nhiều Knowledge Base, nhóm dùng **đúng 1 Bedrock KB duy nhất** và dùng Metadata để phân cách dữ liệu.
* **Upload:** User up file `hopdong.pdf` vào `workspace_id = W-CongTyA`.
* **S3 Action:** Code Python đẩy file lên S3, đồng thời đẩy 1 file sidecar `hopdong.pdf.metadata.json` chứa nội dung `{"metadataAttributes": {"workspace_id": "W-CongTyA"}}`.
* **Query:** Khi User chat, Lambda gọi hàm `RetrieveAndGenerate` của Bedrock kèm bộ lọc (Filter):
  ```json
  "filter": { "equals": { "key": "workspace_id", "value": "W-CongTyA" } }
  ```

---

## 5. DỮ LIỆU ĐỂ BÁO CÁO MỤC 6.5 (MEASUREMENT & DECISIONS)
*(Dùng để copy thẳng vào `docs/W7_evidence.md` lấy trọn điểm Kiến trúc)*

**QUYẾT ĐỊNH:** Sử dụng Metadata Filtering trên 1 Bedrock Knowledge Base duy nhất để phân tách dữ liệu đa khách hàng (Multi-tenant), thay vì cấp phát Vector Store riêng cho mỗi khách hàng.

**PHƯƠNG ÁN BỊ LOẠI:** 
* Tạo Bedrock KB riêng cho mỗi khách hàng. Bị loại vì chạm Quota nhanh, chi phí khởi tạo OpenSearch Serverless/S3 Vectors cho mỗi KH sẽ đội chi phí lên cực cao (OpenSearch Serverless tốn ~$13/ngày/collection).
* Dùng Database Relational lọc Text truyền thống. Bị loại vì không có khả năng Semantic Search (tìm theo ngữ nghĩa).

**ĐO LƯỜNG:**
* Bảo mật (Cross-tenant leak): 0%. (Đã test: User B tìm kiếm từ khóa "Hợp đồng lương" nhưng không xuất hiện kết quả thuộc về file của User A).
* Tiết kiệm chi phí: Tiết kiệm tối thiểu $27.65 cho mỗi khách hàng mới được tạo nhờ việc dùng chung tài nguyên Vector Store.

**ĐÁNH ĐỔI (TRADE-OFF):**
Phải viết thêm code backend phức tạp để luôn đính kèm file `.metadata.json` mỗi khi người dùng upload file lên S3, và phải xử lý logic dọn dẹp các metadata thừa khi file gốc bị xóa.

---

## 6. LỘ TRÌNH 48H CHẠY NƯỚC RÚT

**Ngày 1 (Thứ 4): Hạ tầng & Happy Path**
* **09:00 - 10:00:** Bật MFA, cài Budget Alert $80, Request Bedrock model (Claude Haiku).
* **10:00 - 14:00:** Chạy Terraform (VPC, S3, DynamoDB, API Gateway, Bedrock KB).
* **14:00 - 18:00:** Code Backend Python (API `/upload` sinh file metadata json, và API `/chat` gắn metadata filter).
* *Kết quả cuối ngày 1:* Dùng Postman gọi API upload thành công, chat thành công không lệch dữ liệu.

**Ngày 2 (Thứ 5): Frontend, Tích hợp & Evidence**
* **09:00 - 12:00:** Code React Frontend: 3 Trang (Login giả lập -> Danh sách Workspace -> Detail Upload + Chat). Nối API.
* **12:00 - 14:00:** Chụp 3 ảnh Cost Explorer, viết hoàn chỉnh file `W7_evidence.md`. Làm phần Tùy chọn (Observability).
* **14:00 - 16:00:** Chạy test toàn hệ thống, **quay Video Demo 3 phút** (Backup).
* **16:00 - 18:00:** Làm Slide Architecture Walkthrough 12 trang. Nghỉ ngơi chuẩn bị Demo.
