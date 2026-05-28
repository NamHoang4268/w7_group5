import { Router } from 'express';
import auth from '../middleware/auth.js';
import { getAllOrders, updateOrderStatus } from '../controllers/order.controller.js';

const orderRouter = Router();

// Re-enabled for BillPage
orderRouter.get('/all-orders', auth, getAllOrders);
orderRouter.put('/update-status/:orderId', auth, updateOrderStatus);

// Endpoint thông báo chuyển hướng cho các route cũ khác nếu có
orderRouter.use((req, res) => {
    res.status(410).json({
        success: false,
        message: 'Endpoint này đã ngừng hoạt động. Vui lòng sử dụng /api/table-order thay thế.',
    });
});

export default orderRouter;