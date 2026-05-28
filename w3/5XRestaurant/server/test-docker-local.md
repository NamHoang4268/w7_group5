# Test Docker Image Locally (Trước Khi Push Lên AWS)

## Bước 1: Build Docker Image

```bash
cd d:\NamHoang\Workspace\ChuongTrinhHoc\XRestaurant\server

# Build image
docker build -t xrestaurant-backend:demo .
```

**Kết quả mong đợi**:
```
[+] Building 45.2s (10/10) FINISHED
 => [internal] load build definition from Dockerfile
 => => transferring dockerfile: 456B
 => [internal] load .dockerignore
 => ...
 => exporting to image
 => => exporting layers
 => => writing image sha256:abc123...
 => => naming to docker.io/library/xrestaurant-backend:demo
```

## Bước 2: Kiểm tra image đã được tạo

```bash
docker images | grep xrestaurant
```

**Expected Output**:
```
xrestaurant-backend   demo   abc123def456   2 minutes ago   180MB
```

## Bước 3: Run container local

```bash
# Run container
docker run -d \
  --name xrestaurant-demo \
  -p 8080:8080 \
  -e PORT=8080 \
  -e NODE_ENV=production \
  xrestaurant-backend:demo

# Check container status
docker ps | grep xrestaurant
```

**Expected Output**:
```
CONTAINER ID   IMAGE                      STATUS         PORTS
abc123def456   xrestaurant-backend:demo   Up 5 seconds   0.0.0.0:8080->8080/tcp
```

## Bước 4: Check logs

```bash
docker logs xrestaurant-demo
```

**Expected Output**:
```
========================================
🚀 XRestaurant Demo Server Started
========================================
📍 Port: 8080
🌍 Environment: production
📊 Mode: Mock Data (No Database Required)
🔗 Health Check: http://localhost:8080/health
========================================
```

## Bước 5: Test container

### Test health check
```bash
curl http://localhost:8080/health
```

### Test API endpoints
```bash
curl http://localhost:8080/api/product
curl http://localhost:8080/api/order
curl http://localhost:8080/api/table
```

### Test trong browser
Mở browser: http://localhost:8080/

## Bước 6: Check health check của Docker

```bash
# Đợi 30 giây để health check chạy
sleep 35

# Check health status
docker inspect xrestaurant-demo --format='{{.State.Health.Status}}'
```

**Expected Output**: `healthy`

## Bước 7: Stop và remove container

```bash
# Stop container
docker stop xrestaurant-demo

# Remove container
docker rm xrestaurant-demo

# (Optional) Remove image
docker rmi xrestaurant-backend:demo
```

## ✅ Nếu tất cả tests pass → Docker image sẵn sàng để push lên AWS ECR!

---

## Troubleshooting

### Lỗi: "port 8080 already in use"
```bash
# Tìm process đang dùng port 8080
netstat -ano | findstr :8080

# Kill process (thay PID bằng số từ lệnh trên)
taskkill /PID <PID> /F

# Hoặc dùng port khác
docker run -d --name xrestaurant-demo -p 8081:8080 xrestaurant-backend:demo
```

### Lỗi: "Docker daemon not running"
```bash
# Start Docker Desktop trên Windows
# Hoặc start Docker service
```

### Container bị crash
```bash
# Check logs để xem lỗi
docker logs xrestaurant-demo

# Check exit code
docker inspect xrestaurant-demo --format='{{.State.ExitCode}}'
```
