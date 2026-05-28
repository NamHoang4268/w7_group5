import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../store/userSlice';
import Axios from '../utils/Axios';
import SummaryApi from '../common/SummaryApi';
import toast from 'react-hot-toast';
import {
    FiCreditCard,
    FiDollarSign,
    FiShoppingBag,
    FiLogOut,
    FiX,
    FiClock,
    FiBell,
    FiFileText,
    FiCheckCircle,
} from 'react-icons/fi';
import BorderGlow from '../components/animations/BorderGlow';
import ShinyText from '../components/animations/ShinyText';

// Map kitchenStatus → label + màu hiển thị cho khách (theme-aware)
const KITCHEN_STATUS_CONFIG = {
    pending:  { label: 'Chờ bếp',       className: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border border-yellow-300 dark:border-yellow-700' },
    cooking:  { label: 'Đang nấu',      className: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-300 dark:border-blue-700' },
    ready:    { label: 'Sắp phục vụ',   className: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border border-purple-300 dark:border-purple-700' },
    served:   { label: 'Đã phục vụ',   className: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-300 dark:border-green-700' },
};

// ─────────────────────────────────────────
// Bill Preview Modal (AC 3–5)
// ─────────────────────────────────────────
function OnlineBillPreviewModal({ tableOrder, onClose, onConfirm, processing }) {
    if (!tableOrder) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div
                className="w-full max-w-lg shadow-2xl overflow-hidden rounded-2xl"
                style={{
                    background: 'rgba(var(--card-rgb, 255, 255, 255), 0.95)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(var(--border-rgb, 200, 200, 200), 0.3)',
                }}
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 px-5 py-5 md:py-4 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl md:text-xl font-bold text-white flex items-center gap-2 font-[Bahnschrift,_system-ui]">
                            <FiFileText size={24} className="md:text-[20px]" /> Xác nhận Thanh toán Online
                        </h2>
                        <p className="text-blue-100 text-base md:text-sm mt-0.5">Bàn {tableOrder.tableNumber}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white text-3xl md:text-2xl leading-none hover:text-blue-200 active:scale-95 transition-all"
                    >
                        &times;
                    </button>
                </div>

                {/* Items list */}
                <div className="p-5 space-y-2 max-h-64 overflow-y-auto">
                    {(tableOrder.items || []).map((item, idx) => (
                        <div
                            key={idx}
                            className="flex justify-between items-center border-b border-border pb-2 last:border-b-0"
                        >
                            <div>
                                <p className="font-semibold text-foreground text-base md:text-sm">{item.name}</p>
                                <p className="text-sm text-muted-foreground">
                                    x{item.quantity} × {item.price.toLocaleString('vi-VN')}đ
                                </p>
                            </div>
                            <p className="font-bold text-foreground">
                                {(item.price * item.quantity).toLocaleString('vi-VN')}đ
                            </p>
                        </div>
                    ))}
                </div>

                {/* Total */}
                <div className="px-5 pb-2">
                    <div
                        className="flex justify-between items-center rounded-xl px-4 py-3"
                        style={{
                            background: 'rgba(59, 130, 246, 0.1)',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                        }}
                    >
                        <span className="text-lg font-bold text-foreground">Tổng cộng:</span>
                        <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                            {(tableOrder.total || 0).toLocaleString('vi-VN')}đ
                        </span>
                    </div>
                </div>

                <div className="px-5 pb-2 pt-1">
                    <p
                        className="text-xs rounded-lg px-3 py-2"
                        style={{
                            background: 'rgba(234, 179, 8, 0.1)',
                            border: '1px solid rgba(234, 179, 8, 0.3)',
                            color: 'var(--foreground)',
                        }}
                    >
                        ⚠️ Sau khi xác nhận, bạn sẽ được chuyển đến trang thanh toán Stripe an toàn.
                    </p>
                </div>

                {/* Actions */}
                <div className="px-5 pb-5 mt-1 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 py-4 md:py-3 rounded-xl font-semibold transition-all active:scale-95"
                    >
                        Hủy
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={processing}
                        className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white py-4 md:py-3 rounded-xl font-bold transition-all active:scale-95"
                    >
                        <FiCheckCircle size={20} className="md:text-[18px]" />
                        {processing ? 'Đang xử lý...' : 'Xác nhận thanh toán'}
                    </button>
                </div>
            </div>
        </div>
    );
}

const TableOrderManagementPage = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const user = useSelector((state) => state.user);
    const [tableOrder, setTableOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [callingWaiter, setCallingWaiter] = useState(false);
    const [waiterNote, setWaiterNote] = useState('');
    const [showWaiterInput, setShowWaiterInput] = useState(false);
    const [callCooldown, setCallCooldown] = useState(false);
    const [showBillPreview, setShowBillPreview] = useState(false);

    useEffect(() => {
        if (!user || user.role !== 'TABLE') {
            toast.error('Vui lòng quét mã QR tại bàn');
            navigate('/');
            return;
        }
        fetchTableOrder();
    }, [user, navigate]);

    const fetchTableOrder = async () => {
        try {
            setLoading(true);
            const response = await Axios({
                ...SummaryApi.get_current_table_order,
            });

            if (response.data.success) {
                setTableOrder(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching table order:', error);
            toast.error('Không thể tải đơn hàng');
        } finally {
            setLoading(false);
        }
    };

    // Called after user reviews the bill and confirms
    const handleOnlinePaymentConfirm = async () => {
        if (!tableOrder || tableOrder.items.length === 0) {
            toast.error('Không có món nào để thanh toán');
            return;
        }
        if (!allServed) {
            toast.error('Vui lòng chờ tất cả các món được phục vụ trước khi thanh toán.');
            return;
        }

        try {
            setProcessing(true);
            const response = await Axios({
                ...SummaryApi.checkout_table_order,
                data: { paymentMethod: 'online' },
            });

            if (response.data.success) {
                // AC 6 – redirect to Stripe
                window.location.href = response.data.data.checkoutUrl;
            }
        } catch (error) {
            console.error('Error checkout:', error);
            toast.error(error.response?.data?.message || 'Không thể tạo phiên thanh toán');
            setShowBillPreview(false);
        } finally {
            setProcessing(false);
        }
    };

    const handleCashCheckout = async () => {
        if (!tableOrder || tableOrder.items.length === 0) {
            toast.error('Không có món nào để thanh toán');
            return;
        }
        if (!allServed) {
            toast.error('Vui lòng chờ tất cả các món được phục vụ trước khi thanh toán.');
            return;
        }

        try {
            setProcessing(true);
            const response = await Axios({
                ...SummaryApi.checkout_table_order,
                data: { paymentMethod: 'at_counter' },
            });

            if (response.data.success) {
                toast.success(
                    '📋 Yêu cầu thanh toán tại quầy đã được gửi. Nhân viên sẽ đến hỗ trợ!',
                    { duration: 5000 }
                );
                navigate('/table-menu');
            }
        } catch (error) {
            console.error('Error checkout:', error);
            toast.error(error.response?.data?.message || 'Không thể thanh toán');
        } finally {
            setProcessing(false);
        }
    };

    const handleCancelOrder = async () => {
        if (!window.confirm('Bạn có chắc muốn hủy đơn hàng?')) {
            return;
        }

        try {
            const response = await Axios({
                ...SummaryApi.cancel_table_order,
            });

            if (response.data.success) {
                toast.success('Đã hủy đơn hàng');
                navigate('/table-menu');
            }
        } catch (error) {
            console.error('Error cancelling order:', error);
            toast.error('Không thể hủy đơn');
        }
    };

    const handleCallWaiter = async () => {
        if (callCooldown) {
            toast.error('Bạn vừa gửi yêu cầu. Vui lòng chờ một chút...');
            return;
        }
        setCallingWaiter(true);
        try {
            const response = await Axios({
                ...SummaryApi.call_waiter,
                data: { type: 'cancel_item', note: waiterNote.trim() },
            });
            if (response.data.success) {
                toast.success('🔔 Đã gửi! Nhân viên sẽ đến ngay.', { duration: 5000 });
                setWaiterNote('');
                setShowWaiterInput(false);
                // Cooldown 30 giây để tránh spam
                setCallCooldown(true);
                setTimeout(() => setCallCooldown(false), 30000);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Không thể gửi yêu cầu');
        } finally {
            setCallingWaiter(false);
        }
    };

    const handleLogout = async () => {
        try {
            await Axios({
                ...SummaryApi.logoutTable,
            });
            dispatch(logout());
            toast.success('Đã đăng xuất');
            navigate('/');
        } catch (error) {
            console.error('Error logging out:', error);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="animate-spin rounded-full h-16 w-16 md:h-12 md:w-12 border-b-2 border-[#C96048]"></div>
            </div>
        );
    }

    if (!tableOrder || tableOrder.items.length === 0) {
        return (
            <div className="min-h-screen bg-background">
                <div
                    className="text-white p-5 md:p-4"
                    style={{
                        background: 'linear-gradient(135deg, #C96048 0%, #d97a66 100%)',
                    }}
                >
                    <div className="max-w-7xl mx-auto flex justify-between items-center">
                        <h1 className="text-2xl md:text-xl font-bold font-[Bahnschrift,_system-ui]">Đơn hàng</h1>
                        <button
                            onClick={handleLogout}
                            className="bg-white dark:bg-gray-800 p-3 md:p-2 rounded-full active:scale-95 transition-all"
                            style={{ color: '#C96048' }}
                        >
                            <FiLogOut size={24} className="md:text-[20px]" />
                        </button>
                    </div>
                </div>
                <div className="max-w-2xl mx-auto p-8 text-center">
                    <p className="text-muted-foreground mb-4 text-lg md:text-base">
                        Chưa có món nào được gọi
                    </p>
                    <button
                        onClick={() => navigate('/table-menu')}
                        className="px-6 py-4 md:py-3 rounded-lg font-semibold text-white active:scale-95 transition-all"
                        style={{
                            background: 'linear-gradient(135deg, #C96048 0%, #d97a66 100%)',
                            boxShadow: '0 4px 12px rgba(201, 96, 72, 0.3)',
                        }}
                    >
                        Bắt đầu gọi món
                    </button>
                </div>
            </div>
        );
    }

    const formatTime = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const allServed =
        tableOrder.items.length > 0 &&
        tableOrder.items.every((item) => item.kitchenStatus === 'served');

    const pendingCount = tableOrder.items.filter(
        (item) => item.kitchenStatus !== 'served'
    ).length;

    return (
        <div className="min-h-screen bg-background">
            {/* Bill Preview Modal */}
            {showBillPreview && (
                <OnlineBillPreviewModal
                    tableOrder={tableOrder}
                    onClose={() => setShowBillPreview(false)}
                    onConfirm={handleOnlinePaymentConfirm}
                    processing={processing}
                />
            )}

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
                            Bàn {tableOrder.tableNumber}
                        </h1>
                        <p className="text-base md:text-sm opacity-90">Quản lý đơn hàng</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="bg-white dark:bg-gray-800 p-4 md:p-3 rounded-full hover:opacity-90 transition-all active:scale-95"
                        style={{ color: '#C96048' }}
                    >
                        <FiLogOut size={26} className="md:text-[24px]" />
                    </button>
                </div>
            </div>

            <div className="max-w-2xl mx-auto p-4 space-y-4">
                {/* Order Items */}
                <div
                    className="rounded-xl shadow-sm p-6 md:p-5"
                    style={{
                        background: 'rgba(var(--card-rgb, 255, 255, 255), 0.7)',
                        backdropFilter: 'blur(12px)',
                        border: '1px solid rgba(var(--border-rgb, 200, 200, 200), 0.3)',
                    }}
                >
                    <h2 className="text-xl md:text-lg font-bold mb-4 font-[Bahnschrift,_system-ui]">
                        <ShinyText
                            text="Món đã gọi"
                            disabled={false}
                            speed={3}
                            className="inline-block"
                            color="#C96048"
                            shineColor="#d97a66"
                            spread={90}
                        />
                    </h2>
                    <div className="space-y-3">
                        {tableOrder.items.map((item, index) => {
                            const statusCfg =
                                KITCHEN_STATUS_CONFIG[item.kitchenStatus] ??
                                KITCHEN_STATUS_CONFIG.pending;
                            return (
                                <div
                                    key={index}
                                    className="group relative flex justify-between items-start border-b border-border pb-3 last:border-b-0 transition-all duration-300 hover:scale-[1.01]"
                                >
                                    {/* Subtle hover glow */}
                                    <div
                                        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-lg"
                                        style={{
                                            background: 'radial-gradient(circle at center, rgba(201, 96, 72, 0.05) 0%, transparent 70%)',
                                        }}
                                    />
                                    <div className="flex-1 relative z-10">
                                        <h3 className="font-semibold text-foreground text-base md:text-sm">
                                            {item.name}
                                        </h3>
                                        <p className="text-sm text-muted-foreground">
                                            Gọi lúc: {formatTime(item.addedAt)}
                                        </p>
                                        <p className="font-bold mt-1" style={{ color: '#C96048' }}>
                                            {item.price.toLocaleString('vi-VN')}đ x{' '}
                                            {item.quantity}
                                        </p>
                                        {/* Kitchen status badge */}
                                        <span
                                            className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusCfg.className}`}
                                        >
                                            {item.kitchenStatus !== 'served' && (
                                                <FiClock size={10} />
                                            )}
                                            {statusCfg.label}
                                        </span>
                                    </div>
                                    <div className="text-right relative z-10">
                                        <p className="font-bold text-foreground">
                                            {(
                                                item.price * item.quantity
                                            ).toLocaleString('vi-VN')}
                                            đ
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Total */}
                <div
                    className="rounded-xl shadow-sm p-6 md:p-5"
                    style={{
                        background: 'rgba(var(--card-rgb, 255, 255, 255), 0.7)',
                        backdropFilter: 'blur(12px)',
                        border: '1px solid rgba(var(--border-rgb, 200, 200, 200), 0.3)',
                    }}
                >
                    <div className="flex justify-between items-center text-2xl md:text-xl font-bold">
                        <span className="text-foreground">Tổng cộng:</span>
                        <span style={{ color: '#C96048' }}>
                            {tableOrder.total.toLocaleString('vi-VN')}đ
                        </span>
                    </div>
                </div>

                {/* Gọi phục vụ */}
                <div
                    className="rounded-xl shadow-sm p-5"
                    style={{
                        background: 'rgba(var(--card-rgb, 255, 255, 255), 0.7)',
                        backdropFilter: 'blur(12px)',
                        border: '1px solid rgba(var(--border-rgb, 200, 200, 200), 0.3)',
                    }}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-semibold text-foreground">Cần hỗ trợ?</p>
                            <p className="text-sm text-muted-foreground mt-0.5">Gọi nhân viên đến bàn</p>
                        </div>
                        <button
                            onClick={() => setShowWaiterInput(p => !p)}
                            disabled={callCooldown}
                            className={`flex items-center gap-2 px-4 py-3 md:py-2.5 rounded-xl font-semibold text-sm transition-all active:scale-95 ${
                                callCooldown
                                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                                    : 'text-white hover:shadow-lg'
                            }`}
                            style={
                                !callCooldown
                                    ? {
                                        background: 'linear-gradient(135deg, rgba(201, 96, 72, 0.8) 0%, rgba(217, 122, 102, 0.8) 100%)',
                                    }
                                    : {}
                            }
                        >
                            <FiBell size={18} />
                            {callCooldown ? 'Đã gửi' : 'Gọi phục vụ'}
                        </button>
                    </div>

                    {showWaiterInput && !callCooldown && (
                        <div className="mt-3 space-y-2">
                            <textarea
                                value={waiterNote}
                                onChange={(e) => setWaiterNote(e.target.value)}
                                placeholder="Mô tả ngắn (VD: Muốn hủy món Phở bò)..."
                                rows={2}
                                className="w-full border border-border bg-background text-foreground rounded-lg px-3 py-3 md:py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#C96048]/50"
                            />
                            <button
                                onClick={handleCallWaiter}
                                disabled={callingWaiter}
                                className="w-full text-white py-3 md:py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-60 active:scale-95"
                                style={{
                                    background: 'linear-gradient(135deg, #C96048 0%, #d97a66 100%)',
                                    boxShadow: '0 4px 12px rgba(201, 96, 72, 0.3)',
                                }}
                            >
                                <FiBell size={16} />
                                {callingWaiter ? 'Đang gửi...' : 'Xác nhận gọi phục vụ'}
                            </button>
                        </div>
                    )}
                </div>

                {/* Payment Buttons */}
                {/* Banner: chỉ hiện khi chưa đủ điều kiện thanh toán */}
                {!allServed && (
                    <div
                        className="rounded-xl p-4 flex items-start gap-3"
                        style={{
                            background: 'rgba(234, 179, 8, 0.1)',
                            border: '1px solid rgba(234, 179, 8, 0.3)',
                        }}
                    >
                        <FiClock className="text-yellow-600 dark:text-yellow-500 mt-0.5 shrink-0" size={20} />
                        <div>
                            <p className="font-semibold text-yellow-800 dark:text-yellow-400">Chưa thể thanh toán</p>
                            <p className="text-sm text-yellow-700 dark:text-yellow-500 mt-0.5">
                                Còn <strong>{pendingCount}</strong> món chưa được phục vụ. Vui lòng chờ nhân viên mang món ra bàn trước khi thanh toán.
                            </p>
                        </div>
                    </div>
                )}

                <div className="space-y-3">
                    {/* Online payment – shows bill preview first (AC 3–5) */}
                    <BorderGlow
                        className="w-full"
                        glowColor="59 130 246"
                        backgroundColor="transparent"
                        borderRadius={12}
                        animated={true}
                        colors={['#3b82f6', '#60a5fa', '#93c5fd']}
                        glowIntensity={0.8}
                    >
                        <button
                            onClick={() => {
                                if (!allServed) {
                                    toast.error('Vui lòng chờ tất cả các món được phục vụ.');
                                    return;
                                }
                                setShowBillPreview(true);
                            }}
                            disabled={processing || !allServed}
                            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 text-white py-5 md:py-4 rounded-xl font-semibold text-lg flex items-center justify-center gap-2 hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                        >
                            <FiCreditCard size={26} className="md:text-[24px]" />
                            {processing ? 'Đang xử lý...' : 'Thanh toán online (Stripe)'}
                        </button>
                    </BorderGlow>

                    <BorderGlow
                        className="w-full"
                        glowColor="34 197 94"
                        backgroundColor="transparent"
                        borderRadius={12}
                        animated={true}
                        colors={['#22c55e', '#4ade80', '#86efac']}
                        glowIntensity={0.8}
                    >
                        <button
                            onClick={handleCashCheckout}
                            disabled={processing || !allServed}
                            className="w-full bg-gradient-to-r from-green-500 to-green-600 dark:from-green-600 dark:to-green-700 text-white py-5 md:py-4 rounded-xl font-semibold text-lg flex items-center justify-center gap-2 hover:from-green-600 hover:to-green-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                        >
                            <FiDollarSign size={26} className="md:text-[24px]" />
                            {processing ? 'Đang xử lý...' : 'Thanh toán tại quầy'}
                        </button>
                    </BorderGlow>

                    <button
                        onClick={() => navigate('/table-menu')}
                        className="w-full text-white py-5 md:py-4 rounded-xl font-semibold text-lg flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95"
                        style={{
                            background: 'linear-gradient(135deg, #C96048 0%, #d97a66 100%)',
                        }}
                    >
                        <FiShoppingBag size={26} className="md:text-[24px]" />
                        Tiếp tục gọi món
                    </button>

                    <button
                        onClick={handleCancelOrder}
                        className="w-full bg-gray-400 dark:bg-gray-700 text-white py-4 md:py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-gray-500 dark:hover:bg-gray-600 transition-all active:scale-95"
                    >
                        <FiX size={22} className="md:text-[20px]" />
                        Hủy đơn
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TableOrderManagementPage;
