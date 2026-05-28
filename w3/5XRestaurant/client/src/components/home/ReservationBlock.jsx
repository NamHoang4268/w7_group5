import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BentoCard, useMobileDetection } from '../animations/MagicBento';

const BRAND_GLOW = '201, 96, 72'; // #C96048

export const ReservationBlock = () => {
    const isMobile = useMobileDetection();
    const navigate = useNavigate();

    const card = {
        color: 'transparent', // Để theme card bg tự xử lý
        className: 'reservation-card',
        children: <ReservationContent navigate={navigate} />,
    };

    return (
        <>
            <style>{`
                .reservation-card {
                    aspect-ratio: unset !important;
                    min-height: unset !important;
                    padding: 0 !important;
                    /* Dùng CSS var thay vì hardcode — responsive với dark/light */
                    background: hsl(var(--card) / .80) !important;
                    backdrop-filter: blur(12px) !important;
                    border: 1px solid rgba(201,96,72,0.2) !important;
                    border-radius: 1.25rem !important;
                }
            `}</style>
            <div className="md:col-span-4 lg:col-span-3">
                <BentoCard
                    card={card}
                    glowColor={BRAND_GLOW}
                    enableBorderGlow={true}
                    clickEffect={false}
                    isMobile={isMobile}
                />
            </div>
        </>
    );
};

const ReservationContent = ({ navigate }) => (
    <div className="flex flex-col md:flex-row gap-8 items-center p-8 lg:p-10 w-full">
        <div className="flex-1 min-w-0">
            {/* Label */}
            <span className="inline-block text-[10px] uppercase tracking-[.25em] text-[#C96048] font-bold mb-3 bg-[#C96048]/10 px-3 py-1 rounded-full border border-[#C96048]/25">
                Đặt bàn
            </span>
            <h3 className="text-2xl lg:text-3xl font-bold mb-3 text-foreground">
                Đặt chỗ của bạn
            </h3>
            <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
                Trải nghiệm thực đơn đặc biệt, phục vụ từ Thứ Ba đến Chủ Nhật.
                Khuyến nghị đặt trước 2 tuần.
            </p>

            {/* Quick selectors — dùng bg-accent/border-border thay hardcode */}
            <div className="flex flex-wrap gap-3">
                {[
                    { icon: '📅', label: 'Chọn ngày' },
                    { icon: '👥', label: '2 Khách' },
                    { icon: '🕐', label: 'Chọn giờ' },
                ].map(({ icon, label }) => (
                    <div
                        key={label}
                        className="bg-accent/60 backdrop-blur px-4 py-2.5 rounded-xl flex items-center gap-2.5 border border-[#C96048]/15 shadow-sm hover:shadow-md hover:border-[#C96048]/40 transition-all cursor-pointer"
                    >
                        <span className="text-[#C96048] text-lg">{icon}</span>
                        <span className="text-xs font-semibold text-foreground">{label}</span>
                    </div>
                ))}
            </div>
        </div>

        {/* CTA */}
        <button
            onClick={() => navigate('/booking')}
            className="shrink-0 w-full md:w-auto bg-[#C96048] text-white px-10 py-5 rounded-2xl text-sm font-bold uppercase tracking-[0.15em] shadow-lg shadow-[#C96048]/25 hover:bg-[#A8432E] hover:scale-[1.03] active:scale-95 transition-all duration-300"
        >
            Kiểm tra chỗ trống
        </button>
    </div>
);
