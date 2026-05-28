import { Router } from "express";
import auth from "../middleware/auth.js";
import {
    createBookingController,
    getAllBookingsController,
    getBookingByIdController,
    updateBookingController,
    cancelBookingController,
    confirmBookingController,
    getAvailableTablesForBookingController,
    getCustomerBookingsController,
    createBookingPaymentSession,
    getBookingReportData
} from "../controllers/booking.controller.js";

const bookingRouter = Router();

bookingRouter.post('/create', createBookingController);
bookingRouter.get('/get-all', auth, getAllBookingsController);
bookingRouter.get('/get/:id', getBookingByIdController);
bookingRouter.put('/update', auth, updateBookingController);
bookingRouter.delete('/cancel', cancelBookingController);
bookingRouter.patch('/confirm', auth, confirmBookingController);
bookingRouter.post('/available-tables', getAvailableTablesForBookingController);
bookingRouter.post('/customer-bookings', getCustomerBookingsController);
bookingRouter.post('/create-payment-session', createBookingPaymentSession);


// Report route
bookingRouter.get('/report', auth, getBookingReportData);

export default bookingRouter;
