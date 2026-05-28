// Add these new controllers to table.controller.js

import { generateTableQRCode } from "../utils/qrCodeGenerator.js";

/**
 * Generate or regenerate QR code for a table
 */
export async function generateQRCodeController(request, response) {
    try {
        const { _id } = request.body;

        if (!_id) {
            return response.status(400).json({
                message: "Vui lòng cung cấp ID bàn",
                error: true,
                success: false
            });
        }

        const table = await TableModel.findById(_id);
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
                message: "Bàn chưa có tài khoản. Vui lòng tạo tài khoản trước.",
                error: true,
                success: false
            });
        }

        // Generate new QR code
        const { token, qrCodeImage } = await generateTableQRCode(
            table._id,
            table.tableNumber
        );

        // Update table
        table.qrCodeToken = token;
        table.qrCode = qrCodeImage;
        await table.save();

        return response.status(200).json({
            message: "Tạo QR code thành công",
            data: {
                qrCode: qrCodeImage,
                tableNumber: table.tableNumber
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
 * Get QR code for a table
 */
export async function getQRCodeController(request, response) {
    try {
        const { id } = request.params;

        const table = await TableModel.findById(id);
        if (!table) {
            return response.status(404).json({
                message: "Không tìm thấy bàn",
                error: true,
                success: false
            });
        }

        if (!table.qrCode) {
            return response.status(404).json({
                message: "Bàn chưa có QR code",
                error: true,
                success: false
            });
        }

        return response.status(200).json({
            message: "Lấy QR code thành công",
            data: {
                qrCode: table.qrCode,
                tableNumber: table.tableNumber,
                tableId: table._id
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
