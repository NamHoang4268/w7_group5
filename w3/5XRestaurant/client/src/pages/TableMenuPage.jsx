import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../store/userSlice';
import { io } from 'socket.io-client';
import Axios from '../utils/Axios';
import SummaryApi from '../common/SummaryApi';
import toast from 'react-hot-toast';
import {
    FiShoppingCart,
    FiLogOut,
    FiMinus,
    FiPlus,
    FiList,
    FiTrash2,
    FiSend,
    FiChevronDown,
    FiGrid,
} from 'react-icons/fi';
import { MdOutlineKitchen } from 'react-icons/md';
import ShinyText from '../components/animations/ShinyText';
import BorderGlow from '../components/animations/BorderGlow';

const SOCKET_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:8080';

// Kitchen status badge config (theme-aware)
const KITCHEN_STATUS = {
    pending: {
        label: 'Chờ bếp',
        color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border border-yellow-300 dark:border-yellow-700',
    },
    cooking: {
        label: 'Đang nấu',
        color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-300 dark:border-blue-700',
    },
    ready: {
        label: 'Sẵn sàng',
        color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-300 dark:border-green-700',
    },
    served: {
        label: 'Đã phục vụ',
        color: 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-300 dark:border-gray-600',
    },
};

const TableMenuPage = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const user = useSelector((state) => state.user);
    const socketRef = useRef(null);

    // localOrder: buffer chọn món tạm thời trước khi gửi (thay thế cart)
    const [localOrder, setLocalOrder] = useState([]);

    const [categories, setCategories] = useState([]);
    const [products, setProducts] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showCart, setShowCart] = useState(false);
    const [showCurrentOrder, setShowCurrentOrder] = useState(false);
    const [showCategoryMenu, setShowCategoryMenu] = useState(false);
    const [tableInfo, setTableInfo] = useState(null);
    const [currentOrder, setCurrentOrder] = useState(null);
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    // Display values for qty inputs (can be empty string while typing)
    const [inputValues, setInputValues] = useState({});

    const fetchCurrentOrder = useCallback(async () => {
        try {
            const response = await Axios({
                ...SummaryApi.get_current_table_order,
            });
            if (response.data.success) setCurrentOrder(response.data.data);
        } catch (error) {
            console.error('Error fetching current order:', error);
        }
    }, []);

    // -- Socket setup (US20, US23, US24) --
    useEffect(() => {
        const s = io(SOCKET_URL);
        socketRef.current = s;

        // Khi món ready – chef đã nấu xong (US23)
        s.on('dish:ready', (data) => {
            toast(
                `🍽️ "${data.productName}" tại ${data.tableName} đã sẵn sàng!`,
                {
                    icon: '🔔',
                    duration: 6000,
                }
            );
            fetchCurrentOrder();
        });

        // Khi món đã được phục vụ (US24)
        s.on('dish:served', () => {
            fetchCurrentOrder();
        });

        return () => s.disconnect();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Check if user is a table account
    useEffect(() => {
        const timer = setTimeout(() => {
            setIsCheckingAuth(false);
        }, 1000);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (isCheckingAuth) return;
        if (!user || user.role !== 'TABLE') {
            toast.error('Vui lòng quét mã QR tại bàn để đặt món');
            navigate('/');
            return;
        }
        fetchTableSession();
        fetchCurrentOrder();
    }, [user, navigate, isCheckingAuth, fetchCurrentOrder]);

    const fetchTableSession = async () => {
        try {
            const response = await Axios({ ...SummaryApi.getTableSession });
            if (response.data.success) setTableInfo(response.data.data);
        } catch (error) {
            console.error('Error fetching table session:', error);
        }
    };

    // Fetch categories
    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            const response = await Axios({ ...SummaryApi.get_category });
            if (response.data.success) {
                setCategories(response.data.data);
                if (response.data.data.length > 0) {
                    setSelectedCategory(response.data.data[0]._id);
                }
            }
        } catch (error) {
            console.error('Error fetching categories:', error);
            toast.error('Không thể tải danh mục');
        } finally {
            setLoading(false);
        }
    };

    // Fetch products by category
    const fetchProducts = useCallback(async () => {
        try {
            const response = await Axios({
                ...SummaryApi.get_product_by_category,
                data: { id: selectedCategory },
            });
            if (response.data.success) setProducts(response.data.data);
        } catch (error) {
            console.error('Error fetching products:', error);
        }
    }, [selectedCategory]);

    useEffect(() => {
        if (selectedCategory) fetchProducts();
    }, [selectedCategory, fetchProducts]);

    // -- Local order actions --
    const handleAddToLocalOrder = (product) => {
        // AC 7.2 – client-side guard (mirrors isAvailable)
        const available = product.status === 'available' && product.stock !== 0;
        if (!available) {
            toast.error(`"${product.name}" hiện không khả dụng.`);
            return;
        }
        setLocalOrder((prev) => {
            const existing = prev.find(
                (item) => item.productId === product._id
            );
            if (existing) {
                // AC 7.3 – also check when "+" card button is clicked
                if (product.stock > 0 && existing.quantity + 1 > product.stock) {
                    toast.error(`Chỉ còn ${product.stock} suất "${product.name}".`);
                    return prev;
                }
                return prev.map((item) =>
                    item.productId === product._id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }
            return [
                ...prev,
                {
                    productId: product._id,
                    name: product.name,
                    price: product.price,
                    image: product.image?.[0] || '',
                    quantity: 1,
                    stock: product.stock, // lưu lại để validate client-side
                    note: '',
                },
            ];
        });
        // AC 10 – standardised toast message
        toast.success(`Đã thêm ${product.name} vào giỏ hàng.`);
    };

    // AC 5 – direct quantity input: allow empty while typing
    const handleLocalQtyInputChange = (productId, value) => {
        setInputValues((prev) => ({ ...prev, [productId]: value }));
        const qty = parseInt(value);
        if (!isNaN(qty) && qty >= 1) {
            // AC 7.3 – client-side stock check
            const item = localOrder.find((i) => i.productId === productId);
            if (item && item.stock > 0 && qty > item.stock) {
                toast.error(`Chỉ còn ${item.stock} suất "${item.name}".`);
                return;
            }
            setLocalOrder((prev) =>
                prev.map((i) =>
                    i.productId === productId ? { ...i, quantity: qty } : i
                )
            );
        }
    };

    // On blur: revert display if empty, invalid, OR exceeds stock
    const handleLocalQtyInputBlur = (productId) => {
        setInputValues((prev) => {
            const val = parseInt(prev[productId]);
            // Invalid or empty → revert
            if (isNaN(val) || val < 1) {
                const { [productId]: _, ...rest } = prev;
                return rest;
            }
            // Exceeds stock → revert (stock is stored on the localOrder item)
            const item = localOrder.find((i) => i.productId === productId);
            if (item && item.stock > 0 && val > item.stock) {
                const { [productId]: _, ...rest } = prev;
                return rest;
            }
            return prev; // valid – keep
        });
    };

    const handleLocalQtyChange = (productId, delta) => {
        setLocalOrder((prev) =>
            prev.map((item) => {
                if (item.productId !== productId) return item;
                const newQty = Math.max(1, item.quantity + delta);
                // AC 7.3 – client-side stock check on "+"
                if (delta > 0 && item.stock > 0 && newQty > item.stock) {
                    toast.error(`Chỉ còn ${item.stock} suất "${item.name}".`);
                    return item; // giự nguyên
                }
                return { ...item, quantity: newQty };
            })
        );
        // Sync display value
        setInputValues((prev) => { const { [productId]: _, ...rest } = prev; return rest; });
    };

    const handleRemoveLocalItem = (productId) => {
        setLocalOrder((prev) =>
            prev.filter((item) => item.productId !== productId)
        );
    };

    // Gửi đơn lên server (US17) + emit socket to kitchen (US20)
    const handlePlaceOrder = async () => {
        if (localOrder.length === 0) {
            toast.error('Chưa chọn món nào');
            return;
        }
        setIsSubmitting(true);
        try {
            const items = localOrder.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
                note: item.note || '',
            }));
            const response = await Axios({
                ...SummaryApi.add_items_to_table_order,
                data: { items, tableNumber: tableInfo?.tableNumber },
            });
            if (response.data.success) {
                toast.success('Đã gọi món! Đơn của bạn đang được xử lý 🍽️');
                setLocalOrder([]);
                setShowCart(false);
                await fetchCurrentOrder();
                setShowCurrentOrder(true);

                // US20 – Emit socket event để bếp nhận đơn realtime
                if (socketRef.current) {
                    socketRef.current.emit('kitchen:send_order', {
                        orderId: response.data.data?.tableOrder?._id,
                        tableId: tableInfo?.tableId,
                        tableName: tableInfo?.tableNumber || 'Bàn',
                        items: localOrder.map((i) => ({
                            name: i.name,
                            quantity: i.quantity,
                        })),
                    });
                }
            }
        } catch (error) {
            console.error('Error placing order:', error);
            toast.error(error.response?.data?.message || 'Không thể gửi đơn');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleLogout = async () => {
        try {
            await Axios({ ...SummaryApi.logoutTable });
            dispatch(logout());
            toast.success('Đã đăng xuất');
            navigate('/');
        } catch (error) {
            console.error('Error logging out:', error);
        }
    };

    const totalAmount = localOrder.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
    );

    // Count items not yet served in currentOrder (US18)
    const activeItemsCount =
        currentOrder?.items?.filter((i) => i.kitchenStatus !== 'served')
            .length || 0;

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="animate-spin rounded-full h-16 w-16 md:h-12 md:w-12 border-b-2 border-[#C96048]"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div
                className="text-white p-5 md:p-4 sticky top-0 z-40 shadow-lg"
                style={{
                    background: 'linear-gradient(135deg, #C96048 0%, #d97a66 100%)',
                }}
            >
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl md:text-xl font-bold font-[Bahnschrift,_system-ui]">
                            {tableInfo?.tableNumber || 'Bàn'}
                        </h1>
                        <p className="text-base md:text-sm opacity-90">
                            {tableInfo?.tableLocation || 'Nhà hàng EatEase'}
                        </p>
                    </div>
                    <div className="flex items-center gap-3 md:gap-2">
                        {/* Current Order button (US18) */}
                        <button
                            onClick={() => {
                                fetchCurrentOrder();
                                setShowCurrentOrder(true);
                            }}
                            className="relative bg-white dark:bg-gray-800 text-blue-500 dark:text-blue-400 p-4 md:p-3 rounded-full hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors active:scale-95"
                            title="Xem đơn gọi món"
                        >
                            <FiList size={24} className="md:text-[22px]" />
                            {activeItemsCount > 0 && (
                                <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-6 h-6 md:w-5 md:h-5 flex items-center justify-center font-bold">
                                    {activeItemsCount}
                                </span>
                            )}
                        </button>
                        {/* Local cart button */}
                        <button
                            onClick={() => setShowCart(true)}
                            className="relative bg-white dark:bg-gray-800 p-4 md:p-3 rounded-full hover:bg-orange-50 dark:hover:bg-gray-700 transition-colors active:scale-95"
                            style={{ color: '#C96048' }}
                            title="Món đang chọn"
                        >
                            <FiShoppingCart size={24} className="md:text-[22px]" />
                            {localOrder.length > 0 && (
                                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-6 h-6 md:w-5 md:h-5 flex items-center justify-center font-bold">
                                    {localOrder.length}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={handleLogout}
                            className="bg-white dark:bg-gray-800 p-4 md:p-3 rounded-full hover:bg-orange-50 dark:hover:bg-gray-700 transition-colors active:scale-95"
                            style={{ color: '#C96048' }}
                            title="Đăng xuất"
                        >
                            <FiLogOut size={24} className="md:text-[22px]" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Categories - Mobile: Dropdown, Desktop: Horizontal scroll */}
            <div className="bg-card border-b border-border shadow-sm sticky top-[80px] md:top-[72px] z-30">
                <div className="max-w-7xl mx-auto">
                    {/* Mobile: Category dropdown button */}
                    <div className="md:hidden p-4">
                        <button
                            onClick={() => setShowCategoryMenu(true)}
                            className="group relative w-full flex items-center justify-between px-5 py-3 rounded-xl font-semibold text-white shadow-md transition-all duration-300 hover:shadow-lg active:scale-95 overflow-hidden"
                            style={{
                                background: 'linear-gradient(135deg, #C96048 0%, #d97a66 100%)',
                            }}
                        >
                            {/* Subtle shine effect */}
                            <div
                                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                                style={{
                                    background: 'linear-gradient(135deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)',
                                }}
                            />
                            <div className="relative z-10 flex items-center gap-2">
                                <FiGrid size={20} />
                                <span>
                                    {categories.find((c) => c._id === selectedCategory)?.name || 'Chọn danh mục'}
                                </span>
                            </div>
                            <FiChevronDown size={20} className="relative z-10" />
                        </button>
                    </div>

                    {/* Desktop: Horizontal scroll */}
                    <div className="hidden md:block overflow-x-auto">
                        <div className="flex gap-2 p-3">
                            {categories.map((category) => (
                                <button
                                    key={category._id}
                                    onClick={() =>
                                        setSelectedCategory(category._id)
                                    }
                                    className={`group relative px-6 py-2 rounded-full font-semibold whitespace-nowrap transition-all duration-300 active:scale-95 overflow-hidden ${
                                        selectedCategory === category._id
                                            ? 'text-white shadow-md'
                                            : 'text-gray-700 dark:text-gray-300 hover:scale-105'
                                    }`}
                                    style={
                                        selectedCategory === category._id
                                            ? { 
                                                background: 'linear-gradient(135deg, #C96048 0%, #d97a66 100%)',
                                                boxShadow: '0 4px 12px rgba(201, 96, 72, 0.3)',
                                            }
                                            : {
                                                background: 'rgba(var(--card-rgb, 255, 255, 255), 0.6)',
                                                backdropFilter: 'blur(8px)',
                                                border: '1px solid rgba(var(--border-rgb, 200, 200, 200), 0.3)',
                                            }
                                    }
                                >
                                    {/* Hover glow for non-selected */}
                                    {selectedCategory !== category._id && (
                                        <div
                                            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                                            style={{
                                                background: 'radial-gradient(circle at center, rgba(201, 96, 72, 0.1) 0%, transparent 70%)',
                                            }}
                                        />
                                    )}
                                    <span className="relative z-10">{category.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Category Menu - Bottom Sheet */}
            {showCategoryMenu && (
                <div
                    className="md:hidden fixed inset-0 bg-black/50 z-50 flex items-end backdrop-blur-sm"
                    onClick={() => setShowCategoryMenu(false)}
                >
                    <div
                        className="w-full rounded-t-3xl shadow-2xl max-h-[70vh] flex flex-col animate-slide-up overflow-hidden"
                        style={{
                            background: 'rgba(var(--card-rgb, 255, 255, 255), 0.95)',
                            backdropFilter: 'blur(20px)',
                            border: '1px solid rgba(var(--border-rgb, 200, 200, 200), 0.3)',
                            borderBottom: 'none',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Handle bar */}
                        <div className="flex justify-center pt-3 pb-2">
                            <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                        </div>

                        {/* Header */}
                        <div className="px-5 py-3 border-b border-border/50">
                            <h3 className="text-xl font-bold text-foreground font-[Bahnschrift,_system-ui]">
                                Chọn danh mục
                            </h3>
                        </div>

                        {/* Category list */}
                        <div className="flex-1 overflow-y-auto p-4">
                            <div className="grid grid-cols-2 gap-3">
                                {categories.map((category) => (
                                    <button
                                        key={category._id}
                                        onClick={() => {
                                            setSelectedCategory(category._id);
                                            setShowCategoryMenu(false);
                                        }}
                                        className={`group relative p-4 rounded-xl font-semibold text-center transition-all duration-300 overflow-hidden ${
                                            selectedCategory === category._id
                                                ? 'text-white shadow-lg scale-105'
                                                : 'text-gray-700 dark:text-gray-300 hover:scale-105 active:scale-95'
                                        }`}
                                        style={
                                            selectedCategory === category._id
                                                ? { 
                                                    background: 'linear-gradient(135deg, #C96048 0%, #d97a66 100%)',
                                                    boxShadow: '0 8px 20px rgba(201, 96, 72, 0.3)',
                                                }
                                                : {
                                                    background: 'rgba(var(--card-rgb, 255, 255, 255), 0.5)',
                                                    backdropFilter: 'blur(8px)',
                                                    border: '1px solid rgba(var(--border-rgb, 200, 200, 200), 0.3)',
                                                }
                                        }
                                    >
                                        {/* Hover glow for non-selected */}
                                        {selectedCategory !== category._id && (
                                            <div
                                                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                                                style={{
                                                    background: 'radial-gradient(circle at center, rgba(201, 96, 72, 0.1) 0%, transparent 70%)',
                                                }}
                                            />
                                        )}
                                        <span className="relative z-10">{category.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Products Grid */}
            <div className="max-w-7xl mx-auto p-4">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {products.map((product) => {
                        // Product is unavailable if status says so OR stock is exactly 0
                        const isAvailable = product.status === 'available' && product.stock !== 0;
                        return (
                            <div
                                key={product._id}
                                className={`group relative rounded-xl shadow-sm overflow-hidden transition-all duration-300 ${
                                    isAvailable
                                        ? 'hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]'
                                        : 'opacity-70'
                                }`}
                                style={{
                                    background: 'rgba(var(--card-rgb, 255, 255, 255), 0.7)',
                                    backdropFilter: 'blur(12px)',
                                    border: '1px solid rgba(var(--border-rgb, 200, 200, 200), 0.3)',
                                }}
                            >
                                {/* Hover glow effect */}
                                {isAvailable && (
                                    <div
                                        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10"
                                        style={{
                                            background: 'radial-gradient(circle at 50% 0%, rgba(201, 96, 72, 0.15) 0%, transparent 60%)',
                                        }}
                                    />
                                )}

                                {/* AC 7.2 – unavailable overlay */}
                                <div className="relative aspect-square bg-gray-100 dark:bg-gray-800">
                                    {product.image?.[0] && (
                                        <img
                                            src={product.image[0]}
                                            alt={product.name}
                                            className="w-full h-full object-cover"
                                        />
                                    )}
                                    {!isAvailable && (
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-sm">
                                            <span className="bg-red-500 text-white text-sm md:text-xs font-bold px-4 py-2 md:px-3 md:py-1 rounded-full shadow-lg">
                                                Hết hàng
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <div className="relative z-10 p-4 md:p-3">
                                    <h3 className="font-semibold text-foreground text-base md:text-sm mb-1 line-clamp-2">
                                        {product.name}
                                    </h3>
                                    <p className="font-bold text-xl md:text-lg mb-3 md:mb-2" style={{ color: '#C96048' }}>
                                        {product.price?.toLocaleString('vi-VN')}
                                        đ
                                    </p>
                                    <button
                                        onClick={() =>
                                            handleAddToLocalOrder(product)
                                        }
                                        disabled={!isAvailable}
                                        className={`w-full font-semibold py-3 md:py-2 rounded-lg transition-all text-white ${
                                            isAvailable
                                                ? 'hover:shadow-lg active:scale-95'
                                                : 'cursor-not-allowed'
                                        }`}
                                        style={
                                            isAvailable
                                                ? { 
                                                    background: 'linear-gradient(135deg, #C96048 0%, #d97a66 100%)',
                                                    boxShadow: '0 4px 12px rgba(201, 96, 72, 0.3)',
                                                }
                                                : {
                                                    background: 'rgba(var(--border-rgb, 200, 200, 200), 0.3)',
                                                }
                                        }
                                    >
                                        {isAvailable ? '+ Thêm' : 'Hết hàng'}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ========================================
                LOCAL CART SIDEBAR (Món đang chọn)
                ======================================== */}
            {showCart && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-50"
                    onClick={() => setShowCart(false)}
                >
                    <div
                        className="absolute right-0 top-0 h-full w-full max-w-md bg-card border-l border-border shadow-xl flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div
                            className="text-white p-5 md:p-4 flex justify-between items-center"
                            style={{
                                background: 'linear-gradient(135deg, #C96048 0%, #d97a66 100%)',
                            }}
                        >
                            <h2 className="text-2xl md:text-xl font-bold font-[Bahnschrift,_system-ui]">
                                <ShinyText
                                    text={`Món đã chọn (${localOrder.length})`}
                                    disabled={false}
                                    speed={3}
                                    color="#ffffff"
                                    shineColor="#ffe4d6"
                                    spread={90}
                                />
                            </h2>
                            <button
                                onClick={() => setShowCart(false)}
                                className="text-3xl md:text-2xl leading-none hover:opacity-80 active:scale-95"
                            >
                                &times;
                            </button>
                        </div>

                        {/* Items */}
                        <div className="flex-1 overflow-y-auto p-4">
                            {localOrder.length === 0 ? (
                                <p className="text-center text-muted-foreground mt-8">
                                    Chưa chọn món nào
                                </p>
                            ) : (
                                <div className="space-y-4">
                                    {localOrder.map((item) => (
                                        <div
                                            key={item.productId}
                                            className="group relative flex gap-3 p-4 md:p-3 rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                                            style={{
                                                background: 'rgba(var(--card-rgb, 255, 255, 255), 0.05)',
                                                backdropFilter: 'blur(12px)',
                                                border: '1px solid rgba(var(--border-rgb, 200, 200, 200), 0.2)',
                                                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
                                            }}
                                        >
                                            {/* Hover glow effect */}
                                            <div
                                                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                                                style={{
                                                    background: 'radial-gradient(circle at center, rgba(201, 96, 72, 0.1) 0%, transparent 70%)',
                                                }}
                                            />

                                            {item.image && (
                                                <img
                                                    src={item.image}
                                                    alt={item.name}
                                                    className="relative z-10 w-20 h-20 md:w-16 md:h-16 object-cover rounded-lg flex-shrink-0 shadow-md"
                                                />
                                            )}
                                            <div className="relative z-10 flex-1">
                                                <h3 className="font-semibold text-foreground text-base md:text-sm">
                                                    {item.name}
                                                </h3>
                                                <p className="font-bold text-lg md:text-base" style={{ color: '#C96048' }}>
                                                    {item.price?.toLocaleString(
                                                        'vi-VN'
                                                    )}
                                                    đ
                                                </p>
                                                {/* AC 5 – quantity controls with direct input */}
                                                <div className="flex items-center gap-2 mt-2">
                                                    <button
                                                        onClick={() =>
                                                            handleLocalQtyChange(
                                                                item.productId,
                                                                -1
                                                            )
                                                        }
                                                        className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 p-2 md:p-1 rounded active:scale-95 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                                                    >
                                                        <FiMinus size={18} className="md:text-base" />
                                                    </button>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={
                                                            inputValues[item.productId] !== undefined
                                                                ? inputValues[item.productId]
                                                                : item.quantity
                                                        }
                                                        onChange={(e) =>
                                                            handleLocalQtyInputChange(
                                                                item.productId,
                                                                e.target.value
                                                            )
                                                        }
                                                        onBlur={() =>
                                                            handleLocalQtyInputBlur(item.productId)
                                                        }
                                                        className="w-14 md:w-12 text-center border border-border bg-background rounded text-base md:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#C96048]/50 py-1.5 md:py-0.5"
                                                        style={{ color: '#C96048' }}
                                                    />
                                                    <button
                                                        onClick={() =>
                                                            handleLocalQtyChange(
                                                                item.productId,
                                                                1
                                                            )
                                                        }
                                                        className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 p-2 md:p-1 rounded active:scale-95 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                                                    >
                                                        <FiPlus size={18} className="md:text-base" />
                                                    </button>
                                                    <button
                                                        onClick={() =>
                                                            handleRemoveLocalItem(
                                                                item.productId
                                                            )
                                                        }
                                                        className="ml-auto text-red-500 dark:text-red-400 p-2 md:p-1 active:scale-95 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                                    >
                                                        <FiTrash2 size={18} className="md:text-base" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        {localOrder.length > 0 && (
                            <div className="border-t border-border p-4 space-y-3 bg-card">
                                <div className="flex justify-between items-center text-xl md:text-lg font-bold">
                                    <span className="text-foreground">Tổng:</span>
                                    <span style={{ color: '#C96048' }}>
                                        {totalAmount.toLocaleString('vi-VN')}đ
                                    </span>
                                </div>
                                <BorderGlow
                                    className="w-full"
                                    glowColor="201 96 72"
                                    backgroundColor="transparent"
                                    borderRadius={12}
                                    animated={true}
                                    colors={['#C96048', '#d97a66', '#e8a896']}
                                    glowIntensity={0.8}
                                >
                                    <button
                                        onClick={handlePlaceOrder}
                                        disabled={isSubmitting}
                                        className="w-full flex items-center justify-center gap-2 disabled:opacity-60 text-white font-bold py-4 md:py-3 rounded-xl transition-all active:scale-95"
                                        style={{
                                            background: 'linear-gradient(135deg, #C96048 0%, #d97a66 100%)',
                                        }}
                                    >
                                        <FiSend size={20} className="md:text-lg" />
                                        {isSubmitting
                                            ? 'Đang gửi...'
                                            : 'Gọi món ngay 🍽️'}
                                    </button>
                                </BorderGlow>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ========================================
                CURRENT ORDER SIDEBAR (US18 – xem đơn đã gọi + kitchenStatus)
                ======================================== */}
            {showCurrentOrder && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-50"
                    onClick={() => setShowCurrentOrder(false)}
                >
                    <div
                        className="absolute right-0 top-0 h-full w-full max-w-md bg-card border-l border-border shadow-xl flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="bg-blue-600 dark:bg-blue-700 text-white p-5 md:p-4">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <MdOutlineKitchen size={24} className="md:text-[22px]" />
                                    <h2 className="text-2xl md:text-xl font-bold font-[Bahnschrift,_system-ui]">
                                        <ShinyText
                                            text="Đơn gọi món"
                                            disabled={false}
                                            speed={3}
                                            color="#ffffff"
                                            shineColor="#dbeafe"
                                            spread={90}
                                        />
                                    </h2>
                                </div>
                                <button
                                    onClick={() => setShowCurrentOrder(false)}
                                    className="text-3xl md:text-2xl leading-none hover:opacity-80 active:scale-95"
                                >
                                    &times;
                                </button>
                            </div>
                            {currentOrder && (
                                <p className="text-base md:text-sm opacity-80 mt-1">
                                    Bàn: {currentOrder.tableNumber} &bull;{' '}
                                    {currentOrder.items?.length || 0} món
                                </p>
                            )}
                        </div>

                        {/* Items US18 – hiển thị kitchenStatus */}
                        <div className="flex-1 overflow-y-auto p-4">
                            {!currentOrder?.items?.length ? (
                                <div className="text-center text-muted-foreground mt-12">
                                    <FiList
                                        size={48}
                                        className="mx-auto mb-4 opacity-30"
                                    />
                                    <p>Chưa có món nào trong đơn</p>
                                    <p className="text-sm mt-2">
                                        Hãy thêm món từ menu và nhấn "Gọi món"!
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {currentOrder.items.map((item, index) => {
                                        const statusCfg =
                                            KITCHEN_STATUS[
                                                item.kitchenStatus
                                            ] || KITCHEN_STATUS.pending;
                                        return (
                                            <div
                                                key={index}
                                                className="group relative flex items-center gap-3 p-4 md:p-3 rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.02]"
                                                style={{
                                                    background: 'rgba(var(--card-rgb, 255, 255, 255), 0.05)',
                                                    backdropFilter: 'blur(12px)',
                                                    border: '1px solid rgba(var(--border-rgb, 200, 200, 200), 0.2)',
                                                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
                                                }}
                                            >
                                                {/* Hover glow effect */}
                                                <div
                                                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                                                    style={{
                                                        background: 'radial-gradient(circle at center, rgba(59, 130, 246, 0.1) 0%, transparent 70%)',
                                                    }}
                                                />

                                                {/* Image */}
                                                <div className="relative z-10 w-16 h-16 md:w-14 md:h-14 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden flex-shrink-0 shadow-md">
                                                    {item.productId
                                                        ?.image?.[0] && (
                                                        <img
                                                            src={
                                                                item.productId
                                                                    .image[0]
                                                            }
                                                            alt={
                                                                item.productId
                                                                    .name
                                                            }
                                                            className="w-full h-full object-cover"
                                                        />
                                                    )}
                                                </div>
                                                {/* Info */}
                                                <div className="relative z-10 flex-1 min-w-0">
                                                    <p className="font-semibold text-foreground text-base md:text-sm truncate">
                                                        {item.productId?.name ||
                                                            item.name ||
                                                            'Món ăn'}
                                                    </p>
                                                    <p className="text-sm text-muted-foreground">
                                                        x{item.quantity} &bull;{' '}
                                                        {(
                                                            (item.price || 0) *
                                                            item.quantity
                                                        ).toLocaleString(
                                                            'vi-VN'
                                                        )}
                                                        đ
                                                    </p>
                                                    {item.note && (
                                                        <p className="text-xs text-yellow-600 dark:text-yellow-500 mt-0.5">
                                                            📝 {item.note}
                                                        </p>
                                                    )}
                                                </div>
                                                {/* Kitchen status badge */}
                                                <span
                                                    className={`relative z-10 text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ${statusCfg.color}`}
                                                >
                                                    {statusCfg.label}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Footer – Tổng + Thanh toán */}
                        {currentOrder?.items?.length > 0 && (
                            <div className="border-t border-border p-4 space-y-3 bg-card">
                                <div className="flex justify-between text-sm text-muted-foreground">
                                    <span>Tổng số lượng:</span>
                                    <span className="font-semibold">
                                        {currentOrder.items.reduce(
                                            (s, i) => s + i.quantity,
                                            0
                                        )}
                                    </span>
                                </div>
                                <div className="flex justify-between text-xl md:text-lg font-bold">
                                    <span className="text-blue-800 dark:text-blue-400">
                                        Tổng cộng:
                                    </span>
                                    <span className="text-blue-600 dark:text-blue-400">
                                        {currentOrder.total?.toLocaleString(
                                            'vi-VN'
                                        )}
                                        đ
                                    </span>
                                </div>
                                <button
                                    onClick={() => {
                                        setShowCurrentOrder(false);
                                        navigate('/table-order-management');
                                    }}
                                    className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-4 md:py-3 rounded-lg font-semibold text-lg hover:from-green-600 hover:to-green-700 transition-all shadow-md active:scale-95"
                                >
                                    💳 Thanh toán
                                </button>
                                <div className="flex items-center gap-2 text-xs text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-2">
                                    <span>ℹ️</span>
                                    <span>
                                        Bạn có thể tiếp tục gọi thêm món. Thanh
                                        toán khi dùng xong.
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default TableMenuPage;
