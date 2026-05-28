import React, { useState } from 'react';
import { IoClose } from 'react-icons/io5';
import Axios from '@/utils/Axios.js';
import SummaryApi from '@/common/SummaryApi.js';
import AxiosToastError from '@/utils/AxiosToastError.js';
import successAlert from '@/utils/successAlert.js';
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
import { Textarea } from './ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from './ui/select';
import Divider from './Divider';
import GlareHover from './GlareHover';
import Loading from './Loading';

const EditTableModel = ({ close, fetchData, data: propsData }) => {
    const [data, setData] = useState({
        _id: propsData._id,
        tableNumber: propsData.tableNumber || '',
        capacity: propsData.capacity || '',
        status: propsData.status || 'available',
        location: propsData.location || '',
        description: propsData.description || '',
    });

    const [loading, setLoading] = useState(false);

    const handleOnChange = (e) => {
        const { name, value } = e.target;

        setData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            setLoading(true);
            const response = await Axios({
                ...SummaryApi.update_table,
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
                            Chỉnh sửa bàn
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
                        {/* Table Number */}
                        <div className="space-y-2">
                            <Label htmlFor="tableNumber">
                                Số bàn <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                type="text"
                                id="tableNumber"
                                name="tableNumber"
                                autoFocus
                                value={data.tableNumber}
                                onChange={handleOnChange}
                                className="text-sm h-12"
                                placeholder="Ví dụ: T01, VIP-01"
                                required
                            />
                        </div>

                        {/* Capacity */}
                        <div className="space-y-2">
                            <Label htmlFor="capacity">
                                Sức chứa (số người){' '}
                                <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                type="number"
                                id="capacity"
                                name="capacity"
                                min="1"
                                max="20"
                                value={data.capacity}
                                onChange={handleOnChange}
                                className="text-sm h-12 no-spinner"
                                placeholder="Nhập số người (1-20)"
                                required
                            />
                        </div>

                        {/* Location */}
                        <div className="space-y-2">
                            <Label htmlFor="location">Vị trí</Label>
                            <Select
                                value={data.location}
                                onValueChange={(value) =>
                                    setData((prev) => ({
                                        ...prev,
                                        location: value,
                                    }))
                                }
                            >
                                <SelectTrigger className="w-full h-12">
                                    <SelectValue placeholder="Chọn vị trí" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Tầng 1">
                                        Tầng 1
                                    </SelectItem>
                                    <SelectItem value="Tầng 2">
                                        Tầng 2
                                    </SelectItem>
                                    <SelectItem value="Tầng 3">
                                        Tầng 3
                                    </SelectItem>
                                    <SelectItem value="Ngoài trời">
                                        Ngoài trời
                                    </SelectItem>
                                    <SelectItem value="Khu VIP">
                                        Khu VIP
                                    </SelectItem>
                                    <SelectItem value="Khu gia đình">
                                        Khu gia đình
                                    </SelectItem>
                                    <SelectItem value="Gần cửa sổ">
                                        Gần cửa sổ
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Status */}
                        <div className="space-y-2">
                            <Label htmlFor="status">
                                Trạng thái{' '}
                                <span className="text-red-500">*</span>
                            </Label>
                            <Select
                                value={data.status}
                                onValueChange={(value) =>
                                    setData((prev) => ({
                                        ...prev,
                                        status: value,
                                    }))
                                }
                            >
                                <SelectTrigger className="w-full h-12">
                                    <SelectValue placeholder="Chọn trạng thái" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="available">
                                        Trống
                                    </SelectItem>
                                    <SelectItem value="occupied">
                                        Đang sử dụng
                                    </SelectItem>
                                    <SelectItem value="reserved">
                                        Đã đặt
                                    </SelectItem>
                                    <SelectItem value="maintenance">
                                        Bảo trì
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                            <Label htmlFor="description">Ghi chú</Label>
                            <Textarea
                                id="description"
                                name="description"
                                value={data.description}
                                onChange={handleOnChange}
                                rows={3}
                                className="text-sm"
                                placeholder="Nhập ghi chú (nếu có)"
                            />
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
                                    {loading ? <Loading /> : 'Cập Nhật'}
                                </Button>
                            </GlareHover>
                        </CardFooter>
                    </CardContent>
                </form>
            </Card>
        </section>
    );
};

export default EditTableModel;
