import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import SummaryApi from '../common/SummaryApi';
import Axios from '../utils/Axios';
import AxiosToastError from '../utils/AxiosToastError';
import { LuEye, LuCheck, LuX } from 'react-icons/lu';
import Loading from '../components/Loading';
import ConfirmBox from '../components/ConfirmBox';
import successAlert from '../utils/successAlert';
import DynamicTable from '@/components/table/dynamic-table';
import {
    Card,
    CardFooter,
    CardHeader,
    CardTitle,
    CardDescription,
} from '@/components/ui/card';
import GlareHover from '@/components/GlareHover';
import { Button } from '@/components/ui/button';
import ViewBookingDetails from '@/components/ViewBookingDetails';

const BookingManagementPage = () => {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState([]);

    const [openViewDetails, setOpenViewDetails] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState(null);

    const [openConfirmBox, setOpenConfirmBox] = useState(false);
    const [confirmAction, setConfirmAction] = useState(null);
    const [actionBooking, setActionBooking] = useState(null);

    const fetchBookings = async () => {
        try {
            setLoading(true);
            const response = await Axios({
                ...SummaryApi.get_all_bookings,
            });

            if (response.data.success) {
                const formattedData = response.data.data.map((item, index) => ({
                    id: index + 1,
                    _id: item._id,
                    customerName: item.customerName,
                    phone: item.phone,
                    email: item.email || 'N/A',
                    tableNumber: item.tableId?.tableNumber || 'N/A',
                    tableId: item.tableId?._id,
                    numberOfGuests: item.numberOfGuests,
                    bookingDate: format(
                        new Date(item.bookingDate),
                        'dd/MM/yyyy'
                    ),
                    bookingTime: item.bookingTime,
                    status: item.status,
                    depositAmount: item.depositAmount || 0,
                    depositPaid: item.depositPaid,
                    specialRequests: item.specialRequests || '',
                    hasPreOrder: item.hasPreOrder,
                    preOrderId: item.preOrderId,
                    preOrderTotal: item.preOrderTotal,
                    createdAt: format(
                        new Date(item.createdAt),
                        'dd/MM/yyyy HH:mm'
                    ),
                    rawData: item,
                }));
                setData(formattedData);
            }
        } catch (error) {
            AxiosToastError(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBookings();
    }, []);

    const handleConfirmBooking = async () => {
        try {
            const response = await Axios({
                ...SummaryApi.confirm_booking,
                data: { _id: actionBooking._id },
            });

            if (response.data.success) {
                successAlert(response.data.message);
                fetchBookings();
                setOpenConfirmBox(false);
            }
        } catch (error) {
            AxiosToastError(error);
        }
    };

    const handleCancelBooking = async () => {
        try {
            const response = await Axios({
                ...SummaryApi.cancel_booking,
                data: {
                    _id: actionBooking._id,
                    cancelledBy: 'admin',
                },
            });

            if (response.data.success) {
                successAlert(response.data.message);
                fetchBookings();
                setOpenConfirmBox(false);
            }
        } catch (error) {
            AxiosToastError(error);
        }
    };

    const getStatusBadge = (status) => {
        const statusConfig = {
            pending: {
                text: 'Chờ xác nhận',
                className: 'bg-yellow-100 text-yellow-800',
            },
            confirmed: {
                text: 'Đã xác nhận',
                className: 'bg-green-100 text-green-800',
            },
            cancelled: { text: 'Đã hủy', className: 'bg-red-100 text-red-800' },
            completed: {
                text: 'Hoàn thành',
                className: 'bg-gray-100 text-gray-800',
            },
        };

        const config = statusConfig[status] || statusConfig.pending;

        return (
            <span
                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.className}`}
            >
                {config.text}
            </span>
        );
    };

    const columns = [
        {
            key: 'customerName',
            label: 'Tên khách',
            type: 'string',
            sortable: true,
            format: (value, row) => (
                <div className="flex flex-col">
                    <span>{value}</span>
                    {row.hasPreOrder && (
                        <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full w-fit mt-1">
                            + Đặt món
                        </span>
                    )}
                </div>
            ),
        },
        { key: 'phone', label: 'Số ĐT', type: 'string', sortable: true },
        { key: 'tableNumber', label: 'Số bàn', type: 'string', sortable: true },
        {
            key: 'numberOfGuests',
            label: 'Số người',
            type: 'number',
            sortable: true,
        },
        {
            key: 'bookingDate',
            label: 'Ngày đặt',
            type: 'string',
            sortable: true,
        },
        { key: 'bookingTime', label: 'Giờ', type: 'string', sortable: true },
        {
            key: 'status',
            label: 'Trạng thái',
            type: 'string',
            sortable: true,
            format: (value) => getStatusBadge(value),
        },
        {
            key: 'depositAmount',
            label: 'Thanh toán',
            type: 'string',
            sortable: true,
            format: (value, row) => (
                <div className="flex flex-col">
                    <span className="text-xs text-gray-500">
                        Cọc:{' '}
                        {value > 0 ? value.toLocaleString('vi-VN') + 'đ' : '-'}
                    </span>
                    {row.hasPreOrder && (
                        <span className="text-xs text-purple-600 font-medium">
                            Món: {row.preOrderTotal?.toLocaleString('vi-VN')}đ
                        </span>
                    )}
                    {(value > 0 || row.hasPreOrder) && (
                        <span
                            className={`text-xs mt-1 ${
                                row.depositPaid
                                    ? 'text-green-600'
                                    : 'text-yellow-600'
                            }`}
                        >
                            {row.depositPaid
                                ? 'Đã thanh toán'
                                : 'Chưa thanh toán'}
                        </span>
                    )}
                </div>
            ),
        },
        {
            key: 'action',
            label: 'Thao tác',
            type: 'string',
            sortable: false,
            format: (value, row) =>
                row ? (
                    <div className="flex gap-2">
                        <button
                            className="p-2 bg-blue-100 text-blue-600 rounded-md hover:bg-blue-200"
                            onClick={(e) => {
                                e.stopPropagation();
                                setSelectedBooking(row.rawData);
                                setOpenViewDetails(true);
                            }}
                            title="Xem chi tiết"
                        >
                            <LuEye size={18} />
                        </button>
                        {row.status === 'pending' && (
                            <button
                                className="p-2 bg-green-100 text-green-600 rounded-md hover:bg-green-200"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setActionBooking(row);
                                    setConfirmAction('confirm');
                                    setOpenConfirmBox(true);
                                }}
                                title="Xác nhận"
                            >
                                <LuCheck size={18} />
                            </button>
                        )}
                        {(row.status === 'pending' ||
                            row.status === 'confirmed') && (
                            <button
                                className="p-2 bg-red-100 text-red-600 rounded-md hover:bg-red-200"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setActionBooking(row);
                                    setConfirmAction('cancel');
                                    setOpenConfirmBox(true);
                                }}
                                title="Hủy"
                            >
                                <LuX size={18} />
                            </button>
                        )}
                    </div>
                ) : null,
        },
    ];

    return (
        <section className="container mx-auto grid gap-2 z-10">
            <Card className="py-6 flex-row justify-between gap-6 border-card-foreground">
                <CardHeader>
                    <CardTitle className="text-lg text-highlight font-bold uppercase">
                        Quản lý đặt bàn
                    </CardTitle>
                    <CardDescription>
                        Quản lý danh sách đặt bàn của khách hàng
                    </CardDescription>
                </CardHeader>

                <CardFooter>
                    <GlareHover
                        background="transparent"
                        glareOpacity={0.3}
                        glareAngle={-30}
                        glareSize={300}
                        transitionDuration={800}
                        playOnce={false}
                    >
                        <Button
                            onClick={fetchBookings}
                            className="bg-foreground"
                        >
                            Làm mới
                        </Button>
                    </GlareHover>
                </CardFooter>
            </Card>

            <div className="overflow-auto w-full max-w-[95vw]">
                <DynamicTable
                    data={data}
                    columns={columns}
                    pageSize={10}
                    sortable={true}
                    searchable={true}
                    filterable={false}
                    groupable={false}
                />
            </div>

            {loading && <Loading />}

            {openViewDetails && selectedBooking && (
                <ViewBookingDetails
                    close={() => setOpenViewDetails(false)}
                    data={selectedBooking}
                    fetchData={fetchBookings}
                />
            )}

            {openConfirmBox && (
                <ConfirmBox
                    close={() => setOpenConfirmBox(false)}
                    cancel={() => setOpenConfirmBox(false)}
                    confirm={
                        confirmAction === 'confirm'
                            ? handleConfirmBooking
                            : handleCancelBooking
                    }
                    title={
                        confirmAction === 'confirm'
                            ? 'Xác nhận đặt bàn'
                            : 'Hủy đặt bàn'
                    }
                    message={
                        confirmAction === 'confirm'
                            ? 'Bạn có chắc chắn muốn xác nhận đặt bàn này?'
                            : actionBooking?.depositPaid
                            ? 'Đặt bàn này đã thanh toán cọc. Hủy đặt bàn sẽ tự động hoàn tiền cho khách. Bạn có chắc chắn muốn hủy?'
                            : 'Bạn có chắc chắn muốn hủy đặt bàn này?'
                    }
                    confirmText={
                        confirmAction === 'confirm' ? 'Xác nhận' : 'Hủy đặt bàn'
                    }
                    cancelText="Đóng"
                />
            )}
        </section>
    );
};

export default BookingManagementPage;
