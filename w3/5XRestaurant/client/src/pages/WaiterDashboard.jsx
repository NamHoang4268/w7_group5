import React from 'react';
import { useSelector } from 'react-redux';
import { LayoutDashboard } from 'lucide-react';

const WaiterDashboard = () => {
    const user = useSelector((state) => state?.user);
    return (
        <div className="container mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-highlight uppercase flex items-center gap-2">
                        <LayoutDashboard className="h-6 w-6" />
                        Trang cho Nhân viên phục vụ
                    </h1>
                    <p className="text-muted-foreground">Chào mừng {user?.name}, đây là danh sách việc cần làm của bạn.</p>
                </div>
            </div>
        </div>
    );
};

export default WaiterDashboard;
