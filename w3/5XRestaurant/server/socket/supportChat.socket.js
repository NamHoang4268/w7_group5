import SupportChat from "../models/supportChat.model.js";
import { v4 as uuidv4 } from "uuid";

// waiter socket ids để broadcast notification
const waiterSockets = new Set();

export function registerSupportChatSocket(io) {
    io.on("connection", (socket) => {
        console.log(`[Socket] Connected: ${socket.id}`);

        // ─── CUSTOMER ────────────────────────────────────────────────────────
        // Khách hàng tạo request hỗ trợ từ waiter
        socket.on("customer:requestWaiter", async ({ customerName, customerId, tableNumber }) => {
            try {
                console.log(`[Socket] Received customer:requestWaiter from ${socket.id}:`, { customerName, customerId, tableNumber });
                
                const conversationId = uuidv4();
                
                // Tạo conversation mới với status "waiting"
                const newChat = await SupportChat.create({
                    conversationId,
                    customerName: customerName || "Khách vãng lai",
                    customerId: customerId || null,
                    tableNumber: tableNumber || null,
                    requestStatus: "waiting",
                    messages: [],
                });

                socket.join(conversationId);
                socket.conversationId = conversationId;
                socket.customerName = customerName;

                console.log(`[Socket] Created conversation: ${conversationId}, joining room: ${conversationId}`);

                // Gửi lại conversationId cho customer
                socket.emit("conversation:created", {
                    conversationId,
                    requestStatus: "waiting",
                    message: "Đang chờ nhân viên phục vụ...",
                });

                console.log(`[Socket] Broadcasting to waiter_room, current waiters: ${waiterSockets.size}`);
                
                // Broadcast notification đến TẤT CẢ waiter (không gửi nội dung chat)
                io.to("waiter_room").emit("waiter:newRequest", {
                    conversationId,
                    customerName: customerName || "Khách vãng lai",
                    tableNumber: tableNumber || "N/A",
                    createdAt: newChat.createdAt,
                });

                console.log(`[Socket] New waiter request: ${conversationId} from ${customerName}`);
            } catch (err) {
                console.error("[Socket] customer:requestWaiter error:", err);
                socket.emit("error", { message: "Không thể tạo yêu cầu hỗ trợ" });
            }
        });

        // Khách hàng join lại conversation đã có
        socket.on("customer:join", async ({ conversationId }) => {
            try {
                if (!conversationId) {
                    socket.emit("error", { message: "Thiếu conversationId" });
                    return;
                }

                socket.join(conversationId);
                socket.conversationId = conversationId;

                // Gửi lại thông tin conversation
                const chat = await SupportChat.findOne({ conversationId });
                if (!chat) {
                    socket.emit("error", { message: "Không tìm thấy cuộc hội thoại" });
                    return;
                }

                socket.emit("conversation:joined", {
                    conversationId,
                    messages: chat.messages || [],
                    requestStatus: chat.requestStatus,
                    status: chat.status,
                    assignedWaiterName: chat.assignedWaiterName,
                });

                // Reset unread count
                await SupportChat.findOneAndUpdate(
                    { conversationId },
                    { unreadByCustomer: 0 }
                );
            } catch (err) {
                console.error("[Socket] customer:join error:", err);
                socket.emit("error", { message: "Không thể kết nối hỗ trợ" });
            }
        });

        // Khách hàng gửi tin nhắn
        socket.on("customer:message", async ({ conversationId, text, senderName }) => {
            try {
                if (!text?.trim() || !conversationId) return;

                const newMsg = {
                    sender: socket.id,
                    senderName: senderName || "Khách",
                    senderRole: "customer",
                    text: text.trim(),
                    createdAt: new Date(),
                };

                const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
                const chat = await SupportChat.findOneAndUpdate(
                    { conversationId, status: "open" },
                    {
                        $push: { messages: newMsg },
                        $inc: { unreadByWaiter: 1 },
                        lastMessage: text.trim(),
                        lastMessageAt: new Date(),
                        expiresAt: sevenDaysFromNow, // reset TTL mỗi khi có tin nhắn
                    },
                    { new: true }
                );

                if (!chat) {
                    socket.emit("error", { message: "Hội thoại đã đóng hoặc không tồn tại" });
                    return;
                }

                const savedMsg = chat.messages[chat.messages.length - 1];
                
                // Thêm conversationId vào message để client có thể match
                const msgWithConversationId = {
                    ...savedMsg.toObject(),
                    conversationId: conversationId
                };
                
                // Chỉ gửi cho room này (customer + assigned waiter)
                io.to(conversationId).emit("message:new", msgWithConversationId);
                
                // Nếu có waiter assigned, notify riêng waiter đó
                if (chat.assignedWaiterId) {
                    io.to("waiter_room").emit("waiter:messageNotification", {
                        conversationId,
                        customerName: chat.customerName,
                        lastMessage: text.trim(),
                        unreadByWaiter: chat.unreadByWaiter,
                        assignedWaiterId: chat.assignedWaiterId,
                    });
                }
            } catch (err) {
                console.error("[Socket] customer:message error:", err);
            }
        });

        // ─── WAITER ──────────────────────────────────────────────────────────
        // Waiter join room quản lý (nhận notifications)
        socket.on("waiter:join", ({ waiterId, waiterName } = {}) => {
            console.log(`[Socket] Waiter joining: ${socket.id}, waiterId: ${waiterId}, waiterName: ${waiterName}`);
            socket.join("waiter_room");
            waiterSockets.add(socket.id);
            socket.isWaiter = true;
            socket.waiterId = waiterId;
            socket.waiterName = waiterName || "Waiter";
            console.log(`[Socket] Waiter joined waiter_room: ${socket.id} (${waiterName}), total waiters: ${waiterSockets.size}`);
            socket.emit("waiter:joined", { message: "Đã kết nối waiter panel" });
        });

        // Waiter accept request (QUAN TRỌNG: chỉ người đầu tiên accept được assign)
        socket.on("waiter:acceptRequest", async ({ conversationId, waiterId, waiterName }) => {
            try {
                if (!conversationId || !waiterId) {
                    socket.emit("error", { message: "Thiếu thông tin" });
                    return;
                }

                // Atomic update: chỉ update nếu chưa có waiter assigned
                const chat = await SupportChat.findOneAndUpdate(
                    { 
                        conversationId, 
                        requestStatus: "waiting", // Chỉ accept request đang waiting
                        assignedWaiterId: null // Chưa có waiter nào
                    },
                    {
                        assignedWaiterId: waiterId,
                        assignedWaiterName: waiterName || "Waiter",
                        assignedAt: new Date(),
                        requestStatus: "assigned",
                    },
                    { new: true }
                );

                if (!chat) {
                    // Request đã được accept bởi waiter khác hoặc không tồn tại
                    socket.emit("waiter:acceptFailed", {
                        conversationId,
                        message: "Yêu cầu đã được xử lý bởi nhân viên khác",
                    });
                    return;
                }

                // Join vào room để chat 1-1
                socket.join(conversationId);
                socket.currentConversationId = conversationId;

                // Notify waiter đã accept thành công
                socket.emit("waiter:acceptSuccess", {
                    conversationId,
                    customerName: chat.customerName,
                    tableNumber: chat.tableNumber,
                    messages: chat.messages,
                });

                // Notify customer có waiter đã tham gia
                io.to(conversationId).emit("waiter:joined", {
                    waiterName: waiterName || "Waiter",
                    message: `${waiterName || "Nhân viên"} đã tham gia cuộc trò chuyện`,
                });

                // Broadcast cho các waiter khác: request đã được accept
                io.to("waiter_room").emit("waiter:requestAccepted", {
                    conversationId,
                    acceptedBy: waiterName,
                });

                console.log(`[Socket] Request ${conversationId} accepted by ${waiterName}`);
            } catch (err) {
                console.error("[Socket] waiter:acceptRequest error:", err);
                socket.emit("error", { message: "Không thể nhận yêu cầu" });
            }
        });

        // Waiter join vào conversation đã assigned
        socket.on("waiter:joinConversation", async ({ conversationId, waiterId }) => {
            try {
                const chat = await SupportChat.findOne({ conversationId });
                
                if (!chat) {
                    socket.emit("error", { message: "Không tìm thấy cuộc hội thoại" });
                    return;
                }

                // Kiểm tra waiter có được assign không
                if (chat.assignedWaiterId !== waiterId) {
                    socket.emit("error", { message: "Bạn không được phân công cho cuộc hội thoại này" });
                    return;
                }

                socket.join(conversationId);
                socket.currentConversationId = conversationId;

                // Reset unread count
                await SupportChat.findOneAndUpdate(
                    { conversationId },
                    { unreadByWaiter: 0 }
                );

                socket.emit("waiter:conversationJoined", {
                    conversationId,
                    messages: chat.messages,
                    customerName: chat.customerName,
                    tableNumber: chat.tableNumber,
                });
            } catch (err) {
                console.error("[Socket] waiter:joinConversation error:", err);
            }
        });

        // Waiter gửi tin nhắn
        socket.on("waiter:message", async ({ conversationId, text, waiterName, waiterId }) => {
            try {
                if (!text?.trim() || !conversationId) return;

                // Verify waiter is assigned to this conversation
                const chat = await SupportChat.findOne({ conversationId });
                if (!chat || chat.assignedWaiterId !== waiterId) {
                    socket.emit("error", { message: "Bạn không có quyền gửi tin nhắn trong cuộc hội thoại này" });
                    return;
                }

                const newMsg = {
                    sender: socket.id,
                    senderName: waiterName || "Waiter",
                    senderRole: "waiter",
                    text: text.trim(),
                    createdAt: new Date(),
                };

                const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
                const updatedChat = await SupportChat.findOneAndUpdate(
                    { conversationId, status: "open" },
                    {
                        $push: { messages: newMsg },
                        $inc: { unreadByCustomer: 1 },
                        lastMessage: text.trim(),
                        lastMessageAt: new Date(),
                        requestStatus: "active",
                        expiresAt: sevenDaysFromNow, // reset TTL mỗi khi có tin nhắn
                    },
                    { new: true }
                );

                if (!updatedChat) {
                    socket.emit("error", { message: "Hội thoại đã đóng hoặc không tồn tại" });
                    return;
                }

                const savedMsg = updatedChat.messages[updatedChat.messages.length - 1];
                
                // Thêm conversationId vào message để client có thể match
                const msgWithConversationId = {
                    ...savedMsg.toObject(),
                    conversationId: conversationId
                };
                
                // Chỉ gửi cho room này (customer + waiter)
                io.to(conversationId).emit("message:new", msgWithConversationId);
            } catch (err) {
                console.error("[Socket] waiter:message error:", err);
            }
        });

        // Waiter đóng conversation
        socket.on("waiter:closeConversation", async ({ conversationId, waiterId }) => {
            try {
                const chat = await SupportChat.findOne({ conversationId });
                
                if (!chat || chat.assignedWaiterId !== waiterId) {
                    socket.emit("error", { message: "Bạn không có quyền đóng cuộc hội thoại này" });
                    return;
                }

                const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
                await SupportChat.findOneAndUpdate(
                    { conversationId },
                    { 
                        status: "closed",
                        requestStatus: "closed",
                        expiresAt: threeDaysFromNow, // Đóng rồi: còn 3 ngày để xem lại
                    }
                );
                
                io.to(conversationId).emit("conversation:closed", {
                    message: "Cuộc hội thoại đã được đóng",
                });
                
                console.log(`[Socket] Conversation closed: ${conversationId} by waiter ${waiterId}`);
            } catch (err) {
                console.error("[Socket] waiter:closeConversation error:", err);
            }
        });

        // ─── ADMIN (giữ lại cho quản lý) ─────────────────────────────────────
        socket.on("admin:join", ({ adminName } = {}) => {
            socket.join("admin_room");
            socket.isAdmin = true;
            socket.adminName = adminName || "Admin";
            console.log(`[Socket] Admin joined: ${socket.id}`);
            socket.emit("admin:joined", { message: "Đã kết nối admin panel" });
        });

        // ─── DISCONNECT ──────────────────────────────────────────────────────
        socket.on("disconnect", () => {
            waiterSockets.delete(socket.id);
            console.log(`[Socket] Disconnected: ${socket.id}`);
        });
    });
}