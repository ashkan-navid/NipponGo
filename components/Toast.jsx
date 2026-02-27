'use client';

import { useEffect, useRef } from 'react';
import { CheckCircle2, XCircle, Info } from 'lucide-react';
import useToastStore from '../store/toastStore';

const ICONS = {
    success: CheckCircle2,
    error: XCircle,
    info: Info,
};

const STYLES = {
    success: 'bg-ios-green/95 text-white',
    error: 'bg-ios-red/95 text-white',
    info: 'bg-ios-blue/95 text-white',
};

function ToastItem({ toast, onDismiss }) {
    const ref = useRef(null);
    const startX = useRef(0);
    const currentX = useRef(0);
    const Icon = ICONS[toast.type] || ICONS.info;

    const handleTouchStart = (e) => {
        startX.current = e.touches[0].clientX;
    };

    const handleTouchMove = (e) => {
        currentX.current = e.touches[0].clientX;
        const diff = currentX.current - startX.current;
        if (ref.current) {
            ref.current.style.transform = `translateX(${diff}px)`;
            ref.current.style.opacity = Math.max(0, 1 - Math.abs(diff) / 200);
        }
    };

    const handleTouchEnd = () => {
        const diff = Math.abs(currentX.current - startX.current);
        if (diff > 80) {
            onDismiss(toast.id);
        } else if (ref.current) {
            ref.current.style.transform = '';
            ref.current.style.opacity = '';
        }
    };

    return (
        <div
            ref={ref}
            role="alert"
            aria-live="polite"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className={`flex items-center gap-3 px-4 py-3 rounded-ios-xl shadow-ios-lg backdrop-blur-md
                       transition-all duration-300 animate-slide-up ${STYLES[toast.type] || STYLES.info}`}
            style={{ willChange: 'transform, opacity' }}
        >
            <Icon className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium flex-1">{toast.message}</p>
            <button
                onClick={() => onDismiss(toast.id)}
                className="p-1 rounded-full hover:bg-white/20 transition-colors flex-shrink-0"
                aria-label="Schließen"
            >
                <XCircle className="w-4 h-4 opacity-70" />
            </button>
        </div>
    );
}

export default function ToastContainer() {
    const { toasts, removeToast } = useToastStore();

    if (toasts.length === 0) return null;

    return (
        <div className="fixed bottom-20 left-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
            {toasts.map((toast) => (
                <div key={toast.id} className="pointer-events-auto">
                    <ToastItem toast={toast} onDismiss={removeToast} />
                </div>
            ))}
        </div>
    );
}
