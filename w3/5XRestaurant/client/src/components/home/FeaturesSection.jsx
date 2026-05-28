import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
    FaShippingFast,
    FaCalendarCheck,
    FaLeaf,
    FaAward,
} from 'react-icons/fa';

const features = [
    {
        icon: FaCalendarCheck,
        title: 'Đặt Bàn Online',
        description:
            'Đặt bàn dễ dàng, nhanh chóng chỉ với vài thao tác đơn giản',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
    },
    {
        icon: FaLeaf,
        title: 'Nguyên Liệu Tươi',
        description: 'Cam kết sử dụng nguyên liệu tươi ngon, an toàn vệ sinh',
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-50',
    },
    {
        icon: FaAward,
        title: 'Chất Lượng Đảm Bảo',
        description: 'Đội ngũ đầu bếp chuyên nghiệp, phục vụ tận tâm',
        color: 'text-amber-600',
        bgColor: 'bg-amber-50',
    },
];

export const FeaturesSection = () => {
    return (
        <section className="py-16">
            <div className="container mx-auto px-4">
                {/* Section Header */}
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                        Tại Sao Chọn Chúng Tôi?
                    </h2>
                    <p className="text-lg text-foreground/80 max-w-2xl mx-auto">
                        Chúng tôi cam kết mang đến trải nghiệm ẩm thực tuyệt vời
                        nhất cho khách hàng
                    </p>
                </div>

                {/* Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-6">
                    {features.map((feature, index) => {
                        const Icon = feature.icon;
                        return (
                            <Card
                                key={index}
                                className="border-4 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                            >
                                <CardContent className="p-6 text-center space-y-4">
                                    {/* Icon */}
                                    <div
                                        className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${feature.bgColor}`}
                                    >
                                        <Icon
                                            className={`text-3xl ${feature.color}`}
                                        />
                                    </div>

                                    {/* Title */}
                                    <h3 className="text-xl font-semibold text-foreground">
                                        {feature.title}
                                    </h3>

                                    {/* Description */}
                                    <p className="text-foreground/80 text-sm leading-relaxed">
                                        {feature.description}
                                    </p>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};
