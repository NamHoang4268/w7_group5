import { useEffect, useRef, useState } from 'react';

/**
 * useScrollReveal
 * Theo dõi khi phần tử xuất hiện trong viewport bằng IntersectionObserver.
 * Trả về [ref, isVisible] — gán ref cho element cần animate,
 * dùng isVisible để toggle class CSS.
 *
 * @param {object} options
 * @param {number}  options.threshold   - % diện tích element cần hiển thị (0–1), mặc định 0.15
 * @param {string}  options.rootMargin  - offset viewport, mặc định '0px 0px -60px 0px'
 * @param {boolean} options.once        - chỉ trigger 1 lần, mặc định true
 */
export function useScrollReveal({
    threshold = 0.15,
    rootMargin = '0px 0px -60px 0px',
    once = true,
} = {}) {
    const ref = useRef(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    if (once) observer.unobserve(el);
                } else if (!once) {
                    setIsVisible(false);
                }
            },
            { threshold, rootMargin }
        );

        observer.observe(el);
        return () => observer.disconnect();
    }, [threshold, rootMargin, once]);

    return [ref, isVisible];
}

/**
 * useScrollRevealGroup
 * Dành cho danh sách phần tử — mỗi item sẽ animate với delay stagger.
 * Trả về [containerRef, visibleSet] — visibleSet là Set chứa index của các item đã hiện.
 */
export function useScrollRevealGroup({
    threshold = 0.1,
    rootMargin = '0px 0px -40px 0px',
    staggerMs = 120,
} = {}) {
    const containerRef = useRef(null);
    const [visibleIndexes, setVisibleIndexes] = useState(new Set());

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const children = Array.from(container.children);
        const observers = [];

        children.forEach((child, i) => {
            const observer = new IntersectionObserver(
                ([entry]) => {
                    if (entry.isIntersecting) {
                        setTimeout(() => {
                            setVisibleIndexes(prev => new Set([...prev, i]));
                        }, i * staggerMs);
                        observer.unobserve(child);
                    }
                },
                { threshold, rootMargin }
            );
            observer.observe(child);
            observers.push(observer);
        });

        return () => observers.forEach(o => o.disconnect());
    }, [threshold, rootMargin, staggerMs]);

    return [containerRef, visibleIndexes];
}
