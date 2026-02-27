import { useState, useEffect, useRef } from 'react';
import { X, Moon, Sun, Info, User, LogOut, Users, Download, Upload, Calendar, Bell, BellOff, BellRing, RefreshCw, AlertTriangle, Mail, KeyRound, Eye, EyeOff, FileText } from 'lucide-react';
import useAuthStore from '../store/authStore';
import { useQuery } from '@tanstack/react-query';
import useThemeStore from '../store/themeStore';
import ShareListModal from './ShareListModal';
import { capitalizeUsername } from '../lib/utils';
import { apiPost, apiDelete } from '../lib/apiClient';
import useToastStore from '../store/toastStore';
import { hapticSuccess, hapticError } from '../lib/haptics';
import { resetOnboarding } from './Onboarding';
import { changelog, APP_VERSION } from '../lib/changelog';

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

export default function ProfileModal({ isOpen, onClose }) {
    const { user, logout, updateEmail } = useAuthStore();
    const { isDarkMode, toggleDarkMode } = useThemeStore();
    const [showShareModal, setShowShareModal] = useState(false);
    const [showChangelog, setShowChangelog] = useState(false);
    const [pushStatus, setPushStatus] = useState(null); // 'granted', 'denied', 'default', 'unsupported'
    const [pushRequesting, setPushRequesting] = useState(false);
    const [importing, setImporting] = useState(false);

    // Account deletion state
    const [showDeleteAccountDialog, setShowDeleteAccountDialog] = useState(false);
    const [deleteUsername, setDeleteUsername] = useState('');
    const [isDeletingAccount, setIsDeletingAccount] = useState(false);

    // Email editor state
    const [showEmailEditor, setShowEmailEditor] = useState(false);
    const [emailInput, setEmailInput] = useState('');
    const [emailSaving, setEmailSaving] = useState(false);

    // Password change state
    const [showPasswordEditor, setShowPasswordEditor] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [passwordSaving, setPasswordSaving] = useState(false);

    const fileInputRef = useRef(null);
    const { addToast } = useToastStore();

    // Fetch invitations for badges
    const { data: inviteData } = useQuery({
        queryKey: ['invitations'],
        queryFn: async () => {
            const res = await fetch('/api/share');
            if (!res.ok) throw new Error('Failed to fetch invitations');
            return res.json();
        },
        enabled: !!user && isOpen, // Only fetch when modal is open
    });

    // Check push notification status
    useEffect(() => {
        if (!isOpen) return;
        if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
            setPushStatus('unsupported');
        } else {
            setPushStatus(Notification.permission);
        }
    }, [isOpen]);

    const handleRequestPush = async () => {
        setPushRequesting(true);
        try {
            const permission = await Notification.requestPermission();
            setPushStatus(permission);

            if (permission === 'granted') {
                hapticSuccess();
                // Subscribe to push
                const res = await fetch('/api/webpush', { credentials: 'same-origin' });
                if (res.ok) {
                    const data = await res.json();
                    if (data.vapidPublicKey) {
                        const registration = await navigator.serviceWorker.ready;
                        const subscription = await registration.pushManager.subscribe({
                            userVisibleOnly: true,
                            applicationServerKey: urlBase64ToUint8Array(data.vapidPublicKey),
                        });
                        await apiPost('/api/webpush', { subscription: subscription.toJSON() });
                        addToast('Benachrichtigungen aktiviert', 'success');
                    }
                }
            } else if (permission === 'denied') {
                hapticError();
                addToast('Benachrichtigungen wurden blockiert. Bitte in den Browser-Einstellungen erlauben.', 'error', 5000);
            }
        } catch (err) {
            console.error('Push request failed:', err);
            hapticError();
            addToast('Fehler bei der Aktivierung', 'error');
        } finally {
            setPushRequesting(false);
        }
    };

    const handleDisablePush = async () => {
        setPushRequesting(true);
        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            if (subscription) {
                await subscription.unsubscribe();
                await apiDelete(`/api/webpush?endpoint=${encodeURIComponent(subscription.endpoint)}`);
            }
            hapticSuccess();
            addToast('Benachrichtigungen deaktiviert', 'success');
            setPushStatus('disabled');
        } catch (err) {
            console.error('Push disable failed:', err);
            hapticError();
            addToast('Fehler beim Deaktivieren', 'error');
        } finally {
            setPushRequesting(false);
        }
    };

    const handleCheckPush = async () => {
        setPushRequesting(true);
        try {
            const permission = Notification.permission;
            setPushStatus(permission);

            if (permission === 'granted') {
                const registration = await navigator.serviceWorker.ready;
                const subscription = await registration.pushManager.getSubscription();
                if (subscription) {
                    // Verify subscription is still valid on server
                    const res = await fetch('/api/webpush', { credentials: 'same-origin' });
                    if (res.ok) {
                        addToast('Benachrichtigungen sind aktiv', 'success');
                    }
                } else {
                    setPushStatus('disabled');
                    addToast('Push-Subscription nicht gefunden. Bitte erneut aktivieren.', 'info');
                }
            }
        } catch (err) {
            console.error('Push check failed:', err);
        } finally {
            setPushRequesting(false);
        }
    };

    const handleExportData = async () => {
        try {
            const res = await fetch('/api/export?format=json', { credentials: 'same-origin' });
            if (!res.ok) throw new Error('Export fehlgeschlagen');
            const blob = await res.blob();
            const file = new File([blob], `nippongo-export-${Date.now()}.json`, { type: 'application/json' });

            if (navigator.share && navigator.canShare?.({ files: [file] })) {
                await navigator.share({ files: [file], title: 'NipponGo Daten-Export' });
            } else {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = file.name;
                a.click();
                URL.revokeObjectURL(url);
            }
            hapticSuccess();
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('Export failed:', err);
                hapticError();
                addToast('Export fehlgeschlagen', 'error');
            }
        }
    };

    const handleExportCalendar = async () => {
        try {
            const res = await fetch('/api/export/calendar', { credentials: 'same-origin' });
            if (!res.ok) throw new Error('Kalender-Export fehlgeschlagen');
            const blob = await res.blob();
            const file = new File([blob], 'nippongo-travel.ics', { type: 'text/calendar' });

            if (navigator.share && navigator.canShare?.({ files: [file] })) {
                await navigator.share({ files: [file], title: 'NipponGo Kalender' });
            } else {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = file.name;
                a.click();
                URL.revokeObjectURL(url);
            }
            hapticSuccess();
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('Calendar export failed:', err);
                hapticError();
                addToast('Kalender-Export fehlgeschlagen', 'error');
            }
        }
    };

    const handleImportData = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImporting(true);
        try {
            const text = await file.text();
            const data = JSON.parse(text);

            const res = await apiPost('/api/import', data);

            if (res.ok) {
                const result = await res.json();
                const parts = [];
                if (result.hotelsImported > 0) parts.push(`${result.hotelsImported} Hotels`);
                if (result.activitiesImported > 0) parts.push(`${result.activitiesImported} Aktivitäten`);
                if (result.hotelsSkipped > 0 || result.activitiesSkipped > 0) {
                    const skipped = (result.hotelsSkipped || 0) + (result.activitiesSkipped || 0);
                    parts.push(`${skipped} Duplikate übersprungen`);
                }
                hapticSuccess();
                addToast(parts.length > 0 ? `Import: ${parts.join(', ')}` : 'Keine neuen Daten importiert', 'success');
            } else {
                const err = await res.json();
                throw new Error(err.error || 'Import fehlgeschlagen');
            }
        } catch (err) {
            console.error('Import failed:', err);
            hapticError();
            addToast(err.message || 'Import fehlgeschlagen', 'error');
        } finally {
            setImporting(false);
            // Reset file input
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleReloadApp = () => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(registrations => {
                registrations.forEach(reg => reg.unregister());
            });
            if ('caches' in window) {
                caches.keys().then(names => {
                    names.forEach(name => caches.delete(name));
                });
            }
        }
        setTimeout(() => window.location.reload(), 300);
    };

    const handleDeleteAccount = async () => {
        if (!deleteUsername || isDeletingAccount) return;

        setIsDeletingAccount(true);
        try {
            const res = await apiPost('/api/users/delete', { username: deleteUsername });

            if (res.ok) {
                hapticSuccess();
                setShowDeleteAccountDialog(false);
                setDeleteUsername('');
                // Logout will clear caches, unregister SW, and reload the app
                await logout();
                onClose();
            } else {
                const err = await res.json();
                throw new Error(err.error || 'Fehler beim Löschen des Accounts');
            }
        } catch (err) {
            console.error('Account deletion failed:', err);
            hapticError();
            addToast(err.message || 'Fehler beim Löschen des Accounts', 'error');
        } finally {
            setIsDeletingAccount(false);
        }
    };

    const handleSaveEmail = async () => {
        if (!emailInput || emailSaving) return;

        setEmailSaving(true);
        try {
            const { apiPut } = await import('../lib/apiClient');
            const res = await apiPut('/api/users/email', { email: emailInput });

            if (res.ok) {
                const data = await res.json();
                hapticSuccess();
                updateEmail(data.email);
                addToast('E-Mail-Adresse aktualisiert', 'success');
                setShowEmailEditor(false);
                setEmailInput('');
            } else {
                const err = await res.json();
                throw new Error(err.error || 'Fehler beim Aktualisieren der E-Mail');
            }
        } catch (err) {
            console.error('Email update failed:', err);
            hapticError();
            addToast(err.message || 'Fehler beim Aktualisieren der E-Mail', 'error');
        } finally {
            setEmailSaving(false);
        }
    };

    const handleChangePassword = async () => {
        if (!currentPassword || !newPassword || !confirmPassword || passwordSaving) return;

        // Client-side validation
        if (newPassword !== confirmPassword) {
            addToast('Passwörter stimmen nicht überein', 'error');
            return;
        }

        if (newPassword.length < 8 || !/[a-z]/.test(newPassword) || !/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
            addToast('Passwort erfüllt nicht die Anforderungen', 'error');
            return;
        }

        if (currentPassword === newPassword) {
            addToast('Neues Passwort muss sich vom aktuellen unterscheiden', 'error');
            return;
        }

        setPasswordSaving(true);
        try {
            const { apiPut } = await import('../lib/apiClient');
            const res = await apiPut('/api/users/password', { currentPassword, newPassword });

            if (res.ok) {
                hapticSuccess();
                addToast('Passwort erfolgreich geändert', 'success');
                setShowPasswordEditor(false);
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
            } else {
                const err = await res.json();
                throw new Error(err.error || 'Fehler beim Ändern des Passworts');
            }
        } catch (err) {
            console.error('Password change failed:', err);
            hapticError();
            addToast(err.message || 'Fehler beim Ändern des Passworts', 'error');
        } finally {
            setPasswordSaving(false);
        }
    };

    if (!isOpen) return null;

    const handleLogout = async () => {
        await logout();
        onClose();
    };

    const pushStatusLabel = () => {
        switch (pushStatus) {
            case 'granted': return { text: 'Aktiviert', color: 'text-ios-green', icon: BellRing };
            case 'disabled': return { text: 'Deaktiviert', color: 'text-ios-orange', icon: BellOff };
            case 'denied': return { text: 'Blockiert', color: 'text-ios-red', icon: BellOff };
            case 'default': return { text: 'Nicht entschieden', color: 'text-ios-orange', icon: Bell };
            case 'unsupported': return { text: 'Nicht verfügbar', color: 'text-ios-gray-400', icon: BellOff };
            default: return { text: 'Prüfe...', color: 'text-ios-gray-400', icon: Bell };
        }
    };

    const statusInfo = pushStatusLabel();
    const StatusIcon = statusInfo.icon;

    return (
        <>
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
                {/* Backdrop */}
                <div
                    className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
                    onClick={onClose}
                />

                {/* Modal */}
                <div className="relative w-full sm:max-w-md bg-white dark:bg-ios-gray-800
                          rounded-t-ios-2xl sm:rounded-ios-2xl shadow-ios-lg
                          animate-slide-up pb-safe max-h-[90vh] overflow-y-auto">
                    {/* Handle bar for mobile only */}
                    <div className="md:hidden flex justify-center pt-2 pb-4">
                        <div className="w-10 h-1.5 bg-ios-gray-300 dark:bg-ios-gray-700 rounded-full" />
                    </div>

                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-ios-gray-200 dark:border-ios-gray-800">
                        <h2 className="text-lg font-semibold text-ios-gray-950 dark:text-white">
                            Profil
                        </h2>
                        <button
                            onClick={onClose}
                            className="p-2 -m-2 rounded-full hover:bg-ios-gray-100 dark:hover:bg-ios-gray-800
                           transition-colors active:scale-95"
                        >
                            <X className="w-5 h-5 text-ios-gray-600 dark:text-ios-gray-400" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-6">
                        {/* User Info */}
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-ios-blue to-ios-purple
                                flex items-center justify-center text-white text-xl font-bold shadow-ios">
                                {user?.username?.slice(0, 2).toUpperCase() || 'U'}
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-ios-gray-950 dark:text-white">
                                    {capitalizeUsername(user?.username) || 'Benutzer'}
                                </h3>
                                <p className="text-sm text-ios-gray-600 dark:text-ios-gray-400">
                                    Willkommen zurück!
                                </p>
                            </div>
                        </div>

                        {/* Konto-Sicherheit */}
                        <div className="space-y-3">
                            <h3 className="text-xs font-semibold text-ios-gray-500 dark:text-ios-gray-400 uppercase tracking-wide px-1">
                                Konto-Sicherheit
                            </h3>

                            {/* Email Address */}
                            <button
                                onClick={() => {
                                    setEmailInput(user?.email || '');
                                    setShowEmailEditor(true);
                                }}
                                className="w-full flex items-center justify-between p-4 bg-ios-gray-50 dark:bg-ios-gray-800
                                rounded-ios-xl transition-transform active:scale-[0.98]"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-1 bg-ios-blue/10 rounded-lg">
                                        <Mail className="w-5 h-5 text-ios-blue" />
                                    </div>
                                    <div className="text-left">
                                        <span className="font-medium text-ios-gray-950 dark:text-white block">
                                            E-Mail-Adresse
                                        </span>
                                        <span className="text-sm text-ios-gray-500 dark:text-ios-gray-400 block mt-0.5">
                                            {user?.email || 'Nicht hinterlegt'}
                                        </span>
                                    </div>
                                </div>
                                <span className="text-ios-gray-400">›</span>
                            </button>

                            {/* Change Password */}
                            <button
                                onClick={() => setShowPasswordEditor(true)}
                                className="w-full flex items-center justify-between p-4 bg-ios-gray-50 dark:bg-ios-gray-800
                                rounded-ios-xl transition-transform active:scale-[0.98]"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-1 bg-ios-orange/10 rounded-lg">
                                        <KeyRound className="w-5 h-5 text-ios-orange" />
                                    </div>
                                    <div className="text-left">
                                        <span className="font-medium text-ios-gray-950 dark:text-white block">
                                            Passwort ändern
                                        </span>
                                        <span className="text-sm text-ios-gray-500 dark:text-ios-gray-400 block mt-0.5">
                                            Reguläre Passwort-Änderung
                                        </span>
                                    </div>
                                </div>
                                <span className="text-ios-gray-400">›</span>
                            </button>
                        </div>

                        {/* App-Einstellungen */}
                        <div className="space-y-3">
                            <h3 className="text-xs font-semibold text-ios-gray-500 dark:text-ios-gray-400 uppercase tracking-wide px-1">
                                App-Einstellungen
                            </h3>

                            {/* Dark Mode Toggle */}
                            <div className="flex items-center justify-between p-4 bg-ios-gray-50 dark:bg-ios-gray-800
                                rounded-ios-xl">
                                <div className="flex items-center gap-3">
                                    <div className={`p-1 ${isDarkMode ? 'bg-ios-purple/10' : 'bg-ios-orange/10'} rounded-lg`}>
                                        {isDarkMode ? (
                                            <Moon className="w-5 h-5 text-ios-purple" />
                                        ) : (
                                            <Sun className="w-5 h-5 text-ios-orange" />
                                        )}
                                    </div>
                                    <span className="font-medium text-ios-gray-950 dark:text-white">
                                        Dunkelmodus
                                    </span>
                                </div>
                                <button
                                    onClick={toggleDarkMode}
                                    className={`relative w-14 h-8 rounded-full transition-colors duration-300 ${isDarkMode ? 'bg-ios-purple' : 'bg-ios-gray-300'
                                        }`}
                                >
                                    <div
                                        className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-ios transition-transform duration-300 ${isDarkMode ? 'translate-x-7' : 'translate-x-1'
                                            }`}
                                    />
                                </button>
                            </div>

                            {/* Push Notification Status */}
                            <div className="p-4 bg-ios-gray-50 dark:bg-ios-gray-800 rounded-ios-xl overflow-hidden">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="p-1 bg-ios-blue/10 rounded-lg shrink-0">
                                            <StatusIcon className={`w-5 h-5 ${statusInfo.color}`} />
                                        </div>
                                        <div className="min-w-0">
                                            <span className="font-medium text-ios-gray-950 dark:text-white">
                                                Benachrichtigungen
                                            </span>
                                            <p className={`text-xs ${statusInfo.color} mt-0.5`}>
                                                {statusInfo.text}
                                            </p>
                                        </div>
                                    </div>
                                    {(pushStatus === 'default' || pushStatus === 'denied' || pushStatus === 'disabled') && (
                                        <button
                                            onClick={pushStatus === 'disabled' ? handleRequestPush : handleRequestPush}
                                            disabled={pushRequesting}
                                            className="px-3 py-1.5 bg-ios-blue text-white text-sm font-medium rounded-ios
                                                     transition-all active:scale-95 disabled:opacity-50"
                                        >
                                            {pushRequesting ? '...' : pushStatus === 'denied' ? 'Erneut anfragen' : 'Aktivieren'}
                                        </button>
                                    )}
                                    {pushStatus === 'granted' && (
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <button
                                                onClick={handleCheckPush}
                                                disabled={pushRequesting}
                                                className="px-2.5 py-1.5 bg-ios-gray-200 dark:bg-ios-gray-700 text-ios-gray-700
                                                         dark:text-ios-gray-200 text-xs font-medium rounded-ios
                                                         transition-all active:scale-95 disabled:opacity-50"
                                            >
                                                {pushRequesting ? '...' : 'Prüfen'}
                                            </button>
                                            <button
                                                onClick={handleDisablePush}
                                                disabled={pushRequesting}
                                                className="px-2.5 py-1.5 bg-ios-red/10 text-ios-red text-xs font-medium rounded-ios
                                                         transition-all active:scale-95 disabled:opacity-50"
                                            >
                                                Aus
                                            </button>
                                        </div>
                                    )}
                                </div>
                                {pushStatus === 'denied' && (
                                    <p className="text-xs text-ios-gray-500 mt-2 ml-9">
                                        Falls die Anfrage nicht erscheint, erlaube Benachrichtigungen in deinen Browser-Einstellungen.
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Soziales */}
                        <div className="space-y-3">
                            <h3 className="text-xs font-semibold text-ios-gray-500 dark:text-ios-gray-400 uppercase tracking-wide px-1">
                                Soziales
                            </h3>

                            {/* Friends Button */}
                            <button
                                onClick={() => setShowShareModal(true)}
                                className="w-full flex items-center justify-between p-4 bg-ios-gray-50 dark:bg-ios-gray-800
                                rounded-ios-xl transition-transform active:scale-[0.98]"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-1 bg-ios-green/10 rounded-lg">
                                        <Users className="w-5 h-5 text-ios-green" />
                                    </div>
                                    <div className="text-left">
                                        <span className="font-medium text-ios-gray-950 dark:text-white block">
                                            Freunde
                                        </span>
                                        <span className="text-xs text-ios-gray-500 dark:text-ios-gray-400 block mt-0.5">
                                            Reisedaten teilen und synchronisieren
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {inviteData?.pending?.length > 0 && (
                                        <div className="w-5 h-5 rounded-full bg-ios-red text-white text-xs font-bold
                                                flex items-center justify-center shadow-sm animate-scale-in">
                                            {inviteData.pending.length}
                                        </div>
                                    )}
                                    {inviteData?.shared?.length > 0 && !inviteData?.pending?.length && (
                                        <div className="w-5 h-5 rounded-full bg-ios-gray-200 dark:bg-ios-gray-700
                                                text-ios-gray-600 dark:text-ios-gray-300 text-xs font-bold
                                                flex items-center justify-center">
                                            {inviteData.shared.length}
                                        </div>
                                    )}
                                    <span className="text-ios-gray-400">›</span>
                                </div>
                            </button>
                        </div>

                        {/* Daten & Export */}
                        <div className="space-y-3">
                            <h3 className="text-xs font-semibold text-ios-gray-500 dark:text-ios-gray-400 uppercase tracking-wide px-1">
                                Daten & Export
                            </h3>
                            <button
                                onClick={handleExportData}
                                className="w-full flex items-center justify-between p-4 bg-ios-gray-50 dark:bg-ios-gray-800
                                rounded-ios-xl transition-transform active:scale-[0.98]"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-1 bg-ios-blue/10 rounded-lg">
                                        <Download className="w-5 h-5 text-ios-blue" />
                                    </div>
                                    <span className="font-medium text-ios-gray-950 dark:text-white">
                                        Daten exportieren
                                    </span>
                                </div>
                                <span className="text-ios-gray-400">›</span>
                            </button>

                            {/* Export Calendar Button */}
                            <button
                                onClick={handleExportCalendar}
                                className="w-full flex items-center justify-between p-4 bg-ios-gray-50 dark:bg-ios-gray-800
                                rounded-ios-xl transition-transform active:scale-[0.98]"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-1 bg-ios-orange/10 rounded-lg">
                                        <Calendar className="w-5 h-5 text-ios-orange" />
                                    </div>
                                    <span className="font-medium text-ios-gray-950 dark:text-white">
                                        Als Kalender (.ics) exportieren
                                    </span>
                                </div>
                                <span className="text-ios-gray-400">›</span>
                            </button>

                            {/* Import Data Button */}
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={importing}
                                className="w-full flex items-center justify-between p-4 bg-ios-gray-50 dark:bg-ios-gray-800
                                rounded-ios-xl transition-transform active:scale-[0.98] disabled:opacity-50"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-1 bg-ios-green/10 rounded-lg">
                                        <Upload className="w-5 h-5 text-ios-green" />
                                    </div>
                                    <div className="text-left">
                                        <span className="font-medium text-ios-gray-950 dark:text-white">
                                            {importing ? 'Importiere...' : 'Daten importieren'}
                                        </span>
                                        <p className="text-xs text-ios-gray-500 mt-0.5">
                                            JSON-Export-Datei einlesen
                                        </p>
                                    </div>
                                </div>
                                <span className="text-ios-gray-400">›</span>
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".json"
                                onChange={handleImportData}
                                className="hidden"
                            />

                        </div>

                        {/* Hilfe & Info */}
                        <div className="space-y-3">
                            <h3 className="text-xs font-semibold text-ios-gray-500 dark:text-ios-gray-400 uppercase tracking-wide px-1">
                                Hilfe & Info
                            </h3>

                            {/* Repeat Onboarding Button */}
                            <button
                                onClick={() => {
                                    resetOnboarding();
                                    onClose();
                                    addToast('Einführung wird beim nächsten Laden gezeigt', 'info');
                                }}
                                className="w-full flex items-center justify-between p-4 bg-ios-gray-50 dark:bg-ios-gray-800
                                rounded-ios-xl transition-transform active:scale-[0.98]"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-1 bg-ios-indigo/10 rounded-lg">
                                        <Info className="w-5 h-5 text-ios-indigo" />
                                    </div>
                                    <span className="font-medium text-ios-gray-950 dark:text-white">
                                        Einführung wiederholen
                                    </span>
                                </div>
                                <span className="text-ios-gray-400">›</span>
                            </button>

                            {/* Reload App Button */}
                            <button
                                onClick={handleReloadApp}
                                className="w-full flex items-center justify-between p-4 bg-ios-gray-50 dark:bg-ios-gray-800
                                rounded-ios-xl transition-transform active:scale-[0.98]"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-1 bg-ios-purple/10 rounded-lg">
                                        <RefreshCw className="w-5 h-5 text-ios-purple" />
                                    </div>
                                    <div className="text-left">
                                        <span className="font-medium text-ios-gray-950 dark:text-white">
                                            App neu laden
                                        </span>
                                        <p className="text-xs text-ios-gray-500 mt-0.5">
                                            Cache leeren und App neu starten
                                        </p>
                                    </div>
                                </div>
                                <span className="text-ios-gray-400">›</span>
                            </button>
                        </div>

                        {/* Gefahrenzone */}
                        <div className="space-y-3">
                            <h3 className="text-xs font-semibold text-ios-gray-500 dark:text-ios-gray-400 uppercase tracking-wide px-1 text-ios-red">
                                Gefahrenzone
                            </h3>

                            {/* Delete Account Button */}
                            <button
                                onClick={() => {
                                    setDeleteUsername('');
                                    setShowDeleteAccountDialog(true);
                                }}
                                className="w-full flex items-center justify-between p-4 bg-ios-gray-50 dark:bg-ios-gray-800
                                rounded-ios-xl transition-transform active:scale-[0.98]"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-1 bg-ios-red/10 rounded-lg">
                                        <AlertTriangle className="w-5 h-5 text-ios-red" />
                                    </div>
                                    <div className="text-left">
                                        <span className="font-medium text-ios-red">
                                            Benutzerkonto löschen
                                        </span>
                                        <p className="text-xs text-ios-gray-500 mt-0.5">
                                            Diesen Vorgang kann man nicht widerrufen
                                        </p>
                                    </div>
                                </div>
                                <span className="text-ios-gray-400">›</span>
                            </button>
                        </div>

                        {/* App Info - Now Clickable */}
                        <button
                            onClick={() => setShowChangelog(true)}
                            className="w-full p-4 bg-ios-gray-50 dark:bg-ios-gray-800 rounded-ios-xl border border-ios-gray-200 dark:border-ios-gray-700 text-left transition-colors active:bg-ios-gray-100 dark:active:bg-ios-gray-700"
                        >
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-1.5 bg-ios-blue/10 rounded-lg">
                                    <Info className="w-5 h-5 text-ios-blue" />
                                </div>
                                <span className="font-semibold text-ios-gray-950 dark:text-white flex-1">
                                    Über NipponGo
                                </span>
                                <span className="text-ios-gray-400">›</span>
                            </div>

                            <div className="space-y-3 ml-11">
                                <div>
                                    <p className="text-sm font-medium text-ios-gray-950 dark:text-white">
                                        Version {APP_VERSION}
                                    </p>
                                    <p className="text-xs text-ios-gray-500 dark:text-ios-gray-400 mt-0.5">
                                        Dein ultimativer Japan-Reisebegleiter.
                                    </p>
                                </div>

                                <div className="h-px bg-ios-gray-200 dark:bg-ios-gray-700 w-full" />

                                <div>
                                    <p className="text-xs text-ios-gray-600 dark:text-ios-gray-300 leading-relaxed">
                                        Entwickelt mit ❤️ von <span className="font-semibold text-ios-blue dark:text-ios-blue">Ashkan Navid</span>.
                                    </p>
                                    <p className="text-xs text-ios-gray-500 dark:text-ios-gray-400 mt-1.5 leading-relaxed">
                                        Wusstest du schon? In Japan gibt es über 5 Millionen Getränkeautomaten (Jidōhanbaiki) – das ist etwa einer für jeden 23. Einwohner!
                                    </p>
                                </div>
                            </div>
                        </button>

                        {/* Logout Button */}
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center justify-center gap-2 py-4 bg-ios-red/10 text-ios-red
                           rounded-ios-xl font-medium transition-all active:scale-[0.98] active:bg-ios-red/20"
                        >
                            <LogOut className="w-5 h-5" />
                            Abmelden
                        </button>
                    </div>
                </div>
            </div>

            {/* Share List Modal (Layered on top) */}
            <ShareListModal
                isOpen={showShareModal}
                onClose={() => setShowShareModal(false)}
            />

            {/* Email Editor Dialog */}
            {showEmailEditor && (
                <div
                    className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4"
                    onClick={() => !emailSaving && setShowEmailEditor(false)}
                >
                    <div
                        className="bg-white dark:bg-ios-gray-900 rounded-ios-2xl w-full max-w-sm p-6
                                 shadow-2xl animate-scale-in"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Icon */}
                        <div className="w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-4 bg-ios-blue/10 text-ios-blue">
                            <Mail className="w-6 h-6" />
                        </div>

                        {/* Title */}
                        <h3 className="text-lg font-semibold text-ios-gray-950 dark:text-white text-center mb-2">
                            E-Mail-Adresse ändern
                        </h3>

                        {/* Message */}
                        <p className="text-ios-gray-600 dark:text-ios-gray-400 text-center text-xs mb-6">
                            Änderungen gelten sofort ohne Bestätigung. Eine Info wird an die alte und neue Adresse gesendet.
                        </p>

                        <div className="mb-6">
                            <input
                                type="email"
                                placeholder="E-Mail-Adresse"
                                value={emailInput}
                                onChange={(e) => setEmailInput(e.target.value)}
                                disabled={emailSaving}
                                className="w-full px-4 py-3 rounded-ios-xl bg-ios-gray-100 dark:bg-ios-gray-800
                                         border-2 border-transparent focus:border-ios-blue/30
                                         text-ios-gray-950 dark:text-white placeholder-ios-gray-400
                                         transition-all outline-none"
                            />
                        </div>

                        {/* Buttons */}
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowEmailEditor(false)}
                                disabled={emailSaving}
                                className="flex-1 py-3 bg-ios-gray-100 dark:bg-ios-gray-800 text-ios-gray-700 dark:text-ios-gray-300
                                         rounded-ios-lg font-medium transition-all active:scale-[0.98] disabled:opacity-50"
                            >
                                Abbrechen
                            </button>
                            <button
                                onClick={handleSaveEmail}
                                disabled={emailSaving || !emailInput}
                                className="flex-1 py-3 text-white rounded-ios-lg font-medium bg-ios-blue
                                          transition-all active:scale-[0.98] disabled:opacity-50"
                            >
                                {emailSaving ? 'Speichert...' : 'Speichern'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Password Change Dialog */}
            {showPasswordEditor && (
                <div
                    className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4"
                    onClick={() => !passwordSaving && setShowPasswordEditor(false)}
                >
                    <div
                        className="bg-white dark:bg-ios-gray-900 rounded-ios-2xl w-full max-w-sm p-6
                                 shadow-2xl animate-scale-in max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Icon */}
                        <div className="w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-4 bg-ios-orange/10 text-ios-orange">
                            <KeyRound className="w-6 h-6" />
                        </div>

                        {/* Title */}
                        <h3 className="text-lg font-semibold text-ios-gray-950 dark:text-white text-center mb-6">
                            Passwort ändern
                        </h3>

                        <div className="space-y-4 mb-6">
                            {/* Current Password */}
                            <div>
                                <label className="block text-xs font-medium text-ios-gray-500 mb-1.5 ml-1">
                                    Aktuelles Passwort
                                </label>
                                <div className="relative">
                                    <input
                                        type={showCurrentPassword ? 'text' : 'password'}
                                        placeholder="Aktuelles Passwort"
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        disabled={passwordSaving}
                                        className="w-full px-4 py-3 pr-12 rounded-ios-xl bg-ios-gray-100 dark:bg-ios-gray-800
                                                 border-2 border-transparent focus:border-ios-orange/30
                                                 text-ios-gray-950 dark:text-white placeholder-ios-gray-400
                                                 transition-all outline-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                                    >
                                        {showCurrentPassword ? (
                                            <EyeOff className="w-5 h-5 text-ios-gray-400" />
                                        ) : (
                                            <Eye className="w-5 h-5 text-ios-gray-400" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* New Password */}
                            <div>
                                <label className="block text-xs font-medium text-ios-gray-500 mb-1.5 ml-1">
                                    Neues Passwort
                                </label>
                                <div className="relative">
                                    <input
                                        type={showNewPassword ? 'text' : 'password'}
                                        placeholder="Neues Passwort"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        disabled={passwordSaving}
                                        className="w-full px-4 py-3 pr-12 rounded-ios-xl bg-ios-gray-100 dark:bg-ios-gray-800
                                                 border-2 border-transparent focus:border-ios-orange/30
                                                 text-ios-gray-950 dark:text-white placeholder-ios-gray-400
                                                 transition-all outline-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                                    >
                                        {showNewPassword ? (
                                            <EyeOff className="w-5 h-5 text-ios-gray-400" />
                                        ) : (
                                            <Eye className="w-5 h-5 text-ios-gray-400" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Confirm New Password */}
                            <div>
                                <label className="block text-xs font-medium text-ios-gray-500 mb-1.5 ml-1">
                                    Neues Passwort bestätigen
                                </label>
                                <input
                                    type="password"
                                    placeholder="Neues Passwort bestätigen"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    disabled={passwordSaving}
                                    className="w-full px-4 py-3 rounded-ios-xl bg-ios-gray-100 dark:bg-ios-gray-800
                                             border-2 border-transparent focus:border-ios-orange/30
                                             text-ios-gray-950 dark:text-white placeholder-ios-gray-400
                                             transition-all outline-none"
                                />
                            </div>

                            {/* Password Requirements */}
                            <div className="p-3 bg-ios-gray-50 dark:bg-ios-gray-800 rounded-ios-lg">
                                <p className="text-xs text-ios-gray-600 dark:text-ios-gray-400 leading-relaxed">
                                    <strong>Passwort-Anforderungen:</strong><br />
                                    • Mindestens 8 Zeichen<br />
                                    • Mindestens ein Kleinbuchstabe<br />
                                    • Mindestens ein Großbuchstabe<br />
                                    • Mindestens eine Zahl
                                </p>
                            </div>
                        </div>

                        {/* Buttons */}
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowPasswordEditor(false);
                                    setCurrentPassword('');
                                    setNewPassword('');
                                    setConfirmPassword('');
                                }}
                                disabled={passwordSaving}
                                className="flex-1 py-3 bg-ios-gray-100 dark:bg-ios-gray-800 text-ios-gray-700 dark:text-ios-gray-300
                                         rounded-ios-lg font-medium transition-all active:scale-[0.98] disabled:opacity-50"
                            >
                                Abbrechen
                            </button>
                            <button
                                onClick={handleChangePassword}
                                disabled={passwordSaving || !currentPassword || !newPassword || !confirmPassword}
                                className="flex-1 py-3 text-white rounded-ios-lg font-medium bg-ios-orange
                                          transition-all active:scale-[0.98] disabled:opacity-50"
                            >
                                {passwordSaving ? 'Ändert...' : 'Ändern'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Account Deletion Dialog */}
            {showDeleteAccountDialog && (
                <div
                    className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4"
                    onClick={() => !isDeletingAccount && setShowDeleteAccountDialog(false)}
                >
                    <div
                        className="bg-white dark:bg-ios-gray-900 rounded-ios-2xl w-full max-w-sm p-6 
                                 shadow-2xl animate-scale-in"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Icon */}
                        <div className="w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-4 bg-ios-red/10 text-ios-red">
                            <AlertTriangle className="w-6 h-6" />
                        </div>

                        {/* Title */}
                        <h3 className="text-lg font-semibold text-ios-gray-950 dark:text-white text-center mb-2">
                            Konto endgültig löschen?
                        </h3>

                        {/* Message */}
                        <p className="text-ios-gray-600 dark:text-ios-gray-400 text-center text-sm mb-6">
                            Bist du sicher, dass du dein Benutzerkonto vollständig und ohne Möglichkeit der Wiederherstellung löschen möchtest?
                        </p>

                        <div className="mb-6">
                            <label className="block text-xs font-medium text-ios-gray-500 mb-1.5 ml-1">
                                Bitte gib zur Bestätigung deinen Benutzernamen ein:
                            </label>
                            <input
                                type="text"
                                placeholder="Benutzername"
                                value={deleteUsername}
                                onChange={(e) => setDeleteUsername(e.target.value)}
                                disabled={isDeletingAccount}
                                className="w-full px-4 py-3 rounded-ios-xl bg-ios-gray-100 dark:bg-ios-gray-800
                                         border-2 border-transparent focus:border-ios-red/30
                                         text-ios-gray-950 dark:text-white placeholder-ios-gray-400
                                         transition-all outline-none"
                            />
                        </div>

                        {/* Buttons */}
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeleteAccountDialog(false)}
                                disabled={isDeletingAccount}
                                className="flex-1 py-3 bg-ios-gray-100 dark:bg-ios-gray-800 text-ios-gray-700 dark:text-ios-gray-300
                                         rounded-ios-lg font-medium transition-all active:scale-[0.98] disabled:opacity-50"
                            >
                                Abbrechen
                            </button>
                            <button
                                onClick={handleDeleteAccount}
                                disabled={isDeletingAccount || !deleteUsername}
                                className="flex-1 py-3 text-white rounded-ios-lg font-medium bg-ios-red
                                          transition-all active:scale-[0.98] disabled:opacity-50"
                            >
                                {isDeletingAccount ? 'Lösche...' : 'Endgültig löschen'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Changelog Modal */}
            {showChangelog && (
                <div
                    className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4"
                    onClick={() => setShowChangelog(false)}
                >
                    <div
                        className="bg-white dark:bg-ios-gray-900 rounded-ios-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden
                                 shadow-2xl animate-scale-in flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-ios-gray-200 dark:border-ios-gray-800">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-ios-blue/10 text-ios-blue">
                                    <FileText className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-ios-gray-950 dark:text-white">
                                        Änderungshistorie
                                    </h3>
                                    <p className="text-sm text-ios-gray-500 dark:text-ios-gray-400">
                                        Version {APP_VERSION}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowChangelog(false)}
                                className="p-2 rounded-full hover:bg-ios-gray-100 dark:hover:bg-ios-gray-800 transition-colors"
                            >
                                <X className="w-5 h-5 text-ios-gray-500" />
                            </button>
                        </div>

                        {/* Changelog Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-8">
                            {changelog.map((version, index) => (
                                <div key={version.version} className={index === 0 ? '' : 'pt-8 border-t border-ios-gray-200 dark:border-ios-gray-800'}>
                                    {/* Version Header */}
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className={`px-3 py-1 rounded-ios-lg font-semibold text-sm ${index === 0
                                            ? 'bg-ios-blue text-white'
                                            : 'bg-ios-gray-100 dark:bg-ios-gray-800 text-ios-gray-700 dark:text-ios-gray-300'
                                            }`}>
                                            v{version.version}
                                        </div>
                                        <span className="text-sm text-ios-gray-500 dark:text-ios-gray-400">
                                            {new Date(version.date).toLocaleDateString('de-DE', {
                                                day: '2-digit',
                                                month: 'long',
                                                year: 'numeric'
                                            })}
                                        </span>
                                        {index === 0 && (
                                            <span className="ml-auto px-2 py-0.5 bg-ios-green/10 text-ios-green text-xs font-medium rounded-full">
                                                Aktuell
                                            </span>
                                        )}
                                    </div>

                                    {/* Changes */}
                                    <div className="space-y-4">
                                        {/* Neu */}
                                        {version.changes.neu?.length > 0 && (
                                            <div>
                                                <h4 className="text-sm font-semibold text-ios-green mb-2 flex items-center gap-2">
                                                    <span className="w-5 h-5 rounded-full bg-ios-green/10 flex items-center justify-center text-xs">
                                                        +
                                                    </span>
                                                    Neu
                                                </h4>
                                                <ul className="space-y-2 ml-7">
                                                    {version.changes.neu.map((item, i) => (
                                                        <li key={i} className="text-sm text-ios-gray-700 dark:text-ios-gray-300 leading-relaxed">
                                                            • {item}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {/* Verbessert */}
                                        {version.changes.verbessert?.length > 0 && (
                                            <div>
                                                <h4 className="text-sm font-semibold text-ios-blue mb-2 flex items-center gap-2">
                                                    <span className="w-5 h-5 rounded-full bg-ios-blue/10 flex items-center justify-center text-xs">
                                                        ↑
                                                    </span>
                                                    Verbessert
                                                </h4>
                                                <ul className="space-y-2 ml-7">
                                                    {version.changes.verbessert.map((item, i) => (
                                                        <li key={i} className="text-sm text-ios-gray-700 dark:text-ios-gray-300 leading-relaxed">
                                                            • {item}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {/* Fehlerbehebungen */}
                                        {version.changes.fehlerbehebungen?.length > 0 && (
                                            <div>
                                                <h4 className="text-sm font-semibold text-ios-orange mb-2 flex items-center gap-2">
                                                    <span className="w-5 h-5 rounded-full bg-ios-orange/10 flex items-center justify-center text-xs">
                                                        ✓
                                                    </span>
                                                    Fehlerbehebungen
                                                </h4>
                                                <ul className="space-y-2 ml-7">
                                                    {version.changes.fehlerbehebungen.map((item, i) => (
                                                        <li key={i} className="text-sm text-ios-gray-700 dark:text-ios-gray-300 leading-relaxed">
                                                            • {item}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {/* Entfernt */}
                                        {version.changes.entfernt?.length > 0 && (
                                            <div>
                                                <h4 className="text-sm font-semibold text-ios-red mb-2 flex items-center gap-2">
                                                    <span className="w-5 h-5 rounded-full bg-ios-red/10 flex items-center justify-center text-xs">
                                                        −
                                                    </span>
                                                    Entfernt
                                                </h4>
                                                <ul className="space-y-2 ml-7">
                                                    {version.changes.entfernt.map((item, i) => (
                                                        <li key={i} className="text-sm text-ios-gray-700 dark:text-ios-gray-300 leading-relaxed">
                                                            • {item}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-ios-gray-200 dark:border-ios-gray-800">
                            <button
                                onClick={() => setShowChangelog(false)}
                                className="w-full py-3 bg-ios-blue text-white rounded-ios-lg font-medium transition-all active:scale-[0.98]"
                            >
                                Schließen
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
