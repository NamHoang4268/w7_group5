import React, { useRef } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { valideURLConvert } from '@/utils/valideURLConvert';
import AnimatedList from '../animations/AnimatedList';
import {
    useMobileDetection,
    useGridSpotlight,
    MagicBentoStyles,
    BentoCard,
} from '../animations/MagicBento';

const BRAND_GLOW = '201, 96, 72'; // #C96048 rose-orange

export const BentoGrid = () => {
    const categoryData = useSelector((state) => state.product.allCategory);
    const navigate = useNavigate();
    const gridRef = useRef(null);
    const isMobile = useMobileDetection();
    useGridSpotlight(gridRef, isMobile);

    const handleRedirectProductListPage = (id, cat) => {
        const url = `/${valideURLConvert(cat)}-${id}`;
        navigate(url);
    };

    return (
        <>
            <MagicBentoStyles glowColor={BRAND_GLOW} enableBorderGlow={true} />

            {/* Spotlight wrapper */}
            <div
                ref={gridRef}
                className="relative grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-6 lg:gap-8 bento-outer-grid"
                style={{
                    '--mx': '50%',
                    '--my': '50%',
                    '--spotlight-opacity': '0',
                }}
            >
                {/* Outer spotlight overlay */}
                <style>{`
                    .bento-outer-grid {
                        position: relative;
                    }
                    .bento-outer-grid::before {
                        content: '';
                        position: absolute;
                        inset: 0;
                        pointer-events: none;
                        z-index: 2;
                        border-radius: 1rem;
                        opacity: var(--spotlight-opacity);
                        transition: opacity .4s ease;
                        background: radial-gradient(
                            700px circle at var(--mx) var(--my),
                            rgba(201, 96, 72, .09) 0%,
                            rgba(201, 96, 72, .04) 40%,
                            transparent 70%
                        );
                    }
                `}</style>

                {/* ── Large Hero Tile ── */}
                <HeroTile isMobile={isMobile} />

                {/* ── Cuisine Categories ── */}
                <div className="md:col-span-4 lg:col-span-2 w-full gap-2">
                    <h3 className="text-xl font-bold uppercase tracking-[0.2em] text-[#C96048] px-2 mb-3">
                        Danh mục món ăn
                    </h3>

                    <AnimatedList
                        items={categoryData}
                        onItemSelect={(category) =>
                            handleRedirectProductListPage(
                                category._id,
                                category.name
                            )
                        }
                    />
                </div>
            </div>
        </>
    );
};

/* ── Hero Tile has its own glow effect via BentoCard children ── */
const HeroTile = ({ isMobile }) => {
    const heroCard = {
        color: 'transparent',
        className: 'hero-bento-tile',
        children: <HeroTileContent />,
    };

    return (
        <div className="md:col-span-4 lg:col-span-4">
            <style>{`
                .hero-bento-tile {
                    aspect-ratio: 16 / 9 !important;
                    min-height: 340px !important;
                    padding: 0 !important;
                    border: 1px solid rgba(201, 96, 72, 0.18) !important;
                    background: hsl(var(--card) / .85) !important;
                    overflow: hidden !important;
                }
                @media (max-width: 768px) {
                    .hero-bento-tile { aspect-ratio: 4/3 !important; min-height: 240px !important; }
                }
            `}</style>
            <BentoCard
                card={heroCard}
                glowColor={BRAND_GLOW}
                clickEffect={true}
                enableBorderGlow={true}
                isMobile={isMobile}
            />
        </div>
    );
};

const HeroTileContent = () => (
    <div className="flex flex-col w-full h-full">
        {/* Image */}
        <div className="relative flex-grow overflow-hidden m-2 rounded-lg">
            <img
                alt="Signature Dish"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBWgGZdfPxA2f7-LfZaCL-Wl1sa2xU_XNDz4WNLJ-nOXy3aHsrqVZYDPMmD4R_A1cs3T8y5qrU-ilDzZSPfI9usFKYsOlIo6KGfeguP9kB9bk9b4JzOCBxFcpiBIfTqXdGo3X68Zko-G4IkdasU0LqQonAP7HUEbsbTeedgmmKjWXE7zj3fWFx1ii4Y8N3Rl7z--BL-X8Hm9LJCp3ezC3-7WFYWFqxnqkYH8bmT_1DyyfRPkRCJ9QlG-tyg096uXoBRM6giBTg878Th"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1E1008]/70 via-[#1E1008]/20 to-transparent flex items-end p-8">
                <div>
                    <span className="bg-[#C96048] text-white text-[10px] uppercase tracking-widest px-3 py-1 rounded-full mb-4 inline-block">
                        The Signature Selection
                    </span>
                    <h2 className="text-white text-3xl md:text-4xl font-bold mb-2">
                        Dry-Aged Wagyu with Truffle Jus
                    </h2>
                    <p className="text-white/80 text-sm max-w-lg hidden md:block">
                        Ethically sourced beef aged for 45 days, served with a
                        velvet-smooth reduction of seasonal black truffles.
                    </p>
                </div>
            </div>
        </div>
        {/* Footer bar */}
        <div className="px-6 py-4 flex justify-between items-center">
            <p className="text-white/75 text-xs md:text-sm uppercase tracking-widest font-semibold">
                Market Selection • Seasonal
            </p>
            <button className="bg-[#FAF2EE] text-[#1E1008] px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-[#C96048] hover:text-white transition-all duration-300">
                Discover More
            </button>
        </div>
    </div>
);
