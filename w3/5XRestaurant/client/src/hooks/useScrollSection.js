import { useEffect, useRef } from 'react';
import { useScrollContext } from '../contexts/ScrollContext';

/**
 * Custom hook for registering a component as a scrollable section
 * @param {string} sectionId - Unique identifier for the section
 * @param {Object} options - Configuration options
 * @param {number} options.offset - Additional offset for scroll positioning
 * @returns {Object} - Ref to attach to the section element and section info
 */
export const useScrollSection = (sectionId, options = {}) => {
    const { registerSection } = useScrollContext();
    const sectionRef = useRef(null);
    const { offset = 0 } = options;

    useEffect(() => {
        const element = sectionRef.current;
        if (!element || !sectionId) return;

        // Register the section with the scroll context
        const cleanup = registerSection(sectionId, element);

        // Return cleanup function
        return cleanup;
    }, [sectionId, registerSection, offset]);

    return {
        sectionRef,
        sectionId
    };
};

export default useScrollSection;