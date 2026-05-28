import React, { useState } from 'react';
import SummaryApi from '../common/SummaryApi';
import Axios from '../utils/Axios';
import successAlert from '../utils/successAlert';
import AxiosToastError from '../utils/AxiosToastError';
import Loading from './Loading';
import { IoAdd, IoPencil, IoTrash, IoCalendar, IoClose } from 'react-icons/io5';
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from './ui/card';
import { Button } from './ui/button';
import { Label } from '@radix-ui/react-label';
import { Input } from './ui/input';
import Divider from './Divider';
import GlareHover from './GlareHover';
import { Textarea } from './ui/textarea';

const AddVoucher = ({ onClose, fetchVoucher }) => {
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        description: '',
        discountType: 'percentage',
        discountValue: 0,
        minOrderValue: 0,
        maxDiscount: null,
        startDate: '',
        endDate: '',
        usageLimit: null,
        isActive: true,
        // REMOVED: isFreeShipping: false,
        applyForAllProducts: true,
        products: [],
        categories: [],
        isFirstTimeCustomer: false,
    });

    const [loading, setLoading] = useState(false);

    const handleOnChange = (e) => {
        const { name, value, type, checked } = e.target;

        setFormData((prev) => {
            return {
                ...prev,
                [name]: type === 'checkbox' ? checked : value,
            };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Common required fields validation
        if (
            !formData.code ||
            !formData.name ||
            !formData.startDate ||
            !formData.endDate
        ) {
            AxiosToastError({
                response: {
                    data: {
                        message: 'Vui lòng điền đầy đủ các trường bắt buộc',
                    },
                },
            });
            return;
        }

        // Validate based on discount type
        if (formData.discountType === 'percentage') {
            if (
                !formData.discountValue ||
                formData.discountValue <= 0 ||
                formData.discountValue > 100
            ) {
                AxiosToastError({
                    response: {
                        data: {
                            message: 'Phần trăm giảm giá phải từ 0.01 đến 100%',
                        },
                    },
                });
                return;
            }
            if (!formData.maxDiscount || formData.maxDiscount <= 0) {
                AxiosToastError({
                    response: {
                        data: {
                            message: 'Vui lòng nhập số tiền giảm giá tối đa',
                        },
                    },
                });
                return;
            }
        } else if (formData.discountType === 'fixed') {
            // fixed amount
            if (!formData.discountValue || formData.discountValue <= 0) {
                AxiosToastError({
                    response: {
                        data: { message: 'Số tiền giảm giá phải lớn hơn 0' },
                    },
                });
                return;
            }
        }

        // Prepare data for submission
        const submissionData = {
            ...formData,
            // Convert string numbers to proper numbers
            discountValue: Number(formData.discountValue),
            minOrderValue: Number(formData.minOrderValue) || 0,
            // Only include maxDiscount for percentage type
            maxDiscount:
                formData.discountType === 'percentage'
                    ? Number(formData.maxDiscount) || null
                    : null,
            // Convert usageLimit to number or null
            usageLimit: formData.usageLimit
                ? Number(formData.usageLimit)
                : null,
        };

        try {
            setLoading(true);
            const response = await Axios({
                ...SummaryApi.add_voucher,
                data: submissionData,
            });

            const { data: responseData } = response;

            if (responseData.success) {
                successAlert(responseData.message);
                onClose();
                fetchVoucher();
            }
        } catch (error) {
            AxiosToastError(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <section
            className="bg-neutral-800 z-50 bg-opacity-60 fixed top-0 left-0 right-0 bottom-0 overflow-auto
        flex items-center justify-center px-4"
        >
            <Card className="rounded-lg w-full max-w-2xl max-h-[90vh] scrollbarCustom scrollbar-hide overflow-y-auto">
                <div className="">
                    <CardHeader className="pt-4">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg text-highlight font-bold uppercase">
                                Thêm mã giảm giá
                            </CardTitle>
                            <Button
                                onClick={() => onClose()}
                                className="bg-transparent hover:bg-transparent text-foreground
                                            hover:text-highlight h-12"
                            >
                                <IoClose />
                            </Button>
                        </div>
                    </CardHeader>
                    <form onSubmit={handleSubmit}>
                        <CardContent className="py-4 space-y-5 text-sm">
                            <div className="space-y-2">
                                <Label>
                                    Mã voucher{' '}
                                    <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    type="text"
                                    name="code"
                                    value={formData.code}
                                    onChange={handleOnChange}
                                    className="text-sm h-12"
                                    required
                                    spellCheck={false}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>
                                    Tên voucher{' '}
                                    <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleOnChange}
                                    className="text-sm h-12"
                                    required
                                    spellCheck={false}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Mô tả</Label>
                                <Textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleOnChange}
                                    rows="2"
                                    className="text-sm"
                                    spellCheck={false}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div className="grid">
                                    <Label>Trạng thái</Label>
                                    <Label className="relative inline-flex items-center gap-2 cursor-pointer">
                                        <Input
                                            type="checkbox"
                                            className="sr-only peer"
                                            name="isActive"
                                            checked={formData.isActive}
                                            onChange={(e) =>
                                                setFormData((prev) => ({
                                                    ...prev,
                                                    isActive: e.target.checked,
                                                }))
                                            }
                                        />
                                        <div
                                            className={`w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[6px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${
                                                formData.isActive
                                                    ? 'bg-green-500'
                                                    : 'bg-red-500'
                                            }`}
                                        ></div>
                                        <span
                                            className={`px-2 inline-flex leading-5 font-semibold rounded-full ${
                                                formData.isActive
                                                    ? 'bg-white/20 text-lime-500 border border-lime-600'
                                                    : 'bg-white/20 text-rose-500 border border-rose-600'
                                            }`}
                                        >
                                            {formData.isActive
                                                ? 'Đang hoạt động'
                                                : 'Đã tắt'}
                                        </span>
                                    </Label>
                                </div>

                                <div className="space-y-2">
                                    <Label>
                                        Loại giảm giá{' '}
                                        <span className="text-red-500">*</span>
                                    </Label>
                                    <select
                                        name="discountType"
                                        value={formData.discountType}
                                        onChange={handleOnChange}
                                        className="text-sm h-9 w-full border bg-transparent
                                    px-3 py-1 rounded-md"
                                        required
                                    >
                                        <option value="percentage">
                                            Phần trăm (%)
                                        </option>
                                        <option value="fixed">
                                            Số tiền cố định (VND)
                                        </option>
                                    </select>
                                </div>

                                {/* CHANGED: Removed condition check for free_shipping */}
                                <div className="space-y-2">
                                    <Label>
                                        {formData.discountType === 'percentage'
                                            ? 'Phần trăm giảm giá'
                                            : 'Số tiền giảm giá'}{' '}
                                        <span className="text-red-500">*</span>
                                    </Label>
                                    <div className="relative">
                                        <Input
                                            type="number"
                                            name="discountValue"
                                            value={formData.discountValue}
                                            onChange={handleOnChange}
                                            min={
                                                formData.discountType ===
                                                'percentage'
                                                    ? '0.01'
                                                    : '1'
                                            }
                                            max={
                                                formData.discountType ===
                                                'percentage'
                                                    ? '100'
                                                    : ''
                                            }
                                            step={
                                                formData.discountType ===
                                                'percentage'
                                                    ? '0.01'
                                                    : '1'
                                            }
                                            className="no-spinner w-full pl-3 pr-8 text-sm h-10"
                                            required
                                            placeholder={
                                                formData.discountType ===
                                                'percentage'
                                                    ? '0-100%'
                                                    : 'Enter amount'
                                            }
                                        />
                                        <span className="absolute right-3 top-2">
                                            {formData.discountType ===
                                            'percentage'
                                                ? '%'
                                                : '₫'}
                                        </span>
                                    </div>
                                    {formData.discountType === 'percentage' && (
                                        <p className="mt-1 text-xs">
                                            Nhập giá trị từ 0,01% đến 100%
                                        </p>
                                    )}
                                    {formData.discountType === 'fixed' && (
                                        <p className="mt-1 text-xs">
                                            Nhập giá trị lớn hơn 0
                                        </p>
                                    )}
                                </div>

                                {formData.discountType === 'percentage' && (
                                    <div className="space-y-2">
                                        <Label>Giảm giá tối đa (VND)</Label>
                                        <div className="relative">
                                            <Input
                                                type="number"
                                                name="maxDiscount"
                                                value={
                                                    formData.maxDiscount || ''
                                                }
                                                onChange={handleOnChange}
                                                placeholder="VND "
                                                min="0"
                                                step="1"
                                                className="no-spinner w-full pl-3 pr-8 text-sm h-10"
                                            />
                                            <span className="absolute right-3 top-2">
                                                ₫
                                            </span>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <Label>Giá trị đơn hàng tối thiểu</Label>
                                    <div className="relative">
                                        <Input
                                            type="number"
                                            name="minOrderValue"
                                            value={formData.minOrderValue}
                                            onChange={handleOnChange}
                                            min="0"
                                            step="0.01"
                                            placeholder="VND"
                                            className="no-spinner w-full pl-3 pr-8 text-sm h-10"
                                        />
                                        <span className="absolute right-3 top-2">
                                            ₫
                                        </span>
                                    </div>
                                    <p className="mt-1 text-xs">
                                        Giá trị đơn hàng tối thiểu để áp dụng mã
                                        giảm giá (0 cho không có giá trị tối
                                        thiểu)
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label>Số lượng sử dụng</Label>
                                    <Input
                                        type="number"
                                        name="usageLimit"
                                        value={formData.usageLimit || ''}
                                        onChange={handleOnChange}
                                        min="1"
                                        step="1"
                                        placeholder="Không giới hạn nếu để trống"
                                        className="no-spinner w-full pl-3 pr-8 text-sm h-10"
                                    />
                                    <p className="mt-1 text-xs">
                                        Số lần mã giảm giá có thể được sử dụng
                                        (0 cho không giới hạn)
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label>
                                        Ngày bắt đầu{' '}
                                        <span className="text-red-500">*</span>
                                    </Label>
                                    <div className="relative">
                                        <input
                                            type="datetime-local"
                                            name="startDate"
                                            value={formData.startDate}
                                            onChange={handleOnChange}
                                            className="text-sm h-10 w-full border bg-transparent
                                    px-3 py-1 rounded-md pr-16 appearance-none"
                                            required
                                        />
                                        <div className="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none">
                                            <svg
                                                className="w-5 h-5 text-gray-400"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                                xmlns="http://www.w3.org/2000/svg"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                                />
                                            </svg>
                                        </div>
                                        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                                            <svg
                                                className="w-5 h-5 text-gray-400"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                                xmlns="http://www.w3.org/2000/svg"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                                />
                                            </svg>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>
                                        Ngày kết thúc{' '}
                                        <span className="text-red-500">*</span>
                                    </Label>
                                    <div className="relative">
                                        <input
                                            type="datetime-local"
                                            name="endDate"
                                            value={formData.endDate}
                                            onChange={handleOnChange}
                                            min={formData.startDate}
                                            className="text-sm h-10 w-full border bg-transparent
                                        px-3 py-1 rounded-md pr-8 appearance-none"
                                            required
                                        />
                                        <div className="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none">
                                            <svg
                                                className="w-5 h-5 text-gray-400"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                                xmlns="http://www.w3.org/2000/svg"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                                />
                                            </svg>
                                        </div>
                                        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                                            <svg
                                                className="w-5 h-5 text-gray-400"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                                xmlns="http://www.w3.org/2000/svg"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                                />
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="applyForAllProducts"
                                    name="applyForAllProducts"
                                    checked={formData.applyForAllProducts}
                                    onChange={handleOnChange}
                                    className="h-4 w-4 focus:ring-secondary-200 text-secondary-200
                                    font-semibold border-gray-300 rounded mb-[3px]"
                                />
                                <label
                                    htmlFor="applyForAllProducts"
                                    className="ml-2 block text-sm"
                                >
                                    Áp dụng cho tất cả sản phẩm
                                </label>
                            </div>
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="isFirstTimeCustomer"
                                    name="isFirstTimeCustomer"
                                    checked={formData.isFirstTimeCustomer}
                                    onChange={handleOnChange}
                                    className="h-4 w-4 focus:ring-secondary-200 text-secondary-200
                                    font-semibold border-gray-300 rounded mb-[3px]"
                                />
                                <label
                                    htmlFor="isFirstTimeCustomer"
                                    className="ml-2 block text-sm"
                                >
                                    Chỉ dành cho khách hàng mới
                                </label>
                            </div>

                            <Divider />
                            {/* Actions */}
                            <CardFooter className="px-0 text-sm flex items-center justify-end gap-3">
                                <GlareHover
                                    background="transparent"
                                    glareOpacity={0.3}
                                    glareAngle={-30}
                                    glareSize={300}
                                    transitionDuration={800}
                                    playOnce={false}
                                >
                                    <Button
                                        type="button"
                                        onClick={() => onClose()}
                                        className="bg-foreground"
                                    >
                                        Hủy
                                    </Button>
                                </GlareHover>
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
                                        className="bg-foreground"
                                    >
                                        {loading ? <Loading /> : 'Thêm Mới'}
                                    </Button>
                                </GlareHover>
                            </CardFooter>
                        </CardContent>
                    </form>
                </div>
            </Card>
        </section>
    );
};

export default AddVoucher;
