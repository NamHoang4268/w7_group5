import TableOrderModel from "../models/tableOrder.model.js";

// GET /api/kitchen/orders
// Lấy danh sách tất cả món chưa hoàn thành, group theo bàn
export const getKitchenOrders = async (req, res) => {
    try {
        const orders = await TableOrderModel.find({
            status: { $in: ["pending", "confirmed"] },
        })
            .populate("tableId", "name tableName tableNumber")
            .populate("items.productId", "name image")
            .sort({ createdAt: 1 });

        return res.status(200).json({ success: true, data: orders });
    } catch (error) {
        console.error("getKitchenOrders error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/kitchen/active
// Lấy các món đang ở trạng thái cần bếp xử lý
export const getActiveKitchenItems = async (req, res) => {
    try {
        const orders = await TableOrderModel.find({
            status: { $nin: ["cancelled", "Đã hủy", "paid"] },
            "items.kitchenStatus": { $in: ["pending", "cooking"] },
        })
            .populate("tableId", "name tableName tableNumber")
            .populate("items.productId", "name image price")
            .sort({ createdAt: 1 });

        // Flatten items cần nấu, kèm thông tin bàn
        const kitchenItems = [];
        orders.forEach((order) => {
            order.items.forEach((item) => {
                if (item.kitchenStatus === "pending" || item.kitchenStatus === "cooking") {
                    kitchenItems.push({
                        _id: item._id,
                        orderId: order._id,
                        tableId: order.tableId,
                        product: item.productId,
                        quantity: item.quantity,
                        note: item.note,
                        kitchenStatus: item.kitchenStatus,
                        sentAt: item.sentAt || order.createdAt,
                    });
                }
            });
        });

        return res.status(200).json({ success: true, data: kitchenItems });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// PATCH /api/kitchen/item/:orderId/:itemId/status
// Đầu bếp cập nhật trạng thái từng món: pending → cooking → ready
export const updateItemKitchenStatus = async (req, res) => {
    try {
        const { orderId, itemId } = req.params;
        const { status } = req.body; // "cooking" | "ready"

        const validStatuses = ["cooking", "ready"];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Trạng thái không hợp lệ. Chọn: ${validStatuses.join(", ")}`,
            });
        }

        const order = await TableOrderModel.findById(orderId).populate("tableId", "name tableName tableNumber");
        if (!order) return res.status(404).json({ success: false, message: "Không tìm thấy đơn hàng." });

        const item = order.items.id(itemId);
        if (!item) return res.status(404).json({ success: false, message: "Không tìm thấy món." });

        item.kitchenStatus = status;
        if (status === "cooking") {
            item.cookingStartAt = new Date();
            if (['pending', 'Chờ xử lý', 'Đã phục vụ'].includes(order.paymentStatus)) {
                order.paymentStatus = 'Đang chuẩn bị';
            }
        }
        if (status === "ready") item.readyAt = new Date();

        await order.save();

        // Emit socket event
        const io = req.app.get("io");
        if (io) {
            if (status === "ready") {
                io.emit("dish:ready", {
                    orderId,
                    itemId,
                    tableId: order.tableId?._id,
                    tableName: order.tableId?.tableNumber || order.tableId?.name || order.tableId?.tableName,
                    productName: item.name,
                    quantity: item.quantity,
                });
            } else {
                io.emit("kitchen:status_update", {
                    orderId,
                    itemId,
                    status,
                    tableId: order.tableId?._id,
                });
            }
        }

        return res.status(200).json({
            success: true,
            message: `Cập nhật trạng thái món thành "${status}"`,
            data: item,
        });
    } catch (error) {
        console.error("updateItemKitchenStatus error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// PATCH /api/kitchen/item/:orderId/:itemId/served
// Nhân viên xác nhận đã phục vụ món ra bàn
export const markItemServed = async (req, res) => {
    try {
        const { orderId, itemId } = req.params;

        const order = await TableOrderModel.findById(orderId).populate("tableId", "name tableName tableNumber");
        if (!order) return res.status(404).json({ success: false, message: "Không tìm thấy đơn hàng." });

        const item = order.items.id(itemId);
        if (!item) return res.status(404).json({ success: false, message: "Không tìm thấy món." });

        if (item.kitchenStatus !== "ready") {
            return res.status(400).json({
                success: false,
                message: "Món chưa sẵn sàng để phục vụ.",
            });
        }

        item.kitchenStatus = "served";
        item.servedAt = new Date();

        const allServed = order.items.every(i => i.kitchenStatus === 'served');
        if (allServed && order.paymentStatus === 'Đang chuẩn bị') {
            order.paymentStatus = 'Đã phục vụ';
        }

        await order.save();

        const io = req.app.get("io");
        if (io) {
            io.emit("dish:served", {
                orderId,
                itemId,
                tableId: order.tableId?._id,
                tableName: order.tableId?.tableNumber || order.tableId?.name || order.tableId?.tableName,
            });
        }

        return res.status(200).json({
            success: true,
            message: "Đã xác nhận phục vụ món.",
            data: item,
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/kitchen/waiter – Món đã xong, chờ phục vụ
export const getReadyToServeItems = async (req, res) => {
    try {
        const orders = await TableOrderModel.find({
            status: { $nin: ["cancelled", "Đã hủy", "paid"] },
            "items.kitchenStatus": "ready",
        })
            .populate("tableId", "name tableName tableNumber")
            .populate("items.productId", "name image")
            .sort({ "items.readyAt": 1 });

        const readyItems = [];
        orders.forEach((order) => {
            order.items.forEach((item) => {
                if (item.kitchenStatus === "ready") {
                    readyItems.push({
                        _id: item._id,
                        orderId: order._id,
                        tableId: order.tableId,
                        product: item.productId,
                        quantity: item.quantity,
                        readyAt: item.readyAt,
                    });
                }
            });
        });

        return res.status(200).json({ success: true, data: readyItems });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
