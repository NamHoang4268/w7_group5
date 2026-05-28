import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTheme } from 'next-themes';
import Axios from '../utils/Axios';
import toast from 'react-hot-toast';
import { FiUser, FiPhone, FiArrowRight, FiSkipForward, FiStar, FiGift } from 'react-icons/fi';
import { MdOutlineQrCodeScanner } from 'react-icons/md';

export default function CustomerCheckinPage() {
    const { theme } = useTheme();
    const [searchParams] = useSearchParams();
    const tableId = searchParams.get('tableId') || '';
    const tableNumber = decodeURIComponent(searchParams.get('tableNumber') || '');
    const navigate = useNavigate();

    const [form, setForm] = useState({ name: '', phone: '' });
    const [loading, setLoading] = useState(false);
    const [returnCustomer, setReturnCustomer] = useState(null); // Khách cũ quay lại

    const handleChange = (e) => {
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
        // Nếu đang hiện thông tin khách cũ mà người dùng thay đổi, xóa đi
        if (returnCustomer) setReturnCustomer(null);
    };

    // Bỏ qua – Guest mode
    const handleSkip = () => {
        sessionStorage.setItem('tableSession', JSON.stringify({
            tableId, tableNumber, isGuest: true,
        }));
        navigate(`/table-menu`);
    };

    // Nhập thông tin – lưu loyalty (US – Customer Check-in)
    const handleCheckin = async (e) => {
        e.preventDefault();
        if (!form.phone || form.phone.trim().length < 9) {
            toast.error('Vui lòng nhập số điện thoại hợp lệ để tích điểm.');
            return;
        }
        setLoading(true);
        try {
            const res = await Axios({
                url: '/api/customer/checkin',
                method: 'POST',
                data: { name: form.name.trim(), phone: form.phone.trim() },
            });
            if (res.data?.success) {
                const customer = res.data.data;
                const isNew = res.data.isNewCustomer;

                sessionStorage.setItem('tableSession', JSON.stringify({
                    tableId, tableNumber,
                    isGuest: false,
                    customerId: customer._id,
                    customerName: customer.name || form.name,
                    customerPhone: customer.phone,
                    totalPoints: customer.totalPoints,
                    visitCount: customer.visitCount,
                }));

                if (isNew) {
                    toast.success(`🎉 Chào mừng ${form.name || 'bạn'}! Tài khoản loyalty đã được tạo.`);
                } else {
                    // Hiện loyalty card trước khi vào menu
                    setReturnCustomer(customer);
                    return; // Dừng ở đây, đợi user bấm "Vào Menu"
                }

                navigate(`/table-menu`);
            }
        } catch (_err) {
            toast.error('Có lỗi xảy ra. Vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    };

    // Hiện loyalty card cho khách cũ → bấm vào menu
    if (returnCustomer) {
        const hasPoints = (returnCustomer.totalPoints || 0) > 0;
        return (
            <div className="min-h-screen bg-background dark:bg-gray-950 flex items-center justify-center p-4">
                <div className="w-full max-w-md">
                    {/* Welcome back card */}
                    <div className="bg-card dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden border border-border">
                        {/* Card header */}
                        <div
                            className="px-6 pt-10 pb-8 text-white text-center relative overflow-hidden"
                            style={{ background: 'linear-gradient(135deg, #C96048 0%, #d97a66 100%)' }}
                        >
                            <div className="absolute inset-0 opacity-10">
                                {[...Array(6)].map((_, i) => (
                                    <div key={i} className="absolute rounded-full bg-white"
                                        style={{ width: `${40 + i * 20}px`, height: `${40 + i * 20}px`, top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%`, opacity: 0.3 }}
                                    />
                                ))}
                            </div>
                            <div className="relative">
                                <div className="w-20 h-20 md:w-16 md:h-16 bg-white/20 backdrop-blur rounded-full flex items-center justify-center mx-auto mb-4 text-4xl md:text-3xl">
                                    👋
                                </div>
                                <h2 className="text-2xl md:text-xl font-bold">Chào mừng trở lại!</h2>
                                <p className="text-xl md:text-lg font-semibold mt-2 text-white/90">
                                    {returnCustomer.name || form.phone}
                                </p>
                                {tableNumber && (
                                    <div className="inline-block bg-white/20 px-4 py-2 rounded-full text-base md:text-sm mt-3">
                                        Bàn {tableNumber}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Loyalty stats */}
                        <div className="p-6 space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div
                                    className="rounded-2xl p-5 md:p-4 text-center border"
                                    style={{
                                        background: theme === 'dark' ? 'rgba(201,96,72,0.1)' : 'rgba(201,96,72,0.05)',
                                        borderColor: theme === 'dark' ? 'rgba(201,96,72,0.3)' : 'rgba(201,96,72,0.15)',
                                    }}
                                >
                                    <FiStar className="mx-auto text-[#C96048] text-2xl md:text-xl mb-2" />
                                    <p className="text-3xl md:text-2xl font-bold text-[#C96048]">
                                        {returnCustomer.totalPoints || 0}
                                    </p>
                                    <p className="text-sm md:text-xs text-muted-foreground mt-1">Điểm tích lũy</p>
                                </div>
                                <div
                                    className="rounded-2xl p-5 md:p-4 text-center border"
                                    style={{
                                        background: theme === 'dark' ? 'rgba(217,122,102,0.1)' : 'rgba(217,122,102,0.05)',
                                        borderColor: theme === 'dark' ? 'rgba(217,122,102,0.3)' : 'rgba(217,122,102,0.15)',
                                    }}
                                >
                                    <FiGift className="mx-auto text-[#d97a66] text-2xl md:text-xl mb-2" />
                                    <p className="text-3xl md:text-2xl font-bold text-[#d97a66]">
                                        {returnCustomer.visitCount || 1}
                                    </p>
                                    <p className="text-sm md:text-xs text-muted-foreground mt-1">Lần ghé thăm</p>
                                </div>
                            </div>

                            {hasPoints && (
                                <div
                                    className="border rounded-xl p-4 md:p-3 flex items-center gap-3 md:gap-2"
                                    style={{
                                        background: theme === 'dark' ? 'rgba(234,179,8,0.1)' : 'rgba(254,252,232,1)',
                                        borderColor: theme === 'dark' ? 'rgba(234,179,8,0.3)' : 'rgba(253,224,71,1)',
                                    }}
                                >
                                    <FiGift className="text-yellow-500 flex-shrink-0 text-xl md:text-base" />
                                    <p className="text-base md:text-sm leading-relaxed" style={{ color: theme === 'dark' ? 'rgba(250,204,21,1)' : 'rgba(133,77,14,1)' }}>
                                        Bạn có <strong>{returnCustomer.totalPoints} điểm</strong> – có thể dùng để đổi ưu đãi!
                                    </p>
                                </div>
                            )}

                            <button
                                onClick={() => navigate('/table-menu')}
                                className="w-full flex items-center justify-center gap-2 text-white font-bold text-lg md:text-base py-5 md:py-3.5 rounded-2xl transition-all shadow-lg active:scale-95"
                                style={{
                                    background: 'linear-gradient(135deg, #C96048 0%, #d97a66 100%)',
                                    boxShadow: theme === 'dark' ? '0 10px 25px rgba(201,96,72,0.3)' : '0 10px 25px rgba(201,96,72,0.2)',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = theme === 'dark' ? '0 15px 30px rgba(201,96,72,0.4)' : '0 15px 30px rgba(201,96,72,0.3)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = theme === 'dark' ? '0 10px 25px rgba(201,96,72,0.3)' : '0 10px 25px rgba(201,96,72,0.2)';
                                }}
                            >
                                Vào Menu ngay 🍽️
                                <FiArrowRight className="text-xl md:text-base" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Main check-in form
    return (
        <div className="min-h-screen bg-background dark:bg-gray-950 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="bg-card dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden border border-border">
                    {/* Top bar */}
                    <div
                        className="px-6 py-10 md:py-8 text-white text-center"
                        style={{ background: 'linear-gradient(135deg, #C96048 0%, #d97a66 100%)' }}
                    >
                        <div className="w-20 h-20 md:w-16 md:h-16 bg-white/15 backdrop-blur rounded-2xl flex items-center justify-center mx-auto mb-5 md:mb-4">
                            <MdOutlineQrCodeScanner className="text-white text-5xl md:text-4xl" />
                        </div>
                        <h1 className="text-3xl md:text-2xl font-bold">EatEase</h1>
                        <p className="text-white/80 text-base md:text-sm mt-2 md:mt-1">Nhà hàng thông minh</p>
                        {tableNumber && (
                            <div className="inline-block bg-white/20 text-white text-base md:text-sm font-semibold px-5 py-2 md:px-4 md:py-1.5 rounded-full mt-4 md:mt-3">
                                🪑 Bàn {tableNumber}
                            </div>
                        )}
                    </div>

                    <div className="p-6 space-y-6 md:space-y-5">
                        {/* Heading */}
                        <div className="text-center">
                            <h2 className="text-xl md:text-lg font-bold text-foreground">Chào mừng bạn!</h2>
                            <p className="text-muted-foreground text-base md:text-sm mt-2 md:mt-1 leading-relaxed">
                                Nhập thông tin để <strong className="text-[#C96048]">tích điểm loyalty</strong>, hoặc bỏ qua để xem menu ngay.
                            </p>
                        </div>

                        {/* Loyalty perks preview */}
                        <div
                            className="border rounded-2xl p-4 md:p-3.5 flex items-start gap-3"
                            style={{
                                background: theme === 'dark' ? 'rgba(201,96,72,0.1)' : 'rgba(201,96,72,0.05)',
                                borderColor: theme === 'dark' ? 'rgba(201,96,72,0.3)' : 'rgba(201,96,72,0.15)',
                            }}
                        >
                            <FiStar className="text-[#C96048] text-2xl md:text-lg mt-0.5 flex-shrink-0" />
                            <div className="text-base md:text-sm text-foreground">
                                <p className="font-semibold text-[#C96048]">Tích điểm mỗi lần ăn</p>
                                <p className="text-muted-foreground mt-0.5">Đổi điểm lấy ưu đãi &amp; món miễn phí!</p>
                            </div>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleCheckin} className="space-y-4 md:space-y-3">
                            <div className="relative">
                                <FiUser className="absolute left-4 md:left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xl md:text-base" />
                                <input
                                    type="text"
                                    name="name"
                                    value={form.name}
                                    onChange={handleChange}
                                    placeholder="Tên của bạn (tùy chọn)"
                                    className="w-full pl-12 md:pl-10 pr-4 py-4 md:py-3 text-base md:text-sm rounded-xl border border-border focus:outline-none bg-background dark:bg-gray-950 text-foreground placeholder:text-muted-foreground transition"
                                />
                            </div>
                            <div className="relative">
                                <FiPhone className="absolute left-4 md:left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xl md:text-base" />
                                <input
                                    type="tel"
                                    name="phone"
                                    value={form.phone}
                                    onChange={handleChange}
                                    placeholder="Số điện thoại *"
                                    className="w-full pl-12 md:pl-10 pr-4 py-4 md:py-3 text-base md:text-sm rounded-xl border border-border focus:outline-none bg-background dark:bg-gray-950 text-foreground placeholder:text-muted-foreground transition"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading || !form.phone}
                                className="w-full flex items-center justify-center gap-2 disabled:opacity-60 text-white font-bold text-lg md:text-base py-5 md:py-3.5 rounded-xl transition-all duration-200 shadow-md active:scale-95"
                                style={{
                                    background: 'linear-gradient(135deg, #C96048 0%, #d97a66 100%)',
                                }}
                            >
                                {loading ? (
                                    <>
                                        <div className="w-5 h-5 md:w-4 md:h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Đang xử lý...
                                    </>
                                ) : (
                                    <>
                                        Xác nhận &amp; Xem menu
                                        <FiArrowRight className="text-xl md:text-base" />
                                    </>
                                )}
                            </button>
                        </form>

                        {/* Divider */}
                        <div className="flex items-center gap-3">
                            <div className="flex-1 h-px bg-border" />
                            <span className="text-muted-foreground text-sm md:text-xs">hoặc</span>
                            <div className="flex-1 h-px bg-border" />
                        </div>

                        {/* Skip */}
                        <button
                            onClick={handleSkip}
                            className="w-full flex items-center justify-center gap-2 border-2 border-border text-muted-foreground hover:text-[#C96048] font-medium text-base md:text-sm py-4 md:py-3 rounded-xl transition-all duration-200 active:scale-95"
                        >
                            <FiSkipForward className="text-xl md:text-base" />
                            Bỏ qua – Xem menu ngay
                        </button>

                        <p className="text-center text-sm md:text-xs text-muted-foreground leading-relaxed">
                            🔒 Thông tin chỉ dùng để tích điểm, không chia sẻ bên ngoài.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
