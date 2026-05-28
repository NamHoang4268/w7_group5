import React from 'react';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { hasRoutePermission } from '../utils/routePermissions';

const AdminPermission = ({ children }) => {
    const user = useSelector((state) => state.user);
    const location = useLocation();

    const hasPermission = hasRoutePermission(user.role, location.pathname);

    return (
        <>
            {hasPermission ? (
                children
            ) : (
                <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
                    <div className="text-center max-w-md">
                        <div className="text-6xl mb-4">🔒</div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">
                            Không có quyền truy cập
                        </h2>
                        <p className="text-gray-600 mb-4">
                            Bạn không có quyền truy cập vào trang này với vai
                            trò{' '}
                            <span className="font-semibold">{user.role}</span>.
                        </p>
                        <p className="text-sm text-gray-500">
                            Vui lòng liên hệ quản trị viên nếu bạn cần quyền
                            truy cập.
                        </p>
                    </div>
                </div>
            )}
        </>
    );
};

export default AdminPermission;
