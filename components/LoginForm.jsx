'use client';

import { useState } from 'react';
import { User, Lock, Eye, EyeOff, MapPin, X, Mail } from 'lucide-react';
import useAuthStore from '../store/authStore';

export default function LoginForm({ onClose }) {
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [email, setEmail] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Password reset states
    const [showResetForm, setShowResetForm] = useState(false);
    const [resetIdentifier, setResetIdentifier] = useState('');
    const [resetSuccess, setResetSuccess] = useState(false);
    const [resetLoading, setResetLoading] = useState(false);

    const { login, register } = useAuthStore();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const result = isLogin
                ? await login(username, password)
                : await register(username, password, email);

            if (!result.success) {
                // Translate common errors
                const errorTranslations = {
                    'Invalid credentials': 'Ungültige Anmeldedaten',
                    'Username already exists': 'Benutzername existiert bereits',
                    'Password must be at least 6 characters': 'Passwort muss mindestens 6 Zeichen haben',
                };
                setError(errorTranslations[result.error] || result.error);
            }
        } catch (err) {
            setError('Ein unerwarteter Fehler ist aufgetreten');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setResetLoading(true);

        try {
            const response = await fetch('/api/auth/reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier: resetIdentifier }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Fehler beim Senden der E-Mail');
            } else {
                setResetSuccess(true);
            }
        } catch (err) {
            setError('Ein unerwarteter Fehler ist aufgetreten');
        } finally {
            setResetLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-ios-blue via-ios-purple to-ios-pink">
            {/* Close button */}
            {onClose && (
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 z-20 w-10 h-10 bg-white/20 backdrop-blur rounded-full
                             flex items-center justify-center text-white transition-transform active:scale-95"
                >
                    <X className="w-5 h-5" />
                </button>
            )}

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
                    {!showResetForm && (
                        <>
                            {/* Toggle */}
                            <div className="flex bg-ios-gray-100 dark:bg-ios-gray-800 rounded-ios-lg p-1 mb-6">
                                <button
                                    type="button"
                                    onClick={() => setIsLogin(true)}
                                    className={`flex-1 py-2.5 rounded-ios font-medium text-sm transition-all ${isLogin
                                        ? 'bg-white dark:bg-ios-gray-700 text-ios-gray-950 dark:text-white shadow-ios'
                                        : 'text-ios-gray-600 dark:text-ios-gray-400'
                                        }`}
                                >
                                    Anmelden
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsLogin(false)}
                                    className={`flex-1 py-2.5 rounded-ios font-medium text-sm transition-all ${!isLogin
                                        ? 'bg-white dark:bg-ios-gray-700 text-ios-gray-950 dark:text-white shadow-ios'
                                        : 'text-ios-gray-600 dark:text-ios-gray-400'
                                        }`}
                                >
                                    Registrieren
                                </button>
                            </div>

                            {/* Form */}
                            <form onSubmit={handleSubmit} className="space-y-4">
                                {/* Username */}
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ios-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Benutzername"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        required
                                        autoComplete="username"
                                        className="input-ios pl-12 pr-4"
                                    />
                                </div>

                                {/* Email (only on registration) */}
                                {!isLogin && (
                                    <div>
                                        <div className="relative">
                                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ios-gray-400" />
                                            <input
                                                type="email"
                                                placeholder="E-Mail-Adresse"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                required
                                                autoComplete="email"
                                                className="input-ios pl-12 pr-4"
                                            />
                                        </div>
                                        <p className="mt-2 text-xs text-ios-gray-500 dark:text-ios-gray-400 px-1">
                                            Die E-Mail-Adresse wird ausschließlich zur Passwort-Zurücksetzung verwendet.
                                        </p>
                                    </div>
                                )}

                                {/* Password */}
                                <div>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ios-gray-400" />
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            placeholder="Passwort"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            autoComplete={isLogin ? 'current-password' : 'new-password'}
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

                                    {/* Forgot password link (only in login mode) */}
                                    {isLogin && (
                                        <div className="flex justify-end mt-2">
                                            <button
                                                type="button"
                                                onClick={() => setShowResetForm(true)}
                                                className="text-xs text-ios-blue hover:underline"
                                            >
                                                Passwort vergessen?
                                            </button>
                                        </div>
                                    )}
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
                                    {isLoading ? 'Bitte warten...' : (isLogin ? 'Anmelden' : 'Konto erstellen')}
                                </button>

                                {/* Cancel button */}
                                {onClose && (
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="w-full py-3 text-ios-gray-600 dark:text-ios-gray-400 font-medium
                                                 transition-all active:opacity-70"
                                    >
                                        Zurück
                                    </button>
                                )}
                            </form>

                            {/* Info */}
                            {!isLogin && (
                                <p className="mt-4 text-xs text-ios-gray-500 text-center">
                                    Passwort muss mindestens 6 Zeichen lang sein
                                </p>
                            )}
                        </>
                    )}

                    {/* Password Reset Form */}
                    {showResetForm && (
                        <div>
                            <h2 className="text-xl font-bold text-ios-gray-950 dark:text-white mb-6 text-center">
                                Passwort zurücksetzen
                            </h2>

                            {!resetSuccess ? (
                                <form onSubmit={handleResetSubmit} className="space-y-4">
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ios-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Benutzername oder E-Mail-Adresse"
                                            value={resetIdentifier}
                                            onChange={(e) => setResetIdentifier(e.target.value)}
                                            required
                                            className="input-ios pl-12 pr-4"
                                        />
                                    </div>

                                    {error && (
                                        <div className="p-3 bg-ios-red/10 rounded-ios-lg text-ios-red text-sm text-center">
                                            {error}
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={resetLoading}
                                        className="w-full py-4 bg-gradient-to-r from-ios-blue to-ios-purple text-white
                                             rounded-ios-xl font-semibold shadow-ios transition-all
                                             active:scale-[0.98] disabled:opacity-50"
                                    >
                                        {resetLoading ? 'Wird gesendet...' : 'Link anfordern'}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowResetForm(false);
                                            setResetIdentifier('');
                                            setError('');
                                        }}
                                        className="w-full py-3 text-ios-gray-600 dark:text-ios-gray-400 font-medium
                                                 transition-all active:opacity-70"
                                    >
                                        Zurück zur Anmeldung
                                    </button>
                                </form>
                            ) : (
                                <div className="space-y-4">
                                    <div className="p-4 bg-ios-green/10 rounded-ios-lg text-center">
                                        <p className="text-ios-green font-medium mb-2">
                                            E-Mail gesendet
                                        </p>
                                        <p className="text-sm text-ios-gray-600 dark:text-ios-gray-400">
                                            Falls ein Konto mit dieser Angabe existiert und eine E-Mail-Adresse hinterlegt ist, wurde eine E-Mail mit einem Link zum Zurücksetzen des Passworts gesendet.
                                        </p>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowResetForm(false);
                                            setResetSuccess(false);
                                            setResetIdentifier('');
                                            setError('');
                                        }}
                                        className="w-full py-3 text-ios-blue font-medium
                                                 transition-all active:opacity-70"
                                    >
                                        Zurück zur Anmeldung
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {!onClose && (
                    <p className="mt-6 text-center text-white/60 text-sm">
                        Ohne Anmeldung fortfahren um nur die Karte zu sehen
                    </p>
                )}
            </div>
        </div>
    );
}
