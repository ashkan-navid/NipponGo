'use client';

import { useEffect } from 'react';
import { MapPin, Sparkles } from 'lucide-react';
import useAuthStore from '../store/authStore';
import { resetOnboarding } from './Onboarding';

export default function WelcomeModal() {
    const { justRegistered, clearJustRegistered } = useAuthStore();

    useEffect(() => {
        // Cleanup on unmount
        return () => {
            if (justRegistered) {
                clearJustRegistered();
            }
        };
    }, [justRegistered, clearJustRegistered]);

    if (!justRegistered) return null;

    const handleStartOnboarding = () => {
        resetOnboarding();
        clearJustRegistered();
    };

    const handleSkip = () => {
        clearJustRegistered();
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[150] flex items-center justify-center p-4 animate-fade-in">
            <div
                className="bg-gradient-to-br from-ios-blue via-ios-purple to-ios-pink p-[2px] rounded-ios-3xl shadow-2xl animate-scale-in max-w-md w-full"
            >
                <div className="bg-white dark:bg-ios-gray-900 rounded-ios-3xl p-8 text-center">
                    {/* Logo */}
                    <div className="mb-6 relative">
                        <div className="w-24 h-24 mx-auto rounded-ios-2xl overflow-hidden bg-gradient-to-br from-ios-blue to-ios-purple p-[3px] shadow-ios-lg">
                            <div className="w-full h-full rounded-ios-2xl bg-white dark:bg-ios-gray-900 flex items-center justify-center">
                                <img
                                    src="/icons/icon-192x192.png"
                                    alt="NipponGo"
                                    className="w-20 h-20 object-cover rounded-ios-xl"
                                />
                            </div>
                        </div>
                        <div className="absolute -top-2 -right-2 w-8 h-8 bg-ios-green rounded-full flex items-center justify-center shadow-ios animate-bounce">
                            <Sparkles className="w-4 h-4 text-white" />
                        </div>
                    </div>

                    {/* Title */}
                    <h2 className="text-3xl font-bold text-ios-gray-950 dark:text-white mb-3 bg-gradient-to-r from-ios-blue via-ios-purple to-ios-pink bg-clip-text text-transparent">
                        Willkommen bei NipponGo!
                    </h2>

                    {/* Subtitle */}
                    <p className="text-ios-gray-600 dark:text-ios-gray-300 mb-6 leading-relaxed">
                        Dein persönlicher Japan-Reisebegleiter.
                    </p>

                    {/* Features */}
                    <div className="space-y-3 mb-8 text-left">
                        <div className="flex items-start gap-3 p-3 bg-ios-gray-50 dark:bg-ios-gray-800 rounded-ios-lg">
                            <div className="w-8 h-8 rounded-full bg-ios-blue/10 flex items-center justify-center flex-shrink-0">
                                <MapPin className="w-4 h-4 text-ios-blue" />
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm text-ios-gray-950 dark:text-white">
                                    Interaktive Karte
                                </h4>
                                <p className="text-xs text-ios-gray-600 dark:text-ios-gray-400">
                                    Plane Hotels, Flüge und Aktivitäten mit Offline-Karten
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 p-3 bg-ios-gray-50 dark:bg-ios-gray-800 rounded-ios-lg">
                            <div className="w-8 h-8 rounded-full bg-ios-purple/10 flex items-center justify-center flex-shrink-0">
                                <span className="text-lg">🗾</span>
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm text-ios-gray-950 dark:text-white">
                                    Japan-Kultur
                                </h4>
                                <p className="text-xs text-ios-gray-600 dark:text-ios-gray-400">
                                    Entdecke Phrasen, Knigge und lokale Besonderheiten
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 p-3 bg-ios-gray-50 dark:bg-ios-gray-800 rounded-ios-lg">
                            <div className="w-8 h-8 rounded-full bg-ios-green/10 flex items-center justify-center flex-shrink-0">
                                <span className="text-lg">👥</span>
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm text-ios-gray-950 dark:text-white">
                                    Teile mit Freunden
                                </h4>
                                <p className="text-xs text-ios-gray-600 dark:text-ios-gray-400">
                                    Synchronisiere deine Reisepläne in Echtzeit
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="space-y-3">
                        <button
                            onClick={handleStartOnboarding}
                            className="w-full py-4 bg-gradient-to-r from-ios-blue via-ios-purple to-ios-pink text-white
                                     rounded-ios-xl font-semibold shadow-ios transition-all active:scale-[0.98]"
                        >
                            Einführung starten
                        </button>
                        <button
                            onClick={handleSkip}
                            className="w-full py-3 text-ios-gray-600 dark:text-ios-gray-400 font-medium
                                     transition-all active:opacity-70"
                        >
                            Überspringen
                        </button>
                    </div>

                    {/* Hint */}
                    <p className="text-xs text-ios-gray-500 dark:text-ios-gray-500 mt-6">
                        Die Einführung erklärt dir die wichtigsten Features von NipponGo.
                    </p>
                </div>
            </div>
        </div>
    );
}
