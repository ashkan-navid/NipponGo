'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Lock, Eye, EyeOff, CheckCircle, X } from 'lucide-react';

function ResetPasswordForm() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const validatePassword = () => {
        if (password.length < 8) {
            return 'Passwort muss mindestens 8 Zeichen lang sein';
        }
        if (!/[a-z]/.test(password)) {
            return 'Passwort muss mindestens einen Kleinbuchstaben enthalten';
        }
        if (!/[A-Z]/.test(password)) {
            return 'Passwort muss mindestens einen Großbuchstaben enthalten';
        }
        if (!/[0-9]/.test(password)) {
            return 'Passwort muss mindestens eine Zahl enthalten';
        }
        if (password !== confirmPassword) {
            return 'Passwörter stimmen nicht überein';
        }
        return null;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        const validationError = validatePassword();
        if (validationError) {
            setError(validationError);
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch('/api/auth/reset', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Fehler beim Zurücksetzen des Passworts');
            }

            setSuccess(true);
        } catch (err) {
            setError(err.message || 'Ein unerwarteter Fehler ist aufgetreten');
        } finally {
            setIsLoading(false);
        }
    };

    if (!token) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-ios-blue via-ios-purple to-ios-pink">
                {/* Background decoration */}
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute top-1/4 -left-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
                    <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
                </div>

                {/* Content */}
                <div className="relative z-10 w-full max-w-sm">
                    {/* Logo/Header */}
                    <div className="text-center mb-8">
                        <img
                            src="/icons/icon-192x192.png"
                            alt="NipponGo Logo"
                            className="w-20 h-20 mx-auto mb-4 bg-white rounded-ios-2xl shadow-ios-lg object-cover"
                        />
                        <h1 className="text-3xl font-bold text-white mb-2">Japan Reise</h1>
                        <p className="text-white/80">Dein persönlicher Reisebegleiter</p>
                    </div>

                    {/* Error Card */}
                    <div className="bg-white/95 dark:bg-ios-gray-900/95 backdrop-blur-ios rounded-ios-3xl
                            shadow-ios-lg p-8">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-16 h-16 rounded-full bg-ios-red/10 flex items-center justify-center mb-4">
                                <X className="w-8 h-8 text-ios-red" />
                            </div>
                            <h2 className="text-xl font-bold text-ios-gray-950 dark:text-white mb-2">
                                Ungültiger Link
                            </h2>
                            <p className="text-ios-gray-600 dark:text-ios-gray-400 mb-6">
                                Dieser Link ist ungültig oder abgelaufen. Bitte fordere einen neuen Link an.
                            </p>
                            <button
                                onClick={() => router.push('/')}
                                className="w-full py-4 bg-gradient-to-r from-ios-blue to-ios-purple text-white
                                     rounded-ios-xl font-semibold shadow-ios transition-all active:scale-[0.98]"
                            >
                                Zur Anmeldung
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-ios-blue via-ios-purple to-ios-pink">
                {/* Background decoration */}
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute top-1/4 -left-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
                    <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
                </div>

                {/* Content */}
                <div className="relative z-10 w-full max-w-sm">
                    {/* Logo/Header */}
                    <div className="text-center mb-8">
                        <img
                            src="/icons/icon-192x192.png"
                            alt="NipponGo Logo"
                            className="w-20 h-20 mx-auto mb-4 bg-white rounded-ios-2xl shadow-ios-lg object-cover"
                        />
                        <h1 className="text-3xl font-bold text-white mb-2">Japan Reise</h1>
                        <p className="text-white/80">Dein persönlicher Reisebegleiter</p>
                    </div>

                    {/* Success Card */}
                    <div className="bg-white/95 dark:bg-ios-gray-900/95 backdrop-blur-ios rounded-ios-3xl
                            shadow-ios-lg p-8">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-16 h-16 rounded-full bg-ios-green/10 flex items-center justify-center mb-4">
                                <CheckCircle className="w-8 h-8 text-ios-green" />
                            </div>
                            <h2 className="text-xl font-bold text-ios-gray-950 dark:text-white mb-2">
                                Passwort erfolgreich geändert
                            </h2>
                            <p className="text-ios-gray-600 dark:text-ios-gray-400 mb-6">
                                Du kannst dich jetzt mit deinem neuen Passwort anmelden.
                            </p>
                            <button
                                onClick={() => router.push('/')}
                                className="w-full py-4 bg-gradient-to-r from-ios-blue to-ios-purple text-white
                                     rounded-ios-xl font-semibold shadow-ios transition-all active:scale-[0.98]"
                            >
                                Zur Anmeldung
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-ios-blue via-ios-purple to-ios-pink">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-1/4 -left-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
            </div>

            {/* Content */}
            <div className="relative z-10 w-full max-w-sm">
                {/* Logo/Header */}
                <div className="text-center mb-8">
                    <img
                        src="/icons/icon-192x192.png"
                        alt="NipponGo Logo"
                        className="w-20 h-20 mx-auto mb-4 bg-white rounded-ios-2xl shadow-ios-lg object-cover"
                    />
                    <h1 className="text-3xl font-bold text-white mb-2">Japan Reise</h1>
                    <p className="text-white/80">Dein persönlicher Reisebegleiter</p>
                </div>

                {/* Form Card */}
                <div className="bg-white/95 dark:bg-ios-gray-900/95 backdrop-blur-ios rounded-ios-3xl
                        shadow-ios-lg p-8">
                    <h2 className="text-xl font-bold text-ios-gray-950 dark:text-white mb-6 text-center">
                        Neues Passwort festlegen
                    </h2>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* New Password */}
                        <div>
                            <label className="block text-xs font-medium text-ios-gray-500 dark:text-ios-gray-400 mb-1.5 ml-1">
                                Neues Passwort
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ios-gray-400" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Neues Passwort"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="input-ios pl-12 pr-12"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1"
                                >
                                    {showPassword ? (
                                        <EyeOff className="w-5 h-5 text-ios-gray-400" />
                                    ) : (
                                        <Eye className="w-5 h-5 text-ios-gray-400" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label className="block text-xs font-medium text-ios-gray-500 dark:text-ios-gray-400 mb-1.5 ml-1">
                                Passwort bestätigen
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ios-gray-400" />
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    placeholder="Passwort bestätigen"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    className="input-ios pl-12 pr-12"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1"
                                >
                                    {showConfirmPassword ? (
                                        <EyeOff className="w-5 h-5 text-ios-gray-400" />
                                    ) : (
                                        <Eye className="w-5 h-5 text-ios-gray-400" />
                                    )}
                                </button>
                            </div>
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

                        {/* Error */}
                        {error && (
                            <div className="p-3 bg-ios-red/10 rounded-ios-lg text-ios-red text-sm text-center">
                                {error}
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-4 bg-gradient-to-r from-ios-blue to-ios-purple text-white
                                 rounded-ios-xl font-semibold shadow-ios transition-all
                                 active:scale-[0.98] disabled:opacity-50"
                        >
                            {isLoading ? 'Bitte warten...' : 'Passwort ändern'}
                        </button>

                        {/* Back to Login */}
                        <button
                            type="button"
                            onClick={() => router.push('/')}
                            className="w-full py-3 text-ios-gray-600 dark:text-ios-gray-400 font-medium
                                     transition-all active:opacity-70"
                        >
                            Zurück zur Anmeldung
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-ios-blue via-ios-purple to-ios-pink">
                <div className="text-white text-lg">Lädt...</div>
            </div>
        }>
            <ResetPasswordForm />
        </Suspense>
    );
}
