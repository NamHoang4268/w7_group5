import { Router } from 'express';
import auth from '../middleware/auth.js';
import {
    addItemsToTableOrder,
    getCurrentTableOrder,
    checkoutTableOrder,
    cancelTableOrder,
    getAllActiveTableOrders,
    getCashierPendingOrders,
    confirmCashierPayment,
    cancelTableOrderItem,
    handleStripeWebhook,
    verifyStripeSession
} from '../controllers/tableOrder.controller.js';

const tableOrderRouter = Router();

tableOrderRouter.post('/add-items', auth, addItemsToTableOrder);
tableOrderRouter.get('/current', auth, getCurrentTableOrder);
tableOrderRouter.post('/checkout', auth, checkoutTableOrder);
tableOrderRouter.post('/cancel', auth, cancelTableOrder);
tableOrderRouter.get('/all-active', auth, getAllActiveTableOrders);

// Cashier payment routes
tableOrderRouter.get('/cashier-pending', auth, getCashierPendingOrders);
tableOrderRouter.post('/cashier-confirm', auth, confirmCashierPayment);

// Waiter cancel item
tableOrderRouter.delete('/item/:orderId/:itemId', auth, cancelTableOrderItem);

// US26 – Stripe webhook (no auth – Stripe calls this directly; raw body handled in index.js)
tableOrderRouter.post('/stripe-webhook', handleStripeWebhook);

// US26 – Verify stripe session (for success page)
tableOrderRouter.get('/verify-stripe-session', auth, verifyStripeSession);

export default tableOrderRouter;
