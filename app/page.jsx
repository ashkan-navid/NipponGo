'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import io from 'socket.io-client';

import useAuthStore from '../store/authStore';
import useThemeStore from '../store/themeStore';
import useLocationStore from '../store/locationStore';

import Layout from '../components/Layout';
import ErrorBoundary from '../components/ErrorBoundary';
import OfflineIndicator from '../components/OfflineIndicator';
import LoginForm from '../components/LoginForm';
import TravelPlanning from '../components/TravelPlanning';
import PackingList from '../components/PackingList';
import TimelineView from '../components/TimelineView';
import ToastContainer from '../components/Toast';
import GlobalSearch from '../components/GlobalSearch';
import DiscoverHub from '../components/DiscoverHub';
import Dashboard from '../components/Dashboard';
import NotificationPrompt from '../components/NotificationPrompt';
import Onboarding from '../components/Onboarding';
import WelcomeModal from '../components/WelcomeModal';
import { hapticLight } from '../lib/haptics';

// Dynamic import for Map to avoid SSR issues
const MapComponent = dynamic(() => import('../components/Map'), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full flex items-center justify-center bg-ios-gray-100 dark:bg-ios-gray-900">
            <div className="animate-spin w-8 h-8 border-2 border-ios-blue border-t-transparent rounded-full" />
        </div>
    ),
});

// staleTime 5s prevents rapid re-fetches (blinking) while keeping data fresh.
// Socket events trigger instant invalidation when actual changes happen.
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5000,
            retry: 2,
            refetchOnWindowFocus: true,
        },
    },
});

// Single shared socket instance
let socketInstance = null;

function getSocket() {
    if (!socketInstance) {
        socketInstance = io({
            transports: ['websocket', 'polling'],
            withCredentials: true, // Send cookies with handshake
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: Infinity,
        });
    }
    return socketInstance;
}

// Export for use by child components
export { getSocket };

function AppContent() {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [showLoginForm, setShowLoginForm] = useState(false);
    const [swUpdateAvailable, setSwUpdateAvailable] = useState(false);
    const [swRegistration, setSwRegistration] = useState(null);
    const [showSearch, setShowSearch] = useState(false);
    const [searchTarget, setSearchTarget] = useState(null); // { tab, id?, category?, phrase? }
    const contentRef = useRef(null);
    const { isAuthenticated, checkSession, user } = useAuthStore();
    const { initializeTheme } = useThemeStore();
    const currentLocation = useLocationStore((s) => s.currentLocation);
    const qClient = useQueryClient();
    const [dashboardWeather, setDashboardWeather] = useState(null);
    const [dashboardForecast, setDashboardForecast] = useState(null);

    // Hotels query
    const { data: hotelsData } = useQuery({
        queryKey: ['hotels'],
        queryFn: async () => {
            const response = await fetch('/api/hotels');
            if (!response.ok) throw new Error('Failed to fetch hotels');
            return response.json();
        },
        enabled: isAuthenticated,
    });

    // Activities query
    const { data: activitiesData } = useQuery({
        queryKey: ['activities'],
        queryFn: async () => {
            const response = await fetch('/api/activities');
            if (!response.ok) throw new Error('Failed to fetch activities');
            return response.json();
        },
        enabled: isAuthenticated,
        refetchInterval: 30000,
    });

    // Invitations query
    const { data: invitationsData } = useQuery({
        queryKey: ['invitations'],
        queryFn: async () => {
            const response = await fetch('/api/share');
            if (!response.ok) return { pending: [], shared: [] };
            return response.json();
        },
        enabled: isAuthenticated,
        refetchInterval: 15000,
    });

    // Flights query
    const { data: flightsData } = useQuery({
        queryKey: ['flights'],
        queryFn: async () => {
            const response = await fetch('/api/flights');
            if (!response.ok) return { flights: [] };
            return response.json();
        },
        enabled: isAuthenticated,
        refetchInterval: 30000,
    });

    const pendingCount = invitationsData?.pending?.length || 0;
    const hotels = hotelsData?.all || [];
    const activities = activitiesData?.activities || [];
    const flights = flightsData?.flights || [];

    // Trip countdown: days until earliest future flight departure
    const tripCountdown = useMemo(() => {
        if (!flightsData?.flights || flightsData.flights.length === 0) return null;

        const now = new Date();
        now.setHours(0, 0, 0, 0);
        let earliest = null;

        for (const f of flightsData.flights) {
            if (!f.departure_time) continue;
            const d = new Date(f.departure_time);
            d.setHours(0, 0, 0, 0);
            if (d >= now && (earliest === null || d < earliest)) {
                earliest = d;
            }
        }

        if (earliest === null) return null;
        return Math.round((earliest - now) / (1000 * 60 * 60 * 24));
    }, [flightsData]);

    // Fetch weather for Dashboard (prioritize GPS, then first hotel, then Tokyo default)
    useEffect(() => {
        if (!isAuthenticated) return;

        // Prioritize GPS location, then hotel coordinates, then Tokyo fallback
        let lat, lon;
        if (currentLocation?.lat && currentLocation?.lon) {
            lat = currentLocation.lat;
            lon = currentLocation.lon;
        } else {
            const firstHotel = hotels.find(h => (h.latitude ?? h.lat) && (h.longitude ?? h.lon));
            lat = firstHotel ? (firstHotel.latitude ?? firstHotel.lat) : 35.6762;
            lon = firstHotel ? (firstHotel.longitude ?? firstHotel.lon) : 139.6503;
        }

        let cancelled = false;
        const fetchWeather = async () => {
            try {
                const res = await fetch(`/api/weather?lat=${lat}&lon=${lon}`);
                if (!res.ok) return;
                const data = await res.json();
                if (!cancelled && data.temp !== null && data.temp !== undefined) {
                    setDashboardWeather(data);
                }
            } catch { /* ignore */ }
        };
        const fetchForecast = async () => {
            try {
                const res = await fetch(`/api/weather?lat=${lat}&lon=${lon}&forecast=true`);
                if (!res.ok) return;
                const data = await res.json();
                if (!cancelled && data.forecast) {
                    setDashboardForecast(data.forecast);
                }
            } catch { /* ignore */ }
        };
        fetchWeather();
        fetchForecast();
        const interval = setInterval(fetchWeather, 10 * 60 * 1000);
        const forecastInterval = setInterval(fetchForecast, 30 * 60 * 1000);
        return () => { cancelled = true; clearInterval(interval); clearInterval(forecastInterval); };
    }, [isAuthenticated, hotels.length, currentLocation?.lat, currentLocation?.lon]);

    const handleTabChange = useCallback((tabId, subView) => {
        hapticLight();
        if (subView) {
            setSearchTarget({ tab: tabId, view: subView });
        }
        setActiveTab(tabId);
    }, []);

    // Check session and initialize theme on mount
    useEffect(() => {
        checkSession();
        initializeTheme();
    }, [checkSession, initializeTheme]);

    // Start GPS tracking when authenticated
    useEffect(() => {
        if (!isAuthenticated) return;
        const { startWatchingLocation, stopWatchingLocation } = useLocationStore.getState();
        startWatchingLocation();
        return () => stopWatchingLocation();
    }, [isAuthenticated]);

    // Socket.io connection + real-time listeners
    useEffect(() => {
        if (!isAuthenticated) {
            return;
        }

        const socket = getSocket();

        // Authenticate — server reads session_token from handshake cookies.
        socket.emit('authenticate');

        // Listen for real-time events (data sync only, no location sharing)
        const handleDataChanged = (payload) => {
            if (payload?.type === 'hotels' || payload?.type === 'all') {
                qClient.invalidateQueries({ queryKey: ['hotels'] });
            }
            if (payload?.type === 'activities' || payload?.type === 'all') {
                qClient.invalidateQueries({ queryKey: ['activities'] });
            }
            if (payload?.type === 'invitations' || payload?.type === 'all') {
                qClient.invalidateQueries({ queryKey: ['invitations'] });
            }
            if (payload?.type === 'flights' || payload?.type === 'all') {
                qClient.invalidateQueries({ queryKey: ['flights'] });
            }
        };
        const handleShareRemoved = (payload) => {
            qClient.invalidateQueries({ queryKey: ['invitations'] });
            qClient.invalidateQueries({ queryKey: ['hotels'] });
            qClient.invalidateQueries({ queryKey: ['activities'] });
            qClient.invalidateQueries({ queryKey: ['flights'] });
        };
        const handleConnect = () => {
            console.log('Socket connected');
            socket.emit('authenticate');
        };

        socket.on('connect', handleConnect);
        socket.on('data-changed', handleDataChanged);
        socket.on('share-removed', handleShareRemoved);

        return () => {
            socket.off('connect', handleConnect);
            socket.off('data-changed', handleDataChanged);
            socket.off('share-removed', handleShareRemoved);
        };
    }, [isAuthenticated, qClient]);

    // Expose socket emitter so child components can emit data-changed
    const emitDataChanged = useCallback((type, action, title) => {
        const socket = getSocket();
        if (socket?.connected) {
            socket.emit('data-changed', { type, action, title });
        }
    }, []);

    // Handle URL-based navigation (shortcuts, file_handlers, protocol_handlers)
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);

        // Shortcuts: ?tab=dashboard|planning|map|timeline|packing|discover
        const tabParam = params.get('tab');
        if (tabParam) {
            const tabMap = {
                dashboard: 'dashboard',
                planning: 'planning',
                map: 'map',
                timeline: 'timeline',
                packing: 'packing',
                discover: 'discover',
                currency: 'discover', // legacy: redirect to discover
            };
            if (tabMap[tabParam]) {
                setActiveTab(tabMap[tabParam]);
            }
            // Clean URL without reload
            window.history.replaceState({}, '', '/');
        }

        // File handlers: ?import=true (triggered by OS file association)
        const importParam = params.get('import');
        if (importParam === 'true' && 'launchQueue' in window) {
            window.launchQueue.setConsumer(async (launchParams) => {
                if (launchParams.files && launchParams.files.length > 0) {
                    const fileHandle = launchParams.files[0];
                    const file = await fileHandle.getFile();
                    const text = await file.text();
                    try {
                        const data = JSON.parse(text);
                        // Trigger import flow - dispatch custom event that ProfileModal can listen for
                        window.dispatchEvent(new CustomEvent('nippongo-file-import', { detail: data }));
                    } catch (e) {
                        console.error('File import parse error:', e);
                    }
                }
            });
            window.history.replaceState({}, '', '/');
        }

        // Protocol handlers: ?protocol=web+nippongo:...
        const protocolParam = params.get('protocol');
        if (protocolParam) {
            // Parse the protocol URL for deep linking
            // Example: web+nippongo://map or web+nippongo://planning
            try {
                const protocolUrl = new URL(protocolParam);
                const target = protocolUrl.hostname || protocolUrl.pathname.replace(/\//g, '');
                if (['dashboard', 'planning', 'map', 'timeline', 'packing', 'discover'].includes(target)) {
                    setActiveTab(target);
                }
            } catch (e) {
                console.error('Protocol handler parse error:', e);
            }
            window.history.replaceState({}, '', '/');
        }
    }, []);

    // Register service worker
    useEffect(() => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker
                .register('/sw.js')
                .then(async (registration) => {
                    console.log('Service Worker registered:', registration.scope);
                    setSwRegistration(registration);

                    if (registration.waiting) {
                        setSwUpdateAvailable(true);
                    }

                    registration.addEventListener('updatefound', () => {
                        const newWorker = registration.installing;
                        newWorker?.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                setSwUpdateAvailable(true);
                            }
                        });
                    });

                    // Register periodic background sync (if supported)
                    if ('periodicSync' in registration) {
                        try {
                            const status = await navigator.permissions.query({ name: 'periodic-background-sync' });
                            if (status.state === 'granted') {
                                await registration.periodicSync.register('refresh-data', {
                                    minInterval: 60 * 60 * 1000, // 1 hour minimum
                                });
                                console.log('Periodic background sync registered');
                            }
                        } catch (err) {
                            console.log('Periodic sync registration failed:', err);
                        }
                    }
                })
                .catch((error) => {
                    console.log('Service Worker registration failed:', error);
                });
        }
    }, []);

    const handleSwUpdate = () => {
        if (swRegistration?.waiting) {
            swRegistration.waiting.postMessage('skipWaiting');
            setSwUpdateAvailable(false);
            window.location.reload();
        }
    };

    useEffect(() => {
        if (isAuthenticated) {
            setShowLoginForm(false);
        }
    }, [isAuthenticated]);

    const clearSearchTarget = useCallback(() => setSearchTarget(null), []);

    if (showLoginForm) {
        return (
            <LoginForm onClose={() => setShowLoginForm(false)} />
        );
    }

    const renderContent = () => {
        switch (activeTab) {
            case 'planning':
                return (
                    <TravelPlanning
                        emitDataChanged={emitDataChanged}
                        initialView={searchTarget?.tab === 'planning' ? searchTarget.view : null}
                        highlightId={searchTarget?.tab === 'planning' ? searchTarget.id : null}
                        onHighlightDone={clearSearchTarget}
                        hotelCount={hotels.length}
                        activityCount={activities.length}
                        flightCount={flights.length}
                    />
                );
            case 'timeline':
                return <TimelineView onNavigate={(target) => {
                    setSearchTarget(target);
                    handleTabChange(target.tab);
                }} />;
            case 'packing':
                return (
                    <PackingList
                        highlightCategory={searchTarget?.tab === 'packing' ? searchTarget.category : null}
                        onHighlightDone={clearSearchTarget}
                        hasFriends={(invitationsData?.shared?.length || 0) > 0}
                    />
                );
            case 'discover':
                return (
                    <DiscoverHub
                        initialView={searchTarget?.tab === 'discover' ? searchTarget.view : null}
                        highlightTarget={searchTarget?.tab === 'discover' ? searchTarget : null}
                        onHighlightDone={clearSearchTarget}
                    />
                );
            case 'dashboard':
            default:
                return (
                    <Dashboard
                        hotels={hotels}
                        activities={activities}
                        flights={flights}
                        tripCountdown={tripCountdown}
                        onTabChange={handleTabChange}
                        onLoginRequired={() => setShowLoginForm(true)}
                        invitationsData={invitationsData}
                        weather={dashboardWeather}
                        forecast={dashboardForecast}
                        user={user}
                        isAuthenticated={isAuthenticated}
                    />
                );
        }
    };

    const incompleteActivitiesCount = activities.filter(a => !a.completed).length;

    return (
        <>
            <OfflineIndicator />
            <ToastContainer />
            {swUpdateAvailable && (
                <div className="fixed top-0 left-0 right-0 z-[9999] bg-ios-blue text-white text-center py-3 px-4 flex items-center justify-center gap-3 animate-slide-down shadow-lg" style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}>
                    <span className="text-sm font-medium">Neue Version verfügbar</span>
                    <button
                        onClick={handleSwUpdate}
                        className="bg-white/20 hover:bg-white/30 text-white text-sm font-semibold px-4 py-1.5 rounded-full transition-colors"
                    >
                        Jetzt aktualisieren
                    </button>
                </div>
            )}
            <Layout
                activeTab={activeTab}
                onTabChange={handleTabChange}
                onLoginRequired={() => setShowLoginForm(true)}
                incompleteActivitiesCount={incompleteActivitiesCount}
                pendingInvitationsCount={pendingCount}
                onSearchOpen={() => setShowSearch(true)}
                tripCountdown={tripCountdown}
            >
                <div
                    ref={contentRef}
                    className="h-full"
                >
                    {renderContent()}
                </div>
            </Layout>
            <NotificationPrompt />
            <WelcomeModal />
            <Onboarding />
            <GlobalSearch
                isOpen={showSearch}
                onClose={() => setShowSearch(false)}
                hotels={hotels}
                activities={activities}
                isAuthenticated={isAuthenticated}
                onNavigate={(target) => {
                    setSearchTarget(target);
                    handleTabChange(target.tab);
                }}
            />
        </>
    );
}

export default function Home() {
    return (
        <ErrorBoundary>
            <QueryClientProvider client={queryClient}>
                <AppContent />
            </QueryClientProvider>
        </ErrorBoundary>
    );
}
