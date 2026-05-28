import SupportChat from "../models/supportChat.model.js";

// ─── Customer: lấy conversation đang mở (hoặc đã đóng còn trong TTL) của mình ──
export async function getMyConversation(req, res) {
    try {
        const customerId = req.userId; // lấy từ auth middleware
        if (!customerId) {
            return res.status(401).json({ success: false, message: "Chưa đăng nhập", error: true });
        }

        // Tìm conversation mới nhất của user (ưu tiên open, sau đó closed trong TTL)
        const chat = await SupportChat.findOne({ customerId })
            .sort({ lastMessageAt: -1 })
            .select("conversationId status requestStatus assignedWaiterName lastMessageAt expiresAt messages");

        if (!chat) {
            return res.json({ success: true, data: null, error: false });
        }

        // Tính số ngày còn lại trước khi xóa
        const daysLeft = Math.ceil((new Date(chat.expiresAt) - Date.now()) / (1000 * 60 * 60 * 24));

        return res.json({
            success: true,
            error: false,
            data: {
                conversationId: chat.conversationId,
                status: chat.status,
                requestStatus: chat.requestStatus,
                assignedWaiterName: chat.assignedWaiterName,
                lastMessageAt: chat.lastMessageAt,
                expiresAt: chat.expiresAt,
                daysLeft: Math.max(0, daysLeft),
                messages: chat.messages,
            },
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message, error: true });
    }
}

// ─── Admin/Waiter: lấy tất cả conversations, mới nhất trước ──────────────────
export async function getConversations(req, res) {
    try {
        const conversations = await SupportChat.find()
            .select("-messages")
            .sort({ lastMessageAt: -1 });
        return res.json({ success: true, data: conversations, error: false });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message, error: true });
    }
}

// ─── Lấy 1 conversation kèm messages ─────────────────────────────────────────
export async function getConversationById(req, res) {
    try {
        const chat = await SupportChat.findOne({ conversationId: req.params.id });
        if (!chat) return res.status(404).json({ success: false, message: "Không tìm thấy", error: true });
        return res.json({ success: true, data: chat, error: false });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message, error: true });
    }
}

// ─── Admin: đóng ticket ───────────────────────────────────────────────────────
export async function closeConversation(req, res) {
    try {
        // Khi đóng: set expiresAt = +3 ngày để khách còn xem lại
        const closedExpiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
        const chat = await SupportChat.findOneAndUpdate(
            { conversationId: req.params.id },
            { status: "closed", requestStatus: "closed", expiresAt: closedExpiresAt },
            { new: true }
        );
        if (!chat) return res.status(404).json({ success: false, message: "Không tìm thấy", error: true });
        return res.json({ success: true, data: chat, error: false });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message, error: true });
    }
}

// ─── Admin: đánh dấu đã đọc ──────────────────────────────────────────────────
export async function markAsRead(req, res) {
    try {
        await SupportChat.findOneAndUpdate(
            { conversationId: req.params.id },
            { unreadByWaiter: 0 }
        );
        return res.json({ success: true, error: false });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message, error: true });
    }
}