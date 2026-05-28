import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
    {
        sender: { type: String, required: true }, // userId or guestId
        senderName: { type: String, required: true },
        senderRole: { type: String, enum: ["customer", "waiter", "admin"], required: true },
        text: { type: String, required: true },
    },
    { timestamps: true }
);

const supportChatSchema = new mongoose.Schema(
    {
        conversationId: { type: String, unique: true, required: true },
        customerName: { type: String, required: true },
        customerId: { type: String }, // null if guest
        tableNumber: { type: String },
        
        // Waiter assignment
        assignedWaiterId: { type: String, default: null },
        assignedWaiterName: { type: String, default: null },
        assignedAt: { type: Date, default: null },
        
        // Request status
        requestStatus: { 
            type: String, 
            enum: ["waiting", "assigned", "active", "closed"], 
            default: "waiting" 
        },
        
        messages: [messageSchema],
        status: { type: String, enum: ["open", "closed"], default: "open" },
        unreadByWaiter: { type: Number, default: 0 },
        unreadByCustomer: { type: Number, default: 0 },
        lastMessage: { type: String, default: "" },
        lastMessageAt: { type: Date, default: Date.now },

        // TTL: tự động xóa sau khoảng thời gian chỉ định
        // - Conversation open:   reset +7 ngày mỗi khi có tin nhắn mới
        // - Conversation closed: +3 ngày từ thời điểm đóng
        expiresAt: {
            type: Date,
            default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
    },
    { timestamps: true }
);

// TTL index — MongoDB tự xóa document khi expiresAt đến hạn
supportChatSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Index để query conversation của user nhanh hơn
supportChatSchema.index({ customerId: 1, status: 1, lastMessageAt: -1 });

const SupportChat = mongoose.model("SupportChat", supportChatSchema);
export default SupportChat;