'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, UserPlus, Check, Trash2, Users } from 'lucide-react';
import { capitalizeUsername } from '../lib/utils';
import { apiFetch } from '../lib/apiClient';
import { hapticSuccess, hapticError } from '../lib/haptics';

export default function ShareListModal({ isOpen, onClose }) {
    const [inviteUsername, setInviteUsername] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const queryClient = useQueryClient();

    // Fetch invitations
    const { data: inviteData, isLoading } = useQuery({
        queryKey: ['invitations'],
        queryFn: async () => {
            const res = await fetch('/api/share');
            if (!res.ok) throw new Error('Failed to fetch invitations');
            return res.json();
        },
        enabled: isOpen,
        refetchInterval: 5000, // Poll every 5s while open
    });

    // Mutations
    const sendInviteMutation = useMutation({
        mutationFn: async (username) => {
            const res = await apiFetch('/api/share', {
                method: 'POST',
                body: JSON.stringify({ username }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            return data;
        },
        onSuccess: () => {
            hapticSuccess();
            setInviteUsername('');
            setErrorMessage('');
            queryClient.invalidateQueries(['invitations']);
        },
        onError: (err) => {
            hapticError();
            setErrorMessage(err.message);
        },
    });

    const respondMutation = useMutation({
        mutationFn: async ({ id, status }) => {
            const res = await apiFetch('/api/share', {
                method: 'PUT',
                body: JSON.stringify({ id, status }),
            });
            if (!res.ok) throw new Error('Action failed');
        },
        onSuccess: () => {
            hapticSuccess();
            queryClient.invalidateQueries(['invitations']);
            queryClient.invalidateQueries(['hotels']); // Refresh data visibility
            queryClient.invalidateQueries(['activities']);
        },
        onError: () => hapticError(),
    });

    const deleteMutation = useMutation({
        mutationFn: async (id) => {
            const res = await apiFetch(`/api/share?id=${id}`, {
                method: 'DELETE',
            });
            if (!res.ok) throw new Error('Deletion failed');
        },
        onSuccess: () => {
            hapticSuccess();
            queryClient.invalidateQueries(['invitations']);
            queryClient.invalidateQueries(['hotels']);
            queryClient.invalidateQueries(['activities']);
        },
        onError: () => hapticError(),
    });

    const handleSendInvite = (e) => {
        e.preventDefault();
        if (!inviteUsername.trim()) return;
        sendInviteMutation.mutate(inviteUsername.trim());
    };

    if (!isOpen) return null;

    return (
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

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-ios-gray-200 dark:border-ios-gray-800 sticky top-0 bg-inherit z-10">
                    <div className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-ios-green" />
                        <h2 className="text-lg font-semibold text-ios-gray-950 dark:text-white">
                            Freunde
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 -m-2 rounded-full hover:bg-ios-gray-100 dark:hover:bg-ios-gray-800 
                   transition-colors active:scale-95"
                    >
                        <X className="w-5 h-5 text-ios-gray-600 dark:text-ios-gray-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-8">

                    {/* Invite Form */}
                    <form onSubmit={handleSendInvite} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-ios-gray-600 dark:text-ios-gray-400 mb-2">
                                Freund hinzufügen
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={inviteUsername}
                                    onChange={(e) => setInviteUsername(e.target.value)}
                                    placeholder="Benutzername eingeben..."
                                    className="input-ios flex-1 px-4 py-2.5 bg-ios-gray-50 border-ios-gray-200 dark:border-ios-gray-700"
                                />
                                <button
                                    type="submit"
                                    disabled={!inviteUsername.trim() || sendInviteMutation.isPending}
                                    className="p-3 bg-ios-green text-white rounded-xl shadow-ios
                                 active:scale-95 transition-transform disabled:opacity-50 disabled:scale-100"
                                >
                                    <UserPlus className="w-5 h-5" />
                                </button>
                            </div>
                            {errorMessage && (
                                <p className="mt-2 text-xs text-ios-red animate-fade-in">
                                    {errorMessage}
                                </p>
                            )}
                        </div>
                    </form>

                    {/* Pending Invitations */}
                    {inviteData?.pending?.length > 0 && (
                        <div>
                            <h3 className="text-sm font-semibold text-ios-gray-500 mb-3 uppercase tracking-wider">
                                Freundschaftsanfragen
                            </h3>
                            <div className="space-y-3">
                                {inviteData.pending.map((invite) => (
                                    <div key={invite.id}
                                        className="flex items-center justify-between p-3 bg-ios-gray-50 dark:bg-ios-gray-800 rounded-xl border border-ios-gray-100 dark:border-ios-gray-700/50">
                                        <span className="font-medium text-ios-gray-950 dark:text-white">
                                            {capitalizeUsername(invite.other_username)}
                                        </span>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => respondMutation.mutate({ id: invite.id, status: 'rejected' })}
                                                className="p-2 bg-ios-red/10 text-ios-red rounded-lg active:scale-95"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => respondMutation.mutate({ id: invite.id, status: 'accepted' })}
                                                className="p-2 bg-ios-green/10 text-ios-green rounded-lg active:scale-95"
                                            >
                                                <Check className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Active Shares */}
                    {inviteData?.shared?.length > 0 && (
                        <div>
                            <h3 className="text-sm font-semibold text-ios-gray-500 mb-3 uppercase tracking-wider">
                                Freunde
                            </h3>
                            <div className="space-y-3">
                                {inviteData.shared.map((invite) => (
                                    <div key={invite.id}
                                        className="flex items-center justify-between p-3 bg-ios-blue/5 dark:bg-ios-blue/10 rounded-xl border border-ios-blue/10">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-ios-blue text-white flex items-center justify-center text-xs font-bold">
                                                {invite.other_username?.slice(0, 2).toUpperCase()}
                                            </div>
                                            <span className="font-medium text-ios-gray-950 dark:text-white">
                                                {capitalizeUsername(invite.other_username)}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => deleteMutation.mutate(invite.id)}
                                            className="p-2 bg-ios-gray-200 dark:bg-ios-gray-700 text-ios-gray-500 hover:text-ios-red transition-colors rounded-lg active:scale-95"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Outgoing Pending Invitations */}
                    {inviteData?.outgoing?.length > 0 && (
                        <div>
                            <h3 className="text-sm font-semibold text-ios-gray-500 mb-3 uppercase tracking-wider">
                                Gesendete Anfragen
                            </h3>
                            <div className="space-y-3">
                                {inviteData.outgoing.map((invite) => (
                                    <div key={invite.id}
                                        className="flex items-center justify-between p-3 bg-ios-gray-50 dark:bg-ios-gray-800 rounded-xl border border-ios-gray-100 dark:border-ios-gray-700/50">
                                        <div className="flex flex-col">
                                            <span className="font-medium text-ios-gray-950 dark:text-white">
                                                {capitalizeUsername(invite.other_username)}
                                            </span>
                                            <span className="text-xs text-ios-orange">Ausstehend</span>
                                        </div>
                                        <button
                                            onClick={() => deleteMutation.mutate(invite.id)}
                                            className="p-2 bg-ios-gray-200 dark:bg-ios-gray-700 text-ios-gray-500 hover:text-ios-red transition-colors rounded-lg active:scale-95"
                                            title="Anfrage zurückziehen"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Empty State */}
                    {(!inviteData?.pending?.length && !inviteData?.shared?.length && !inviteData?.outgoing?.length) && (
                        <div className="text-center py-8 text-ios-gray-400 text-sm">
                            <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p>Noch keine Freunde hinzugefügt.</p>
                            <p className="text-xs mt-1">Füge Freunde hinzu, um Reisepläne zu teilen.</p>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
