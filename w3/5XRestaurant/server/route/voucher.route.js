import { Router } from 'express';
import auth from '../middleware/auth.js';
import {
    addVoucerController, bulkDeleteVouchersController,
    bulkUpdateVouchersStatusController, deleteVoucherController,
    getAllVoucherController, updateVoucherController,
    getAvailableVouchersController,
    applyVoucherController,
    getBestVoucherController,
    getVoucherOverviewController,
    getTopVouchersController,
    getUsageTrendController
} from '../controllers/voucher.controller.js';

const voucherRouter = Router()

voucherRouter.post('/add-voucher', auth, addVoucerController)
voucherRouter.get('/get-all-voucher', getAllVoucherController)
voucherRouter.put('/update-voucher', auth, updateVoucherController)
voucherRouter.delete('/delete-voucher', auth, deleteVoucherController)
voucherRouter.delete('/bulk-delete-vouchers', auth, bulkDeleteVouchersController)
voucherRouter.put('/bulk-update-vouchers-status', auth, bulkUpdateVouchersStatusController)

// Get available vouchers for checkout
voucherRouter.post('/available', getAvailableVouchersController)

// Apply a voucher
voucherRouter.post('/apply', applyVoucherController)

// Get best voucher combination
voucherRouter.post('/best', getBestVoucherController)

// Analytics routes (admin only)
voucherRouter.get('/analytics/overview', auth, getVoucherOverviewController)
voucherRouter.get('/analytics/top-vouchers', auth, getTopVouchersController)
voucherRouter.get('/analytics/usage-trend', auth, getUsageTrendController)

export default voucherRouter
