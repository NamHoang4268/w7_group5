import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import Axios from '../utils/Axios';
import SummaryApi from '../common/SummaryApi';
import toast from 'react-hot-toast';
import {
    FiRefreshCw, FiWifi, FiWifiOff, FiMaximize, FiMinimize,
    FiPrinter, FiCheckCircle, FiClock, FiDollarSign
} from 'react-icons/fi';
import { MdOutlinePayment, MdTableRestaurant } from 'react-icons/md';
import { BsBellFill } from 'react-icons/bs';
import { CreditCard, Wallet } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

const SOCKET_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:8080';

// ──────────────────────────────────────────────────────
// VietQR config – BIDV account
// ──────────────────────────────────────────────────────
const VIETQR_BANK   = 'BIDV';
const VIETQR_ACCT   = '6331102124';
const VIETQR_NAME   = 'NGO KIM HOANG NAM';

function buildVietQRUrl(amount, description) {
    const desc = encodeURIComponent(description);
    const name = encodeURIComponent(VIETQR_NAME);
    return `https://img.vietqr.io/image/${VIETQR_BANK}-${VIETQR_ACCT}-compact2.png?amount=${amount}&addInfo=${desc}&accountName=${name}`;
}

// ──────────────────────────────────────────────────────
// Print bill helper
// ──────────────────────────────────────────────────────
function printBill(order) {
    const items = order.items || [];
    const total = order.total || 0;
    const now = format(new Date(), 'HH:mm dd/MM/yyyy', { locale: vi });
    const desc = `Thanh toan ban ${order.tableNumber} EatEase`;
    const qrUrl = buildVietQRUrl(total, desc);

    const rows = items.map(item =>
        `<tr>
            <td style="padding:4px 8px">${item.name}</td>
            <td style="padding:4px 8px;text-align:center">x${item.quantity}</td>
            <td style="padding:4px 8px;text-align:right">${(item.price * item.quantity).toLocaleString('vi-VN')}đ</td>
        </tr>`).join('');

    const html = `<!DOCTYPE html><html><head>
        <meta charset="utf-8"/>
        <title>Hóa đơn – Bàn ${order.tableNumber}</title>
        <style>
            body{font-family:'Arial',sans-serif;max-width:320px;margin:0 auto;padding:16px;font-size:13px}
            h2{text-align:center;margin:0 0 4px}
            p.sub{text-align:center;color:#555;margin:0 0 12px;font-size:11px}
            table{width:100%;border-collapse:collapse}
            thead tr{border-bottom:2px solid #333}
            tfoot tr{border-top:2px solid #333}
            .total{font-weight:bold;font-size:15px}
            .qr-section{text-align:center;margin-top:16px;padding-top:12px;border-top:1px dashed #ccc}
            .qr-section img{width:180px;height:180px;object-fit:contain}
            .qr-section p{font-size:11px;color:#555;margin:4px 0 0}
            .footer{text-align:center;margin-top:12px;font-size:11px;color:#777}
        </style></head><body onload="window.print()">
        <h2>🍽️ EatEase Restaurant</h2>
        <p class="sub">Bàn: ${order.tableNumber} &nbsp;|&nbsp; ${now}</p>
        <table>
            <thead><tr>
                <th style="text-align:left;padding:4px 8px">Món</th>
                <th>SL</th>
                <th style="text-align:right">Tiền</th>
            </tr></thead>
            <tbody>${rows}</tbody>
            <tfoot><tr>
                <td colspan="2" class="total" style="padding:8px 8px 4px">Tổng cộng:</td>
                <td class="total" style="text-align:right;padding:8px 8px 4px">${total.toLocaleString('vi-VN')}đ</td>
            </tr></tfoot>
        </table>

        <!-- VietQR Payment -->
        <div class="qr-section">
            <p style="font-weight:bold;font-size:12px;margin-bottom:6px">📱 Quét mã để thanh toán</p>
            <img src="${qrUrl}" alt="VietQR" />
            <p>${VIETQR_BANK} – ${VIETQR_ACCT}</p>
            <p>${VIETQR_NAME}</p>
            <p style="font-weight:bold;color:#e65c00">${total.toLocaleString('vi-VN')}đ</p>
        </div>

        <p class="footer">Cảm ơn quý khách! Hẹn gặp lại 🙏</p>
        </body></html>`;

    const win = window.open('', '_blank', 'width=400,height=700');
    if (!win) { toast.error('Vui lòng cho phép popup để in hóa đơn.'); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
}

// ──────────────────────────────────────────────────────
// Main CashierDashboard
// ──────────────────────────────────────────────────────
const CashierDashboard = () => {
    const user = useSelector((s) => s.user);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [connected, setConnected] = useState(false);
    const [clock, setClock] = useState(new Date());
    const [isExpanded, setIsExpanded] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [confirming, setConfirming] = useState(false);
    
    // Payment calculator states
    const [voucherCode, setVoucherCode] = useState('');
    const [customerPaid, setCustomerPaid] = useState('');
    
    const socketRef = useRef(null);

    useEffect(() => {
        const id = setInterval(() => setClock(new Date()), 1000);
        return () => clearInterval(id);
    }, []);

    useEffect(() => {
        document.body.style.overflow = isExpanded ? 'hidden' : 'unset';
        return () => { document.body.style.overflow = 'unset'; };
    }, [isExpanded]);

    const fetchOrders = useCallback(async () => {
        try {
            const res = await Axios({ ...SummaryApi.get_cashier_pending_orders });
            if (res.data?.success) setOrders(res.data.data || []);
        } catch {
            toast.error('Không thể tải danh sách thanh toán.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchOrders();
        const s = io(SOCKET_URL);
        socketRef.current = s;
        s.on('connect', () => setConnected(true));
        s.on('disconnect', () => setConnected(false));
        s.on('cashier:new_payment_request', (data) => {
            toast(`💳 Bàn ${data.tableNumber} yêu cầu thanh toán!`, {
                icon: <BsBellFill className="text-amber-500" />,
                duration: 8000,
                style: { border: '2px solid #f59e0b' },
            });
            fetchOrders();
        });
        s.on('cashier:order_paid_online', (data) => {
            toast.success(
                `✅ Bàn ${data.tableNumber} vừa thanh toán online thành công! (${(data.total || 0).toLocaleString('vi-VN')}đ)`,
                { duration: 6000 }
            );
            fetchOrders();
        });
        return () => s.disconnect();
    }, [fetchOrders]);

    const handleConfirmPayment = async () => {
        if (!selectedOrder) return;
        setConfirming(true);
        try {
            const res = await Axios({
                ...SummaryApi.cashier_confirm_payment,
                data: { tableOrderId: selectedOrder._id },
            });
            if (res.data?.success) {
                toast.success('Thanh toán thành công. Đơn hàng đã được hoàn tất.', { duration: 4000 });
                setSelectedOrder(null);
                fetchOrders();
            } else {
                toast.error(res.data?.message || 'Lỗi xác nhận thanh toán.');
            }
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Lỗi xác nhận thanh toán.');
        } finally {
            setConfirming(false);
        }
    };

    const totalPending = orders.reduce((s, o) => s + (o.total || 0), 0);

    return (
        <div className={`min-h-screen bg-background text-foreground transition-all duration-300 ${
            isExpanded ? 'fixed inset-0 z-[9999] overflow-y-auto w-full h-full' : 'relative'
        }`}>
            {/* ── Header ── */}
            <div className="border-b border-border px-4 py-3 sticky top-0 z-10 shadow-sm"
                style={{
                    background: 'rgba(var(--card-rgb), 0.95)',
                    backdropFilter: 'blur(12px)',
                }}
            >
                <div className="w-full flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                            style={{
                                background: 'linear-gradient(135deg, #C96048 0%, #d97a66 100%)',
                            }}
                        >
                            <MdOutlinePayment className="text-white text-xl" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold leading-none">Cashier Dashboard</h1>
                            <p className="text-muted-foreground text-xs mt-0.5">
                                {clock.toLocaleString('vi-VN', {
                                    hour: '2-digit', minute: '2-digit', second: '2-digit',
                                    weekday: 'short', day: '2-digit', month: '2-digit'
                                })}
                                {user?.name && ` — ${user.name}`}
                            </p>
                        </div>
                    </div>

                    <div className="hidden sm:flex items-center gap-4">
                        <div className="text-center">
                            <div className="flex items-center justify-center gap-1.5 mb-1">
                                <CreditCard className="w-5 h-5" style={{ color: '#C96048' }} />
                                <p className="text-2xl font-bold" style={{ color: '#C96048' }}>{orders.length}</p>
                            </div>
                            <p className="text-xs text-muted-foreground">Chờ thu tiền</p>
                        </div>
                        <div className="h-8 w-px bg-border" />
                        <div className="text-center">
                            <div className="flex items-center justify-center gap-1.5 mb-1">
                                <Wallet className="w-5 h-5 text-green-500 dark:text-green-400" />
                                <p className="text-lg font-bold text-green-500 dark:text-green-400">{totalPending.toLocaleString('vi-VN')}đ</p>
                            </div>
                            <p className="text-xs text-muted-foreground">Tổng cần thu</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ${
                            connected 
                                ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400' 
                                : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                        }`}>
                            {connected ? <FiWifi size={12} /> : <FiWifiOff size={12} />}
                            {connected ? 'Real-time' : 'Offline'}
                        </div>
                        <button
                            onClick={() => setIsExpanded(p => !p)}
                            className="flex items-center justify-center bg-card hover:bg-accent border border-border w-10 h-10 rounded-xl transition text-foreground active:scale-95"
                        >
                            {isExpanded ? <FiMinimize size={18} /> : <FiMaximize size={18} />}
                        </button>
                        <button
                            onClick={fetchOrders}
                            className="flex items-center gap-2 bg-card hover:bg-accent border border-border px-3 py-2 h-10 rounded-xl transition text-sm text-foreground active:scale-95"
                        >
                            <FiRefreshCw size={14} /> Làm mới
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Content ── */}
            <div className="p-4">
                {loading ? (
                    <div className="flex items-center justify-center h-64 text-muted-foreground">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 mr-3" style={{ borderColor: '#C96048' }} />
                        Đang tải...
                    </div>
                ) : orders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-3">
                        <FiDollarSign className="text-6xl text-green-500" />
                        <p className="text-xl font-semibold text-foreground">Không có đơn nào chờ thanh toán 🎉</p>
                        <p className="text-sm">Tất cả đơn hàng đã được xử lý</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* LEFT COLUMN: Danh sách hóa đơn chờ thanh toán */}
                        <div className="lg:col-span-1">
                            <h2 className="text-lg font-bold mb-3 flex items-center gap-2" style={{ color: '#C96048' }}>
                                <MdOutlinePayment className="w-6 h-6" /> Hóa đơn chờ thanh toán
                                <span className="text-sm font-normal text-muted-foreground">({orders.length})</span>
                            </h2>
                            
                            <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar" style={{ maxHeight: 'calc(100vh - 220px)' }}>
                                {orders.map((order) => {
                                    const itemCount = order.items?.length || 0;
                                    const waitMins = order.checkedOutAt
                                        ? Math.floor((Date.now() - new Date(order.checkedOutAt)) / 60000)
                                        : null;
                                    const isSelected = selectedOrder?._id === order._id;
                                    
                                    return (
                                        <div 
                                            key={order._id} 
                                            onClick={() => setSelectedOrder(order)}
                                            className={`rounded-xl overflow-hidden border transition-all cursor-pointer active:scale-[0.99] ${
                                                isSelected 
                                                    ? 'border-[#C96048] shadow-lg' 
                                                    : 'border-border hover:shadow-md'
                                            }`}
                                            style={{
                                                background: isSelected 
                                                    ? 'linear-gradient(135deg, rgba(201, 96, 72, 0.15) 0%, rgba(217, 122, 102, 0.08) 100%)'
                                                    : 'rgba(var(--card-rgb), 0.98)',
                                                backdropFilter: 'blur(12px)',
                                            }}
                                        >
                                            {/* Card header */}
                                            <div className="px-4 py-3 flex items-center justify-between border-b border-border">
                                                <div className="flex items-center gap-2">
                                                    <MdTableRestaurant className="text-lg" style={{ color: '#C96048' }} />
                                                    <h3 className="font-bold" style={{ color: '#C96048' }}>Bàn {order.tableNumber}</h3>
                                                </div>
                                                {waitMins !== null && (
                                                    <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                                                        waitMins > 10 
                                                            ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' 
                                                            : 'bg-accent text-muted-foreground'
                                                    }`}>
                                                        <FiClock size={10} /> {waitMins}p
                                                    </span>
                                                )}
                                            </div>

                                            {/* Info */}
                                            <div className="px-4 py-3">
                                                <p className="text-muted-foreground text-xs">{itemCount} món</p>
                                                <p className="text-xl font-bold text-foreground mt-0.5">
                                                    {(order.total || 0).toLocaleString('vi-VN')}đ
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* RIGHT COLUMN: Chi tiết đơn hàng + Tóm tắt thanh toán */}
                        <div className="lg:col-span-2">
                            {!selectedOrder ? (
                                <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3 border-2 border-dashed border-border rounded-2xl p-8">
                                    <MdOutlinePayment className="text-6xl opacity-30" />
                                    <p className="text-lg font-semibold text-foreground">Chọn hóa đơn để xem chi tiết</p>
                                    <p className="text-sm">Click vào hóa đơn bên trái để bắt đầu thanh toán</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* Chi tiết đơn hàng */}
                                    <div className="rounded-2xl border border-border overflow-hidden"
                                        style={{
                                            background: 'rgba(var(--card-rgb), 0.98)',
                                            backdropFilter: 'blur(12px)',
                                        }}
                                    >
                                        <div className="px-5 py-4 border-b border-border"
                                            style={{
                                                background: 'linear-gradient(135deg, rgba(201, 96, 72, 0.15) 0%, rgba(217, 122, 102, 0.08) 100%)',
                                            }}
                                        >
                                            <h3 className="text-lg font-bold" style={{ color: '#C96048' }}>
                                                Chi tiết đơn hàng - Bàn {selectedOrder.tableNumber}
                                            </h3>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                {selectedOrder.items?.length || 0} món đã gọi
                                            </p>
                                        </div>

                                        {/* Items table */}
                                        <div className="p-5">
                                            <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                                                {(selectedOrder.items || []).map((item, idx) => (
                                                    <div key={idx} className="flex items-center justify-between gap-4 bg-accent/30 rounded-lg px-4 py-3 border border-border">
                                                        <div className="flex-1">
                                                            <p className="font-semibold text-foreground">{item.name}</p>
                                                            {item.note && (
                                                                <p className="text-xs mt-1 text-muted-foreground">📝 {item.note}</p>
                                                            )}
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-sm text-muted-foreground">x{item.quantity}</p>
                                                            <p className="text-sm font-medium text-foreground">{item.price.toLocaleString('vi-VN')}đ</p>
                                                        </div>
                                                        <div className="text-right min-w-[80px]">
                                                            <p className="font-bold" style={{ color: '#C96048' }}>
                                                                {(item.price * item.quantity).toLocaleString('vi-VN')}đ
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Tóm tắt thanh toán */}
                                    <div className="rounded-2xl border border-border overflow-hidden"
                                        style={{
                                            background: 'rgba(var(--card-rgb), 0.98)',
                                            backdropFilter: 'blur(12px)',
                                        }}
                                    >
                                        <div className="px-5 py-4 border-b border-border"
                                            style={{
                                                background: 'linear-gradient(135deg, rgba(201, 96, 72, 0.15) 0%, rgba(217, 122, 102, 0.08) 100%)',
                                            }}
                                        >
                                            <h3 className="text-lg font-bold" style={{ color: '#C96048' }}>Tóm tắt thanh toán</h3>
                                        </div>

                                        <div className="p-5 space-y-4">
                                            {/* Voucher input */}
                                            <div>
                                                <label className="text-sm font-medium text-foreground mb-2 block">Mã giảm giá</label>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        value={voucherCode}
                                                        onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                                                        placeholder="Nhập mã giảm giá..."
                                                        className="flex-1 px-4 py-2.5 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/50 bg-background text-foreground"
                                                    />
                                                    <button
                                                        className="px-4 py-2.5 rounded-xl text-sm font-semibold transition border border-border bg-accent hover:bg-accent/80 text-foreground"
                                                    >
                                                        Áp dụng
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Total summary */}
                                            <div className="space-y-2 pt-3 border-t border-border">
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-muted-foreground">Tạm tính:</span>
                                                    <span className="font-medium text-foreground">{(selectedOrder.total || 0).toLocaleString('vi-VN')}đ</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-muted-foreground">Giảm giá:</span>
                                                    <span className="font-medium text-green-600 dark:text-green-400">-0đ</span>
                                                </div>
                                                <div className="flex justify-between items-center pt-2 border-t border-border">
                                                    <span className="text-lg font-bold text-foreground">Tổng cộng:</span>
                                                    <span className="text-2xl font-bold" style={{ color: '#C96048' }}>
                                                        {(selectedOrder.total || 0).toLocaleString('vi-VN')}đ
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Payment calculator */}
                                            <div className="pt-4 border-t border-border space-y-3">
                                                <h4 className="font-semibold text-foreground">Hỗ trợ tính tiền</h4>
                                                
                                                <div>
                                                    <label className="text-sm font-medium text-foreground mb-2 block">Tiền khách đưa</label>
                                                    <input
                                                        type="number"
                                                        value={customerPaid}
                                                        onChange={(e) => setCustomerPaid(e.target.value)}
                                                        placeholder="Nhập số tiền..."
                                                        className="w-full px-4 py-2.5 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/50 bg-background text-foreground text-lg font-semibold"
                                                    />
                                                </div>

                                                {customerPaid && parseFloat(customerPaid) >= (selectedOrder.total || 0) && (
                                                    <div className="rounded-xl p-4"
                                                        style={{
                                                            background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(22, 163, 74, 0.08) 100%)',
                                                            border: '1px solid rgba(34, 197, 94, 0.3)',
                                                        }}
                                                    >
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-sm font-medium text-green-700 dark:text-green-400">Tiền thừa trả khách:</span>
                                                            <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                                                                {(parseFloat(customerPaid) - (selectedOrder.total || 0)).toLocaleString('vi-VN')}đ
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Action buttons */}
                                            <div className="flex gap-3 pt-4">
                                                <button
                                                    onClick={() => printBill(selectedOrder)}
                                                    className="flex-1 flex items-center justify-center gap-2 bg-accent hover:bg-accent/80 text-foreground py-3 rounded-xl font-semibold transition border border-border active:scale-95"
                                                >
                                                    <FiPrinter size={18} /> In hóa đơn
                                                </button>
                                                <button
                                                    onClick={handleConfirmPayment}
                                                    disabled={confirming}
                                                    className="flex-1 flex items-center justify-center gap-2 text-white py-3 rounded-xl font-bold transition disabled:opacity-60 active:scale-95"
                                                    style={{
                                                        background: confirming ? 'rgba(201, 96, 72, 0.6)' : 'linear-gradient(135deg, #C96048 0%, #d97a66 100%)',
                                                    }}
                                                >
                                                    <FiCheckCircle size={18} />
                                                    {confirming ? 'Đang xử lý...' : 'Xác nhận đã thu tiền'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(201, 96, 72, 0.3);
                    border-radius: 3px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(201, 96, 72, 0.5);
                }
            `}</style>
        </div>
    );
};

export default CashierDashboard;
