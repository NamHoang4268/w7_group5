import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Axios from '../../utils/Axios';
import SummaryApi from '../../common/SummaryApi';
import { useSelector } from 'react-redux';
import { valideURLConvert } from '@/utils/valideURLConvert';
import { Button } from '../ui/button';

// Tính số item hiển thị theo chiều rộng màn hình
const useItemsPerPage = () => {
    const getCount = () => {
        if (typeof window === 'undefined') return 3;
        if (window.innerWidth < 640) return 1; // mobile
        if (window.innerWidth < 1024) return 2; // tablet
        return 4; // desktop
    };

    const [count, setCount] = useState(getCount);

    useEffect(() => {
        const handleResize = () => setCount(getCount());
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return count;
};

export const FeaturedDishes = () => {
    const [products, setProducts] = useState([]);
    const [currentPage, setCurrentPage] = useState(0);
    const [loading, setLoading] = useState(true);
    const itemsPerPage = useItemsPerPage();

    // Reset về trang đầu khi số item/trang thay đổi (resize)
    useEffect(() => {
        setCurrentPage(0);
    }, [itemsPerPage]);

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            setLoading(true);
            const response = await Axios({
                ...SummaryApi.get_product,
                data: {
                    page: 1,
                    limit: 100, // Lấy tất cả sản phẩm
                },
            });

            if (response.data.success) {
                setProducts(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching products:', error);
        } finally {
            setLoading(false);
        }
    };

    const totalPages = Math.ceil(products.length / itemsPerPage);
    const currentProducts = products.slice(
        currentPage * itemsPerPage,
        currentPage * itemsPerPage + itemsPerPage
    );

    const handlePrev = () => {
        setCurrentPage((prev) => (prev > 0 ? prev - 1 : totalPages - 1));
    };

    const handleNext = () => {
        setCurrentPage((prev) => (prev < totalPages - 1 ? prev + 1 : 0));
    };

    // Tạo URL chi tiết sản phẩm (giống product-card.tsx)
    const getProductUrl = (product) => {
        return `/product/${product.name.toLowerCase().replace(/\s+/g, '-')}-${product._id}`;
    };

    // Lấy tên category đầu tiên (đã populate)
    const getCategoryName = (product) => {
        if (product.category && product.category.length > 0) {
            return product.category[0]?.name || 'Món ăn';
        }
        return 'Món ăn';
    };

    const categoryData = useSelector((state) => state.product.allCategory);
    const navigate = useNavigate();

    const firstCategory = categoryData?.[0];

    const handleRedirectProductListPage = (id, cat) => {
        const url = `/${valideURLConvert(cat)}-${id}`;
        navigate(url);
    };

    const handleExploreClick = () => {
        handleRedirectProductListPage(firstCategory._id, firstCategory.name);
    };

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <section className="col-span-6">
            <div className="mb-6 flex justify-between items-center gap-4">
                <div>
                    <h3 className="text-3xl font-bold">Món ăn nổi bật</h3>
                    <p className="text-[#C96048] text-sm mt-1">
                        Khám phá các món ăn nổi bật của nhà hàng chúng tôi.
                    </p>
                </div>

                <div className="flex items-center md:flex-row flex-col gap-4">
                    {/* Page indicator */}
                    {totalPages > 1 && (
                        <span className="text-[#C96048] text-sm font-semibold tracking-widest">
                            {currentPage + 1} / {totalPages}
                        </span>
                    )}

                    {/* Navigation buttons */}
                    {totalPages > 1 && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handlePrev}
                                className="w-9 h-9 rounded-full border border-[#E8CFC5] flex items-center justify-center hover:bg-[#C96048] hover:text-white hover:border-[#C96048] transition-all duration-300"
                                aria-label="Trang trước"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <polyline points="15 18 9 12 15 6" />
                                </svg>
                            </button>
                            <button
                                onClick={handleNext}
                                className="w-9 h-9 rounded-full border border-[#E8CFC5] flex items-center justify-center hover:bg-[#C96048] hover:text-white hover:border-[#C96048] transition-all duration-300"
                                aria-label="Trang sau"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <polyline points="9 6 15 12 9 18" />
                                </svg>
                            </button>
                        </div>
                    )}

                    <button
                        onClick={() => {
                            handleExploreClick();
                            scrollToTop();
                        }}
                        className="section-badge inline-block whitespace-nowrap text-[10px] uppercase tracking-[.3em] text-orange-600 font-bold
                        bg-[#C96048]/10 dark:bg-[#C96048]/20 px-4 py-1.5 rounded-full border border-[#C96048]/80 hover:bg-[#C96048] hover:text-white hover:border-[#C96048] transition-all duration-300"
                    >
                        Xem tất cả
                    </button>
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Loading skeleton */}
                {loading &&
                    Array.from({ length: itemsPerPage }).map((_, i) => (
                        <div key={i} className="animate-pulse">
                            <div className="rounded-xl mb-4 aspect-[4/5] bg-muted" />
                            <div className="h-5 bg-muted rounded w-3/4 mb-2" />
                            <div className="h-4 bg-muted rounded w-1/2" />
                        </div>
                    ))}

                {/* Product cards */}
                {!loading &&
                    currentProducts.map((product, index) => (
                        <Link
                            key={product._id || index}
                            to={getProductUrl(product)}
                            onClick={() =>
                                window.scrollTo({ top: 0, behavior: 'smooth' })
                            }
                            className="group cursor-pointer block"
                        >
                            <div className="relative overflow-hidden rounded-xl mb-4 aspect-[4/5] bg-card">
                                <img
                                    alt={product.name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    src={
                                        product.image?.[0] ||
                                        'https://placehold.co/400x500?text=No+Image'
                                    }
                                />
                                <div className="absolute top-4 right-4 bg-background/90 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest text-foreground">
                                    {getCategoryName(product)}
                                </div>

                                {/* Price badge */}
                                <div className="absolute bottom-4 left-4 bg-[#1E1008]/80 backdrop-blur-sm px-3 py-1.5 rounded-full">
                                    <span className="text-white font-['Inter'] text-sm font-semibold">
                                        {product.price?.toLocaleString('vi-VN')}
                                        đ
                                    </span>
                                    {product.discount > 0 && (
                                        <span className="ml-2 text-[#E8856A] text-xs font-bold">
                                            -{product.discount}%
                                        </span>
                                    )}
                                </div>
                            </div>
                            <h4 className="text-xl font-bold mb-1 group-hover:text-[#C96048] transition-colors line-clamp-1">
                                {product.name}
                            </h4>
                            <p className="text-[#7A5040] text-sm line-clamp-2">
                                {product.description ||
                                    'Thưởng thức hương vị đặc biệt.'}
                            </p>
                        </Link>
                    ))}

                {/* Empty state */}
                {!loading && products.length === 0 && (
                    <div className="md:col-span-3 text-center py-12 text-[#7A5040]">
                        <p className="text-lg">Chưa có món ăn nào.</p>
                    </div>
                )}
            </div>
        </section>
    );
};
