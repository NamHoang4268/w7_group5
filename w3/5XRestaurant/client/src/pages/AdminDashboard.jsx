import React from 'react';
import { useSelector } from 'react-redux';
import { LayoutDashboard } from 'lucide-react';

const AdminDashboard = () => {
    const user = useSelector((state) => state?.user);
    return (
        <div className="container mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-highlight uppercase flex items-center gap-2">
                        <LayoutDashboard className="h-6 w-6" />
                        Quản trị hệ thống
                    </h1>
                    <p className="text-muted-foreground">Chào mừng {user?.name}, đây là tổng quan hệ thống dành cho Admin.</p>
                </div>
            </div>
            {/* Thêm các biểu đồ/thống kê Admin ở đây */}
        </div>
    );
};

export default AdminDashboard;
