import UserModel from "../models/user.model.js";
import TableModel from "../models/table.model.js";
import TableOrderModel from "../models/tableOrder.model.js";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import { verifyTableToken, generateTableQRCode } from "../utils/qrCodeGenerator.js";

/**
 * Create a table account for a specific table
 * This is called automatically when a table is created
 */
export async function createTableAccountController(request, response) {
    try {
        const { tableId, tableNumber } = request.body;

        if (!tableId || !tableNumber) {
            return response.status(400).json({
                message: "Vui lòng cung cấp tableId và tableNumber",
                error: true,
                success: false
            });
        }

        // Check if table exists
        const table = await TableModel.findById(tableId);
        if (!table) {
            return response.status(404).json({
                message: "Không tìm thấy bàn",
                error: true,
                success: false
            });
        }

        // Check if table account already exists
        if (table.tableAccountId) {
            return response.status(400).json({
                message: "Bàn này đã có tài khoản",
                error: true,
                success: false
            });
        }

        // Create table account
        const tableEmail = `table_${tableNumber.toLowerCase()}@internal.restaurant.com`;
        const randomPassword = Math.random().toString(36).slice(-12); // Random password
        const salt = await bcryptjs.genSalt(10);
        const hashPassword = await bcryptjs.hash(randomPassword, salt);

        const tableUser = new UserModel({
            name: `Bàn ${tableNumber}`,
            email: tableEmail,
            password: hashPassword,
            role: "TABLE",
            linkedTableId: tableId,
            verify_email: true, // Auto-verify table accounts
            status: "Active"
        });

        const savedUser = await tableUser.save();

        // Update table with account ID
        table.tableAccountId = savedUser._id;
        await table.save();

        return response.status(201).json({
            message: "Tạo tài khoản bàn thành công",
            data: {
                userId: savedUser._id,
                email: tableEmail,
                tableNumber
            },
            error: false,
            success: true
        });

    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        });
    }
}

/**
 * Login via QR code token
 * Client scans QR code and sends the token to this endpoint
 */
export async function loginViaQRController(request, response) {
    try {
        const { token } = request.body;

        if (!token) {
            return response.status(400).json({
                message: "Vui lòng cung cấp token",
                error: true,
                success: false
            });
        }

        // Verify token
        let decoded;
        try {
            decoded = verifyTableToken(token);
        } catch (error) {
            return response.status(401).json({
                message: "Mã QR không hợp lệ.",
                error: true,
                success: false
            });
        }

        // Get table
        const table = await TableModel.findById(decoded.tableId).populate('tableAccountId');
        if (!table) {
            return response.status(404).json({
                message: "Không tìm thấy bàn",
                error: true,
                success: false
            });
        }

        // Check if table has account
        if (!table.tableAccountId) {
            return response.status(400).json({
                message: "Bàn chưa có tài khoản",
                error: true,
                success: false
            });
        }

        const tableUser = table.tableAccountId;

        // Generate access token for table user
        const accessToken = jwt.sign(
            {
                _id: tableUser._id,
                role: tableUser.role,
                tableId: table._id,
                tableNumber: table.tableNumber
            },
            process.env.SECRET_KEY_ACCESS_TOKEN,
            { expiresIn: '24h' } // Table sessions expire after 24 hours
        );

        // Generate refresh token
        const refreshToken = jwt.sign(
            {
                _id: tableUser._id,
                role: tableUser.role
            },
            process.env.SECRET_KEY_REFRESH_TOKEN,
            { expiresIn: '7d' }
        );

        // Update refresh token in database
        await UserModel.findByIdAndUpdate(tableUser._id, {
            refresh_token: refreshToken
        });

        // Set cookie
        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Lax',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        };

        response.cookie('accessToken', accessToken, cookieOptions);
        response.cookie('refreshToken', refreshToken, cookieOptions);

        // Check if table already has an active ordering session (AC 5.1 / 5.2)
        const activeOrder = await TableOrderModel.findOne({
            tableId: table._id,
            status: 'active'
        });
        const hasActiveSession = !!activeOrder;
        const activeOrderItemCount = activeOrder ? activeOrder.items.length : 0;

        return response.status(200).json({
            message: hasActiveSession
                ? "Bàn đang có phiên gọi món. Tham gia phiên hiện tại."
                : "Đăng nhập thành công. Khởi tạo phiên gọi món mới.",
            data: {
                accessToken,
                refreshToken,
                user: {
                    _id: tableUser._id,
                    name: tableUser.name,
                    email: tableUser.email,
                    role: tableUser.role,
                    tableId: table._id,
                    tableNumber: table.tableNumber,
                    tableCapacity: table.capacity,
                    tableLocation: table.location
                },
                sessionInfo: {
                    hasActiveSession,
                    activeOrderItemCount
                }
            },
            error: false,
            success: true
        });

    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        });
    }
}

/**
 * Get current table session info
 */
export async function getTableSessionController(request, response) {
    try {
        const userId = request.userId; // From auth middleware

        // Get user and populate table info
        const user = await UserModel.findById(userId).populate('linkedTableId');

        if (!user) {
            return response.status(404).json({
                message: "Không tìm thấy người dùng",
                error: true,
                success: false
            });
        }

        if (user.role !== 'TABLE') {
            return response.status(403).json({
                message: "Chỉ tài khoản bàn mới có session",
                error: true,
                success: false
            });
        }

        const table = user.linkedTableId;

        return response.status(200).json({
            message: "Lấy thông tin session thành công",
            data: {
                userId: user._id,
                userName: user.name,
                tableId: table._id,
                tableNumber: table.tableNumber,
                tableCapacity: table.capacity,
                tableLocation: table.location,
                tableStatus: table.status
            },
            error: false,
            success: true
        });

    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        });
    }
}

/**
 * Logout table session (clear cart)
 */
export async function logoutTableController(request, response) {
    try {
        const userId = request.userId; // From auth middleware

        // Clear refresh token
        await UserModel.findByIdAndUpdate(userId, {
            refresh_token: ""
        });

        // Clear cookies
        response.clearCookie('accessToken');
        response.clearCookie('refreshToken');

        return response.status(200).json({
            message: "Đăng xuất thành công",
            error: false,
            success: true
        });

    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        });
    }
}
