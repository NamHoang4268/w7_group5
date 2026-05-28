import mongoose from "mongoose";
import mongoosePaginate from 'mongoose-paginate-v2';

const voucherSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        uppercase: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        default: ""
    },
    discountType: {
        type: String,
        enum: ['percentage', 'fixed'],
        required: true
    },

    discountValue: {
        type: Number,
        required: true,
        min: 0
    },
    minOrderValue: {
        type: Number,
        default: 0
    },
    maxDiscount: {
        type: Number,
        default: null
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    usageLimit: {
        type: Number,
        default: null
    },
    usageCount: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isFirstTimeCustomer: {
        type: Boolean,
        default: false
    },
    applyForAllProducts: {
        type: Boolean,
        default: true
    },
    products: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'product'
    }],
    categories: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'category'
    }],
    usersUsed: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user'
    }],
    // createdBy: {
    //     type: mongoose.Schema.Types.ObjectId,
    //     ref: 'user',
    //     required: true
    // }
}, {
    timestamps: true
});

// Chỉ giữ index compound cho isActive và endDate
voucherSchema.index({ code: 1, isActive: 1, startDate: 1, endDate: 1 });
voucherSchema.index({ products: 1 });
voucherSchema.index({ categories: 1 });

// Áp dụng plugin trước khi tạo model
voucherSchema.plugin(mongoosePaginate);

const VoucherModel = mongoose.model('voucher', voucherSchema);

export default VoucherModel;