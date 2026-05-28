import React from 'react';
import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import { getRoleHomePath } from '../utils/routePermissions';

/**
 * RoleGuard – bảo vệ route theo role.
 * Props:
 *   allowedRoles: string[]  – danh sách role được phép truy cập
 *   children: ReactNode
 */
const RoleGuard = ({ allowedRoles, children }) => {
    const user = useSelector((state) => state.user);

    // Chưa đăng nhập → về login
    if (!user?._id) {
        return <Navigate to="/login" replace />;
    }

    // Đúng role → render
    if (allowedRoles.includes(user.role)) {
        return children;
    }

    // Sai role → thông báo + nút về đúng dashboard
    const homePath = getRoleHomePath(user.role);
    return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
            <div className="text-center max-w-sm">
                <div className="text-7xl mb-4">🔒</div>
                <h2 className="text-2xl font-bold text-white mb-2">
                    Không có quyền truy cập
                </h2>
                <p className="text-gray-400 mb-1">
                    Tài khoản{' '}
                    <span className="text-amber-400 font-semibold">{user.name}</span>{' '}
                    (role:{' '}
                    <span className="text-amber-400 font-semibold">{user.role}</span>)
                    không được phép truy cập trang này.
                </p>
                <p className="text-gray-500 text-sm mb-6">
                    Trang này chỉ dành cho:{' '}
                    <span className="text-white">{allowedRoles.join(', ')}</span>.
                </p>
                <Navigate to={homePath} replace />
            </div>
        </div>
    );
};

export default RoleGuard;
