import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

// Create the ScrollContext
const ScrollContext = createContext(undefined);

// ScrollProvider component
export const ScrollProvider = ({ children }) => {
    const [activeSection, setActiveSection] = useState('');
    const sectionsRef = useRef(new Map());
    const observerRef = useRef(null);

    // Register a section with the scroll context
    const registerSection = useCallback((sectionId, element) => {
        if (!element) return;

        sectionsRef.current.set(sectionId, element);

        // Initialize IntersectionObserver if not already created
        if (!observerRef.current) {
            observerRef.current = new IntersectionObserver(
                (entries) => {
                    entries.forEach((entry) => {
                        const sectionId = entry.target.getAttribute('data-section-id');
                        
                        if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
                            setActiveSection(sectionId);
                        }
                    });
                },
                {
                    threshold: [0.1, 0.5, 0.9],
                    rootMargin: '-20% 0px -20% 0px'
                }
            );
        }

        // Set section ID attribute and observe the element
        element.setAttribute('data-section-id', sectionId);
        observerRef.current.observe(element);

        // Cleanup function
        return () => {
            if (observerRef.current && element) {
                observerRef.current.unobserve(element);
            }
            sectionsRef.current.delete(sectionId);
        };
    }, []);

    // Smooth scroll to a specific section
    const scrollToSection = useCallback((sectionId) => {
        const element = sectionsRef.current.get(sectionId);
        if (!element) return;

        const headerHeight = 120; // Account for fixed header
        const elementTop = element.offsetTop - headerHeight;

        window.scrollTo({
            top: elementTop,
            behavior: 'smooth'
        });

        // Update active section immediately for better UX
        setActiveSection(sectionId);
    }, []);

    // Cleanup observer on unmount
    useEffect(() => {
        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
        };
    }, []);

    const contextValue = {
        activeSection,
        scrollToSection,
        registerSection
    };

    return (
        <ScrollContext.Provider value={contextValue}>
            {children}
        </ScrollContext.Provider>
    );
};

// Custom hook to use the ScrollContext
export const useScrollContext = () => {
    const context = useContext(ScrollContext);
    
    if (context === undefined) {
        throw new Error('useScrollContext must be used within a ScrollProvider');
    }
    
    return context;
};

export default ScrollContext;