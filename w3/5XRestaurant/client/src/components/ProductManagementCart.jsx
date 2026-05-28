import React, { useState } from 'react';
import EditProductAdmin from './EditProductModel';
import ConfirmBox from './ConfirmBox';
import SummaryApi from '../common/SummaryApi';
import Axios from '../utils/Axios';
import AxiosToastError from '../utils/AxiosToastError';
import successAlert from '../utils/successAlert';
import { DisplayPriceInVND } from '../utils/DisplayPriceInVND';
import ViewImage from './ViewImage';
import { Card, CardContent } from './ui/card';
import GlareHover from './GlareHover';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

const ProductManagementCart = ({ data, fetchProduct }) => {
    const [openEdit, setOpenEdit] = useState(false);
    const [openConfirmBoxDelete, setOpenConfirmBoxDelete] = useState(false);
    const [imageURL, setImageURL] = useState('');

    const handleDeleteProduct = async () => {
        try {
            const response = await Axios({
                ...SummaryApi.delete_product,
                data: {
                    _id: data._id,
                },
            });

            const { data: responseData } = response;

            if (responseData.success) {
                successAlert(responseData.message);
                if (fetchProduct) {
                    fetchProduct();
                }
                setOpenConfirmBoxDelete(false);
            }
        } catch (error) {
            AxiosToastError(error);
        }
    };

    return (
        <div
            className="group rounded-xl shadow-md shadow-secondary-100
        hover:shadow-lg transition-all duration-300 overflow-hidden cursor-pointer"
            key={data._id}
        >
            <div className="p-2 liquid-glass rounded-3xl">
                <Card className="liquid-glass hover:bg-gradient-to-r from-lime-300/20 to-lime-300/10 rounded-2xl transition-all duration-300 overflow-hidden group relative">
                    <div className="relative overflow-hidden cursor-pointer">
                        <img
                            src={data?.image[0]}
                            alt={data?.name}
                            className="w-full h-32 sm:h-44 object-cover bg-white/80 rounded-t-2xl transition-transform duration-500 group-hover:scale-105 border"
                            onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = '/placeholder-product.jpg';
                            }}
                            onClick={() => setImageURL(data?.image[0])}
                        />
                        {!data.stock && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                <span className="bg-rose-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                                    Hết hàng
                                </span>
                            </div>
                        )}
                        {data.discount > 0 && (
                            <Badge className="absolute top-2 right-2 bg-rose-400">
                                -{data.discount}%
                            </Badge>
                        )}
                    </div>

                    <CardContent className="p-3 flex-1 flex flex-col gap-2">
                        <div className="flex-1 space-y-2">
                            <h3
                                title={data?.name}
                                className="text-foreground font-bold sm:text-base text-xs line-clamp-2 h-8 sm:h-12 md:h-11 lg:h-12"
                            >
                                {data?.name}
                            </h3>
                            <div className="flex gap-1">
                                {data.category.map((cate) => (
                                    <Badge
                                        variant="outline"
                                        className="bg-background/50 border-foreground p-0.5 px-2 text-foreground"
                                    >
                                        {cate.name}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                        <div className="flex py-1 gap-3 md:text-base text-sm justify-between items-baseline">
                            <p
                                title={data?.unit}
                                className="font-semibold line-clamp-1 text-foreground"
                            >
                                {data?.unit}
                            </p>
                            <p className="text-foreground font-medium text-base">
                                {DisplayPriceInVND(data?.price)}
                            </p>
                        </div>

                        <div className="flex w-full items-center justify-center gap-2">
                            <GlareHover
                                background="transparent"
                                glareOpacity={0.3}
                                glareAngle={-30}
                                glareSize={300}
                                transitionDuration={800}
                                playOnce={false}
                                className="flex-1"
                            >
                                <Button
                                    onClick={() => {
                                        setOpenEdit(true);
                                    }}
                                    className="bg-muted-foreground hover:bg-muted-foreground w-full"
                                >
                                    Sửa
                                </Button>
                            </GlareHover>
                            <GlareHover
                                background="transparent"
                                glareOpacity={0.3}
                                glareAngle={-30}
                                glareSize={300}
                                transitionDuration={800}
                                playOnce={false}
                                className="flex-1"
                            >
                                <Button
                                    onClick={() => {
                                        setOpenConfirmBoxDelete(true);
                                    }}
                                    className="bg-foreground w-full"
                                >
                                    Xóa
                                </Button>
                            </GlareHover>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {openEdit && (
                <EditProductAdmin
                    close={() => setOpenEdit(false)}
                    fetchProduct={fetchProduct}
                    data={data}
                />
            )}

            {openConfirmBoxDelete && (
                <ConfirmBox
                    close={() => setOpenConfirmBoxDelete(false)}
                    cancel={() => setOpenConfirmBoxDelete(false)}
                    confirm={handleDeleteProduct}
                    title="Xác nhận xóa sản phẩm"
                    content="Bạn có chắc chắn muốn xóa sản phẩm này?"
                    cancelText="Hủy"
                    confirmText="Xóa"
                />
            )}

            {imageURL && (
                <ViewImage url={imageURL} close={() => setImageURL('')} />
            )}
        </div>
    );
};

export default ProductManagementCart;
