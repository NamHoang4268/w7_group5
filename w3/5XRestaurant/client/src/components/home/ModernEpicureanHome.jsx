import React from 'react';
import { HeroEditorial } from './HeroEditorial';
import { BentoGrid } from './BentoGrid';
import { FeaturedDishes } from './FeaturedDishes';
import { ReservationBlock } from './ReservationBlock';
import { Testimonial } from './Testimonial';
import { EpicureanFooter } from './EpicureanFooter';
import { ScrollProvider } from '../../contexts/ScrollContext';
import MagicBento from '../animations/MagicBento';
import Header from './Header';
import { useScrollReveal } from '../../hooks/useScrollReveal';

/*
 * ── Design Tokens (không hardcode background — để Plasma + dark/light mode tự handle) ──
 * Primary rose-orange : #C96048  (warm rose-orange)
 * Primary dark        : #A8432E
 * Glow RGB            : 201, 96, 72
 *
 * Text/bg dùng CSS vars từ index.css:
 *   text-foreground, text-muted-foreground, bg-card, bg-muted, bg-background
 *   border-border, bg-accent, ...
 */

/* ── "Why Choose Us" — 6 cards với hình ảnh và thông tin chi tiết ── */
const whyUsCards = [
    {
        color: '#1E100C',
        icon: '🍽️',
        label: 'Chất lượng',
        title: 'Nguyên liệu\nCao Cấp',
        description:
            'Mỗi nguyên liệu được tuyển chọn kỹ lưỡng từ các nhà cung cấp uy tín, đảm bảo độ tươi ngon tuyệt hảo.',
        badge: '✦ Nhập khẩu trực tiếp hàng ngày',
        image: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800&q=80',
    },
    {
        color: '#0F1A12',
        icon: '👨‍🍳',
        label: 'Đội ngũ',
        title: 'Đầu Bếp\nBậc Thầy',
        description:
            'Đội ngũ đầu bếp với hơn 10 năm kinh nghiệm, đào tạo tại các trường ẩm thực danh tiếng quốc tế.',
        badge: '✦ 10+ năm kinh nghiệm',
        image: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=800&q=80',
    },
    {
        color: '#1E0C14',
        icon: '⭐',
        label: 'Uy tín',
        title: 'Đánh Giá\n5 Sao',
        description:
            'Được hàng nghìn thực khách tin tưởng. Nhà hàng duy trì đánh giá 5 sao liên tục trong nhiều năm.',
        badge: '✦ 2,400+ đánh giá 5 sao',
        stars: 5,
        image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80',
    },
    {
        color: '#0B1220',
        icon: '�',
        label: '01',
        title: 'Địa Điểm\nLý Tưởng',
        description:
            'Tọa lạc trung tâm thành phố, không gian sang trọng & riêng tư. Bãi đỗ xe rộng rãi.',
        image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80',
    },
    {
        color: '#1A1408',
        icon: '🕐',
        label: '14h',
        title: 'Mở Cửa\nHàng Ngày',
        description:
            'Phục vụ từ 8:00 sáng đến 10:00 tối, kể cả cuối tuần và ngày lễ.',
        badge: 'Đang mở cửa ngay bây giờ',
        badgeColor: 'green',
        image: 'https://images.unsplash.com/photo-1559329007-40df8a9345d8?w=800&q=80',
    },
    {
        color: '#180A18',
        icon: '🎁',
        label: 'Dịch vụ',
        title: 'Tiệc & Sự Kiện\nRiêng Tư',
        description:
            'Tổ chức sinh nhật, lễ kỷ niệm và hội nghị với không gian thiết kế riêng theo yêu cầu.',
        badge: '✦ Đặt chỗ ngay hôm nay',
        image: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&q=80',
    },
];

/* ─────────────────────────────────────────────────────────────────
   ScrollRevealSection — wrapper bọc ngoài mỗi section.
   Dùng useScrollReveal để toggle class khi vào viewport.
   Hỗ trợ các hướng animate: fade-up | fade-down | fade-left | fade-right | zoom | flip
───────────────────────────────────────────────────────────────────*/
const ScrollRevealSection = ({
    children,
    direction = 'fade-up',
    delay = 0,
    duration = 700,
    threshold = 0.12,
    rootMargin = '0px 0px -60px 0px',
    className = '',
    style = {},
}) => {
    const [ref, isVisible] = useScrollReveal({ threshold, rootMargin });

    return (
        <div
            ref={ref}
            className={`scroll-reveal scroll-reveal--${direction} ${isVisible ? 'scroll-reveal--visible' : ''} ${className}`}
            style={{
                transitionDelay: isVisible ? `${delay}ms` : '0ms',
                transitionDuration: `${duration}ms`,
                ...style,
            }}
        >
            {children}
        </div>
    );
};

export const ModernEpicureanHome = () => {
    return (
        <ScrollProvider>
            <style>{`
                /* ══════════════════════════════════════════════════
                   SCROLL REVEAL — Base animation system
                   Mỗi phần tử bắt đầu ở trạng thái ẩn, khi vào
                   viewport class .scroll-reveal--visible được thêm
                   để trigger CSS transition mượt mà.
                ══════════════════════════════════════════════════ */

                .scroll-reveal {
                    transition-property: opacity, transform, filter;
                    transition-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
                    will-change: opacity, transform;
                }

                /* ── Trạng thái ẩn ban đầu theo từng hướng ── */
                .scroll-reveal--fade-up    { opacity: 0; transform: translateY(48px); }
                .scroll-reveal--fade-down  { opacity: 0; transform: translateY(-48px); }
                .scroll-reveal--fade-left  { opacity: 0; transform: translateX(64px); }
                .scroll-reveal--fade-right { opacity: 0; transform: translateX(-64px); }
                .scroll-reveal--zoom       { opacity: 0; transform: scale(0.88); }
                .scroll-reveal--zoom-in    { opacity: 0; transform: scale(1.08); }
                .scroll-reveal--flip       { opacity: 0; transform: perspective(600px) rotateX(18deg) translateY(32px); }

                /* ── Trạng thái hiển thị — về vị trí tự nhiên ── */
                .scroll-reveal--visible {
                    opacity: 1 !important;
                    transform: none !important;
                    filter: none !important;
                }

                /* ── Divider glow line ── */
                .section-divider {
                    height: 1px;
                    background: linear-gradient(90deg, transparent 0%, #C96048 30%, #f97316 60%, transparent 100%);
                    opacity: 0.25;
                    margin: 0 auto;
                    max-width: 480px;
                }

                /*
                 * Why-Us grid — layout 4 cột khớp hình tham chiếu:
                 *   Row1: [card1][card2][card3 card3]
                 *   Row2: [card4 card4][card3 card3]
                 *   Row3: [card4 card4][card5][card6]
                 */
                .why-us-grid {
                    max-width: 100% !important;
                    width: 100% !important;
                    padding: .5rem 0 !important;
                    gap: .875rem !important;
                }
                @media (min-width: 600px) {
                    .why-us-grid { grid-template-columns: repeat(2, 1fr) !important; }
                }
                @media (min-width: 1024px) {
                    .why-us-grid { grid-template-columns: repeat(4, 1fr) !important; }

                    /* Card 3 — ô to góc phải trên (col 3-4, row 1-2) */
                    .why-us-grid .bento-card:nth-child(3) {
                        grid-column: span 2 !important;
                        grid-row: span 2 !important;
                    }
                    /* Card 4 — ô to góc trái dưới (col 1-2, row 2-3) */
                    .why-us-grid .bento-card:nth-child(4) {
                        grid-column: 1 / span 2 !important;
                        grid-row: 2 / span 2 !important;
                    }
                    /* Card 6 — ô nhỏ góc phải dưới (col 4, row 3) */
                    .why-us-grid .bento-card:nth-child(6) {
                        grid-column: 4 !important;
                        grid-row: 3 !important;
                    }
                }

                /* Card size */
                .why-us-grid .bento-card        { min-height: 160px !important; }
                .why-us-grid .bento-card__icon  { font-size: 1.75rem !important; }
                .why-us-grid .bento-card__title { font-size: 1rem !important; font-weight: 700 !important; }
                .why-us-grid .bento-card__label { opacity: .5; font-size: .7rem !important; letter-spacing: .08em; }
                .why-us-grid .bento-card__desc  { font-size: .78rem !important; line-height: 1.55 !important; }

                /* ── Section label badge pulse ── */
                @keyframes badge-pulse {
                    0%, 100% { box-shadow: 0 0 0 0 rgba(201,96,72,0.35); }
                    50%       { box-shadow: 0 0 0 6px rgba(201,96,72,0); }
                }
                .section-badge { animation: badge-pulse 2.8s ease-in-out infinite; }

                /* ── Scroll indicator (hero bottom) ── */
                @keyframes scroll-bounce {
                    0%, 100% { transform: translateY(0); opacity: 0.7; }
                    50%       { transform: translateY(8px); opacity: 1; }
                }
                .scroll-bounce { animation: scroll-bounce 1.6s ease-in-out infinite; }

                /* ── Shimmer trên section heading ── */
                @keyframes shimmer-slide {
                    0%   { background-position: -200% center; }
                    100% { background-position: 300% center; }
                }
                .heading-shimmer {
                    background: linear-gradient(
                        90deg,
                        var(--color-foreground, #111) 0%,
                        #C96048 40%,
                        #f97316 55%,
                        var(--color-foreground, #111) 100%
                    );
                    background-size: 200% auto;
                    -webkit-background-clip: text;
                    background-clip: text;
                    -webkit-text-fill-color: transparent;
                    animation: shimmer-slide 4s linear infinite;
                }
            `}</style>

            {/* Không set bg — để Plasma + body bg-background hiển thị qua */}
            <div className="eat-ease-home text-foreground">
                <main className="px-4 md:px-4 lg:px-4 py-24 container mx-auto">
                    {/* ── Hero Editorial — luôn hiển thị, không cần reveal ── */}
                    <HeroEditorial />

                    {/* ── Bento Grid — fade-up khi scroll ── */}
                    <ScrollRevealSection
                        direction="fade-up"
                        delay={0}
                        duration={800}
                        threshold={0.08}
                        className="mt-16"
                    >
                        <BentoGrid />
                    </ScrollRevealSection>

                    {/* ── Divider ── */}
                    <ScrollRevealSection
                        direction="zoom"
                        delay={100}
                        duration={600}
                        className="mt-20"
                    >
                        <div className="section-divider" />
                    </ScrollRevealSection>

                    {/* ── Why Choose Us — MagicBento section ── */}
                    <section className="mt-16">
                        {/* Heading block — fade từ dưới lên */}
                        <ScrollRevealSection
                            direction="fade-up"
                            delay={0}
                            duration={700}
                            threshold={0.2}
                        >
                            <div className="mb-2 text-center">
                                <span className="section-badge inline-block text-[10px] uppercase tracking-[.3em] text-orange-600 font-bold bg-[#C96048]/10 dark:bg-[#C96048]/20 px-4 py-1.5 rounded-full mb-4 border border-[#C96048]/80">
                                    Lý do lựa chọn
                                </span>
                                <h2 className="heading-shimmer text-3xl md:text-4xl font-bold">
                                    Tại sao chọn EatEase?
                                </h2>
                                <p className="mt-3 text-orange-500 font-bold text-sm max-w-lg mx-auto leading-relaxed">
                                    Chúng tôi không chỉ phục vụ món ăn — chúng
                                    tôi kiến tạo những trải nghiệm ẩm thực đáng
                                    nhớ.
                                </p>
                            </div>
                        </ScrollRevealSection>

                        {/* Bento Cards — flip vào với delay nhẹ hơn */}
                        <ScrollRevealSection
                            direction="flip"
                            delay={120}
                            duration={850}
                            threshold={0.08}
                        >
                            <MagicBento
                                cards={whyUsCards}
                                glowColor="201, 96, 72"
                                enableBorderGlow={true}
                                enableTilt={true}
                                clickEffect={true}
                                textAutoHide={false}
                                className="why-us-grid"
                            />
                        </ScrollRevealSection>
                    </section>

                    {/* ── Divider ── */}
                    <ScrollRevealSection
                        direction="zoom"
                        delay={80}
                        duration={600}
                        className="mt-20"
                    >
                        <div className="section-divider" />
                    </ScrollRevealSection>

                    {/* ── Featured Creations — fade từ dưới + delay ── */}
                    <ScrollRevealSection
                        direction="fade-up"
                        delay={0}
                        duration={800}
                        threshold={0.07}
                        className="mt-16"
                    >
                        <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
                            <FeaturedDishes />
                        </div>
                    </ScrollRevealSection>

                    {/* ── Divider ── */}
                    <ScrollRevealSection
                        direction="zoom"
                        delay={80}
                        duration={600}
                        className="mt-20"
                    >
                        <div className="section-divider" />
                    </ScrollRevealSection>

                    {/* ── Reservation & Testimonial — fade từ 2 phía ── */}
                    <div className="mt-16 grid grid-cols-1 md:grid-cols-6 gap-6 items-stretch">
                        <ScrollRevealSection
                            direction="fade-right"
                            delay={0}
                            duration={750}
                            threshold={0.1}
                            className="contents"
                        >
                            <ReservationBlock />
                        </ScrollRevealSection>

                        <ScrollRevealSection
                            direction="fade-left"
                            delay={180}
                            duration={750}
                            threshold={0.1}
                            className="contents"
                        >
                            <Testimonial />
                        </ScrollRevealSection>
                    </div>
                </main>

                {/* ── Footer — slide lên từ dưới ── */}
                <ScrollRevealSection
                    direction="fade-up"
                    delay={0}
                    duration={700}
                    threshold={0.05}
                >
                    <EpicureanFooter />
                </ScrollRevealSection>
            </div>
        </ScrollProvider>
    );
};

export default ModernEpicureanHome;
