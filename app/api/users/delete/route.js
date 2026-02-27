import { NextResponse } from 'next/server';
import { z } from 'zod';
import { cookies } from 'next/headers';

const db = require('../../../../lib/db.js');
const { checkAuth, checkCSRF } = require('../../../../lib/withAuth.js');
const { clearSessionCookie } = require('../../../../lib/auth.js');
const { sendPushToUser } = require('../../../../lib/webpush.js');

const DeleteAccountSchema = z.object({
    username: z.string().min(1, "Benutzername ist erforderlich"),
});

export async function POST(request) {
    try {
        const user = await checkAuth();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // CSRF check
        const csrfResult = await checkCSRF(request);
        if (!csrfResult.valid) {
            return NextResponse.json({ error: csrfResult.error }, { status: 403 });
        }

        const bodyContent = await request.json();
        const parsed = DeleteAccountSchema.safeParse(bodyContent);

        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
        }

        const { username } = parsed.data;

        // Verify that the provided username matches the actual logged-in user's username
        if (username.toLowerCase() !== user.username.toLowerCase()) {
            return NextResponse.json({ error: 'Der eingegebene Benutzername stimmt nicht überein.' }, { status: 400 });
        }

        // Delete the user account and get the list of friend IDs
        const friendIds = db.deleteUserAccount(user.id);

        // Notify all friends via Socket.io and Push Notifications
        const io = global.__io;

        for (const friendId of friendIds) {
            // Notify via socket to update UI instantly
            if (io) {
                // Tell the friend to remove this user from their shared list
                io.to(`user:${friendId}`).emit('share-removed', { removedUserId: user.id });
                // Also trigger a general refresh of invitations and data to be safe
                io.to(`user:${friendId}`).emit('data-changed', { type: 'invitations' });
                io.to(`user:${friendId}`).emit('data-changed', { type: 'hotels' });
                io.to(`user:${friendId}`).emit('data-changed', { type: 'activities' });
            }

            // Send Push Notification
            sendPushToUser(friendId, {
                title: 'Freundschaft beendet',
                body: `Das Benutzerkonto von ${user.username} wurde gelöscht. Die Verbindung wurde getrennt.`,
                tag: 'friend-removed',
                data: { type: 'friend-removed' },
            });
        }

        // Emit a user-disconnected event to update online counters
        if (io) {
            io.emit('user-disconnected', { userId: user.id });
        }

        // Return the clear cookie instruction via Response headers
        const response = NextResponse.json({ success: true, message: 'Account erfolgreich gelöst.' });
        response.cookies.set(clearSessionCookie());

        return response;

    } catch (error) {
        console.error('Account deletion error:', error);
        return NextResponse.json({ error: 'Ein Fehler ist beim Löschen des Accounts aufgetreten.' }, { status: 500 });
    }
}
