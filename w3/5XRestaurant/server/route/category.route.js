import { Router } from "express";
import auth from "../middleware/auth.js";
import {
    addCategoryController,
    deleteCategoryController,
    getCategoryController,
    updateCategoryController,
    getDeletedCategoriesController,
    restoreCategoryController,
    hardDeleteCategoryController
} from "../controllers/category.controller.js";

const categoryRouter = Router()

categoryRouter.post('/add-category', auth, addCategoryController)
categoryRouter.get('/get-category', getCategoryController)
categoryRouter.put('/update-category', auth, updateCategoryController)
categoryRouter.delete('/delete-category', auth, deleteCategoryController)

// New routes for soft delete functionality
categoryRouter.get('/get-deleted-categories', auth, getDeletedCategoriesController)
categoryRouter.put('/restore-category', auth, restoreCategoryController)
categoryRouter.delete('/hard-delete-category', auth, hardDeleteCategoryController)

export default categoryRouter