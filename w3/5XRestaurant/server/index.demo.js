import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();
import cookieParser from "cookie-parser";
import morgan from "morgan";
import helmet from "helmet";

const app = express();

// Danh sách các origin được phép
const getAllowedOrigins = () => {
    const raw = process.env.FRONTEND_URL || 'http://localhost:5173';
    return raw.split(',').map((u) => u.trim()).filter(Boolean);
};

const corsOptions = {
    origin: (origin, callback) => {
        const allowed = getAllowedOrigins();
        if (!origin || allowed.includes(origin)) {
            callback(null, true);
        } else {
            console.warn('[CORS] Blocked origin:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());
app.use(morgan('dev'));
app.use(
    helmet({
        crossOriginResourcePolicy: false,
    }),
);

const PORT = process.env.PORT || 8080;

// ============================================
// MOCK DATA - Không cần database
// ============================================

const mockProducts = [
    {
        _id: "1",
        name: "Phở Bò",
        description: "Phở bò truyền thống Hà Nội với nước dùng hầm xương 12 tiếng",
        price: 50000,
        image: "https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=400",
        category: "Món chính",
        subCategory: "Phở",
        stock: 100,
        unit: "bát"
    },
    {
        _id: "2",
        name: "Bún Chả",
        description: "Bún chả Hà Nội với thịt nướng than hoa thơm ngon",
        price: 45000,
        image: "https://images.unsplash.com/photo-1559314809-0d155014e29e?w=400",
        category: "Món chính",
        subCategory: "Bún",
        stock: 80,
        unit: "phần"
    },
    {
        _id: "3",
        name: "Cơm Tấm",
        description: "Cơm tấm sườn bì chả với nước mắm pha đặc biệt",
        price: 40000,
        image: "https://images.unsplash.com/photo-1626804475297-41608ea09aeb?w=400",
        category: "Món chính",
        subCategory: "Cơm",
        stock: 120,
        unit: "phần"
    },
    {
        _id: "4",
        name: "Gỏi Cuốn",
        description: "Gỏi cuốn tôm thịt tươi ngon với rau sống",
        price: 35000,
        image: "https://images.unsplash.com/photo-1594756202469-9ff9799b2e4e?w=400",
        category: "Khai vị",
        subCategory: "Gỏi",
        stock: 60,
        unit: "đĩa"
    },
    {
        _id: "5",
        name: "Trà Đá",
        description: "Trà đá truyền thống",
        price: 5000,
        image: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400",
        category: "Đồ uống",
        subCategory: "Trà",
        stock: 200,
        unit: "ly"
    }
];

const mockOrders = [
    {
        _id: "order-1",
        orderNumber: "ORD-001",
        items: [
            { product: mockProducts[0], quantity: 2, price: 50000 },
            { product: mockProducts[4], quantity: 1, price: 5000 }
        ],
        total: 105000,
        status: "completed",
        customerName: "Nguyễn Văn A",
        tableNumber: "T01",
        createdAt: new Date(Date.now() - 3600000).toISOString()
    },
    {
        _id: "order-2",
        orderNumber: "ORD-002",
        items: [
            { product: mockProducts[1], quantity: 1, price: 45000 },
            { product: mockProducts[3], quantity: 1, price: 35000 }
        ],
        total: 80000,
        status: "pending",
        customerName: "Trần Thị B",
        tableNumber: "T05",
        createdAt: new Date(Date.now() - 1800000).toISOString()
    },
    {
        _id: "order-3",
        orderNumber: "ORD-003",
        items: [
            { product: mockProducts[2], quantity: 3, price: 40000 }
        ],
        total: 120000,
        status: "preparing",
        customerName: "Lê Văn C",
        tableNumber: "T03",
        createdAt: new Date(Date.now() - 900000).toISOString()
    }
];

const mockTables = [
    { _id: "t1", tableNumber: "T01", capacity: 4, status: "occupied", qrCode: "QR-T01" },
    { _id: "t2", tableNumber: "T02", capacity: 2, status: "available", qrCode: "QR-T02" },
    { _id: "t3", tableNumber: "T03", capacity: 6, status: "occupied", qrCode: "QR-T03" },
    { _id: "t4", tableNumber: "T04", capacity: 4, status: "reserved", qrCode: "QR-T04" },
    { _id: "t5", tableNumber: "T05", capacity: 8, status: "occupied", qrCode: "QR-T05" }
];

const mockCategories = [
    { _id: "cat1", name: "Món chính", description: "Các món ăn chính", image: "category-main.jpg" },
    { _id: "cat2", name: "Khai vị", description: "Món khai vị", image: "category-appetizer.jpg" },
    { _id: "cat3", name: "Đồ uống", description: "Nước uống các loại", image: "category-drinks.jpg" },
    { _id: "cat4", name: "Tráng miệng", description: "Món tráng miệng", image: "category-dessert.jpg" }
];

const mockBookings = [
    {
        _id: "book1",
        customerName: "Phạm Văn D",
        phone: "0901234567",
        email: "phamvand@example.com",
        date: new Date(Date.now() + 86400000).toISOString(),
        time: "19:00",
        guests: 4,
        tableNumber: "T04",
        status: "confirmed",
        notes: "Sinh nhật"
    }
];

// ============================================
// ROUTES - Return mock data
// ============================================

// Root endpoint
app.get("/", (req, res) => {
    res.json({ 
        message: "XRestaurant Demo Server - Week 2 AWS Deployment",
        version: "1.0.0-demo",
        mode: "mock-data",
        endpoints: [
            "GET /health",
            "GET /api/product",
            "GET /api/product/:id",
            "GET /api/order",
            "GET /api/order/:id",
            "GET /api/table",
            "GET /api/category",
            "GET /api/booking",
            "GET /api/user/profile"
        ]
    });
});

// Health check
app.get("/health", (req, res) => {
    res.json({ 
        status: "healthy", 
        service: "xrestaurant-backend",
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Products API
app.get("/api/product", (req, res) => {
    const { category, search, limit = 10, page = 1 } = req.query;
    
    let filtered = [...mockProducts];
    
    if (category) {
        filtered = filtered.filter(p => p.category === category);
    }
    
    if (search) {
        filtered = filtered.filter(p => 
            p.name.toLowerCase().includes(search.toLowerCase()) ||
            p.description.toLowerCase().includes(search.toLowerCase())
        );
    }
    
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedProducts = filtered.slice(startIndex, endIndex);
    
    res.json({
        success: true,
        data: paginatedProducts,
        pagination: {
            total: filtered.length,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(filtered.length / limit)
        }
    });
});

app.get("/api/product/:id", (req, res) => {
    const product = mockProducts.find(p => p._id === req.params.id);
    if (!product) {
        return res.status(404).json({ success: false, message: "Product not found" });
    }
    res.json({ success: true, data: product });
});

// Orders API
app.get("/api/order", (req, res) => {
    const { status, limit = 10, page = 1 } = req.query;
    
    let filtered = [...mockOrders];
    
    if (status) {
        filtered = filtered.filter(o => o.status === status);
    }
    
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedOrders = filtered.slice(startIndex, endIndex);
    
    res.json({
        success: true,
        data: paginatedOrders,
        pagination: {
            total: filtered.length,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(filtered.length / limit)
        }
    });
});

app.get("/api/order/:id", (req, res) => {
    const order = mockOrders.find(o => o._id === req.params.id);
    if (!order) {
        return res.status(404).json({ success: false, message: "Order not found" });
    }
    res.json({ success: true, data: order });
});

app.post("/api/order", (req, res) => {
    const newOrder = {
        _id: `order-${Date.now()}`,
        orderNumber: `ORD-${String(mockOrders.length + 1).padStart(3, '0')}`,
        ...req.body,
        status: "pending",
        createdAt: new Date().toISOString()
    };
    
    res.status(201).json({
        success: true,
        message: "Order created successfully (mock)",
        data: newOrder
    });
});

// Tables API
app.get("/api/table", (req, res) => {
    const { status } = req.query;
    
    let filtered = [...mockTables];
    
    if (status) {
        filtered = filtered.filter(t => t.status === status);
    }
    
    res.json({
        success: true,
        data: filtered
    });
});

app.get("/api/table/:id", (req, res) => {
    const table = mockTables.find(t => t._id === req.params.id);
    if (!table) {
        return res.status(404).json({ success: false, message: "Table not found" });
    }
    res.json({ success: true, data: table });
});

// Categories API
app.get("/api/category", (req, res) => {
    res.json({
        success: true,
        data: mockCategories
    });
});

// Bookings API
app.get("/api/booking", (req, res) => {
    res.json({
        success: true,
        data: mockBookings
    });
});

app.post("/api/booking", (req, res) => {
    const newBooking = {
        _id: `book-${Date.now()}`,
        ...req.body,
        status: "pending",
        createdAt: new Date().toISOString()
    };
    
    res.status(201).json({
        success: true,
        message: "Booking created successfully (mock)",
        data: newBooking
    });
});

// User API (mock authentication)
app.get("/api/user/profile", (req, res) => {
    res.json({
        success: true,
        data: {
            _id: "user-1",
            name: "Demo User",
            email: "demo@xrestaurant.com",
            role: "admin",
            phone: "0901234567"
        }
    });
});

// Kitchen API
app.get("/api/kitchen", (req, res) => {
    const pendingOrders = mockOrders.filter(o => o.status === "pending" || o.status === "preparing");
    res.json({
        success: true,
        data: pendingOrders
    });
});

// Stats API (for dashboard)
app.get("/api/stats", (req, res) => {
    res.json({
        success: true,
        data: {
            totalOrders: mockOrders.length,
            totalRevenue: mockOrders.reduce((sum, o) => sum + o.total, 0),
            totalProducts: mockProducts.length,
            totalTables: mockTables.length,
            occupiedTables: mockTables.filter(t => t.status === "occupied").length,
            pendingOrders: mockOrders.filter(o => o.status === "pending").length
        }
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "Endpoint not found",
        path: req.path,
        method: req.method,
        availableEndpoints: [
            "GET /",
            "GET /health",
            "GET /api/product",
            "GET /api/order",
            "GET /api/table",
            "GET /api/category",
            "GET /api/booking",
            "GET /api/kitchen",
            "GET /api/stats"
        ]
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        success: false,
        message: err.message || "Internal server error"
    });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log("========================================");
    console.log("🚀 XRestaurant Demo Server Started");
    console.log("========================================");
    console.log(`📍 Port: ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📊 Mode: Mock Data (No Database Required)`);
    console.log(`🔗 Health Check: http://localhost:${PORT}/health`);
    console.log("========================================");
});
