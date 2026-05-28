import TableOrderModel from '../models/tableOrder.model.js';
import ProductModel from '../models/product.model.js';
import UserModel from '../models/user.model.js';
import mongoose from 'mongoose';
import Stripe from '../config/stripe.js';

// Add items to table order
export async function addItemsToTableOrder(request, response) {
    try {
        const userId = request.userId;
        const { items, tableNumber } = request.body;

        if (!items || items.length === 0) {
            return response.status(400).json({
                message: 'Vui lòng chọn món',
                error: true,
                success: false
            });
        }

        // Get user's table info
        const user = await UserModel.findById(userId);
        console.log('User found:', user ? { id: user._id, role: user.role, email: user.email } : 'null');

        if (!user || user.role !== 'TABLE') {
            console.log('Access denied - User role:', user?.role);
            return response.status(403).json({
                message: 'Chỉ tài khoản bàn mới có thể gọi món',
                error: true,
                success: false
            });
        }

        const tableId = user.linkedTableId;
        const actualTableNumber = tableNumber || user.email.split('_')[1]?.split('@')[0]?.toUpperCase();

        // Find or create active table order
        let tableOrder = await TableOrderModel.findOne({
            tableId: tableId,
            status: 'active'
        });

        // Prepare items with product details
        const itemsToAdd = [];
        let subTotal = 0;

        for (const item of items) {
            // AC 7.4 – Validate quantity
            const qty = parseInt(item.quantity);
            if (!qty || qty < 1 || !Number.isInteger(qty)) {
                return response.status(400).json({
                    message: 'Số lượng món ăn không hợp lệ.',
                    error: true,
                    success: false
                });
            }

            // AC 7.1 – Product must exist
            const product = await ProductModel.findById(item.productId);
            if (!product) {
                return response.status(404).json({
                    message: 'Món ăn không tồn tại.',
                    error: true,
                    success: false
                });
            }

            // Validate stock still uses status field
            const isProductAvailable = product.status === 'available';
            if (!isProductAvailable) {
                return response.status(400).json({
                    message: `"${product.name}" hiện không khả dụng.`,
                    error: true,
                    success: false
                });
            }

            // AC 7.3 – qty check (no stock field, just validate positive)
            // stock field đã xóa — chỉ validate qty > 0

            const itemTotal = product.price * qty;
            subTotal += itemTotal;

            itemsToAdd.push({
                productId: product._id,
                name: product.name,
                price: product.price,
                quantity: qty,
                note: item.note || '',
                addedAt: new Date()
            });
        }

        if (tableOrder) {
            // Update existing order
            tableOrder.items.push(...itemsToAdd);
            tableOrder.subTotal += subTotal;
            tableOrder.total = tableOrder.subTotal;

            if (['Đã phục vụ', 'Đang chuẩn bị'].includes(tableOrder.paymentStatus)) {
                tableOrder.paymentStatus = 'Chờ xử lý';
            }

            await tableOrder.save();
        } else {
            // Create new order
            tableOrder = await TableOrderModel.create({
                tableId: tableId,
                tableNumber: actualTableNumber,
                items: itemsToAdd,
                subTotal: subTotal,
                total: subTotal,
                status: 'active'
            });
        }

        return response.status(200).json({
            message: 'Đã thêm món vào đơn',
            error: false,
            success: true,
            data: {
                tableOrder: tableOrder,
                itemsAdded: itemsToAdd.length
            }
        });

    } catch (error) {
        console.error('Error adding items to table order:', error);
        return response.status(500).json({
            message: error.message || 'Lỗi khi thêm món',
            error: true,
            success: false
        });
    }
}

// Get current table order
export async function getCurrentTableOrder(request, response) {
    try {
        const userId = request.userId;

        const user = await UserModel.findById(userId);
        if (!user || user.role !== 'TABLE') {
            return response.status(403).json({
                message: 'Chỉ tài khoản bàn mới có thể xem đơn',
                error: true,
                success: false
            });
        }

        const tableOrder = await TableOrderModel.findOne({
            tableId: user.linkedTableId,
            status: 'active'
        }).populate('items.productId', 'name image');

        if (!tableOrder) {
            return response.status(200).json({
                message: 'Chưa có món nào được gọi',
                error: false,
                success: true,
                data: null
            });
        }

        return response.status(200).json({
            message: 'Lấy đơn hàng thành công',
            error: false,
            success: true,
            data: tableOrder
        });

    } catch (error) {
        console.error('Error getting table order:', error);
        return response.status(500).json({
            message: error.message || 'Lỗi khi lấy đơn hàng',
            error: true,
            success: false
        });
    }
}

// Checkout table order
export async function checkoutTableOrder(request, response) {
    try {
        const userId = request.userId;
        const { paymentMethod } = request.body;

        if (!paymentMethod || !['at_counter', 'online'].includes(paymentMethod)) {
            return response.status(400).json({
                message: 'Vui lòng chọn phương thức thanh toán',
                error: true,
                success: false
            });
        }

        const user = await UserModel.findById(userId);
        if (!user || user.role !== 'TABLE') {
            return response.status(403).json({
                message: 'Chỉ tài khoản bàn mới có thể thanh toán',
                error: true,
                success: false
            });
        }

        const tableOrder = await TableOrderModel.findOne({
            tableId: user.linkedTableId,
            status: 'active'
        }).populate('items.productId', 'name image');

        if (!tableOrder || tableOrder.items.length === 0) {
            return response.status(404).json({
                message: 'Không có đơn hàng nào để thanh toán',
                error: true,
                success: false
            });
        }

        // AC: Tất cả món phải ở trạng thái 'served' trước khi được phép thanh toán
        const unservedItems = tableOrder.items.filter(item => item.kitchenStatus !== 'served');
        if (unservedItems.length > 0) {
            return response.status(400).json({
                message: `Còn ${unservedItems.length} món chưa được phục vụ. Vui lòng chờ nhân viên mang món ra bàn trước khi thanh toán.`,
                error: true,
                success: false
            });
        }

        if (paymentMethod === 'at_counter') {
            // At-counter: mark as pending_payment so Cashier can confirm cash later
            tableOrder.status = 'pending_payment';
            tableOrder.paymentStatus = 'Chờ thanh toán';
            tableOrder.paymentRequest = 'at_counter';
            tableOrder.checkedOutAt = new Date();
            await tableOrder.save();

            return response.status(200).json({
                message: 'Yeu cau thanh toan tai quay da duoc gui. Nhan vien se den ho tro ban.',
                error: false,
                success: true,
                data: { paymentMethod: 'at_counter' }
            });

        } else {
            // Online payment – create Stripe Checkout Session
            const line_items = tableOrder.items.map(item => ({
                price_data: {
                    currency: 'vnd',
                    product_data: {
                        name: item.name,
                        metadata: { productId: item.productId.toString() }
                    },
                    unit_amount: Math.round(item.price),
                },
                quantity: item.quantity
            }));

            const params = {
                submit_type: 'pay',
                mode: 'payment',
                payment_method_types: ['card'],
                customer_email: user.email,
                metadata: {
                    userId: userId.toString(),
                    tableOrderId: tableOrder._id.toString(),
                    tableNumber: tableOrder.tableNumber,
                    orderType: 'dine_in'
                },
                line_items,
                success_url: `${process.env.FRONTEND_URL}/table-payment-success?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${process.env.FRONTEND_URL}/table-order-management`
            };

            const stripeSession = await Stripe.checkout.sessions.create(params);

            // Snapshot: save sessionId + expectedTotal for webhook verification
            tableOrder.stripeSessionId = stripeSession.id;
            tableOrder.expectedTotal = tableOrder.total;
            tableOrder.status = 'pending_payment';
            tableOrder.paymentStatus = 'Chờ thanh toán';
            tableOrder.paymentRequest = 'online';
            tableOrder.checkedOutAt = new Date();
            await tableOrder.save();

            return response.status(200).json({
                message: 'Tạo phiên thanh toán thành công',
                error: false,
                success: true,
                data: {
                    checkoutUrl: stripeSession.url,
                    sessionId: stripeSession.id
                }
            });
        }

    } catch (error) {
        console.error('Error checkout table order:', error);
        return response.status(500).json({
            message: error.message || 'Lỗi khi thanh toán',
            error: true,
            success: false
        });
    }
}

// Cancel table order
export async function cancelTableOrder(request, response) {
    try {
        const userId = request.userId;

        const user = await UserModel.findById(userId);
        if (!user || user.role !== 'TABLE') {
            return response.status(403).json({
                message: 'Không có quyền hủy đơn',
                error: true,
                success: false
            });
        }

        const tableOrder = await TableOrderModel.findOne({
            tableId: user.linkedTableId,
            status: 'active'
        });

        if (!tableOrder) {
            return response.status(404).json({
                message: 'Không tìm thấy đơn hàng',
                error: true,
                success: false
            });
        }

        tableOrder.status = 'cancelled';
        tableOrder.paymentStatus = 'Đã hủy';
        await tableOrder.save();

        return response.status(200).json({
            message: 'Đã hủy đơn hàng',
            error: false,
            success: true
        });

    } catch (error) {
        console.error('Error cancelling table order:', error);
        return response.status(500).json({
            message: error.message || 'Lỗi khi hủy đơn',
            error: true,
            success: false
        });
    }
}

// Get all active table orders (for Manager/Admin)
export async function getAllActiveTableOrders(request, response) {
    try {
        const userId = request.userId;

        const user = await UserModel.findById(userId);
        if (!user || !['ADMIN', 'WAITER', 'CHEF'].includes(user.role)) {
            return response.status(403).json({
                message: 'Không có quyền truy cập',
                error: true,
                success: false
            });
        }

        const tableOrders = await TableOrderModel.find({
            status: 'active'
        }).sort({ updatedAt: -1 });

        return response.status(200).json({
            message: 'Lấy danh sách đơn hàng thành công',
            error: false,
            success: true,
            data: tableOrders
        });

    } catch (error) {
        console.error('Error getting all table orders:', error);
        return response.status(500).json({
            message: error.message || 'Lỗi khi lấy danh sách đơn hàng',
            error: true,
            success: false
        });
    }
}

// AC3 - List all at-counter pending payment orders (for Cashier dashboard)
export async function getCashierPendingOrders(request, response) {
    try {
        const user = await UserModel.findById(request.userId);
        if (!user || !['ADMIN', 'CASHIER'].includes(user.role)) {
            return response.status(403).json({
                message: 'Khong co quyen truy cap',
                error: true, success: false
            });
        }

        const orders = await TableOrderModel.find({
            status: 'pending_payment',
            paymentRequest: 'at_counter'
        }).sort({ checkedOutAt: 1 });

        return response.status(200).json({
            message: 'Danh sach don cho thanh toan',
            error: false,
            success: true,
            data: orders
        });
    } catch (error) {
        return response.status(500).json({
            message: error.message || 'Loi server',
            error: true, success: false
        });
    }
}

// AC9-12 - Cashier confirms cash payment
export async function confirmCashierPayment(request, response) {
    try {
        const user = await UserModel.findById(request.userId);
        if (!user || !['ADMIN', 'CASHIER'].includes(user.role)) {
            return response.status(403).json({
                message: 'Khong co quyen thuc hien',
                error: true, success: false
            });
        }

        const { tableOrderId } = request.body;

        const tableOrder = await TableOrderModel.findById(tableOrderId);
        if (!tableOrder) {
            return response.status(404).json({
                message: 'Khong tim thay hoa don.',
                error: true, success: false
            });
        }

        if (tableOrder.status !== 'pending_payment') {
            return response.status(400).json({
                message: 'Thanh toan chua hoan tat. Vui long kiem tra lai.',
                error: true, success: false
            });
        }

        const session = await mongoose.startSession();
        try {
            await session.withTransaction(async () => {
                // tableOrder IS the order record — không cần tạo bản sao sang OrderModel nữa
                tableOrder.status = 'paid';
                tableOrder.paymentStatus = 'paid';
                tableOrder.paymentMethod = 'cash';
                tableOrder.paidAt = new Date();
                await tableOrder.save({ session });
            });

            return response.status(200).json({
                message: 'Thanh toan thanh cong. Don hang da duoc hoan tat.',
                error: false,
                success: true,
                data: { totalPaid: tableOrder.total, tableNumber: tableOrder.tableNumber }
            });
        } finally {
            await session.endSession();
        }
    } catch (error) {
        console.error('Error confirming cashier payment:', error);
        return response.status(500).json({
            message: error.message || 'Loi xac nhan thanh toan',
            error: true, success: false
        });
    }
}

// Waiter huỷ một món trong đơn (chỉ khi kitchenStatus === 'pending')
export async function cancelTableOrderItem(request, response) {
    try {
        const user = await UserModel.findById(request.userId);
        if (!user || !['ADMIN', 'WAITER'].includes(user.role)) {
            return response.status(403).json({
                message: 'Không có quyền huỷ món',
                error: true, success: false
            });
        }

        const { orderId, itemId } = request.params;

        const tableOrder = await TableOrderModel.findById(orderId);
        if (!tableOrder) {
            return response.status(404).json({
                message: 'Không tìm thấy đơn hàng',
                error: true, success: false
            });
        }

        const item = tableOrder.items.id(itemId);
        if (!item) {
            return response.status(404).json({
                message: 'Không tìm thấy món trong đơn',
                error: true, success: false
            });
        }

        if (item.kitchenStatus !== 'pending') {
            return response.status(400).json({
                message: `Không thể huỷ món đang ở trạng thái "${item.kitchenStatus}". Chỉ huỷ được món chờ bếp.`,
                error: true, success: false
            });
        }

        // Xoá item khỏi mảng
        tableOrder.items.pull(itemId);

        // Tính lại tổng
        const subTotal = tableOrder.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
        tableOrder.subTotal = subTotal;
        tableOrder.total = Math.max(0, subTotal - (tableOrder.discount || 0));

        await tableOrder.save();

        return response.status(200).json({
            message: 'Đã huỷ món thành công',
            error: false, success: true,
            data: { orderId, itemId, newTotal: tableOrder.total }
        });

    } catch (error) {
        console.error('cancelTableOrderItem error:', error);
        return response.status(500).json({
            message: error.message || 'Lỗi server',
            error: true, success: false
        });
    }
}

// ─────────────────────────────────────────────────────────────────
// US26 – Stripe Webhook (server-side payment confirmation)
// ─────────────────────────────────────────────────────────────────
export async function handleStripeWebhook(request, response) {
    const sig = request.headers['stripe-signature'];
    // Use CLI webhook secret when testing locally, else use dashboard secret
    const webhookSecret = process.env.STRIPE_CLI_WEBHOOK_SECRET || process.env.STRIPE_ENPOINT_WEBHOOK_SECRET_KEY;

    let event;
    try {
        event = Stripe.webhooks.constructEvent(request.rawBody, sig, webhookSecret);
    } catch (err) {
        console.error('[Stripe Webhook] Signature verification failed:', err.message);
        return response.status(400).json({ error: `Webhook Error: ${err.message}` });
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const { orderType, tableOrderId } = session.metadata || {};

        // Only handle dine-in orders
        if (orderType !== 'dine_in' || !tableOrderId) {
            return response.status(200).json({ received: true });
        }

        try {
            const tableOrder = await TableOrderModel.findById(tableOrderId);

            if (!tableOrder) {
                console.error('[Stripe Webhook] TableOrder not found:', tableOrderId);
                return response.status(200).json({ received: true }); // Ack to Stripe
            }

            // Idempotency: already paid
            if (tableOrder.status === 'paid') {
                return response.status(200).json({ received: true });
            }

            // AC 9.1 – Bill integrity check
            if (tableOrder.expectedTotal !== null &&
                Math.round(tableOrder.total) !== Math.round(tableOrder.expectedTotal)) {
                console.warn(
                    `[Stripe Webhook] Bill changed for order ${tableOrderId}: ` +
                    `expected ${tableOrder.expectedTotal}, current ${tableOrder.total}`
                );
                tableOrder.billChangedAfterPayment = true;
                await tableOrder.save();
                return response.status(200).json({ received: true });
            }

            // MongoDB transaction: create OrderModel records + mark paid
            const dbSession = await mongoose.startSession();
            try {
                await dbSession.withTransaction(async () => {
                    // tableOrder IS the canonical order — không tạo bản sao OrderModel
                    tableOrder.status = 'paid';
                    tableOrder.paymentStatus = 'paid';
                    tableOrder.paymentMethod = 'online';
                    tableOrder.paidAt = new Date();
                    await tableOrder.save({ session: dbSession });
                });

                console.log(`[Stripe Webhook] ✅ Order ${tableOrderId} marked paid (table ${tableOrder.tableNumber})`);

                // AC 11 – Notify Cashier Dashboard via Socket.io
                const io = request.app.get('io');
                if (io) {
                    io.emit('cashier:order_paid_online', {
                        tableOrderId: tableOrder._id.toString(),
                        tableNumber: tableOrder.tableNumber,
                        total: tableOrder.total,
                        paidAt: tableOrder.paidAt
                    });
                }
            } finally {
                await dbSession.endSession();
            }
        } catch (error) {
            console.error('[Stripe Webhook] Error processing payment:', error);
            return response.status(500).json({ error: 'Internal server error' });
        }
    }

    return response.status(200).json({ received: true });
}

// ─────────────────────────────────────────────────────────────────
// US26 – Verify Stripe Session (for success page)
// ─────────────────────────────────────────────────────────────────
export async function verifyStripeSession(request, response) {
    try {
        const { session_id } = request.query;

        if (!session_id) {
            return response.status(400).json({
                message: 'session_id là bắt buộc',
                error: true, success: false
            });
        }

        // Look up by stripeSessionId
        const tableOrder = await TableOrderModel.findOne({ stripeSessionId: session_id });

        if (!tableOrder) {
            // Fallback: try fetching from Stripe API
            try {
                const stripeSession = await Stripe.checkout.sessions.retrieve(session_id);
                const { payment_status } = stripeSession;
                return response.status(200).json({
                    message: payment_status === 'paid' ? 'Đang xử lý...' : 'Chưa thanh toán',
                    error: false,
                    success: true,
                    data: { status: payment_status === 'paid' ? 'processing' : 'pending' }
                });
            } catch {
                return response.status(404).json({
                    message: 'Không tìm thấy phiên thanh toán',
                    error: true, success: false
                });
            }
        }

        // AC 9.1 – bill changed
        if (tableOrder.billChangedAfterPayment) {
            return response.status(200).json({
                message: 'Đơn hàng đã thay đổi. Vui lòng thanh toán lại.',
                error: false,
                success: true,
                data: { status: 'bill_changed', tableNumber: tableOrder.tableNumber }
            });
        }

        // AC 12 – success
        if (tableOrder.status === 'paid') {
            return response.status(200).json({
                message: 'Thanh toán thành công. Cảm ơn quý khách!',
                error: false,
                success: true,
                data: {
                    status: 'paid',
                    tableNumber: tableOrder.tableNumber,
                    total: tableOrder.total,
                    paidAt: tableOrder.paidAt,
                    items: tableOrder.items
                }
            });
        }

        // Still pending (webhook not yet received)
        return response.status(200).json({
            message: 'Đang chờ xác nhận thanh toán...',
            error: false,
            success: true,
            data: { status: 'pending', tableNumber: tableOrder.tableNumber }
        });

    } catch (error) {
        console.error('[verifyStripeSession] Error:', error);
        return response.status(500).json({
            message: error.message || 'Lỗi server',
            error: true, success: false
        });
    }
}
