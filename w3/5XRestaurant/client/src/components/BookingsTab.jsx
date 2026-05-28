import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
    FaCalendarAlt,
    FaUndo,
    FaChartBar,
    FaChartPie,
    FaUsers,
    FaBan,
} from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import { Bar, Pie, Line } from 'react-chartjs-2';
import { Input } from '@/components/ui/input';
import {
    Card,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import Axios from '@/utils/Axios';
import SummaryApi from '@/common/SummaryApi';

const BookingsTab = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [bookingData, setBookingData] = useState(null);
    const [dateRange, setDateRange] = useState('7days');
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
    });
    const [dateError, setDateError] = useState('');

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
        loadBookingReport();
    }, [filters]);

    const loadBookingReport = async () => {
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
                ...SummaryApi.booking_report,
                url: `${SummaryApi.booking_report.url}?${params.toString()}`,
            });

            if (response.data.success) {
                setBookingData(response.data.data);
            }
        } catch (error) {
            toast.error(
                error?.response?.data?.message ||
                    'Có lỗi xảy ra khi tải báo cáo'
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
        setDateRange('7days');
        setDateError('');
    };

    // Prepare chart data
    const peakHoursChartData = bookingData?.peakHours
        ? {
              labels: bookingData.peakHours.map((item) => item.hour),
              datasets: [
                  {
                      label: 'Số lượng đặt bàn',
                      data: bookingData.peakHours.map((item) => item.count),
                      backgroundColor: 'rgba(75, 192, 192, 0.6)',
                      borderColor: 'rgba(75, 192, 192, 1)',
                      borderWidth: 1,
                  },
              ],
          }
        : null;

    const statusChartData = bookingData?.statusDistribution
        ? {
              labels: ['Chờ xác nhận', 'Đã xác nhận', 'Đã hủy', 'Hoàn thành'],
              datasets: [
                  {
                      data: [
                          bookingData.statusDistribution.pending,
                          bookingData.statusDistribution.confirmed,
                          bookingData.statusDistribution.cancelled,
                          bookingData.statusDistribution.completed,
                      ],
                      backgroundColor: [
                          'rgba(255, 206, 86, 0.6)',
                          'rgba(75, 192, 192, 0.6)',
                          'rgba(255, 99, 132, 0.6)',
                          'rgba(54, 162, 235, 0.6)',
                      ],
                      borderColor: [
                          'rgba(255, 206, 86, 1)',
                          'rgba(75, 192, 192, 1)',
                          'rgba(255, 99, 132, 1)',
                          'rgba(54, 162, 235, 1)',
                      ],
                      borderWidth: 1,
                  },
              ],
          }
        : null;

    const bookingsByDateChartData = bookingData?.bookingsByDate
        ? {
              labels: bookingData.bookingsByDate.map((item) =>
                  format(new Date(item.date), 'dd/MM', { locale: vi })
              ),
              datasets: [
                  {
                      label: 'Số đặt bàn',
                      data: bookingData.bookingsByDate.map(
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
            {bookingData && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="liquid-glass rounded-lg shadow-md p-3 flex items-center gap-4">
                        <div className="p-3 rounded-full border-[3px] liquid-glass text-highlight_2">
                            <FaCalendarAlt className="h-6 w-6" />
                        </div>
                        <div className="mt-1 space-y-1">
                            <p className="text-xs font-bold">Tổng đặt bàn</p>
                            <p className="text-xl font-bold">
                                {bookingData.summary.totalBookings}
                            </p>
                        </div>
                    </div>

                    <div className="liquid-glass rounded-lg shadow-md p-3 flex items-center gap-4">
                        <div className="p-3 rounded-full border-[3px] liquid-glass text-highlight_2">
                            <FaBan className="h-6 w-6" />
                        </div>
                        <div className="mt-1 space-y-1">
                            <p className="text-xs font-bold">Tỷ lệ hủy</p>
                            <p className="text-xl font-bold">
                                {bookingData.summary.cancellationRate}%
                            </p>
                        </div>
                    </div>

                    <div className="liquid-glass rounded-lg shadow-md p-3 flex items-center gap-4">
                        <div className="p-3 rounded-full border-[3px] liquid-glass text-highlight_2">
                            <FaUsers className="h-6 w-6" />
                        </div>
                        <div className="mt-1 space-y-1">
                            <p className="text-xs font-bold">Số khách TB</p>
                            <p className="text-xl font-bold">
                                {bookingData.summary.avgPartySize} người
                            </p>
                        </div>
                    </div>

                    <div className="liquid-glass rounded-lg shadow-md p-3 flex items-center gap-4">
                        <div className="p-3 rounded-full border-[3px] liquid-glass text-highlight_2">
                            <FaChartBar className="h-6 w-6" />
                        </div>
                        <div className="mt-1 space-y-1">
                            <p className="text-xs font-bold">Đã xác nhận</p>
                            <p className="text-xl font-bold">
                                {bookingData.summary.confirmedBookings}
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
            ) : !bookingData ? (
                <div className="text-center py-8 text-highlight">
                    Không có dữ liệu
                </div>
            ) : (
                <>
                    {/* Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Peak Hours Chart */}
                        {peakHoursChartData && (
                            <Card className="p-4 rounded-lg border-2 border-gray-700 shadow">
                                <h2 className="text-base sm:text-lg font-bold text-highlight uppercase mb-4">
                                    Giờ cao điểm
                                </h2>
                                <div className="h-64">
                                    <Bar
                                        data={peakHoursChartData}
                                        options={chartOptions}
                                    />
                                </div>
                            </Card>
                        )}

                        {/* Status Distribution */}
                        {statusChartData && (
                            <Card className="p-4 rounded-lg border-2 border-gray-700 shadow">
                                <h2 className="text-base sm:text-lg font-bold text-highlight uppercase mb-4">
                                    Phân bố trạng thái
                                </h2>
                                <div className="h-64 flex items-center justify-center">
                                    <div className="max-w-xs w-full">
                                        <Pie
                                            data={statusChartData}
                                            options={{
                                                ...chartOptions,
                                                plugins: {
                                                    ...chartOptions.plugins,
                                                    legend: {
                                                        position: 'bottom',
                                                        labels: {
                                                            color: '#0EA5E9',
                                                            font: { size: 12 },
                                                        },
                                                    },
                                                },
                                            }}
                                        />
                                    </div>
                                </div>
                            </Card>
                        )}
                    </div>

                    {/* Bookings by Date */}
                    {bookingsByDateChartData && (
                        <Card className="p-4 rounded-lg border-2 border-gray-700 shadow">
                            <h2 className="text-base sm:text-lg font-bold text-highlight uppercase mb-4">
                                Đặt bàn theo ngày
                            </h2>
                            <div className="h-64">
                                <Line
                                    data={bookingsByDateChartData}
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

export default BookingsTab;
