import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import Axios from '../utils/Axios';
import SummaryApi from '../common/SummaryApi';

// Map tableOrder enum values → Vietnamese labels used by BillPage UI
const STATUS_MAP = {
    // paymentStatus field
    'pending':   'Chờ xử lý',
    'paid':      'Đã thanh toán',
    'refunded':  'Đã hoàn tiền',
    'Chờ xử lý': 'Chờ xử lý',
    'Đang chuẩn bị': 'Đang chuẩn bị',
    'Đã phục vụ': 'Đã phục vụ',
    'Đang chờ thanh toán': 'Đang chờ thanh toán',
    'Chờ thanh toán': 'Chờ thanh toán',
    'Đã thanh toán': 'Đã thanh toán',
    'Đã hủy': 'Đã hủy',
    // status field
    'active':           'active',
    'pending_payment':  'Chờ thanh toán',
    'cancelled':        'Đã hủy',
};

function mapPaymentStatus(paymentStatus, status) {
    // paymentStatus 'paid' takes priority
    if (paymentStatus === 'paid') return 'Đã thanh toán';
    if (paymentStatus === 'refunded') return 'Đã hoàn tiền';
    // If we have a Vietnamese paymentStatus, use it
    if (['Đang chuẩn bị', 'Đã phục vụ', 'Đang chờ thanh toán', 'Chờ thanh toán', 'Chờ xử lý'].includes(paymentStatus)) {
        return paymentStatus;
    }
    // fallback to order status
    const mappedStatus = STATUS_MAP[status];
    if (mappedStatus && mappedStatus !== 'active') return mappedStatus;
    return STATUS_MAP[paymentStatus] || 'Chờ xử lý';
}

export const updateOrderStatus = createAsyncThunk(
    'orders/updateStatus',
    async ({ orderId, status }, { rejectWithValue }) => {
        try {
            const accessToken = localStorage.getItem('accesstoken');
            if (!accessToken) {
                throw new Error('Vui lòng đăng nhập để thực hiện thao tác này');
            }

            console.log('Updating order status:', {
                url: `${SummaryApi.update_order_status.url}/${orderId}`,
                method: 'PUT',
                data: { status },
                baseURL: Axios.defaults.baseURL
            });

            const response = await Axios({
                ...SummaryApi.update_order_status,
                url: `${SummaryApi.update_order_status.url}/${orderId}`,
                method: 'PUT',
                data: { status }
            });

            console.log('Update response:', response.data);

            if (response.data.success) {
                return { orderId, status, updatedOrder: response.data.data };
            }
            throw new Error(response.data.message || 'Cập nhật trạng thái thất bại');
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || error.message);
        }
    }
);

export const fetchAllOrders = createAsyncThunk(
    'orders/fetchAll',
    async (filters = {}, { getState, rejectWithValue }) => {
        try {
            const { user } = getState();
            const accessToken = localStorage.getItem('accesstoken');

            // Allow ADMIN, WAITER, CASHIER to access
            const allowedRoles = ['ADMIN', 'WAITER', 'CASHIER'];
            if (!accessToken || !user?._id || !allowedRoles.includes(user?.role)) {
                throw new Error('Bạn không có quyền truy cập');
            }

            const { search: _search, ...apiFilters } = filters;

            const response = await Axios({
                ...SummaryApi.all_orders,
                params: {
                    ...apiFilters,
                    status: filters.status || undefined,
                    startDate: filters.startDate || undefined,
                    endDate: filters.endDate || undefined,
                },
            });

            if (response.data.success) {
                const orders = response.data.data || [];
                return { orders, filters };
            }
            throw new Error(response.data.message || 'Lỗi khi tải danh sách đơn hàng');
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

const initialState = {
    data: [],
    allOrders: [],
    loading: false,
    error: null,
    filters: {},
};

const orderSlice = createSlice({
    name: 'orders',
    initialState,
    reducers: {
        setOrder: (state, action) => {
            state.data = [...action.payload];
        },
        setAllOrders: (state, action) => {
            state.allOrders = [...action.payload];
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchAllOrders.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchAllOrders.fulfilled, (state, action) => {
                state.loading = false;
                // Normalize tableOrder fields → BillPage field names
                state.allOrders = (action.payload.orders || []).map(order => ({
                    ...order,
                    // BillPage reads payment_status, tableOrder has paymentStatus
                    payment_status: mapPaymentStatus(order.paymentStatus, order.status),
                    // BillPage reads totalAmt, tableOrder has total
                    totalAmt: order.total || 0,
                    // BillPage reads products[], tableOrder has items[]
                    products: (order.items || []).map(item => ({
                        name: item.name,
                        quantity: item.quantity,
                        price: item.price,
                    })),
                }));
                state.filters = action.payload.filters;
            })
            .addCase(fetchAllOrders.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(updateOrderStatus.fulfilled, (state, action) => {
                const { orderId, status, updatedOrder } = action.payload;
                const orderIndex = state.allOrders.findIndex(order => order._id === orderId);
                if (orderIndex !== -1) {
                    if (updatedOrder) {
                        // Re-normalize the updated order
                        state.allOrders[orderIndex] = {
                            ...updatedOrder,
                            payment_status: mapPaymentStatus(updatedOrder.paymentStatus, updatedOrder.status),
                            totalAmt: updatedOrder.total || 0,
                            products: (updatedOrder.items || []).map(item => ({
                                name: item.name,
                                quantity: item.quantity,
                                price: item.price,
                            })),
                        };
                    } else {
                        state.allOrders[orderIndex].payment_status = status;
                    }
                }
            })
            .addCase(updateOrderStatus.rejected, (state, action) => {
                state.error = action.payload;
            });
    },
});

export const { setOrder, setAllOrders } = orderSlice.actions;
export default orderSlice.reducer;
