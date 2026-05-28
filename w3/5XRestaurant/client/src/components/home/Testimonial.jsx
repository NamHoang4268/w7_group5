import React, { useState } from 'react';
import { BentoCard, useMobileDetection } from '../animations/MagicBento';

const VIOLET_GLOW = '132, 0, 255';

const reviews = [
    {
        stars: 5,
        quote: '"Những nét tinh tế trong từng món ăn khiến chúng tôi hoàn toàn bị chinh phục. EatEase thực sự là một trải nghiệm không thể quên."',
        author: 'Nguyễn Minh Khoa',
        role: 'Food Critic — Saigon Eats',
    },
    {
        stars: 5,
        quote: '"Không gian sang trọng, phục vụ chu đáo và hương vị tuyệt vời. Đây là nhà hàng tôi sẽ quay lại nhiều lần."',
        author: 'Trần Thị Hoa',
        role: 'Khách hàng thân thiết',
    },
    {
        stars: 5,
        quote: '"EatEase kết hợp hoàn hảo giữa ẩm thực truyền thống và hiện đại. Một viên ngọc ẩm thực thực sự."',
        author: 'Lê Văn Đức',
        role: 'Blogger ẩm thực',
    },
];

export const Testimonial = () => {
    const [active, setActive] = useState(0);
    const isMobile = useMobileDetection();

    const card = {
        color: 'transparent', // Để dark/light card bg tự xử lý
        className: 'testimonial-card',
        children: (
            <TestimonialContent
                active={active}
                setActive={setActive}
                reviews={reviews}
            />
        ),
    };

    return (
        <>
            <style>{`
                .testimonial-card {
                    aspect-ratio: unset !important;
                    min-height: unset !important;
                    padding: 0 !important;
                    /* Dark card — luôn tối dù light/dark mode để tạo tương phản với Reservation */
                    background: hsl(var(--card) / .90) !important;
                    backdrop-filter: blur(16px) !important;
                    border: 1px solid hsl(var(--border)) !important;
                    border-radius: 1.25rem !important;
                }
                @keyframes fade-slide-in {
                    from { opacity: 0; transform: translateY(8px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                .review-animate {
                    animation: fade-slide-in .35s ease forwards;
                }
            `}</style>
            <div className="md:col-span-2 lg:col-span-3">
                <BentoCard
                    card={card}
                    glowColor={VIOLET_GLOW}
                    enableBorderGlow={true}
                    clickEffect={false}
                    isMobile={isMobile}
                />
            </div>
        </>
    );
};

const TestimonialContent = ({ active, setActive, reviews }) => {
    const r = reviews[active];

    return (
        <div className="flex flex-col justify-between p-8 lg:p-10 w-full h-full">
            {/* Stars */}
            <div className="flex gap-1 mb-4">
                {Array.from({ length: r.stars }).map((_, i) => (
                    <span key={i} className="text-[#C96048] text-2xl">★</span>
                ))}
            </div>

            {/* Quote */}
            <div className="review-animate flex-1" key={active}>
                <p className="text-lg lg:text-xl font-['Noto_Serif'] italic leading-relaxed text-foreground/90 mb-6">
                    {r.quote}
                </p>
                <div>
                    <p className="text-sm font-semibold text-foreground/80">
                        {r.author}
                    </p>
                    <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mt-0.5">
                        {r.role}
                    </p>
                </div>
            </div>

            {/* Dot navigation */}
            <div className="flex gap-2 mt-6">
                {reviews.map((_, i) => (
                    <button
                        key={i}
                        onClick={() => setActive(i)}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                            i === active
                                ? 'w-6 bg-[#C96048]'
                                : 'w-1.5 bg-foreground/20 hover:bg-foreground/40'
                        }`}
                        aria-label={`Review ${i + 1}`}
                    />
                ))}
            </div>
        </div>
    );
};
