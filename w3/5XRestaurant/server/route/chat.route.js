import { Router } from "express";
import { chatController } from "../controllers/chat.controller.js";

const chatRouter = Router();

// Public route — không cần đăng nhập
chatRouter.post("/message", chatController);

export default chatRouter;