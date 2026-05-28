import express from "express";
import { checkinCustomer, getCustomerById, getAllCustomers, updatePoints } from "../controllers/customer.controller.js";
import auth from "../middleware/auth.js";

const router = express.Router();

// Public – khách quét QR checkin
router.post("/checkin", checkinCustomer);
router.get("/:id", getCustomerById);

// Admin only
router.get("/", auth, getAllCustomers);
router.patch("/:id/points", auth, updatePoints);

export default router;
