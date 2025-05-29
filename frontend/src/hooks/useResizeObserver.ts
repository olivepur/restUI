import { useEffect, useRef, useCallback } from 'react';

interface ResizeObserverCallback {
    (entry: ResizeObserverEntry): void;
}

<<<<<<< HEAD
export const useResizeObserver = <T extends HTMLElement = HTMLElement>(callback: ResizeObserverCallback, debounceMs: number = 100) => {
    const elementRef = useRef<T | null>(null);
=======
export const useResizeObserver = (callback: ResizeObserverCallback, debounceMs: number = 100) => {
    const elementRef = useRef<HTMLElement | null>(null);
>>>>>>> origin/feature/refactoring-flowchart
    const observerRef = useRef<ResizeObserver | null>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const frameRef = useRef<number | null>(null);

    // Wrap callback in useCallback to maintain reference stability
    const stableCallback = useCallback(callback, [callback]);

    useEffect(() => {
        const currentElement = elementRef.current;
        if (!currentElement) return;

        // Cleanup function for the debounce timeout and animation frame
        const cleanup = () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
            if (frameRef.current) {
                cancelAnimationFrame(frameRef.current);
                frameRef.current = null;
            }
        };

        // Create the observer with debouncing and RAF
        observerRef.current = new ResizeObserver((entries) => {
            cleanup();
            
            // Use requestAnimationFrame to batch resize notifications
            frameRef.current = requestAnimationFrame(() => {
                timeoutRef.current = setTimeout(() => {
                    if (entries[0]) {
                        stableCallback(entries[0]);
                    }
                }, debounceMs);
            });
        });

        // Start observing
        observerRef.current.observe(currentElement, { box: 'border-box' });

        // Cleanup function
        return () => {
            cleanup();
            if (observerRef.current) {
                observerRef.current.disconnect();
                observerRef.current = null;
            }
        };
    }, [stableCallback, debounceMs]);

    return elementRef;
}; 