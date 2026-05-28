import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
    {
        amount: {
            type: Number,
            required: [true, "Provide payment amount"],
            min: 0
        },
        currency: {
            type: String,
            enum: ['VND', 'USD'],
            default: 'VND'
        },
        paymentMethod: {
            type: String,
            enum: ['cash', 'stripe'],
            required: [true, "Provide payment method"]
        },
        paymentStatus: {
            type: String,
            enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
            default: 'pending'
        },
        // userId — optional vì guest order không có tài khoản
        userId: {
            type: mongoose.Schema.ObjectId,
            ref: "user",
            default: null,
            sparse: true
        },
        tableOrderId: {
            type: mongoose.Schema.ObjectId,
            ref: "tableOrder",
            default: null
        },
        // Stripe integration
        stripePaymentIntentId: {
            type: String,
            default: null,
            sparse: true
        },
        stripeSessionId: {
            type: String,
            default: null,
            sparse: true
        },
        stripeCustomerId: {
            type: String,
            default: null
        },
        // Processing details (dùng trong handleCheckoutSessionCompleted)
        processingDetails: {
            processor: {
                type: String,
                enum: ['stripe', 'local'],
                default: 'local'
            },
            processedAt: Date,
        },
        // Receipt
        receiptNumber: {
            type: String,
            unique: true,
            sparse: true
        },
        // Refund
        refundStatus: {
            type: String,
            enum: ['none', 'partial', 'full'],
            default: 'none'
        },
        refundAmount: {
            type: Number,
            default: 0,
            min: 0
        },
        refundReason: {
            type: String,
            default: null
        },
        refundDetails: {
            stripeRefundId: String,
            refundedAt: Date,
            refundRequestedAt: Date,
            refundRequestedBy: {
                type: mongoose.Schema.ObjectId,
                ref: "user"
            },
            refundApprovedBy: {
                type: mongoose.Schema.ObjectId,
                ref: "user"
            },
            refundApprovedAt: Date,
        },
        // Payment failure
        failureReason: String,
        failureCode: String,
        retryCount: {
            type: Number,
            default: 0,
            min: 0
        },
        lastRetryAt: Date,
        notes: String,
    },
    { timestamps: true }
);

// Indexes
paymentSchema.index({ userId: 1, createdAt: -1 });
paymentSchema.index({ paymentStatus: 1 });
paymentSchema.index({ stripePaymentIntentId: 1 });
paymentSchema.index({ tableOrderId: 1 });
paymentSchema.index({ createdAt: -1 });

// Instance methods (dùng trong payment.controller.js)
paymentSchema.methods.generateReceiptNumber = function() {
    if (this.receiptNumber) return this.receiptNumber;
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    this.receiptNumber = `REC-${timestamp}-${random}`;
    return this.receiptNumber;
};

paymentSchema.methods.processRefund = async function(amount, reason, requestedBy) {
    if (amount > this.amount) {
        throw new Error('Refund amount exceeds payment amount');
    }
    const isPartial = amount < this.amount;
    this.refundStatus = isPartial ? 'partial' : 'full';
    this.refundAmount = amount;
    this.refundReason = reason;
    if (!this.refundDetails) this.refundDetails = {};
    this.refundDetails.refundRequestedAt = new Date();
    this.refundDetails.refundRequestedBy = requestedBy;
    return this.save();
};

paymentSchema.methods.completeRefund = async function(stripeRefundId) {
    this.paymentStatus = 'refunded';
    if (!this.refundDetails) this.refundDetails = {};
    this.refundDetails.stripeRefundId = stripeRefundId;
    this.refundDetails.refundedAt = new Date();
    return this.save();
};

const PaymentModel = mongoose.model("Payment", paymentSchema);
export default PaymentModel;
