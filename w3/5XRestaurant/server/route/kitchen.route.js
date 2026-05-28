import express from "express";
import {
    getKitchenOrders,
    getActiveKitchenItems,
    updateItemKitchenStatus,
    markItemServed,
    getReadyToServeItems,
} from "../controllers/kitchen.controller.js";
import auth from "../middleware/auth.js";

const router = express.Router();

// Bếp & Waiter có thể xem (không cần auth cứng, dùng table session)
router.get("/orders", getKitchenOrders);
router.get("/active", getActiveKitchenItems);
router.get("/waiter", getReadyToServeItems);

// Cập nhật trạng thái
router.patch("/item/:orderId/:itemId/status", updateItemKitchenStatus);
router.patch("/item/:orderId/:itemId/served", markItemServed);

export default router;
