import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import SummaryApi from '../common/SummaryApi';
import Axios from '../utils/Axios';
import AxiosToastError from '../utils/AxiosToastError';
import successAlert from '../utils/successAlert';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@radix-ui/react-label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import GlareHover from '@/components/GlareHover';
import Loading from '@/components/Loading';
import Divider from '@/components/Divider';

const BookingPage = () => {
    const [loading, setLoading] = useState(false);
    const [availableTables, setAvailableTables] = useState([]);
    const [loadingTables, setLoadingTables] = useState(false);
    const [bookingSuccess, setBookingSuccess] = useState(false);
    const [bookingId, setBookingId] = useState('');

    const user = useSelector((state) => state.user);

    const [formData, setFormData] = useState({
        customerName: '',
        phone: '',
        email: '',
        numberOfGuests: '',
        bookingDate: '',
        bookingTime: '',
        tableId: '',
        specialRequests: '',
    });

    useEffect(() => {
        if (user?._id) {
            setFormData((prev) => ({
                ...prev,
                customerName: user.name || '',
                email: user.email || '',
                phone: user.mobile || '',
            }));
        }
    }, [user]);

    // Time slots (18:00 - 22:00, 30 min intervals)
    const timeSlots = [
        '18:00',
        '18:30',
        '19:00',
        '19:30',
        '20:00',
        '20:30',
        '21:00',
        '21:30',
        '22:00',
    ];

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSelectChange = (name, value) => {
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    // Fetch available tables
    const fetchAvailableTables = useCallback(async () => {
        if (
            !formData.bookingDate ||
            !formData.bookingTime ||
            !formData.numberOfGuests
        ) {
            setAvailableTables([]);
            return;
        }

        try {
            setLoadingTables(true);
            const response = await Axios({
                ...SummaryApi.get_available_tables_for_booking,
                data: {
                    bookingDate: formData.bookingDate,
                    bookingTime: formData.bookingTime,
                    numberOfGuests: parseInt(formData.numberOfGuests),
                },
            });

            if (response.data.success) {
                setAvailableTables(response.data.data);
                if (
                    formData.tableId &&
                    !response.data.data.find((t) => t._id === formData.tableId)
                ) {
                    setFormData((prev) => ({ ...prev, tableId: '' }));
                }
            }
        } catch (error) {
            AxiosToastError(error);
            setAvailableTables([]);
        } finally {
            setLoadingTables(false);
        }
    }, [
        formData.bookingDate,
        formData.bookingTime,
        formData.numberOfGuests,
        formData.tableId,
    ]);

    useEffect(() => {
        fetchAvailableTables();
    }, [fetchAvailableTables]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (
            !formData.customerName ||
            !formData.phone ||
            !formData.numberOfGuests ||
            !formData.bookingDate ||
            !formData.bookingTime ||
            !formData.tableId
        ) {
            AxiosToastError({
                response: {
                    data: {
                        message: 'Vui lòng điền đầy đủ thông tin bắt buộc',
                    },
                },
            });
            return;
        }

        // Check for deposit requirement
        const guests = parseInt(formData.numberOfGuests);
        if (guests > 4) {
            const depositAmount = guests * 50000;
            const confirmDeposit = window.confirm(
                `Với nhóm ${guests} khách, nhà hàng yêu cầu đặt cọc ${depositAmount.toLocaleString(
                    'vi-VN'
                )}đ (50.000đ/người). Bạn có muốn tiếp tục thanh toán không?`
            );
            if (!confirmDeposit) return;
        }

        try {
            setLoading(true);
            const response = await Axios({
                ...SummaryApi.create_booking,
                data: {
                    ...formData,
                    numberOfGuests: guests,
                    createdBy: 'customer',
                },
            });

            if (response.data.success) {
                const booking = response.data.data;

                // Handle deposit if required
                if (booking.depositAmount > 0) {
                    try {
                        const paymentResponse = await Axios({
                            ...SummaryApi.create_booking_payment_session,
                            data: {
                                bookingId: booking._id,
                            },
                        });

                        if (paymentResponse.data && paymentResponse.data.url) {
                            window.location.href = paymentResponse.data.url;
                            return; // Stop here, redirecting
                        }
                    } catch (paymentError) {
                        console.error(
                            'Payment session creation failed:',
                            paymentError
                        );
                        AxiosToastError(paymentError);
                        // Even if payment fails, booking is created but pending/unpaid.
                        // We can show success but mention payment is pending?
                        // Or just show normal success and let them pay later (if we had that feature).
                        // For now, fall through to normal success.
                    }
                }

                successAlert(response.data.message);
                setBookingId(booking._id);
                setBookingSuccess(true);

                setFormData({
                    customerName: '',
                    phone: '',
                    email: '',
                    numberOfGuests: '',
                    bookingDate: '',
                    bookingTime: '',
                    tableId: '',
                    specialRequests: '',
                });
                setAvailableTables([]);
            }
        } catch (error) {
            AxiosToastError(error);
        } finally {
            setLoading(false);
        }
    };

    const handleNewBooking = () => {
        setBookingSuccess(false);
        setBookingId('');
    };

    const today = new Date().toISOString().split('T')[0];

    if (bookingSuccess) {
        return (
            <section className="container mx-auto py-8 px-4">
                <Card className="max-w-2xl mx-auto border-green-600 border-2 py-6">
                    <CardHeader className="text-center">
                        <CardTitle className="text-2xl text-green-600 font-bold">
                            🎉 Đặt bàn thành công!
                        </CardTitle>
                        <CardDescription className="text-base mt-4">
                            Cảm ơn bạn đã đặt bàn tại nhà hàng của chúng tôi
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-6">
                        <div className="bg-foreground/20 p-6 rounded-lg space-y-3">
                            <div className="text-center">
                                <Label className="text-sm text-foreground">
                                    Mã đặt bàn của bạn
                                </Label>
                                <p className="text-xl font-bold text-green-500 mt-2 break-all">
                                    {bookingId}
                                </p>
                            </div>
                            <Divider />
                            <p className="text-sm text-center text-foreground">
                                Vui lòng lưu lại mã này để tra cứu hoặc hủy đặt
                                bàn
                            </p>
                        </div>

                        <div className="space-y-3 text-sm">
                            <p className="flex items-start gap-2">
                                <span className="text-green-600">✓</span>
                                <span>
                                    Đặt bàn của bạn đang ở trạng thái{' '}
                                    <strong>Chờ xác nhận</strong>
                                </span>
                            </p>
                            <p className="flex items-start gap-2">
                                <span className="text-green-600">✓</span>
                                <span>
                                    Chúng tôi sẽ liên hệ với bạn để xác nhận
                                </span>
                            </p>
                            <p className="flex items-start gap-2">
                                <span className="text-green-600">✓</span>
                                <span>
                                    Bạn có thể tra cứu đặt bàn bằng số điện
                                    thoại hoặc mã đặt bàn
                                </span>
                            </p>
                        </div>

                        <div className="flex gap-3 justify-center pt-4">
                            <GlareHover
                                background="transparent"
                                glareOpacity={0.3}
                                glareAngle={-30}
                                glareSize={300}
                                transitionDuration={800}
                                playOnce={false}
                            >
                                <Button
                                    onClick={handleNewBooking}
                                    className="bg-foreground"
                                >
                                    Đặt bàn mới
                                </Button>
                            </GlareHover>
                        </div>
                    </CardContent>
                </Card>
            </section>
        );
    }

    return (
        <section className="container mx-auto py-8 px-4">
            <Card className="max-w-3xl mx-auto border-foreground border-2 py-6">
                <CardHeader>
                    <CardTitle className="text-2xl text-highlight font-bold text-center">
                        Đặt bàn trực tuyến
                    </CardTitle>
                    <CardDescription className="text-center">
                        Vui lòng điền thông tin để đặt bàn tại nhà hàng
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <h3 className="font-semibold text-lg mb-4">
                                Thông tin khách hàng
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="customerName">
                                        Họ và tên{' '}
                                        <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        type="text"
                                        id="customerName"
                                        name="customerName"
                                        value={formData.customerName}
                                        onChange={handleChange}
                                        className="h-12"
                                        placeholder="Nguyễn Văn A"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="phone">
                                        Số điện thoại{' '}
                                        <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        type="tel"
                                        id="phone"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        className="h-12"
                                        placeholder="0912345678"
                                        required
                                    />
                                </div>

                                <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        type="email"
                                        id="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        className="h-12"
                                        placeholder="email@example.com"
                                    />
                                </div>
                            </div>
                        </div>

                        <Divider />

                        <div>
                            <h3 className="font-semibold text-lg mb-4">
                                Thông tin đặt bàn
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="numberOfGuests">
                                        Số người{' '}
                                        <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        type="number"
                                        id="numberOfGuests"
                                        name="numberOfGuests"
                                        min="1"
                                        value={formData.numberOfGuests}
                                        onChange={handleChange}
                                        className="h-12"
                                        placeholder="Số người"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="bookingDate">
                                        Ngày đặt{' '}
                                        <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        type="date"
                                        id="bookingDate"
                                        name="bookingDate"
                                        min={today}
                                        value={formData.bookingDate}
                                        onChange={handleChange}
                                        className="h-12"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="bookingTime">
                                        Giờ đặt{' '}
                                        <span className="text-red-500">*</span>
                                    </Label>
                                    <Select
                                        value={formData.bookingTime}
                                        onValueChange={(value) =>
                                            handleSelectChange(
                                                'bookingTime',
                                                value
                                            )
                                        }
                                        required
                                    >
                                        <SelectTrigger className="w-full h-12">
                                            <SelectValue placeholder="Chọn giờ" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {timeSlots.map((time) => (
                                                <SelectItem
                                                    key={time}
                                                    value={time}
                                                >
                                                    {time}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="tableId">
                                        Chọn bàn{' '}
                                        <span className="text-red-500">*</span>
                                    </Label>
                                    <Select
                                        value={formData.tableId}
                                        onValueChange={(value) =>
                                            handleSelectChange('tableId', value)
                                        }
                                        disabled={
                                            !formData.bookingDate ||
                                            !formData.bookingTime ||
                                            !formData.numberOfGuests ||
                                            loadingTables
                                        }
                                        required
                                    >
                                        <SelectTrigger className="w-full h-12">
                                            <SelectValue
                                                placeholder={
                                                    loadingTables
                                                        ? 'Đang tải...'
                                                        : !formData.bookingDate ||
                                                          !formData.bookingTime ||
                                                          !formData.numberOfGuests
                                                        ? 'Chọn ngày, giờ và số người trước'
                                                        : availableTables.length ===
                                                          0
                                                        ? 'Không có bàn trống'
                                                        : 'Chọn bàn'
                                                }
                                            />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableTables.map((table) => (
                                                <SelectItem
                                                    key={table._id}
                                                    value={table._id}
                                                >
                                                    Bàn {table.tableNumber} -{' '}
                                                    {table.capacity} người
                                                    {table.location &&
                                                        ` (${table.location})`}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {formData.bookingDate &&
                                        formData.bookingTime &&
                                        formData.numberOfGuests &&
                                        availableTables.length === 0 &&
                                        !loadingTables && (
                                            <p className="text-xs text-red-500">
                                                Không có bàn trống cho thời gian
                                                này. Vui lòng chọn thời gian
                                                khác.
                                            </p>
                                        )}
                                </div>
                            </div>
                        </div>

                        <Divider />

                        <div className="space-y-2">
                            <Label htmlFor="specialRequests">
                                Yêu cầu đặc biệt
                            </Label>
                            <Textarea
                                id="specialRequests"
                                name="specialRequests"
                                value={formData.specialRequests}
                                onChange={handleChange}
                                rows={4}
                                className="resize-none"
                                placeholder="Ví dụ: Cần ghế em bé, vị trí gần cửa sổ, ..."
                            />
                        </div>

                        <Divider />

                        <div className="flex justify-center pt-4">
                            <GlareHover
                                background="transparent"
                                glareOpacity={0.3}
                                glareAngle={-30}
                                glareSize={300}
                                transitionDuration={800}
                                playOnce={false}
                            >
                                <Button
                                    type="submit"
                                    className="bg-foreground px-12 h-12 text-base"
                                    disabled={loading}
                                >
                                    {loading ? <Loading /> : 'Đặt bàn ngay'}
                                </Button>
                            </GlareHover>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </section>
    );
};

export default BookingPage;
