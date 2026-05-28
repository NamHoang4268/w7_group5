import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema({
    customerName: {
        type: String,
        required: [true, "Vui lòng nhập tên khách hàng"],
        trim: true
    },
    phone: {
        type: String,
        required: [true, "Vui lòng nhập số điện thoại"],
        trim: true
    },
    email: {
        type: String,
        trim: true,
        lowercase: true
    },
    tableId: {
        type: mongoose.Schema.ObjectId,
        ref: 'table',
        required: [true, "Vui lòng chọn bàn"]
    },
    numberOfGuests: {
        type: Number,
        required: [true, "Vui lòng nhập số người"],
        min: [1, "Số người phải lớn hơn 0"]
    },
    bookingDate: {
        type: Date,
        required: [true, "Vui lòng chọn ngày đặt bàn"]
    },
    bookingTime: {
        type: String,
        required: [true, "Vui lòng chọn giờ đặt bàn"]
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'cancelled', 'completed'],
        default: 'pending'
    },
    specialRequests: {
        type: String,
        default: "",
        trim: true
    },
    cancelledBy: {
        type: String,
        enum: ['customer', 'admin', 'system'],
        default: null
    },
    cancelledAt: {
        type: Date,
        default: null
    },
    userId: {
        type: mongoose.Schema.ObjectId,
        ref: 'user',
        default: null
    },
    createdBy: {
        type: String,
        enum: ['customer', 'admin'],
        default: 'customer'
    },
    // Pre-order tích hợp: nếu khách đặt món trước khi đến
    preOrderId: {
        type: mongoose.Schema.ObjectId,
        ref: 'tableOrder',  // ✅ model chính của nhà hàng
        default: null
    },
    hasPreOrder: {
        type: Boolean,
        default: false
    },
    preOrderTotal: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Indexes
bookingSchema.index({ bookingDate: 1, bookingTime: 1 });
bookingSchema.index({ tableId: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ userId: 1 });   // thêm index cho user query
bookingSchema.index({ phone: 1 });
bookingSchema.index({ email: 1 });

const BookingModel = mongoose.model("booking", bookingSchema);

export default BookingModel;
