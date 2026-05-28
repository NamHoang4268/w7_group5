import React from 'react';
import { useSelector } from 'react-redux';

const TableOrdersPermission = ({ children }) => {
    const user = useSelector((state) => state.user);

    // Allow ADMIN and WAITER
    const hasPermission = ['ADMIN', 'WAITER'].includes(user?.role);

    return (
        <>
            {hasPermission ? (
                children
            ) : (
                <p className="text-red-600 bg-red-100 p-4 rounded">
                    Bạn không có quyền truy cập. Chỉ Admin và Waiter mới có thể
                    truy cập trang này.
                </p>
            )}
        </>
    );
};

export default TableOrdersPermission;

