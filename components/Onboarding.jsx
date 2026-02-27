'use client';

import { useState, useEffect, useCallback } from 'react';
import { Home, ClipboardList, CalendarDays, Package, BookOpen, Coins, User, X, ChevronRight, ChevronLeft } from 'lucide-react';

const ONBOARDING_KEY = 'nippon-onboarding-completed';

const STEPS = [
    {
        target: 'tab-planning',
        icon: ClipboardList,
        title: 'Reiseplanung',
        description: 'Zentralisiere Flüge, Hotels und Aktivitäten. Behalte mit Live-Tracking und geteilter Planung alles im Griff.',
        position: 'top',
    },
    {
        target: 'tab-timeline',
        icon: CalendarDays,
        title: 'Timeline',
        description: 'Sieh alle deine Pläne chronologisch sortiert — Check-ins, Aktivitäten und Check-outs auf einen Blick.',
        position: 'top',
    },
    {
        target: 'tab-dashboard',
        icon: Home,
        title: 'Dashboard',
        description: 'Deine Startseite mit Reise-Countdown, Tagesübersicht, Wetter, interaktiver Karte und Schnellzugriff.',
        position: 'top',
    },
    {
        target: 'tab-packing',
        icon: Package,
        title: 'Packliste',
        description: 'Die Japan-spezifische Packliste hilft dir, nichts zu vergessen. Synchronisiere sie mit deinen Reisepartnern.',
        position: 'top',
    },
    {
        target: 'tab-discover',
        icon: BookOpen,
        title: 'Entdecken',
        description: 'Lerne wichtige japanische Phrasen, Verhaltensregeln und nutze den Währungsrechner.',
        position: 'top',
    },
];

export default function Onboarding({ onComplete }) {
    const [isActive, setIsActive] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [targetRect, setTargetRect] = useState(null);

    useEffect(() => {
        try {
            if (localStorage.getItem(ONBOARDING_KEY) !== 'true') {
                // Delay to allow the app to render
                const timer = setTimeout(() => setIsActive(true), 1500);
                return () => clearTimeout(timer);
            }
        } catch { }
    }, []);

    const updateTargetRect = useCallback(() => {
        const step = STEPS[currentStep];
        if (!step) return;

        const el = document.querySelector(`[data-onboarding="${step.target}"]`);
        if (el) {
            const rect = el.getBoundingClientRect();
            setTargetRect({
                x: rect.x - 4,
                y: rect.y - 4,
                width: rect.width + 8,
                height: rect.height + 8,
            });
        }
    }, [currentStep]);

    useEffect(() => {
        if (!isActive) return;
        updateTargetRect();
        window.addEventListener('resize', updateTargetRect);
        return () => window.removeEventListener('resize', updateTargetRect);
    }, [isActive, currentStep, updateTargetRect]);

    const handleFinish = useCallback(() => {
        setIsActive(false);
        try { localStorage.setItem(ONBOARDING_KEY, 'true'); } catch { }
        onComplete?.();
    }, [onComplete]);

    const handleNext = () => {
        if (currentStep < STEPS.length - 1) {
            setCurrentStep(s => s + 1);
        } else {
            handleFinish();
        }
    };

    const handlePrev = () => {
        if (currentStep > 0) {
            setCurrentStep(s => s - 1);
        }
    };

    if (!isActive) return null;

    const step = STEPS[currentStep];
    const StepIcon = step.icon;
    const isLast = currentStep === STEPS.length - 1;

    return (
        <div className="fixed inset-0 z-[9999] animate-fade-in">
            {/* Dark overlay with spotlight cutout */}
            <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <mask id="spotlight-mask">
                        <rect width="100%" height="100%" fill="white" />
                        {targetRect && (
                            <rect
                                x={targetRect.x}
                                y={targetRect.y}
                                width={targetRect.width}
                                height={targetRect.height}
                                rx="12"
                                fill="black"
                            />
                        )}
                    </mask>
                </defs>
                <rect
                    width="100%"
                    height="100%"
                    fill="rgba(0,0,0,0.7)"
                    mask="url(#spotlight-mask)"
                />
            </svg>

            {/* Spotlight ring animation */}
            {targetRect && (
                <div
                    className="absolute border-2 border-ios-blue rounded-xl animate-pulse pointer-events-none"
                    style={{
                        left: targetRect.x,
                        top: targetRect.y,
                        width: targetRect.width,
                        height: targetRect.height,
                    }}
                />
            )}

            {/* Content card */}
            <div className="absolute left-4 right-4 bottom-32 bg-white dark:bg-ios-gray-800 rounded-ios-xl shadow-ios-lg p-6 animate-slide-up">
                {/* Skip button */}
                <button
                    onClick={handleFinish}
                    className="absolute top-4 right-4 p-1 text-ios-gray-400 hover:text-ios-gray-600
                             dark:hover:text-ios-gray-300 transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Step indicator */}
                <div className="flex items-center gap-1.5 mb-4">
                    {STEPS.map((_, i) => (
                        <div
                            key={i}
                            className={`h-1 rounded-full transition-all ${i === currentStep
                                ? 'w-6 bg-ios-blue'
                                : i < currentStep
                                    ? 'w-3 bg-ios-blue/40'
                                    : 'w-3 bg-ios-gray-200 dark:bg-ios-gray-700'
                                }`}
                        />
                    ))}
                </div>

                {/* Icon + Content */}
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-ios-blue/10 rounded-ios-xl shrink-0">
                        <StepIcon className="w-6 h-6 text-ios-blue" />
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-lg font-bold text-ios-gray-950 dark:text-white mb-1">
                            {step.title}
                        </h3>
                        <p className="text-sm text-ios-gray-600 dark:text-ios-gray-400 leading-relaxed">
                            {step.description}
                        </p>
                    </div>
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between mt-5">
                    <button
                        onClick={handlePrev}
                        disabled={currentStep === 0}
                        className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-ios-gray-500
                                 dark:text-ios-gray-400 disabled:opacity-0 transition-opacity"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        Zurück
                    </button>

                    <button
                        onClick={handleNext}
                        className="flex items-center gap-1 px-5 py-2.5 bg-ios-blue text-white text-sm
                                 font-semibold rounded-ios transition-all active:scale-95"
                    >
                        {isLast ? 'Los geht\'s!' : 'Weiter'}
                        {!isLast && <ChevronRight className="w-4 h-4" />}
                    </button>
                </div>
            </div>
        </div>
    );
}

// Export for use in ProfileModal "repeat onboarding"
export function resetOnboarding() {
    try { localStorage.removeItem(ONBOARDING_KEY); } catch { }
}
