import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { FaUtensils, FaCalendarAlt } from 'react-icons/fa';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { valideURLConvert } from '@/utils/valideURLConvert';

export const HeroSection = () => {
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
        <section className="relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-5">
                <div className="absolute top-0 left-0 w-96 h-96 bg-orange-500 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 right-0 w-96 h-96 bg-amber-500 rounded-full blur-3xl"></div>
            </div>

            <div className="relative container mx-auto px-4 py-16 md:py-24">
                <div className="max-w-4xl mx-auto text-center space-y-8">
                    {/* Main Heading */}
                    <div className="space-y-4">
                        <h1 className="text-4xl md:text-6xl font-bold text-foreground leading-tight">
                            Chào mừng đến với{' '}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-amber-600">
                                EatEase Restaurant
                            </span>
                        </h1>
                        <p className="text-lg md:text-xl text-foreground/80 font-semibold max-w-2xl mx-auto">
                            Trải nghiệm ẩm thực tuyệt vời với thực đơn đa dạng,
                            đặt bàn dễ dàng và giao hàng nhanh chóng
                        </p>
                    </div>

                    {/* CTA Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                        <Button
                            onClick={() => {
                                handleExploreClick();
                                scrollToTop();
                            }}
                            size="lg"
                            className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700
                        hover:to-amber-700 text-white px-8 py-6 text-lg shadow-lg hover:shadow-xl transition-all
                        duration-300 w-full sm:w-auto h-14"
                        >
                            <FaUtensils className="mr-2" />
                            Xem Thực Đơn
                        </Button>
                        <Link to="/booking">
                            <Button
                                size="lg"
                                variant="outline"
                                className="border-2 border-orange-400 dark:border-orange-600 text-orange-600
                            dark:text-orange-400 hover:bg-orange-50 px-8 py-6 text-lg shadow-md hover:shadow-lg
                            transition-all duration-300 w-full sm:w-auto h-14"
                            >
                                <FaCalendarAlt className="mr-2" />
                                Đặt Bàn Ngay
                            </Button>
                        </Link>
                    </div>

                    {/* Stats or Features */}
                    <div className="grid grid-cols-3 gap-4 md:gap-8 pt-8 max-w-2xl mx-auto">
                        <div className="text-center">
                            <div className="text-3xl md:text-4xl font-bold text-orange-600">
                                100+
                            </div>
                            <div className="text-sm md:text-base text-foreground mt-1">
                                Món ăn
                            </div>
                        </div>
                        <div className="text-center border-x border-orange-400">
                            <div className="text-3xl md:text-4xl font-bold text-orange-600">
                                4.9★
                            </div>
                            <div className="text-sm md:text-base text-foreground mt-1">
                                Đánh giá
                            </div>
                        </div>
                        <div className="text-center">
                            <div className="text-3xl md:text-4xl font-bold text-orange-600">
                                24/7
                            </div>
                            <div className="text-sm md:text-base text-foreground mt-1">
                                Phục vụ
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};
