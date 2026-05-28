import CustomerModel from "../models/customer.model.js";

// POST /api/customer/checkin
// Tìm khách theo SĐT hoặc tạo mới. Dùng khi khách quét QR và chọn nhập thông tin.
export const checkinCustomer = async (req, res) => {
    try {
        const { name, phone } = req.body;

        if (!phone) {
            return res.status(400).json({
                success: false,
                message: "Số điện thoại là bắt buộc để tích điểm.",
            });
        }

        let customer = await CustomerModel.findOne({ phone });

        if (customer) {
            // Khách cũ: cập nhật lần ghé thăm
            customer.visitCount += 1;
            customer.lastVisit = new Date();
            if (name && !customer.name) customer.name = name;
            await customer.save();

            return res.status(200).json({
                success: true,
                message: "Chào mừng trở lại!",
                isNewCustomer: false,
                data: customer,
            });
        } else {
            // Khách mới
            customer = await CustomerModel.create({
                name: name || "",
                phone,
                visitCount: 1,
                totalPoints: 0,
            });

            return res.status(201).json({
                success: true,
                message: "Đăng ký thành công! Chào mừng bạn.",
                isNewCustomer: true,
                data: customer,
            });
        }
    } catch (error) {
        console.error("checkinCustomer error:", error);
        return res.status(500).json({
            success: false,
            message: "Lỗi server.",
            error: error.message,
        });
    }
};

// GET /api/customer/:id
export const getCustomerById = async (req, res) => {
    try {
        const customer = await CustomerModel.findById(req.params.id);
        if (!customer) {
            return res.status(404).json({ success: false, message: "Không tìm thấy khách hàng." });
        }
        return res.status(200).json({ success: true, data: customer });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/customer  (Admin)
export const getAllCustomers = async (req, res) => {
    try {
        const { page = 1, limit = 20, search = "" } = req.query;
        const query = search
            ? { $or: [{ name: { $regex: search, $options: "i" } }, { phone: { $regex: search, $options: "i" } }] }
            : {};

        const [customers, total] = await Promise.all([
            CustomerModel.find(query)
                .sort({ visitCount: -1, createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(Number(limit)),
            CustomerModel.countDocuments(query),
        ]);

        return res.status(200).json({
            success: true,
            data: customers,
            total,
            page: Number(page),
            totalPages: Math.ceil(total / limit),
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// PATCH /api/customer/:id/points  – Admin cộng/trừ điểm thủ công
export const updatePoints = async (req, res) => {
    try {
        const { points, reason } = req.body;
        const customer = await CustomerModel.findByIdAndUpdate(
            req.params.id,
            { $inc: { totalPoints: points } },
            { new: true }
        );
        if (!customer) return res.status(404).json({ success: false, message: "Không tìm thấy." });
        return res.status(200).json({ success: true, data: customer });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
