'use client';

import { create } from 'zustand';

let toastId = 0;

const useToastStore = create((set, get) => ({
    toasts: [],

    addToast: (message, type = 'info', duration = 3000) => {
        const id = ++toastId;
        set((state) => ({
            toasts: [...state.toasts, { id, message, type, createdAt: Date.now() }],
        }));

        // Auto-dismiss
        setTimeout(() => {
            get().removeToast(id);
        }, duration);

        return id;
    },

    removeToast: (id) => {
        set((state) => ({
            toasts: state.toasts.filter((t) => t.id !== id),
        }));
    },
}));

export default useToastStore;
