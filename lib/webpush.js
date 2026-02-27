const db = require('./db');

let webpush;

// Only initialize if VAPID keys are configured
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush = require('web-push');
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:noreply@nippon-go.app',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

/**
 * Send push notification to a single user
 * @param {number} userId
 * @param {object} payload - { title, body, tag, data }
 */
async function sendPushToUser(userId, payload) {
  if (!webpush) return;

  try {
    const subscriptions = db.getPushSubscriptions(userId);

    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            auth: sub.auth_key,
            p256dh: sub.p256dh_key,
          },
        };

        try {
          await webpush.sendNotification(pushSubscription, JSON.stringify(payload));
        } catch (err) {
          // 410 Gone = subscription expired/invalid — clean up
          if (err.statusCode === 410 || err.statusCode === 404) {
            db.deletePushSubscription(sub.endpoint);
          }
          throw err;
        }
      })
    );

    const failed = results.filter(r => r.status === 'rejected').length;
    if (failed > 0) {
      console.log(`Push: ${results.length - failed}/${results.length} sent to user ${userId}`);
    }
  } catch (error) {
    console.error('Failed to send push notification:', error);
  }
}

/**
 * Send push notification to multiple users
 * @param {number[]} userIds
 * @param {object} payload
 */
async function sendPushToUsers(userIds, payload) {
  if (!webpush) return;
  await Promise.allSettled(userIds.map(userId => sendPushToUser(userId, payload)));
}

module.exports = {
  sendPushToUser,
  sendPushToUsers,
};
