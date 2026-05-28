import { Router } from "express";
import auth from "../middleware/auth.js";
import {
    createTableController,
    getAllTablesController,
    getTableByIdController,
    updateTableController,
    deleteTableController,
    updateTableStatusController,
    getAvailableTablesController,
    regenerateQRController
} from "../controllers/table.controller.js";
import {
    generateQRCodeController,
    getQRCodeController
} from "../controllers/tableQR.controller.js";

const tableRouter = Router();

tableRouter.post('/create', auth, createTableController);
tableRouter.get('/get-all', getAllTablesController);
tableRouter.get('/get/:id', getTableByIdController);
tableRouter.put('/update', auth, updateTableController);
tableRouter.delete('/delete', auth, deleteTableController);
tableRouter.patch('/update-status', auth, updateTableStatusController);
tableRouter.get('/available', getAvailableTablesController);

// QR Code routes
tableRouter.post('/generate-qr', auth, generateQRCodeController);
tableRouter.get('/qr/:id', getQRCodeController);
tableRouter.post('/regenerate-qr', auth, regenerateQRController);  // Fix bàn thiếu QR

export default tableRouter;
