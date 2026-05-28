import React, { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Axios from './../utils/Axios';
import SummaryApi from '../common/SummaryApi';
import AxiosToastError from './../utils/AxiosToastError';
import { DisplayPriceInVND } from './../utils/DisplayPriceInVND';
import { pricewithDiscount } from './../utils/PriceWithDiscount';
import { FaAngleRight, FaAngleLeft } from 'react-icons/fa6';
import Divider from './../components/Divider';
import image1 from '../assets/minute_delivery.png';
import image2 from '../assets/Best_Prices_Offers.png';
import image3 from '../assets/Secure_Payment.jpg';
import { valideURLConvert } from '../utils/valideURLConvert';
import CardProduct from '../components/CardProduct';
import toast from 'react-hot-toast';
import ProductCard from '@/components/product/product-card';
import GlareHover from '@/components/GlareHover';
import { Button } from '@/components/ui/button';
import ViewImage from '@/components/ViewImage';
import NoData from '@/components/NoData';

const ProductDisplayPage = () => {
    const params = useParams();
    let productId = params?.product?.split('-')?.slice(-1)[0];
    const [data, setData] = useState({
        name: '',
        image: [],
        description: '',
        unit: '',
        price: 0,
        discount: 0,
        stock: 0,
    });

    const [image, setImage] = useState(0);
    const [loading, setLoading] = useState(false);
    const [tab, setTab] = useState('detail');
    const imageContainer = useRef();
    const [selectedOptions, setSelectedOptions] = useState([]);
    const [notes, setNotes] = useState('');

    const containerRef = useRef();
    const handleRedirectProductListPage = (id, cat) => {
        const url = `/${valideURLConvert(cat)}-${id}`;
        window.location.href = url;
    };

    const handleOptionChange = (optionName, choiceName, priceModifier, type) => {
        if (type === 'radio') {
            setSelectedOptions((prev) => {
                const filtered = prev.filter((item) => item.optionName !== optionName);
                return [...filtered, { optionName, choiceName, priceModifier }];
            });
        }
    };

    const [imageURL, setImageURL] = useState('');

    const fetchProductDetails = async () => {
        try {
            setLoading(true);
            const response = await Axios({
                ...SummaryApi.get_product_details,
                data: {
                    productId: productId,
                },
            });

            const { data: responseData } = response;
            if (responseData.success) {
                setData(responseData.data);
            }
        } catch (error) {
            AxiosToastError(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProductDetails();
    }, [params]);

    const handleScrollLeft = () => {
        imageContainer.current.scrollLeft -= 300;
    };

    const handleScrollRight = () => {
        imageContainer.current.scrollLeft += 300;
    };

    // Thông báo hướng dẫn gọi món
    const handleGuideOrder = () => {
        toast('Vui lòng quét mã QR tại bàn để thêm món vào đơn của bạn 🍽️', { icon: 'ℹ️', duration: 4000 });
    };

    // San pham tuong tu
    const [relatedProducts, setRelatedProducts] = useState([]);
    useEffect(() => {
        const fetchRelatedProducts = async () => {
            try {
                if (!data?.category?.length) return;

                // API lấy sản phẩm tương tự là public, không cần authentication
                const promises = data.category.map((cat) =>
                    Axios({
                        ...SummaryApi.get_product_by_category,
                        data: { id: cat?._id },
                    })
                );

                const responses = await Promise.all(promises);

                let merged = [];
                responses.forEach((res) => {
                    if (res.data.success) {
                        merged = [...merged, ...res.data.data];
                    }
                });

                const filtered = merged.filter((p) => p._id !== data._id);
                const unique = filtered.filter(
                    (value, index, self) =>
                        index === self.findIndex((p) => p._id === value._id)
                );

                setRelatedProducts(unique.slice(0, 8));
            } catch (error) {
                AxiosToastError(error);
            }
        };

        fetchRelatedProducts();
    }, [data]);

    return (
        <section className="container mx-auto px-4 py-8 lg:p-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 sm:gap-10 gap-6 lg:mt-4">
                <div>
                    <div
                        className="liquid-glass rounded-lg shadow-md p-2 flex justify-center items-center
                    h-72 sm:h-[400px]"
                    >
                        <img
                            src={data.image[image]}
                            alt={data.name}
                            className="object-scale-down max-h-full rounded cursor-pointer"
                            onClick={() => setImageURL(data.image[image])}
                        />
                    </div>

                    <div className="flex items-center justify-center gap-3 my-4">
                        {data.image.map((img, index) => (
                            <div
                                key={img + index + 'point'}
                                className={`bg-rose-200 w-3 h-3 rounded-full ${
                                    index === image && 'bg-rose-400'
                                }`}
                            ></div>
                        ))}
                    </div>

                    <div className="container mx-auto">
                        <div className="relative mt-4 flex items-center">
                            <div
                                ref={imageContainer}
                                className="grid grid-flow-col auto-cols-[minmax(70px,70px)] sm:auto-cols-[minmax(85px,85px)]
                                    sm:gap-4 gap-2 overflow-x-auto scroll-smooth scrollbar-hide"
                            >
                                {data.image.map((img, index) => (
                                    <div
                                        key={index}
                                        className={`rounded cursor-pointer flex items-center ${
                                            index === image
                                                ? 'border-rose-500 border-4 border-inset'
                                                : 'border-secondary-100 border-inset'
                                        }`}
                                        onClick={() => setImage(index)}
                                    >
                                        <img
                                            src={img}
                                            className="object-cover sm:h-20 sm:w-20 w-[70px] h-[70px]"
                                        />
                                    </div>
                                ))}
                            </div>

                            {data.image.length > 6 && (
                                <>
                                    <div className="left-0 absolute hidden lg:block cursor-pointer text-foreground hover:opacity-80">
                                        <button
                                            onClick={handleScrollLeft}
                                            className="z-10 bg-rose-600/80 shadow-md shadow-secondary-200 text-lg
                                               p-2 rounded-full "
                                        >
                                            <FaAngleLeft size={16} />
                                        </button>
                                    </div>

                                    <div className="right-0 absolute hidden lg:block cursor-pointer text-foreground hover:opacity-80">
                                        <button
                                            onClick={handleScrollRight}
                                            className="z-10 bg-rose-600/80 shadow-md shadow-secondary-200 text-lg
                                               p-2 rounded-full "
                                        >
                                            <FaAngleRight size={16} />
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* PC / Tablet */}
                    <div className="lg:flex flex-col gap-6 hidden">
                        <section className="container mt-8 glass-border liquid-glass-2 p-4 rounded-lg">
                            <div className="flex items-center gap-6 border-b border-gray-300">
                                <button
                                    onClick={() => setTab('detail')}
                                    className={`pb-2 font-bold text-lg px-2 ${
                                        tab === 'detail'
                                            ? 'border-b-[3px] border-highlight text-highlight'
                                            : 'text-foreground'
                                    }`}
                                >
                                    Chi tiết
                                </button>
                                <button
                                    onClick={() => setTab('description')}
                                    className={`pb-2 font-bold text-lg px-2 ${
                                        tab === 'description'
                                            ? 'border-b-[3px] border-highlight text-highlight'
                                            : 'text-foreground'
                                    }`}
                                >
                                    Mô tả
                                </button>
                                <button
                                    onClick={() => setTab('reviews')}
                                    className={`pb-2 font-bold text-lg px-2 ${
                                        tab === 'reviews'
                                            ? 'border-b-[3px] border-highlight text-highlight'
                                            : 'text-foreground'
                                    }`}
                                >
                                    Đánh giá
                                </button>
                            </div>

                            <div className="mt-6 px-4">
                                {tab === 'detail' && (
                                    <div className="text-foreground leading-relaxed break-words flex flex-col gap-3">
                                        <div className="flex gap-4">
                                            <span className="font-semibold text-nowrap">
                                                Danh mục:{' '}
                                            </span>
                                            <div className="flex flex-wrap gap-2">
                                                {data?.category &&
                                                data.category.length > 0 ? (
                                                    data.category.map(
                                                        (cat, index) => (
                                                            <Link
                                                                ref={
                                                                    containerRef
                                                                }
                                                                key={
                                                                    cat._id ||
                                                                    index
                                                                }
                                                                onClick={() =>
                                                                    handleRedirectProductListPage(
                                                                        cat._id,
                                                                        cat.name
                                                                    )
                                                                }
                                                                className="hover:underline text-orange-500 font-semibold px-4"
                                                            >
                                                                {cat.name}
                                                            </Link>
                                                        )
                                                    )
                                                ) : (
                                                    <span className="italic text-foreground break-words">
                                                        Không có danh mục
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex gap-4">
                                            <span className="font-semibold">
                                                Số lượng còn lại:
                                            </span>
                                            {data.stock}
                                        </div>
                                        <div className="flex gap-4">
                                            <span className="font-semibold">
                                                Đơn vị tính:
                                            </span>
                                            {data.unit}
                                        </div>
                                    </div>
                                )}
                                {tab === 'description' && (
                                    <div className="text-foreground leading-relaxed break-words space-y-2">
                                        {data?.description &&
                                        data.description.trim() !== '' ? (
                                            data.description
                                                .split('\n')
                                                .map((line, index) => (
                                                    <div
                                                        key={index}
                                                        className="whitespace-pre-line"
                                                    >
                                                        {line.trim()}
                                                    </div>
                                                ))
                                        ) : (
                                            <span className="italic text-foreground">
                                                Sản phẩm này hiện chưa có mô tả.
                                            </span>
                                        )}
                                    </div>
                                )}
                                {tab === 'reviews' && (
                                    <p className="italic text-foreground break-words">
                                        Chưa có đánh giá nào.
                                    </p>
                                )}
                            </div>
                        </section>

                        <div
                            className={`${
                                data?.more_details &&
                                Object.keys(data.more_details).length > 0
                                    ? 'flex'
                                    : 'hidden'
                            } glass-border liquid-glass-2 p-4 rounded-lg flex-col gap-6`}
                        >
                            {data?.more_details &&
                                Object.keys(data.more_details).map(
                                    (element, index) => (
                                        <div key={element || index}>
                                            <p className="pb-2 font-semibold text-lg">
                                                {element}
                                            </p>
                                            <p className="text-base break-words">
                                                {data.more_details[element]}
                                            </p>
                                        </div>
                                    )
                                )}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col sm:gap-4 gap-2 mt-6 text-foreground">
                    <h1 className="text-2xl lg:text-3xl text-red-700 dark:text-orange-600 font-bold">
                        {data.name}
                    </h1>
                    <p className="text-secondary-100 font-bold sm:text-xl text-base">
                        {data.unit}
                    </p>
                    <Divider />

                    <div className="flex items-center gap-6 sm:gap-8">
                        <p className="text-lg sm:text-3xl font-bold text-secondary-200">
                            {DisplayPriceInVND(
                                pricewithDiscount(data.price, data.discount)
                            )}
                        </p>
                        {data.discount > 0 && (
                            <div className="flex items-center gap-3 sm:text-lg text-sm">
                                <p className="line-through text-rose-600 font-semibold">
                                    {DisplayPriceInVND(data.price)}
                                </p>
                                <span
                                    className="border-2 border-orange-500 text-foreground font-semibold
                                px-3 rounded-full shadow sm:text-base text-xs bg-orange-500/30"
                                >
                                    -{data.discount}%
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="w-fit">
                        {/* Options Section */}
                        {data.options && data.options.length > 0 && (
                            <div className="mb-6">
                                {data.options.map((option, idx) => (
                                    <div key={idx} className="mb-4">
                                        <h3 className="font-semibold mb-2 text-foreground">
                                            {option.name}
                                        </h3>
                                        <div className="flex flex-wrap gap-3">
                                            {option.choices.map(
                                                (choice, cIdx) => (
                                                    <label
                                                        key={cIdx}
                                                        className="cursor-pointer"
                                                    >
                                                        <input
                                                            type="radio"
                                                            name={option.name}
                                                            className="peer sr-only"
                                                            onChange={() =>
                                                                handleOptionChange(
                                                                    option.name,
                                                                    choice.name,
                                                                    choice.priceModifier,
                                                                    option.type
                                                                )
                                                            }
                                                            checked={selectedOptions.find(
                                                                (s) =>
                                                                    s.optionName ===
                                                                        option.name &&
                                                                    s.choiceName ===
                                                                        choice.name
                                                            )}
                                                        />
                                                        <div className="px-4 py-2 rounded-lg border border-gray-600 peer-checked:border-lime-300 peer-checked:bg-lime-300/20 peer-checked:text-lime-300 text-gray-300 transition-all">
                                                            {choice.name}{' '}
                                                            {choice.priceModifier >
                                                                0 &&
                                                                `(+${DisplayPriceInVND(
                                                                    choice.priceModifier
                                                                )})`}
                                                        </div>
                                                    </label>
                                                )
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Notes Section */}
                        <div className="mb-6">
                            <h3 className="font-semibold mb-2 text-foreground">
                                Ghi chú cho món ăn
                            </h3>
                            <textarea
                                className="w-full p-3 rounded-lg bg-white/10 border border-gray-600 text-foreground placeholder-foreground/90 focus:outline-none focus:border-lime-300"
                                rows="3"
                                placeholder="Ví dụ: Không hành, ít đá..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                            ></textarea>
                        </div>

                        {data.stock === 0 ? (
                            <p className="md:text-2xl text-lg font-bold text-rose-600 my-2">
                                Hết hàng
                            </p>
                        ) : (
                            <div className="flex items-center gap-4 mt-2">
                                <GlareHover
                                    glareColor="#ffffff"
                                    glareOpacity={0.3}
                                    glareAngle={-30}
                                    glareSize={300}
                                    transitionDuration={800}
                                    playOnce={false}
                                >
                                    <Button
                                        onClick={handleGuideOrder}
                                        className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3
                            rounded-lg font-bold shadow-md text-center"
                                    >
                                        Quét QR để gọi món
                                    </Button>
                                </GlareHover>
                            </div>
                        )}
                    </div>

                    <div className="mt-4 liquid-glass p-4 rounded-lg shadow-md">
                        <h2 className="font-semibold sm:text-lg text-sm">
                            Tại sao nên chọn EatEase?{' '}
                        </h2>
                        <div className="sm:text-base text-sm">
                            <div className="flex items-center gap-4 my-4">
                                <img
                                    src={image1}
                                    alt="superfast delivery"
                                    className="sm:w-20 sm:h-20 w-16 h-16 object-cover shadow-md shadow-secondary-100 rounded-xl"
                                />
                                <div className="flex flex-col gap-1">
                                    <div className="font-semibold">
                                        Thức ăn tươi ngon
                                    </div>
                                    <p className="sm:text-sm text-xs">
                                        Chất lượng sản phẩm đảm bảo, từ các nhà
                                        cung cấp uy tín.
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 my-4">
                                <img
                                    src={image2}
                                    alt="Best prices offers"
                                    className="sm:w-20 sm:h-20 w-16 h-16 object-cover shadow-md shadow-secondary-100 rounded-xl"
                                />
                                <div className="flex flex-col gap-1">
                                    <div className="font-semibold">
                                        Giá tốt & ưu đãi hấp dẫn
                                    </div>
                                    <p className="sm:text-sm text-xs">
                                        Mua sắm với mức giá cạnh tranh cùng
                                        nhiều khuyến mãi trực tiếp từ nhà sản
                                        xuất.
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 my-4">
                                <img
                                    src={image3}
                                    alt="Wide Assortment"
                                    className="sm:w-20 sm:h-20 w-16 h-16 object-cover shadow-md shadow-secondary-100 rounded-xl"
                                />
                                <div className="flex flex-col gap-1">
                                    <div className="font-semibold">
                                        Thanh toán an toàn
                                    </div>
                                    <p className="sm:text-sm text-xs">
                                        Hỗ trợ nhiều phương thức thanh toán bảo
                                        mật.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile */}
            <div className="flex flex-col gap-6 lg:hidden">
                <section className="mt-8 glass-border liquid-glass-2 p-4 rounded-lg">
                    <div className="text-sm flex items-center gap-6 border-b border-gray-300">
                        <button
                            onClick={() => setTab('detail')}
                            className={`pb-2 font-bold px-2 ${
                                tab === 'detail'
                                    ? 'border-b-[3px] border-highlight text-highlight'
                                    : 'text-foreground'
                            }`}
                        >
                            Chi tiết
                        </button>
                        <button
                            onClick={() => setTab('description')}
                            className={`pb-2 font-bold px-2 ${
                                tab === 'description'
                                    ? 'border-b-[3px] border-highlight text-highlight'
                                    : 'text-foreground'
                            }`}
                        >
                            Mô tả
                        </button>
                        <button
                            onClick={() => setTab('reviews')}
                            className={`pb-2 font-bold px-2 ${
                                tab === 'reviews'
                                    ? 'border-b-[3px] border-highlight text-highlight'
                                    : 'text-foreground'
                            }`}
                        >
                            Đánh giá
                        </button>
                    </div>

                    <div className="mt-6 px-4">
                        {tab === 'detail' && (
                            <div className="text-sm text-foreground leading-relaxed break-words flex flex-col gap-3">
                                <div className="flex gap-4">
                                    <span className="font-semibold text-nowrap">
                                        Danh mục:{' '}
                                    </span>
                                    <div className="flex flex-wrap">
                                        {data?.category &&
                                        data.category.length > 0 ? (
                                            data.category.map((cat, index) => (
                                                <Link
                                                    ref={containerRef}
                                                    key={cat._id || index}
                                                    onClick={() =>
                                                        handleRedirectProductListPage(
                                                            cat._id,
                                                            cat.name
                                                        )
                                                    }
                                                    className="hover:underline text-orange-600 font-semibold px-2"
                                                >
                                                    {cat.name}
                                                </Link>
                                            ))
                                        ) : (
                                            <span className="italic text-foreground break-words">
                                                Không có danh mục
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <span className="font-semibold">
                                        Số lượng còn lại:
                                    </span>
                                    {data.stock}
                                </div>
                                <div className="flex gap-4">
                                    <span className="font-semibold">
                                        Đơn vị tính:
                                    </span>
                                    {data.unit}
                                </div>
                            </div>
                        )}
                        {tab === 'description' && (
                            <div className="text-foreground leading-relaxed break-words space-y-2 text-sm">
                                {data?.description &&
                                data.description.trim() !== '' ? (
                                    data.description
                                        .split('\n')
                                        .map((line, index) => (
                                            <div
                                                key={index}
                                                className="whitespace-pre-line"
                                            >
                                                {line.trim()}
                                            </div>
                                        ))
                                ) : (
                                    <span className="italic text-foreground">
                                        Sản phẩm này hiện chưa có mô tả.
                                    </span>
                                )}
                            </div>
                        )}
                        {tab === 'reviews' && (
                            <p className="italic text-foreground text-sm break-words">
                                Chưa có đánh giá nào.
                            </p>
                        )}
                    </div>
                </section>

                <div
                    className={`${
                        data?.more_details &&
                        Object.keys(data.more_details).length > 0
                            ? 'flex'
                            : 'hidden'
                    } glass-border liquid-glass-2 p-4 rounded-lg flex-col gap-6`}
                >
                    {data?.more_details &&
                        Object.keys(data.more_details).map((element, index) => (
                            <div key={element || index}>
                                <p className="pb-2 font-semibold text-sm">
                                    {element}
                                </p>
                                <p className="text-xs break-words">
                                    {data.more_details[element]}
                                </p>
                            </div>
                        ))}
                </div>
            </div>

            <div
                className="sm:mt-10 mt-6 lg:mb-4 liquid-glass sm:p-4 p-2 py-6 shadow-md rounded-lg
            flex flex-col gap-4"
            >
                <h2 className="sm:text-xl text-base font-bold sm:p-0 px-2 text-foreground">
                    Sản phẩm tương tự
                </h2>

                <div
                    className={`${
                        relatedProducts.length > 0
                            ? 'grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 sm:gap-4 gap-[10px]'
                            : ''
                    } flex flex-wrap gap-2`}
                >
                    {relatedProducts.length > 0 ? (
                        relatedProducts.map((item) => (
                            <ProductCard key={item._id} data={item} />
                        ))
                    ) : (
                        <NoData message="Không có sản phẩm tương tự" />
                    )}
                </div>
            </div>

            {imageURL && (
                <ViewImage url={imageURL} close={() => setImageURL('')} />
            )}
        </section>
    );
};

export default ProductDisplayPage;
