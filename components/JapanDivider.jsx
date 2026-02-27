'use client';

/**
 * Japan-themed section dividers.
 * SVG-based, inline, no external assets — works offline.
 */

export function WaveDivider({ className = '' }) {
    return (
        <div className={`w-full overflow-hidden py-2 ${className}`} aria-hidden="true">
            <svg viewBox="0 0 400 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-6 text-ios-gray-200 dark:text-ios-gray-700">
                <path
                    d="M0 12 C50 0, 100 24, 150 12 C200 0, 250 24, 300 12 C350 0, 400 24, 400 12"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    fill="none"
                    strokeLinecap="round"
                />
            </svg>
        </div>
    );
}

export function ToriiDivider({ className = '' }) {
    return (
        <div className={`flex items-center justify-center gap-3 py-3 ${className}`} aria-hidden="true">
            <div className="flex-1 h-px bg-ios-gray-200 dark:bg-ios-gray-700" />
            <svg viewBox="0 0 32 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-6 text-ios-red/60 dark:text-ios-red/40">
                <rect x="2" y="4" width="28" height="2.5" rx="1" fill="currentColor" />
                <rect x="0" y="0" width="32" height="2" rx="1" fill="currentColor" />
                <rect x="5" y="6" width="2" height="18" rx="1" fill="currentColor" />
                <rect x="25" y="6" width="2" height="18" rx="1" fill="currentColor" />
                <rect x="5" y="12" width="22" height="1.5" rx="0.5" fill="currentColor" opacity="0.6" />
            </svg>
            <div className="flex-1 h-px bg-ios-gray-200 dark:bg-ios-gray-700" />
        </div>
    );
}

export function SakuraDivider({ className = '' }) {
    return (
        <div className={`flex items-center justify-center gap-3 py-3 ${className}`} aria-hidden="true">
            <div className="flex-1 h-px bg-pink-200 dark:bg-pink-900/40" />
            <span className="text-lg opacity-60">🌸</span>
            <div className="flex-1 h-px bg-pink-200 dark:bg-pink-900/40" />
        </div>
    );
}
