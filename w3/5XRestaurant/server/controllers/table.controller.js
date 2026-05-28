import TableModel from "../models/table.model.js";
import UserModel from "../models/user.model.js";
import bcryptjs from "bcryptjs";
import { generateTableQRCode } from "../utils/qrCodeGenerator.js";

// Create new table
export async function createTableController(request, response) {
    try {
        const { tableNumber, capacity, status, location, description } = request.body;

        // Validation
        if (!tableNumber) {
            return response.status(400).json({
                message: "Vui lòng nhập số bàn",
                error: true,
                success: false
            });
        }

        if (!capacity || capacity < 1) {
            return response.status(400).json({
                message: "Sức chứa phải lớn hơn 0",
                error: true,
                success: false
            });
        }

        // Check if table number already exists
        const existingTable = await TableModel.findOne({ tableNumber: tableNumber.toUpperCase() });
        if (existingTable) {
            return response.status(400).json({
                message: "Số bàn đã tồn tại",
                error: true,
                success: false
            });
        }

        // Create new table
        const newTable = new TableModel({
            tableNumber: tableNumber.toUpperCase(),
            capacity,
            status: status || 'available',
            location: location || "",
            description: description || ""
        });

        const savedTable = await newTable.save();

        // Auto-create table account + QR
        let qrWarning = null;
        try {
            const tableEmail = `table_${tableNumber.toLowerCase()}@internal.restaurant.com`;
            const randomPassword = Math.random().toString(36).slice(-12);
            const salt = await bcryptjs.genSalt(10);
            const hashPassword = await bcryptjs.hash(randomPassword, salt);

            const tableUser = new UserModel({
                name: `Bàn ${tableNumber.toUpperCase()}`,
                email: tableEmail,
                password: hashPassword,
                role: "TABLE",
                linkedTableId: savedTable._id,
                verify_email: true,
                status: "Active"
            });

            const savedUser = await tableUser.save();

            // Generate QR code
            const { token, qrCodeImage } = await generateTableQRCode(
                savedTable._id,
                savedTable.tableNumber
            );

            // Update table with account and QR code
            savedTable.tableAccountId = savedUser._id;
            savedTable.qrCodeToken = token;
            savedTable.qrCode = qrCodeImage;
            await savedTable.save();

        } catch (qrError) {
            console.error('[Table] QR generation error:', qrError.message);
            qrWarning = qrError.message;
        }

        return response.status(201).json({
            message: "Tạo bàn thành công",
            data: savedTable,
            error: false,
            success: true,
            ...(qrWarning && { qrWarning: `Tạo bàn OK nhưng QR thất bại: ${qrWarning}` }),
        });

    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        });
    }
}

// Get all tables
export async function getAllTablesController(request, response) {
    try {
        const tables = await TableModel.find().sort({ createdAt: -1 });

        return response.status(200).json({
            message: "Lấy danh sách bàn thành công",
            data: tables,
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

// Get table by ID
export async function getTableByIdController(request, response) {
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

        return response.status(200).json({
            message: "Lấy thông tin bàn thành công",
            data: table,
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

// Update table
export async function updateTableController(request, response) {
    try {
        const { _id, tableNumber, capacity, status, location, description } = request.body;

        if (!_id) {
            return response.status(400).json({
                message: "Vui lòng cung cấp ID bàn",
                error: true,
                success: false
            });
        }

        // Check if table exists
        const table = await TableModel.findById(_id);
        if (!table) {
            return response.status(404).json({
                message: "Không tìm thấy bàn",
                error: true,
                success: false
            });
        }

        // Check if new table number already exists (if changing)
        if (tableNumber && tableNumber.toUpperCase() !== table.tableNumber) {
            const existingTable = await TableModel.findOne({
                tableNumber: tableNumber.toUpperCase(),
                _id: { $ne: _id }
            });

            if (existingTable) {
                return response.status(400).json({
                    message: "Số bàn đã tồn tại",
                    error: true,
                    success: false
                });
            }
        }

        // Update fields
        const updateData = {};
        if (tableNumber) updateData.tableNumber = tableNumber.toUpperCase();
        if (capacity) updateData.capacity = capacity;
        if (status) updateData.status = status;
        if (location !== undefined) updateData.location = location;
        if (description !== undefined) updateData.description = description;

        const updatedTable = await TableModel.findByIdAndUpdate(
            _id,
            updateData,
            { new: true, runValidators: true }
        );

        return response.status(200).json({
            message: "Cập nhật bàn thành công",
            data: updatedTable,
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

// Delete table (hard delete)
export async function deleteTableController(request, response) {
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

        // Delete table account if exists
        if (table.tableAccountId) {
            try {
                await UserModel.findByIdAndDelete(table.tableAccountId);
                console.log(`Deleted table account: ${table.tableAccountId}`);
            } catch (error) {
                console.error('Error deleting table account:', error);
                // Continue even if account deletion fails
            }
        }

        // Hard delete - xóa hẳn khỏi database
        await TableModel.findByIdAndDelete(_id);

        return response.status(200).json({
            message: "Xóa bàn thành công",
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

// Update table status
export async function updateTableStatusController(request, response) {
    try {
        const { _id, status } = request.body;

        if (!_id || !status) {
            return response.status(400).json({
                message: "Vui lòng cung cấp ID bàn và trạng thái",
                error: true,
                success: false
            });
        }

        const validStatuses = ['available', 'occupied', 'reserved', 'maintenance'];
        if (!validStatuses.includes(status)) {
            return response.status(400).json({
                message: "Trạng thái không hợp lệ",
                error: true,
                success: false
            });
        }

        const updatedTable = await TableModel.findByIdAndUpdate(
            _id,
            { status },
            { new: true }
        );

        if (!updatedTable) {
            return response.status(404).json({
                message: "Không tìm thấy bàn",
                error: true,
                success: false
            });
        }

        return response.status(200).json({
            message: "Cập nhật trạng thái bàn thành công",
            data: updatedTable,
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

// Get available tables
export async function getAvailableTablesController(request, response) {
    try {
        const tables = await TableModel.find({
            status: 'available'
        }).sort({ tableNumber: 1 });

        return response.status(200).json({
            message: "Lấy danh sách bàn trống thành công",
            data: tables,
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

// POST /api/table/regenerate-qr
// Tạo lại QR code cho bàn đã tồn tại (fix bàn tạo thiếu QR)
export async function regenerateQRController(request, response) {
    try {
        const { _id } = request.body;
        if (!_id) {
            return response.status(400).json({ message: "Vui lòng cung cấp ID bàn", error: true, success: false });
        }

        const table = await TableModel.findById(_id);
        if (!table) {
            return response.status(404).json({ message: "Không tìm thấy bàn", error: true, success: false });
        }

        // Tạo table account nếu chưa có
        if (!table.tableAccountId) {
            const tableEmail = `table_${table.tableNumber.toLowerCase()}@internal.restaurant.com`;
            const existingUser = await UserModel.findOne({ email: tableEmail });
            if (existingUser) {
                table.tableAccountId = existingUser._id;
            } else {
                const salt = await bcryptjs.genSalt(10);
                const hashPassword = await bcryptjs.hash(Math.random().toString(36).slice(-12), salt);
                const tableUser = await new UserModel({
                    name: `Bàn ${table.tableNumber}`,
                    email: tableEmail,
                    password: hashPassword,
                    role: "TABLE",
                    linkedTableId: table._id,
                    verify_email: true,
                    status: "Active"
                }).save();
                table.tableAccountId = tableUser._id;
            }
        }

        // Tạo lại QR
        const { token, qrCodeImage } = await generateTableQRCode(table._id, table.tableNumber);
        table.qrCodeToken = token;
        table.qrCode = qrCodeImage;
        await table.save();

        return response.status(200).json({
            message: `Tái tạo QR cho bàn ${table.tableNumber} thành công`,
            data: {
                tableNumber: table.tableNumber,
                qrCode: qrCodeImage,
                testUrl: `${process.env.FRONTEND_URL}/table-login?token=${token}`
            },
            error: false,
            success: true
        });

    } catch (error) {
        console.error('[regenerateQR] Error:', error.message);
        return response.status(500).json({ message: error.message, error: true, success: false });
    }
}
