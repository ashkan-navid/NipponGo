'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useAuthStore = create(
    persist(
        (set, get) => ({
            user: null,
            isLoading: true,
            isAuthenticated: false,
            hasHydrated: false,
            justRegistered: false,

            // Set user after login/register/refresh
            setUser: (user) => set({
                user,
                isAuthenticated: !!user,
                isLoading: false,
            }),

            // Clear user on logout
            clearUser: () => set({
                user: null,
                isAuthenticated: false,
                isLoading: false,
            }),

            // Login
            login: async (username, password) => {
                try {
                    const response = await fetch('/api/auth', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username, password }),
                    });

                    const data = await response.json();

                    if (!response.ok) {
                        throw new Error(data.error || 'Login failed');
                    }

                    set({ user: data.user, isAuthenticated: true, isLoading: false });
                    return { success: true };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            },

            // Register
            register: async (username, password, email) => {
                try {
                    const response = await fetch('/api/auth', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username, password, email }),
                    });

                    const data = await response.json();

                    if (!response.ok) {
                        // Include password validation details if available
                        const errorMsg = data.details
                            ? data.details.join('. ')
                            : data.error || 'Registration failed';
                        throw new Error(errorMsg);
                    }

                    set({ user: data.user, isAuthenticated: true, isLoading: false, justRegistered: true });
                    return { success: true };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            },

            // Clear justRegistered flag
            clearJustRegistered: () => set({ justRegistered: false }),

            // Update email in user state (after email change)
            updateEmail: (email) => {
                const currentUser = get().user;
                if (currentUser) {
                    set({ user: { ...currentUser, email } });
                }
            },

            // Logout — full app reset (deregister SW, clear caches, reload)
            logout: async () => {
                try {
                    const { apiFetch } = await import('../lib/apiClient');
                    await apiFetch('/api/auth', { method: 'DELETE' });
                } catch (error) {
                    console.error('Logout error:', error);
                }

                // Clear search history
                if (typeof window !== 'undefined') {
                    localStorage.removeItem('nippon-search-history');
                }

                set({ user: null, isAuthenticated: false, isLoading: false });

                // Full app reset: deregister service workers, clear caches, reload
                try {
                    if ('serviceWorker' in navigator) {
                        const registrations = await navigator.serviceWorker.getRegistrations();
                        await Promise.all(registrations.map(reg => reg.unregister()));
                    }
                    if (typeof caches !== 'undefined') {
                        const cacheNames = await caches.keys();
                        await Promise.all(cacheNames.map(name => caches.delete(name)));
                    }
                } catch (error) {
                    console.error('Cleanup error:', error);
                }

                setTimeout(() => window.location.reload(), 300);
            },

            // Check session on app load
            checkSession: async () => {
                try {
                    // Don't show loading state, just check in background
                    const response = await fetch('/api/auth');
                    const data = await response.json();

                    if (data.user) {
                        set({ user: data.user, isAuthenticated: true, isLoading: false });
                    } else {
                        set({ user: null, isAuthenticated: false, isLoading: false });
                    }
                } catch (error) {
                    console.error('Session check error:', error);
                    set({ user: null, isAuthenticated: false, isLoading: false });
                }
            },

            // Mark as hydrated (called after rehydration)
            setHasHydrated: (state) => {
                set({ hasHydrated: state, isLoading: false });
            },
        }),
        {
            name: 'auth-storage',
            // Don't persist user to avoid stale authentication
            partialize: (state) => ({}),
            onRehydrateStorage: () => (state) => {
                // After rehydration, mark as not loading
                state?.setHasHydrated(true);
            },
        }
    )
);

export default useAuthStore;

