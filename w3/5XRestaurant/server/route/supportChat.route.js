import { Router } from "express";
import {
    getMyConversation,
    getConversations,
    getConversationById,
    closeConversation,
    markAsRead,
} from "../controllers/supportChat.controller.js";
import auth from "../middleware/auth.js";

const supportChatRouter = Router();

// Customer: lấy conversation hiện tại của mình (có lịch sử + TTL info)
supportChatRouter.get("/my-conversation", auth, getMyConversation);

// Admin/Waiter: quản lý conversations
supportChatRouter.get("/conversations", auth, getConversations);
supportChatRouter.get("/conversations/:id", auth, getConversationById);
supportChatRouter.patch("/conversations/:id/close", auth, closeConversation);
supportChatRouter.patch("/conversations/:id/read", auth, markAsRead);

export default supportChatRouter;