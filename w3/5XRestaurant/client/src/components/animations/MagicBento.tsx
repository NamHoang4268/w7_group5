import React, { useRef, useEffect, useState } from 'react';

export interface BentoCardProps {
    color?: string;
    title?: string;
    description?: string;
    label?: string;
    icon?: React.ReactNode;
    children?: React.ReactNode;
    className?: string;
    /** Span columns in the grid (e.g. 2 => grid-column: span 2) */
    colSpan?: number;
    /** Span rows in the grid */
    rowSpan?: number;
    /** Background image URL */
    image?: string;
    /** Badge text to display at bottom */
    badge?: string;
    /** Badge color variant */
    badgeColor?: 'default' | 'green';
    /** Number of stars to display (for rating cards) */
    stars?: number;
}

export interface BentoProps {
    textAutoHide?: boolean;
    enableBorderGlow?: boolean;
    enableTilt?: boolean;
    glowColor?: string;
    clickEffect?: boolean;
    /** Custom card data — if provided, overrides the built-in demo data */
    cards?: BentoCardProps[];
    /** Extra className applied to the bento-grid wrapper */
    className?: string;
}

const DEFAULT_GLOW_COLOR = '132, 0, 255';
const MOBILE_BREAKPOINT = 768;

const defaultCardData: BentoCardProps[] = [
    {
        color: '#060010',
        title: 'Analytics',
        description: 'Track user behavior',
        label: 'Insights',
    },
    {
        color: '#060010',
        title: 'Dashboard',
        description: 'Centralized data view',
        label: 'Overview',
    },
    {
        color: '#060010',
        title: 'Collaboration',
        description: 'Work together seamlessly',
        label: 'Teamwork',
    },
    {
        color: '#060010',
        title: 'Automation',
        description: 'Streamline workflows',
        label: 'Efficiency',
    },
    {
        color: '#060010',
        title: 'Integration',
        description: 'Connect favorite tools',
        label: 'Connectivity',
    },
    {
        color: '#060010',
        title: 'Security',
        description: 'Enterprise-grade protection',
        label: 'Protection',
    },
];

export const useMobileDetection = () => {
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);
    return isMobile;
};

/* ─── Card ──────────────────────────────────────────────────────────────── */
export const BentoCard: React.FC<{
    card: BentoCardProps;
    enableTilt?: boolean;
    clickEffect?: boolean;
    glowColor?: string;
    textAutoHide?: boolean;
    isMobile?: boolean;
    enableBorderGlow?: boolean;
}> = ({
    card,
    enableTilt,
    clickEffect,
    glowColor = DEFAULT_GLOW_COLOR,
    textAutoHide,
    isMobile,
    enableBorderGlow = true,
}) => {
    const cardRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = cardRef.current;
        if (!el || isMobile) return;

        const handleMouseMove = (e: MouseEvent) => {
            const rect = el.getBoundingClientRect();
            el.style.setProperty(
                '--glow-x',
                `${((e.clientX - rect.left) / rect.width) * 100}%`
            );
            el.style.setProperty(
                '--glow-y',
                `${((e.clientY - rect.top) / rect.height) * 100}%`
            );
            el.style.setProperty('--glow-intensity', '1');

            if (enableTilt) {
                const rx =
                    ((e.clientY - rect.top - rect.height / 2) /
                        (rect.height / 2)) *
                    -6;
                const ry =
                    ((e.clientX - rect.left - rect.width / 2) /
                        (rect.width / 2)) *
                    6;
                el.style.setProperty('--tilt-x', `${rx}deg`);
                el.style.setProperty('--tilt-y', `${ry}deg`);
            }
        };

        const handleMouseLeave = () => {
            el.style.setProperty('--glow-intensity', '0');
            if (enableTilt) {
                el.style.setProperty('--tilt-x', '0deg');
                el.style.setProperty('--tilt-y', '0deg');
            }
        };

        const handleClick = (e: MouseEvent) => {
            if (!clickEffect) return;
            const rect = el.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const r = Math.max(
                Math.hypot(x, y),
                Math.hypot(x - rect.width, y),
                Math.hypot(x, y - rect.height),
                Math.hypot(x - rect.width, y - rect.height)
            );
            const ripple = document.createElement('span');
            ripple.style.cssText = `
        position:absolute; border-radius:50%; pointer-events:none; z-index:10;
        width:${r * 2}px; height:${r * 2}px;
        left:${x - r}px; top:${y - r}px;
        background:radial-gradient(circle, rgba(${glowColor},.3) 0%, transparent 70%);
        animation: bento-ripple .7s ease-out forwards;
      `;
            el.appendChild(ripple);
            ripple.addEventListener('animationend', () => ripple.remove(), {
                once: true,
            });
        };

        el.addEventListener('mousemove', handleMouseMove);
        el.addEventListener('mouseleave', handleMouseLeave);
        el.addEventListener('click', handleClick);
        return () => {
            el.removeEventListener('mousemove', handleMouseMove);
            el.removeEventListener('mouseleave', handleMouseLeave);
            el.removeEventListener('click', handleClick);
        };
    }, [isMobile, enableTilt, clickEffect, glowColor]);

    const gridStyles: React.CSSProperties = {};
    if (card.colSpan) gridStyles.gridColumn = `span ${card.colSpan}`;
    if (card.rowSpan) gridStyles.gridRow = `span ${card.rowSpan}`;

    return (
        <div
            ref={cardRef}
            className={`bento-card${enableTilt ? ' bento-card--tilt' : ''}${enableBorderGlow ? ' bento-card--glow' : ''}${card.className ? ` ${card.className}` : ''}`}
            style={
                {
                    backgroundColor: card.color ?? '#060010',
                    '--glow-x': '50%',
                    '--glow-y': '50%',
                    '--glow-intensity': '0',
                    '--tilt-x': '0deg',
                    '--tilt-y': '0deg',
                    ...gridStyles,
                } as React.CSSProperties
            }
        >
            {card.children ? (
                card.children
            ) : (
                <>
                    {/* Background image with overlay */}
                    {card.image && (
                        <div
                            className="bento-card__bg-image"
                            style={{ backgroundImage: `url(${card.image})` }}
                        />
                    )}

                    <div className="bento-card__header">
                        {card.icon && (
                            <span className="bento-card__icon">{card.icon}</span>
                        )}
                        <span className="bento-card__label">{card.label}</span>
                    </div>

                    <div className="bento-card__content">
                        <h3
                            className={`bento-card__title${textAutoHide ? ' clamp-1' : ''}`}
                            style={{ whiteSpace: 'pre-line' }}
                        >
                            {card.title}
                        </h3>

                        {/* Stars for rating cards */}
                        {card.stars && (
                            <div className="bento-card__stars">
                                {Array.from({ length: card.stars }).map((_, i) => (
                                    <svg
                                        key={i}
                                        className="star-icon"
                                        viewBox="0 0 24 24"
                                        fill="currentColor"
                                    >
                                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                    </svg>
                                ))}
                            </div>
                        )}

                        <p
                            className={`bento-card__desc${textAutoHide ? ' clamp-2' : ''}`}
                        >
                            {card.description}
                        </p>

                        {/* Badge at bottom */}
                        {card.badge && (
                            <div
                                className={`bento-card__badge ${card.badgeColor === 'green' ? 'bento-card__badge--green' : ''}`}
                            >
                                {card.badge}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

/* ─── Grid spotlight hook ───────────────────────────────────────────────── */
export const useGridSpotlight = (
    gridRef: React.RefObject<HTMLDivElement | null>,
    isMobile: boolean
) => {
    useEffect(() => {
        const el = gridRef.current;
        if (!el || isMobile) return;

        const handleMouseMove = (e: MouseEvent) => {
            const rect = el.getBoundingClientRect();
            el.style.setProperty('--mx', `${e.clientX - rect.left}px`);
            el.style.setProperty('--my', `${e.clientY - rect.top}px`);
            el.style.setProperty('--spotlight-opacity', '1');
        };

        const handleMouseLeave = () => {
            el.style.setProperty('--spotlight-opacity', '0');
        };

        el.addEventListener('mousemove', handleMouseMove);
        el.addEventListener('mouseleave', handleMouseLeave);
        return () => {
            el.removeEventListener('mousemove', handleMouseMove);
            el.removeEventListener('mouseleave', handleMouseLeave);
        };
    }, [gridRef, isMobile]);
};

/* ─── Shared CSS injector ───────────────────────────────────────────────── */
export const MagicBentoStyles: React.FC<{
    glowColor: string;
    enableBorderGlow: boolean;
}> = ({ glowColor, enableBorderGlow }) => (
    <style>{`
    /* ── Layout ──────────────────────────────────────── */
    .bento-grid {
      position: relative;
      display: grid;
      gap: .5rem;
      padding: .75rem;
      max-width: 54rem;
      width: 90%;
      margin: 0 auto;
      user-select: none;
      grid-template-columns: 1fr;
      --mx: 50%; --my: 50%;
      --spotlight-opacity: 0;
    }
    @media (min-width: 600px)  { .bento-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (min-width: 1024px) {
      .bento-grid { grid-template-columns: repeat(4, 1fr); }
      .bento-grid .bento-card:nth-child(3) { grid-column: span 2; grid-row: span 2; }
      .bento-grid .bento-card:nth-child(4) { grid-column: 1 / span 2; grid-row: 2 / span 2; }
      .bento-grid .bento-card:nth-child(6) { grid-column: 4; grid-row: 3; }
    }

    /* Spotlight toàn grid */
    .bento-grid::before {
      content: '';
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 2;
      opacity: var(--spotlight-opacity);
      transition: opacity .4s ease;
      background: radial-gradient(
        600px circle at var(--mx) var(--my),
        rgba(${glowColor}, .12) 0%,
        rgba(${glowColor}, .05) 35%,
        transparent 65%
      );
    }

    /* ── Card base ───────────────────────────────────── */
    .bento-card {
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      aspect-ratio: 4 / 3;
      min-height: 200px;
      width: 100%;
      padding: 1.25rem;
      border-radius: 20px;
      border: 1px solid #392e4e;
      color: #fff;
      font-weight: 300;
      cursor: pointer;
      transition: transform .2s ease, box-shadow .2s ease;
    }
    .bento-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(0,0,0,.25);
    }

    /* Background image */
    .bento-card__bg-image {
      position: absolute;
      inset: 0;
      background-size: cover;
      background-position: center;
      opacity: 0.15;
      transition: opacity .3s ease, transform .3s ease;
      z-index: 0;
    }
    .bento-card:hover .bento-card__bg-image {
      opacity: 0.25;
      transform: scale(1.05);
    }

    /* Ensure content is above background */
    .bento-card__header,
    .bento-card__content {
      position: relative;
      z-index: 1;
    }

    /* Tilt */
    .bento-card--tilt {
      transform-style: preserve-3d;
      transition: transform .08s linear, box-shadow .2s ease;
    }
    .bento-card--tilt:hover {
      transform: rotateX(var(--tilt-x)) rotateY(var(--tilt-y)) translateY(-2px);
    }

    /* Border glow */
    ${
        enableBorderGlow
            ? `
    .bento-card--glow::after {
      content: '';
      position: absolute;
      inset: 0;
      padding: 1px;
      background: radial-gradient(
        200px circle at var(--glow-x) var(--glow-y),
        rgba(${glowColor}, calc(var(--glow-intensity) * .9)) 0%,
        rgba(${glowColor}, calc(var(--glow-intensity) * .4)) 35%,
        transparent 65%
      );
      border-radius: inherit;
      -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
      -webkit-mask-composite: xor;
      mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
      mask-composite: exclude;
      pointer-events: none;
      z-index: 1;
    }
    .bento-card--glow:hover {
      box-shadow: 0 4px 20px rgba(46,24,78,.4), 0 0 30px rgba(${glowColor},.15);
    }
    `
            : ''
    }

    /* ── Click ripple ────────────────────────────────── */
    @keyframes bento-ripple {
      from { transform: scale(0); opacity: 1; }
      to   { transform: scale(1); opacity: 0; }
    }

    /* ── Typography ──────────────────────────────────── */
    .bento-card__header  { display: flex; align-items: center; gap: .5rem; }
    .bento-card__icon    { font-size: 1.5rem; line-height: 1; }
    .bento-card__label   { font-size: .875rem; opacity: .7; }
    .bento-card__content { display: flex; flex-direction: column; gap: .5rem; }
    .bento-card__title   { font-size: 1.125rem; font-weight: 600; margin: 0; line-height: 1.3; }
    .bento-card__desc    { font-size: .8125rem; line-height: 1.5; opacity: .8; margin: 0; }
    
    /* Stars */
    .bento-card__stars {
      display: flex;
      gap: .25rem;
      margin: -.25rem 0;
    }
    .star-icon {
      width: 1rem;
      height: 1rem;
      color: #fbbf24;
      filter: drop-shadow(0 1px 2px rgba(251,191,36,.3));
    }

    /* Badge */
    .bento-card__badge {
      display: inline-flex;
      align-items: center;
      gap: .35rem;
      font-size: .7rem;
      padding: .35rem .75rem;
      border-radius: 999px;
      background: rgba(255,255,255,.1);
      backdrop-filter: blur(8px);
      border: 1px solid rgba(255,255,255,.15);
      margin-top: .25rem;
      align-self: flex-start;
      font-weight: 500;
      letter-spacing: .02em;
    }
    .bento-card__badge--green {
      background: rgba(34,197,94,.15);
      border-color: rgba(34,197,94,.3);
      color: #86efac;
    }

    .clamp-1 { display:-webkit-box; -webkit-box-orient:vertical; -webkit-line-clamp:1; overflow:hidden; }
    .clamp-2 { display:-webkit-box; -webkit-box-orient:vertical; -webkit-line-clamp:2; overflow:hidden; }
  `}</style>
);

/* ─── Root ──────────────────────────────────────────────────────────────── */
const MagicBento: React.FC<BentoProps> = ({
    textAutoHide = true,
    enableBorderGlow = true,
    enableTilt = false,
    glowColor = DEFAULT_GLOW_COLOR,
    clickEffect = true,
    cards,
    className = '',
}) => {
    const gridRef = useRef<HTMLDivElement>(null);
    const isMobile = useMobileDetection();
    useGridSpotlight(gridRef, isMobile);

    const cardData = cards ?? defaultCardData;

    return (
        <>
            <MagicBentoStyles
                glowColor={glowColor}
                enableBorderGlow={enableBorderGlow}
            />

            <div ref={gridRef} className={`bento-grid ${className}`}>
                {cardData.map((card, i) => (
                    <BentoCard
                        key={i}
                        card={card}
                        enableTilt={enableTilt}
                        clickEffect={clickEffect}
                        glowColor={glowColor}
                        textAutoHide={textAutoHide}
                        isMobile={isMobile}
                        enableBorderGlow={enableBorderGlow}
                    />
                ))}
            </div>
        </>
    );
};

export default MagicBento;
