import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
    FaSearch,
    FaFilePdf,
    FaFileExcel,
    FaFilter,
    FaFileInvoice,
    FaCoins,
    FaChartLine,
    FaChartBar,
    FaChartPie,
    FaUndo,
} from 'react-icons/fa';
import { LuCheck, LuPrinter } from 'react-icons/lu';
import { BsCoin } from 'react-icons/bs';
import { DisplayPriceInVND } from '../utils/DisplayPriceInVND';
import { toast } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { fetchAllOrders } from '../store/orderSlice';
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

import ViewImage from '../components/ViewImage';
import Loading from '../components/Loading';
import DynamicTable from '@/components/table/dynamic-table';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import NoData from './NoData';

// Register ChartJS components
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

const statusOptions = [
    { value: '', label: 'Tất cả' },
    { value: 'Đang chờ thanh toán', label: 'Đang chờ thanh toán' },
    { value: 'Đã thanh toán', label: 'Đã thanh toán' },
];

const OrdersTab = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { allOrders: orders = [], loading } = useSelector(
        (state) => state.orders
    );
    const user = useSelector((state) => state.user);
    // Allow ADMIN to access reports
    const canAccessReports = user?.role === 'ADMIN';
    const [imageURL, setImageURL] = useState('');
    const [dateRange, setDateRange] = useState('7days');
    const [chartType, setChartType] = useState('bar');

    const [filters, setFilters] = useState({
        search: '',
        status: '',
        startDate: '',
        endDate: '',
    });
    const [dateError, setDateError] = useState('');

    useEffect(() => {
        const loadOrders = async () => {
            const accessToken = localStorage.getItem('accesstoken');
            if (!accessToken || !canAccessReports) {
                navigate('/dashboard/profile');
                return;
            }

            try {
                await dispatch(fetchAllOrders(filters)).unwrap();
            } catch (error) {
                if (error?.response?.status !== 401) {
                    toast.error(
                        error || 'Có lỗi xảy ra khi tải báo cáo đơn hàng'
                    );
                }
            }
        };

        loadOrders();
    }, [dispatch, canAccessReports, navigate, filters]);

    useEffect(() => {
        let startDate, endDate;
        const today = new Date();

        switch (dateRange) {
            case 'today':
                startDate = format(today, 'yyyy-MM-dd');
                endDate = format(today, 'yyyy-MM-dd');
                break;
            case 'yesterday':
                startDate = format(subDays(today, 1), 'yyyy-MM-dd');
                endDate = format(subDays(today, 1), 'yyyy-MM-dd');
                break;
            case '7days':
                startDate = format(subDays(today, 7), 'yyyy-MM-dd');
                endDate = format(today, 'yyyy-MM-dd');
                break;
            case '30days':
                startDate = format(subDays(today, 30), 'yyyy-MM-dd');
                endDate = format(today, 'yyyy-MM-dd');
                break;
            case 'thismonth':
                startDate = format(startOfMonth(today), 'yyyy-MM-dd');
                endDate = format(endOfMonth(today), 'yyyy-MM-dd');
                break;
            case 'custom':
                // Don't modify dates in custom mode
                if (filters.startDate && filters.endDate) {
                    startDate = filters.startDate.split('T')[0];
                    endDate = filters.endDate.split('T')[0];
                    return;
                }
                break;
            default:
                startDate = '';
                endDate = '';
        }

        setFilters((prev) => ({
            ...prev,
            startDate: startDate ? `${startDate}T00:00:00` : '',
            endDate: endDate ? `${endDate}T23:59:59` : '',
        }));
    }, [dateRange]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;

        if (name === 'dateRange') {
            setDateRange(value);
            return;
        }

        // Tạo đối tượng filters mới để kiểm tra
        const newFilters = {
            ...filters,
            [name]: value,
        };

        // Kiểm tra nếu cả hai ngày đều có giá trị
        if (name === 'startDate' || name === 'endDate') {
            if (newFilters.startDate && newFilters.endDate) {
                const startDate = new Date(newFilters.startDate);
                const endDate = new Date(newFilters.endDate);

                if (startDate > endDate) {
                    setDateError(
                        'Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc'
                    );
                    return; // Không cập nhật filters nếu ngày không hợp lệ
                }
            }
        }

        // Nếu kiểm tra hợp lệ, xóa thông báo lỗi và cập nhật filters
        setDateError('');
        setFilters(newFilters);
    };

    const getStatusBadge = (status) => {
        const statusConfig = {
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

    // Column configuration for DynamicTable
    const columns = React.useMemo(
        () => [
            {
                key: 'orderId',
                label: 'Mã Đơn',
                type: 'string',
                sortable: true,
                format: (value) => (
                    <div
                        title={value}
                        className="font-medium text-center text-rose-500 line-clamp-1 max-w-[100px] overflow-hidden text-ellipsis"
                    >
                        {value}
                    </div>
                ),
            },
            {
                key: 'customer',
                label: 'Khách hàng',
                type: 'string',
                sortable: false,
                format: (value, row) => (
                    <div>
                        <div className="font-medium text-rose-500 line-clamp-1 max-w-[100px] overflow-hidden text-ellipsis">
                            {row.rawData.userId?.name || 'Khách vãng lai'}
                        </div>
                        <p
                            title={row.rawData.userId?.email}
                            className="text-sm line-clamp-1 max-w-[100px] overflow-hidden text-ellipsis"
                        >
                            {row.rawData.userId?.email}
                        </p>
                    </div>
                ),
            },
            {
                key: 'product',
                label: 'Sản phẩm',
                type: 'string',
                sortable: false,
                format: (value, row) => (
                    <div className="flex items-center gap-3 max-w-[250px]">
                        <img
                            src={
                                row.rawData.product_details?.image?.[0] ||
                                '/placeholder.jpg'
                            }
                            alt=""
                            className="w-12 h-12 border border-lime-300 object-cover rounded shadow cursor-pointer"
                            onClick={() =>
                                setImageURL(
                                    row.rawData.product_details?.image?.[0]
                                )
                            }
                            onError={(e) => (e.target.src = '/placeholder.jpg')}
                        />
                        <div>
                            <p
                                title={row.rawData.product_details?.name}
                                className="line-clamp-2 sm:max-w-[50px] 2xl:max-w-[250px] overflow-hidden text-ellipsis"
                            >
                                {row.rawData.product_details?.name || 'N/A'}
                            </p>
                            <p className="text-rose-400 font-bold">
                                x{row.rawData.quantity}
                            </p>
                        </div>
                    </div>
                ),
            },
            {
                key: 'totalAmt',
                label: 'Tổng tiền',
                type: 'number',
                sortable: true,
                format: (value) => (
                    <div className="text-center font-medium">
                        {DisplayPriceInVND(value || 0)}
                    </div>
                ),
            },
            {
                key: 'payment_status',
                label: 'Trạng thái',
                type: 'string',
                sortable: true,
                format: (value) => (
                    <div className="text-center">{getStatusBadge(value)}</div>
                ),
            },
            {
                key: 'createdAt',
                label: 'Ngày tạo',
                type: 'date',
                sortable: true,
                format: (value) => (
                    <div className="text-center font-medium">
                        {format(new Date(value), 'dd/MM/yyyy HH:mm', {
                            locale: vi,
                        })}
                    </div>
                ),
            },
            {
                key: 'action',
                label: 'Thao tác',
                type: 'string',
                sortable: false,
                format: (value, row) => (
                    <div className="flex gap-2 justify-center">
                        {['Đang chờ thanh toán', 'Chờ thanh toán'].includes(
                            row.rawData.payment_status
                        ) && (
                            <button
                                className="p-2 bg-green-100 text-green-600 rounded-md hover:bg-green-200"
                                onClick={() => {
                                    // Placeholder for confirm action
                                }}
                                title="Xác nhận thanh toán"
                            >
                                <LuCheck size={18} />
                            </button>
                        )}
                        <button
                            onClick={() => {
                                // Placeholder for print action
                            }}
                            className="p-2 bg-blue-100 text-blue-600 rounded-md hover:bg-blue-200"
                            title="In hóa đơn"
                        >
                            <LuPrinter size={18} />
                        </button>
                    </div>
                ),
            },
        ],
        []
    );

    const filteredOrders = React.useMemo(() => {
        let result = [...orders];

        if (filters.search) {
            const searchLower = filters.search.trim().toLowerCase();

            result = result.filter((order) => {
                const searchFields = [
                    order.orderId,
                    order.userId?.name,
                    order.userId?.email,
                    order.userId?.mobile,
                    order.userId?.mobile?.replace(/\s+/g, ''),
                    order.payment_status,
                    ...(order.products?.flatMap((product) => [
                        product.name,
                        product.sku,
                        product.brand,
                        product.category?.name,
                    ]) || []),
                    order.product_details?.name,
                    order.product_details?.brand,
                    order.product_details?.category,
                ].filter(Boolean);

                return searchFields.some((field) =>
                    String(field).toLowerCase().includes(searchLower)
                );
            });
        }

        if (filters.status) {
            result = result.filter(
                (order) => order.payment_status === filters.status
            );
        }

        if (filters.startDate) {
            const start = new Date(filters.startDate);
            result = result.filter(
                (order) => new Date(order.createdAt) >= start
            );
        }

        if (filters.endDate) {
            const end = new Date(filters.endDate);
            end.setHours(23, 59, 59, 999);
            result = result.filter((order) => new Date(order.createdAt) <= end);
        }

        return result;
    }, [orders, filters]);

    // Transform data for DynamicTable
    const tableData = React.useMemo(() => {
        return filteredOrders.map((order, index) => ({
            id: index + 1,
            orderId: order.orderId,
            customer: order.userId?.name || 'Khách vãng lai',
            product: order.product_details?.name || 'N/A',
            totalAmt: order.totalAmt || 0,
            payment_status: order.payment_status,
            createdAt: order.createdAt,
            rawData: order,
        }));
    }, [filteredOrders]);

    const { totalRevenue, orderCount } = React.useMemo(() => {
        return filteredOrders.reduce(
            (acc, order) => ({
                totalRevenue: acc.totalRevenue + (order.totalAmt || 0),
                orderCount: acc.orderCount + 1,
            }),
            { totalRevenue: 0, orderCount: 0 }
        );
    }, [filteredOrders]);

    const exportToExcel = () => {
        const data = filteredOrders.map((order) => ({
            'Mã đơn hàng': order.orderId,
            'Ngày tạo': format(new Date(order.createdAt), 'dd/MM/yyyy HH:mm', {
                locale: vi,
            }),
            'Khách hàng': order.userId?.name || 'Khách vãng lai',
            'Sản phẩm': order.product_details?.name || '',
            'Số lượng': order.quantity,
            'Tổng tiền': order.totalAmt,
            'Trạng thái thanh toán': order.payment_status || 'Chưa xác định',
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Báo cáo đơn hàng');
        XLSX.writeFile(
            wb,
            `bao-cao-don-hang-${new Date().toISOString().split('T')[0]}.xlsx`
        );
    };

    const resetFilters = () => {
        setFilters({
            search: '',
            status: '',
            startDate: '',
            endDate: '',
        });
        setDateRange('7days');
        setDateError('');
    };

    const handleResetFilters = () => {
        resetFilters();
    };

    // Chart data preparation
    const prepareChartData = () => {
        // Group orders by date for line chart
        const ordersByDate = filteredOrders.reduce((acc, order) => {
            const date = format(new Date(order.createdAt), 'dd/MM/yyyy');
            if (!acc[date]) {
                acc[date] = { date, total: 0, count: 0 };
            }
            acc[date].total += order.totalAmt || 0;
            acc[date].count += 1;
            return acc;
        }, {});

        // Prepare data for status distribution pie chart
        const statusCounts = filteredOrders.reduce((acc, order) => {
            const status = order.payment_status || 'Chưa xác định';
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        }, {});

        // Prepare data for top products bar chart
        const productSales = filteredOrders.reduce((acc, order) => {
            const productName = order.product_details?.name || 'Không xác định';
            if (!acc[productName]) {
                acc[productName] = { name: productName, total: 0, count: 0 };
            }
            acc[productName].total += order.totalAmt || 0;
            acc[productName].count += order.quantity || 0;
            return acc;
        }, {});

        // Sort products by total sales
        const topProducts = Object.values(productSales)
            .sort((a, b) => b.total - a.total)
            .slice(0, 5);

        return {
            salesData: {
                labels: Object.values(ordersByDate).map((item) => item.date),
                datasets: [
                    {
                        label: 'Doanh thu',
                        data: Object.values(ordersByDate).map(
                            (item) => item.total
                        ),
                        borderColor: 'rgb(75, 192, 192)',
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        yAxisID: 'y',
                    },
                    {
                        label: 'Số đơn hàng',
                        data: Object.values(ordersByDate).map(
                            (item) => item.count
                        ),
                        borderColor: 'rgb(53, 162, 235)',
                        backgroundColor: 'rgba(53, 162, 235, 0.2)',
                        yAxisID: 'y1',
                    },
                ],
            },
            statusData: {
                labels: Object.keys(statusCounts),
                datasets: [
                    {
                        data: Object.values(statusCounts),
                        backgroundColor: [
                            'rgba(255, 99, 132, 0.6)',
                            'rgba(54, 162, 235, 0.6)',
                            'rgba(255, 206, 86, 0.6)',
                            'rgba(75, 192, 192, 0.6)',
                            'rgba(153, 102, 255, 0.6)',
                        ],
                        borderColor: [
                            'rgba(255, 99, 132, 1)',
                            'rgba(54, 162, 235, 1)',
                            'rgba(255, 206, 86, 1)',
                            'rgba(75, 192, 192, 1)',
                            'rgba(153, 102, 255, 1)',
                        ],
                        borderWidth: 1,
                    },
                ],
            },
            productsData: {
                labels: topProducts.map((item) => item.name),
                datasets: [
                    {
                        label: 'Doanh thu',
                        data: topProducts.map((item) => item.total),
                        backgroundColor: 'rgba(75, 192, 192, 0.6)',
                        borderColor: 'rgba(75, 192, 192, 1)',
                        borderWidth: 1,
                    },
                ],
            },
        };
    };

    const chartData = prepareChartData();

    const chartOptions = {
        responsive: true,
        plugins: {
            legend: {
                position: 'top',
                labels: {
                    color: '#0EA5E9',
                    font: {
                        size: 12,
                    },
                },
            },
            tooltip: {
                callbacks: {
                    label: function (context) {
                        let label = context.dataset.label || '';
                        if (label) {
                            label += ': ';
                        }
                        if (context.parsed.y !== null) {
                            label +=
                                context.dataset.yAxisID === 'y1'
                                    ? context.parsed.y + ' đơn'
                                    : DisplayPriceInVND(context.parsed.y);
                        }
                        return label;
                    },
                    titleColor: '#0EA5E9',
                    bodyColor: '#E5E7EB',
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    borderColor: '#4B5563',
                    borderWidth: 1,
                },
            },
        },
        scales: {
            x: {
                ticks: {
                    color: '#0EA5E9',
                },
                grid: {
                    color: 'rgba(75, 85, 99, 0.5)',
                },
            },
            y: {
                type: 'linear',
                display: true,
                position: 'left',
                title: {
                    display: true,
                    text: 'Doanh thu (VND)',
                    color: '#0EA5E9',
                },
                ticks: {
                    color: '#0EA5E9',
                },
                grid: {
                    color: 'rgba(75, 85, 99, 0.5)',
                },
            },
            y1: {
                type: 'linear',
                display: true,
                position: 'right',
                grid: {
                    drawOnChartArea: false,
                    color: 'rgba(75, 85, 99, 0.5)',
                },
                title: {
                    display: true,
                    text: 'Số đơn hàng',
                    color: '#0EA5E9',
                },
                ticks: {
                    color: '#0EA5E9',
                },
            },
        },
    };

    const renderChart = () => {
        switch (chartType) {
            case 'bar':
                return (
                    <Bar
                        data={chartData.salesData}
                        options={chartOptions}
                        className="text-white"
                    />
                );
            case 'line':
                return (
                    <Line
                        data={chartData.salesData}
                        options={chartOptions}
                        className="text-white"
                    />
                );
            case 'pie':
                return (
                    <div className="max-w-xs mx-auto">
                        <Pie
                            data={chartData.statusData}
                            options={{
                                responsive: true,
                                plugins: {
                                    legend: {
                                        position: 'bottom',
                                        labels: {
                                            color: '#0EA5E9',
                                            font: {
                                                size: 12,
                                            },
                                        },
                                    },
                                    tooltip: {
                                        callbacks: {
                                            label: function (context) {
                                                const label =
                                                    context.label || '';
                                                const value = context.raw || 0;
                                                const total =
                                                    context.dataset.data.reduce(
                                                        (a, b) => a + b,
                                                        0
                                                    );
                                                const percentage = Math.round(
                                                    (value / total) * 100
                                                );
                                                return `${label}: ${value} đơn (${percentage}%)`;
                                            },
                                        },
                                        titleColor: '#000',
                                        bodyColor: '#E5E7EB',
                                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                                        borderColor: '#4B5563',
                                        borderWidth: 1,
                                    },
                                },
                            }}
                        />
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="container mx-auto grid gap-2 z-10">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 pb-2">
                <div className="liquid-glass rounded-lg shadow-md p-3 flex items-center gap-4">
                    <div className="p-3 rounded-full border-[3px] liquid-glass text-highlight">
                        <BsCoin className="h-6 w-6" />
                    </div>
                    <div className="mt-1 space-y-1">
                        <p className="text-xs font-bold">Tổng doanh thu</p>
                        <p className="text-xl font-bold">
                            {DisplayPriceInVND(totalRevenue)}
                        </p>
                    </div>
                </div>
                <div className="liquid-glass rounded-lg shadow-md p-3 flex items-center gap-4">
                    <div className="p-3 rounded-full border-[3px] liquid-glass text-highlight">
                        <FaCoins className="h-6 w-6" />
                    </div>
                    <div className="mt-1 space-y-1">
                        <p className="text-xs font-bold">
                            Giá trị đơn hàng trung bình
                        </p>
                        <p className="text-xl font-bold">
                            {orderCount > 0
                                ? DisplayPriceInVND(totalRevenue / orderCount)
                                : '0'}
                        </p>
                    </div>
                </div>
                <div className="liquid-glass rounded-lg shadow-md p-3 flex items-center gap-4">
                    <div className="p-3 rounded-full border-[3px] liquid-glass text-highlight">
                        <FaFileInvoice className="h-6 w-6" />
                    </div>
                    <div className="mt-1 space-y-1">
                        <p className="text-xs font-bold">Tổng số đơn hàng</p>
                        <p className="text-xl font-bold">{orderCount}</p>
                    </div>
                </div>
                <div className="liquid-glass rounded-lg shadow-md p-3 flex items-center gap-4">
                    <div className="p-3 rounded-full border-[3px] liquid-glass text-highlight">
                        <FaFilter className="h-6 w-6" />
                    </div>
                    <div className="mt-1 space-y-1">
                        <p className="text-xs font-bold">Đang hiển thị</p>
                        <p className="text-xl font-bold">
                            {filteredOrders.length} / {orders.length}
                        </p>
                    </div>
                </div>
            </div>

            {/* Chart Type Selector */}
            <Card className="p-4 rounded-lg border-2 border-gray-700 text-white shadow mb-3">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-base sm:text-lg font-bold text-highlight uppercase">
                        Biểu đồ thống kê
                    </h2>
                    <div className="flex space-x-2">
                        <button
                            onClick={() => setChartType('line')}
                            className={`p-2 rounded-md ${
                                chartType === 'line'
                                    ? 'bg-background/50 text-foreground border border-highlight'
                                    : 'bg-foreground text-background'
                            }`}
                            title="Biểu đồ đường"
                        >
                            <FaChartLine className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setChartType('bar')}
                            className={`p-2 rounded-md ${
                                chartType === 'bar'
                                    ? 'bg-background/50 text-foreground border border-highlight'
                                    : 'bg-foreground text-background'
                            }`}
                            title="Biểu đồ cột"
                        >
                            <FaChartBar className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setChartType('pie')}
                            className={`p-2 rounded-md ${
                                chartType === 'pie'
                                    ? 'bg-background/50 text-foreground border border-highlight'
                                    : 'bg-foreground text-background'
                            }`}
                            title="Biểu đồ trạng thái đơn hàng"
                        >
                            <FaChartPie className="w-5 h-5" />
                        </button>
                    </div>
                </div>
                <div className="h-80">
                    {filteredOrders.length > 0 ? (
                        renderChart()
                    ) : (
                        <div className="flex items-center justify-center h-full text-highlight">
                            Không có dữ liệu để hiển thị biểu đồ
                        </div>
                    )}
                </div>
            </Card>

            {/* Top Products Chart */}
            {filteredOrders.length > 0 && (
                <Card className="p-4 rounded-lg border-2 border-gray-700 text-white shadow mb-3">
                    <h2 className="text-base sm:text-lg font-bold text-highlight uppercase">
                        Top sản phẩm bán chạy
                    </h2>
                    <div>
                        <Bar
                            data={chartData.productsData}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                    legend: {
                                        display: false,
                                    },
                                    tooltip: {
                                        callbacks: {
                                            label: function (context) {
                                                return `Doanh thu: ${DisplayPriceInVND(
                                                    context.parsed.y
                                                )}`;
                                            },
                                        },
                                        titleColor: '#0EA5E9',
                                        bodyColor: '#E5E7EB',
                                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                                        borderColor: '#4B5563',
                                        borderWidth: 1,
                                    },
                                },
                                scales: {
                                    x: {
                                        ticks: {
                                            color: '#0EA5E9',
                                        },
                                        grid: {
                                            color: 'rgba(75, 85, 99, 0.5)',
                                        },
                                    },
                                    y: {
                                        beginAtZero: true,
                                        ticks: {
                                            color: '#0EA5E9',
                                            callback: function (value) {
                                                return DisplayPriceInVND(value);
                                            },
                                        },
                                        grid: {
                                            color: 'rgba(75, 85, 99, 0.5)',
                                        },
                                    },
                                },
                            }}
                        />
                    </div>
                </Card>
            )}

            {/* Filters */}
            <div className="rounded-lg border-2 liquid-glass px-4 py-6 mb-6 space-y-2">
                <button
                    onClick={handleResetFilters}
                    className="flex gap-2 items-center px-4 h-9 font-medium liquid-glass rounded-lg text-sm"
                >
                    <FaUndo size={12} className="mb-[2px]" />
                    <p>Đặt lại</p>
                </button>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5 w-full">
                    <div className="relative">
                        <Input
                            type="text"
                            name="search"
                            placeholder="Tìm kiếm..."
                            className="w-full pl-10 h-12 text-sm placeholder:text-foreground border-foreground"
                            value={filters.search}
                            onChange={handleFilterChange}
                        />
                        <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2" />
                    </div>
                    <select
                        name="status"
                        className="text-sm h-12 w-full border-foreground border bg-transparent
                    px-3 py-1 rounded-md cursor-pointer"
                        value={filters.status}
                        onChange={handleFilterChange}
                    >
                        {statusOptions.map((option) => (
                            <option
                                key={option.value}
                                value={option.value}
                                className="text-foreground bg-background"
                            >
                                {option.label}
                            </option>
                        ))}
                    </select>

                    <select
                        name="dateRange"
                        className="text-sm h-12 w-full border-foreground border bg-transparent
                    px-3 py-1 rounded-md cursor-pointer"
                        value={dateRange}
                        onChange={handleFilterChange}
                    >
                        <option
                            className="text-foreground bg-background"
                            value="today"
                        >
                            Hôm nay
                        </option>
                        <option
                            className="text-foreground bg-background"
                            value="yesterday"
                        >
                            Hôm qua
                        </option>
                        <option
                            className="text-foreground bg-background"
                            value="7days"
                        >
                            7 ngày qua
                        </option>
                        <option
                            className="text-foreground bg-background"
                            value="30days"
                        >
                            30 ngày qua
                        </option>
                        <option
                            className="text-foreground bg-background"
                            value="thismonth"
                        >
                            Tháng này
                        </option>
                        <option
                            className="text-foreground bg-background"
                            value="custom"
                        >
                            Tùy chỉnh
                        </option>
                    </select>

                    <button
                        onClick={exportToExcel}
                        className="flex items-center gap-2 justify-center h-12 px-4 py-2 border border-transparent rounded-md shadow-sm sm:text-sm text-xs font-medium
                    text-white bg-green-600/80 hover:bg-green-700 focus:outline-none focus:ring-1 focus:ring-offset-2 focus:ring-green-500"
                    >
                        <FaFileExcel size={15} />
                        <p>Xuất Excel</p>
                    </button>
                </div>

                {dateRange === 'custom' && (
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="block text-sm font-medium mb-1">
                                Từ ngày
                            </label>
                            <div className="relative">
                                <input
                                    type="date"
                                    name="startDate"
                                    className={`w-full h-12 border ${
                                        dateError
                                            ? 'border-red-500'
                                            : 'border-gray-700'
                                    } px-3 py-1 rounded-md pr-8 appearance-none text-sm`}
                                    value={
                                        filters.startDate?.split('T')[0] || ''
                                    }
                                    onChange={handleFilterChange}
                                    max={filters.endDate?.split('T')[0] || ''}
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                    <svg
                                        className="w-5 h-5 text-gray-400"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                        xmlns="http://www.w3.org/2000/svg"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                        />
                                    </svg>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="block text-sm font-medium mb-1">
                                Đến ngày
                            </label>
                            <div className="relative">
                                <input
                                    type="date"
                                    name="endDate"
                                    className={`w-full h-12 border ${
                                        dateError
                                            ? 'border-red-500'
                                            : 'border-gray-700'
                                    } px-3 py-1 rounded-md pr-8 appearance-none text-sm`}
                                    value={filters.endDate?.split('T')[0] || ''}
                                    onChange={handleFilterChange}
                                    min={filters.startDate?.split('T')[0] || ''}
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                    <svg
                                        className="w-5 h-5 text-gray-400"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                        xmlns="http://www.w3.org/2000/svg"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                        />
                                    </svg>
                                </div>
                            </div>
                            {dateError && (
                                <p className="mt-1 text-sm text-red-500">
                                    {dateError}
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Orders Table */}
            <div className="rounded-lg shadow overflow-hidden">
                {loading ? (
                    <Loading />
                ) : (
                    <>
                        <DynamicTable
                            data={tableData}
                            columns={columns}
                            pageSize={10}
                            sortable={true}
                            searchable={false}
                            filterable={false}
                            groupable={false}
                        />
                        {tableData.length === 0 && (
                            <NoData message="Không có hóa đơn" />
                        )}
                    </>
                )}

                {imageURL && (
                    <ViewImage url={imageURL} close={() => setImageURL('')} />
                )}
            </div>
        </div>
    );
};

export default OrdersTab;
