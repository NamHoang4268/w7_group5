import uploadImageS3 from "../utils/uploadImageS3.js"

const uploadImageController = async (req, res) => {
    try {
        const file = req.file

        const uploadImage = await uploadImageS3(file)

        return res.json({
            message: 'Tải ảnh thành công',
            data: uploadImage,
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

export default uploadImageController