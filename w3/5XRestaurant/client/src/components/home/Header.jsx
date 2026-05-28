import { Button } from '../ui/button';
import { Sheet, SheetContent, SheetTrigger } from '../ui/sheet';
import { Menu, MessageSquare, Search as SearchIcon, X } from 'lucide-react';
import logo from '@/assets/logo.png';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
    FaBoxOpen,
    FaCaretDown,
    FaCaretUp,
    FaHome,
    FaInfoCircle,
    FaPhone,
} from 'react-icons/fa';
// eslint-disable-next-line no-unused-vars
import { AnimatePresence, motion } from 'framer-motion';
import { useSelector } from 'react-redux';
import UserMenu from '../UserMenu';
import { useGlobalContext } from '../../provider/GlobalProvider';
import defaultAvatar from '@/assets/defaultAvatar.png';
import Search from '../Search';
import { valideURLConvert } from '@/utils/valideURLConvert';
import { ThemeToggle } from '../theme-toggle';
import { useSupportChat } from '../../contexts/SupportChatContext';
import ShinyText from '../animations/ShinyText';

export default function Header() {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const searchRef = useRef(null);
    const searchInputRef = useRef(null);
    const user = useSelector((state) => state?.user);
    const { unreadCount } = useSupportChat();
    const categoryData =
        useSelector((state) => state.product.allCategory) || [];
    const firstCategory = categoryData.length > 0 ? categoryData[0] : null;
    // eslint-disable-next-line no-unused-vars
    const { totalPrice, totalQty } = useGlobalContext();

    const links = [
        {
            href: '/',
            icon: <FaHome size={14} />,
            label: 'Trang chủ',
        },
        {
            href: firstCategory
                ? `/${valideURLConvert(firstCategory.name)}-${firstCategory._id}`
                : '/products',
            icon: <FaBoxOpen size={14} />,
            label: 'Thực đơn',
        },
        {
            href: '/about',
            icon: <FaInfoCircle size={14} />,
            label: 'Giới thiệu',
        },
        {
            href: '/contact',
            icon: <FaPhone size={14} />,
            label: 'Liên hệ',
        },
    ];

    const navigate = useNavigate();
    const location = useLocation();
    const [openUserMenu, setOpenUserMenu] = useState(false);
    const menuRef = useRef(null);

    // Helper: kiểm tra link có đang active không
    const isActiveLink = (href) => {
        const path = location.pathname;
        if (href === '/') return path === '/';
        // Link category (dynamic) — active nếu path chứa category _id hoặc bắt đầu /products
        if (firstCategory && href.includes(firstCategory._id)) {
            return (
                path.includes(firstCategory._id) || path.startsWith('/products')
            );
        }
        return path.startsWith(href);
    };

    useEffect(() => {
        const handleClick = (event) => {
            if (!menuRef.current) return;
            const isClickInside = menuRef.current.contains(event.target);
            const isToggleButton = event.target.closest(
                'button[aria-haspopup="true"]'
            );
            if (!isClickInside && !isToggleButton) {
                setOpenUserMenu(false);
            }
        };
        const handleEscape = (event) => {
            if (event.key === 'Escape') setOpenUserMenu(false);
        };
        document.addEventListener('mousedown', handleClick, true);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClick, true);
            document.removeEventListener('keydown', handleEscape);
        };
    }, []);

    useEffect(() => {
        if (!searchOpen) return;
        const handleClickOutside = (e) => {
            if (searchRef.current && !searchRef.current.contains(e.target)) {
                setSearchOpen(false);
                setSearchQuery('');
            }
        };
        document.addEventListener('mousedown', handleClickOutside, true);
        return () =>
            document.removeEventListener('mousedown', handleClickOutside, true);
    }, [searchOpen]);

    useEffect(() => {
        if (searchOpen) {
            setTimeout(() => searchInputRef.current?.focus(), 50);
        }
    }, [searchOpen]);

    const toggleUserMenu = useCallback((e) => {
        e.stopPropagation();
        setOpenUserMenu((prev) => !prev);
    }, []);

    const closeMenu = useCallback(() => setOpenUserMenu(false), []);
    const closeMobileMenu = useCallback(() => setIsMobileMenuOpen(false), []);

    const handleSearchChange = (e) => {
        const value = e.target.value;
        setSearchQuery(value);
        navigate(`/search?q=${value}`);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const redirectToLoginPage = () => navigate('/login');

    const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

    const handleClickBooking = (e) => {
        if (!user?._id) {
            e.preventDefault();
            redirectToLoginPage();
        } else {
            scrollToTop();
        }
    };

    return (
        <>
            <header className="sticky top-0 z-50 p-4 dark:text-red-50 font-semibold">
                <div className="container mx-auto">
                    <div className="flex h-16 items-center justify-between px-6 liquid-glass-header rounded-full">
                        {/* Brand Logo */}
                        <Link
                            to="/"
                            onClick={scrollToTop}
                            className="flex items-center justify-center gap-1.5"
                        >
                            <img
                                src={logo}
                                alt="EatEase logo"
                                width={25}
                                height={25}
                                className="h-5 w-5"
                            />
                            <span className="text-orange-800 font-semibold text-lg tracking-wide">
                                EatEase
                            </span>
                        </Link>

                        {/* Desktop Nav */}
                        <div className="hidden md:flex items-center gap-6">
                            <nav className="flex items-center gap-6 text-sm">
                                {links.map((l) => {
                                    const active = isActiveLink(l.href);
                                    return (
                                        <Link
                                            key={l.href}
                                            to={l.href}
                                            onClick={scrollToTop}
                                            className={`relative flex items-center gap-[6px] transition-colors pb-0.5
                                                ${
                                                    active
                                                        ? 'text-[#C96048] font-semibold'
                                                        : 'hover:text-[#C96048]'
                                                }`}
                                        >
                                            {l.label}
                                            {/* Gạch dưới active */}
                                            {active && (
                                                <motion.span
                                                    layoutId="nav-underline"
                                                    className="absolute bottom-[-3px] left-0 h-[2px] w-full rounded-full bg-[#C96048]"
                                                    transition={{
                                                        type: 'spring',
                                                        stiffness: 380,
                                                        damping: 30,
                                                    }}
                                                />
                                            )}
                                        </Link>
                                    );
                                })}
                            </nav>
                            <Link
                                to="/booking"
                                onClick={handleClickBooking}
                                className="bg-orange-700 text-white px-8 py-2 rounded-full text-sm font-medium tracking-wide hover:opacity-90 transition-all active:scale-95"
                            >
                                Đặt bàn
                            </Link>
                        </div>

                        {/* User Actions */}
                        <div className="hidden md:flex items-center gap-1.5">
                            {/* Expanding Search */}
                            <div
                                ref={searchRef}
                                className="flex items-center gap-1"
                            >
                                <AnimatePresence>
                                    {searchOpen && (
                                        <motion.div
                                            key="search-input"
                                            initial={{ width: 0, opacity: 0 }}
                                            animate={{ width: 200, opacity: 1 }}
                                            exit={{ width: 0, opacity: 0 }}
                                            transition={{
                                                duration: 0.22,
                                                ease: [0.4, 0, 0.2, 1],
                                            }}
                                            className="overflow-hidden"
                                        >
                                            <input
                                                ref={searchInputRef}
                                                type="text"
                                                value={searchQuery}
                                                onChange={handleSearchChange}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Escape') {
                                                        setSearchOpen(false);
                                                        setSearchQuery('');
                                                    }
                                                }}
                                                placeholder="Tìm kiếm món ăn..."
                                                className="w-full h-8 bg-background/60 border border-[#C96048]/40 rounded-full px-4 text-xs outline-none focus:border-[#C96048] text-foreground placeholder:text-muted-foreground transition-colors"
                                                spellCheck={false}
                                            />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                                <button
                                    onClick={() => {
                                        if (searchOpen) {
                                            setSearchOpen(false);
                                            setSearchQuery('');
                                        } else {
                                            setSearchOpen(true);
                                        }
                                    }}
                                    className="p-2 rounded-full hover:bg-[#C96048]/10 transition-colors text-foreground hover:text-[#C96048]"
                                    aria-label="Tìm kiếm"
                                    title="Tìm kiếm"
                                >
                                    {searchOpen ? (
                                        <X size={15} />
                                    ) : (
                                        <SearchIcon size={15} />
                                    )}
                                </button>
                            </div>
                            <ThemeToggle />
                            <div className="flex items-center justify-end gap-5">
                                {user?._id ? (
                                    <div className="flex items-center gap-4">
                                        {user.role === 'ADMIN' && (
                                            <Link
                                                to="/dashboard/support-chat"
                                                className="relative p-2 rounded-full hover:bg-white/10 transition-colors text-gray-300 hover:text-white"
                                                title="Hỗ trợ khách hàng"
                                            >
                                                <MessageSquare className="h-5 w-5" />
                                                {unreadCount > 0 && (
                                                    <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white border-2 border-[#1a1a1a]">
                                                        {unreadCount > 9
                                                            ? '9+'
                                                            : unreadCount}
                                                    </span>
                                                )}
                                            </Link>
                                        )}
                                        <div className="relative" ref={menuRef}>
                                            <button
                                                onClick={toggleUserMenu}
                                                className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg hover:bg-background/15 transition-colors"
                                                aria-expanded={openUserMenu}
                                                aria-haspopup="true"
                                                aria-label="User menu"
                                                type="button"
                                            >
                                                <div className="relative p-0.5 overflow-hidden rounded-full liquid-glass-2">
                                                    <img
                                                        src={
                                                            user.avatar ||
                                                            defaultAvatar
                                                        }
                                                        alt={user.name}
                                                        className="w-8 h-8 flex-shrink-0 rounded-full object-cover"
                                                        width={32}
                                                        height={32}
                                                    />
                                                </div>
                                                <div className="flex flex-col items-start flex-1 min-w-0">
                                                    <span className="text-sm font-medium truncate max-w-16 lg:max-w-20 xl:max-w-max">
                                                        {user.name}
                                                    </span>
                                                    {user.role === 'ADMIN' && (
                                                        <span className="text-xs text-highlight py-0.5 px-1 bg-background rounded-md">
                                                            Quản trị
                                                        </span>
                                                    )}
                                                </div>
                                                {openUserMenu ? (
                                                    <FaCaretUp
                                                        className="flex-shrink-0 ml-2"
                                                        size={15}
                                                    />
                                                ) : (
                                                    <FaCaretDown
                                                        className="flex-shrink-0 ml-2"
                                                        size={15}
                                                    />
                                                )}
                                            </button>
                                            <AnimatePresence>
                                                {openUserMenu && (
                                                    <motion.div
                                                        className="absolute right-0 top-full mt-2 z-50 w-64"
                                                        initial={{
                                                            opacity: 0,
                                                            y: -10,
                                                        }}
                                                        animate={{
                                                            opacity: 1,
                                                            y: 0,
                                                        }}
                                                        exit={{
                                                            opacity: 0,
                                                            y: -10,
                                                        }}
                                                        transition={{
                                                            duration: 0.15,
                                                            ease: 'easeOut',
                                                        }}
                                                    >
                                                        <UserMenu
                                                            close={closeMenu}
                                                            menuTriggerRef={
                                                                menuRef
                                                            }
                                                        />
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        onClick={redirectToLoginPage}
                                        className="underline text-sm hover:text-foreground transition-colors"
                                    >
                                        Đăng nhập
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Mobile Nav */}
                        <div className="md:hidden flex items-center gap-2">
                            {/* Theme Toggle */}
                            <ThemeToggle />

                            {/* User Avatar or Login */}
                            {user?._id ? (
                                <button
                                    onClick={() => setIsMobileMenuOpen(true)}
                                    className="relative p-0.5 overflow-hidden rounded-full liquid-glass hover:scale-105 transition-transform active:scale-95"
                                >
                                    <img
                                        src={user.avatar || defaultAvatar}
                                        alt={user.name}
                                        className="w-8 h-8 rounded-full object-cover"
                                        width={32}
                                        height={32}
                                    />
                                    {user.role === 'ADMIN' &&
                                        unreadCount > 0 && (
                                            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white border-2 border-background">
                                                {unreadCount > 9
                                                    ? '9+'
                                                    : unreadCount}
                                            </span>
                                        )}
                                </button>
                            ) : (
                                <button
                                    onClick={redirectToLoginPage}
                                    className="text-xs font-medium px-3 py-1.5 rounded-full text-white hover:shadow-lg transition-all active:scale-95"
                                    style={{
                                        background:
                                            'linear-gradient(135deg, #C96048 0%, #d97a66 100%)',
                                    }}
                                >
                                    Đăng nhập
                                </button>
                            )}

                            {/* Menu Icon */}
                            <Sheet
                                open={isMobileMenuOpen}
                                onOpenChange={setIsMobileMenuOpen}
                                modal={true}
                            >
                                <SheetTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="border-border bg-card hover:bg-accent hover:text-[#C96048] transition-all active:scale-95"
                                    >
                                        <Menu className="h-5 w-5" />
                                        <span className="sr-only">
                                            Open menu
                                        </span>
                                    </Button>
                                </SheetTrigger>
                                <SheetContent
                                    side="right"
                                    className="p-0 w-72 flex flex-col border-border fixed"
                                    style={{
                                        background:
                                            'rgba(var(--card-rgb, 255, 255, 255), 0.95)',
                                        backdropFilter: 'blur(20px)',
                                    }}
                                    onOpenAutoFocus={(e) => e.preventDefault()}
                                >
                                    {/* User Section at Top */}
                                    {user?._id && (
                                        <div className="px-4 py-4 border-b border-border">
                                            <div className="flex items-center gap-3">
                                                <div className="relative p-0.5 overflow-hidden rounded-full liquid-glass">
                                                    <img
                                                        src={
                                                            user.avatar ||
                                                            defaultAvatar
                                                        }
                                                        alt={user.name}
                                                        className="w-12 h-12 rounded-full object-cover"
                                                        width={48}
                                                        height={48}
                                                    />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-semibold text-foreground truncate">
                                                        {user.name}
                                                    </p>
                                                    {user.role === 'ADMIN' && (
                                                        <span
                                                            className="text-xs px-2 py-0.5 rounded-full"
                                                            style={{
                                                                color: '#C96048',
                                                                background:
                                                                    'rgba(201, 96, 72, 0.1)',
                                                            }}
                                                        >
                                                            Quản trị viên
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex items-center justify-center gap-1.5 pb-4 border-b border-border">
                                        <Link
                                            to="/"
                                            onClick={scrollToTop}
                                            className="flex items-center gap-1.5"
                                        >
                                            <img
                                                src={logo}
                                                alt="EatEase logo"
                                                className="h-8 w-8"
                                            />
                                            <span className="font-semibold text-xl tracking-wide text-foreground">
                                                <ShinyText
                                                    text="EatEase"
                                                    disabled={false}
                                                    speed={3}
                                                    color="#C96048"
                                                    shineColor="#d97a66"
                                                    spread={90}
                                                />
                                            </span>
                                        </Link>
                                    </div>
                                    <div className="px-2">
                                        <Search />
                                    </div>
                                    <nav className="flex flex-col gap-1 mt-2">
                                        {links.map((l) => {
                                            const isBookingLink =
                                                l.href === '/booking';
                                            const handleClick = () => {
                                                if (
                                                    isBookingLink &&
                                                    !user?._id
                                                ) {
                                                    redirectToLoginPage();
                                                    closeMobileMenu();
                                                } else {
                                                    closeMenu();
                                                    closeMobileMenu();
                                                    scrollToTop();
                                                }
                                            };
                                            return (
                                                <Link
                                                    key={l.href}
                                                    to={
                                                        isBookingLink &&
                                                        !user?._id
                                                            ? '#'
                                                            : l.href
                                                    }
                                                    onClick={handleClick}
                                                    className={`flex items-center gap-3 px-4 py-3 transition-all active:scale-95 ${
                                                        isActiveLink(l.href)
                                                            ? 'text-[#C96048] font-semibold border-l-2 border-[#C96048]'
                                                            : 'text-foreground hover:text-[#C96048]'
                                                    }`}
                                                    style={
                                                        isActiveLink(l.href)
                                                            ? {
                                                                  background:
                                                                      'rgba(201, 96, 72, 0.08)',
                                                              }
                                                            : {}
                                                    }
                                                >
                                                    <span className="inline-flex items-center justify-center w-5 h-5">
                                                        {l.icon}
                                                    </span>
                                                    <span className="text-sm">
                                                        {l.label}
                                                    </span>
                                                </Link>
                                            );
                                        })}
                                    </nav>
                                    <div className="mt-auto border-t border-border p-4">
                                        <div className="flex items-center justify-center w-full gap-5">
                                            {user?._id ? (
                                                <div
                                                    className="relative w-full"
                                                    ref={menuRef}
                                                >
                                                    <button
                                                        onClick={toggleUserMenu}
                                                        className="flex items-center gap-2 w-full px-3 py-2 rounded-lg hover:bg-accent transition-all active:scale-95 border border-border"
                                                    >
                                                        <span className="text-sm font-medium text-foreground flex-1 text-left">
                                                            Cài đặt tài khoản
                                                        </span>
                                                        {openUserMenu ? (
                                                            <FaCaretUp
                                                                className="flex-shrink-0 text-muted-foreground"
                                                                size={15}
                                                            />
                                                        ) : (
                                                            <FaCaretDown
                                                                className="flex-shrink-0 text-muted-foreground"
                                                                size={15}
                                                            />
                                                        )}
                                                    </button>
                                                    <AnimatePresence>
                                                        {openUserMenu && (
                                                            <motion.div
                                                                className="absolute right-0 bottom-full mb-2 z-50 w-64"
                                                                initial={{
                                                                    opacity: 0,
                                                                    y: 10,
                                                                }}
                                                                animate={{
                                                                    opacity: 1,
                                                                    y: 0,
                                                                }}
                                                                exit={{
                                                                    opacity: 0,
                                                                    y: -10,
                                                                }}
                                                                transition={{
                                                                    duration: 0.15,
                                                                    ease: 'easeOut',
                                                                }}
                                                            >
                                                                <UserMenu
                                                                    close={() => {
                                                                        closeMenu();
                                                                        closeMobileMenu();
                                                                    }}
                                                                    menuTriggerRef={
                                                                        menuRef
                                                                    }
                                                                />
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => {
                                                        redirectToLoginPage();
                                                        closeMenu();
                                                        closeMobileMenu();
                                                        scrollToTop();
                                                    }}
                                                    className="w-full text-white font-medium rounded-lg px-6 py-2.5 hover:shadow-lg hover:scale-[1.02] transition-all active:scale-95"
                                                    style={{
                                                        background:
                                                            'linear-gradient(135deg, #C96048 0%, #d97a66 100%)',
                                                        boxShadow:
                                                            '0 4px 12px rgba(201, 96, 72, 0.3)',
                                                    }}
                                                >
                                                    Đăng nhập
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </SheetContent>
                            </Sheet>
                        </div>
                    </div>
                </div>
            </header>
        </>
    );
}
