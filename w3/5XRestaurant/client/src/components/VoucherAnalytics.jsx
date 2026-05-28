import React, { useState, useEffect } from 'react';
import Axios from '../utils/Axios';
import SummaryApi from '../common/SummaryApi';
import { DisplayPriceInVND } from '../utils/DisplayPriceInVND';
import Loading from './Loading';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

const VoucherAnalytics = () => {
    const [loading, setLoading] = useState(true);
    const [overview, setOverview] = useState(null);
    const [topVouchers, setTopVouchers] = useState([]);
    const [usageTrend, setUsageTrend] = useState([]);
    const [selectedPeriod, setSelectedPeriod] = useState('7d');

    // Fetch all analytics data
    useEffect(() => {
        fetchAnalytics();
    }, [selectedPeriod]);

    const fetchAnalytics = async () => {
        try {
            setLoading(true);

            // Fetch overview
            const overviewRes = await Axios({
                ...SummaryApi.voucher_analytics_overview,
            });

            // Fetch top vouchers
            const topRes = await Axios({
                ...SummaryApi.voucher_analytics_top,
                params: { limit: 5 },
            });

            // Fetch usage trend
            const trendRes = await Axios({
                ...SummaryApi.voucher_analytics_trend,
                params: { period: selectedPeriod },
            });

            if (overviewRes.data.success) {
                setOverview(overviewRes.data.data);
            }

            if (topRes.data.success) {
                setTopVouchers(topRes.data.data.vouchers);
            }

            if (trendRes.data.success) {
                setUsageTrend(trendRes.data.data.trend);
            }
        } catch (error) {
            console.error('Error fetching analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[400px]">
                <Loading />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-4">
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-foreground">
                            Tổng voucher
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {overview?.totalVouchers || 0}
                        </div>
                    </CardContent>
                </Card>

                <Card className="p-4">
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-foreground">
                            Đang hoạt động
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            {overview?.activeVouchers || 0}
                        </div>
                    </CardContent>
                </Card>

                <Card className="p-4">
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-foreground">
                            Lượt sử dụng
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">
                            {overview?.totalUsage || 0}
                        </div>
                    </CardContent>
                </Card>

                <Card className="p-4">
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-foreground">
                            Tổng tiết kiệm
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-rose-600">
                            {DisplayPriceInVND(overview?.totalSavings || 0)}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Top Vouchers */}
            <Card className="py-6">
                <CardHeader>
                    <CardTitle>Top 5 Voucher Phổ Biến</CardTitle>
                </CardHeader>
                <CardContent>
                    {topVouchers.length === 0 ? (
                        <p className="text-highlight text-center py-8">
                            Chưa có dữ liệu sử dụng voucher
                        </p>
                    ) : (
                        <div className="space-y-4">
                            {topVouchers.map((voucher, index) => (
                                <div
                                    key={voucher.code}
                                    className="flex items-center justify-between p-4 bg-foreground/90 rounded-lg"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center justify-center w-8 h-8 bg-rose-100 text-rose-600 rounded-full font-bold">
                                            {index + 1}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-background">
                                                {voucher.code}
                                            </p>
                                            <p className="text-sm text-background/60">
                                                {voucher.name}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-blue-600">
                                            {voucher.usageCount} lượt
                                        </p>
                                        <p className="text-sm text-background/60">
                                            Tiết kiệm:{' '}
                                            {DisplayPriceInVND(
                                                voucher.totalSavings
                                            )}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Usage Trend */}
            <Card className="py-6">
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>Xu Hướng Sử Dụng</CardTitle>
                        <select
                            value={selectedPeriod}
                            onChange={(e) => setSelectedPeriod(e.target.value)}
                            className="px-3 py-1 border rounded-md text-sm"
                        >
                            <option value="7d">7 ngày qua</option>
                            <option value="30d">30 ngày qua</option>
                            <option value="90d">90 ngày qua</option>
                        </select>
                    </div>
                </CardHeader>
                <CardContent>
                    {usageTrend.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">
                            Chưa có dữ liệu trong khoảng thời gian này
                        </p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-left py-2 px-4">
                                            Ngày
                                        </th>
                                        <th className="text-right py-2 px-4">
                                            Lượt dùng
                                        </th>
                                        <th className="text-right py-2 px-4">
                                            Tiết kiệm
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {usageTrend.map((item) => (
                                        <tr
                                            key={item.date}
                                            className="border-b hover:bg-foreground/20"
                                        >
                                            <td className="py-2 px-4">
                                                {new Date(
                                                    item.date
                                                ).toLocaleDateString('vi-VN')}
                                            </td>
                                            <td className="text-right py-2 px-4 font-semibold text-blue-600">
                                                {item.usageCount}
                                            </td>
                                            <td className="text-right py-2 px-4 font-semibold text-rose-600">
                                                {DisplayPriceInVND(
                                                    item.totalSavings
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default VoucherAnalytics;
