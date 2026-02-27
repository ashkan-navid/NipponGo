'use client';

import { useState, useEffect } from 'react';
import { Home, ClipboardList, CalendarDays, Package, BookOpen, User, LogIn, Search } from 'lucide-react';
import useAuthStore from '../store/authStore';
import ProfileModal from './ProfileModal';

const tabs = [
    { id: 'planning', label: 'Reiseplanung', icon: ClipboardList, authRequired: true },
    { id: 'timeline', label: 'Timeline', icon: CalendarDays, authRequired: true },
    { id: 'dashboard', label: 'Dashboard', icon: Home, authRequired: false },
    { id: 'packing', label: 'Packliste', icon: Package, authRequired: true },
    { id: 'discover', label: 'Entdecken', icon: BookOpen, authRequired: false },
];

export default function Layout({ children, activeTab, onTabChange, onLoginRequired, incompleteActivitiesCount = 0, pendingInvitationsCount = 0, onSearchOpen, tripCountdown }) {
    const { isAuthenticated, user } = useAuthStore();
    const [showProfile, setShowProfile] = useState(false);

    const handleTabClick = (tab) => {
        if (tab.authRequired && !isAuthenticated) {
            if (onLoginRequired) {
                onLoginRequired();
            }
            return;
        }
        onTabChange(tab.id);
    };

    const [scrolled, setScrolled] = useState(false);

    const handleScroll = (e) => {
        if (activeTab === 'map' || activeTab === 'dashboard' || activeTab === 'timeline') return;
        setScrolled(e.target.scrollTop > 10);
    };

    useEffect(() => {
        setScrolled(false);
    }, [activeTab]);

    return (
        <div className="fixed inset-0 flex flex-col bg-ios-gray-50 dark:bg-ios-gray-950 md:max-w-2xl lg:max-w-4xl xl:max-w-5xl md:mx-auto md:shadow-2xl md:border-x md:border-ios-gray-200 dark:md:border-ios-gray-800">
            {/* Header — fixed top zone */}
            <header className={`flex-shrink-0 z-40 pt-safe transition-all duration-300 border-b ${scrolled
                ? 'bg-ios-gray-100/90 dark:bg-ios-gray-900/90 backdrop-blur-ios border-ios-gray-200/50 dark:border-ios-gray-800/50 shadow-sm'
                : 'bg-ios-gray-50 dark:bg-ios-gray-950 border-transparent'
                }`}>
                <div className={`flex items-center gap-2 px-4 transition-all duration-300 ${scrolled ? 'h-12' : 'h-14'}`}>
                    {/* Left: Logo */}
                    <button
                        onClick={() => onTabChange('dashboard')}
                        className="flex items-center gap-2 active:scale-95 transition-transform shrink-0"
                        aria-label="Zur Startseite navigieren"
                    >
                        <img
                            src="/icons/icon-96x96.png"
                            alt="NipponGo"
                            className={`rounded-lg transition-all duration-300 ${scrolled ? 'w-6 h-6' : 'w-8 h-8'}`}
                        />
                        <h1 className={`font-semibold text-ios-gray-950 dark:text-white transition-all duration-300 ${scrolled ? 'text-base' : 'text-lg'}`}>
                            NipponGo
                        </h1>
                    </button>

                    {/* Center: Spacer (push actions right) */}
                    <div className="flex-1" />

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                        {/* Search Button */}
                        <button
                            onClick={onSearchOpen}
                            className="flex items-center gap-2 p-2 md:px-3 md:py-1.5 md:bg-ios-gray-100 dark:md:bg-ios-gray-800
                                     text-ios-gray-500 hover:text-ios-gray-700 dark:hover:text-ios-gray-300
                                     rounded-full transition-all active:scale-95"
                            aria-label="Globale Suche öffnen"
                        >
                            <Search className="w-5 h-5 shrink-0" />
                            <span className="hidden md:block text-sm font-medium pr-1">Suchen...</span>
                        </button>

                        {isAuthenticated ? (
                            <button
                                onClick={() => setShowProfile(true)}
                                className="relative w-9 h-9 rounded-full bg-gradient-to-br from-ios-blue to-ios-purple
                             flex items-center justify-center text-white text-sm font-bold
                             shadow-ios transition-transform active:scale-95 shrink-0"
                                aria-label={pendingInvitationsCount > 0 ? `Profil öffnen (${pendingInvitationsCount} neue Benachrichtigung${pendingInvitationsCount > 1 ? 'en' : ''})` : 'Profil öffnen'}
                            >
                                {user?.username?.slice(0, 1).toUpperCase() || 'U'}
                                {pendingInvitationsCount > 0 && (
                                    <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 
                                                  bg-ios-red rounded-full flex items-center justify-center border-2 border-white dark:border-ios-gray-900">
                                        <span className="text-[10px] font-bold text-white">
                                            {pendingInvitationsCount > 9 ? '9+' : pendingInvitationsCount}
                                        </span>
                                    </div>
                                )}
                            </button>
                        ) : (
                            <button
                                onClick={() => onLoginRequired && onLoginRequired()}
                                className="flex items-center gap-2 px-3 py-2 bg-ios-blue text-white 
                                         rounded-lg text-sm font-medium transition-transform active:scale-95 shrink-0"
                            >
                                <LogIn className="w-4 h-4 shrink-0" />
                                <span className="hidden sm:inline">Anmelden</span>
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {/* Main Content — fills the space between header and tab bar, scrolls internally */}
            <main className="flex-1 min-h-0 overflow-auto" onScroll={handleScroll}>
                {children}
            </main>

            {/* Bottom Tab Bar — fixed bottom zone */}
            <nav className="flex-shrink-0 z-40 bg-white/80 dark:bg-ios-gray-900/80 backdrop-blur-ios 
                      border-t border-ios-gray-200/50 dark:border-ios-gray-800/50 pb-safe">
                <div className="flex items-center w-full h-16 max-w-2xl mx-auto px-1">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        const isLocked = tab.authRequired && !isAuthenticated;
                        const showBadge = tab.id === 'planning' && incompleteActivitiesCount > 0 && isAuthenticated;

                        return (
                            <button
                                key={tab.id}
                                data-onboarding={`tab-${tab.id}`}
                                onClick={() => handleTabClick(tab)}
                                className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2
                                          transition-all duration-200 active:scale-95 ${isActive
                                        ? 'text-ios-blue'
                                        : isLocked
                                            ? 'text-ios-gray-400 dark:text-ios-gray-600'
                                            : 'text-ios-gray-500 dark:text-ios-gray-400'
                                    }`}
                            >
                                <div className="relative">
                                    <Icon
                                        className={`w-6 h-6 transition-transform duration-200 ${isActive ? 'scale-110' : ''
                                            }`}
                                        strokeWidth={isActive ? 2.5 : 2}
                                    />
                                    {isLocked && (
                                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-ios-orange rounded-full" />
                                    )}
                                    {showBadge && (
                                        <div className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] px-1 
                                                      bg-ios-red rounded-full flex items-center justify-center">
                                            <span className="text-[10px] font-bold text-white">
                                                {incompleteActivitiesCount > 99 ? '99+' : incompleteActivitiesCount}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <span className={`text-[10px] font-medium ${isActive ? 'opacity-100' : 'opacity-70'
                                    }`}>
                                    {tab.label}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </nav>

            {/* Profile Modal */}
            <ProfileModal
                isOpen={showProfile}
                onClose={() => setShowProfile(false)}
            />
        </div>
    );
}
