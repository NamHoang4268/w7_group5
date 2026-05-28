import ProductModel from '../models/product.model.js';
import CategoryModel from './../models/category.model.js';

export const addCategoryController = async (req, res) => {
    try {
        const { name, description, image } = req.body

        if (!name || !image) {
            return res.status(400).json({
                message: "Vui lòng điền đầy đủ các trường bắt buộc.",
                error: true,
                success: false
            })
        }

        // Check if category with the same name already exists (case insensitive)
        const existingCategory = await CategoryModel.findOne({
            name: { $regex: new RegExp(`^${name}$`, 'i') }
        });

        if (existingCategory) {
            return res.status(400).json({
                message: `Danh mục "${name}" đã tồn tại. Vui lòng chọn tên khác.`,
                error: true,
                success: false
            });
        }

        const addCategory = new CategoryModel({
            name,
            image,
            description: description || '',
        })

        const saveCategory = await addCategory.save()

        if (!saveCategory) {
            return res.status(500).json({
                message: "Không tạo được danh mục",
                error: true,
                success: false
            })
        }

        return res.json({
            message: "Thêm danh mục thành công",
            data: saveCategory,
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

export const getCategoryController = async (req, res) => {
    try {
        // Only get categories that are not deleted
        const data = await CategoryModel.find({ isDeleted: false }).sort({ createdAt: -1 })

        return res.json({
            message: 'Danh mục Data',
            data: data,
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

export const updateCategoryController = async (req, res) => {
    try {
        const { _id, name, description, image } = req.body

        const check = await CategoryModel.findById(_id)

        if (!check) {
            return res.status(400).json({
                message: 'Không tìm thấy _id',
                error: true,
                success: false
            })
        }

        const update = await CategoryModel.findByIdAndUpdate(
            _id,
            { name, description, image },
            { new: true }
        )

        return res.json({
            message: 'Cập nhật danh mục thành công',
            error: false,
            success: true,
            data: update
        })

    } catch (error) {
        return res.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}

// Soft delete category
export const deleteCategoryController = async (req, res) => {
    try {
        const { _id } = req.body

        const category = await CategoryModel.findById(_id)

        if (!category) {
            return res.status(404).json({
                message: "Không tìm thấy danh mục",
                error: true,
                success: false
            })
        }

        // Soft delete: set isDeleted to true
        category.isDeleted = true
        category.deletedAt = new Date()
        await category.save()

        return res.json({
            message: 'Xóa danh mục thành công',
            data: category,
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

// Get deleted categories
export const getDeletedCategoriesController = async (req, res) => {
    try {
        const data = await CategoryModel.find({ isDeleted: true }).sort({ deletedAt: -1 })

        return res.json({
            message: 'Danh mục đã xóa',
            data: data,
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

// Restore deleted category
export const restoreCategoryController = async (req, res) => {
    try {
        const { _id } = req.body

        const category = await CategoryModel.findById(_id)

        if (!category) {
            return res.status(404).json({
                message: "Không tìm thấy danh mục",
                error: true,
                success: false
            })
        }

        if (!category.isDeleted) {
            return res.status(400).json({
                message: "Danh mục chưa bị xóa",
                error: true,
                success: false
            })
        }

        // Restore: set isDeleted to false
        category.isDeleted = false
        category.deletedAt = null
        await category.save()

        return res.json({
            message: 'Khôi phục danh mục thành công',
            data: category,
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

// Hard delete category (permanently delete)
export const hardDeleteCategoryController = async (req, res) => {
    try {
        const { _id } = req.body

        const checkProduct = await ProductModel.find({
            category: {
                '$in': [_id]
            }
        }).countDocuments()

        if (checkProduct > 0) {
            return res.status(400).json({
                message: "Danh mục đã được sử dụng, không thể xóa vĩnh viễn",
                error: true,
                success: false
            })
        }

        const deleteCategory = await CategoryModel.findByIdAndDelete(_id)

        if (!deleteCategory) {
            return res.status(404).json({
                message: "Không tìm thấy danh mục",
                error: true,
                success: false
            })
        }

        return res.json({
            message: 'Xóa vĩnh viễn danh mục thành công',
            data: deleteCategory,
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