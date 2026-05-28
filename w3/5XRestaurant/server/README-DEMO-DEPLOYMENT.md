# XRestaurant Demo Server - Week 2 AWS Deployment

## 📋 Tổng Quan

Đây là phiên bản **demo** của XRestaurant backend, được thiết kế đặc biệt cho **Week 2 AWS Deployment Presentation**.

### ✅ Đặc Điểm

- **Không cần Database**: Tất cả data được mock trong code
- **Không cần Environment Variables phức tạp**: Chỉ cần PORT và FRONTEND_URL
- **Giữ nguyên API structure**: Tương thích với frontend hiện có
- **Sẵn sàng cho Docker**: Có Dockerfile và health check
- **Sẵn sàng cho AWS Fargate**: Tối ưu cho container deployment

### ❌ Không Có

- MongoDB connection
- Stripe payment integration
- Cloudinary image upload
- Socket.io real-time features
- JWT authentication (có mock user)

---

## 🚀 Quick Start

### Option 1: Chạy Local (Node.js)

```bash
cd XRestaurant/server
node index.demo.js
```

Truy cập: http://localhost:8080/health

### Option 2: Chạy Local (Docker)

```bash
cd XRestaurant/server
docker build -t xrestaurant-backend:demo .
docker run -d -p 8080:8080 --name xrestaurant-demo xrestaurant-backend:demo
```

Truy cập: http://localhost:8080/health

---

## 📁 Files Quan Trọng

| File | Mô Tả |
|------|-------|
| `index.demo.js` | Main server file với mock data (KHÔNG CẦN DATABASE) |
| `Dockerfile` | Docker configuration cho AWS Fargate |
| `.dockerignore` | Files bỏ qua khi build Docker image |
| `.env.demo` | Environment variables mẫu |
| `test-demo-server.md` | Hướng dẫn test server local |
| `test-docker-local.md` | Hướng dẫn test Docker image local |

---

## 🔌 API Endpoints

### Core Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Server info và list endpoints |
| GET | `/health` | Health check (cho AWS health check) |

### Product Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/product` | Get all products (có pagination, filter) |
| GET | `/api/product/:id` | Get product by ID |

### Order Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/order` | Get all orders (có pagination, filter) |
| GET | `/api/order/:id` | Get order by ID |
| POST | `/api/order` | Create new order (mock) |

### Table Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/table` | Get all tables |
| GET | `/api/table/:id` | Get table by ID |

### Other Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/category` | Get all categories |
| GET | `/api/booking` | Get all bookings |
| POST | `/api/booking` | Create booking (mock) |
| GET | `/api/kitchen` | Get kitchen orders |
| GET | `/api/stats` | Get dashboard stats |
| GET | `/api/user/profile` | Get user profile (mock) |

---

## 🧪 Testing

### Test 1: Local Node.js

```bash
# Terminal 1: Start server
node index.demo.js

# Terminal 2: Test endpoints
curl http://localhost:8080/health
curl http://localhost:8080/api/product
curl http://localhost:8080/api/order
```

### Test 2: Local Docker

```bash
# Build and run
docker build -t xrestaurant-backend:demo .
docker run -d -p 8080:8080 --name xrestaurant-demo xrestaurant-backend:demo

# Test
curl http://localhost:8080/health

# Check logs
docker logs xrestaurant-demo

# Cleanup
docker stop xrestaurant-demo
docker rm xrestaurant-demo
```

---

## 🐳 Docker Details

### Image Size
- Base: `node:20-alpine` (~180MB)
- Final image: ~180-200MB

### Health Check
- Interval: 30 seconds
- Timeout: 3 seconds
- Start period: 5 seconds
- Retries: 3
- Endpoint: `GET /health`

### Exposed Port
- Container: `8080`
- Protocol: `TCP`

---

## ☁️ AWS Deployment

### Khi Có AWS Account

1. **Build và push image lên ECR**:
```bash
# Tạo ECR repository
aws ecr create-repository --repository-name xrestaurant/backend --region ap-southeast-1

# Get ECR URI
export ECR_REPO=$(aws ecr describe-repositories --repository-names xrestaurant/backend --query 'repositories[0].repositoryUri' --output text)

# Login to ECR
aws ecr get-login-password --region ap-southeast-1 | docker login --username AWS --password-stdin ${ECR_REPO}

# Build, tag, push
docker build -t xrestaurant-backend:demo .
docker tag xrestaurant-backend:demo ${ECR_REPO}:latest
docker push ${ECR_REPO}:latest
```

2. **Deploy lên Fargate**: Xem file `quick-deploy-for-week2-demo.md` trong folder `KiroTest/`

---

## 📊 Mock Data

### Products (5 items)
- Phở Bò (50,000 VND)
- Bún Chả (45,000 VND)
- Cơm Tấm (40,000 VND)
- Gỏi Cuốn (35,000 VND)
- Trà Đá (5,000 VND)

### Orders (3 items)
- Order 1: Completed (105,000 VND)
- Order 2: Pending (80,000 VND)
- Order 3: Preparing (120,000 VND)

### Tables (5 items)
- T01: Occupied (4 seats)
- T02: Available (2 seats)
- T03: Occupied (6 seats)
- T04: Reserved (4 seats)
- T05: Occupied (8 seats)

### Categories (4 items)
- Món chính
- Khai vị
- Đồ uống
- Tráng miệng

---

## 🎯 Week 2 Presentation Checklist

### ✅ Storage Design
- [ ] Frontend deployed to S3 bucket
- [ ] 5 S3 buckets created (frontend, media, documents, logs, backups)
- [ ] All buckets have encryption enabled

### ✅ Identity Model
- [ ] IAM Task Role created for Fargate
- [ ] Least privilege policy (S3 read/write specific buckets)
- [ ] No hardcoded credentials

### ✅ Security Boundaries
- [ ] Security Group for Fargate (port 8080)
- [ ] Encryption at rest (S3)
- [ ] Can explain encryption in transit

### ✅ Live Demo
- [ ] Backend running on Fargate
- [ ] Can access `/health` endpoint
- [ ] Can access `/api/product` endpoint
- [ ] Show IAM role permissions

---

## 🔧 Troubleshooting

### Server không start
```bash
# Check logs
node index.demo.js

# Check port
netstat -ano | findstr :8080
```

### Docker build failed
```bash
# Check Docker daemon
docker version

# Check Dockerfile syntax
docker build --no-cache -t xrestaurant-backend:demo .
```

### Container unhealthy
```bash
# Check logs
docker logs xrestaurant-demo

# Check health endpoint manually
curl http://localhost:8080/health

# Inspect health status
docker inspect xrestaurant-demo --format='{{.State.Health.Status}}'
```

---

## 📞 Support

Nếu gặp vấn đề, check:
1. `test-demo-server.md` - Test local Node.js
2. `test-docker-local.md` - Test local Docker
3. `KiroTest/quick-deploy-for-week2-demo.md` - AWS deployment guide

---

## 🎓 Learning Resources

- [AWS Fargate Documentation](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/AWS_Fargate.html)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)

---

**Good luck với Week 2 presentation! 🚀**
