import mongoose from "mongoose";

const tableSchema = new mongoose.Schema({
    tableNumber: {
        type: String,
        required: [true, "Vui lòng nhập số bàn"],
        unique: true,
        trim: true,
        uppercase: true
    },
    capacity: {
        type: Number,
        required: [true, "Vui lòng nhập sức chứa"],
        min: [1, "Sức chứa phải lớn hơn 0"]
    },
    status: {
        type: String,
        enum: ['available', 'occupied', 'reserved', 'maintenance'],
        default: 'available'
    },
    location: {
        type: String,
        default: "",
        trim: true
    },
    qrCode: {
        type: String,
        default: null
    },
    qrCodeToken: {
        type: String,
        default: null,
    },
    tableAccountId: {
        type: mongoose.Schema.ObjectId,
        ref: "user",
        default: null
    },
    description: {
        type: String,
        default: "",
        trim: true
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Indexes for better query performance
tableSchema.index({ tableNumber: 1 });
tableSchema.index({ status: 1 });
tableSchema.index({ isActive: 1 });
tableSchema.index({ location: 1 });

const TableModel = mongoose.model("table", tableSchema);

export default TableModel;
