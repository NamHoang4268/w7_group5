import express from 'express';
import auth from '../middleware/auth.js';
import {
    callWaiter,
    getPendingRequests,
    handleRequest
} from '../controllers/serviceRequest.controller.js';

const serviceRequestRouter = express.Router();

// Khách bàn gọi phục vụ
serviceRequestRouter.post('/call', auth, callWaiter);

// Waiter xem danh sách pending
serviceRequestRouter.get('/pending', auth, getPendingRequests);

// Waiter cập nhật trạng thái
serviceRequestRouter.patch('/:id/handle', auth, handleRequest);

export default serviceRequestRouter;
