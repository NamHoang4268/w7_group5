'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import GlareHover from './GlareHover';
import { Button } from './ui/button';

interface Category {
    _id: string;
    name: string;
    image: string;
    description: string;
}

interface CategoryCardProps {
    data: Category;
    onEdit?: (data: Category) => void;
    onDelete?: (data: Category) => void;
    onViewImage?: (url: string) => void;
}

export function CategoryCard({
    data,
    onEdit,
    onDelete,
    onViewImage,
}: CategoryCardProps) {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div className="block rounded-[28px] backdrop-glass border border-input p-2">
            <div>
                <Card
                    className="bg-input hover:bg-transparent rounded-3xl transition-all duration-300 overflow-hidden group relative"
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                >
                    {/* Glow effect on hover */}
                    <div
                        className={`absolute inset-0 bg-gradient-to-r from-highlight/20 to-highlight/10 opacity-0 transition-opacity
                            duration-500 pointer-events-none ${
                                isHovered ? 'opacity-100' : ''
                            }`}
                    />

                    {/* Border glow */}
                    <div
                        className={`absolute inset-0 rounded-3xl border transition-all duration-500 ${
                            isHovered
                                ? 'border-highlight/70 shadow-[0_0_15px_rgba(var(--highlight),0.3)]'
                                : 'border-transparent'
                        }`}
                    />

                    <div className="relative w-full h-full overflow-hidden">
                        <img
                            src={data.image}
                            alt={data.name}
                            className={`w-full h-32 sm:h-44 object-cover bg-background transition-transform duration-700 cursor-pointer ${
                                isHovered
                                    ? 'scale-100 opacity-80'
                                    : 'scale-100 opacity-100'
                            }`}
                            onClick={() => onViewImage(data.image)}
                        />
                    </div>

                    <CardContent className="p-3 relative z-10 text-foreground flex flex-col gap-1.5 justify-between sm:h-[100px] w-full">
                        <h3 className="font-semibold transition-colors duration-300 text-center line-clamp-2 h-fit w-full">
                            {data.name}
                        </h3>

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
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onEdit(data);
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
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDelete(data);
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
        </div>
    );
}

export default CategoryCard;
