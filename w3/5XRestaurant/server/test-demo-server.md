# Test Demo Server Locally

## Bước 1: Chạy server local

```bash
cd d:\NamHoang\Workspace\ChuongTrinhHoc\XRestaurant\server

# Chạy demo server
node index.demo.js
```

**Kết quả mong đợi**:
```
========================================
🚀 XRestaurant Demo Server Started
========================================
📍 Port: 8080
🌍 Environment: development
📊 Mode: Mock Data (No Database Required)
🔗 Health Check: http://localhost:8080/health
========================================
```

## Bước 2: Test các endpoints (mở terminal mới)

### Test 1: Health Check
```bash
curl http://localhost:8080/health
```

**Expected Output**:
```json
{
  "status": "healthy",
  "service": "xrestaurant-backend",
  "timestamp": "2026-04-16T03:15:00.000Z",
  "uptime": 5.123
}
```

### Test 2: Root endpoint
```bash
curl http://localhost:8080/
```

**Expected Output**:
```json
{
  "message": "XRestaurant Demo Server - Week 2 AWS Deployment",
  "version": "1.0.0-demo",
  "mode": "mock-data",
  "endpoints": [...]
}
```

### Test 3: Get Products
```bash
curl http://localhost:8080/api/product
```

**Expected Output**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "1",
      "name": "Phở Bò",
      "price": 50000,
      ...
    }
  ],
  "pagination": {...}
}
```

### Test 4: Get Orders
```bash
curl http://localhost:8080/api/order
```

### Test 5: Get Tables
```bash
curl http://localhost:8080/api/table
```

### Test 6: Get Categories
```bash
curl http://localhost:8080/api/category
```

### Test 7: Get Stats (Dashboard)
```bash
curl http://localhost:8080/api/stats
```

## Bước 3: Test trong browser

Mở browser và truy cập:
- http://localhost:8080/
- http://localhost:8080/health
- http://localhost:8080/api/product
- http://localhost:8080/api/order

## Bước 4: Stop server

Nhấn `Ctrl + C` trong terminal đang chạy server.

## ✅ Nếu tất cả tests pass → Server sẵn sàng để build Docker image!
