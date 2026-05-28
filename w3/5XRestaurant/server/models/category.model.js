import mongoose from "mongoose";

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Vui lòng nhập tên danh mục"],
        trim: true,
        maxlength: [100, "Tên danh mục không vượt quá 100 ký tự"],
        minlength: [2, "Tên danh mục ít nhất 2 ký tự"],
    },
    description: {
        type: String,
        default: "",
        maxlength: [500, "Mô tả không vượt quá 500 ký tự"],
    },
    image: {
        type: String,
        default: "",
        trim: true,
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    deletedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
})

const CategoryModel = mongoose.model("category", categorySchema)

export default CategoryModel