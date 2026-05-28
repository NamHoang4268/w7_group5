'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Star } from 'lucide-react';
import { pricewithDiscount } from '../../utils/PriceWithDiscount';
import { DisplayPriceInVND } from '../../utils/DisplayPriceInVND';
import { Link } from 'react-router-dom';

interface Product {
    _id: string;
    name: string;
    image: string[];
    unit: string;
    discount: number;
    price: number;
    stock: number;
}

interface ProductCardProps {
    data: Product;
}

export function ProductCard({ data }: ProductCardProps) {
    const [isHovered, setIsHovered] = useState(false);
    const url = `/product/${data.name.toLowerCase().replace(/\s+/g, '-')}-${
        data._id
    }`;

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <Link
            to={url}
            onClick={scrollToTop}
            className="block rounded-[28px] liquid-glass p-2 shadow-2xl"
        >
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                whileHover={{
                    scale: 1.03,
                    transition: { duration: 0.2 },
                }}
            >
                <Card
                    className="rounded-3xl shadow-md shadow-secondary-100 hover:shadow-lg transition-all duration-300 overflow-hidden group relative"
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                >
                    {/* Glow effect on hover */}
                    <div
                        className={`absolute inset-0 bg-gradient-to-r dark:from-emerald-500/20 dark:to-cyan-500/20 from-orange-500/10 to-amber-500/10 opacity-0 transition-opacity duration-500 pointer-events-none ${
                            isHovered ? 'opacity-100' : ''
                        }`}
                    />

                    {/* Border glow */}
                    <div
                        className={`absolute inset-0 rounded-3xl border-2 border-emerald-500/0 transition-all duration-500 ${
                            isHovered
                                ? 'dark:border-emerald-500/70 border-orange-500/70 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                                : ''
                        }`}
                    />

                    <div className="relative w-full h-full overflow-hidden">
                        <img
                            src={data.image[0]}
                            alt={data.name}
                            className={`w-full p-2 h-44 object-contain bg-white transition-transform duration-700 ${
                                isHovered ? 'scale-100' : 'scale-100'
                            }`}
                        />

                        {data.discount > 0 && (
                            <div className="absolute top-2 left-2 z-10">
                                <motion.div
                                    animate={{
                                        scale: isHovered ? [1, 1.1, 1] : 1,
                                        rotate: isHovered ? [0, -5, 5, 0] : 0,
                                    }}
                                    transition={{
                                        duration: 0.5,
                                        repeat: isHovered
                                            ? Number.POSITIVE_INFINITY
                                            : 0,
                                        repeatDelay: 2,
                                    }}
                                >
                                    <Badge className="bg-gradient-to-r dark:from-emerald-700 dark:to-cyan-500 from-orange-700 to-amber-500 shadow-lg shadow-emerald-500/20 font-bold text-white">
                                        -{data.discount}%
                                    </Badge>
                                </motion.div>
                            </div>
                        )}
                    </div>

                    <CardContent className="p-3 relative z-10 text-foreground flex flex-col gap-1.5 justify-between h-36 w-full">
                        <div className="">
                            <h3
                                className={`font-semibold mb-1 transition-colors duration-300 line-clamp-2 h-fit w-full ${
                                    isHovered
                                        ? 'text-orange-600 dark:text-emerald-300'
                                        : ''
                                }`}
                            >
                                {data.name}
                            </h3>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center justify-between gap-2 w-full">
                                    {data.discount > 0 ? (
                                        <>
                                            <span className="text-highlight line-through text-sm">
                                                {DisplayPriceInVND(data.price)}
                                            </span>
                                            <span className="dark:text-emerald-300 text-orange-500 font-bold text-lg">
                                                {DisplayPriceInVND(
                                                    pricewithDiscount(
                                                        data.price,
                                                        data.discount
                                                    )
                                                )}
                                            </span>
                                        </>
                                    ) : (
                                        <span className="dark:text-emerald-300 text-orange-500 font-bold text-lg">
                                            {DisplayPriceInVND(data.price)}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="w-full">
                            <span className="block text-center text-xs text-orange-500 font-semibold py-1.5 border border-orange-300 rounded-lg hover:bg-orange-50 transition-colors">
                                Xem chi tiết →
                            </span>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </Link>
    );
}

export default ProductCard;
