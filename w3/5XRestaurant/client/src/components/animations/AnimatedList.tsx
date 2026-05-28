import React, {
    useRef,
    useState,
    useEffect,
    useCallback,
    ReactNode,
    MouseEventHandler,
    UIEvent,
} from 'react';
import { motion, useInView } from 'motion/react';

interface CategoryItem {
    _id: string;
    name: string;
    image: string;
}

interface AnimatedItemProps {
    children: ReactNode;
    delay?: number;
    index: number;
    onMouseEnter?: MouseEventHandler<HTMLDivElement>;
    onClick?: MouseEventHandler<HTMLDivElement>;
}

const AnimatedItem: React.FC<AnimatedItemProps> = ({
    children,
    delay = 0,
    index,
    onMouseEnter,
    onClick,
}) => {
    const ref = useRef<HTMLDivElement>(null);
    const inView = useInView(ref, { amount: 0.5, once: false });
    return (
        <motion.div
            ref={ref}
            data-index={index}
            onMouseEnter={onMouseEnter}
            onClick={onClick}
            initial={{ scale: 0.7, opacity: 0 }}
            animate={
                inView ? { scale: 1, opacity: 1 } : { scale: 0.7, opacity: 0 }
            }
            transition={{ duration: 0.2, delay }}
            className="cursor-pointer"
        >
            {children}
        </motion.div>
    );
};

interface AnimatedListProps {
    items?: CategoryItem[];
    onItemSelect?: (item: CategoryItem, index: number) => void;
    showGradients?: boolean;
    enableArrowNavigation?: boolean;
    className?: string;
    itemClassName?: string;
    displayScrollbar?: boolean;
    initialSelectedIndex?: number;
}

const AnimatedList: React.FC<AnimatedListProps> = ({
    items = [],
    onItemSelect,
    showGradients = true,
    enableArrowNavigation = true,
    className = '',
    itemClassName = '',
    displayScrollbar = true,
    initialSelectedIndex = -1,
}) => {
    const listRef = useRef<HTMLDivElement>(null);
    const [selectedIndex, setSelectedIndex] =
        useState<number>(initialSelectedIndex);
    const [keyboardNav, setKeyboardNav] = useState<boolean>(false);
    const [topGradientOpacity, setTopGradientOpacity] = useState<number>(0);
    const [bottomGradientOpacity, setBottomGradientOpacity] =
        useState<number>(1);

    const handleItemMouseEnter = useCallback((index: number) => {
        setSelectedIndex(index);
    }, []);

    const handleItemClick = useCallback(
        (item: CategoryItem, index: number) => {
            setSelectedIndex(index);
            if (onItemSelect) {
                onItemSelect(item, index);
            }
        },
        [onItemSelect]
    );

    const handleScroll = (e: UIEvent<HTMLDivElement>) => {
        const { scrollTop, scrollHeight, clientHeight } =
            e.target as HTMLDivElement;
        setTopGradientOpacity(Math.min(scrollTop / 50, 1));
        const bottomDistance = scrollHeight - (scrollTop + clientHeight);
        setBottomGradientOpacity(
            scrollHeight <= clientHeight ? 0 : Math.min(bottomDistance / 50, 1)
        );
    };

    useEffect(() => {
        if (!enableArrowNavigation) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowDown' || (e.key === 'Tab' && !e.shiftKey)) {
                e.preventDefault();
                setKeyboardNav(true);
                setSelectedIndex((prev) =>
                    Math.min(prev + 1, items.length - 1)
                );
            } else if (e.key === 'ArrowUp' || (e.key === 'Tab' && e.shiftKey)) {
                e.preventDefault();
                setKeyboardNav(true);
                setSelectedIndex((prev) => Math.max(prev - 1, 0));
            } else if (e.key === 'Enter') {
                if (selectedIndex >= 0 && selectedIndex < items.length) {
                    e.preventDefault();
                    if (onItemSelect) {
                        onItemSelect(items[selectedIndex], selectedIndex);
                    }
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [items, selectedIndex, onItemSelect, enableArrowNavigation]);

    useEffect(() => {
        if (!keyboardNav || selectedIndex < 0 || !listRef.current) return;
        const container = listRef.current;
        const selectedItem = container.querySelector(
            `[data-index="${selectedIndex}"]`
        ) as HTMLElement | null;
        if (selectedItem) {
            const extraMargin = 50;
            const containerScrollTop = container.scrollTop;
            const containerHeight = container.clientHeight;
            const itemTop = selectedItem.offsetTop;
            const itemBottom = itemTop + selectedItem.offsetHeight;
            if (itemTop < containerScrollTop + extraMargin) {
                container.scrollTo({
                    top: itemTop - extraMargin,
                    behavior: 'smooth',
                });
            } else if (
                itemBottom >
                containerScrollTop + containerHeight - extraMargin
            ) {
                container.scrollTo({
                    top: itemBottom - containerHeight + extraMargin,
                    behavior: 'smooth',
                });
            }
        }
        setKeyboardNav(false);
    }, [selectedIndex, keyboardNav]);

    return (
        <div className={`relative w-full ${className}`}>
            <div
                ref={listRef}
                className={`max-h-[500px] overflow-y-auto p-4 ${
                    displayScrollbar
                        ? '[&::-webkit-scrollbar]:w-[6px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#C05E42]/40 [&::-webkit-scrollbar-thumb]:rounded-full'
                        : 'scrollbar-hide'
                }`}
                onScroll={handleScroll}
                style={{
                    scrollbarWidth: displayScrollbar ? 'thin' : 'none',
                    scrollbarColor: '#C05E42 transparent',
                }}
            >
                <div className="grid grid-cols-2 gap-4">
                    {items.map((item, index) => (
                        <AnimatedItem
                            key={item._id || index}
                            delay={index * 0.05}
                            index={index}
                            onMouseEnter={() => handleItemMouseEnter(index)}
                            onClick={() => handleItemClick(item, index)}
                        >
                            <div
                                className={`relative group overflow-hidden rounded-xl aspect-square bg-[#f7f3ee] border border-[#C05E42]/5 ${
                                    selectedIndex === index
                                        ? 'ring-2 ring-[#C05E42]/60'
                                        : ''
                                } ${itemClassName}`}
                            >
                                <img
                                    alt={item.name}
                                    src={item.image}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 opacity-80"
                                />
                                <div className="absolute inset-0 bg-[#1c1c19]/50 flex items-center justify-center">
                                    <span className="text-orange-50 text-lg md:text-xl font-bold text-center px-2">
                                        {item.name}
                                    </span>
                                </div>
                            </div>
                        </AnimatedItem>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AnimatedList;
