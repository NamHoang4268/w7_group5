import { useEffect, useState, FC } from 'react';
import {
    Link,
    useLocation,
    useNavigate,
    useSearchParams,
} from 'react-router-dom';
import GlareHover from '../GlareHover';
import { FaCheckCircle, FaTimesCircle, FaSpinner } from 'react-icons/fa';
import Axios from '@/utils/Axios';
import SummaryApi from '@/common/SummaryApi';
import AxiosToastError from '@/utils/AxiosToastError';

interface LocationState {
    email?: string;
}

const VerifyEmailForm: FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [isSuccess, setIsSuccess] = useState(false);
    const [message, setMessage] = useState('Đang xác nhận email của bạn...');

    useEffect(() => {
        const verifyEmail = async () => {
            const code = searchParams.get('code');

            if (!code) {
                setMessage('Thiếu mã xác nhận');
                setIsLoading(false);
                setIsSuccess(false);
                return;
            }

            try {
                const response = await Axios({
                    ...SummaryApi.verifyEmail,
                    data: { code },
                });

                if (response.data.success) {
                    setMessage(
                        'Xác nhận email thành công! Bạn sẽ được chuyển đến trang đăng nhập trong giây lát...'
                    );
                    setIsSuccess(true);

                    // Redirect to login after 3 seconds
                    setTimeout(() => {
                        navigate('/login', { replace: true });
                    }, 3000);
                } else {
                    setMessage(
                        response.data.message ||
                            'Có lỗi xảy ra khi xác nhận email'
                    );
                    setIsSuccess(false);
                }
            } catch (error) {
                const errorMessage =
                    error.response?.data?.message ||
                    'Đã xảy ra lỗi khi xác nhận email';
                setMessage(errorMessage);
                setIsSuccess(false);
                AxiosToastError(error);
            } finally {
                setIsLoading(false);
            }
        };

        verifyEmail();
    }, [searchParams, navigate]);

    return (
        <div className="flex items-center justify-center text-sm text-foreground font-bold">
            <div className="liquid-glass rounded-lg max-w-xl w-full space-y-8 sm:p-8 py-8 px-6 text-center">
                {isLoading ? (
                    <>
                        <div className="flex justify-center">
                            <FaSpinner className="h-16 w-16 text-blue-500 animate-spin" />
                        </div>
                        <p className="mt-4 text-lg text-gray-700">{message}</p>
                    </>
                ) : isSuccess ? (
                    <>
                        <div className="flex justify-center">
                            <div className="bg-orange-50 rounded-full p-3">
                                <FaCheckCircle className="h-12 w-12 text-orange-700" />
                            </div>
                        </div>
                        <h2 className="mt-6 pb-2 text-xl uppercase font-extrabold text-orange-700">
                            Xác nhận thành công!
                        </h2>
                        <p className="mt-4 font-bold text-orange-700 sm:text-base text-sm">
                            {message}
                        </p>
                    </>
                ) : (
                    <>
                        <div className="flex justify-center">
                            <div className="bg-red-100 rounded-full p-3">
                                <FaTimesCircle className="h-12 w-12 text-red-600" />
                            </div>
                        </div>
                        <h2 className="mt-6 sm:text-2xl text-lg font-extrabold text-red-700">
                            Xác nhận không thành công
                        </h2>
                        <p className="mt-4 font-bold text-rose-500 sm:text-base text-sm">
                            Có sự cố xảy ra khi xác nhận email của bạn. Vui lòng
                            thử lại sau.
                        </p>
                        <div className="mt-6">
                            <button
                                onClick={() => navigate('/register')}
                                className="w-full flex justify-center py-2 px-4 border-2 border-secondary-200 rounded-md shadow-sm sm:text-sm text-xs
                                    font-medium text-secondary-200 bg-white hover:bg-secondary-200 focus:outline-none focus:ring-2 focus:ring-offset-2
                                    focus:ring-indigo-500"
                            >
                                Quay lại trang đăng ký
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default VerifyEmailForm;
