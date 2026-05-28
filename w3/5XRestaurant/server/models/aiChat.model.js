import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
    {
        role: {
            type: String,
            enum: ['user', 'ai'],
            required: true
        },
        content: {
            type: String,
            required: true
        },
        relatedProducts: [
            {
                type: mongoose.Schema.ObjectId,
                ref: "product"
            }
        ],
    },
    { timestamps: true }
);

const aiChatSchema = new mongoose.Schema(
    {
        // userId — optional, guest tại bàn có thể không có tài khoản
        userId: {
            type: mongoose.Schema.ObjectId,
            ref: "user",
            default: null,
            sparse: true
        },
        sessionId: {
            type: String,
            unique: true,
            required: true
        },
        sessionStartedAt: {
            type: Date,
            default: Date.now
        },
        sessionEndedAt: {
            type: Date,
            default: null
        },
        language: {
            type: String,
            enum: ['vi', 'en'],
            default: 'vi'
        },
        currentOrderId: {
            type: mongoose.Schema.ObjectId,
            ref: "tableOrder",
            default: null
        },
        messages: [messageSchema],
        totalTurns: {
            type: Number,
            default: 0
        },
        // User feedback
        userRating: {
            type: Number,
            min: 1,
            max: 5,
            default: null
        },
        wasHelpful: {
            type: Boolean,
            default: null
        },
        // Escalation sang Support Chat
        escalatedToStaff: {
            type: Boolean,
            default: false
        },
        escalatedAt: Date,
    },
    { timestamps: true }
);

aiChatSchema.index({ userId: 1, createdAt: -1 });
aiChatSchema.index({ sessionId: 1 });
aiChatSchema.index({ escalatedToStaff: 1 });

const AiChatModel = mongoose.model("AiChat", aiChatSchema);
export default AiChatModel;
