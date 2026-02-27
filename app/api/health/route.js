import { NextResponse } from 'next/server';

/**
 * Health check endpoint for monitoring
 * Returns detailed status of all system components
 */
export async function GET() {
    const health = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        services: {}
    };

    // Check database
    try {
        const { getDb } = require('../../../lib/db');
        const db = getDb();
        const result = db.prepare('SELECT 1 as test').get();
        health.services.database = result?.test === 1 ? 'ok' : 'error';
    } catch (e) {
        health.services.database = 'error';
        health.status = 'degraded';
    }

    // Check Socket.io
    try {
        const io = global.__io;
        const connectedUsers = global.__connectedUsers;
        if (io && connectedUsers) {
            health.services.socketio = {
                status: 'ok',
                connections: connectedUsers.size
            };
        } else {
            health.services.socketio = { status: 'error' };
            health.status = 'degraded';
        }
    } catch (e) {
        health.services.socketio = { status: 'error' };
        health.status = 'degraded';
    }

    // Overall status
    const statusCode = health.status === 'ok' ? 200 : 503;

    return NextResponse.json(health, { status: statusCode });
}
