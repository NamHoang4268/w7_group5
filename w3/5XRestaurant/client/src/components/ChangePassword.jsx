import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Axios from '../utils/Axios';
import SummaryApi from '../common/SummaryApi';
import AxiosToastError from '../utils/AxiosToastError';
import toast from 'react-hot-toast';
import { FaLock, FaEye, FaEyeSlash } from 'react-icons/fa';

const ChangePassword = ({ close }) => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        currentPassword: '',
    });
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [failedAttempts, setFailedAttempts] = useState(0);
    const [showForgotPassword, setShowForgotPassword] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.currentPassword) {
            toast.error('Vui lòng nhập mật khẩu hiện tại');
            return;
        }

        try {
            setLoading(true);
            // First verify the current password
            const response = await Axios({
                ...SummaryApi.verify_password,
                data: {
                    password: formData.currentPassword,
                },
            });

            if (response.data.success) {
                // Show success toast
                toast.success(
                    response.data.message || 'Xác thực mật khẩu thành công'
                );
                
                // If password is correct, navigate to reset password page
                close();
                navigate('/reset-password', {
                    state: {
                        email: response.data.email,
                        userId: response.data.userId, // Add user ID for change password flow
                        currentPassword: formData.currentPassword, // Pass current password for validation
                        fromProfile: true,
                        fromForgotPassword: false,
                    },
                    replace: true,
                });
            }
        } catch (error) {
            const newFailedAttempts = failedAttempts + 1;
            setFailedAttempts(newFailedAttempts);

            if (newFailedAttempts >= 3) {
                setShowForgotPassword(true);
                toast.error(
                    'Bạn đã nhập sai mật khẩu quá 3 lần. Vui lòng thử lại sau hoặc sử dụng chức năng quên mật khẩu.'
                );
            } else {
                AxiosToastError(error);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <section
            onClick={close}
            className="fixed top-0 bottom-0 left-0 right-0
        bg-neutral-800 z-50 bg-opacity-60 p-4 flex items-center justify-center"
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-lg shadow-xl w-full max-w-lg"
            >
                <div className="p-4 sm:p-6 grid gap-4">
                    <div className="flex justify-between items-center">
                        <h2 className="sm:text-xl text-base text-secondary-200 flex items-center">
                            <FaLock
                                className="mr-2 mb-[4px] "
                                size={18}
                            />
                            <p className="font-bold">
                                Xác minh danh tính của bạn
                            </p>
                        </h2>
                        <button
                            onClick={close}
                            className="text-gray-400 hover:text-secondary-200"
                        >
                            <span className="text-2xl">&times;</span>
                        </button>
                    </div>

                    <p className="text-gray-600 sm:text-base text-sm">
                        Vì lý do bảo mật, vui lòng nhập mật khẩu hiện tại của
                        bạn để tiếp tục.
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-secondary-200 mb-2">
                                Mật khẩu hiện tại
                            </label>
                            <div className="relative">
                                <input
                                    type={
                                        showCurrentPassword
                                            ? 'text'
                                            : 'password'
                                    }
                                    name="currentPassword"
                                    value={formData.currentPassword}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary-100
                                    focus:border-secondary-200 pr-10 sm:text-sm text-xs text-red-700"
                                    placeholder="Nhập mật khẩu hiện tại"
                                    required
                                    autoFocus
                                />
                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowCurrentPassword(
                                            !showCurrentPassword
                                        )
                                    }
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-secondary-200 hover:text-secondary-100"
                                >
                                    {showCurrentPassword ? (
                                        <FaEye />
                                    ) : (
                                        <FaEyeSlash />
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className="flex sm:text-base text-sm justify-end gap-4">
                            <button
                                type="button"
                                onClick={close}
                                className="px-6 py-[6px] border-2 border-secondary-100 rounded-lg text-secondary-200 hover:bg-secondary-100
                                focus:outline-none focus:ring-2 focus:ring-offset-2 hover:text-white font-semibold focus:ring-secondary-200"
                                disabled={loading}
                            >
                                Hủy
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-[6px] bg-primary text-secondary-200 shadow-lg rounded-lg hover:opacity-80
                            focus:outline-none flex items-center disabled:opacity-50 font-semibold"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <svg
                                            className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                                            xmlns="http://www.w3.org/2000/svg"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                        >
                                            <circle
                                                className="opacity-25"
                                                cx="12"
                                                cy="12"
                                                r="10"
                                                stroke="currentColor"
                                                strokeWidth="4"
                                            ></circle>
                                            <path
                                                className="opacity-75"
                                                fill="currentColor"
                                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                            ></path>
                                        </svg>
                                        Xác minh...
                                    </>
                                ) : (
                                    'Tiếp tục'
                                )}
                            </button>
                        </div>

                        {showForgotPassword && (
                            <div className="grid gap-1 place-items-center py-2">
                                <p className="text-sm text-gray-600 font-semibold">
                                    Bạn quên mật khẩu?
                                </p>
                                <button
                                    type="button"
                                    onClick={() => {
                                        close();
                                        navigate('/forgot-password');
                                    }}
                                    className="text-blue-600 hover:text-blue-800 text-sm font-bold"
                                >
                                    Đặt lại mật khẩu
                                </button>
                            </div>
                        )}
                    </form>
                </div>
            </div>
        </section>
    );
};

export default ChangePassword;
