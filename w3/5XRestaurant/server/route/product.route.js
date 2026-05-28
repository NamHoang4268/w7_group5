import { Router } from "express";
import auth from './../middleware/auth.js';
import { admin } from '../middleware/Admin.js'
import {
    addProductController,
    deleteProductDetails,
    getProductByCategory,
    getProductByCategoryAndSubCategory,
    getProductController,
    getProductDetails,
    searchProduct,
    updateProductDetails,
    getInitialProducts
} from "../controllers/product.controller.js";

const productRouter = Router()

productRouter.post('/add-product', auth, admin, addProductController)
productRouter.post('/get-product', getProductController)
productRouter.post('/get-product-by-category', getProductByCategory)
productRouter.post('/get-product-by-category-and-subcategory', getProductByCategoryAndSubCategory)
productRouter.post('/get-product-details', getProductDetails)

//update product
productRouter.put('/update-product-details', auth, admin, updateProductDetails)

//delete product
productRouter.delete('/delete-product', auth, admin, deleteProductDetails)

//search product
productRouter.post('/search-product', searchProduct)

//get initial products
productRouter.post('/initial-products', getInitialProducts)

export default productRouter