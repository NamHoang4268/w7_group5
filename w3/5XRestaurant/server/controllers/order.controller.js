/**
 * order.controller.js — đã được migrate sang TableOrderModel
 * Route /api/order/all-orders giữ lại để tương thích với các UI cũ.
 */
import TableOrderModel from '../models/tableOrder.model.js';
import UserModel from '../models/user.model.js';

export async function getAllOrders(request, response) {
    try {
        const userId = request.userId;
        const user = await UserModel.findById(userId);

        if (!user || !['ADMIN', 'WAITER', 'CASHIER'].includes(user.role)) {
            return response.status(403).json({
                message: 'Bạn không có quyền truy cập',
                error: true,
                success: false
            });
        }

        const { status, startDate, endDate } = request.query;

        let query = {};

        // tableOrder dùng paymentStatus thay vì payment_status
        if (status) {
            if (status === 'Đã thanh toán') {
                query.paymentStatus = { $in: ['paid', 'Đã thanh toán'] };
            } else if (status === 'Chờ xử lý') {
                query.paymentStatus = { $in: ['pending', 'Chờ xử lý'] };
            } else if (status === 'Đã hoàn tiền') {
                query.paymentStatus = { $in: ['refunded', 'Đã hoàn tiền'] };
            } else if (status === 'Đã hủy') {
                query.$or = [
                    { paymentStatus: { $in: ['cancelled', 'Đã hủy'] } },
                    { status: 'cancelled' }
                ];
            } else {
                query.paymentStatus = status;
            }
        }

        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                query.createdAt.$lte = end;
            }
        }

        const orders = await TableOrderModel.find(query)
            .populate({ path: 'customerId', select: 'name phone' })
            .populate({ path: 'voucherId', select: 'code name discountType discountValue' })
            .sort({ createdAt: -1 });

        return response.status(200).json({
            message: 'Lấy danh sách đơn hàng thành công',
            error: false,
            success: true,
            data: orders
        });

    } catch (error) {
        console.error('Error getting all orders:', error);
        return response.status(500).json({
            message: error.message || 'Lỗi khi lấy danh sách đơn hàng',
            error: true,
            success: false
        });
    }
}

export async function updateOrderStatus(request, response) {
    try {
        const userId = request.userId;
        const { orderId } = request.params;
        const { status, cancelReason } = request.body;

        const user = await UserModel.findById(userId);

        if (!user || !['ADMIN', 'WAITER', 'CASHIER'].includes(user.role)) {
            return response.status(403).json({
                message: 'Bạn không có quyền cập nhật trạng thái đơn hàng',
                error: true,
                success: false
            });
        }

        const order = await TableOrderModel.findById(orderId);

        if (!order) {
            return response.status(404).json({
                message: 'Không tìm thấy đơn hàng',
                error: true,
                success: false
            });
        }

        // Map các trạng thái cũ → thường dùng trong tableOrder
        if (status === 'paid' || status === 'Đã thanh toán') {
            order.paymentStatus = 'paid';
            order.paidAt = new Date();
            order.status = 'paid';
        } else if (status === 'cancelled' || status === 'Đã hủy') {
            order.status = 'cancelled';
            order.paymentStatus = 'Đã hủy';
        } else {
            order.paymentStatus = status;
        }

        await order.save();

        return response.status(200).json({
            message: 'Cập nhật trạng thái đơn hàng thành công',
            error: false,
            success: true,
            data: order
        });

    } catch (error) {
        console.error('Error updating order status:', error);
        return response.status(500).json({
            message: error.message || 'Lỗi khi cập nhật trạng thái đơn hàng',
            error: true,
            success: false
        });
    }
}
