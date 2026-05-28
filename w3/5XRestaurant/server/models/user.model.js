import mongoose from "mongoose";
// NOTE: Không import OrderModel ở đây để tránh circular dependency.
// Hook points → rewards được xử lý trong tableOrder.model.js

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Provide name"],
    },
    email: {
        type: String,
        required: [true, "Provide email"],
        unique: true,
    },
    password: {
        type: String,
        default: null,
    },
    googleId: {
        type: String,
        unique: true,
        sparse: true,
    },
    avatar: {
        type: String,
        default: "",
    },
    mobile: {
        type: String,
        default: null,
    },
    refresh_token: {
        type: String,
        default: "",
    },
    verify_email: {
        type: Boolean,
        default: false,
    },
    last_login_date: {
        type: Date,
        default: "",
    },
    status: {
        type: String,
        enum: ["Active", "Inactive", "Suspended"],
        default: "Active",
    },
    orderHistory: [
        {
            type: mongoose.Schema.ObjectId,
            ref: 'tableOrder'  // ✅ ref đúng model nhà hàng
        }
    ],
    forgot_password_otp: {
        type: String,
        default: null,
    },
    forgot_password_expiry: {
        type: Date,
        default: "",
    },
    role: {
        type: String,
        enum: ["ADMIN", "WAITER", "CHEF", "CASHIER", "CUSTOMER", "TABLE"],
        default: "CUSTOMER",
    },
    // Employee-specific fields
    employeeId: {
        type: String,
        unique: true,
        sparse: true,
    },
    hireDate: {
        type: Date,
    },
    position: {
        type: String,
    },
    employeeStatus: {
        type: String,
        enum: ["active", "inactive", "on_leave"],
        default: "active",
    },
    // Table-specific field
    linkedTableId: {
        type: mongoose.Schema.ObjectId,
        ref: 'table',
        default: null
    },
    // Loyalty / Rewards
    rewardsPoint: {
        type: Number,
        default: 0,
        min: 0,
    },
    tierLevel: {
        type: String,
        enum: ['bronze', 'silver', 'gold', 'platinum'],
        default: 'bronze',
    },
    tierBenefits: {
        pointsMultiplier: {
            type: Number,
            default: 1.0,
            min: 1.0,
        },
    },
}, {
    timestamps: true
})

// NOTE: Hook tích điểm từ đơn hàng đã được chuyển vào tableOrder.model.js
// để tránh circular dependency và đảm bảo single responsibility.

userSchema.index({ tierLevel: 1 });
userSchema.index({ rewardsPoint: -1 });
userSchema.index({ email: 1 });

const UserModel = mongoose.model("user", userSchema)

export default UserModel