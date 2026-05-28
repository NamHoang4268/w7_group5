'use client';
import { useState, useEffect } from 'react';
import {
    BarChart2,
    Package,
    Layers,
    TicketPercent,
    Settings,
    HelpCircle,
    Menu,
    PanelLeftClose,
    LocateIcon,
    Clock,
    FileText,
    MessageSquare,
    ChevronDown,
    Users,
    Calendar,
    Utensils,
    CheckSquare,
    LayoutDashboard,
    TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
    TooltipProvider,
} from '@/components/ui/tooltip';
import { Link, useLocation } from 'react-router-dom';
import logo from '@/assets/logo.png';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { useSupportChat } from '@/contexts/SupportChatContext';
// TypeScript types for navigation
interface NavigationItem {
    name: string;
    href: string;
    icon: any;
    roles?: string[];
}
interface NavigationSection {
    key: string;
    title: string;
    icon: string;
    roles: string[];
    items: NavigationItem[];
}
// Grouped navigation sections
const navigationSections: NavigationSection[] = [
    {
        key: 'products',
        title: 'Quản lý Sản phẩm',
        icon: '📦',
        roles: ['ADMIN'],
        items: [
            { name: 'Danh mục', href: '/dashboard/category', icon: Layers },
            {
                name: 'Loại sản phẩm',
                href: '/dashboard/sub-category',
                icon: Layers,
            },
            { name: 'Sản phẩm', href: '/dashboard/product', icon: Package },
        ],
    },
    {
        key: 'restaurant',
        title: 'Quản lý Nhà hàng',
        icon: '🍽️',
        roles: ['ADMIN', 'WAITER', 'CASHIER'],
        items: [
            {
                name: 'Bàn ăn',
                href: '/dashboard/table',
                icon: Utensils,
                roles: ['ADMIN'],
            },
            {
                name: 'Đơn gọi món',
                href: '/dashboard/table-orders',
                icon: FileText,
                roles: ['WAITER'],
            },
            {
                name: 'Đặt bàn',
                href: '/dashboard/booking',
                icon: Calendar,
                roles: ['ADMIN', 'WAITER'],
            },
            {
                name: 'Báo cáo & Thống kê',
                href: '/dashboard/bill',
                icon: BarChart2,
                roles: ['ADMIN', 'WAITER', 'CASHIER'],
            },
        ],
    },
    {
        key: 'hr',
        title: 'Quản lý Nhân sự',
        icon: '👥',
        roles: ['ADMIN'],
        items: [
            {
                name: 'Nhân viên',
                href: '/dashboard/employee-management',
                icon: Users,
            },
            {
                name: 'Ca làm',
                href: '/dashboard/shift-management',
                icon: Clock,
            },
            {
                name: 'Chấm công',
                href: '/dashboard/attendance-management',
                icon: CheckSquare,
            },
        ],
    },
    {
        key: 'reports',
        title: 'Báo cáo & Khuyến mãi',
        icon: '📈',
        roles: ['ADMIN'],
        items: [
            {
                name: 'Mã giảm giá',
                href: '/dashboard/voucher',
                icon: TicketPercent,
            },
        ],
    },
    {
        key: 'employee',
        title: 'Nhân viên',
        icon: '💼',
        roles: ['WAITER', 'CHEF', 'CASHIER', 'ADMIN'],
        items: [
            {
                name: 'Dashboard',
                href: '/dashboard',
                icon: LayoutDashboard,
            },
            {
                name: 'Ca làm của tôi',
                href: '/dashboard/my-shifts',
                icon: Clock,
            },
            {
                name: 'Hiệu suất',
                href: '/dashboard/my-performance',
                icon: TrendingUp,
            },
        ],
    },
    {
        key: 'personal',
        title: 'Cá nhân',
        icon: '⚙️',
        roles: ['USER'],
        items: [
            {
                name: 'Lịch sử mua hàng',
                href: '/dashboard/my-orders',
                icon: Clock,
            },
        ],
    },
];
const bottomNavigation = [
    { name: 'Tài khoản', href: '/dashboard/profile', icon: Settings },
    {
        name: 'Hỗ trợ khách hàng',
        href: '/dashboard/support-chat',
        icon: MessageSquare,
        roles: ['ADMIN', 'WAITER', 'CASHIER'],
    },
];
export function Sidebar() {
    const { pathname } = useLocation();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    // State for collapsible menu sections
    const [expandedSections, setExpandedSections] = useState<
        Record<string, boolean>
    >({
        products: false,
        restaurant: false,
        hr: false,
        reports: false,
        employee: false,
        personal: false,
    });
    const user = useSelector((state: RootState) => state.user);
    const { unreadCount } = useSupportChat();
    // Auto-expand section based on current route (accordion behavior)
    useEffect(() => {
        const path = pathname;
        const newSections: Record<string, boolean> = {
            products: false,
            restaurant: false,
            hr: false,
            reports: false,
            employee: false,
            personal: false,
        };
        // Determine which section to expand
        if (
            path.includes('/category') ||
            path.includes('/sub-category') ||
            path.includes('/product')
        ) {
            newSections.products = true;
        } else if (
            path.includes('/table') ||
            path.includes('/booking') ||
            path.includes('/bill') ||
            path.includes('/report')
        ) {
            newSections.restaurant = true;
        } else if (
            path.includes('/employee-management') ||
            path.includes('/shift-management') ||
            path.includes('/attendance-management')
        ) {
            newSections.hr = true;
        } else if (path.includes('/voucher')) {
            newSections.reports = true;
        } else if (
            path === '/dashboard' ||
            path.includes('/my-shifts') ||
            path.includes('/my-performance')
        ) {
            newSections.employee = true;
        } else if (path.includes('/address') || path.includes('/my-orders')) {
            newSections.personal = true;
        }
        setExpandedSections(newSections);
    }, [pathname]);
    // Toggle section expand/collapse
    const toggleSection = (sectionKey: string) => {
        setExpandedSections((prev) => ({
            ...prev,
            [sectionKey]: !prev[sectionKey],
        }));
    };
    // NavItem component for individual links
    const NavItem = ({
        item,
        isBottom = false,
    }: {
        item: NavigationItem;
        isBottom?: boolean;
    }) => (
        <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
                <Link
                    to={item.href}
                    className={cn(
                        'flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors',
                        pathname === item.href
                            ? 'bg-muted-foreground/20 text-secondary-foreground'
                            : 'text-muted-foreground hover:bg-muted-foreground/20 hover:text-secondary-foreground',
                        isCollapsed && 'justify-center px-2'
                    )}
                >
                    <item.icon
                        className={cn('h-4 w-4', !isCollapsed && 'mr-3 mb-0.5')}
                    />
                    {!isCollapsed && <span>{item.name}</span>}
                    {item.name === 'Hỗ trợ khách hàng' && unreadCount > 0 && (
                        <span
                            className={cn(
                                'ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white',
                                isCollapsed && 'absolute -top-1 -right-1'
                            )}
                        >
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </Link>
            </TooltipTrigger>
            {isCollapsed && (
                <TooltipContent
                    side="right"
                    className="flex items-center gap-4"
                >
                    {item.name}
                </TooltipContent>
            )}
        </Tooltip>
    );
    // MenuSection component for collapsible groups
    const MenuSection = ({ section }: { section: NavigationSection }) => {
        // Filter items by role
        const visibleItems = section.items.filter(
            (item) => !item.roles || item.roles.includes(user.role)
        );
        if (visibleItems.length === 0) return null;
        const isExpanded = expandedSections[section.key];
        return (
            <div className="mb-1">
                <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                        <button
                            onClick={() => toggleSection(section.key)}
                            className={cn(
                                'w-full flex items-center justify-between px-3 py-2 rounded-md',
                                'text-sm font-semibold text-muted-foreground',
                                'hover:bg-muted-foreground/20 hover:text-secondary-foreground',
                                'transition-colors',
                                isCollapsed && 'justify-center px-2'
                            )}
                        >
                            {!isCollapsed && (
                                <>
                                    <div className="flex items-center gap-2">
                                        <span className="text-base">
                                            {section.icon}
                                        </span>
                                        <span>{section.title}</span>
                                    </div>
                                    <ChevronDown
                                        className={cn(
                                            'h-4 w-4 transition-transform duration-200',
                                            isExpanded && 'rotate-180'
                                        )}
                                    />
                                </>
                            )}
                            {isCollapsed && (
                                <span className="text-base">
                                    {section.icon}
                                </span>
                            )}
                        </button>
                    </TooltipTrigger>
                    {isCollapsed && (
                        <TooltipContent side="right">
                            {section.title}
                        </TooltipContent>
                    )}
                </Tooltip>
                {isExpanded && !isCollapsed && (
                    <div className="ml-6 mt-1 space-y-1">
                        {visibleItems.map((item) => (
                            <NavItem key={item.href} item={item} />
                        ))}
                    </div>
                )}
            </div>
        );
    };
    // Filter sections by user role
    const visibleSections = navigationSections.filter((section) =>
        section.roles.includes(user.role)
    );
    return (
        <TooltipProvider>
            <>
                <button
                    className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-background rounded-md shadow-md"
                    onClick={() => setIsMobileOpen(!isMobileOpen)}
                    aria-label="Toggle sidebar"
                >
                    <Menu className="h-6 w-6" />
                </button>
                <div
                    className={cn(
                        'fixed inset-y-0 z-20 flex flex-col bg-background transition-all duration-300 ease-in-out lg:static',
                        isCollapsed ? 'w-[72px]' : 'w-72',
                        isMobileOpen
                            ? 'translate-x-0'
                            : '-translate-x-full lg:translate-x-0'
                    )}
                >
                    <div className="border-b border-border">
                        <div
                            className={cn(
                                'flex h-16 items-center gap-2 px-4',
                                isCollapsed && 'justify-center px-2'
                            )}
                        >
                            {!isCollapsed && (
                                <Link
                                    to="/"
                                    className="lg:flex hidden items-center gap-1.5 font-semibold"
                                >
                                    <img
                                        src={logo}
                                        alt="EatEase logo"
                                        width={25}
                                        height={25}
                                    />
                                    <span className="tracking-wide">
                                        EatEase
                                    </span>
                                </Link>
                            )}
                            <Button
                                variant="ghost"
                                size="sm"
                                className={cn(
                                    'ml-auto h-8 w-8 lg:block hidden',
                                    isCollapsed && 'ml-0'
                                )}
                                onClick={() => setIsCollapsed(!isCollapsed)}
                            >
                                <PanelLeftClose
                                    className={cn(
                                        'h-5 w-5 transition-transform',
                                        isCollapsed && 'rotate-180'
                                    )}
                                />
                                <span className="sr-only">
                                    {isCollapsed ? 'Expand' : 'Collapse'}{' '}
                                    Sidebar
                                </span>
                            </Button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-auto">
                        <div
                            className={cn(
                                'flex lg:hidden h-16 items-center gap-2 pt-4 justify-center'
                            )}
                        >
                            <Link
                                to="/"
                                className="flex items-center gap-1.5 font-semibold"
                            >
                                <img
                                    src={logo}
                                    alt="EatEase logo"
                                    width={25}
                                    height={25}
                                />
                                <span className="tracking-wide">EatEase</span>
                            </Link>
                        </div>
                        <nav className="flex-1 space-y-1 px-2 py-4">
                            {visibleSections.map((section) => (
                                <MenuSection
                                    key={section.key}
                                    section={section}
                                />
                            ))}
                        </nav>
                    </div>
                    <div className="border-t border-border p-2">
                        <nav className="space-y-1">
                            {bottomNavigation
                                .filter(
                                    (item) =>
                                        !item.roles ||
                                        item.roles.includes(user.role)
                                )
                                .map((item) => (
                                    <NavItem key={item.name} item={item} isBottom />
                                ))}
                        </nav>
                    </div>
                </div>
            </>
        </TooltipProvider>
    );
}
