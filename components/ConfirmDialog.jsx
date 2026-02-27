'use client';

import { AlertTriangle } from 'lucide-react';

/**
 * Wiederverwendbarer Bestätigungs-Dialog
 * @param {Object} props
 * @param {boolean} props.isOpen - Ob der Dialog angezeigt wird
 * @param {Function} props.onClose - Callback zum Schließen
 * @param {Function} props.onConfirm - Callback bei Bestätigung
 * @param {string} props.title - Titel des Dialogs
 * @param {string} props.message - Nachricht/Beschreibung
 * @param {string} props.confirmText - Text des Bestätigungs-Buttons
 * @param {string} props.cancelText - Text des Abbrechen-Buttons
 * @param {'danger' | 'warning' | 'info'} props.type - Art der Aktion
 */
export default function ConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title = 'Bestätigung',
    message = 'Möchtest du diese Aktion wirklich ausführen?',
    confirmText = 'Bestätigen',
    cancelText = 'Abbrechen',
    type = 'danger',
}) {
    if (!isOpen) return null;

    const colors = {
        danger: {
            icon: 'bg-ios-red/10 text-ios-red',
            button: 'bg-ios-red',
        },
        warning: {
            icon: 'bg-ios-orange/10 text-ios-orange',
            button: 'bg-ios-orange',
        },
        info: {
            icon: 'bg-ios-blue/10 text-ios-blue',
            button: 'bg-ios-blue',
        },
    };

    const colorScheme = colors[type] || colors.danger;

    return (
        <div
            className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                role="alertdialog"
                aria-labelledby="dialog-title"
                aria-describedby="dialog-message"
                className="bg-white dark:bg-ios-gray-900 rounded-ios-2xl w-full max-w-sm p-6
                         shadow-2xl animate-scale-in"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Icon */}
                <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-4 ${colorScheme.icon}`}>
                    <AlertTriangle className="w-6 h-6" />
                </div>

                {/* Title */}
                <h3 id="dialog-title" className="text-lg font-semibold text-ios-gray-950 dark:text-white text-center mb-2">
                    {title}
                </h3>

                {/* Message */}
                <p id="dialog-message" className="text-ios-gray-600 dark:text-ios-gray-400 text-center text-sm mb-6">
                    {message}
                </p>

                {/* Buttons */}
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 bg-ios-gray-100 dark:bg-ios-gray-800 text-ios-gray-700 dark:text-ios-gray-300
                                 rounded-ios-lg font-medium transition-all active:scale-[0.98]"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className={`flex-1 py-3 text-white rounded-ios-lg font-medium 
                                  transition-all active:scale-[0.98] ${colorScheme.button}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
