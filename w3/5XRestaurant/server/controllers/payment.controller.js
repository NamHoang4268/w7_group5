import PaymentModel from '../models/payment.model.js';
import TableOrderModel from '../models/tableOrder.model.js';
// OrderModel (legacy) đã được xóa — restaurant dùng tableOrderId
import UserModel from '../models/user.model.js';
import stripe from '../config/stripe.js';

// Helper: Check authorization
async function checkAuthorization(userId, requiredRoles) {
    const user = await UserModel.findById(userId);
    if (!user || !requiredRoles.includes(user.role)) {
        return null;
    }
    return user;
}

// Mark payment as paid (Cash payment)
export async function markAsPaid(request, response) {
    try {
        const { tableOrderId, orderId, amount, notes } = request.body;
        const userId = request.userId;

        // Validate user role
        const user = await checkAuthorization(userId, ['ADMIN', 'CASHIER', 'WAITER']);
        if (!user) {
            return response.status(403).json({
                message: 'Bạn không có quyền thực hiện hành động này',
                error: true,
                success: false
            });
        }

        // Create payment record
        const payment = new PaymentModel({
            amount,
            currency: 'VND',
            paymentMethod: 'cash',
            paymentStatus: 'completed',
            userId,
            tableOrderId: tableOrderId || null,
            orderId: orderId || null,
            notes,
            processingDetails: {
                processor: 'local',
                processedAt: new Date(),
                processingTime: 0
            }
        });

        payment.generateReceiptNumber();
        await payment.save();

        // Update related table order if exists
        if (tableOrderId) {
            await TableOrderModel.findByIdAndUpdate(
                tableOrderId,
                {
                    $set: {
                        paymentMethod: 'cash',
                        paymentStatus: 'paid',
                        paidAt: new Date(),
                        paymentId: payment._id
                    }
                }
            );
        }

        // Thực tế restaurant luôn dùng tableOrderId
        // orderId là legacy — đã xóa branch này

        return response.status(200).json({
            message: 'Thanh toán tiền mặt thành công',
            error: false,
            success: true,
            data: {
                paymentId: payment._id,
                receiptNumber: payment.receiptNumber,
                amount: payment.amount,
                paymentStatus: payment.paymentStatus
            }
        });

    } catch (error) {
        console.error('Error marking payment as paid:', error);
        return response.status(500).json({
            message: 'Lỗi khi xử lý thanh toán',
            error: true,
            success: false
        });
    }
}

// Create Stripe checkout session
export async function createStripeSession(request, response) {
    try {
        const { tableOrderId, orderId, amount, items } = request.body;
        const userId = request.userId;

        const user = await checkAuthorization(userId, ['ADMIN', 'CASHIER', 'CUSTOMER', 'WAITER']);
        if (!user) {
            return response.status(403).json({
                message: 'Bạn không có quyền thực hiện hành động này',
                error: true,
                success: false
            });
        }

        // Create payment record first
        const payment = new PaymentModel({
            amount,
            currency: 'VND',
            paymentMethod: 'stripe',
            paymentStatus: 'processing',
            userId,
            tableOrderId: tableOrderId || null,
            orderId: orderId || null,
            processingDetails: {
                processor: 'stripe'
            }
        });

        await payment.save();

        // Create Stripe session
        const lineItems = items.map(item => ({
            price_data: {
                currency: 'vnd',
                product_data: {
                    name: item.name,
                    description: item.description || ''
                },
                unit_amount: Math.round(item.price * 100) // Convert to cents
            },
            quantity: item.quantity
        }));

        const session = await stripe.checkout.sessions.create({
            client_reference_id: payment._id.toString(),
            customer_email: user.email,
            payment_method_types: ['card'],
            line_items: lineItems,
            mode: 'payment',
            success_url: `${process.env.CLIENT_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.CLIENT_URL}/payment/cancel`,
            metadata: {
                tableOrderId: tableOrderId || '',
                orderId: orderId || '',
                userId: userId.toString()
            }
        });

        // Update payment with Stripe session ID
        payment.stripeSessionId = session.id;
        payment.stripeCustomerId = session.customer;
        await payment.save();

        return response.status(200).json({
            message: 'Tạo phiên thanh toán Stripe thành công',
            error: false,
            success: true,
            data: {
                sessionId: session.id,
                url: session.url,
                paymentId: payment._id
            }
        });

    } catch (error) {
        console.error('Error creating Stripe session:', error);
        return response.status(500).json({
            message: 'Lỗi khi tạo phiên thanh toán',
            error: true,
            success: false
        });
    }
}

// Handle Stripe webhook
export async function handleStripeWebhook(request, response) {
    try {
        const sig = request.headers['stripe-signature'];
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

        let event;
        try {
            event = stripe.webhooks.constructEvent(
                request.body,
                sig,
                webhookSecret
            );
        } catch (error) {
            console.error('Webhook signature verification failed:', error);
            return response.status(400).send(`Webhook Error: ${error.message}`);
        }

        // Handle different event types
        switch (event.type) {
            case 'checkout.session.completed':
                await handleCheckoutSessionCompleted(event.data.object);
                break;
            case 'payment_intent.payment_failed':
                await handlePaymentFailed(event.data.object);
                break;
            case 'charge.refunded':
                await handleRefund(event.data.object);
                break;
        }

        response.json({ received: true });

    } catch (error) {
        console.error('Error handling Stripe webhook:', error);
        response.status(500).json({ error: 'Webhook handler error' });
    }
}

// Handle checkout.session.completed event
async function handleCheckoutSessionCompleted(session) {
    try {
        const payment = await PaymentModel.findById(session.client_reference_id);
        if (!payment) {
            console.warn('Payment not found for session:', session.id);
            return;
        }

        payment.paymentStatus = 'completed';
        payment.stripePaymentIntentId = session.payment_intent;
        payment.processingDetails.processedAt = new Date();
        await payment.save();

        // Update table order
        if (payment.tableOrderId) {
            await TableOrderModel.findByIdAndUpdate(
                payment.tableOrderId,
                {
                    $set: {
                        paymentStatus: 'paid',
                        paidAt: new Date(),
                        paymentId: payment._id
                    }
                }
            );
        }

        // orderId legacy — đã xóa, restaurant luôn dùng tableOrderId

        console.log('✅ Payment completed for session:', session.id);
    } catch (error) {
        console.error('Error handling checkout completion:', error);
    }
}

// Handle payment_intent.payment_failed event
async function handlePaymentFailed(intent) {
    try {
        // Find payment by payment intent ID
        const payment = await PaymentModel.findOne({
            stripePaymentIntentId: intent.id
        });

        if (payment) {
            payment.paymentStatus = 'failed';
            payment.failureReason = intent.last_payment_error?.message || 'Payment failed';
            payment.failureCode = intent.last_payment_error?.code || 'unknown';
            payment.retryCount++;
            payment.lastRetryAt = new Date();
            await payment.save();

            console.warn('Payment failed for intent:', intent.id);
        }
    } catch (error) {
        console.error('Error handling payment failure:', error);
    }
}

// Handle charge.refunded event
async function handleRefund(charge) {
    try {
        const payment = await PaymentModel.findOne({
            stripePaymentIntentId: charge.payment_intent
        });

        if (payment) {
            await payment.completeRefund(charge.refunds.data[0]?.id);
            console.log('✅ Refund processed for payment:', payment._id);
        }
    } catch (error) {
        console.error('Error handling refund:', error);
    }
}

// Get payment details
export async function getPaymentDetails(request, response) {
    try {
        const { paymentId } = request.params;
        const userId = request.userId;

        const payment = await PaymentModel.findById(paymentId)
            .populate('userId', 'name email role')
            .populate('tableOrderId')
            .populate('orderId');

        if (!payment) {
            return response.status(404).json({
                message: 'Không tìm thấy thông tin thanh toán',
                error: true,
                success: false
            });
        }

        // Authorization check (user's own payment or admin)
        const user = await UserModel.findById(userId);
        if (payment.userId._id.toString() !== userId && user.role !== 'ADMIN') {
            return response.status(403).json({
                message: 'Bạn không có quyền xem thông tin này',
                error: true,
                success: false
            });
        }

        return response.status(200).json({
            message: 'Lấy thông tin thanh toán thành công',
            error: false,
            success: true,
            data: payment
        });

    } catch (error) {
        console.error('Error getting payment details:', error);
        return response.status(500).json({
            message: 'Lỗi khi lấy thông tin thanh toán',
            error: true,
            success: false
        });
    }
}

// Process refund
export async function processRefund(request, response) {
    try {
        const { paymentId, amount, reason } = request.body;
        const userId = request.userId;

        // Check authorization
        const user = await checkAuthorization(userId, ['ADMIN', 'CASHIER']);
        if (!user) {
            return response.status(403).json({
                message: 'Bạn không có quyền thực hiện hành động này',
                error: true,
                success: false
            });
        }

        const payment = await PaymentModel.findById(paymentId);
        if (!payment) {
            return response.status(404).json({
                message: 'Không tìm thấy thanh toán',
                error: true,
                success: false
            });
        }

        // Process refund based on payment method
        if (payment.paymentMethod === 'stripe') {
            const refund = await stripe.refunds.create({
                payment_intent: payment.stripePaymentIntentId,
                amount: Math.round(amount * 100)
            });

            await payment.processRefund(amount, reason, userId);
            payment.refundDetails.stripeRefundId = refund.id;
            await payment.save();
        } else {
            // Manual refund for cash
            await payment.processRefund(amount, reason, userId);
            payment.refundDetails.refundApprovedBy = userId;
            payment.refundDetails.refundApprovedAt = new Date();
            await payment.save();
        }

        return response.status(200).json({
            message: 'Hoàn tiền thành công',
            error: false,
            success: true,
            data: {
                paymentId: payment._id,
                refundAmount: payment.refundAmount,
                refundStatus: payment.refundStatus
            }
        });

    } catch (error) {
        console.error('Error processing refund:', error);
        return response.status(500).json({
            message: 'Lỗi khi xử lý hoàn tiền',
            error: true,
            success: false
        });
    }
}

// Generate receipt
export async function generateReceipt(request, response) {
    try {
        const { paymentId } = request.body;
        const userId = request.userId;

        const payment = await PaymentModel.findById(paymentId)
            .populate('userId', 'name email phone')
            .populate('tableOrderId');

        if (!payment) {
            return response.status(404).json({
                message: 'Không tìm thấy thanh toán',
                error: true,
                success: false
            });
        }

        // Generate receipt number if not exists
        if (!payment.receiptNumber) {
            payment.generateReceiptNumber();
            await payment.save();
        }

        const receipt = {
            receiptNumber: payment.receiptNumber,
            date: payment.createdAt,
            customer: {
                name: payment.userId.name,
                email: payment.userId.email,
                phone: payment.userId.phone
            },
            items: payment.receiptDetails?.items || [],
            subtotal: payment.receiptDetails?.subtotal || 0,
            tax: payment.receiptDetails?.tax || 0,
            discount: payment.receiptDetails?.discount || 0,
            tip: payment.receiptDetails?.tip || 0,
            total: payment.amount,
            paymentMethod: payment.paymentMethod,
            paymentStatus: payment.paymentStatus,
            notes: payment.notes
        };

        return response.status(200).json({
            message: 'Tạo hóa đơn thành công',
            error: false,
            success: true,
            data: receipt
        });

    } catch (error) {
        console.error('Error generating receipt:', error);
        return response.status(500).json({
            message: 'Lỗi khi tạo hóa đơn',
            error: true,
            success: false
        });
    }
}

export default {
    markAsPaid,
    createStripeSession,
    handleStripeWebhook,
    getPaymentDetails,
    processRefund,
    generateReceipt
};
