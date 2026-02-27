const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const { initDatabase, getSharedUserIds, getSession, getUserById } = require('./lib/db');
const { sendPushToUsers } = require('./lib/webpush');
const { initScheduler } = require('./lib/scheduler');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Store connected users (for data-sync routing and push targeting)
const connectedUsers = new Map();

// Simple in-memory rate limiter for Socket.io events
const socketRateLimits = new Map();
function isSocketRateLimited(socketId, event, maxPerMinute = 10) {
    const key = `${socketId}:${event}`;
    const now = Date.now();
    const entry = socketRateLimits.get(key);
    if (!entry || now > entry.resetAt) {
        socketRateLimits.set(key, { count: 1, resetAt: now + 60000 });
        return false;
    }
    entry.count++;
    if (entry.count > maxPerMinute) return true;
    return false;
}
// Cleanup stale entries every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of socketRateLimits.entries()) {
        if (now > entry.resetAt) socketRateLimits.delete(key);
    }
}, 5 * 60 * 1000);

// Sanitize string for push notifications (strip HTML tags, limit length)
function sanitizeForPush(str, maxLen = 100) {
    if (!str) return '';
    return String(str).replace(/<[^>]*>/g, '').trim().slice(0, maxLen);
}

/**
 * Parse a specific cookie value from a cookie header string.
 */
function parseCookie(cookieHeader, name) {
    if (!cookieHeader) return null;
    const match = cookieHeader.split(';').find(c => c.trim().startsWith(`${name}=`));
    return match ? match.split('=')[1]?.trim() : null;
}

// Initialize database first, then start the server
initDatabase().then(() => {
    console.log('Database initialized successfully');

    app.prepare().then(() => {
        const server = createServer(async (req, res) => {
            try {
                const parsedUrl = parse(req.url, true);
                await handle(req, res, parsedUrl);
            } catch (err) {
                console.error('Error occurred handling', req.url, err);
                res.statusCode = 500;
                res.end('Internal Server Error');
            }
        });

        const io = new Server(server, {
            cors: {
                origin: process.env.ALLOWED_ORIGIN || `http://${hostname}:${port}`,
                methods: ['GET', 'POST'],
                credentials: true,
            },
            transports: ['websocket', 'polling'],
        });

        // Expose io globally so API routes can emit events
        global.__io = io;
        global.__connectedUsers = connectedUsers;

        // Socket.io authentication middleware
        io.use((socket, next) => {
            const cookieHeader = socket.handshake.headers.cookie;
            const sessionToken = parseCookie(cookieHeader, 'session_token');

            if (!sessionToken) {
                return next(new Error('No session token'));
            }

            const session = getSession(sessionToken);
            if (!session) {
                return next(new Error('Invalid session'));
            }

            const user = getUserById(session.user_id);
            if (!user) {
                return next(new Error('User not found'));
            }

            // Attach user info to socket
            socket.userId = user.id;
            socket.username = user.username;
            next();
        });

        io.on('connection', (socket) => {
            console.log('Client connected:', socket.id);

            // Handle user authentication on socket (now pre-authenticated via middleware)
            socket.on('authenticate', () => {
                connectedUsers.set(socket.id, {
                    id: socket.userId,
                    username: socket.username,
                });
                console.log(`User authenticated: ${socket.username}`);

                // Join a room named after the user ID so we can target them
                socket.join(`user:${socket.userId}`);
            });

            // Handle data-changed events from clients
            socket.on('data-changed', (payload) => {
                if (!socket.userId) return;
                // Rate limit data-changed events (30 per minute)
                if (isSocketRateLimited(socket.id, 'data-changed', 30)) {
                    return;
                }

                // SECURITY: Validate payload against whitelist to prevent
                // injection via crafted socket events (CWE-20)
                const VALID_TYPES = ['hotels', 'activities', 'flights', 'packing', 'invitations', 'all'];
                const VALID_ACTIONS = ['add', 'edit', 'delete', 'complete'];
                const type = VALID_TYPES.includes(payload?.type) ? payload.type : 'all';
                const action = VALID_ACTIONS.includes(payload?.action) ? payload.action : undefined;

                const friends = getSharedUserIds(socket.userId);
                const onlineUserIds = Array.from(connectedUsers.values()).map(u => u.id);

                friends.forEach(friendId => {
                    io.to(`user:${friendId}`).emit('data-changed', {
                        type,
                        changedBy: socket.userId,
                    });
                });

                // Push to offline friends (never push to the user who triggered the change)
                const offlineFriends = friends.filter(fid => fid !== socket.userId && !onlineUserIds.includes(fid));
                if (offlineFriends.length > 0) {
                    const title = sanitizeForPush(payload?.title, 80);
                    const username = sanitizeForPush(socket.username, 50);

                    let body;
                    if (type === 'activities' && action && title) {
                        const actionTexts = {
                            add: `hat eine neue Aktivität hinzugefügt: ${title}`,
                            edit: `hat eine Aktivität bearbeitet: ${title}`,
                            delete: `hat eine Aktivität gelöscht: ${title}`,
                            complete: `hat eine Aktivität abgeschlossen: ${title}`,
                        };
                        body = `${username} ${actionTexts[action] || `hat Aktivitäten aktualisiert`}`;
                    } else if (type === 'hotels' && action && title) {
                        const actionTexts = {
                            add: `hat ein Hotel hinzugefügt: ${title}`,
                            edit: `hat ein Hotel bearbeitet: ${title}`,
                            delete: `hat ein Hotel gelöscht: ${title}`,
                        };
                        body = `${username} ${actionTexts[action] || `hat Hotels aktualisiert`}`;
                    } else if (type === 'packing') {
                        body = `${username} hat die Packliste aktualisiert`;
                    } else {
                        const label = type === 'hotels' ? 'Hotels' : type === 'activities' ? 'Aktivitäten' : 'Daten';
                        body = `${username} hat ${label} aktualisiert`;
                    }

                    sendPushToUsers(offlineFriends, {
                        title: 'NipponGo',
                        body,
                        tag: `data-changed-${type}-${action || 'update'}`,
                        data: { type, action },
                    });
                }
            });

            // Handle disconnection
            socket.on('disconnect', () => {
                console.log('Client disconnected:', socket.id);
                connectedUsers.delete(socket.id);
            });
        });

        // Graceful shutdown
        const shutdown = () => {
            console.log('Shutting down gracefully...');
            io.close();
            server.close(() => {
                console.log('Server closed');
                // Close database connection to ensure WAL checkpoint
                const { getDb } = require('./lib/db');
                try {
                    getDb().close();
                    console.log('Database closed');
                } catch (e) {
                    console.error('Error closing database:', e);
                }
                process.exit(0);
            });
        };

        process.on('SIGTERM', shutdown);
        process.on('SIGINT', shutdown);

        server.listen(port, (err) => {
            if (err) throw err;
            console.log(`> Ready on http://${hostname}:${port}`);
            console.log(`> Socket.io server running`);

            // Start the push notification scheduler
            initScheduler();
        });
    });
}).catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
});
