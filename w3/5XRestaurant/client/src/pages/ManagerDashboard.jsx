import React from 'react';
import { useSelector } from 'react-redux';
import { LayoutDashboard } from 'lucide-react';

const ManagerDashboard = () => {
    const user = useSelector((state) => state?.user);
    return (
        <div className="container mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-highlight uppercase flex items-center gap-2">
                        <LayoutDashboard className="h-6 w-6" />
                        Quản lý nhà hàng
                    </h1>
                    <p className="text-muted-foreground">Chào mừng {user?.name}, đây là tổng quan dành cho Quản lý.</p>
                </div>
            </div>
            {/* Thêm các tính năng quản lý ở đây */}
        </div>
    );
};

export default ManagerDashboard;
