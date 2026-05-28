import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Axios from './../utils/Axios';
import SummaryApi from '../common/SummaryApi';
import AxiosToastError from './../utils/AxiosToastError';
import { updatedAvatar } from '../store/userSlice';
import { IoClose } from 'react-icons/io5';
import Loading from './Loading';
import defaultAvatar from '../assets/defaultAvatar.png';

const UserProfileAvatarEdit = ({ close }) => {
    const user = useSelector((state) => state.user);
    const dispatch = useDispatch();
    const [loading, setLoading] = useState(false);

    const handleUploadAvatarImage = async (e) => {
        const file = e.target.files[0];

        if (!file) {
            return;
        }

        const formData = new FormData();
        formData.append('avatar', file);

        try {
            setLoading(true);
            const response = await Axios({
                ...SummaryApi.upload_avatar,
                data: formData,
            });

            const { data: responseData } = response;
            dispatch(updatedAvatar(responseData.data.avatar));
        } catch (error) {
            AxiosToastError(error);
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
                className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden transition-all duration-300 transform"
            >
                {/* Header */}
                <div className="border-b border-gray-200 px-6 py-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-base sm:text-lg font-bold text-secondary-200">
                            Cập nhật ảnh đại diện
                        </h3>
                        <button
                            onClick={close}
                            className="text-gray-400 hover:text-secondary-200 transition-colors"
                        >
                            <IoClose size={20} />
                        </button>
                    </div>
                </div>

                {/* Avatar Preview */}
                <div className="p-6 flex flex-col items-center gap-4">
                    <div className="relative">
                        <div
                            className="sm:w-32 sm:h-32 w-28 h-28 rounded-full overflow-hidden border-4 border-inset border-primary-200
                        shadow-lg"
                        >
                            <img
                                src={user.avatar || defaultAvatar}
                                alt={user.name}
                                className="w-full h-full object-cover"
                            />
                        </div>
                        {loading && (
                            <div className="absolute inset-0 bg-black/30 rounded-full flex items-center justify-center">
                                <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        )}
                    </div>

                    <p className="text-sm sm:text-lg text-rose-500 font-medium text-center">
                        Tải lên ảnh đại diện mới của bạn
                    </p>

                    <label
                        htmlFor="uploadProfile"
                        className="inline-flex items-center px-4 sm:py-2 py-[6px] bg-primary text-secondary-200 font-medium rounded-lg
                    hover:opacity-80 transition-colors cursor-pointer shadow-md shadow-secondary-100 gap-2 mt-2 sm:text-base text-sm"
                    >
                        <svg
                            className="sm:w-5 sm:h-5 w-4 h-4 mb-[4px]"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                        </svg>
                        {loading ? 'Đang tải lên...' : 'Chọn ảnh'}
                        <input
                            onChange={handleUploadAvatarImage}
                            type="file"
                            accept="image/*"
                            id="uploadProfile"
                            className="hidden"
                            disabled={loading}
                        />
                    </label>

                    <p className="sm:text-xs text-[10px] text-rose-400 text-center italic">
                        Định dạng: JPG, PNG (tối đa 5MB)
                    </p>
                </div>

                {/* Footer */}
                <div className="bg-white px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                    <button
                        type="button"
                        onClick={close}
                        className="px-6 py-[6px] text-sm font-medium text-primary-200 hover:bg-gray-100 rounded-lg
                    transition-colors border-2 border-inset border-primary-200 hover:border-secondary-200
                    hover:text-secondary-200"
                        disabled={loading}
                    >
                        Hủy
                    </button>
                </div>
            </div>
        </section>
    );
};

export default UserProfileAvatarEdit;
