import { useEffect, useRef, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Divider from './Divider';
import Axios, { setIsLoggingOut } from './../utils/Axios';
import SummaryApi from '../common/SummaryApi';
import { logout, updateUserPoints } from '../store/userSlice';
import { toast } from 'react-hot-toast';
import AxiosToastError from './../utils/AxiosToastError';
import { BiRefresh } from 'react-icons/bi';
import { ChevronDown } from 'lucide-react';
import GradientText from './GradientText';
import isAdmin from '@/utils/isAdmin';
import { RiExternalLinkFill } from 'react-icons/ri';
import defaultAvatar from '@/assets/defaultAvatar.png';
import ShinyText from './animations/ShinyText';
import { useTheme } from 'next-themes';

const UserMenu = ({ close }) => {
    const user = useSelector((state) => state.user);
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();
    const menuRef = useRef();
    const [isLoadingPoints, setIsLoadingPoints] = useState(false);
    const { theme } = useTheme();

    // State for collapsible menu sections
    const [expandedSections, setExpandedSections] = useState({
        products: false,
        restaurant: false,
        hr: false,
        reports: false,
        employee: false,
        personal: false,
    });

    // Function to fetch user points
    const fetchUserPoints = useCallback(async () => {
        try {
            setIsLoadingPoints(true);
            const token = localStorage.getItem('token');
            if (!token) return;

            const response = await Axios.get(SummaryApi.user_points.url, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.data.success && response.data.data) {
                dispatch(updateUserPoints(response.data.data.points || 0));
            }
        } catch (error) {
            console.error('Error fetching user points:', error);
        } finally {
            setIsLoadingPoints(false);
        }
    }, [dispatch]);

    // Fetch points when menu opens
    useEffect(() => {
        const fetchData = async () => {
            if (user?._id) {
                await fetchUserPoints();
            }
        };

        fetchData();
    }, [user?._id, fetchUserPoints]);

    // Auto-expand section based on current route (accordion behavior)
    useEffect(() => {
        const path = location.pathname;

        // Reset all sections first
        const newSections = {
            products: false,
            restaurant: false,
            hr: false,
            reports: false,
            employee: false,
            personal: false,
        };

        // Then open only the relevant section
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
            path.includes('/employee-dashboard') ||
            path.includes('/my-shifts') ||
            path.includes('/my-performance')
        ) {
            newSections.employee = true;
        } else if (path.includes('/my-orders')) {
            newSections.personal = true;
        }

        setExpandedSections(newSections);
    }, [location.pathname]);

    // Function to check if a path is active
    const isActive = (path) => {
        // Exact match for root path
        if (path === '/dashboard' && location.pathname === '/dashboard')
            return true;
        // Exact match
        if (location.pathname === path) return true;
        // Check if current path starts with the given path followed by a slash (for nested routes)
        // This prevents /dashboard/table from matching /dashboard/table-orders
        return (
            location.pathname.startsWith(path + '/') && path !== '/dashboard'
        );
    };

    const handleLogout = async () => {
        try {
            const response = await Axios({
                ...SummaryApi.logout,
            });

            if (response.data.success) {
                if (close) {
                    close();
                }
                // Clear Redux state immediately
                dispatch(logout());
                setIsLoggingOut(true);

                // Clear localStorage
                localStorage.removeItem('accesstoken');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('checkoutSelectedItems');

                toast.success(response.data.message);
                navigate('/');
            }
        } catch (error) {
            AxiosToastError(error);
        }
    };

    const handleClose = () => {
        if (close) {
            close();
        }
    };

    // Toggle section expand/collapse
    const toggleSection = (section) => {
        setExpandedSections((prev) => ({
            ...prev,
            [section]: !prev[section],
        }));
    };

    // MenuLink Component for consistent styling
    const MenuLink = ({ to, children, onClick = handleClose }) => {
        const active = isActive(to);
        return (
            <Link
                onClick={onClick}
                to={to}
                className={`flex items-center gap-4 px-4 py-2.5 rounded-lg transition-all duration-300 ease-out cursor-pointer hover:scale-[1.01] active:scale-[0.99] text-foreground ${
                    active ? 'font-semibold shadow-md' : 'font-medium'
                }`}
                style={
                    active
                        ? {
                              background: 'rgba(201, 96, 72, 0.15)',
                              color: '#C96048',
                          }
                        : {}
                }
                onMouseEnter={(e) => {
                    if (!active) {
                        e.currentTarget.style.background =
                            'rgba(var(--card-rgb, 255, 255, 255), 0.5)';
                    }
                }}
                onMouseLeave={(e) => {
                    if (!active) {
                        e.currentTarget.style.background = 'transparent';
                    }
                }}
            >
                <span className="text-sm">{children}</span>
            </Link>
        );
    };

    // MenuSection Component for collapsible groups
    const MenuSection = ({
        title,
        icon,
        sectionKey,
        children,
        show = true,
    }) => {
        if (!show) return null;

        const isExpanded = expandedSections[sectionKey];

        return (
            <div className="mb-1">
                <button
                    onClick={() => toggleSection(sectionKey)}
                    className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg transition-all hover:scale-[1.01] active:scale-[0.99] text-foreground"
                    style={{
                        background: isExpanded
                            ? 'rgba(201, 96, 72, 0.08)'
                            : 'transparent',
                    }}
                    onMouseEnter={(e) => {
                        if (!isExpanded) {
                            e.currentTarget.style.background =
                                'rgba(var(--card-rgb, 255, 255, 255), 0.5)';
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (!isExpanded) {
                            e.currentTarget.style.background = 'transparent';
                        }
                    }}
                >
                    <div className="flex items-center gap-2.5">
                        <span className="text-base">{icon}</span>
                        <span className="font-semibold text-sm">{title}</span>
                    </div>
                    <ChevronDown
                        className={`transition-transform duration-200 ${
                            isExpanded ? 'rotate-180' : ''
                        }`}
                        size={16}
                        style={{ color: '#C96048' }}
                    />
                </button>
                {isExpanded && (
                    <div className="ml-6 mt-1 space-y-0.5">{children}</div>
                )}
            </div>
        );
    };

    return (
        <div
            ref={menuRef}
            className="rounded-xl shadow-2xl overflow-hidden w-full border border-border"
            style={{
                background: 'rgba(var(--card-rgb, 255, 255, 255), 0.95)',
                backdropFilter: 'blur(20px)',
            }}
        >
            <div className="p-4 py-3">
                <div className="flex items-center gap-3">
                    <Link
                        to={'/dashboard/profile'}
                        className="relative w-16 flex-shrink-0 hover:opacity-85 transition-opacity"
                    >
                        <img
                            src={user?.avatar || defaultAvatar}
                            alt={user?.name}
                            className="w-16 h-16 p-0.5 rounded-full object-cover border-2"
                            style={{
                                borderColor: '#C96048',
                            }}
                        />
                        {user.role === 'ADMIN' && (
                            <span
                                className="absolute -bottom-1 text-white text-xs font-medium px-2.5 py-0.5 rounded-full"
                                style={{
                                    background:
                                        'linear-gradient(135deg, #C96048 0%, #d97a66 100%)',
                                }}
                            >
                                Quản trị
                            </span>
                        )}
                    </Link>
                    <div className="min-w-0">
                        <Link
                            to={'/dashboard/profile'}
                            className="flex items-center gap-1 text-sm font-bold truncate hover:opacity-80 transition-opacity text-foreground"
                            title="Tài khoản"
                        >
                            <ShinyText
                                text={user?.name || 'User'}
                                disabled={false}
                                speed={3}
                                color={theme === 'dark' ? '#e5e5e5' : '#1a1a1a'}
                                shineColor={
                                    theme === 'dark' ? '#ffffff' : '#C96048'
                                }
                                spread={90}
                            />
                            <RiExternalLinkFill
                                className="mb-2 flex-shrink-0"
                                style={{ color: '#C96048' }}
                            />
                        </Link>
                        <p className="text-xs truncate text-muted-foreground">
                            {user?.email}
                        </p>
                    </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                    <GradientText
                        colors={[
                            '#FFD700',
                            '#FFB300',
                            '#FF8C00',
                            '#FF4500',
                            '#B22222',
                        ]}
                        animationSpeed={3}
                        showBorder={false}
                        className="custom-class"
                    >
                        <span className="text-xs">Điểm tích lũy:</span>
                        {isLoadingPoints ? (
                            <BiRefresh className="animate-spin" />
                        ) : (
                            <span className="text-xs font-bold px-2">
                                {user?.rewardsPoint?.toLocaleString() || 0}
                            </span>
                        )}
                    </GradientText>
                    <button
                        onClick={fetchUserPoints}
                        disabled={isLoadingPoints}
                        className="hover:opacity-70 disabled:opacity-50 transition-opacity"
                        style={{ color: '#C96048' }}
                    >
                        <BiRefresh
                            className={`inline-block ${
                                isLoadingPoints ? 'animate-spin' : ''
                            }`}
                        />
                    </button>
                </div>
            </div>
            <Divider />
            <div className="lg:text-sm text-xs grid gap-1 font-semibold">
                {/* ADMIN - Products Section */}
                <MenuSection
                    title="Quản lý Sản phẩm"
                    icon="📦"
                    sectionKey="products"
                    show={isAdmin(user.role)}
                >
                    <MenuLink to="/dashboard/category">
                        Quản lý Danh mục
                    </MenuLink>
                    <MenuLink to="/dashboard/sub-category">
                        Quản lý Loại sản phẩm
                    </MenuLink>
                    <MenuLink to="/dashboard/product">
                        Quản lý Sản phẩm
                    </MenuLink>
                </MenuSection>
                {/* Restaurant Section - ADMIN, WAITER, CASHIER */}
                <MenuSection
                    title={
                        user.role === 'WAITER' || user.role === 'CASHIER'
                            ? 'Công việc'
                            : 'Quản lý Nhà hàng'
                    }
                    icon="🍽️"
                    sectionKey="restaurant"
                    show={['ADMIN', 'WAITER', 'CASHIER'].includes(user.role)}
                >
                    {user.role === 'ADMIN' && (
                        <MenuLink to="/dashboard/table">
                            Quản lý Bàn ăn
                        </MenuLink>
                    )}
                    {user.role === 'WAITER' && (
                        <MenuLink to="/dashboard/table-orders">
                            Quản lý Đơn gọi món
                        </MenuLink>
                    )}
                    {['ADMIN', 'WAITER'].includes(user.role) && (
                        <MenuLink to="/dashboard/booking">
                            Danh sách Đặt bàn
                        </MenuLink>
                    )}
                    {['ADMIN', 'WAITER', 'CASHIER'].includes(user.role) && (
                        <MenuLink to="/dashboard/bill">
                            {user.role === 'CASHIER'
                                ? 'Xử lý Thanh toán'
                                : 'Danh sách Hóa đơn'}
                        </MenuLink>
                    )}
                    {user.role === 'ADMIN' && (
                        <MenuLink to="/dashboard/report">
                            Báo cáo Thống kê
                        </MenuLink>
                    )}
                </MenuSection>
                {/* HR Section - ADMIN only */}
                <MenuSection
                    title="Quản lý Nhân sự"
                    icon="👥"
                    sectionKey="hr"
                    show={user.role === 'ADMIN'}
                >
                    <MenuLink to="/dashboard/employee-management">
                        Quản lý Nhân viên
                    </MenuLink>
                    <MenuLink to="/dashboard/shift-management">
                        Quản lý Ca làm
                    </MenuLink>
                    <MenuLink to="/dashboard/attendance-management">
                        Quản lý Chấm công
                    </MenuLink>
                </MenuSection>
                {/* Reports & Voucher Section - ADMIN only */}
                <MenuSection
                    title="Báo cáo & Khuyến mãi"
                    icon="📈"
                    sectionKey="reports"
                    show={isAdmin(user.role)}
                >
                    <MenuLink to="/dashboard/voucher">
                        Quản lý Mã giảm giá
                    </MenuLink>
                </MenuSection>
                {/* Employee Section - WAITER, CHEF, CASHIER */}
                <MenuSection
                    title="Nhân viên"
                    icon="💼"
                    sectionKey="employee"
                    show={['WAITER', 'CHEF', 'CASHIER'].includes(user.role)}
                >
                    <MenuLink to="/dashboard/employee-dashboard">
                        Dashboard Nhân viên
                    </MenuLink>
                    <MenuLink to="/dashboard/my-shifts">
                        Ca làm của tôi
                    </MenuLink>
                    <MenuLink to="/dashboard/my-performance">
                        Hiệu suất của tôi
                    </MenuLink>
                </MenuSection>
                {/* Personal Section - USER only */}
                <MenuSection
                    title="Cá nhân"
                    icon="👤"
                    sectionKey="personal"
                    show={user.role === 'CUSTOMER'}
                >
                    <MenuLink to="/dashboard/profile">
                        Thông tin cá nhân
                    </MenuLink>
                    <MenuLink to="/dashboard/my-orders">
                        Đơn hàng của tôi
                    </MenuLink>
                    <MenuLink to="/dashboard/address">
                        Địa chỉ giao hàng
                    </MenuLink>
                    <MenuLink to="/booking">Đặt bàn</MenuLink>
                    <MenuLink to="/dashboard/chat-support-customer">
                        Hỗ trợ khách hàng
                    </MenuLink>
                </MenuSection>

                <Divider />
                <div className="pb-2 px-2">
                    <button
                        onClick={handleLogout}
                        className="w-full text-sm text-center px-4 py-3 rounded-xl transition-all duration-300 ease-out cursor-pointer hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] text-white font-medium"
                        style={{
                            background:
                                'linear-gradient(135deg, #C96048 0%, #d97a66 100%)',
                        }}
                    >
                        Đăng xuất
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UserMenu;
