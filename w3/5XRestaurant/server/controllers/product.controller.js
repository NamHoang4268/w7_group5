import ProductModel from "../models/product.model.js"
import mongoose from "mongoose";

export const addProductController = async (req, res) => {
    try {
        const { name, image, category, subCategory, unit, stock,
            price, discount, description, more_details, options } = req.body

        if (!name || !image[0] || !category[0] || !unit || !stock || !price) {
            return res.status(400).json({
                message: "Vui lòng nhập đầy đủ thông tin bắt buộc",
                error: true,
                success: false
            })
        }

        const addProduct = new ProductModel({
            name,
            image,
            category,
            subCategory,
            unit,
            stock,
            price,
            discount,
            description,
            more_details,
            options
        })

        const saveProduct = await addProduct.save()

        if (!saveProduct) {
            return res.status(500).json({
                message: "Không thể tạo sản phẩm",
                error: true,
                success: false
            })
        }

        return res.json({
            message: "Thêm sản phẩm thành công",
            data: saveProduct,
            error: false,
            success: true
        })

    } catch (error) {
        return res.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}

export const getProductController = async (req, res) => {
    try {
        let { page, limit, search, minPrice, maxPrice, sort, category } = req.body;

        if (!page) page = 1;
        if (!limit) limit = 10;

        // Build query object
        const query = {};

        // Add search query if provided
        if (search && search.trim()) {
            const searchTerm = search.trim();
            // Check for invalid regex characters
            if (containsSpecialRegexChar(searchTerm)) {
                return res.status(400).json({
                    message: 'Từ khóa tìm kiếm không hợp lệ',
                    error: true,
                    success: false
                });
            }
            const safeSearch = escapeRegex(searchTerm);
            query.$or = [
                { name: { $regex: safeSearch, $options: 'i' } },
                { description: { $regex: safeSearch, $options: 'i' } },
            ];
        }

        // Add price range filter
        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = Number(minPrice);
            if (maxPrice) query.price.$lte = Number(maxPrice);
        }

        // Add category filter
        if (category && category !== 'all') {
            query.category = new mongoose.Types.ObjectId(category);
        }

        // Build sort object
        let sortOptions = {};

        // Apply sorting based on the sort parameter
        switch (sort) {
            case 'price_asc':
                sortOptions = { price: 1 };
                break;
            case 'price_desc':
                sortOptions = { price: -1 };
                break;
            case 'name_asc':
                sortOptions = { name: 1 };
                break;
            default: // 'newest' or any other value
                sortOptions = { createdAt: -1 };
        }

        const skip = (page - 1) * limit

        const [data, totalCount] = await Promise.all([
            ProductModel.find(query)
                .populate('category')
                .populate('subCategory')
                .sort(sortOptions)
                .skip(skip)
                .limit(limit),
            ProductModel.countDocuments(query)
        ]);

        return res.json({
            message: 'Dữ liệu sản phẩm',
            data: data,
            totalCount: totalCount,
            totalNoPage: Math.ceil(totalCount / limit),
            error: false,
            success: true
        })

    } catch (error) {
        return res.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}

export const getProductByCategory = async (request, response) => {
    try {
        let { id } = request.body;

        // Nếu id không tồn tại hoặc rỗng → trả về mảng trống
        if (!id || (Array.isArray(id) && id.length === 0)) {
            return response.json({
                message: "Danh sách sản phẩm theo danh mục",
                data: [],
                error: false,
                success: true
            });
        }

        // Đảm bảo id luôn là mảng
        if (!Array.isArray(id)) {
            id = [id];
        }

        // Validate ObjectIds to prevent CastError
        const validIds = id.filter(item => mongoose.Types.ObjectId.isValid(item));
        if (validIds.length === 0 && id.length > 0) {
            return response.status(400).json({
                message: "ID danh mục không hợp lệ",
                error: true,
                success: false
            });
        }

        const product = await ProductModel.find({
            category: { $in: validIds }
        })
            .populate('category')
            .populate('subCategory')
            .limit(15);

        return response.json({
            message: "Category Product List",
            data: product,
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
};

export const getProductByCategoryAndSubCategory = async (request, response) => {
    try {
        let { categoryId, subCategoryId, page, limit, sort, minPrice, maxPrice } = request.body;

        if (!categoryId || !subCategoryId) {
            return response.status(400).json({
                message: "Vui lòng cung cấp categoryId và subCategoryId",
                error: true,
                success: false
            })
        }

        if (!page) {
            page = 1
        }

        if (!limit) {
            limit = 10
        }

        // Validate ObjectIds to prevent CastError
        const categoryIds = Array.isArray(categoryId) ? categoryId : [categoryId];
        const subCategoryIds = Array.isArray(subCategoryId) ? subCategoryId : [subCategoryId];

        const validCategoryIds = categoryIds.filter(id => id && mongoose.Types.ObjectId.isValid(id));
        const validSubCategoryIds = subCategoryIds.filter(id => id && mongoose.Types.ObjectId.isValid(id));

        if (validCategoryIds.length === 0 || validSubCategoryIds.length === 0) {
            return response.status(400).json({
                message: "ID danh mục hoặc loại sản phẩm không hợp lệ",
                error: true,
                success: false
            });
        }

        const query = {
            category: { $in: validCategoryIds },
            subCategory: { $in: validSubCategoryIds }
        }

        // Add price range filter if provided
        if (minPrice !== undefined || maxPrice !== undefined) {
            query.price = {};
            if (minPrice !== undefined) {
                query.price.$gte = Number(minPrice);
            }
            if (maxPrice !== undefined) {
                query.price.$lte = Number(maxPrice);
            }
        }

        // Build sort options
        let sortOptions = {};

        // Apply sorting based on the sort parameter
        switch (sort) {
            case 'price_asc':
                sortOptions = { price: 1 };
                break;
            case 'price_desc':
                sortOptions = { price: -1 };
                break;
            case 'name_asc':
                sortOptions = { name: 1 };
                break;
            default: // 'newest' or any other value
                sortOptions = { createdAt: -1 };
        }

        const skip = (page - 1) * limit

        const [data, dataCount] = await Promise.all([
            ProductModel.find(query)
                .populate('category')
                .populate('subCategory')
                .sort(sortOptions)
                .skip(skip)
                .limit(limit),
            ProductModel.countDocuments(query)
        ]);

        return response.json({
            message: "Danh sách sản phẩm",
            data: data,
            totalCount: dataCount,
            page: page,
            limit: limit,
            success: true,
            error: false
        })

    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}

export const getProductDetails = async (request, response) => {
    try {
        const { productId } = request.body

        const product = await ProductModel.findOne({ _id: productId })
            .populate('category')
            .populate('subCategory');

        return response.json({
            message: "Chi tiết sản phẩm",
            data: product,
            error: false,
            success: true
        })

    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}

// Update Product
export const updateProductDetails = async (request, response) => {
    try {
        const { _id } = request.body

        if (!_id) {
            return response.status(400).json({
                message: "Vui lòng cung cấp mã sản phẩm (_id)",
                error: true,
                success: false
            })
        }

        const updateProduct = await ProductModel.updateOne({ _id: _id }, {
            ...request.body,
            options: request.body.options // Ensure options are updated
        })

        return response.json({
            message: "Cập nhật sản phẩm thành công",
            data: updateProduct,
            error: false,
            success: true
        })

    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}

// Delete Product
export const deleteProductDetails = async (request, response) => {
    try {
        const { _id } = request.body

        if (!_id) {
            return response.status(400).json({
                message: "Vui lòng cung cấp mã _id",
                error: true,
                success: false
            })
        }

        const deleteProduct = await ProductModel.deleteOne({ _id: _id })

        return response.json({
            message: "Xóa sản phẩm thành công",
            error: false,
            success: true,
            data: deleteProduct
        })
    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}

// Escape regex special characters
function escapeRegex(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Check invalid special characters that break regex
function containsSpecialRegexChar(text) {
    return /[.*+?^${}()|[\]\\]/.test(text);
}

// Search Product
export const searchProduct = async (request, response) => {
    try {
        let { search, page = 1, limit = 12, minPrice, maxPrice, sort = 'newest', category } = request.body;

        const skip = (page - 1) * limit;

        // 🔥 Trim chuỗi để loại bỏ khoảng trắng đầu/cuối
        search = search?.trim();

        // ⛔ Không có nội dung tìm kiếm
        if (!search) {
            return response.status(400).json({
                message: 'Vui lòng nhập từ khóa tìm kiếm',
                error: true,
                success: false,
            });
        }

        // ⛔ Không cho nhập ký tự regex đặc biệt
        if (containsSpecialRegexChar(search)) {
            return response.status(400).json({
                message: 'Từ khóa không hợp lệ',
                error: true,
                success: false,
            });
        }

        // 🔥 Escape từ khóa để regex không bị crash
        const safeSearch = escapeRegex(search);

        // Build the query
        const query = {
            $or: [
                { name: { $regex: safeSearch, $options: 'i' } },
                { description: { $regex: safeSearch, $options: 'i' } },
            ],
        };

        // Add price range filter
        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = Number(minPrice);
            if (maxPrice) query.price.$lte = Number(maxPrice);
        }

        // Add category filter
        if (category) {
            query.category = new mongoose.Types.ObjectId(category);
        }

        // Build sort options
        let sortOptions = {};
        switch (sort) {
            case 'price_asc':
                sortOptions = { price: 1 };
                break;
            case 'price_desc':
                sortOptions = { price: -1 };
                break;
            case 'name_asc':
                sortOptions = { name: 1 };
                break;
            default:
                sortOptions = { createdAt: -1 };
        }

        // Execute search + count
        const [products, total] = await Promise.all([
            ProductModel.find(query)
                .sort(sortOptions)
                .skip(skip)
                .limit(limit)
                .populate('category subCategory'),
            ProductModel.countDocuments(query),
        ]);

        const totalPage = Math.ceil(total / limit);

        return response.json({
            message: 'Kết quả tìm kiếm',
            data: products,
            totalCount: total,
            totalNoPage: totalPage,
            currentPage: page,
            success: true,
            error: false,
        });

    } catch (error) {
        return response.status(500).json({
            message: error.message || 'Lỗi server',
            error: true,
            success: false,
        });
    }
};

// Get initial products for homepage
export const getInitialProducts = async (req, res) => {
    try {
        const { page = 1, limit = 12, minPrice, maxPrice, sort = 'newest', category } = req.body;
        const skip = (page - 1) * limit;

        // Build the query
        const query = { publish: true }; // Only get published products

        // Add category filter if provided
        if (category) {
            query['category'] = new mongoose.Types.ObjectId(category);
        }

        // Add price range filter if provided
        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = Number(minPrice);
            if (maxPrice) query.price.$lte = Number(maxPrice);
        }

        // Build sort object based on sort parameter
        let sortOptions = {};

        // Apply sorting based on the sort parameter
        switch (sort) {
            case 'price_asc':
                sortOptions = { price: 1 };
                break;
            case 'price_desc':
                sortOptions = { price: -1 };
                break;
            case 'name_asc':
                sortOptions = { name: 1 };
                break;
            case 'newest':
            default:
                sortOptions = { createdAt: -1 };
                break;
        }

        const [products, total] = await Promise.all([
            ProductModel.find(query)
                .sort(sortOptions)
                .skip(skip)
                .limit(limit)
                .populate('category subCategory'),
            ProductModel.countDocuments(query),
        ]);

        const totalPage = Math.ceil(total / limit);

        return res.json({
            message: 'Lấy sản phẩm thành công',
            data: products,
            totalPage,
            totalCount: total,
            success: true,
            error: false,
        });
    } catch (error) {
        return res.status(500).json({
            message: error.message || 'Lỗi server',
            error: true,
            success: false,
        });
    }
};