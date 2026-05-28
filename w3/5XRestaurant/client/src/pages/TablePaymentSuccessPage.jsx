import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FiCheckCircle, FiArrowLeft, FiAlertCircle, FiRefreshCw } from 'react-icons/fi';
import Axios from '../utils/Axios';
import SummaryApi from '../common/SummaryApi';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

/*
 * AC 8   – Thanh toán thất bại → "Thanh toán không thành công. Vui lòng thử lại."
 * AC 9.1 – Bill đã thay đổi  → "Đơn hàng đã thay đổi. Vui lòng thanh toán lại."
 * AC 12  – Thành công        → "Thanh toán thành công. Cảm ơn quý khách!"
 */

const STATUS = {
    LOADING:      'loading',
    PAID:         'paid',
    PENDING:      'pending',       // webhook not received yet – polling
    BILL_CHANGED: 'bill_changed',
    ERROR:        'error',
};

const TablePaymentSuccessPage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const sessionId = searchParams.get('session_id');

    const [status, setStatus] = useState(STATUS.LOADING);
    const [message, setMessage] = useState('');
    const [orderData, setOrderData] = useState(null);
    const pollRef = useRef(null);
    const pollCountRef = useRef(0);
    const MAX_POLLS = 12; // 12 × 5s = 60s max

    const verify = async () => {
        try {
            const res = await Axios({
                ...SummaryApi.verify_stripe_session,
                params: { session_id: sessionId },
            });
            const { data: body } = res;
            if (!body.success) {
                setStatus(STATUS.ERROR);
                setMessage('Thanh toán không thành công. Vui lòng thử lại.');
                return;
            }
            const { status: s } = body.data;
            setMessage(body.message);

            if (s === 'paid') {
                setStatus(STATUS.PAID);
                setOrderData(body.data);
                clearInterval(pollRef.current);
                toast.success('Thanh toán thành công. Cảm ơn quý khách!', { duration: 5000 });
            } else if (s === 'bill_changed') {
                setStatus(STATUS.BILL_CHANGED);
                clearInterval(pollRef.current);
            } else {
                // still pending – keep polling
                setStatus(STATUS.PENDING);
                pollCountRef.current += 1;
                if (pollCountRef.current >= MAX_POLLS) {
                    clearInterval(pollRef.current);
                    setStatus(STATUS.ERROR);
                    setMessage('Không nhận được xác nhận thanh toán. Vui lòng liên hệ nhân viên.');
                }
            }
        } catch {
            setStatus(STATUS.ERROR);
            setMessage('Thanh toán không thành công. Vui lòng thử lại.');
            clearInterval(pollRef.current);
        }
    };

    useEffect(() => {
        if (!sessionId) {
            navigate('/');
            return;
        }

        // Initial verify
        verify();

        // Poll every 5 seconds while pending
        pollRef.current = setInterval(verify, 5000);

        return () => clearInterval(pollRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessionId]);

    // ─── Render helpers ─────────────────────────────────
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { when: 'beforeChildren', staggerChildren: 0.1 } },
    };
    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1, transition: { duration: 0.5 } },
    };

    // LOADING / PENDING
    if (status === STATUS.LOADING || status === STATUS.PENDING) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center space-y-4">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto" />
                    <p className="text-gray-600 font-medium text-lg">
                        {status === STATUS.LOADING ? 'Đang xác nhận thanh toán...' : 'Đang chờ xác nhận từ Stripe...'}
                    </p>
                    <p className="text-gray-400 text-sm">Vui lòng không đóng trang này</p>
                </div>
            </div>
        );
    }

    // BILL CHANGED (AC 9.1)
    if (status === STATUS.BILL_CHANGED) {
        return (
            <div className="min-h-screen bg-gray-50 py-8 px-4 flex items-center justify-center">
                <div className="max-w-md mx-auto bg-white rounded-2xl shadow-lg overflow-hidden">
                    <div className="bg-yellow-500 py-8 px-6 text-center">
                        <FiAlertCircle className="text-white text-5xl mx-auto mb-3" />
                        <h1 className="text-2xl font-bold text-white">Đơn hàng đã thay đổi</h1>
                    </div>
                    <div className="p-6 space-y-4">
                        <p className="text-gray-700 text-center">
                            Đơn hàng đã thay đổi. Vui lòng thanh toán lại.
                        </p>
                        <button
                            onClick={() => navigate('/table-order-management')}
                            className="w-full bg-yellow-500 hover:bg-yellow-600 text-white py-3 rounded-xl font-bold transition"
                        >
                            Quay lại đơn hàng
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ERROR / FAILED (AC 8.1)
    if (status === STATUS.ERROR) {
        return (
            <div className="min-h-screen bg-gray-50 py-8 px-4 flex items-center justify-center">
                <div className="max-w-md mx-auto bg-white rounded-2xl shadow-lg overflow-hidden">
                    <div className="bg-red-500 py-8 px-6 text-center">
                        <FiAlertCircle className="text-white text-5xl mx-auto mb-3" />
                        <h1 className="text-2xl font-bold text-white">Thanh toán thất bại</h1>
                    </div>
                    <div className="p-6 space-y-4">
                        <p className="text-gray-700 text-center">
                            {message || 'Thanh toán không thành công. Vui lòng thử lại.'}
                        </p>
                        <button
                            onClick={() => navigate('/table-order-management')}
                            className="w-full bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-bold transition flex items-center justify-center gap-2"
                        >
                            <FiRefreshCw /> Thử lại
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // SUCCESS – PAID (AC 12)
    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
            <motion.div
                className="max-w-2xl mx-auto rounded-xl shadow-lg overflow-hidden bg-white"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-green-500 to-green-600 py-8 px-6 text-center">
                    <motion.div
                        className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full mb-4"
                        variants={itemVariants}
                    >
                        <FiCheckCircle className="text-green-600 text-5xl" />
                    </motion.div>
                    <motion.h1
                        className="text-3xl font-bold text-white mb-2"
                        variants={itemVariants}
                    >
                        Thanh Toán Thành Công!
                    </motion.h1>
                    <motion.p className="text-green-100 text-lg" variants={itemVariants}>
                        Cảm ơn quý khách!
                    </motion.p>
                </div>

                {/* Content */}
                <motion.div className="p-6 md:p-8 space-y-6" variants={itemVariants}>
                    <div className="bg-green-50 rounded-lg border-l-4 border-green-500 p-4">
                        <p className="text-green-800 font-semibold text-lg">
                            Thanh toán thành công. Cảm ơn quý khách!
                        </p>
                        {orderData?.tableNumber && (
                            <p className="text-green-700 text-sm mt-1">
                                Bàn: <strong>{orderData.tableNumber}</strong>
                                {orderData.total && (
                                    <> &nbsp;|&nbsp; Tổng: <strong>{orderData.total.toLocaleString('vi-VN')}đ</strong></>
                                )}
                            </p>
                        )}
                    </div>

                    {/* Order details */}
                    {orderData?.items && orderData.items.length > 0 && (
                        <div className="border border-gray-200 rounded-xl overflow-hidden">
                            <div className="bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-600">
                                Chi tiết đơn hàng
                            </div>
                            <div className="divide-y divide-gray-100">
                                {orderData.items.map((item, idx) => (
                                    <div key={idx} className="flex justify-between px-4 py-2 text-sm">
                                        <span className="text-gray-700">{item.name} x{item.quantity}</span>
                                        <span className="font-medium">
                                            {(item.price * item.quantity).toLocaleString('vi-VN')}đ
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {sessionId && (
                        <div className="bg-gray-50 rounded-lg p-4">
                            <p className="text-sm text-gray-500">Mã giao dịch:</p>
                            <p className="text-xs text-gray-400 font-mono mt-1 break-all">{sessionId}</p>
                        </div>
                    )}

                    <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
                        <p className="text-sm text-yellow-800">
                            <strong>Lưu ý:</strong> Phiên đăng nhập của bạn đã hết hạn sau khi thanh toán.
                            Vui lòng quét lại mã QR tại bàn nếu muốn tiếp tục đặt món.
                        </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <motion.button
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.98 }}
                            className="flex items-center justify-center gap-2 p-4 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-semibold"
                            onClick={() => navigate('/table-login')}
                        >
                            <FiArrowLeft className="text-xl" />
                            <span>Quét QR để đặt món tiếp</span>
                        </motion.button>

                        <motion.button
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.98 }}
                            className="flex items-center justify-center gap-2 p-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
                            onClick={() => navigate('/')}
                        >
                            <span>Về trang chủ</span>
                        </motion.button>
                    </div>
                </motion.div>
            </motion.div>
        </div>
    );
};

export default TablePaymentSuccessPage;
