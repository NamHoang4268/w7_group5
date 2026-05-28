import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();
import cookieParser from "cookie-parser";
import morgan from "morgan";
import helmet from "helmet";
import http from "http";
import { Server } from "socket.io";
import connectDB from "./config/connectDB.js";
import userRouter from "./route/user.route.js";
import categoryRouter from "./route/category.route.js";
import subCategoryRouter from "./route/subCategory.route.js";
import uploadRouter from "./route/upload.route.js";
import productRouter from "./route/product.route.js";
import voucherRouter from './route/voucher.route.js';
import tableRouter from './route/table.route.js';
import bookingRouter from './route/booking.route.js';
import tableAuthRouter from './route/tableAuth.route.js';
import tableOrderRouter from './route/tableOrder.route.js';
import chatRouter from './route/chat.route.js';
import supportChatRouter from './route/supportChat.route.js';
import customerRouter from './route/customer.route.js';
import kitchenRouter from './route/kitchen.route.js';
import { registerSupportChatSocket } from "./socket/supportChat.socket.js";
import { registerKitchenSocket } from "./socket/kitchen.socket.js";
import serviceRequestRouter from './route/serviceRequest.route.js';
import paymentRouter from './route/payment.route.js';
import { handleStripeWebhook } from './controllers/tableOrder.controller.js';

const app = express();
const httpServer = http.createServer(app);

// Danh sách các origin được phép — đọc từ env (có thể có nhiều, ngăn cách bằng dấu phẩy)
const getAllowedOrigins = () => {
    const raw = process.env.FRONTEND_URL || 'http://localhost:5173';
    return raw.split(',').map((u) => u.trim()).filter(Boolean);
};

const corsOptions = {
    origin: (origin, callback) => {
        const allowed = getAllowedOrigins();
        // cho phép request không có origin (server-to-server, Postman, curl)
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

// Socket.io
const io = new Server(httpServer, {
    cors: {
        origin: getAllowedOrigins(),
        methods: ['GET', 'POST'],
        credentials: true,
    },
});
registerSupportChatSocket(io);
registerKitchenSocket(io);

// Gắn io vào app để dùng trong controllers
app.set('io', io);

app.use(cors(corsOptions));

// Middleware để lưu raw body cho webhook Stripe
app.use((req, res, next) => {
    const isWebhook = req.originalUrl === '/api/stripe/webhook' ||
                      req.originalUrl === '/api/table-order/stripe-webhook';
    if (isWebhook) {
        let data = '';
        req.setEncoding('utf8');
        req.on('data', chunk => {
            data += chunk;
        });
        req.on('end', () => {
            req.rawBody = data;
            try {
                req.body = JSON.parse(data);
            } catch (error) {
                console.error('Error parsing webhook JSON:', error);
                req.body = {};
            }
            next();
        });
    } else {
        express.json()(req, res, next);
    }
});

app.use(cookieParser());
app.use(morgan('dev'));
app.use(
    helmet({
        crossOriginResourcePolicy: false,
    }),
);

const PORT = process.env.PORT || 8080;

app.get("/", (req, res) => {
    res.json({ message: "EatEase Server running on port " + PORT });
});

app.get("/health", (req, res) => {
    res.status(200).send("OK");
});

// === API ROUTES ===
app.use('/api/user', userRouter);
app.use('/api/category', categoryRouter);
app.use('/api/sub-category', subCategoryRouter);
app.use('/api/file', uploadRouter);
app.use('/api/product', productRouter);
app.use('/api/voucher', voucherRouter);
app.use('/api/table', tableRouter);
app.use('/api/booking', bookingRouter);
app.use('/api/table-auth', tableAuthRouter);
app.use('/api/table-order', tableOrderRouter);
app.use('/api/chat', chatRouter);
app.use('/api/support', supportChatRouter);
app.use('/api/customer', customerRouter);
app.use('/api/kitchen', kitchenRouter);
import orderRouter from './route/order.route.js';
app.use('/api/order', orderRouter);
app.use('/api/service-request', serviceRequestRouter);
app.use('/api/payment', paymentRouter);

// Legacy Stripe webhook path (for Stripe CLI and production compatibility)
app.post('/api/stripe/webhook', handleStripeWebhook);


connectDB().then(() => {
    httpServer.listen(PORT, () => {
        console.log("EatEase Server is running on port", PORT);
    });
});