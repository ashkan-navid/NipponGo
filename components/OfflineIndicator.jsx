'use client';

import { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';

export default function OfflineIndicator() {
    const [isOnline, setIsOnline] = useState(true);
    const [lastOnline, setLastOnline] = useState(null);

    useEffect(() => {
        // Initial check
        setIsOnline(navigator.onLine);

        const handleOnline = () => {
            setIsOnline(true);
        };

        const handleOffline = () => {
            setIsOnline(false);
            setLastOnline(new Date());
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    if (isOnline) return null;

    const formatTime = (date) => {
        if (!date) return 'Unbekannt';
        return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-safe">
            <div
                role="status"
                aria-live="polite"
                className="m-2 px-4 py-2 bg-ios-orange/90 backdrop-blur-ios text-white rounded-full
                      flex items-center gap-2 text-sm font-medium shadow-ios animate-fade-in"
            >
                <WifiOff className="w-4 h-4" />
                <span>
                    Offline-Modus {lastOnline && `- Daten von ${formatTime(lastOnline)}`}
                </span>
            </div>
        </div>
    );
}
