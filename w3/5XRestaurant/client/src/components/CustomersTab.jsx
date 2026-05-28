import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { vi } from 'date-fns/locale';
import { FaUndo, FaUsers, FaUserPlus, FaChartLine } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import { Line, Bar } from 'react-chartjs-2';
import {
    Card,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import Axios from '@/utils/Axios';
import SummaryApi from '@/common/SummaryApi';
import { DisplayPriceInVND } from '../utils/DisplayPriceInVND';

const CustomersTab = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [customerData, setCustomerData] = useState(null);
    const [dateRange, setDateRange] = useState('30days');
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
    });
    const [dateError, setDateError] = useState('');

    useEffect(() => {
        let startDate, endDate;
        const today = new Date();

        switch (dateRange) {
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
                if (filters.startDate && filters.endDate) {
                    return;
                }
                break;
            default:
                startDate = '';
                endDate = '';
        }

        setFilters({
            startDate: startDate ? `${startDate}T00:00:00` : '',
            endDate: endDate ? `${endDate}T23:59:59` : '',
        });
    }, [dateRange]);

    useEffect(() => {
        loadCustomerAnalytics();
    }, [filters]);

    const loadCustomerAnalytics = async () => {
        const accessToken = localStorage.getItem('accesstoken');
        if (!accessToken) {
            navigate('/login');
            return;
        }

        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (filters.startDate)
                params.append('startDate', filters.startDate);
            if (filters.endDate) params.append('endDate', filters.endDate);

            const response = await Axios({
                ...SummaryApi.customer_analytics,
                url: `${
                    SummaryApi.customer_analytics.url
                }?${params.toString()}`,
            });

            if (response.data.success) {
                setCustomerData(response.data.data);
            }
        } catch (error) {
            toast.error(
                error?.response?.data?.message ||
                    'Có lỗi xảy ra khi tải phân tích khách hàng'
            );
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;

        if (name === 'dateRange') {
            setDateRange(value);
            return;
        }

        const newFilters = {
            ...filters,
            [name]: value,
        };

        if (name === 'startDate' || name === 'endDate') {
            if (newFilters.startDate && newFilters.endDate) {
                const startDate = new Date(newFilters.startDate);
                const endDate = new Date(newFilters.endDate);

                if (startDate > endDate) {
                    setDateError(
                        'Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc'
                    );
                    return;
                }
            }
        }

        setDateError('');
        setFilters(newFilters);
    };

    const resetFilters = () => {
        setFilters({
            startDate: '',
            endDate: '',
        });
        setDateRange('30days');
        setDateError('');
    };

    // Prepare chart data
    const customerGrowthChartData = customerData?.customerGrowth
        ? {
              labels: customerData.customerGrowth.map((item) => item.month),
              datasets: [
                  {
                      label: 'Khách hàng mới',
                      data: customerData.customerGrowth.map(
                          (item) => item.count
                      ),
                      borderColor: 'rgb(75, 192, 192)',
                      backgroundColor: 'rgba(75, 192, 192, 0.2)',
                      tension: 0.4,
                  },
              ],
          }
        : null;

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                labels: {
                    color: '#0EA5E9',
                    font: { size: 12 },
                },
            },
            tooltip: {
                titleColor: '#0EA5E9',
                bodyColor: '#E5E7EB',
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                borderColor: '#4B5563',
                borderWidth: 1,
            },
        },
        scales: {
            x: {
                ticks: { color: '#0EA5E9' },
                grid: { color: 'rgba(75, 85, 99, 0.5)' },
            },
            y: {
                ticks: { color: '#0EA5E9' },
                grid: { color: 'rgba(75, 85, 99, 0.5)' },
            },
        },
    };

    return (
        <div className="space-y-4">
            {/* Summary Cards */}
            {customerData && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="liquid-glass rounded-lg shadow-md p-3 flex items-center gap-4">
                        <div className="p-3 rounded-full border-[3px] liquid-glass text-highlight_2">
                            <FaUsers className="h-6 w-6" />
                        </div>
                        <div className="mt-1 space-y-1">
                            <p className="text-xs font-bold">Khách thành viên</p>
                            <p className="text-xl font-bold">
                                {customerData.summary.totalCustomers}
                            </p>
                        </div>
                    </div>

                    <div className="liquid-glass rounded-lg shadow-md p-3 flex items-center gap-4">
                        <div className="p-3 rounded-full border-[3px] liquid-glass text-highlight_2">
                            <FaUserPlus className="h-6 w-6" />
                        </div>
                        <div className="mt-1 space-y-1">
                            <p className="text-xs font-bold">
                                Khách mới (30 ngày)
                            </p>
                            <p className="text-xl font-bold">
                                {customerData.summary.newCustomers}
                            </p>
                        </div>
                    </div>

                    <div className="liquid-glass rounded-lg shadow-md p-3 flex items-center gap-4">
                        <div className="p-3 rounded-full border-[3px] liquid-glass text-highlight_2">
                            <FaChartLine className="h-6 w-6" />
                        </div>
                        <div className="mt-1 space-y-1">
                            <p className="text-xs font-bold">Khách quay lại</p>
                            <p className="text-xl font-bold">
                                {customerData.summary.returningCustomers}
                            </p>
                        </div>
                    </div>

                    <div className="liquid-glass rounded-lg shadow-md p-3 flex items-center gap-4">
                        <div className="p-3 rounded-full border-[3px] liquid-glass text-highlight_2">
                            <FaUsers className="h-6 w-6" />
                        </div>
                        <div className="mt-1 space-y-1">
                            <p className="text-xs font-bold">Lượt khách vãng lai</p>
                            <p className="text-xl font-bold">
                                {customerData.summary.anonymousVisits ?? '—'}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="rounded-lg border-2 liquid-glass px-4 py-6 space-y-2">
                <button
                    onClick={resetFilters}
                    className="flex gap-2 items-center px-4 h-9 font-medium liquid-glass rounded-lg text-sm"
                >
                    <FaUndo size={12} className="mb-[2px]" />
                    <p>Đặt lại</p>
                </button>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 w-full">
                    <select
                        name="dateRange"
                        className="text-sm h-12 w-full border-foreground border bg-transparent px-3 py-1 rounded-md cursor-pointer"
                        value={dateRange}
                        onChange={handleFilterChange}
                    >
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
                </div>

                {dateRange === 'custom' && (
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="block text-sm font-medium mb-1">
                                Từ ngày
                            </label>
                            <input
                                type="date"
                                name="startDate"
                                className={`w-full h-12 border ${
                                    dateError
                                        ? 'border-red-500'
                                        : 'border-gray-700'
                                } bg-neutral-950 px-3 py-1 rounded-md text-sm`}
                                value={filters.startDate?.split('T')[0] || ''}
                                onChange={handleFilterChange}
                                max={filters.endDate?.split('T')[0] || ''}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-sm font-medium mb-1">
                                Đến ngày
                            </label>
                            <input
                                type="date"
                                name="endDate"
                                className={`w-full h-12 border ${
                                    dateError
                                        ? 'border-red-500'
                                        : 'border-gray-700'
                                } bg-neutral-950 px-3 py-1 rounded-md text-sm`}
                                value={filters.endDate?.split('T')[0] || ''}
                                onChange={handleFilterChange}
                                min={filters.startDate?.split('T')[0] || ''}
                            />
                            {dateError && (
                                <p className="mt-1 text-sm text-red-500">
                                    {dateError}
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {loading ? (
                <div className="text-center py-8 text-highlight">
                    Đang tải dữ liệu...
                </div>
            ) : !customerData ? (
                <div className="text-center py-8 text-highlight">
                    Không có dữ liệu
                </div>
            ) : (
                <>
                    {/* Top Customers Tables */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Top by Orders */}
                        <Card className="p-4 rounded-lg border-2 border-gray-700 text-foreground shadow">
                            <h2 className="text-base sm:text-lg font-bold text-highlight uppercase mb-4">
                                Top khách hàng (Số đơn)
                            </h2>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="text-highlight border-b border-gray-600">
                                        <tr>
                                            <th className="text-left py-2">
                                                #
                                            </th>
                                            <th className="text-left py-2">
                                                Tên
                                            </th>
                                            <th className="text-right py-2">
                                                Số đơn
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {customerData.topByOrders.map(
                                            (customer, index) => (
                                                <tr
                                                    key={customer.customerId?.toString() ?? `anon-${index}`}
                                                    className="border-b border-gray-700"
                                                >
                                                    <td className="py-2">
                                                        {index + 1}
                                                    </td>
                                                    <td className="py-2">
                                                        <div>
                                                            <p className="font-medium">
                                                                {customer.name}
                                                            </p>
                                                            <p className="text-xs text-foreground/80">
                                                                {customer.phone
                                                                    ? customer.phone
                                                                    : customer.isRegistered
                                                                    ? 'Thành viên'
                                                                    : 'Khách vãng lai'}
                                                            </p>
                                                        </div>
                                                    </td>
                                                    <td className="text-right py-2 font-bold">
                                                        {customer.orderCount}
                                                    </td>
                                                </tr>
                                            )
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </Card>

                        {/* Top by Revenue */}
                        <Card className="p-4 rounded-lg border-2 border-gray-700 text-foreground shadow">
                            <h2 className="text-base sm:text-lg font-bold text-highlight uppercase mb-4">
                                Top khách hàng (Doanh thu)
                            </h2>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="text-highlight border-b border-gray-600">
                                        <tr>
                                            <th className="text-left py-2">
                                                #
                                            </th>
                                            <th className="text-left py-2">
                                                Tên
                                            </th>
                                            <th className="text-right py-2">
                                                Doanh thu
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {customerData.topByRevenue.map(
                                            (customer, index) => (
                                                <tr
                                                    key={customer.customerId?.toString() ?? `anon-rev-${index}`}
                                                    className="border-b border-gray-700"
                                                >
                                                    <td className="py-2">
                                                        {index + 1}
                                                    </td>
                                                    <td className="py-2">
                                                        <div>
                                                            <p className="font-medium">
                                                                {customer.name}
                                                            </p>
                                                            <p className="text-xs text-foreground/80">
                                                                {customer.phone
                                                                    ? customer.phone
                                                                    : customer.isRegistered
                                                                    ? 'Thành viên'
                                                                    : 'Khách vãng lai'}
                                                            </p>
                                                        </div>
                                                    </td>
                                                    <td className="text-right py-2 font-bold">
                                                        {DisplayPriceInVND(
                                                            customer.totalRevenue
                                                        )}
                                                    </td>
                                                </tr>
                                            )
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </div>

                    {/* Customer Growth Chart */}
                    {customerGrowthChartData && (
                        <Card className="p-4 rounded-lg border-2 border-gray-700 text-foreground shadow">
                            <h2 className="text-base sm:text-lg font-bold text-highlight uppercase mb-4">
                                Tăng trưởng khách hàng theo tháng
                            </h2>
                            <div className="h-64">
                                <Line
                                    data={customerGrowthChartData}
                                    options={chartOptions}
                                />
                            </div>
                        </Card>
                    )}
                </>
            )}
        </div>
    );
};

export default CustomersTab;
