# W3 Evidence Pack — 5XRestaurant (EatEase)

> **Commit link**: *(cập nhật sau khi push)*
> **Ngày cập nhật**: 2026-04-24

---

## 1. Cover

| Thông tin | Chi tiết |
|-----------|----------|
| **Nhóm** | *(điền số nhóm)* |
| **Thành viên** | *(điền tên thành viên)* |
| **Database Path** | **Amazon DocumentDB / Document Paradigm** |
| **Engine** | DocumentDB (MongoDB 5.0 compatible) |
| **Instance** | `db.t3.medium` × 1 instance |
| **W2 Evidence** | *(link tới W2 evidence nếu có)* |

### Lý do chọn DocumentDB (Document Paradigm)

Ứng dụng EatEase Restaurant sử dụng MongoDB làm database chính từ giai đoạn phát triển (Mongoose ODM trên Node.js). Dữ liệu có cấu trúc document với nested objects (options/choices trong Product, items array trong TableOrder, refundDetails trong Payment) — phù hợp paradigm **Document** hơn relational hay key-value.

DocumentDB được chọn thay vì self-hosted MongoDB trên EC2 vì:
- Managed service: AWS lo backup, patching, monitoring
- Multi-AZ storage replication tự động (data replicated 6 copies across 3 AZs)
- Tương thích MongoDB API — không cần thay đổi application code

**Trade-off**: Chấp nhận single compute instance (SPOF) do chi phí DocumentDB cao (~$49/month cho 1 db.t3.medium). Data vẫn an toàn vì storage layer replicated 3 AZs. Production sẽ cần ≥2 instances (~$98/month).

---

## 2. Data Access Pattern Log

### Part A — 3 Access Patterns Chính

| # | Access Pattern | Tần suất | Collection |
|---|---------------|----------|------------|
| 1 | **Lấy danh sách sản phẩm theo category** — Customer mở menu, filter theo loại món (Khai vị, Món chính, Đồ uống...) | ~100-200 calls/phút (peak giờ ăn) | `products` |
| 2 | **Lấy tất cả orders đang active của 1 bàn** — Waiter/Kitchen cần xem realtime trạng thái đơn hàng của từng bàn, filter theo `tableId` + `status = active` | ~50-80 calls/phút (peak) | `tableorders` |
| 3 | **Tổng hợp doanh thu theo ngày** — Admin dashboard cần báo cáo tổng doanh thu, đếm số đơn, tổng theo phương thức thanh toán | ~5-10 calls/ngày | `payments` |

### Part B — Engine + Paradigm + Mechanism

**Pattern 1: Products by Category**
- **Engine**: DocumentDB (document paradigm)
- **Mechanism**: Field `category` là array chứa ObjectId references. Mongoose `.populate('category')` thực hiện lookup. Index trên `category` field giúp query nhanh mà không cần collection scan.
- **Tại sao hiệu quả**: DocumentDB hỗ trợ array field indexing — khi query `{ category: ObjectId("...") }`, index match trực tiếp vào phần tử trong mảng, không cần scan toàn bộ collection.

**Pattern 2: Active Orders by Table**
- **Engine**: DocumentDB (document paradigm)
- **Mechanism**: Compound index `{ tableId: 1, status: 1 }` (đã khai báo trong `tableOrder.model.js` line 145). Query `{ tableId: <id>, status: "active" }` match chính xác index prefix, DocumentDB trả kết quả ngay từ B-tree mà không scan.
- **Tại sao hiệu quả**: Mỗi order embed toàn bộ `items[]` (nested documents với `kitchenStatus`, timestamps) — document paradigm cho phép lấy order + tất cả items trong 1 query duy nhất, không cần JOIN như relational.

**Pattern 3: Revenue Aggregation**
- **Engine**: DocumentDB (document paradigm)
- **Mechanism**: Aggregation pipeline:
  ```javascript
  db.payments.aggregate([
    { $match: { paymentStatus: "completed", createdAt: { $gte: startOfDay, $lte: endOfDay } } },
    { $group: { _id: "$paymentMethod", totalRevenue: { $sum: "$amount" }, count: { $sum: 1 } } }
  ])
  ```
  Index `{ paymentStatus: 1 }` và `{ createdAt: -1 }` (payment.model.js line 112, 115) hỗ trợ `$match` stage — DocumentDB filter trước khi aggregate, giảm lượng documents cần xử lý.
- **Cost estimate**: DocumentDB db.t3.medium × 1 = ~$0.068/hr ≈ **~$49/month** (single AZ compute). Storage: $0.10/GB/month (minimal cho restaurant data).

### Part C — Wrong-Paradigm Test

**Pattern 2 (Active Orders by Table) trên DynamoDB (Key-Value) sẽ gặp vấn đề:**

Nếu dùng DynamoDB với `PK = tableId`, mỗi order item cần là 1 DynamoDB item riêng (vì DynamoDB item size limit 400KB và không hỗ trợ nested document queries natively). Để lấy order + tất cả items, cần:
1. `Query PK=tableId` để lấy order header
2. `Query PK=orderId` để lấy từng item — hoặc nhồi items vào attribute (mất khả năng filter `kitchenStatus` ở server side)

Quan trọng hơn, DynamoDB **không hỗ trợ server-side aggregation pipeline**. Pattern 3 (tổng doanh thu) sẽ phải `Scan` toàn bộ payments table, pull tất cả items về client, rồi tính tổng bằng application code — tốn RCU (Read Capacity Units) và chậm đáng kể khi payment data tích lũy theo thời gian. DocumentDB aggregation pipeline xử lý hoàn toàn trên server, trả 1 document kết quả duy nhất.

---

## 3. Deployment Evidence

> **Hướng dẫn**: Với mỗi criterion dưới đây, chụp screenshot console AWS hoặc paste CLI output, kèm 1-2 dòng ghi chú giải thích.

### 3.1 DocumentDB — Private Subnet

**Screenshot**: *(chụp DocumentDB Console → Cluster → Networking tab, hiện subnet group và VPC)*

**CLI alternative**:
```bash
aws docdb describe-db-clusters --db-cluster-identifier 5xrestaurant-docdb-cluster \
  --query 'DBClusters[0].{VPC:DBSubnetGroup,Encrypted:StorageEncrypted,Engine:Engine}'
```

**Notes**: DocumentDB cluster nằm trong `5xrestaurant-docdb-subnet-group` gồm 2 database subnets (`10.0.21.0/24`, `10.0.22.0/24`) — hoàn toàn private, không có route ra Internet Gateway. Kết nối chỉ được phép từ App tier Security Group qua port 27017.

---

### 3.2 DocumentDB — Encryption at Rest

**Screenshot**: *(chụp DocumentDB Console → Cluster → Configuration tab, hiện "Encryption: Enabled")*

**Notes**: Encryption at rest enabled với AWS-managed KMS key (`aws/rds`). Chọn AWS-managed key vì chưa có compliance mandate yêu cầu customer-managed CMK, và AWS-managed key có tự động rotation miễn phí. Production nên cân nhắc chuyển sang Customer CMK nếu cần audit trail rõ hơn.

---

### 3.3 DocumentDB — HA Plan (Acknowledged SPOF)

**Screenshot**: *(chụp DocumentDB Console → Instances, hiện 1 instance `db.t3.medium`)*

**Notes**: Chạy 1 instance duy nhất (`count = 1`) — chấp nhận Single Point of Failure (SPOF) cho compute layer vì đây là môi trường học tập. **Lý do trade-off**: DocumentDB db.t3.medium = ~$49/month/instance; 2 instances = ~$98/month vượt ngân sách training. **Tuy nhiên**, storage layer của DocumentDB vẫn replicate 6 copies across 3 AZs nên data không mất dù instance fail — chỉ mất availability cho tới khi AWS tự restart instance. Production: scale lên ≥2 instances cho zero-downtime failover.

---

### 3.4 DocumentDB — Record Read/Written

**Screenshot**: *(chụp màn hình app EatEase đang hiển thị menu items / order — chứng minh data đang read/write qua DocumentDB)*

**Notes**: Ứng dụng EatEase đang production-ready với users, products, categories, orders, payments đều CRUD qua DocumentDB endpoint. Connection string inject qua Secrets Manager → ECS task container environment.

---

### 3.5 S3 Bucket — Block Public Access + Encryption + Versioning

**Screenshot**: *(chụp S3 Console → Bucket → Properties tab, hiện Block Public Access, Versioning, Default Encryption)*

**CLI alternative**:
```bash
# Block Public Access
aws s3api get-public-access-block --bucket <bucket-name>

# Encryption
aws s3api get-bucket-encryption --bucket <bucket-name>

# Versioning
aws s3api get-bucket-versioning --bucket <bucket-name>
```

**Notes**:
- **Block Public Access**: Tất cả 4 flags bật (`BlockPublicAcls`, `IgnorePublicAcls`, `BlockPublicPolicy`, `RestrictPublicBuckets`) — S3 bucket hoàn toàn không thể public.
- **Default Encryption**: SSE-S3 (AES256) với `bucket_key_enabled = true`. Chọn SSE-S3 thay vì SSE-KMS vì không có compliance mandate, SSE-S3 miễn phí với AES-256 encryption.
- **Versioning**: Enabled — cho phép rollback frontend deployments khi cần. Lifecycle policy chuyển old versions sang Standard-IA sau 30 ngày, xóa sau 90 ngày.
- **Distribution**: Chỉ phục vụ qua CloudFront Origin Access Control (OAC) — không dùng S3 Website Hosting.

---

### 3.6 IAM Roles — Least Privilege

**Screenshot**: *(chụp IAM Console → Roles → policies attached cho ECS Execution Role, App Role, Lambda Role)*

**Notes**:
- **ECS Execution Role** (`5xrestaurant-ecs-execution-role`): `AmazonECSTaskExecutionRolePolicy` (pull ECR images, push CloudWatch logs) + scoped `secretsmanager:GetSecretValue` chỉ cho ARN cụ thể của backend secrets.
- **ECS Task Role** (`5xrestaurant-app-role`): S3 actions (`GetObject`, `PutObject`, `DeleteObject`, `ListBucket`) scoped cho đúng 1 bucket ARN + SSM Messages cho ECS Exec debugging.
- **Lambda Role** (`5xrestaurant-bedrock-chat-role`): CloudWatch Logs scoped cho đúng log group ARN + Bedrock `Retrieve`, `RetrieveAndGenerate` scoped cho đúng Knowledge Base ID + `InvokeModel` scoped cho đúng Model ARN.
- **Không có wildcard `Action: "*"` hay `Resource: "*"` nào** trong Lambda role (trừ SSM Messages trên ECS Task Role là exception vì AWS không support resource-level permissions cho SSM channels).

---

### 3.7 Security Groups — Tiered Chaining

**Screenshot**: *(chụp VPC Console → Security Groups, hiện 3 SGs và inbound rules)*

**CLI alternative**:
```bash
aws ec2 describe-security-groups --filters "Name=group-name,Values=5xrestaurant-*" \
  --query 'SecurityGroups[*].{Name:GroupName,IngressRules:IpPermissions}'
```

**Notes**:
| Security Group | Inbound Rule | Source |
|---------------|-------------|--------|
| `5xrestaurant-alb-sg` | TCP 80 (HTTP) | `0.0.0.0/0` (public) |
| `5xrestaurant-app-sg` | TCP 8080 | `alb-sg` ID only |
| `5xrestaurant-data-sg` | TCP 27017 (DocumentDB) | `app-sg` ID only |

Traffice chaining: Internet → ALB (port 80) → ECS Fargate (port 8080, chỉ từ ALB) → DocumentDB (port 27017, chỉ từ App). DB SG references App SG ID (`security_groups = [app_sg.id]`) — **không dùng CIDR block**, đúng best practice W3.

---

### 3.8 Secrets Manager

**Screenshot**: *(chụp Secrets Manager Console → Secret detail, hiện secret keys list)*

**Notes**: 12 secrets được quản lý qua Secrets Manager thay vì hardcode trong code hoặc environment variables:
`MONGODB_URL`, `SECRET_KEY_ACCESS_TOKEN`, `SECRET_KEY_REFRESH_TOKEN`, `STRIPE_SECRET_KEY`, `STRIPE_ENPOINT_WEBHOOK_SECRET_KEY`, `STRIPE_CLI_WEBHOOK_SECRET`, `EMAIL_USER`, `EMAIL_PASS`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GEMINI_API_KEY`, `RESEND_API`

ECS container inject secrets qua `valueFrom` (Secrets Manager ARN format) — container chỉ đọc secret values lúc runtime, không bao giờ lưu trong image hay Terraform state.

---

## 4. Working Query Evidence

> Hai operations chứng minh DocumentDB (Document Paradigm) phục vụ access patterns hiệu quả.

### 4.1 Aggregation Pipeline — Doanh thu theo phương thức thanh toán

**Command** (chạy trong mongosh hoặc ECS Exec):
```javascript
db.payments.aggregate([
  { $match: { paymentStatus: "completed" } },
  { $group: {
      _id: "$paymentMethod",
      totalRevenue: { $sum: "$amount" },
      orderCount: { $sum: 1 },
      avgOrderValue: { $avg: "$amount" }
  }},
  { $sort: { totalRevenue: -1 } }
])
```

**Screenshot**: *(paste kết quả aggregation ở đây)*

**Notes**: Aggregation pipeline xử lý hoàn toàn trên DocumentDB server — chỉ trả 1 document kết quả nhỏ gọn thay vì pull toàn bộ payments collection về client. Index `{ paymentStatus: 1 }` giúp `$match` stage filter nhanh trước khi `$group`.

---

### 4.2 Indexed-Field Lookup — Orders theo bàn

**Command**:
```javascript
// Query với compound index { tableId: 1, status: 1 }
db.tableorders.find({ tableId: ObjectId("<table-id>"), status: "active" }).explain("executionStats")
```

**Screenshot**: *(paste kết quả explain — quan trọng nhất là `winningPlan` hiện IXSCAN chứ không phải COLLSCAN)*

**Notes**: `explain("executionStats")` confirm rằng query sử dụng compound index `{ tableId: 1, status: 1 }` (IXSCAN), không phải full collection scan (COLLSCAN). Điều này đảm bảo latency ổn định dù collection tăng kích thước — critical cho realtime kitchen display.

---

## 5. Lambda + Bedrock Evidence

### 5.1 Lambda Function — Bedrock Chat

**Screenshot**: *(chụp Lambda Console → Function overview, hiện function name, runtime, memory, trigger)*

**Function details**:
| Thuộc tính | Giá trị |
|-----------|---------|
| Function name | `5xrestaurant-bedrock-chat` |
| Runtime | Node.js 20.x |
| Memory | 256 MB |
| Timeout | 30 seconds |
| Trigger | API Gateway (`POST /api/bedrock-chat`) |
| Execution role | `5xrestaurant-bedrock-chat-role` |

### 5.2 CloudWatch Logs — Lambda Invocation

**Screenshot**: *(chụp CloudWatch → Log Groups → `/aws/lambda/5xrestaurant-bedrock-chat` → log stream gần nhất hiện `[Bedrock Lambda] Received event:` và `[Bedrock Lambda] Response received`)*

**Notes**: Log group `/aws/lambda/5xrestaurant-bedrock-chat` với retention 7 ngày. Mỗi invocation log 3 entries: event received → user message → response received (reply length + sources count).

### 5.3 Bedrock Knowledge Base — RetrieveAndGenerate Response

**Screenshot**: *(chụp output từ Lambda test hoặc API call — hiện `reply` và `sources` với S3 URIs)*

**Notes**:
| Config | Giá trị |
|--------|---------|
| Knowledge Base ID | *(điền bedrock_kb_id)* |
| Embedding Model | *(điền tên, ví dụ: Amazon Titan Embeddings G1 - Text v2)* |
| Vector Store | *(điền loại, ví dụ: OpenSearch Serverless / S3 Vectors)* |
| Foundation Model | Claude 3 Haiku (`bedrock_model_arn`) |
| Documents ingested | `docs/eatease_menu.md` + *(liệt kê các docs khác)* |

Lambda function gọi `RetrieveAndGenerateCommand` (không phải Playground) — nhận câu hỏi từ API Gateway, truy xuất vector search từ Knowledge Base (top 5 kết quả), rồi pass context + question qua Claude 3 Haiku để sinh câu trả lời tiếng Việt. Response bao gồm `reply` text + `sources` citations (S3 URIs của documents gốc).

---

## 6. VPC + Networking Evidence

### 6.1 S3 Gateway Endpoint

**Screenshot**: *(chụp VPC Console → Endpoints → `vpce-xxx` type Gateway for `com.amazonaws.ap-southeast-1.s3`)*

**CLI alternative**:
```bash
aws ec2 describe-vpc-endpoints --filters "Name=service-name,Values=com.amazonaws.*.s3" \
  --query 'VpcEndpoints[*].{Id:VpcEndpointId,Service:ServiceName,RouteTableIds:RouteTableIds}'
```

**Notes**: S3 Gateway Endpoint gắn vào private route tables. S3 traffic từ ECS Fargate (private subnets) đi qua AWS backbone network thay vì NAT Gateway → tiết kiệm chi phí NAT data processing ($0.045/GB) và giảm latency. Đây là W2 gap fix theo yêu cầu W3 learner guide.

### 6.2 Route Table — Private Subnets

**Screenshot**: *(chụp VPC Console → Route Tables → private route table, hiện 2 routes: `10.0.0.0/16 → local` và `pl-xxx → vpce-xxx`)*

### 6.3 VPC Diagram — 3-Tier

```
┌─────────────────────────────── VPC 10.0.0.0/16 ───────────────────────────────┐
│                                                                                │
│  ┌──── Public Subnets ────┐  ┌──── Private Subnets ───┐  ┌── DB Subnets ──┐  │
│  │  10.0.1.0/24 (AZ-a)    │  │  10.0.11.0/24 (AZ-a)   │  │ 10.0.21.0/24   │  │
│  │  10.0.2.0/24 (AZ-b)    │  │  10.0.12.0/24 (AZ-b)   │  │ 10.0.22.0/24   │  │
│  │                        │  │                         │  │                │  │
│  │  ┌─────┐  ┌────────┐   │  │  ┌──────────────────┐   │  │ ┌───────────┐  │  │
│  │  │ ALB │  │NAT GW  │   │  │  │ ECS Fargate ×2   │   │  │ │DocumentDB │  │  │
│  │  └─────┘  └────────┘   │  │  │ (backend-container│   │  │ │ Cluster   │  │  │
│  │                        │  │  │  port 8080)       │   │  │ │ port 27017│  │  │
│  └────────────────────────┘  │  └──────────────────────┘   │  └───────────┘  │  │
│                              │         │                   │       ▲         │  │
│  Internet GW ←── 0.0.0.0/0  │         │ S3 GW Endpoint    │       │ SG:     │  │
│                              │         ▼ (vpce-xxx)        │  app_sg only    │  │
│                              └─────────────────────────────┘  └──────────────┘  │
└────────────────────────────────────────────────────────────────────────────────┘
```

### 6.4 DB Security Group — Inbound Rule

**Screenshot**: *(chụp VPC Console → SG `5xrestaurant-data-sg` → Inbound rules, hiện Source = `sg-xxx` (app-sg))*

**Notes**: Database SG inbound rule source là **App tier Security Group ID** (`sg-xxx`), **KHÔNG phải** subnet CIDR block — đúng W3 acceptance criterion. Nếu App tier scale (thêm tasks, thay đổi IPs), SG rule vẫn tự động cho phép vì reference bằng SG ID.

---

## 7. Negative Security Test

### 7.1 Unauthorized DocumentDB Access — Denied

**Kịch bản**: Thử connect tới DocumentDB từ một source không nằm trong `app_sg`.

**Command** (từ local machine hoặc EC2 không thuộc app_sg):
```bash
# Thử telnet tới DocumentDB endpoint — sẽ bị timeout vì SG block
telnet 5xrestaurant-docdb-cluster.cluster-xxx.ap-southeast-1.docdb.amazonaws.com 27017
```

**Screenshot**: *(chụp kết quả Connection timed out / refused)*

**Notes**: Connection bị block vì source IP / Security Group không match inbound rule của `data_sg` (chỉ cho phép từ `app_sg`). Đây chứng minh defense-in-depth: ngay cả khi attacker vào được VPC, nếu không thuộc app tier SG thì không thể truy cập database.

### 7.2 S3 Direct Access — Denied

**Command**:
```bash
# Thử access S3 object trực tiếp qua URL — sẽ bị 403 AccessDenied
curl https://<bucket-name>.s3.ap-southeast-1.amazonaws.com/index.html
```

**Screenshot**: *(chụp kết quả 403 AccessDenied XML response)*

**Notes**: Block Public Access ON + bucket policy chỉ cho phép CloudFront OAC principal → direct S3 access bị denied. Users chỉ có thể access frontend qua CloudFront HTTPS URL.

---

## 8. Bonus (Optional)

### 8.1 Terraform Infrastructure as Code (IaC)

Toàn bộ infrastructure được quản lý bằng Terraform với 6 modules:

| Module | Resources |
|--------|-----------|
| `tf/networking` | VPC (3-tier), ALB, NAT GW, S3 Gateway Endpoint, API Gateway |
| `tf/security` | 3 Security Groups, Secrets Manager |
| `tf/compute` | ECS Cluster, Task Definition, Service, IAM Roles |
| `tf/database` | DocumentDB Cluster + Instance |
| `tf/storage` | S3 + CloudFront + ECR + Versioning + Lifecycle + Encryption |
| `tf/lambda` | Lambda Function + IAM Role + API Gateway Integration |

**Tương đương CloudFormation**: Terraform đóng vai trò IaC tương tự CloudFormation — reproducible, version-controlled, idempotent deployments.

```bash
# Validate toàn bộ infrastructure
terraform validate
# Output: Success! The configuration is valid.

terraform plan -var-file="envs/dev.tfvars"
# Shows all resources managed
```

**Git commit**: *(điền link commit)*

---

*Evidence Pack này là source of truth cho Friday presentation. Slides được derived từ file này.*
