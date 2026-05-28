import VoucherModel from '../models/voucher.model.js';
import TableOrderModel from '../models/tableOrder.model.js'; // ✅ model nhà hàng thực sự

// Kiểm tra khách hàng lần đầu (chưa có tableOrder nào đã paid)
const checkFirstTimeCustomer = async (userId) => {
    if (!userId) return false;
    const orderCount = await TableOrderModel.countDocuments({
        customerId: userId,
        paymentStatus: 'paid'
    });
    return orderCount === 0;
};

export const addVoucerController = async (req, res) => {
    try {
        const { code, name, description, discountType, discountValue, minOrderValue,
            maxDiscount, startDate, endDate, usageLimit, isActive, isFirstTimeCustomer, applyForAllProducts, products, categories } = req.body;

        // Validate percentage discount
        if (discountType === 'percentage' && !maxDiscount) {
            return res.status(400).json({
                message: "Vui lòng nhập giảm giá tối đa cho loại giảm giá phần trăm",
                error: true,
                success: false
            });
        }

        const existVoucher = await VoucherModel.findOne({ code });

        if (existVoucher) {
            return res.status(400).json({
                message: "Mã giảm giá đã tồn tại",
                error: true,
                success: false
            });
        }

        const voucherData = {
            code,
            name,
            description,
            discountType,
            minOrderValue: minOrderValue || 0,
            startDate,
            endDate,
            usageLimit: usageLimit || null,
            isActive: isActive !== undefined ? isActive : true,
            isFirstTimeCustomer: isFirstTimeCustomer || false,
            applyForAllProducts: applyForAllProducts !== undefined ? applyForAllProducts : true,
            products: applyForAllProducts ? [] : (products || []),
            categories: applyForAllProducts ? [] : (categories || [])
        };

        // Add discountValue and maxDiscount
        voucherData.discountValue = discountValue;
        if (discountType === 'percentage') {
            voucherData.maxDiscount = maxDiscount;
        }

        const addVoucher = new VoucherModel(voucherData);

        const saveVoucher = await addVoucher.save()

        if (!saveVoucher) {
            return res.status(500).json({
                message: "Không tạo được",
                error: true,
                success: false
            })
        }

        return res.json({
            message: "Thêm thành công",
            data: saveVoucher,
            error: false,
            success: true
        })

    } catch (error) {
        return res.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}

export const getAllVoucherController = async (req, res) => {
    try {
        const data = await VoucherModel.find().sort({ createdAt: -1 })

        return res.json({
            message: 'Danh mục Data',
            data: data,
            error: false,
            success: true
        })
    } catch (error) {
        return res.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}

export const updateVoucherController = async (req, res) => {
    try {
        const { _id, code, name, description, discountType, discountValue, minOrderValue,
            maxDiscount, startDate, endDate, usageLimit, isActive, isFirstTimeCustomer, applyForAllProducts, products, categories } = req.body

        const check = await VoucherModel.findById(_id)

        if (!check) {
            return res.status(400).json({
                message: 'Không tìm thấy _id',
                error: true,
                success: false
            })
        }

        const updateData = {
            code,
            name,
            description,
            discountType,
            discountValue,
            minOrderValue,
            maxDiscount,
            startDate,
            endDate,
            usageLimit,
            isActive,
            isFirstTimeCustomer: isFirstTimeCustomer || false,
            applyForAllProducts,
            products,
            categories
        };

        const update = await VoucherModel.findByIdAndUpdate(
            _id,
            updateData,
            { new: true }
        )

        return res.json({
            message: 'Cập nhật thành công',
            data: update,
            error: false,
            success: true
        })

    } catch (error) {
        return res.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}

export const deleteVoucherController = async (req, res) => {
    try {
        const { _id } = req.body

        const deleteVoucher = await VoucherModel.findByIdAndDelete(_id)

        return res.json({
            message: 'Xóa thành công',
            data: deleteVoucher,
            error: false,
            success: true
        })
    } catch (error) {
        return res.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}

export const bulkDeleteVouchersController = async (req, res) => {
    try {
        const { voucherIds } = req.body;

        if (!voucherIds || !Array.isArray(voucherIds) || voucherIds.length === 0) {
            return res.status(400).json({
                message: 'Danh sách voucher không hợp lệ',
                error: true,
                success: false
            });
        }

        // Delete multiple vouchers by their IDs
        const result = await VoucherModel.deleteMany({
            _id: { $in: voucherIds }
        });

        if (result.deletedCount === 0) {
            return res.status(404).json({
                message: 'Không tìm thấy mã giảm giá để xóa',
                error: true,
                success: false
            });
        }

        return res.status(200).json({
            message: `Đã xóa thành công ${result.deletedCount} mã giảm giá`,
            data: { deletedCount: result.deletedCount },
            error: false,
            success: true
        });

    } catch (error) {
        console.error('Lỗi khi xóa hàng loạt mã giảm giá:', error);
        return res.status(500).json({
            message: error.message || 'Đã xảy ra lỗi khi xóa mã giảm giá',
            error: true,
            success: false
        });
    }
}

export const getAvailableVouchersController = async (req, res) => {
    try {
        const { orderAmount, productIds = [], cartItems = [], userId } = req.body;

        console.log('Received request with:', {
            orderAmount,
            productIds: productIds.length,
            cartItems: cartItems.length,
            userId
        });

        if (orderAmount === undefined || orderAmount === null) {
            return res.status(400).json({
                message: "Vui lòng cung cấp tổng giá trị đơn hàng",
                error: true,
                success: false
            });
        }

        const currentDate = new Date();

        // Calculate the actual total after applying product discounts
        let actualTotal = 0;
        if (Array.isArray(cartItems) && cartItems.length > 0) {
            actualTotal = parseFloat(orderAmount);
            const calculatedTotal = cartItems.reduce((total, item) => {
                const product = item.productId || {};
                const price = product.discountPrice > 0 && product.discountPrice < product.price
                    ? product.discountPrice
                    : product.price;
                const itemTotal = price * (item.quantity || 1);
                return total + itemTotal;
            }, 0);
            actualTotal = Math.min(actualTotal, calculatedTotal);
        } else {
            actualTotal = parseFloat(orderAmount);
        }

        // Check if user is first time customer
        const isFirstTimer = await checkFirstTimeCustomer(userId);

        // Find all active vouchers
        const vouchers = await VoucherModel.find({
            isActive: true,
            endDate: { $gte: currentDate },
            $or: [
                { usageLimit: null }, // Unlimited (no limit set)
                { usageLimit: -1 },   // Unlimited (legacy)
                { usageLimit: { $gt: 0 } } // Has remaining usage
            ]
        }).sort({ startDate: 1 });

        // Filter vouchers
        const applicableVouchers = vouchers.filter(voucher => {
            // Check first time customer requirement
            if (voucher.isFirstTimeCustomer) {
                if (!userId || !isFirstTimer) return false;
            }

            // Check min order value
            const meetsMinOrder = actualTotal >= voucher.minOrderValue;
            if (!meetsMinOrder) return false;

            // Check product applicability
            if (voucher.applyForAllProducts) return true;
            if (!voucher.products || voucher.products.length === 0) return true;
            return productIds.some(productId =>
                voucher.products.some(p => p.toString() === productId)
            );
        });

        // Format response
        const formattedVouchers = applicableVouchers.map(voucher => {
            const now = new Date();
            const isUpcoming = new Date(voucher.startDate) > now;
            const isActive = !isUpcoming && new Date(voucher.endDate) > now;
            const isFreeShipping = voucher.discountType === 'free_shipping' || voucher.isFreeShipping === true;

            return {
                id: voucher._id,
                code: voucher.code,
                name: voucher.name,
                description: voucher.description,
                minOrder: voucher.minOrderValue,
                discount: isFreeShipping ? 0 : voucher.discountValue,
                discountType: voucher.discountType,
                startDate: voucher.startDate,
                expiryDate: new Date(voucher.endDate).toLocaleDateString('vi-VN'),
                isFreeShipping,
                isFirstTimeCustomer: voucher.isFirstTimeCustomer,
                maxDiscount: isFreeShipping ? null : (voucher.maxDiscount || null),
                isActive,
                isUpcoming,
                availableFrom: isUpcoming ? new Date(voucher.startDate).toLocaleDateString('vi-VN') : null,
                discountText: isFreeShipping
                    ? 'Miễn phí vận chuyển'
                    : voucher.discountType === 'percentage'
                        ? `Giảm ${voucher.discountValue}% (Tối đa ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(voucher.maxDiscount || 0)})`
                        : `Giảm ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(voucher.discountValue || 0)}`
            };
        });

        return res.json({
            message: 'Danh sách voucher khả dụng',
            data: formattedVouchers,
            error: false,
            success: true
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        });
    }
};

export const applyVoucherController = async (req, res) => {
    try {
        const { code, orderAmount, productIds, userId } = req.body;

        if (!code) {
            return res.status(400).json({
                message: 'Vui lòng nhập mã giảm giá',
                error: true,
                success: false
            });
        }

        const voucher = await VoucherModel.findOne({ code });

        if (!voucher) {
            return res.status(404).json({
                message: 'Mã giảm giá không tồn tại',
                error: true,
                success: false
            });
        }

        // Check if voucher is active
        if (!voucher.isActive) {
            return res.status(400).json({
                message: 'Mã giảm giá đã bị vô hiệu hóa',
                error: true,
                success: false
            });
        }

        // Check first time customer requirement
        if (voucher.isFirstTimeCustomer) {
            const isFirstTimer = await checkFirstTimeCustomer(userId);
            if (!isFirstTimer) {
                return res.status(400).json({
                    message: "Mã giảm giá này chỉ dành cho khách hàng mới",
                    error: true,
                    success: false
                });
            }
        }

        // Check voucher validity
        const currentDate = new Date();
        if (voucher.startDate && new Date(voucher.startDate) > currentDate) {
            return res.status(400).json({
                message: 'Mã giảm giá chưa đến thời gian áp dụng',
                error: true,
                success: false
            });
        }

        if (voucher.endDate && new Date(voucher.endDate) < currentDate) {
            return res.status(400).json({
                message: 'Mã giảm giá đã hết hạn',
                error: true,
                success: false
            });
        }

        // Check minimum order value
        if (orderAmount < (voucher.minOrderValue || 0)) {
            return res.status(400).json({
                message: `Đơn hàng tối thiểu ${voucher.minOrderValue.toLocaleString()}đ để áp dụng mã giảm giá này`,
                error: true,
                success: false
            });
        }

        // Check if voucher applies to all products or specific products
        if (!voucher.applyForAllProducts && voucher.products && voucher.products.length > 0) {
            const validProduct = productIds.some(id =>
                voucher.products.some(p => p.toString() === id.toString())
            );

            if (!validProduct) {
                return res.status(400).json({
                    message: 'Mã giảm giá không áp dụng cho sản phẩm trong đơn hàng',
                    error: true,
                    success: false
                });
            }
        }

        // Check usage limit
        if (voucher.usageLimit && voucher.usedCount >= voucher.usageLimit) {
            return res.status(400).json({
                message: 'Mã giảm giá đã hết số lần sử dụng',
                error: true,
                success: false
            });
        }

        // Calculate discount amount
        let discountAmount = 0;
        if (voucher.isFreeShipping) {
            // For free shipping, the discount amount will be handled by the client
            discountAmount = 0;
        } else if (voucher.discountType === 'percentage') {
            const percentageDiscount = (orderAmount * voucher.discountValue) / 100;
            discountAmount = voucher.maxDiscount
                ? Math.min(percentageDiscount, voucher.maxDiscount)
                : percentageDiscount;
        } else if (voucher.discountType === 'fixed') {
            discountAmount = Math.min(voucher.discountValue, orderAmount);
        }

        // Return the voucher details with calculated discount
        return res.json({
            message: 'Áp dụng mã giảm giá thành công',
            data: {
                ...voucher.toObject(),
                calculatedDiscount: discountAmount
            },
            error: false,
            success: true
        });

    } catch (error) {
        console.error('Error applying voucher:', error);
        return res.status(500).json({
            message: error.message || 'Có lỗi xảy ra khi áp dụng mã giảm giá',
            error: true,
            success: false
        });
    }
};

export const bulkUpdateVouchersStatusController = async (req, res) => {
    try {
        const { voucherIds, isActive } = req.body;

        if (!voucherIds || !Array.isArray(voucherIds) || voucherIds.length === 0) {
            return res.status(400).json({
                message: 'Danh sách mã giảm giá không hợp lệ',
                error: true,
                success: false
            });
        }

        if (typeof isActive !== 'boolean') {
            return res.status(400).json({
                message: 'Trạng thái không hợp lệ',
                error: true,
                success: false
            });
        }

        // Update status of multiple vouchers
        const result = await VoucherModel.updateMany(
            { _id: { $in: voucherIds } },
            { $set: { isActive } },
            { new: true }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({
                message: 'Không tìm thấy mã giảm giá để cập nhật',
                error: true,
                success: false
            });
        }

        return res.status(200).json({
            message: `Đã cập nhật trạng thái thành công cho ${result.modifiedCount} mã giảm giá`,
            data: {
                matchedCount: result.matchedCount,
                modifiedCount: result.modifiedCount
            },
            error: false,
            success: true
        });

    } catch (error) {
        console.error('Lỗi khi cập nhật trạng thái hàng loạt mã giảm giá:', error);
        return res.status(500).json({
            message: error.message || 'Đã xảy ra lỗi khi cập nhật trạng thái mã giảm giá',
            error: true,
            success: false
        });
    }
}

// Get best voucher for maximum savings
export const getBestVoucherController = async (req, res) => {
    try {
        const { orderAmount, productIds = [], cartItems = [], userId } = req.body;

        if (orderAmount === undefined || orderAmount === null) {
            return res.status(400).json({
                message: "Vui lòng cung cấp tổng giá trị đơn hàng",
                error: true,
                success: false
            });
        }

        const currentDate = new Date();

        // Calculate actual total
        let actualTotal = parseFloat(orderAmount);
        if (Array.isArray(cartItems) && cartItems.length > 0) {
            const calculatedTotal = cartItems.reduce((total, item) => {
                const product = item.productId || {};
                const price = product.discountPrice > 0 && product.discountPrice < product.price
                    ? product.discountPrice
                    : product.price;
                return total + (price * (item.quantity || 1));
            }, 0);
            actualTotal = Math.min(actualTotal, calculatedTotal);
        }

        // Check if user is first time customer
        const isFirstTimer = await checkFirstTimeCustomer(userId);

        // Find all applicable vouchers
        const vouchers = await VoucherModel.find({
            isActive: true,
            startDate: { $lte: currentDate },
            endDate: { $gte: currentDate },
            $or: [
                { usageLimit: null }, // Unlimited (no limit set)
                { usageLimit: -1 },   // Unlimited (legacy)
                { $expr: { $gt: ['$usageLimit', '$usageCount'] } } // Has remaining usage
            ]
        });

        // Filter applicable vouchers (only non-free shipping vouchers are considered for "best discount")
        const applicableVouchers = vouchers.filter(voucher => {
            // Check first time customer requirement
            if (voucher.isFirstTimeCustomer) {
                if (!userId || !isFirstTimer) return false;
            }

            // Check minimum order value
            if (actualTotal < voucher.minOrderValue) return false;

            // Check if user already used this voucher
            if (userId && voucher.usersUsed && voucher.usersUsed.includes(userId)) {
                return false;
            }

            // Check product applicability
            if (voucher.applyForAllProducts) return true;
            if (!voucher.products || voucher.products.length === 0) return true;

            return productIds.some(productId =>
                voucher.products.some(p => p.toString() === productId)
            );
        });

        // Calculate discount for each voucher
        const vouchersWithDiscount = applicableVouchers.map(voucher => {
            let discount = 0;
            if (voucher.discountType === 'percentage') {
                const percentageDiscount = (actualTotal * voucher.discountValue) / 100;
                discount = voucher.maxDiscount
                    ? Math.min(percentageDiscount, voucher.maxDiscount)
                    : percentageDiscount;
            } else if (voucher.discountType === 'fixed') {
                discount = Math.min(voucher.discountValue, actualTotal);
            }

            return {
                ...voucher.toObject(),
                calculatedDiscount: Math.round(discount)
            };
        });

        // Sort by discount amount (highest first)
        vouchersWithDiscount.sort((a, b) => b.calculatedDiscount - a.calculatedDiscount);

        // Get best voucher
        const bestVoucher = vouchersWithDiscount.length > 0 ? vouchersWithDiscount[0] : null;

        // Prepare alternatives (top 3 other options)
        const alternatives = [];
        for (let i = 1; i < Math.min(4, vouchersWithDiscount.length); i++) {
            alternatives.push({
                voucher: vouchersWithDiscount[i],
                savings: vouchersWithDiscount[i].calculatedDiscount,
                reason: `Giảm ${vouchersWithDiscount[i].calculatedDiscount.toLocaleString('vi-VN')}đ`
            });
        }

        return res.json({
            message: 'Tìm mã giảm giá tốt nhất thành công',
            data: {
                bestCombination: bestVoucher ? {
                    regular: bestVoucher,
                    totalSavings: bestVoucher.calculatedDiscount
                } : null,
                alternatives,
                currentOrderTotal: actualTotal
            },
            error: false,
            success: true
        });

    } catch (error) {
        console.error('Error finding best voucher:', error);
        return res.status(500).json({
            message: error.message || 'Có lỗi xảy ra khi tìm mã giảm giá tốt nhất',
            error: true,
            success: false
        });
    }
};

// ==================== ANALYTICS CONTROLLERS ====================

// Get voucher overview statistics
export const getVoucherOverviewController = async (req, res) => {
    try {
        // Total vouchers
        const totalVouchers = await VoucherModel.countDocuments();

        // Active vouchers
        const currentDate = new Date();
        const activeVouchers = await VoucherModel.countDocuments({
            isActive: true,
            startDate: { $lte: currentDate },
            endDate: { $gte: currentDate }
        });

        // Thống kê usage từ tableOrder (dùng voucherId + discount)
        const usageStats = await TableOrderModel.aggregate([
            {
                $match: {
                    voucherId: { $ne: null, $exists: true }
                }
            },
            {
                $group: {
                    _id: null,
                    totalUsage: { $sum: 1 },
                    totalSavings: { $sum: '$discount' }  // tableOrder dùng 'discount'
                }
            }
        ]);

        const totalUsage = usageStats.length > 0 ? usageStats[0].totalUsage : 0;
        const totalSavings = usageStats.length > 0 ? usageStats[0].totalSavings : 0;
        const avgDiscountPerOrder = totalUsage > 0 ? totalSavings / totalUsage : 0;

        return res.json({
            message: 'Lấy thống kê tổng quan thành công',
            data: {
                totalVouchers,
                activeVouchers,
                totalUsage,
                totalSavings: Math.round(totalSavings),
                avgDiscountPerOrder: Math.round(avgDiscountPerOrder)
            },
            error: false,
            success: true
        });

    } catch (error) {
        console.error('Error getting voucher overview:', error);
        return res.status(500).json({
            message: error.message || 'Có lỗi xảy ra khi lấy thống kê',
            error: true,
            success: false
        });
    }
};

// Get top vouchers by usage
export const getTopVouchersController = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 5;

        // Aggregate từ tableOrder, lookup sang voucher collection
        const topVouchers = await TableOrderModel.aggregate([
            {
                $match: {
                    voucherId: { $ne: null, $exists: true }
                }
            },
            {
                $group: {
                    _id: '$voucherId',
                    usageCount: { $sum: 1 },
                    totalSavings: { $sum: '$discount' }  // tableOrder dùng 'discount'
                }
            },
            {
                $lookup: {
                    from: 'vouchers',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'voucherDetails'
                }
            },
            {
                $unwind: {
                    path: '$voucherDetails',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $project: {
                    code: { $ifNull: ['$voucherDetails.code', 'N/A'] },
                    name: { $ifNull: ['$voucherDetails.name', 'Không rõ'] },
                    usageCount: 1,
                    totalSavings: { $round: ['$totalSavings', 0] },
                    discountType: { $ifNull: ['$voucherDetails.discountType', 'unknown'] }
                }
            },
            {
                $sort: { usageCount: -1 }
            },
            {
                $limit: limit
            }
        ]);

        return res.json({
            message: 'Lấy top vouchers thành công',
            data: { vouchers: topVouchers },
            error: false,
            success: true
        });

    } catch (error) {
        console.error('Error getting top vouchers:', error);
        return res.status(500).json({
            message: error.message || 'Có lỗi xảy ra khi lấy top vouchers',
            error: true,
            success: false
        });
    }
};

// Get usage trend over time
export const getUsageTrendController = async (req, res) => {
    try {
        const period = req.query.period || '7d'; // 7d, 30d, 90d

        let daysAgo = 7;
        if (period === '30d') daysAgo = 30;
        else if (period === '90d') daysAgo = 90;

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysAgo);
        startDate.setHours(0, 0, 0, 0);

        // Aggregate từ tableOrder dùng voucherId và discount
        const trend = await TableOrderModel.aggregate([
            {
                $match: {
                    voucherId: { $ne: null, $exists: true },
                    createdAt: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
                    },
                    usageCount: { $sum: 1 },
                    totalSavings: { $sum: '$discount' }  // tableOrder dùng 'discount'
                }
            },
            {
                $project: {
                    date: '$_id',
                    usageCount: 1,
                    totalSavings: { $round: ['$totalSavings', 0] },
                    _id: 0
                }
            },
            {
                $sort: { date: 1 }
            }
        ]);

        return res.json({
            message: 'Lấy xu hướng sử dụng thành công',
            data: { trend, period, daysAgo },
            error: false,
            success: true
        });

    } catch (error) {
        console.error('Error getting usage trend:', error);
        return res.status(500).json({
            message: error.message || 'Có lỗi xảy ra khi lấy xu hướng',
            error: true,
            success: false
        });
    }
};

