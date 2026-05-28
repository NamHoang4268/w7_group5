import React from 'react';
import { useSelector } from 'react-redux';
import { Navigate, Outlet } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
    const user = useSelector((state) => state.user);

    // Nếu chưa login thì chặn truy cập
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // Nếu đã login thì render tiếp trang con
    return children;
};

export default ProtectedRoute;
