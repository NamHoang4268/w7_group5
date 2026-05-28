import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'product',
        required: true
    },
    name: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    note: {
        type: String,
        default: ''
    },
    // Kitchen Workflow
    kitchenStatus: {
        type: String,
        enum: ['pending', 'cooking', 'ready', 'served'],
        default: 'pending'
    },
    sentAt: {
        type: Date,
        default: null
    },
    cookingStartAt: {
        type: Date,
        default: null
    },
    readyAt: {
        type: Date,
        default: null
    },
    servedAt: {
        type: Date,
        default: null
    },
    addedAt: {
        type: Date,
        default: Date.now
    }
});

const tableOrderSchema = new mongoose.Schema({
    tableId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'table',
        required: true
    },
    tableNumber: {
        type: String,
        required: true
    },
    // Khách hàng (tùy chọn – guest hoặc Customer profile)
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        default: null
    },
    items: [orderItemSchema],
    subTotal: {
        type: Number,
        required: true,
        default: 0
    },
    discount: {
        type: Number,
        default: 0
    },
    voucherId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'voucher',
        default: null
    },
    total: {
        type: Number,
        required: true,
        default: 0
    },
    status: {
        type: String,
        enum: ['active', 'pending_payment', 'paid', 'cancelled', 'Chờ xử lý', 'Đang chuẩn bị', 'Đã phục vụ', 'Đang chờ thanh toán', 'Chờ thanh toán', 'Đã hủy'],
        default: 'active'
    },
    sentToKitchenAt: {
        type: Date,
        default: null
    },
    paymentRequest: {
        type: String,
        enum: ['at_counter', 'online', null],
        default: null
    },
    checkedOutAt: {
        type: Date,
        default: null
    },
    paidAt: {
        type: Date,
        default: null
    },
    paymentMethod: {
        type: String,
        enum: ['cash', 'online', null],
        default: null
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'refunded', 'Chờ xử lý', 'Đang chuẩn bị', 'Đã phục vụ', 'Đang chờ thanh toán', 'Chờ thanh toán', 'Đã hủy'],
        default: 'pending'
    },
    paymentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Payment',
        default: null
    },
    // Stripe online payment
    stripeSessionId: {
        type: String,
        default: null
    },
    expectedTotal: {
        type: Number,
        default: null
    },
    billChangedAfterPayment: {
        type: Boolean,
        default: false
    },
}, {
    timestamps: true
});

// Indexes
tableOrderSchema.index({ tableId: 1, status: 1 });
tableOrderSchema.index({ tableNumber: 1, status: 1 });
tableOrderSchema.index({ customerId: 1 });
tableOrderSchema.index({ paymentStatus: 1 });
tableOrderSchema.index({ createdAt: -1 });

const TableOrderModel = mongoose.model('tableOrder', tableOrderSchema);

export default TableOrderModel;
