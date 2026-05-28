import React from 'react';
import { useSelector } from 'react-redux';

const ManagerPermission = ({ children }) => {
    const user = useSelector((state) => state.user);

    // MANAGER role đã bị xóa – chỉ còn ADMIN có quyền
    const hasPermission = user?.role === 'ADMIN';

    return (
        <>
            {hasPermission ? (
                children
            ) : (
                <p className="text-red-600 bg-red-100 p-4 rounded">
                    Bạn không có quyền truy cập. Chỉ Admin mới có thể truy cập
                    trang này.
                </p>
            )}
        </>
    );
};

export default ManagerPermission;

