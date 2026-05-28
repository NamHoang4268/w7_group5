import jwt from "jsonwebtoken";
import UserModel from "../models/user.model.js";

const auth = async (req, res, next) => {
    try {
        const token =
            req.cookies.accessToken ||
            req.headers?.authorization?.split(" ")[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Yêu cầu xác thực"
            });
        }

        const decoded = jwt.verify(
            token,
            process.env.SECRET_KEY_ACCESS_TOKEN
        );

        req.userId = decoded.id || decoded._id;

        const user = await UserModel.findById(req.userId)
            .select("role name email employeeStatus");

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Người dùng không tồn tại"
            });
        }

        req.user = user;

        next();
    } catch (err) {
        return res.status(401).json({
            success: false,
            message:
                err.name === "TokenExpiredError"
                    ? "Token hết hạn"
                    : "Token không hợp lệ"
        });
    }
};

export default auth;