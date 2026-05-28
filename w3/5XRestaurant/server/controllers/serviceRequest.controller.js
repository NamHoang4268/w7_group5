import ServiceRequestModel from '../models/serviceRequest.model.js';
import TableOrderModel from '../models/tableOrder.model.js';
import UserModel from '../models/user.model.js';
import TableModel from '../models/table.model.js';

// POST /api/service-request/call
// Khách gọi phục vụ (role TABLE)
export async function callWaiter(request, response) {
    try {
        const userId = request.userId;
        const { type = 'cancel_item', note = '' } = request.body;

        const user = await UserModel.findById(userId);
        if (!user || user.role !== 'TABLE') {
            return response.status(403).json({
                message: 'Chỉ tài khoản bàn mới có thể gọi phục vụ',
                error: true, success: false
            });
        }

        // Lấy tableNumber từ Table record
        const table = await TableModel.findById(user.linkedTableId).select('tableNumber');
        const tableNumber = table?.tableNumber || 'N/A';

        // Tìm đơn active hiện tại
        const tableOrder = await TableOrderModel.findOne({
            tableId: user.linkedTableId,
            status: { $in: ['active', 'pending_payment'] }
        });

        const newRequest = await ServiceRequestModel.create({
            tableId: user.linkedTableId,
            tableOrderId: tableOrder?._id || null,
            tableNumber,
            type,
            note: note.trim(),
            status: 'pending'
        });

        // Emit socket event cho Waiter Dashboard
        const io = request.app.get('io');
        if (io) {
            io.emit('waiter:service_request', {
                _id: newRequest._id,
                tableNumber: newRequest.tableNumber,
                tableId: newRequest.tableId,
                type: newRequest.type,
                note: newRequest.note,
                createdAt: newRequest.createdAt
            });
        }

        return response.status(201).json({
            message: 'Đã gửi yêu cầu gọi phục vụ. Nhân viên sẽ đến ngay!',
            error: false,
            success: true,
            data: newRequest
        });

    } catch (error) {
        console.error('callWaiter error:', error);
        return response.status(500).json({
            message: error.message || 'Lỗi server',
            error: true, success: false
        });
    }
}

// GET /api/service-request/pending
// Waiter lấy danh sách request đang pending
export async function getPendingRequests(request, response) {
    try {
        const requests = await ServiceRequestModel.find({ status: 'pending' })
            .sort({ createdAt: -1 })
            .lean();

        return response.status(200).json({
            message: 'OK',
            error: false,
            success: true,
            data: requests
        });
    } catch (error) {
        return response.status(500).json({
            message: error.message, error: true, success: false
        });
    }
}

// PATCH /api/service-request/:id/handle
// Waiter cập nhật trạng thái (accepted / done / rejected)
export async function handleRequest(request, response) {
    try {
        const { id } = request.params;
        const { status } = request.body;
        const handlerId = request.userId;

        if (!['accepted', 'done', 'rejected'].includes(status)) {
            return response.status(400).json({
                message: 'Trạng thái không hợp lệ',
                error: true, success: false
            });
        }

        const updated = await ServiceRequestModel.findByIdAndUpdate(
            id,
            {
                status,
                handledBy: handlerId,
                handledAt: new Date()
            },
            { new: true }
        );

        if (!updated) {
            return response.status(404).json({
                message: 'Không tìm thấy yêu cầu',
                error: true, success: false
            });
        }

        // Thông báo realtime khi done/rejected
        const io = request.app.get('io');
        if (io && (status === 'done' || status === 'rejected')) {
            io.emit('waiter:service_request_updated', {
                _id: updated._id,
                status: updated.status,
                tableNumber: updated.tableNumber
            });
        }

        return response.status(200).json({
            message: `Đã cập nhật yêu cầu: ${status}`,
            error: false, success: true,
            data: updated
        });

    } catch (error) {
        return response.status(500).json({
            message: error.message, error: true, success: false
        });
    }
}
