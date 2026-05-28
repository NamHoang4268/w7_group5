import React, { useState } from 'react';
import { IoAddSharp, IoClose } from 'react-icons/io5';
import uploadImage from '../utils/UploadImage.js';
import Axios from '../utils/Axios.js';
import SummaryApi from '../common/SummaryApi.js';
import AxiosToastError from '../utils/AxiosToastError.js';
import Loading from './Loading.jsx';
import { useSelector } from 'react-redux';
import successAlert from '../utils/successAlert.js';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from './ui/select';

const EditSubCategoryModel = ({ close, fetchData, data: SubCategoryData }) => {
    const [data, setData] = useState({
        _id: SubCategoryData._id,
        name: SubCategoryData.name,
        image: SubCategoryData.image,
        category:
            SubCategoryData.categoryData &&
            Array.isArray(SubCategoryData.categoryData)
                ? [...SubCategoryData.categoryData]
                : SubCategoryData.category &&
                  Array.isArray(SubCategoryData.category)
                ? [...SubCategoryData.category]
                : [],
    });

    const [loading, setLoading] = useState(false);
    const [selectCategoryValue, setSelectCategoryValue] = useState('');

    const allCategory = useSelector((state) => state.product.allCategory);

    const handleOnChange = (e) => {
        const { name, value } = e.target;

        setData((prev) => {
            return {
                ...prev,
                [name]: value,
            };
        });
    };

    const handleUploadSubCategoryImage = async (e) => {
        const file = e.target.files[0];

        if (!file) {
            return;
        }

        setLoading(true);
        const response = await uploadImage(file);
        const { data: ImageResponse } = response;
        setLoading(false);

        setData((prev) => {
            return {
                ...prev,
                image: ImageResponse.data.url,
            };
        });
    };

    const handleRemoveCategorySelected = (categoryId) => {
        const updated = data.category.filter((el) => el._id !== categoryId);

        setData((prev) => ({
            ...prev,
            category: updated,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            setLoading(true);
            const response = await Axios({
                ...SummaryApi.update_sub_category,
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
            <Card className="max-w-2xl w-full overflow-hidden border-foreground">
                <CardHeader className="pt-4">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg text-highlight font-bold uppercase">
                            Sửa loại sản phẩm
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
                        <div className="space-y-2">
                            <Label id="name" htmlFor="name">
                                Tên (<span className="text-red-500">*</span>)
                            </Label>
                            <Input
                                type="text"
                                className="text-sm h-12"
                                id="name"
                                placeholder="Nhập tên loại sản phẩm"
                                name="name"
                                value={data.name}
                                onChange={handleOnChange}
                                required
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
                                    onChange={handleUploadSubCategoryImage}
                                    accept="image/*"
                                />
                            </Label>
                        </div>

                        <div className="space-y-2">
                            <Label>
                                Danh mục (
                                <span className="text-red-500">*</span>)
                            </Label>

                            {/* Display Value */}
                            <div
                                className={`${
                                    data.category[0] ? 'flex' : 'hidden'
                                } gap-4 flex-wrap`}
                            >
                                {data.category.map((cate) => {
                                    return (
                                        <span
                                            key={cate._id + 'selectedValue'}
                                            className="inline-flex items-center gap-2 bg-rose-600/90 text-white sm:text-sm text-xs px-3 py-1 rounded-full"
                                        >
                                            {cate.name}
                                            <div
                                                onClick={() =>
                                                    handleRemoveCategorySelected(
                                                        cate._id
                                                    )
                                                }
                                                className="cursor-pointer hover:text-red-600"
                                            >
                                                <IoClose size={18} />
                                            </div>
                                        </span>
                                    );
                                })}
                            </div>

                            {/* Select Category */}
                            <Select
                                value={selectCategoryValue}
                                onValueChange={(value) => {
                                    if (!value) return;
                                    const categoryDetails = allCategory.find(
                                        (el) => el._id == value
                                    );

                                    // Kiểm tra trùng lặp
                                    const alreadySelected = data.category.some(
                                        (cate) => cate._id === value
                                    );

                                    if (alreadySelected) {
                                        return;
                                    }

                                    setData((prev) => {
                                        return {
                                            ...prev,
                                            category: [
                                                ...prev.category,
                                                categoryDetails,
                                            ],
                                        };
                                    });

                                    setSelectCategoryValue('');
                                }}
                            >
                                <SelectTrigger
                                    className={`${
                                        data.category[0] ? 'mt-1' : 'mt-0'
                                    } w-full h-12`}
                                >
                                    <SelectValue placeholder="Chọn danh mục" />
                                </SelectTrigger>
                                <SelectContent>
                                    {allCategory.map((category) => {
                                        return (
                                            <SelectItem
                                                value={category?._id}
                                                key={
                                                    category._id + 'subCategory'
                                                }
                                            >
                                                {category?.name}
                                            </SelectItem>
                                        );
                                    })}
                                </SelectContent>
                            </Select>
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
                                    {loading ? <Loading /> : 'Cập nhật'}
                                </Button>
                            </GlareHover>
                        </CardFooter>
                    </CardContent>
                </form>
            </Card>
        </section>
    );
};

export default EditSubCategoryModel;
