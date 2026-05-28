/**
 * Role-based authorization middleware
 * Checks if the authenticated user has one of the required roles
 */
const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
        // Check if user is authenticated
        if (!req.userId) {
            return res.status(401).json({
                message: "Chưa đăng nhập",
                error: true,
                success: false
            });
        }

        // Check if user object exists (should be populated by auth middleware)
        if (!req.user) {
            return res.status(401).json({
                message: "Thông tin người dùng không hợp lệ",
                error: true,
                success: false
            });
        }

        // Check if user has one of the allowed roles
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                message: "Không có quyền truy cập chức năng này",
                error: true,
                success: false,
                requiredRoles: allowedRoles,
                userRole: req.user.role
            });
        }

        // User has required role, proceed
        next();
    };
};

export default requireRole;
