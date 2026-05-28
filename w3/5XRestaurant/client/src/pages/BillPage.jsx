import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
    FaSearch,
    FaFileInvoice,
    FaFileExcel,
    FaFilter,
    FaEye,
    FaEdit,
    FaTimesCircle,
    FaChartLine,
    FaChartBar,
    FaChartPie,
    FaCoins,
} from 'react-icons/fa';
import { LuCheck, LuPrinter } from 'react-icons/lu';
import { BsCoin } from 'react-icons/bs';
import { DisplayPriceInVND } from '../utils/DisplayPriceInVND';
import { toast } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { fetchAllOrders, updateOrderStatus } from '../store/orderSlice';
import ConfirmBox from '../components/ConfirmBox';
import Loading from '../components/Loading';
import { Input } from '@/components/ui/input';
import {
    Card,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Label } from '@radix-ui/react-label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import BookingsTab from '../components/BookingsTab';
import CustomersTab from '../components/CustomersTab';
import { Bar, Line, Pie } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    ArcElement,
    Title,
    Tooltip,
    Legend
);

// ─── Helpers ────────────────────────────────────────────────────────────────
const getStatusBadge = (status) => {
    const statusConfig = {
        'Chờ xử lý': {
            text: 'Chờ xử lý',
            className: 'bg-zinc-100 text-zinc-800',
        },
        'Đang chờ thanh toán': {
            text: 'Chờ thanh toán',
            className: 'bg-yellow-100 text-yellow-800',
        },
        'Chờ thanh toán': {
            text: 'Chờ thanh toán',
            className: 'bg-yellow-100 text-yellow-800',
        },
        'Đã thanh toán': {
            text: 'Đã thanh toán',
            className: 'bg-green-100 text-green-800',
        },
        'Đã hủy': { text: 'Đã hủy', className: 'bg-red-100 text-red-800' },
    };
    const config = statusConfig[status] || {
        text: status || 'Chưa xác định',
        className: 'bg-gray-100 text-gray-800',
    };
    return (
        <span
            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.className}`}
        >
            {config.text}
        </span>
    );
};

// ─── Invoices Tab (grouped, was BillPage) ───────────────────────────────────
const InvoicesTab = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { allOrders: orders = [], loading } = useSelector(
        (state) => state.orders
    );
    const user = useSelector((state) => state.user);
    const canAccessBills = ['ADMIN', 'WAITER', 'CASHIER'].includes(user?.role);
    const canUpdateStatus = [].includes(user?.role);
    const canPay = ['ADMIN', 'CASHIER'].includes(user?.role);

    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [filterParams, setFilterParams] = useState({
        status: '',
        startDate: '',
        endDate: '',
    });
    const [filteredOrders, setFilteredOrders] = useState([]);
    const [dateError, setDateError] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [openDetailView, setOpenDetailView] = useState(false);
    const [openUpdateStatus, setOpenUpdateStatus] = useState(false);
    const [openPaymentConfirm, setOpenPaymentConfirm] = useState(false);
    const [openCancelConfirm, setOpenCancelConfirm] = useState(false);
    const [newStatusProcess, setNewStatusProcess] = useState('');
    const [cancelReason, setCancelReason] = useState('');
    const [isUpdatingSubStatus, setIsUpdatingSubStatus] = useState(false);

    useEffect(() => {
        const t = setTimeout(() => {
            setDebouncedSearch(searchTerm.trim().toLowerCase());
            setCurrentPage(1);
        }, 300);
        return () => clearTimeout(t);
    }, [searchTerm]);

    useEffect(() => {
        // Chờ user hydrate (user._id rỗng = chưa load xong)
        if (!user?._id) return;
        const load = async () => {
            if (!localStorage.getItem('accesstoken') || !canAccessBills) {
                navigate('/dashboard/profile');
                return;
            }
            try {
                await dispatch(fetchAllOrders(filterParams)).unwrap();
            } catch (err) {
                const status = err?.status ?? err?.response?.status;
                if (status !== 401)
                    toast.error('Có lỗi xảy ra khi tải đơn hàng');
            }
        };
        load();
    }, [dispatch, canAccessBills, navigate, filterParams, user?._id]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        const next = { ...filterParams, [name]: value };
        if (
            next.startDate &&
            next.endDate &&
            new Date(next.startDate) > new Date(next.endDate)
        ) {
            setDateError('Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc');
            return;
        }
        setDateError('');
        setFilterParams(next);
        setCurrentPage(1);
    };

    const resetFilters = () => {
        setFilterParams({ status: '', startDate: '', endDate: '' });
        setSearchTerm('');
        setDateError('');
        setCurrentPage(1);
    };

    useEffect(() => {
        try {
            let result = [...orders];
            if (filterParams.status)
                result = result.filter(
                    (o) => o.payment_status === filterParams.status
                );
            if (filterParams.startDate)
                result = result.filter(
                    (o) =>
                        new Date(o.createdAt) >=
                        new Date(filterParams.startDate)
                );
            if (filterParams.endDate) {
                const e = new Date(filterParams.endDate);
                e.setHours(23, 59, 59, 999);
                result = result.filter((o) => new Date(o.createdAt) <= e);
            }
            setFilteredOrders(result);
        } catch {
            setFilteredOrders(orders);
        }
    }, [orders, filterParams]);

    // Map each TableOrder directly (no more 2-min merging since backend already groups items per table order)
    const groupedOrders = useMemo(() => {
        return [...filteredOrders]
            .map((ob) => {
                const tableNum =
                    ob.tableNumber &&
                    ob.tableNumber !== '-' &&
                    ob.tableNumber !== 'null'
                        ? ob.tableNumber
                        : 'Mang đi/Khác';

                let items = [];
                if (ob.products?.length > 0) {
                    items = ob.products.map((p) => ({
                        name: p.name || 'N/A',
                        quantity: p.quantity || 1,
                        price: p.price || 0,
                    }));
                } else {
                    const qty = ob.quantity || 1;
                    const lineTotal = ob.totalAmt || 0;
                    items = [
                        {
                            name: ob.product_details?.name || 'N/A',
                            quantity: qty,
                            price: qty > 0 ? lineTotal / qty : 0,
                        },
                    ];
                }

                // Ư u tiên: (1) tên đăng ký từ Customer loyalty
                //            (2) số điện thoại (nếu chỉ check-in bằng số đt)
                //            (3) fallback rõ ràng theo bàn
                const custName = ob.customerId?.name?.trim();
                const custPhone = ob.customerId?.phone?.trim();
                const customerName =
                    custName ||
                    (custPhone ? `Khách ${custPhone}` : null) ||
                    (tableNum !== 'Mang đi/Khác'
                        ? `Bàn ${tableNum} – Khách vãng lai`
                        : 'Khách vãng lai');

                return {
                    virtualId: ob._id,
                    orderId: ob._id.slice(-8).toUpperCase(),
                    originalOrderIds: [ob._id],
                    documentIds: [ob._id],
                    tableNumber: tableNum,
                    payment_status: ob.payment_status || 'Chờ xử lý',
                    createdAt: ob.createdAt,
                    customerName,
                    customerPhone: custPhone || '',
                    totalAmt: ob.totalAmt || 0,
                    items: items,
                };
            })
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }, [filteredOrders]);

    const searchedOrders = useMemo(() => {
        if (!debouncedSearch) return groupedOrders;
        return groupedOrders.filter((g) =>
            [
                g.orderId,
                g.tableNumber,
                ...(g.originalOrderIds || []),
                ...(g.documentIds || []),
            ]
                .filter(Boolean)
                .some((f) => String(f).toLowerCase().includes(debouncedSearch))
        );
    }, [groupedOrders, debouncedSearch]);

    const { totalRevenue, orderCount } = useMemo(
        () =>
            searchedOrders.reduce(
                (acc, o) => ({
                    totalRevenue: acc.totalRevenue + (o.totalAmt || 0),
                    orderCount: acc.orderCount + 1,
                }),
                { totalRevenue: 0, orderCount: 0 }
            ),
        [searchedOrders]
    );

    const handleUpdateStatusGroup = async (group, status, reason = '') => {
        try {
            setIsUpdatingSubStatus(true);
            await Promise.all(
                group.documentIds.map((docId) => {
                    const updateData = { orderId: docId, status };
                    if (status === 'Đã hủy' && reason)
                        updateData.cancelReason = reason;
                    return dispatch(updateOrderStatus(updateData)).unwrap();
                })
            );
            await dispatch(fetchAllOrders(filterParams)).unwrap();
            toast.success(`Cập nhật trạng thái thành "${status}" thành công!`);
            setOpenUpdateStatus(false);
            setOpenPaymentConfirm(false);
            setOpenCancelConfirm(false);
            setOpenDetailView(false);
            setSelectedOrder(null);
            setCancelReason('');
        } catch (error) {
            toast.error(
                typeof error === 'string'
                    ? error
                    : error?.message || 'Cập nhật thất bại'
            );
        } finally {
            setIsUpdatingSubStatus(false);
        }
    };

    const exportToExcel = () => {
        const data = groupedOrders.map((o) => ({
            'Mã hóa đơn': o.orderId,
            'Số bàn': o.tableNumber,
            'Ngày tạo': format(new Date(o.createdAt), 'dd/MM/yyyy HH:mm', {
                locale: vi,
            }),
            'Khách hàng': o.customerName,
            'Sản phẩm (SL)': o.items
                .map((i) => `${i.name} (x${i.quantity})`)
                .join(', '),
            'Tổng tiền': o.totalAmt,
            'Trạng thái': o.payment_status,
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Danh sách đơn hàng');
        XLSX.writeFile(
            wb,
            `danh-sach-don-hang-${new Date().toISOString().split('T')[0]}.xlsx`
        );
    };

    const printBill = (orderGroup) => {
        const printWindow = window.open('', '_blank');
        const total = orderGroup.totalAmt || 0;
        const desc = encodeURIComponent(
            `Thanh toan ${orderGroup.orderId} ban ${orderGroup.tableNumber}`
        );
        const qrUrl = `https://img.vietqr.io/image/BIDV-6331102124-compact2.png?amount=${total}&addInfo=${desc}&accountName=NGO%20KIM%20HOANG%20NAM`;
        const itemsHtml = orderGroup.items
            .map(
                (item, i) =>
                    `<tr><td>${i + 1}</td><td>${item.name}</td><td class="text-right">${DisplayPriceInVND(item.price)}</td><td class="text-center">${item.quantity}</td><td class="text-right">${DisplayPriceInVND(item.price * item.quantity)}</td></tr>`
            )
            .join('');
        printWindow.document.write(
            `<!DOCTYPE html><html><head><title>Hóa đơn ${orderGroup.orderId}</title><style>body{font-family:Arial;font-size:12px;padding:20px}.title{font-size:18px;font-weight:bold;text-align:center}.info-row{display:flex;margin-bottom:5px}.info-label{font-weight:bold;width:120px}table{width:100%;border-collapse:collapse;margin-top:10px}th,td{border-bottom:1px solid #ddd;padding:8px;text-align:left}th{background:#f2f2f2;border-bottom:2px solid #333}.text-right{text-align:right}.text-center{text-align:center}.total-row td{border-top:2px solid #333;font-weight:bold}.qr-section{text-align:center;margin:20px 0;padding:16px;border:1px dashed #ccc;border-radius:8px}.qr-section img{width:180px;height:180px}.qr-amount{font-size:16px;font-weight:bold;color:#e65c00}</style></head><body onload="window.print()"><div class="title">HÓA ĐƠN THANH TOÁN</div><div style="text-align:center;margin-bottom:20px">Ngày: ${format(new Date(orderGroup.createdAt), 'dd/MM/yyyy HH:mm', { locale: vi })}</div><div class="info"><div class="info-row"><div class="info-label">Mã HD:</div><div>${orderGroup.orderId}</div></div><div class="info-row"><div class="info-label">Số bàn:</div><div>${orderGroup.tableNumber}</div></div><div class="info-row"><div class="info-label">Khách:</div><div>${orderGroup.customerName}<br>${orderGroup.customerPhone}</div></div></div><table><thead><tr><th>STT</th><th>Sản phẩm</th><th class="text-right">Đơn giá</th><th class="text-center">SL</th><th class="text-right">Thành tiền</th></tr></thead><tbody>${itemsHtml}</tbody><tfoot><tr class="total-row"><td colspan="4" class="text-right">Tổng thanh toán:</td><td class="text-right">${DisplayPriceInVND(total)}</td></tr></tfoot></table><div class="qr-section"><p style="font-weight:bold;font-size:13px;margin-bottom:8px">📱 Quét mã QR để thanh toán nhanh</p><img src="${qrUrl}" alt="VietQR" /><p>BIDV – 6331102124</p><p>NGO KIM HOANG NAM</p><p class="qr-amount">${DisplayPriceInVND(total)}</p></div></body></html>`
        );
        printWindow.document.close();
    };

    const statusOptions = [
        { value: '', label: 'Tất cả' },
        { value: 'Chờ thanh toán', label: 'Chờ thanh toán' },
        { value: 'Đã thanh toán', label: 'Đã thanh toán' },
        { value: 'Đã hủy', label: 'Đã hủy' },
    ];
    const canCancelOrder = (s) =>
        ['Chờ xử lý', 'Đang chờ thanh toán', 'Chờ thanh toán'].includes(s);

    const totalItems = searchedOrders.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const validPage = Math.min(Math.max(1, currentPage), totalPages);
    const paginatedOrders = searchedOrders.slice(
        (validPage - 1) * pageSize,
        validPage * pageSize
    );

    return (
        <div className="space-y-4">
            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                    {
                        label: 'Tổng số hóa đơn',
                        value: orderCount,
                        icon: <FaFileInvoice className="h-6 w-6" />,
                    },
                    {
                        label: 'Tổng doanh thu',
                        value: DisplayPriceInVND(totalRevenue),
                        icon: <BsCoin className="h-6 w-6" />,
                    },
                    {
                        label: 'Đang hiển thị',
                        value: `${paginatedOrders.length} / ${searchedOrders.length}`,
                        icon: <FaFilter className="h-6 w-6" />,
                    },
                ].map((card, i) => (
                    <div
                        key={i}
                        className="liquid-glass rounded-lg shadow-md p-3 flex items-center gap-4"
                    >
                        <div className="p-3 rounded-full border-[3px] liquid-glass text-highlight">
                            {card.icon}
                        </div>
                        <div>
                            <p className="text-xs font-bold">{card.label}</p>
                            <p className="text-xl font-bold">{card.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="rounded-lg border-2 liquid-glass px-4 py-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
                    <div className="space-y-2">
                        <Label className="block font-medium">Tìm kiếm</Label>
                        <div className="relative">
                            <Input
                                type="text"
                                placeholder="Mã đơn, Số bàn..."
                                className="w-full pl-10 h-10 text-sm placeholder:text-foreground border-foreground bg-transparent"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label className="block font-medium">Trạng thái</Label>
                        <select
                            name="status"
                            className="text-sm h-10 w-full border-foreground border bg-background px-3 rounded-md cursor-pointer"
                            value={filterParams.status}
                            onChange={handleFilterChange}
                        >
                            {statusOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <Label className="block font-medium mb-1">
                            Từ ngày
                        </Label>
                        <input
                            type="date"
                            name="startDate"
                            className="text-sm h-10 w-full border-foreground border bg-background px-3 rounded-md"
                            value={filterParams.startDate}
                            onChange={handleFilterChange}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="block font-medium mb-1">
                            Đến ngày
                        </Label>
                        <input
                            type="date"
                            name="endDate"
                            className={`w-full h-10 border ${dateError ? 'border-red-500' : 'border-foreground'} bg-background px-3 rounded-md text-sm`}
                            value={filterParams.endDate}
                            onChange={handleFilterChange}
                            min={filterParams.startDate}
                        />
                        {dateError && (
                            <p className="mt-1 text-xs text-red-500">
                                {dateError}
                            </p>
                        )}
                    </div>
                </div>
                <div className="flex justify-end mt-4 gap-2">
                    <button
                        onClick={resetFilters}
                        className="px-4 h-9 font-medium border border-border rounded-lg text-sm bg-background hover:bg-muted"
                    >
                        Đặt lại
                    </button>
                    <button
                        onClick={exportToExcel}
                        className="flex items-center px-4 h-9 text-white bg-green-600 rounded-lg hover:bg-green-700 text-sm"
                    >
                        <FaFileExcel className="mr-2" /> Xuất Excel
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto w-full bg-background border border-border rounded-lg shadow-sm">
                <table className="w-full text-sm text-left whitespace-nowrap">
                    <thead className="text-xs uppercase bg-muted text-muted-foreground border-b border-border">
                        <tr>
                            <th className="px-6 py-4 font-bold">Mã đơn hàng</th>
                            <th className="px-6 py-4 font-bold text-center">
                                Số bàn
                            </th>
                            <th className="px-6 py-4 font-bold text-right">
                                Tổng tiền
                            </th>
                            <th className="px-6 py-4 font-bold text-center">
                                Trạng thái
                            </th>
                            <th className="px-6 py-4 font-bold text-center">
                                Thời gian tạo
                            </th>
                            <th className="px-6 py-4 font-bold text-center">
                                Hành động
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedOrders.length === 0 ? (
                            <tr>
                                <td
                                    colSpan="6"
                                    className="px-6 py-8 text-center text-muted-foreground"
                                >
                                    Không có dữ liệu thống kê trong khoảng thời
                                    gian này.
                                </td>
                            </tr>
                        ) : (
                            paginatedOrders.map((order, idx) => (
                                <tr
                                    key={order.orderId}
                                    className={`border-b border-border last:border-0 hover:bg-muted/50 transition-colors ${idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}`}
                                >
                                    <td className="px-6 py-4 font-medium text-rose-500">
                                        {order.orderId}
                                    </td>
                                    <td className="px-6 py-4 text-center font-bold">
                                        {order.tableNumber}
                                    </td>
                                    <td className="px-6 py-4 text-right font-medium text-green-600">
                                        {DisplayPriceInVND(order.totalAmt)}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {getStatusBadge(order.payment_status)}
                                    </td>
                                    <td className="px-6 py-4 text-center text-muted-foreground">
                                        {format(
                                            new Date(order.createdAt),
                                            'dd/MM/yyyy HH:mm',
                                            { locale: vi }
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                onClick={() => {
                                                    setSelectedOrder(order);
                                                    setOpenDetailView(true);
                                                }}
                                                className="p-2 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 transition-colors"
                                                title="Xem chi tiết"
                                            >
                                                <FaEye size={16} />
                                            </button>
                                            {canUpdateStatus &&
                                                ![
                                                    'Đã thanh toán',
                                                    'Đã hủy',
                                                ].includes(
                                                    order.payment_status
                                                ) && (
                                                    <button
                                                        onClick={() => {
                                                            setSelectedOrder(
                                                                order
                                                            );
                                                            setNewStatusProcess(
                                                                order.payment_status
                                                            );
                                                            setOpenUpdateStatus(
                                                                true
                                                            );
                                                        }}
                                                        className="p-2 bg-indigo-100 text-indigo-600 rounded hover:bg-indigo-200 transition-colors"
                                                        title="Cập nhật trạng thái"
                                                    >
                                                        <FaEdit size={16} />
                                                    </button>
                                                )}
                                            {canPay &&
                                                [
                                                    'Chờ xử lý',
                                                    'Đang chuẩn bị',
                                                    'Đã phục vụ',
                                                    'Đang chờ thanh toán',
                                                    'Chờ thanh toán',
                                                ].includes(
                                                    order.payment_status
                                                ) && (
                                                    <button
                                                        onClick={() => {
                                                            setSelectedOrder(
                                                                order
                                                            );
                                                            setOpenPaymentConfirm(
                                                                true
                                                            );
                                                        }}
                                                        className="p-2 bg-green-100 text-green-600 rounded hover:bg-green-200 transition-colors"
                                                        title="Xác nhận thanh toán"
                                                    >
                                                        <LuCheck size={16} />
                                                    </button>
                                                )}
                                            {canCancelOrder(
                                                order.payment_status
                                            ) && (
                                                <button
                                                    onClick={() => {
                                                        setSelectedOrder(order);
                                                        setOpenCancelConfirm(
                                                            true
                                                        );
                                                    }}
                                                    className="p-2 bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors"
                                                    title="Hủy đơn"
                                                >
                                                    <FaTimesCircle size={16} />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => printBill(order)}
                                                className="p-2 bg-zinc-100 text-zinc-600 rounded hover:bg-zinc-200 transition-colors"
                                                title="In hóa đơn"
                                            >
                                                <LuPrinter size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalItems > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 px-2 text-sm text-foreground">
                    <div className="flex items-center gap-2">
                        <span>Hiển thị</span>
                        <select
                            className="border border-border rounded-md px-2 py-1 bg-background cursor-pointer"
                            value={pageSize}
                            onChange={(e) => {
                                setPageSize(Number(e.target.value));
                                setCurrentPage(1);
                            }}
                        >
                            {[10, 20, 50].map((n) => (
                                <option key={n} value={n}>
                                    {n}
                                </option>
                            ))}
                        </select>
                        <span>mỗi trang</span>
                    </div>
                    <div className="text-muted-foreground">
                        Hiển thị {(validPage - 1) * pageSize + 1} đến{' '}
                        {Math.min(validPage * pageSize, totalItems)} trong{' '}
                        {totalItems} kết quả
                    </div>
                    <div className="flex items-center gap-1">
                        {['<<', '<', null, '>', '>>'].map((label, i) => {
                            const page = [
                                1,
                                validPage - 1,
                                null,
                                validPage + 1,
                                totalPages,
                            ][i];
                            const disabled = [
                                validPage === 1,
                                validPage === 1,
                                false,
                                validPage === totalPages,
                                validPage === totalPages,
                            ][i];
                            if (label === null)
                                return (
                                    <select
                                        key="sel"
                                        className="border border-border rounded-md px-2 py-1 bg-background cursor-pointer"
                                        value={validPage}
                                        onChange={(e) =>
                                            setCurrentPage(
                                                Number(e.target.value)
                                            )
                                        }
                                    >
                                        {Array.from(
                                            { length: totalPages },
                                            (_, k) => k + 1
                                        ).map((p) => (
                                            <option key={p} value={p}>
                                                {p}
                                            </option>
                                        ))}
                                    </select>
                                );
                            return (
                                <button
                                    key={label}
                                    onClick={() => setCurrentPage(page)}
                                    disabled={disabled}
                                    className={`p-1 px-2 border border-border rounded-md transition-colors ${disabled ? 'opacity-50 cursor-not-allowed bg-muted/30 text-muted-foreground' : 'bg-background hover:bg-muted'}`}
                                >
                                    {label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {loading && <Loading />}

            {/* Detail Modal */}
            {openDetailView && selectedOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-background rounded-lg shadow-xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
                        <div className="flex items-center justify-between p-4 border-b">
                            <h3 className="text-lg font-bold">
                                Chi tiết đơn hàng {selectedOrder.orderId}
                            </h3>
                            <button
                                onClick={() => setOpenDetailView(false)}
                                className="text-gray-500 hover:text-red-500"
                            >
                                <FaTimesCircle size={20} />
                            </button>
                        </div>
                        <div className="p-4 overflow-y-auto flex-1">
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div>
                                    <p className="text-sm text-gray-500 mb-1">
                                        Số bàn
                                    </p>
                                    <p className="font-bold text-lg">
                                        {selectedOrder.tableNumber}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500 mb-1">
                                        Trạng thái
                                    </p>
                                    {getStatusBadge(
                                        selectedOrder.payment_status
                                    )}
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500 mb-1">
                                        Khách hàng
                                    </p>
                                    <p className="font-medium">
                                        {selectedOrder.customerName}
                                    </p>
                                    <p className="text-xs">
                                        {selectedOrder.customerPhone}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500 mb-1">
                                        Thời gian tạo
                                    </p>
                                    <p className="font-medium">
                                        {format(
                                            new Date(selectedOrder.createdAt),
                                            'dd/MM/yyyy HH:mm',
                                            { locale: vi }
                                        )}
                                    </p>
                                </div>
                            </div>
                            <h4 className="font-bold border-b pb-2 mb-3">
                                Danh sách món
                            </h4>
                            <div className="space-y-3 mb-6">
                                {selectedOrder.items.map((item, i) => (
                                    <div
                                        key={i}
                                        className="flex justify-between items-center bg-muted/30 p-3 rounded-lg"
                                    >
                                        <div className="flex-1">
                                            <p className="font-medium">
                                                {item.name}
                                            </p>
                                            <p className="text-sm text-red-500">
                                                {DisplayPriceInVND(item.price)}
                                            </p>
                                        </div>
                                        <div className="px-4 font-bold text-gray-600">
                                            x{item.quantity}
                                        </div>
                                        <div className="font-bold min-w-[100px] text-right">
                                            {DisplayPriceInVND(
                                                item.price * item.quantity
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-between items-center bg-muted/50 p-4 rounded-lg border">
                                <span className="font-bold text-lg">
                                    Tổng tiền thanh toán
                                </span>
                                <span className="font-bold text-2xl text-green-600">
                                    {DisplayPriceInVND(selectedOrder.totalAmt)}
                                </span>
                            </div>
                        </div>
                        <div className="p-4 border-t flex justify-end gap-3 bg-muted/20">
                            {canPay &&
                                !['Đã thanh toán', 'Đã hủy'].includes(
                                    selectedOrder.payment_status
                                ) && (
                                    <button
                                        onClick={() =>
                                            handleUpdateStatusGroup(
                                                selectedOrder,
                                                'Đã thanh toán'
                                            )
                                        }
                                        disabled={isUpdatingSubStatus}
                                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-medium"
                                    >
                                        {isUpdatingSubStatus
                                            ? 'Đang xử lý...'
                                            : 'Xác nhận thanh toán'}
                                    </button>
                                )}
                            <button
                                onClick={() => setOpenDetailView(false)}
                                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 font-medium"
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Payment Confirm Modal */}
            {openPaymentConfirm && selectedOrder && (
                <ConfirmBox
                    title="Xác nhận thanh toán"
                    message={`Xác nhận đã nhận thanh toán cho đơn ${selectedOrder.orderId}?`}
                    confirm={() =>
                        handleUpdateStatusGroup(selectedOrder, 'Đã thanh toán')
                    }
                    close={() => setOpenPaymentConfirm(false)}
                />
            )}

            {/* Cancel Confirm Modal */}
            {openCancelConfirm && selectedOrder && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-background rounded-lg shadow-xl w-full max-w-md overflow-hidden">
                        <div className="p-4 border-b">
                            <h3 className="text-lg font-bold">Hủy đơn hàng</h3>
                        </div>
                        <div className="p-4 space-y-3">
                            <p className="text-sm">
                                Nhập lý do huỷ đơn{' '}
                                <span className="font-bold">
                                    {selectedOrder.orderId}
                                </span>
                                :
                            </p>
                            <textarea
                                className="w-full border border-border rounded-md px-3 py-2 bg-background min-h-[80px] text-sm"
                                placeholder="Lý do hủy..."
                                value={cancelReason}
                                onChange={(e) =>
                                    setCancelReason(e.target.value)
                                }
                            />
                        </div>
                        <div className="p-4 border-t flex justify-end gap-3">
                            <button
                                onClick={() => {
                                    setOpenCancelConfirm(false);
                                    setCancelReason('');
                                }}
                                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                            >
                                Đóng
                            </button>
                            <button
                                onClick={() =>
                                    handleUpdateStatusGroup(
                                        selectedOrder,
                                        'Đã hủy',
                                        cancelReason
                                    )
                                }
                                disabled={isUpdatingSubStatus}
                                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                            >
                                {isUpdatingSubStatus
                                    ? 'Đang xử lý...'
                                    : 'Xác nhận hủy'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── Charts Tab ──────────────────────────────────────────────────────────────
const ChartsTab = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { allOrders: orders = [], loading } = useSelector(
        (state) => state.orders
    );
    const user = useSelector((state) => state.user);
    const [dateRange, setDateRange] = useState('7days');
    const [chartType, setChartType] = useState('bar');
    const [filters, setFilters] = useState({
        search: '',
        status: '',
        startDate: '',
        endDate: '',
    });

    useEffect(() => {
        // Chờ user hydrate (user._id rỗng = chưa load xong)
        if (!user?._id) return;
        const allowedRoles = ['ADMIN', 'WAITER', 'CASHIER'];
        if (
            !localStorage.getItem('accesstoken') ||
            !allowedRoles.includes(user?.role)
        ) {
            navigate('/dashboard/profile');
            return;
        }
        const loadOrders = async () => {
            try {
                await dispatch(fetchAllOrders(filters)).unwrap();
            } catch (err) {
                const status = err?.status ?? err?.response?.status;
                if (status !== 401)
                    toast.error('Có lỗi xảy ra khi tải dữ liệu biểu đồ');
            }
        };
        loadOrders();
    }, [dispatch, navigate, user?._id, user?.role, filters]);

    useEffect(() => {
        const today = new Date();
        let startDate, endDate;
        if (dateRange === 'today') {
            startDate = endDate = format(today, 'yyyy-MM-dd');
        } else if (dateRange === 'yesterday') {
            startDate = endDate = format(subDays(today, 1), 'yyyy-MM-dd');
        } else if (dateRange === '7days') {
            startDate = format(subDays(today, 7), 'yyyy-MM-dd');
            endDate = format(today, 'yyyy-MM-dd');
        } else if (dateRange === '30days') {
            startDate = format(subDays(today, 30), 'yyyy-MM-dd');
            endDate = format(today, 'yyyy-MM-dd');
        } else if (dateRange === 'thismonth') {
            startDate = format(startOfMonth(today), 'yyyy-MM-dd');
            endDate = format(endOfMonth(today), 'yyyy-MM-dd');
        } else {
            return;
        }
        setFilters((prev) => ({
            ...prev,
            startDate: `${startDate}T00:00:00`,
            endDate: `${endDate}T23:59:59`,
        }));
    }, [dateRange]);

    // Only paid orders for charts
    const paidOrders = useMemo(
        () => orders.filter((o) => o.payment_status === 'Đã thanh toán'),
        [orders]
    );

    const { totalRevenue, orderCount } = useMemo(
        () =>
            paidOrders.reduce(
                (acc, o) => ({
                    totalRevenue: acc.totalRevenue + (o.totalAmt || 0),
                    orderCount: acc.orderCount + 1,
                }),
                { totalRevenue: 0, orderCount: 0 }
            ),
        [paidOrders]
    );

    const avgOrder = orderCount > 0 ? totalRevenue / orderCount : 0;

    // Top 5 products – iterate over o.products[] (normalized from tableOrder.items[] in orderSlice)
    const topProducts = useMemo(() => {
        const productSales = paidOrders.reduce((acc, o) => {
            const items = o.products || [];
            if (items.length > 0) {
                // TableOrder: multiple items per order
                items.forEach((item) => {
                    const name = item.name || 'Không xác định';
                    if (!acc[name]) acc[name] = { name, total: 0, count: 0 };
                    acc[name].total += (item.price || 0) * (item.quantity || 1);
                    acc[name].count += item.quantity || 1;
                });
            } else {
                // Fallback for legacy single-product orders
                const name = o.product_details?.name || 'Không xác định';
                if (!acc[name]) acc[name] = { name, total: 0, count: 0 };
                acc[name].total += o.totalAmt || 0;
                acc[name].count += o.quantity || 1;
            }
            return acc;
        }, {});
        return Object.values(productSales)
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
    }, [paidOrders]);

    const salesByDate = useMemo(() => {
        const map = paidOrders.reduce((acc, o) => {
            const date = format(new Date(o.createdAt), 'dd/MM');
            if (!acc[date]) acc[date] = { total: 0, count: 0 };
            acc[date].total += o.totalAmt || 0;
            acc[date].count += 1;
            return acc;
        }, {});
        return map;
    }, [paidOrders]);

    const salesChartData = {
        labels: Object.keys(salesByDate),
        datasets: [
            {
                label: 'Doanh thu',
                data: Object.values(salesByDate).map((d) => d.total),
                borderColor: 'rgb(75,192,192)',
                backgroundColor: 'rgba(75,192,192,0.2)',
                yAxisID: 'y',
            },
            {
                label: 'Số đơn',
                data: Object.values(salesByDate).map((d) => d.count),
                borderColor: 'rgb(53,162,235)',
                backgroundColor: 'rgba(53,162,235,0.2)',
                yAxisID: 'y1',
            },
        ],
    };

    const topProductsChartData = {
        labels: topProducts.map((p) => p.name),
        datasets: [
            {
                label: 'Số lượng bán',
                data: topProducts.map((p) => p.count),
                backgroundColor: [
                    'rgba(255,99,132,0.6)',
                    'rgba(54,162,235,0.6)',
                    'rgba(255,206,86,0.6)',
                    'rgba(75,192,192,0.6)',
                    'rgba(153,102,255,0.6)',
                ],
            },
        ],
    };

    const salesChartOptions = {
        responsive: true,
        plugins: {
            legend: { position: 'top', labels: { color: '#0EA5E9' } },
            tooltip: {
                callbacks: {
                    label: (ctx) =>
                        ctx.dataset.yAxisID === 'y1'
                            ? `${ctx.parsed.y} đơn`
                            : DisplayPriceInVND(ctx.parsed.y),
                },
            },
        },
        scales: {
            x: {
                ticks: { color: '#0EA5E9' },
                grid: { color: 'rgba(75,85,99,0.5)' },
            },
            y: {
                type: 'linear',
                position: 'left',
                title: {
                    display: true,
                    text: 'Doanh thu (VND)',
                    color: '#0EA5E9',
                },
                ticks: { color: '#0EA5E9' },
                grid: { color: 'rgba(75,85,99,0.5)' },
            },
            y1: {
                type: 'linear',
                position: 'right',
                title: { display: true, text: 'Số đơn hàng', color: '#0EA5E9' },
                ticks: { color: '#0EA5E9' },
                grid: { drawOnChartArea: false },
            },
        },
    };

    const dateRangeOptions = [
        { value: 'today', label: 'Hôm nay' },
        { value: 'yesterday', label: 'Hôm qua' },
        { value: '7days', label: '7 ngày' },
        { value: '30days', label: '30 ngày' },
        { value: 'thismonth', label: 'Tháng này' },
    ];

    if (loading) return <Loading />;

    return (
        <div className="space-y-6">
            {/* Filter bar */}
            <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-semibold text-muted-foreground">
                    Khoảng thời gian:
                </span>
                {dateRangeOptions.map((opt) => (
                    <button
                        key={opt.value}
                        onClick={() => setDateRange(opt.value)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${dateRange === opt.value ? 'bg-highlight text-white border-highlight' : 'bg-background border-border hover:bg-muted'}`}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>

            {/* KPI cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                    {
                        label: 'Tổng doanh thu',
                        value: DisplayPriceInVND(totalRevenue),
                        icon: <BsCoin className="h-6 w-6" />,
                        color: 'text-green-500',
                    },
                    {
                        label: 'Số đơn đã thanh toán',
                        value: orderCount,
                        icon: <FaFileInvoice className="h-6 w-6" />,
                        color: 'text-blue-500',
                    },
                    {
                        label: 'Bình quân / đơn',
                        value: DisplayPriceInVND(avgOrder),
                        icon: <FaCoins className="h-6 w-6" />,
                        color: 'text-orange-500',
                    },
                ].map((card, i) => (
                    <div
                        key={i}
                        className="liquid-glass rounded-lg shadow-md p-4 flex items-center gap-4"
                    >
                        <div
                            className={`p-3 rounded-full border-[3px] liquid-glass ${card.color}`}
                        >
                            {card.icon}
                        </div>
                        <div>
                            <p className="text-xs font-bold text-muted-foreground">
                                {card.label}
                            </p>
                            <p className="text-xl font-bold">{card.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {paidOrders.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                    <FaChartBar className="mx-auto text-5xl mb-4 opacity-30" />
                    <p className="text-lg font-medium">
                        Không có dữ liệu thống kê trong khoảng thời gian này.
                    </p>
                </div>
            ) : (
                <>
                    {/* Revenue chart */}
                    <Card className="p-5 rounded-lg border-2 border-border">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-base font-bold text-highlight uppercase">
                                Biểu đồ doanh thu theo thời gian
                            </h2>
                            <div className="flex space-x-2">
                                {[
                                    { type: 'bar', icon: <FaChartBar /> },
                                    { type: 'line', icon: <FaChartLine /> },
                                ].map(({ type, icon }) => (
                                    <button
                                        key={type}
                                        onClick={() => setChartType(type)}
                                        className={`p-2 rounded-md ${chartType === type ? 'bg-background/50 border border-highlight text-foreground' : 'bg-foreground text-background'}`}
                                        title={
                                            type === 'bar'
                                                ? 'Biểu đồ cột'
                                                : 'Biểu đồ đường'
                                        }
                                    >
                                        {icon}
                                    </button>
                                ))}
                            </div>
                        </div>
                        {chartType === 'bar' ? (
                            <Bar
                                data={salesChartData}
                                options={salesChartOptions}
                            />
                        ) : (
                            <Line
                                data={salesChartData}
                                options={salesChartOptions}
                            />
                        )}
                    </Card>

                    {/* Top products */}
                    <Card className="p-5 rounded-lg border-2 border-border">
                        <h2 className="text-base font-bold text-highlight uppercase mb-4">
                            Top 5 món ăn bán chạy
                        </h2>
                        {topProducts.length === 0 ? (
                            <p className="text-muted-foreground text-sm">
                                Chưa có dữ liệu món ăn.
                            </p>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className="max-w-xs mx-auto w-full">
                                    <Pie
                                        data={topProductsChartData}
                                        options={{
                                            responsive: true,
                                            plugins: {
                                                legend: {
                                                    position: 'bottom',
                                                    labels: {
                                                        color: '#0EA5E9',
                                                    },
                                                },
                                            },
                                        }}
                                    />
                                </div>
                                <div className="space-y-2">
                                    {topProducts.map((p, i) => (
                                        <div
                                            key={i}
                                            className="flex items-center justify-between bg-muted/30 rounded-lg px-4 py-2"
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="w-6 h-6 rounded-full bg-highlight text-white text-xs font-bold flex items-center justify-center">
                                                    {i + 1}
                                                </span>
                                                <span className="font-medium text-sm">
                                                    {p.name}
                                                </span>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-bold text-green-500">
                                                    {DisplayPriceInVND(p.total)}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {p.count} phần
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </Card>
                </>
            )}
        </div>
    );
};

// ─── Main Page ───────────────────────────────────────────────────────────────
const BillPage = () => {
    return (
        <section className="container mx-auto grid gap-2 z-10">
            <Card className="py-6 flex-row justify-between gap-6 border-card-foreground">
                <CardHeader>
                    <CardTitle className="text-lg text-highlight font-bold uppercase">
                        Báo cáo &amp; Thống kê
                    </CardTitle>
                    <CardDescription>
                        Quản lý hóa đơn và thống kê doanh thu nhà hàng
                    </CardDescription>
                </CardHeader>
            </Card>

            <Tabs defaultValue="invoices" className="space-y-4">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="invoices">🧾 Hóa đơn</TabsTrigger>
                    <TabsTrigger value="charts">📊 Biểu đồ</TabsTrigger>
                    <TabsTrigger value="bookings">📅 Đặt bàn</TabsTrigger>
                    <TabsTrigger value="customers">👥 Khách hàng</TabsTrigger>
                </TabsList>

                <TabsContent value="invoices">
                    <InvoicesTab />
                </TabsContent>
                <TabsContent value="charts">
                    <ChartsTab />
                </TabsContent>
                <TabsContent value="bookings">
                    <BookingsTab />
                </TabsContent>
                <TabsContent value="customers">
                    <CustomersTab />
                </TabsContent>
            </Tabs>
        </section>
    );
};

export default BillPage;
