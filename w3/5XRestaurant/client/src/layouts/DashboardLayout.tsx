import '@/index.css';
import { TooltipProvider } from '@/components/ui/tooltip';
import { SettingsProvider } from '@/contexts/settings-context';
import { Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';

import { Sidebar } from '@/components/adminDashboard/sidebar';
import { TopNav } from '@/components/adminDashboard/top-nav';

/**
 * DashboardLayout – layout shell dùng chung cho tất cả staff dashboards:
 *   /dashboard          → ADMIN + staff chung
 *   /cashier-board      → CASHIER
 *   /chef-board         → CHEF
 *   /waiter-board       → WAITER
 *
 * Layout gồm Sidebar (role-aware) + TopNav, render nội dung qua <Outlet />.
 */
export default function DashboardLayout() {
    const user = useSelector((state: any) => state?.user);
    const [, setColors] = useState<string[]>([]);

    const updateColors = () => {
        const s = getComputedStyle(document.documentElement);
        setColors([
            s.getPropertyValue('--ether-1').trim(),
            s.getPropertyValue('--ether-2').trim(),
            s.getPropertyValue('--ether-3').trim(),
        ]);
    };

    useEffect(() => {
        updateColors();
        const observer = new MutationObserver(updateColors);
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class'],
        });
        return () => observer.disconnect();
    }, []);

    // Một số dashboard (Chef, Waiter, Cashier) muốn full-width, không cần container padding
    const isFullWidth = ['CHEF', 'WAITER', 'CASHIER'].includes(
        user?.role ?? ''
    );

    return (
        <SettingsProvider>
            <TooltipProvider delayDuration={0}>
                <div className="min-h-screen flex">
                    <Sidebar />
                    <div className="flex-1 overflow-auto w-full">
                        <TopNav />
                        <div
                            className={
                                isFullWidth ? 'w-full' : 'container mx-auto p-6'
                            }
                        >
                            <main className="w-full relative">
                                <Outlet />
                            </main>
                        </div>
                    </div>
                </div>
            </TooltipProvider>
        </SettingsProvider>
    );
}
