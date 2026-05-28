import React from 'react';
import { useSelector } from 'react-redux';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { valideURLConvert } from '@/utils/valideURLConvert';
import logo from '@/assets/logo.png';
import ShinyText from '../animations/ShinyText';
import BorderGlow from '../animations/BorderGlow';

const ROSE = '#C96048';

const stats = [
    { value: '200+', label: 'Món ăn' },
    { value: '5★', label: 'Đánh giá' },
    { value: '8+', label: 'Năm kinh nghiệm' },
    { value: '50K+', label: 'Khách hàng' },
];

export const HeroEditorial = () => {
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
        <>
            <style>{`
                /* Shimmer gradient on hero highlight text */
                @keyframes hero-shimmer {
                    0%   { background-position: -200% center; }
                    100% { background-position:  200% center; }
                }
                .hero-shimmer-text {
                    background: linear-gradient(
                        90deg,
                        #C96048 0%,
                        #E8856A 25%,
                        #D4785A 45%,
                        #C04870 65%,
                        #C96048 100%
                    );
                    background-size: 200% auto;
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                    animation: hero-shimmer 4s linear infinite;
                }

                /* Stat counter card */
                .hero-stat {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    padding: .75rem 1.25rem;
                    border-radius: 1rem;
                    background: hsl(var(--card) / .75);
                    backdrop-filter: blur(8px);
                    border: 1px solid hsl(var(--border));
                    transition: transform .2s ease, box-shadow .2s ease;
                }
                .hero-stat:hover {
                    transform: translateY(-3px);
                    box-shadow: 0 8px 24px rgba(201,96,72,0.14);
                }
                .hero-stat__value {
                    font-size: 1.5rem;
                    font-weight: 800;
                    color: #C96048;
                    line-height: 1;
                }
                .hero-stat__label {
                    font-size: .7rem;
                    color: hsl(var(--muted-foreground));
                    text-transform: uppercase;
                    letter-spacing: .12em;
                    margin-top: .2rem;
                }

                /* Divider dot between stats */
                .hero-stat-divider {
                    width: 4px; height: 4px;
                    border-radius: 50%;
                    background: hsl(var(--border));
                    align-self: center;
                }

                /* Pulse dot on brand badge */
                @keyframes pulse-ring {
                    0%   { transform: scale(.9); opacity: .7; }
                    70%  { transform: scale(1.4); opacity: 0; }
                    100% { opacity: 0; }
                }
                .pulse-dot::after {
                    content: '';
                    position: absolute;
                    inset: -4px;
                    border-radius: 50%;
                    border: 2px solid #C96048;
                    animation: pulse-ring 1.8s ease-out infinite;
                }
            `}</style>

            <section className="w-full">
                <header className="mb-10">
                    {/* Brand badge */}
                    <div className="mb-12 flex items-center gap-3">
                        <div className="relative inline-flex pulse-dot">
                            <img
                                src={logo}
                                alt="EatEase logo"
                                width={32}
                                height={32}
                                className="relative z-10"
                            />
                        </div>
                        <p className="text-base uppercase tracking-[0.25em] text-[#C96048] font-bold">
                            <ShinyText
                                text="EatEase Restaurant"
                                speed={2}
                                delay={0}
                                color="#ff8c2e"
                                shineColor="#ffffff"
                                spread={120}
                                direction="left"
                                yoyo={false}
                                pauseOnHover={false}
                                disabled={false}
                            />
                        </p>
                    </div>

                    {/* Headline */}
                    <h1 className="text-5xl text-foreground md:text-7xl uppercase font-bold tracking-tighter leading-none">
                        <span className="block">Ẩm thực</span>
                        <span className="block hero-shimmer-text">
                            tinh hoa
                        </span>
                        <span className="block">Hương vị đẳng cấp</span>
                    </h1>
                </header>

                {/* CTA */}
                <div className="mb-10 flex items-center justify-center">
                    <BorderGlow
                        edgeSensitivity={30}
                        glowColor="40 80 80"
                        backgroundColor="#461c10"
                        borderRadius={28}
                        glowRadius={40}
                        glowIntensity={1}
                        coneSpread={25}
                        animated={true}
                        colors={['#ff7300', '#f34a12', '#c10622']}
                    >
                        <button
                            onClick={() => {
                                handleExploreClick();
                                scrollToTop();
                            }}
                            className="rounded-full px-8 py-3 text-white"
                        >
                            Khám phá ngay
                        </button>
                    </BorderGlow>
                </div>

                {/* Stats bar */}
                <div className="flex flex-wrap items-center justify-center gap-3">
                    {stats.map((s, i) => (
                        <React.Fragment key={s.label}>
                            <div className="hero-stat">
                                <span className="hero-stat__value">
                                    {s.value}
                                </span>
                                <span className="hero-stat__label">
                                    {s.label}
                                </span>
                            </div>
                            {i < stats.length - 1 && (
                                <span className="hero-stat-divider hidden sm:block" />
                            )}
                        </React.Fragment>
                    ))}
                </div>
            </section>
        </>
    );
};
