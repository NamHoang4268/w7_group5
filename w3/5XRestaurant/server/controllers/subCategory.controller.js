import SubCategoryModel from "../models/subCategory.model.js"

export const addSubCategoryController = async (req, res) => {
    try {
        const { name, image, category } = req.body

        if (!name || !image || !category[0]) {
            return res.status(400).json({
                message: "Vui lòng điền đầy đủ các trường bắt buộc.",
                error: true,
                success: false
            })
        }

        const addSubCategory = new SubCategoryModel({
            name,
            image,
            category
        })

        const saveCategory = await addSubCategory.save()

        if (!saveCategory) {
            return res.status(500).json({
                message: "Không tạo được",
                error: true,
                success: false
            })
        }

        return res.json({
            message: "Thêm loại sản phẩm thành công",
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

export const getSubCategoryController = async (req, res) => {
    try {
        const data = await SubCategoryModel.find().sort({ createdAt: -1 }).populate('category')

        return res.json({
            message: 'Loại sản phẩm Data',
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

export const updateSubCategoryController = async (req, res) => {
    try {
        const { _id, name, image, category } = req.body

        const check = await SubCategoryModel.findById(_id)

        if (!check) {
            return res.status(400).json({
                message: 'Không tìm thấy _id',
                error: true,
                success: false
            })
        }

        const update = await SubCategoryModel.findByIdAndUpdate(
            _id,
            { name, image, category },
            { new: true }
        );

        return res.json({
            message: 'Cập nhật loại sản phẩm thành công',
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

export const deleteSubCategoryController = async (req, res) => {
    try {
        const { _id } = req.body

        const deleteSubCategory = await SubCategoryModel.findByIdAndDelete(_id)

        return res.json({
            message: 'Xóa loại sản phẩm thành công',
            data: deleteSubCategory,
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