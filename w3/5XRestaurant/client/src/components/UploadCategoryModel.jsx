import React, { useState } from 'react';
import { IoAddSharp, IoClose } from 'react-icons/io5';
import Axios from '@/utils/Axios.js';
import SummaryApi from '@/common/SummaryApi.js';
import AxiosToastError from '@/utils/AxiosToastError.js';
import successAlert from '@/utils/successAlert.js';
import uploadImage from '@/utils/UploadImage.js';
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
import Loading from './Loading';

const UploadCategoryModel = ({ close, fetchData }) => {
    const [data, setData] = useState({
        name: '',
        image: '',
        description: '',
    });

    const [loading, setLoading] = useState(false);

    const handleOnChange = (e) => {
        const { name, value } = e.target;

        setData((prev) => {
            return {
                ...prev,
                [name]: value,
            };
        });
    };

    const handleUploadCategoryImage = async (e) => {
        const file = e.target.files[0];

        if (!file) {
            return;
        }

        const MAX_FILE_SIZE = 10 * 1024 * 1024;
        if (file.size > MAX_FILE_SIZE) {
            AxiosToastError({
                response: {
                    data: {
                        message:
                            'Kích thước file quá lớn. Vui lòng chọn file nhỏ hơn 10MB.',
                    },
                },
            });
            e.target.value = ''; // Reset input file
            return;
        }

        setLoading(true);
        try {
            const response = await uploadImage(file);
            const { data: ImageResponse } = response;

            setData((prev) => ({
                ...prev,
                image: ImageResponse?.data?.data?.url || '',
            }));
        } catch (error) {
            AxiosToastError(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            setLoading(true);
            const response = await Axios({
                ...SummaryApi.add_category,
                data: data,
            });

            const { data: responseData } = response;

            if (responseData.success) {
                successAlert(responseData.message);
                close();
                fetchData();
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
        flex items-center justify-center px-2"
        >
            <Card className="w-full max-w-lg overflow-hidden border-foreground">
                {/* Header */}
                <CardHeader className="pt-4">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg text-highlight font-bold uppercase">
                            Thêm danh mục
                        </CardTitle>
                        <Button
                            onClick={close}
                            className="bg-transparent hover:bg-transparent text-foreground
                        hover:text-highlight h-12"
                        >
                            <IoClose />
                        </Button>
                    </div>
                </CardHeader>

                <form onSubmit={handleSubmit}>
                    <CardContent className="py-4 space-y-5 text-sm">
                        {/* Category Name */}
                        <div className="space-y-2">
                            <Label htmlFor="name">
                                Tên danh mục{' '}
                                <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                type="text"
                                id="name"
                                name="name"
                                autoFocus
                                value={data.name}
                                onChange={handleOnChange}
                                className="text-sm h-12"
                                placeholder="Nhập tên danh mục"
                                required
                            />
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                            <Label htmlFor="description">Mô tả</Label>
                            <Input
                                type="text"
                                id="description"
                                name="description"
                                value={data.description}
                                onChange={handleOnChange}
                                className="text-sm h-12"
                                placeholder="Nhập mô tả"
                            />
                        </div>

                        {/* Image Upload */}
                        <div className="space-y-2">
                            <Label htmlFor="image">
                                Hình ảnh <span className="text-red-500">*</span>
                            </Label>
                            <Label
                                htmlFor="image"
                                className={`block border-2 border-dashed rounded-xl p-6 text-center cursor-pointer
                            transition-all duration-200 group ${
                                data.image
                                    ? 'border-green-300 bg-green-50'
                                    : 'border-gray-300 hover:border-red-500'
                            }`}
                            >
                                {data.image ? (
                                    <div className="relative">
                                        <img
                                            src={data.image}
                                            alt="Preview"
                                            className="sm:h-40 h-32 mx-auto object-contain rounded-lg"
                                        />
                                        <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-10 rounded-lg transition-all flex items-center justify-center">
                                            <span className="text-white bg-black/70 text-xs px-2 py-1 rounded">
                                                Thay đổi ảnh
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <div
                                            className="mx-auto w-12 h-12 bg-gray-100 text-gray-400 group-hover:text-red-400 group-hover:bg-red-50 rounded-full
                                        flex items-center justify-center"
                                        >
                                            <IoAddSharp size={24} />
                                        </div>
                                        <div className="sm:text-sm text-xs text-red-500">
                                            <p className="font-medium">
                                                Tải ảnh lên
                                            </p>
                                            <p className="sm:text-xs text-[10px] text-red-300">
                                                PNG, JPG, JPEG (tối đa 10MB)
                                            </p>
                                        </div>
                                    </div>
                                )}
                                <input
                                    type="file"
                                    id="image"
                                    className="hidden"
                                    onChange={handleUploadCategoryImage}
                                    accept="image/*"
                                />
                            </Label>
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
                                    onClick={close}
                                    className="bg-baseColor"
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
                                <Button type="submit" className="bg-foreground">
                                    {loading ? <Loading /> : 'Thêm Mới'}
                                </Button>
                            </GlareHover>
                        </CardFooter>
                    </CardContent>
                </form>
            </Card>
        </section>
    );
};

export default UploadCategoryModel;
