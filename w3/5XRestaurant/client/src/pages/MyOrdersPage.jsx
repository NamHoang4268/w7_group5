import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, Clock, CheckCircle2, XCircle, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import Axios from '@/utils/Axios';
import SummaryApi from '@/common/SummaryApi';
import AxiosToastError from '@/utils/AxiosToastError';
import Loading from '@/components/Loading';

const MyOrdersPage = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('all');

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const response = await Axios({
                ...SummaryApi.get_user_orders,
            });

            if (response.data.success) {
                setOrders(response.data.data || []);
            }
        } catch (error) {
            AxiosToastError(error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusConfig = (status) => {
        const configs = {
            pending: {
                label: 'Chờ xử lý',
                icon: Clock,
                color: 'text-orange-600 dark:text-orange-400',
                bgColor: 'bg-orange-50 dark:bg-orange-900/20',
            },
            processing: {
                label: 'Đang xử lý',
                icon: Package,
                color: 'text-blue-600 dark:text-blue-400',
                bgColor: 'bg-blue-50 dark:bg-blue-900/20',
            },
            completed: {
                label: 'Hoàn thành',
                icon: CheckCircle2,
                color: 'text-green-600 dark:text-green-400',
                bgColor: 'bg-green-50 dark:bg-green-900/20',
            },
            cancelled: {
                label: 'Đã hủy',
                icon: XCircle,
                color: 'text-red-600 dark:text-red-400',
                bgColor: 'bg-red-50 dark:bg-red-900/20',
            },
        };
        return configs[status] || configs.pending;
    };

    const filterOrders = (status) => {
        let filtered = orders;
        
        if (status !== 'all') {
            filtered = filtered.filter(order => order.status === status);
        }

        if (searchQuery) {
            filtered = filtered.filter(order => 
                order.orderId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                order.items?.some(item => 
                    item.name?.toLowerCase().includes(searchQuery.toLowerCase())
                )
            );
        }

        return filtered;
    };

    const OrderCard = ({ order }) => {
        const statusConfig = getStatusConfig(order.status);
        const StatusIcon = statusConfig.icon;

        return (
            <Card 
                className="overflow-hidden transition-all hover:shadow-lg"
                style={{
                    background: 'rgba(var(--card-rgb), 0.95)',
                    backdropFilter: 'blur(20px)',
                }}
            >
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-base font-semibold text-foreground">
                            Đơn hàng #{order.orderId}
                        </CardTitle>
                        <div 
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${statusConfig.bgColor}`}
                        >
                            <StatusIcon className={`w-4 h-4 ${statusConfig.color}`} />
                            <span className={`text-xs font-medium ${statusConfig.color}`}>
                                {statusConfig.label}
                            </span>
                        </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                        {new Date(order.createdAt).toLocaleString('vi-VN')}
                    </p>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="space-y-2">
                        {order.items?.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-sm">
                                <span className="text-foreground">
                                    {item.quantity}x {item.name}
                                </span>
                                <span className="font-medium text-foreground">
                                    {item.price?.toLocaleString('vi-VN')}đ
                                </span>
                            </div>
                        ))}
                    </div>
                    <div className="pt-3 border-t border-border">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-semibold text-foreground">Tổng cộng:</span>
                            <span 
                                className="text-lg font-bold"
                                style={{ color: '#C96048' }}
                            >
                                {order.totalAmount?.toLocaleString('vi-VN')}đ
                            </span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loading />
            </div>
        );
    }

    return (
        <div className="container mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Đơn hàng của tôi</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Quản lý và theo dõi đơn hàng của bạn
                    </p>
                </div>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                    placeholder="Tìm kiếm theo mã đơn hàng hoặc tên món..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                />
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="all">Tất cả</TabsTrigger>
                    <TabsTrigger value="pending">Chờ xử lý</TabsTrigger>
                    <TabsTrigger value="processing">Đang xử lý</TabsTrigger>
                    <TabsTrigger value="completed">Hoàn thành</TabsTrigger>
                    <TabsTrigger value="cancelled">Đã hủy</TabsTrigger>
                </TabsList>

                {['all', 'pending', 'processing', 'completed', 'cancelled'].map((status) => (
                    <TabsContent key={status} value={status} className="space-y-4">
                        {filterOrders(status).length === 0 ? (
                            <Card>
                                <CardContent className="flex flex-col items-center justify-center py-12">
                                    <Package className="w-16 h-16 text-muted-foreground mb-4" />
                                    <p className="text-muted-foreground">
                                        {searchQuery 
                                            ? 'Không tìm thấy đơn hàng phù hợp'
                                            : 'Chưa có đơn hàng nào'
                                        }
                                    </p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="grid gap-4">
                                {filterOrders(status).map((order) => (
                                    <OrderCard key={order._id} order={order} />
                                ))}
                            </div>
                        )}
                    </TabsContent>
                ))}
            </Tabs>
        </div>
    );
};

export default MyOrdersPage;
