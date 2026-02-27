import { NextResponse } from 'next/server';

const db = require('../../../lib/db.js');
const { checkAuth, checkCSRF } = require('../../../lib/withAuth.js');
const { checkRateLimit } = require('../../../lib/rateLimit.js');
const { sendPushToUser } = require('../../../lib/webpush.js');
import { z } from 'zod';

// Zod Schemas
const InviteSchema = z.object({
    username: z.string().min(1, "Benutzername ist erforderlich").max(50, "Benutzername zu lang"),
});

const RespondSchema = z.object({
    id: z.number().int().positive(),
    status: z.enum(['accepted', 'rejected']),
});

// GET - Get invitations
export async function GET(request) {
    try {
        const user = await checkAuth();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const data = db.getInvitations(user.id);
        return NextResponse.json(data);
    } catch (error) {
        console.error('Get invitations error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST - Create invitation
export async function POST(request) {
    try {
        const user = await checkAuth();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // CSRF check for state-changing request
        const csrfResult = await checkCSRF(request);
        if (!csrfResult.valid) {
            return NextResponse.json({ error: csrfResult.error }, { status: 403 });
        }

        // Rate Limiting (Protects from spam invites)
        const rateLimit = checkRateLimit(request, 'share-invite');
        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: 'Zu viele Einladungen gesendet. Bitte warte einen Moment.' },
                { status: 429 }
            );
        }

        // Zod Validation
        const bodyContent = await request.json();
        const parsed = InviteSchema.safeParse(bodyContent);

        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
        }

        const username = parsed.data.username.trim().toLowerCase();

        const invite = db.createInvitation(user.id, username);

        // Send push notification to invited user
        const toUser = db.getUserByUsername(username);
        if (toUser) {
            sendPushToUser(toUser.id, {
                title: 'Neue Freundschaftsanfrage',
                body: `${user.username} möchte dein Freund werden`,
                tag: 'invitation',
                data: { type: 'invitation' },
            });
        }

        return NextResponse.json({ invite });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}

// PUT - Respond to invitation (accept/reject)
export async function PUT(request) {
    try {
        const user = await checkAuth();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // CSRF check for state-changing request
        const csrfResult = await checkCSRF(request);
        if (!csrfResult.valid) {
            return NextResponse.json({ error: csrfResult.error }, { status: 403 });
        }

        // Zod Validation
        const bodyContent = await request.json();
        const parsed = RespondSchema.safeParse(bodyContent);

        if (!parsed.success) {
            return NextResponse.json({ error: 'Ungültige Daten' }, { status: 400 });
        }

        const { id, status } = parsed.data;

        // If rejected, we might just want to delete it or keep it as history?
        // User request says "Red Cross to reject". Usually implies deletion or 'rejected' state.
        // For simplicity, if rejected, we Update status to rejected (or delete).
        // Let's update status.

        const invite = db.updateInvitationStatus(id, user.id, status);

        // Notify both users via socket
        const io = global.__io;
        if (io) {
            if (status === 'accepted') {
                io.to(`user:${invite.from_user_id}`).emit('data-changed', { type: 'invitations' });
                io.to(`user:${invite.to_user_id}`).emit('data-changed', { type: 'invitations' });

                // Push notification to the inviter
                sendPushToUser(invite.from_user_id, {
                    title: 'Freundschaftsanfrage angenommen',
                    body: `${user.username} hat deine Freundschaftsanfrage angenommen`,
                    tag: 'invitation-accepted',
                    data: { type: 'invitation-accepted' },
                });
            } else if (status === 'rejected') {
                io.to(`user:${invite.from_user_id}`).emit('data-changed', { type: 'invitations' });
            }
        }

        return NextResponse.json({ invite });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}

// DELETE - Revoke/Delete invitation
export async function DELETE(request) {
    try {
        const user = await checkAuth();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // CSRF check for state-changing request
        const csrfResult = await checkCSRF(request);
        if (!csrfResult.valid) {
            return NextResponse.json({ error: csrfResult.error }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        const invite = db.deleteInvitation(parseInt(id), user.id);

        // Notify both users via socket to remove each other's markers
        const io = global.__io;
        if (io && invite.status === 'accepted') {
            io.to(`user:${invite.from_user_id}`).emit('share-removed', { removedUserId: invite.to_user_id });
            io.to(`user:${invite.to_user_id}`).emit('share-removed', { removedUserId: invite.from_user_id });

            // Push notification to the other user about friendship removal
            const otherUserId = invite.from_user_id === user.id ? invite.to_user_id : invite.from_user_id;
            sendPushToUser(otherUserId, {
                title: 'Freundschaft beendet',
                body: `${user.username} hat die Freundschaft beendet`,
                tag: 'friend-removed',
                data: { type: 'friend-removed' },
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
