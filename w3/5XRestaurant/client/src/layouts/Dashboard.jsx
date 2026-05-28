import React from 'react';
import UserMenu from '../components/UserMenu';
import { Outlet } from 'react-router-dom';

const Dashboard = () => {
    return (
        <div
            className={`min-h-screen flex flex-col bg-white p-4 container shadow-lg rounded-lg mx-auto`}
        >
            {/* Header sẽ render ở layout cha */}

            <div className="flex-1 flex overflow-hidden gap-4">
                {/* Sidebar */}
                <div className="hidden lg:block w-[300px] bg-white border-r border-gray-200 overflow-y-auto">
                    <div className="py-5">
                        <UserMenu />
                    </div>
                </div>

                {/* Main content */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    <main className="flex-1 overflow-y-auto overflow-x-hidden bg-white">
                        <Outlet />
                    </main>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
