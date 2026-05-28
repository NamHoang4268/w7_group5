import '@/index.css';
import { TooltipProvider } from '@/components/ui/tooltip';
import { SettingsProvider } from '@/contexts/settings-context';
import { Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';

import { Sidebar } from '@/components/adminDashboard/sidebar';
import { TopNav } from '@/components/adminDashboard/top-nav';
import { SupportChatProvider } from '@/contexts/SupportChatContext';

export default function AdminDashboard() {
    const user = useSelector((state: any) => state?.user);
    // Update colors based on theme
    const [colors, setColors] = useState<string[]>([]);

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

    return (
        <SettingsProvider>
            <TooltipProvider delayDuration={0}>
                <div className="min-h-screen flex">
                    <Sidebar />
                    <div className="flex-1 overflow-auto w-full">
                        <TopNav />
                        <div className={['CHEF', 'WAITER', 'CASHIER'].includes(user?.role) ? "container mx-auto p-2" : "container mx-auto p-6"}>
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
