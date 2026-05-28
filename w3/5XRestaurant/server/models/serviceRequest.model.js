import mongoose from 'mongoose';

const serviceRequestSchema = new mongoose.Schema({
    tableId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'table',
        required: true
    },
    tableOrderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'tableOrder',
        default: null
    },
    tableNumber: {
        type: String,
        required: true
    },
    // Loại yêu cầu: gọi phục vụ huỷ món, yêu cầu thêm, hỗ trợ chung...
    type: {
        type: String,
        enum: ['cancel_item', 'assistance', 'other'],
        default: 'cancel_item'
    },
    note: {
        type: String,
        default: ''
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'done', 'rejected'],
        default: 'pending'
    },
    handledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',  // ✅ khớp với mongoose.model("user", ...)
        default: null
    },
    handledAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

serviceRequestSchema.index({ tableId: 1, status: 1 });
serviceRequestSchema.index({ createdAt: -1 });

const ServiceRequestModel = mongoose.model('serviceRequest', serviceRequestSchema);

export default ServiceRequestModel;
