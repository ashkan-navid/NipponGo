/**
 * Scheduler — proactive push notification triggers.
 * Runs inside the main server.js process via setInterval.
 * All queries use prepared statements from lib/db.js.
 */

const db = require('./db');
const { sendPushToUser } = require('./webpush');

// ── Departure Reminder ──────────────────────────────────────
// Runs daily ~08:00. Push if flight departs within next 24h.
async function checkDepartureReminders() {
    try {
        const flights = db.getUpcomingFlights(1); // next 24h
        for (const f of flights) {
            const refId = `departure-${f.id}`;
            if (db.hasNotificationBeenSent(f.user_id, 'departure', refId)) continue;

            await sendPushToUser(f.user_id, {
                title: 'NipponGo ✈️',
                body: `Morgen geht's los! ${f.departure_iata} → ${f.arrival_iata} — Packliste gecheckt?`,
                tag: 'departure-reminder',
                data: { type: 'departure', flightId: f.id },
            });
            db.markNotificationSent(f.user_id, 'departure', refId);
        }
    } catch (err) {
        console.error('[Scheduler] Departure reminder error:', err.message);
    }
}

// ── Check-in Reminder ───────────────────────────────────────
// Runs daily ~08:00. Push if hotel check-in is today.
async function checkCheckinReminders() {
    try {
        const hotels = db.getUpcomingHotelCheckins(0); // today only
        for (const h of hotels) {
            const refId = `checkin-${h.id}`;
            if (db.hasNotificationBeenSent(h.user_id, 'checkin', refId)) continue;

            const timeStr = h.check_in_time ? ` um ${h.check_in_time.substring(0, 5)}` : '';
            await sendPushToUser(h.user_id, {
                title: 'NipponGo 🏨',
                body: `Heute Check-in: ${h.name}${timeStr}`,
                tag: 'checkin-reminder',
                data: { type: 'checkin', hotelId: h.id },
            });
            db.markNotificationSent(h.user_id, 'checkin', refId);
        }
    } catch (err) {
        console.error('[Scheduler] Check-in reminder error:', err.message);
    }
}

// ── Activity Reminder ───────────────────────────────────────
// Runs every 15 min. Push if activity starts within 60 min.
async function checkActivityReminders() {
    try {
        const activities = db.getUpcomingActivities(60); // next 60 min
        for (const a of activities) {
            const refId = `activity-${a.id}-${a.planned_date}`;
            if (db.hasNotificationBeenSent(a.user_id, 'activity', refId)) continue;

            await sendPushToUser(a.user_id, {
                title: 'NipponGo 📍',
                body: `In einer Stunde: ${a.title}`,
                tag: 'activity-reminder',
                data: { type: 'activity', activityId: a.id },
            });
            db.markNotificationSent(a.user_id, 'activity', refId);
        }
    } catch (err) {
        console.error('[Scheduler] Activity reminder error:', err.message);
    }
}

// ── Weather Alert ───────────────────────────────────────────
// Runs daily ~20:00. Push if tomorrow has high rain probability.
// Requires a fetch to /api/weather?forecast=true with first hotel coords.
async function checkWeatherAlerts() {
    try {
        const users = db.getAllUsers();
        for (const user of users) {
            const refId = `weather-${new Date().toISOString().split('T')[0]}`;
            if (db.hasNotificationBeenSent(user.id, 'weather', refId)) continue;

            // Get the user's first hotel for coordinates
            const hotels = db.getHotels(user.id);
            const hotelWithCoords = hotels.find(h => h.latitude && h.longitude);
            if (!hotelWithCoords) continue;

            try {
                const res = await fetch(
                    `http://localhost:${process.env.PORT || 3000}/api/weather?lat=${hotelWithCoords.latitude}&lon=${hotelWithCoords.longitude}&forecast=true`
                );
                if (!res.ok) continue;
                const data = await res.json();

                const tomorrow = data.forecast?.[0];
                if (!tomorrow || tomorrow.pop < 60) continue; // Only alert if >60% rain chance

                await sendPushToUser(user.id, {
                    title: 'NipponGo ☔',
                    body: `Morgen Regen erwartet (${tomorrow.pop}%) — Regenschirm nicht vergessen!`,
                    tag: 'weather-alert',
                    data: { type: 'weather' },
                });
                db.markNotificationSent(user.id, 'weather', refId);
            } catch { /* ignore per-user fetch errors */ }
        }
    } catch (err) {
        console.error('[Scheduler] Weather alert error:', err.message);
    }
}

// ── Packing Nudge ──────────────────────────────────────────
// Runs daily ~10:00. Push if departure in ≤3 days and packing <50%.
async function checkPackingNudge() {
    try {
        const flights = db.getUpcomingFlights(3); // departures within 3 days
        if (flights.length === 0) return;

        // Get unique user IDs who have upcoming flights
        const userIdsWithFlights = [...new Set(flights.map(f => f.user_id))];

        const packingProgress = db.getAllUsersPackingProgress();
        const progressMap = {};
        packingProgress.forEach(p => { progressMap[p.userId] = p; });

        for (const userId of userIdsWithFlights) {
            const progress = progressMap[userId];
            if (!progress || progress.percent >= 50) continue; // Already >50% packed

            const refId = `packing-${new Date().toISOString().split('T')[0]}`;
            if (db.hasNotificationBeenSent(userId, 'packing', refId)) continue;

            // Find earliest departure for this user
            const userFlight = flights.find(f => f.user_id === userId);
            const daysUntil = userFlight
                ? Math.ceil((new Date(userFlight.departure_time) - new Date()) / (24 * 60 * 60 * 1000))
                : 3;

            await sendPushToUser(userId, {
                title: 'NipponGo 🎒',
                body: `Nur noch ${daysUntil} ${daysUntil === 1 ? 'Tag' : 'Tage'}! Packliste erst bei ${progress.percent}%.`,
                tag: 'packing-nudge',
                data: { type: 'packing' },
            });
            db.markNotificationSent(userId, 'packing', refId);
        }
    } catch (err) {
        console.error('[Scheduler] Packing nudge error:', err.message);
    }
}

// ── Scheduler Init ─────────────────────────────────────────
function initScheduler() {
    console.log('[Scheduler] Initialized push notification scheduler');

    // Activity reminders — every 15 minutes
    setInterval(checkActivityReminders, 15 * 60 * 1000);

    // Daily checks at specific times (offset from server start)
    const now = new Date();

    // Calculate ms until next 08:00
    function msUntilHour(targetHour) {
        const target = new Date(now);
        target.setHours(targetHour, 0, 0, 0);
        if (target <= now) target.setDate(target.getDate() + 1);
        return target - now;
    }

    // 08:00 — Departure + Check-in reminders
    setTimeout(() => {
        checkDepartureReminders();
        checkCheckinReminders();
        // Then repeat every 24h
        setInterval(() => {
            checkDepartureReminders();
            checkCheckinReminders();
        }, 24 * 60 * 60 * 1000);
    }, msUntilHour(8));

    // 10:00 — Packing nudge
    setTimeout(() => {
        checkPackingNudge();
        setInterval(checkPackingNudge, 24 * 60 * 60 * 1000);
    }, msUntilHour(10));

    // 20:00 — Weather alerts
    setTimeout(() => {
        checkWeatherAlerts();
        setInterval(checkWeatherAlerts, 24 * 60 * 60 * 1000);
    }, msUntilHour(20));

    // Cleanup old notifications daily
    setInterval(() => db.cleanupOldNotifications(30), 24 * 60 * 60 * 1000);

    // Run activity check once on startup (in case server was down)
    setTimeout(checkActivityReminders, 5000);
}

module.exports = { initScheduler };
