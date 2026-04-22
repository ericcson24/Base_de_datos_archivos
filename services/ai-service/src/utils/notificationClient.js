const { createClient } = require('redis');

let publisher = null;

const initRedis = async () => {
    try {
        publisher = createClient({ url: 'redis://redis:6379' });
        publisher.on('error', (err) => console.error('Redis Client Error', err));
        await publisher.connect();
        console.log('✅ Redis Connected for Notifications');
    } catch (error) {
        console.error('❌ Failed to connect to Redis:', error);
    }
};

const sendNotification = async (data) => {
    if (!publisher) {
        console.warn('⚠️ Redis publisher not initialized. Notification skipped:', data.title || data);
        // Fallback: try HTTP call to notification-service
        try {
            const payload = typeof data === 'object' ? data : { userId: arguments[0], title: arguments[1], message: arguments[2], type: arguments[3] || 'info' };
            const res = await fetch('http://notification-service:5002/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Internal-Token': process.env.INTERNAL_API_TOKEN || process.env.JWT_SECRET || '' },
                body: JSON.stringify(payload)
            });
            if (res.ok) console.log('[NOTIFICATION] Sent via HTTP fallback');
        } catch (e) {
            console.warn('[NOTIFICATION] HTTP fallback also failed:', e.message);
        }
        return;
    }

    // Support both object and positional args for backward compat
    let payload;
    if (typeof data === 'object' && data !== null && data.userId) {
        payload = data;
    } else {
        // Legacy: sendNotification(userId, title, message, type)
        payload = {
            userId: data,
            title: arguments[1],
            message: arguments[2],
            type: arguments[3] || 'info'
        };
    }

    const notificationPayload = JSON.stringify({
        ...payload,
        timestamp: new Date().toISOString()
    });

    try {
        await publisher.publish('notifications', notificationPayload);
        console.log(`[NOTIFICATION SENT] User: ${payload.userId} | Title: ${payload.title}`);
    } catch (error) {
        console.error('Error sending notification:', error);
    }
};

module.exports = { initRedis, sendNotification };
