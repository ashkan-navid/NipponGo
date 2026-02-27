'use client';

import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { apiPost } from '../lib/apiClient';
import useToastStore from '../store/toastStore';
import useAuthStore from '../store/authStore';
import { hapticSuccess, hapticError } from '../lib/haptics';

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export default function NotificationPrompt() {
    const [show, setShow] = useState(false);
    const [vapidPublicKey, setVapidPublicKey] = useState(null);
    const { addToast } = useToastStore();
    const { isAuthenticated } = useAuthStore();

    useEffect(() => {
        if (!isAuthenticated) return;

        const checkPermission = async () => {
            // Check browser support
            if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
                return;
            }

            const permission = Notification.permission;
            const dismissed = localStorage.getItem('notification-prompt-dismissed');

            // Only show if permission hasn't been decided and user hasn't dismissed
            if (permission !== 'default' || dismissed) return;

            try {
                const res = await fetch('/api/webpush', { credentials: 'same-origin' });
                if (res.ok) {
                    const data = await res.json();
                    if (data.vapidPublicKey) {
                        setVapidPublicKey(data.vapidPublicKey);
                        setShow(true);
                    }
                }
            } catch (err) {
                console.error('Failed to fetch VAPID key:', err);
            }
        };

        // Delay to not interrupt initial app experience
        const timer = setTimeout(checkPermission, 8000);
        return () => clearTimeout(timer);
    }, [isAuthenticated]);

    const handleEnable = async () => {
        try {
            const permission = await Notification.requestPermission();

            if (permission === 'granted') {
                hapticSuccess();

                const registration = await navigator.serviceWorker.ready;
                const subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
                });

                const res = await apiPost('/api/webpush', { subscription: subscription.toJSON() });
                if (res.ok) {
                    addToast('Benachrichtigungen aktiviert', 'success');
                } else {
                    addToast('Fehler beim Speichern', 'error');
                }
            } else {
                hapticError();
                addToast('Benachrichtigungen abgelehnt', 'info');
            }

            setShow(false);
        } catch (error) {
            console.error('Failed to subscribe:', error);
            hapticError();
            addToast('Fehler bei der Aktivierung', 'error');
            setShow(false);
        }
    };

    const handleDismiss = () => {
        localStorage.setItem('notification-prompt-dismissed', 'true');
        setShow(false);
    };

    if (!show) return null;

    return (
        <div className="fixed bottom-20 left-4 right-4 z-50 animate-slide-up">
            <div className="bg-white dark:bg-ios-gray-800 rounded-ios-xl shadow-ios-lg
                          border border-ios-gray-200 dark:border-ios-gray-700 p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                        <div className="p-2 bg-ios-blue/10 rounded-ios flex-shrink-0">
                            <Bell className="w-5 h-5 text-ios-blue" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-ios-gray-950 dark:text-white text-[15px]">
                                Benachrichtigungen
                            </h3>
                            <p className="text-sm text-ios-gray-500 dark:text-ios-gray-400 mt-0.5">
                                Erhalte Updates von Freunden und zu Einladungen
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleDismiss}
                        className="p-1 -m-1 text-ios-gray-400 hover:text-ios-gray-600
                                 dark:hover:text-ios-gray-300 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={handleEnable}
                        className="flex-1 py-2.5 bg-ios-blue text-white rounded-ios font-medium text-sm
                                 transition-all active:scale-95"
                    >
                        Aktivieren
                    </button>
                    <button
                        onClick={handleDismiss}
                        className="px-4 py-2.5 bg-ios-gray-100 dark:bg-ios-gray-700
                                 text-ios-gray-600 dark:text-ios-gray-300 rounded-ios font-medium text-sm
                                 transition-all active:scale-95"
                    >
                        Später
                    </button>
                </div>
            </div>
        </div>
    );
}
