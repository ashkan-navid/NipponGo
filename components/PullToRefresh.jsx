'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

/**
 * Pull-to-refresh wrapper.  Wrap around a scrollable list; when the user
 * pulls down from the very top, a refresh action is triggered.
 *
 * Props:
 *   onRefresh — async function called when the pull threshold is reached
 *   children  — the scrollable content
 */
export default function PullToRefresh({ onRefresh, children }) {
    const [pulling, setPulling] = useState(false);
    const [pullDistance, setPullDistance] = useState(0);
    const [refreshing, setRefreshing] = useState(false);
    const containerRef = useRef(null);
    const startY = useRef(0);
    const isPulling = useRef(false);

    const THRESHOLD = 80; // px to pull before triggering refresh

    const handleTouchStart = useCallback((e) => {
        const el = containerRef.current;
        if (!el || el.scrollTop > 0) return; // not at top
        startY.current = e.touches[0].clientY;
        isPulling.current = true;
    }, []);

    const handleTouchMove = useCallback((e) => {
        if (!isPulling.current) return;
        const el = containerRef.current;
        if (!el || el.scrollTop > 0) {
            isPulling.current = false;
            setPulling(false);
            setPullDistance(0);
            return;
        }

        const diff = e.touches[0].clientY - startY.current;
        if (diff > 0) {
            // Resistance curve — diminishing returns past threshold
            const distance = Math.min(diff * 0.5, 120);
            setPullDistance(distance);
            setPulling(true);
            if (diff > 10) e.preventDefault(); // prevent scroll while pulling
        } else {
            setPulling(false);
            setPullDistance(0);
        }
    }, []);

    const handleTouchEnd = useCallback(async () => {
        if (!isPulling.current) return;
        isPulling.current = false;

        if (pullDistance >= THRESHOLD && onRefresh) {
            setRefreshing(true);
            setPullDistance(THRESHOLD * 0.6); // Settle at partial height while loading
            try {
                await onRefresh();
            } finally {
                setRefreshing(false);
            }
        }

        setPulling(false);
        setPullDistance(0);
    }, [pullDistance, onRefresh]);

    const progress = Math.min(pullDistance / THRESHOLD, 1);
    const rotation = progress * 360;

    // Register touch events with { passive: false } to allow preventDefault
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        // Add event listeners with { passive: false }
        el.addEventListener('touchstart', handleTouchStart, { passive: false });
        el.addEventListener('touchmove', handleTouchMove, { passive: false });
        el.addEventListener('touchend', handleTouchEnd, { passive: false });

        return () => {
            el.removeEventListener('touchstart', handleTouchStart);
            el.removeEventListener('touchmove', handleTouchMove);
            el.removeEventListener('touchend', handleTouchEnd);
        };
    }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

    return (
        <div
            ref={containerRef}
            className="h-full overflow-auto"
        >
            {/* Pull indicator */}
            <div
                className="flex items-center justify-center overflow-hidden transition-all duration-200 ease-out"
                style={{
                    height: pulling || refreshing ? `${pullDistance}px` : '0px',
                    opacity: progress,
                }}
            >
                <div
                    className={`flex items-center justify-center w-8 h-8 rounded-full bg-ios-gray-100 dark:bg-ios-gray-800 shadow-sm ${refreshing ? 'animate-spin' : ''
                        }`}
                    style={!refreshing ? { transform: `rotate(${rotation}deg)` } : undefined}
                >
                    <RefreshCw className="w-4 h-4 text-ios-blue" strokeWidth={2.5} />
                </div>
            </div>

            {children}
        </div>
    );
}
