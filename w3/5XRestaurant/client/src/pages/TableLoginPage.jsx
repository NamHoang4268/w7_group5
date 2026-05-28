import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTheme } from 'next-themes';
import Axios from '../utils/Axios';
import SummaryApi from '../common/SummaryApi';
import toast from 'react-hot-toast';
import { useDispatch } from 'react-redux';
import { setUserDetails } from '../store/userSlice';

const TableLoginPage = () => {
    const { theme } = useTheme();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const loginWithQR = async () => {
            const token = searchParams.get('token');

            if (!token) {
                setError('Không tìm thấy mã QR. Vui lòng quét lại.');
                setLoading(false);
                return;
            }

            try {
                const response = await Axios({
                    ...SummaryApi.tableLogin,
                    data: { token },
                });

                if (response.data.success) {
                    // Save tokens
                    localStorage.setItem(
                        'accessToken',
                        response.data.data.accessToken
                    );
                    localStorage.setItem(
                        'refreshToken',
                        response.data.data.refreshToken
                    );

                    // Save user details to Redux
                    dispatch(setUserDetails(response.data.data.user));

                    // AC 5.1 / 5.2 – phân biệt phiên mới vs tham gia phiên hiện tại
                    const { hasActiveSession, activeOrderItemCount } =
                        response.data.data.sessionInfo || {};

                    if (hasActiveSession) {
                        toast(`🍽️ Bàn đang có ${activeOrderItemCount} món đã gọi. Bạn đang tham gia phiên hiện tại!`, {
                            duration: 4000,
                            icon: '🪑',
                        });
                    } else {
                        toast.success('Chào mừng! Phiên gọi món mới đã được khởi tạo 🍽️', {
                            duration: 3000,
                        });
                    }

                    // Redirect sang customer checkin (loyalty), truyền hasActiveSession để checkin page biết
                    const { tableId, tableNumber } = response.data.data.user;
                    navigate(
                        `/customer-checkin?tableId=${tableId}&tableNumber=${encodeURIComponent(tableNumber || '')}&hasActiveSession=${hasActiveSession ? '1' : '0'}`
                    );
                } else {
                    setError(response.data.message || 'Đăng nhập thất bại');
                }
            } catch (err) {
                console.error('QR Login Error:', err);
                setError(
                    err.response?.data?.message ||
                        'Đăng nhập thất bại. Vui lòng thử lại.'
                );
            } finally {
                setLoading(false);
            }
        };

        loginWithQR();
    }, [searchParams, navigate, dispatch]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background dark:bg-gray-950 px-4">
                <div className="text-center">
                    <div
                        className="w-20 h-20 md:w-16 md:h-16 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-6"
                        style={{
                            borderColor: theme === 'dark' ? 'rgba(201,96,72,0.3)' : 'rgba(201,96,72,0.2)',
                            borderTopColor: 'transparent',
                            borderRightColor: '#C96048',
                        }}
                    />
                    <p className="text-xl md:text-lg text-foreground font-semibold">Đang xác thực mã QR...</p>
                    <p className="text-base md:text-sm text-muted-foreground mt-2">Vui lòng chờ trong giây lát</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background dark:bg-gray-950 p-4">
                <div className="bg-card dark:bg-gray-900 rounded-3xl shadow-xl p-8 md:p-6 max-w-md w-full text-center border border-border">
                    <div
                        className="w-24 h-24 md:w-20 md:h-20 rounded-full flex items-center justify-center mx-auto mb-6"
                        style={{
                            background: theme === 'dark'
                                ? 'rgba(239,68,68,0.15)'
                                : 'rgba(254,226,226,1)',
                        }}
                    >
                        <svg
                            className="w-12 h-12 md:w-10 md:h-10 text-red-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </div>
                    <h2 className="text-2xl md:text-xl font-bold text-foreground mb-3">
                        Mã QR không hợp lệ
                    </h2>
                    <p className="text-base md:text-sm text-muted-foreground mb-8 leading-relaxed">{error}</p>
                    <button
                        onClick={() => navigate('/')}
                        className="w-full text-white font-semibold text-lg md:text-base py-4 md:py-3 px-6 rounded-xl transition-all shadow-lg active:scale-95"
                        style={{
                            background: 'linear-gradient(135deg, #C96048 0%, #d97a66 100%)',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.opacity = '0.9';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.opacity = '1';
                        }}
                    >
                        Về trang chủ
                    </button>
                </div>
            </div>
        );
    }

    return null;
};

export default TableLoginPage;
