import { Router } from 'express';
import auth from '../middleware/auth.js';
import {
    markAsPaid,
    createStripeSession,
    handleStripeWebhook,
    getPaymentDetails,
    processRefund,
    generateReceipt
} from '../controllers/payment.controller.js';

const paymentRouter = Router();

// Webhook (no auth required)
paymentRouter.post('/stripe/webhook', handleStripeWebhook);

// Protected endpoints
paymentRouter.post('/mark-paid', auth, markAsPaid);
paymentRouter.post('/stripe/create-session', auth, createStripeSession);
paymentRouter.get('/:paymentId', auth, getPaymentDetails);
paymentRouter.post('/refund', auth, processRefund);
paymentRouter.post('/generate-receipt', auth, generateReceipt);

export default paymentRouter;
