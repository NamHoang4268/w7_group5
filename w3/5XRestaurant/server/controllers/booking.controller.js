import BookingModel from "../models/booking.model.js";
import TableModel from "../models/table.model.js";
import sendEmail from "../config/sendEmail.js";
import bookingEmailTemplate from "../utils/bookingEmailTemplate.js";
import Stripe from "../config/stripe.js";

// Create new booking
export async function createBookingController(request, response) {
    try {
        const {
            customerName,
            phone,
            email,
            tableId,
            numberOfGuests,
            bookingDate,
            bookingTime,
            specialRequests,
            userId,
            createdBy
        } = request.body;

        // Validation
        if (!customerName || !phone || !tableId || !numberOfGuests || !bookingDate || !bookingTime) {
            return response.status(400).json({
                message: "Vui lòng điền đầy đủ thông tin bắt buộc",
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

        // Check capacity
        if (numberOfGuests > table.capacity) {
            return response.status(400).json({
                message: `Bàn chỉ chứa tối đa ${table.capacity} người`,
                error: true,
                success: false
            });
        }

        // Validate booking date (not in the past)
        const selectedDate = new Date(bookingDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (selectedDate < today) {
            return response.status(400).json({
                message: "Không thể đặt bàn cho ngày trong quá khứ",
                error: true,
                success: false
            });
        }

        // Check if table is already booked for this date/time
        const existingBooking = await BookingModel.findOne({
            tableId,
            bookingDate: selectedDate,
            bookingTime,
            status: { $in: ['pending', 'confirmed'] }
        });

        if (existingBooking) {
            return response.status(400).json({
                message: "Bàn này đã được đặt cho thời gian này",
                error: true,
                success: false
            });
        }

        // Create booking
        const newBooking = new BookingModel({
            customerName,
            phone,
            email: email || "",
            tableId,
            numberOfGuests,
            bookingDate: selectedDate,
            bookingTime,
            specialRequests: specialRequests || "",
            userId: userId || null,
            createdBy: createdBy || 'customer',
            status: 'pending',
            depositAmount: numberOfGuests > 4 ? numberOfGuests * 50000 : 0,
            depositPaid: false
        });

        const savedBooking = await newBooking.save();

        // Populate table info
        await savedBooking.populate('tableId', 'tableNumber capacity location');

        // Send email
        if (email) {
            await sendEmail({
                sendTo: email,
                subject: "Xác nhận yêu cầu đặt bàn - EatEase Restaurant",
                html: bookingEmailTemplate(savedBooking)
            });
        }

        return response.status(201).json({
            message: "Đặt bàn thành công",
            data: savedBooking,
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

// Get all bookings (admin)
export async function getAllBookingsController(request, response) {
    try {
        const bookings = await BookingModel.find()
            .populate('tableId', 'tableNumber capacity location')
            .populate('userId', 'name email')
            .populate({
                path: 'preOrderId',
                select: 'totalAmt product_details payment_status'
            })
            .sort({ createdAt: -1 });

        return response.status(200).json({
            message: "Lấy danh sách đặt bàn thành công",
            data: bookings,
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

// Get booking by ID
export async function getBookingByIdController(request, response) {
    try {
        const { id } = request.params;

        const booking = await BookingModel.findById(id)
            .populate('tableId', 'tableNumber capacity location')
            .populate('userId', 'name email')
            .populate({
                path: 'preOrderId',
                select: 'totalAmt product_details payment_status'
            });

        if (!booking) {
            return response.status(404).json({
                message: "Không tìm thấy đặt bàn",
                error: true,
                success: false
            });
        }

        return response.status(200).json({
            message: "Lấy thông tin đặt bàn thành công",
            data: booking,
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

// Update booking (admin)
export async function updateBookingController(request, response) {
    try {
        const { _id, customerName, phone, email, numberOfGuests, specialRequests } = request.body;

        if (!_id) {
            return response.status(400).json({
                message: "Vui lòng cung cấp ID đặt bàn",
                error: true,
                success: false
            });
        }

        const booking = await BookingModel.findById(_id);
        if (!booking) {
            return response.status(404).json({
                message: "Không tìm thấy đặt bàn",
                error: true,
                success: false
            });
        }

        // Update fields
        const updateData = {};
        if (customerName) updateData.customerName = customerName;
        if (phone) updateData.phone = phone;
        if (email !== undefined) updateData.email = email;
        if (numberOfGuests) updateData.numberOfGuests = numberOfGuests;
        if (specialRequests !== undefined) updateData.specialRequests = specialRequests;

        const updatedBooking = await BookingModel.findByIdAndUpdate(
            _id,
            updateData,
            { new: true, runValidators: true }
        ).populate('tableId', 'tableNumber capacity location');

        return response.status(200).json({
            message: "Cập nhật đặt bàn thành công",
            data: updatedBooking,
            error: false,
            success: false
        });

    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        });
    }
}

// Cancel booking
export async function cancelBookingController(request, response) {
    try {
        const { _id } = request.body;

        if (!_id) {
            return response.status(400).json({
                message: "Vui lòng cung cấp ID đặt bàn",
                error: true,
                success: false
            });
        }

        const booking = await BookingModel.findById(_id);
        if (!booking) {
            return response.status(404).json({
                message: "Không tìm thấy đặt bàn",
                error: true,
                success: false
            });
        }

        if (booking.status === 'cancelled') {
            return response.status(400).json({
                message: "Đặt bàn đã bị hủy trước đó",
                error: true,
                success: false
            });
        }

        if (booking.status === 'completed') {
            return response.status(400).json({
                message: "Không thể hủy đặt bàn đã hoàn thành",
                error: true,
                success: false
            });
        }

        booking.status = 'cancelled';
        await booking.save();

        // Send email
        if (booking.email) {
            await sendEmail({
                sendTo: booking.email,
                subject: "Thông báo hủy đặt bàn - EatEase Restaurant",
                html: bookingEmailTemplate(booking)
            });
        }

        // Refund logic
        if (booking.depositPaid && booking.paymentIntentId && !booking.depositRefunded) {
            const now = new Date();
            const bookingTime = new Date(booking.bookingDate);
            const timeDiff = bookingTime - now;
            const hoursDiff = timeDiff / (1000 * 60 * 60);

            // Refund 100% if cancelled by admin or > 24h before booking
            if (request.body.cancelledBy === 'admin' || hoursDiff > 24) {
                try {
                    const refund = await Stripe.refunds.create({
                        payment_intent: booking.paymentIntentId,
                    });
                    booking.depositRefunded = true;
                    booking.refundId = refund.id;
                    booking.depositRefundAmount = booking.depositAmount;
                    await booking.save();
                } catch (err) {
                    console.error("Refund failed:", err);
                }
            }
        }

        return response.status(200).json({
            message: "Hủy đặt bàn thành công",
            data: booking,
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

// Confirm booking (admin)
export async function confirmBookingController(request, response) {
    try {
        const { _id } = request.body;

        if (!_id) {
            return response.status(400).json({
                message: "Vui lòng cung cấp ID đặt bàn",
                error: true,
                success: false
            });
        }

        const booking = await BookingModel.findById(_id);
        if (!booking) {
            return response.status(404).json({
                message: "Không tìm thấy đặt bàn",
                error: true,
                success: false
            });
        }

        if (booking.status !== 'pending') {
            return response.status(400).json({
                message: "Chỉ có thể xác nhận đặt bàn đang chờ",
                error: true,
                success: false
            });
        }

        booking.status = 'confirmed';
        await booking.save();

        // Send email
        if (booking.email) {
            await sendEmail({
                sendTo: booking.email,
                subject: "Đặt bàn thành công - EatEase Restaurant",
                html: bookingEmailTemplate(booking)
            });
        }

        return response.status(200).json({
            message: "Xác nhận đặt bàn thành công",
            data: booking,
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

// Get available tables for booking
export async function getAvailableTablesForBookingController(request, response) {
    try {
        const { bookingDate, bookingTime, numberOfGuests } = request.body;

        if (!bookingDate || !bookingTime || !numberOfGuests) {
            return response.status(400).json({
                message: "Vui lòng cung cấp ngày, giờ và số người",
                error: true,
                success: false
            });
        }

        const selectedDate = new Date(bookingDate);

        // Get all tables with enough capacity
        const tables = await TableModel.find({
            capacity: { $gte: numberOfGuests },
            status: 'available'
        });

        // Get bookings for this date/time
        const bookedTables = await BookingModel.find({
            bookingDate: selectedDate,
            bookingTime,
            status: { $in: ['pending', 'confirmed'] }
        }).select('tableId');

        const bookedTableIds = bookedTables.map(b => b.tableId.toString());

        // Filter out booked tables
        const availableTables = tables.filter(
            table => !bookedTableIds.includes(table._id.toString())
        );

        return response.status(200).json({
            message: "Lấy danh sách bàn trống thành công",
            data: availableTables,
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

// Get customer bookings (by phone or email)
export async function getCustomerBookingsController(request, response) {
    try {
        const { phone, email } = request.body;

        if (!phone && !email) {
            return response.status(400).json({
                message: "Vui lòng cung cấp số điện thoại hoặc email",
                error: true,
                success: false
            });
        }

        const query = {};
        if (phone) query.phone = phone;
        if (email) query.email = email;

        const bookings = await BookingModel.find(query)
            .populate('tableId', 'tableNumber capacity location')
            .sort({ bookingDate: -1, bookingTime: -1 });

        return response.status(200).json({
            message: "Lấy danh sách đặt bàn thành công",
            data: bookings,
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

// Create Stripe Payment Session for Booking
export async function createBookingPaymentSession(request, response) {
    try {
        const { bookingId } = request.body;
        const userId = request.userId; // From auth middleware

        const booking = await BookingModel.findById(bookingId).populate('userId');
        if (!booking) {
            return response.status(404).json({
                message: "Không tìm thấy đặt bàn",
                error: true,
                success: false
            });
        }

        if (booking.depositPaid) {
            return response.status(400).json({
                message: "Đặt bàn này đã được thanh toán cọc",
                error: true,
                success: false
            });
        }

        if (booking.depositAmount <= 0) {
            return response.status(400).json({
                message: "Đặt bàn này không yêu cầu đặt cọc",
                error: true,
                success: false
            });
        }

        const params = {
            submit_type: 'pay',
            mode: 'payment',
            payment_method_types: ['card'],
            customer_email: booking.email,
            metadata: {
                bookingId: booking._id.toString(),
                type: 'booking_deposit'
            },
            line_items: [
                {
                    price_data: {
                        currency: 'vnd',
                        product_data: {
                            name: `Đặt cọc bàn cho ${booking.customerName}`,
                            description: `Đặt cọc cho ${booking.numberOfGuests} người vào ${new Date(booking.bookingDate).toLocaleDateString('vi-VN')} lúc ${booking.bookingTime}`,
                        },
                        unit_amount: booking.depositAmount,
                    },
                    quantity: 1,
                },
            ],
            success_url: `${process.env.FRONTEND_URL}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.FRONTEND_URL}/booking/cancel`,
        };

        const session = await Stripe.checkout.sessions.create(params);

        return response.status(200).json(session);

    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        });
    }
}

// Get booking report data for analytics
export async function getBookingReportData(request, response) {
    try {
        const { startDate, endDate } = request.query;

        // Build query
        const query = {};
        if (startDate) {
            query.bookingDate = { $gte: new Date(startDate) };
        }
        if (endDate) {
            query.bookingDate = {
                ...query.bookingDate,
                $lte: new Date(endDate)
            };
        }

        const bookings = await BookingModel.find(query)
            .populate('tableId', 'tableNumber')
            .populate('userId', 'name email')
            .sort({ bookingDate: -1 });

        // Calculate metrics
        const totalBookings = bookings.length;
        const cancelledBookings = bookings.filter(b => b.status === 'cancelled').length;
        const confirmedBookings = bookings.filter(b => b.status === 'confirmed').length;
        const pendingBookings = bookings.filter(b => b.status === 'pending').length;
        const completedBookings = bookings.filter(b => b.status === 'completed').length;

        const cancellationRate = totalBookings > 0
            ? ((cancelledBookings / totalBookings) * 100).toFixed(2)
            : 0;

        // Peak hours analysis
        const hourCounts = {};
        bookings.forEach(booking => {
            const hour = booking.bookingTime.split(':')[0];
            hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        });

        const peakHours = Object.entries(hourCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([hour, count]) => ({
                hour: `${hour}:00`,
                count
            }));

        // Average party size
        const totalGuests = bookings.reduce((sum, b) => sum + b.numberOfGuests, 0);
        const avgPartySize = totalBookings > 0
            ? (totalGuests / totalBookings).toFixed(1)
            : 0;

        // Bookings by date
        const bookingsByDate = {};
        bookings.forEach(booking => {
            const date = new Date(booking.bookingDate).toISOString().split('T')[0];
            if (!bookingsByDate[date]) {
                bookingsByDate[date] = {
                    date,
                    count: 0,
                    guests: 0
                };
            }
            bookingsByDate[date].count += 1;
            bookingsByDate[date].guests += booking.numberOfGuests;
        });

        return response.status(200).json({
            message: "Lấy báo cáo đặt bàn thành công",
            data: {
                summary: {
                    totalBookings,
                    confirmedBookings,
                    pendingBookings,
                    cancelledBookings,
                    completedBookings,
                    cancellationRate: parseFloat(cancellationRate),
                    avgPartySize: parseFloat(avgPartySize)
                },
                peakHours,
                bookingsByDate: Object.values(bookingsByDate).sort((a, b) =>
                    new Date(a.date) - new Date(b.date)
                ),
                statusDistribution: {
                    pending: pendingBookings,
                    confirmed: confirmedBookings,
                    cancelled: cancelledBookings,
                    completed: completedBookings
                },
                hourDistribution: hourCounts
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
