import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { ScrollProvider, useScrollContext } from './ScrollContext';

// Mock IntersectionObserver
const mockIntersectionObserver = jest.fn();
mockIntersectionObserver.mockReturnValue({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
});
window.IntersectionObserver = mockIntersectionObserver;

// Test component that uses the scroll context
const TestComponent = () => {
    const { activeSection, scrollToSection, registerSection } = useScrollContext();
    
    React.useEffect(() => {
        const element = document.createElement('div');
        element.id = 'test-section';
        document.body.appendChild(element);
        
        registerSection('test-section', element);
        
        return () => {
            document.body.removeChild(element);
        };
    }, [registerSection]);

    return (
        <div>
            <div data-testid="active-section">{activeSection}</div>
            <button 
                onClick={() => scrollToSection('test-section')}
                data-testid="scroll-button"
            >
                Scroll to Test Section
            </button>
        </div>
    );
};

describe('ScrollContext', () => {
    beforeEach(() => {
        // Mock scrollTo
        window.scrollTo = jest.fn();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('provides scroll context values', () => {
        render(
            <ScrollProvider>
                <TestComponent />
            </ScrollProvider>
        );

        expect(screen.getByTestId('active-section')).toBeInTheDocument();
        expect(screen.getByTestId('scroll-button')).toBeInTheDocument();
    });

    test('throws error when used outside provider', () => {
        // Suppress console.error for this test
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        
        expect(() => {
            render(<TestComponent />);
        }).toThrow('useScrollContext must be used within a ScrollProvider');
        
        consoleSpy.mockRestore();
    });

    test('registers sections and sets up IntersectionObserver', () => {
        render(
            <ScrollProvider>
                <TestComponent />
            </ScrollProvider>
        );

        expect(mockIntersectionObserver).toHaveBeenCalledWith(
            expect.any(Function),
            expect.objectContaining({
                threshold: [0.1, 0.5, 0.9],
                rootMargin: '-20% 0px -20% 0px'
            })
        );
    });

    test('scrollToSection calls window.scrollTo', () => {
        render(
            <ScrollProvider>
                <TestComponent />
            </ScrollProvider>
        );

        const scrollButton = screen.getByTestId('scroll-button');
        
        act(() => {
            scrollButton.click();
        });

        expect(window.scrollTo).toHaveBeenCalledWith({
            top: expect.any(Number),
            behavior: 'smooth'
        });
    });
});

/**
 * **Validates: Requirements 1.1, 1.3, 1.4**
 * 
 * Property: ScrollContext provides consistent scroll state management
 * This test verifies that the ScrollContext properly manages scroll state,
 * provides navigation functionality, and integrates IntersectionObserver
 * for performance optimization as specified in the requirements.
 */